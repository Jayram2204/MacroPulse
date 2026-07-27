"""Shared market data fetcher — yfinance + FRED with SQLite cache.

All engines import from here instead of hitting APIs directly.
"""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
import yfinance as yf

_CACHE_DIR = Path(__file__).resolve().parent.parent / "cache"
_DB_PATH = _CACHE_DIR / "market_data.sqlite"

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _conn() -> sqlite3.Connection:
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH))
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS cache (
            key   TEXT PRIMARY KEY,
            data  BLOB,
            ts    TEXT
        )
        """
    )
    return conn


def _cache_key(prefix: str, *args: str) -> str:
    raw = f"{prefix}|" + "|".join(str(a) for a in args)
    return hashlib.sha256(raw.encode()).hexdigest()


def _get_cached(key: str) -> pd.DataFrame | None:
    conn = _conn()
    row = conn.execute("SELECT data FROM cache WHERE key = ?", (key,)).fetchone()
    conn.close()
    if row is None:
        return None
    return pd.read_json(pd.io.json.json_normalize(json.loads(row[0])).to_json())


def _set_cached(key: str, df: pd.DataFrame) -> None:
    blob = df.to_json(date_format="iso")
    conn = _conn()
    conn.execute(
        "INSERT OR REPLACE INTO cache (key, data, ts) VALUES (?, ?, ?)",
        (key, blob, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()


def clear_cache() -> None:
    """Drop all cached data."""
    conn = _conn()
    conn.execute("DELETE FROM cache")
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fetch_yf_prices(
    ticker: str,
    start: date | str,
    end: date | str,
    interval: str = "1d",
) -> pd.DataFrame:
    """Fetch OHLCV from yfinance, cached.

    Returns DataFrame with columns: Open, High, Low, Close, Volume
    indexed by date.
    """
    start_s = start.isoformat() if isinstance(start, date) else start
    end_s = end.isoformat() if isinstance(end, date) else end

    key = _cache_key("yf", ticker, start_s, end_s, interval)
    cached = _get_cached(key)
    if cached is not None:
        cached.index = pd.to_datetime(cached.index)
        return cached

    data = yf.download(ticker, start=start_s, end=end_s, interval=interval, progress=False)
    if data.empty:
        raise ValueError(f"No data returned for {ticker} [{start_s} -> {end_s}]")

    # Flatten MultiIndex columns if present
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    _set_cached(key, data)
    return data


def fetch_yf_returns(
    ticker: str,
    start: date | str,
    end: date | str,
    col: str = "Close",
) -> pd.Series:
    """Fetch simple daily returns for a ticker."""
    prices = fetch_yf_prices(ticker, start, end)
    return prices[col].pct_change().dropna()


def fetch_fred_series(
    series_id: str,
    start: date | str,
    end: date | str,
) -> pd.Series:
    """Fetch a FRED series, cached.

    Requires FRED_API_KEY environment variable.
    """
    api_key = os.environ.get("FRED_API_KEY", "")
    if not api_key:
        raise EnvironmentError(
            "FRED_API_KEY not set. Export it or add to your shell profile."
        )

    from fredapi import Fred

    start_s = start.isoformat() if isinstance(start, date) else start
    end_s = end.isoformat() if isinstance(end, date) else end

    key = _cache_key("fred", series_id, start_s, end_s)
    cached = _get_cached(key)
    if cached is not None:
        if isinstance(cached, pd.DataFrame):
            return cached.iloc[:, 0]
        return cached

    fred = Fred(api_key=api_key)
    series = fred.get_series(series_id, observation_start=start_s, observation_end=end_s)

    # Store as single-column DataFrame for JSON round-trip
    _set_cached(key, series.to_frame("value"))
    return series


def fetch_benchmark_returns(
    start: date | str,
    end: date | str,
    benchmark: str = "^GSPC",
) -> pd.Series:
    """S&P 500 daily returns (default benchmark)."""
    return fetch_yf_returns(benchmark, start, end)


# ---------------------------------------------------------------------------
# Sector / ETF helpers (used by sector_sensitivity engine)
# ---------------------------------------------------------------------------

SECTOR_ETFS: dict[str, str] = {
    "XLK": "Technology",
    "XLF": "Financials",
    "XLV": "Healthcare",
    "XLE": "Energy",
    "XLI": "Industrials",
    "XLY": "Consumer Discretionary",
    "XLP": "Consumer Staples",
    "XLU": "Utilities",
    "XLRE": "Real Estate",
    "XLB": "Materials",
    "XLC": "Communications",
}


def fetch_sector_returns(
    start: date | str,
    end: date | str,
) -> pd.DataFrame:
    """Daily returns for all 11 SPDR sector ETFs."""
    frames = {}
    for ticker, name in SECTOR_ETFS.items():
        try:
            frames[name] = fetch_yf_returns(ticker, start, end)
        except ValueError:
            continue
    return pd.DataFrame(frames).dropna()


# ---------------------------------------------------------------------------
# FX helpers (used by inflow_fx engine)
# ---------------------------------------------------------------------------

def fetch_fx_returns(
    pair: str = "DX-Y.NYB",
    start: date | str = "2020-01-01",
    end: date | str | None = None,
) -> pd.Series:
    """Fetch FX proxy returns. Default: ICE US Dollar Index."""
    if end is None:
        end = date.today().isoformat()
    return fetch_yf_returns(pair, start, end)


# ---------------------------------------------------------------------------
# Macro indicator shortcuts
# ---------------------------------------------------------------------------

FRED_SERIES = {
    "fed_funds_rate": "DFF",
    "treasury_10y": "DGS10",
    "treasury_2y": "DGS2",
    "cpi": "CPIAUCSL",
    "unemployment": "UNRATE",
}


def fetch_macro_indicator(
    name: str,
    start: date | str = "2020-01-01",
    end: date | str | None = None,
) -> pd.Series:
    """Fetch a named macro indicator from FRED."""
    if end is None:
        end = date.today().isoformat()
    series_id = FRED_SERIES.get(name)
    if series_id is None:
        raise KeyError(f"Unknown indicator: {name}. Available: {list(FRED_SERIES)}")
    return fetch_fred_series(series_id, start, end)
