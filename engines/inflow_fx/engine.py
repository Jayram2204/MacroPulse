"""Institutional Flow & FX Correlation engine.

Rolling correlations between equity indices and the Dollar Index,
safe-haven ratio analysis, and event-window regime detection.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

import numpy as np
import pandas as pd

from data.fetcher import fetch_fx_returns, fetch_yf_returns, fetch_benchmark_returns
from macro_events.registry import MacroEvent, get_event, events_between


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class FlowWindow:
    """Window parameters for correlation / ratio analysis."""
    rolling_days: int = 60       # rolling correlation window
    pre_event_days: int = 30     # days before event for pre-regime
    post_event_days: int = 30    # days after event for post-regime
    buffer_days: int = 10        # extra buffer for data fetch


@dataclass
class CorrelationResult:
    """Rolling correlation between two return series."""
    series_a_name: str
    series_b_name: str
    rolling_corr: pd.Series = field(default_factory=pd.Series)
    pre_event_corr: float = 0.0
    post_event_corr: float = 0.0
    corr_shift: float = 0.0     # post - pre


@dataclass
class RatioResult:
    """Ratio analysis between two price series (e.g. Gold/SPY)."""
    ratio_name: str
    ratio: pd.Series = field(default_factory=pd.Series)
    pre_event_mean: float = 0.0
    post_event_mean: float = 0.0
    pre_event_vol: float = 0.0
    post_event_vol: float = 0.0
    mean_shift_pct: float = 0.0  # percentage change in mean


@dataclass
class FlowAnalysisResult:
    """Complete flow analysis for one event."""
    event: MacroEvent
    fx_equity_corr: CorrelationResult
    gold_equity_ratio: RatioResult
    vix_equity_corr: CorrelationResult


# ---------------------------------------------------------------------------
# Core analysis
# ---------------------------------------------------------------------------

def _split_window(
    returns: pd.Series,
    event_date: date,
    pre_days: int,
    post_days: int,
    buffer_days: int = 0,
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Split returns into pre, post, and full window around an event date."""
    event_ts = pd.Timestamp(event_date)
    idx = returns.index.get_indexer([event_ts], method="nearest")[0]

    pre_start = max(0, idx - pre_days - buffer_days)
    pre_end = idx - 1
    post_start = idx
    post_end = min(len(returns) - 1, idx + post_days + buffer_days)

    pre = returns.iloc[pre_start:pre_end + 1]
    post = returns.iloc[post_start:post_end + 1]
    full = returns.iloc[pre_start:post_end + 1]

    return pre, post, full


def analyze_fx_equity_correlation(
    event: MacroEvent,
    equity_ticker: str = "SPY",
    fx_ticker: str = "DX-Y.NYB",
    window: FlowWindow | None = None,
) -> CorrelationResult:
    """Rolling correlation between equity and USD index returns."""
    if window is None:
        window = FlowWindow()

    buffer = timedelta(days=window.buffer_days + max(window.rolling_days, window.pre_event_days, window.post_event_days) + 30)
    start = event.date - buffer
    end = event.date + buffer

    eq_ret = fetch_yf_returns(equity_ticker, start, end)
    fx_ret = fetch_yf_returns(fx_ticker, start, end)

    common = eq_ret.index.intersection(fx_ret.index)
    eq_ret = eq_ret.loc[common]
    fx_ret = fx_ret.loc[common]

    # Full rolling correlation
    rolling = eq_ret.rolling(window.rolling_days).corr(fx_ret).dropna()

    pre, post, _ = _split_window(rolling, event.date, window.pre_event_days, window.post_event_days)
    pre_corr = float(pre.mean()) if len(pre) > 0 else 0.0
    post_corr = float(post.mean()) if len(post) > 0 else 0.0

    return CorrelationResult(
        series_a_name=equity_ticker,
        series_b_name=fx_ticker,
        rolling_corr=rolling,
        pre_event_corr=pre_corr,
        post_event_corr=post_corr,
        corr_shift=post_corr - pre_corr,
    )


def analyze_gold_equity_ratio(
    event: MacroEvent,
    gold_ticker: str = "GLD",
    equity_ticker: str = "SPY",
    window: FlowWindow | None = None,
) -> RatioResult:
    """Gold/Equity ratio — safe-haven demand proxy."""
    if window is None:
        window = FlowWindow()

    buffer = timedelta(days=window.buffer_days + max(window.pre_event_days, window.post_event_days) + 30)
    start = event.date - buffer
    end = event.date + buffer

    gold = fetch_yf_returns(gold_ticker, start, end)
    eq = fetch_yf_returns(equity_ticker, start, end)

    common = gold.index.intersection(eq.index)
    gold = gold.loc[common]
    eq = eq.loc[common]

    # Cumulative price index for ratio
    gold_price = (1 + gold).cumprod()
    eq_price = (1 + eq).cumprod()
    ratio = (gold_price / eq_price).dropna()
    ratio.name = f"{gold_ticker}/{equity_ticker}"

    pre, post, _ = _split_window(ratio, event.date, window.pre_event_days, window.post_event_days)
    pre_mean = float(pre.mean()) if len(pre) > 0 else 0.0
    post_mean = float(post.mean()) if len(post) > 0 else 0.0
    pre_vol = float(pre.std()) if len(pre) > 1 else 0.0
    post_vol = float(post.std()) if len(post) > 1 else 0.0
    mean_shift = ((post_mean - pre_mean) / pre_mean * 100) if pre_mean != 0 else 0.0

    return RatioResult(
        ratio_name=f"{gold_ticker}/{equity_ticker}",
        ratio=ratio,
        pre_event_mean=pre_mean,
        post_event_mean=post_mean,
        pre_event_vol=pre_vol,
        post_event_vol=post_vol,
        mean_shift_pct=mean_shift,
    )


def analyze_vix_correlation(
    event: MacroEvent,
    equity_ticker: str = "SPY",
    vix_ticker: str = "^VIX",
    window: FlowWindow | None = None,
) -> CorrelationResult:
    """Rolling correlation between equity and VIX returns."""
    if window is None:
        window = FlowWindow()

    buffer = timedelta(days=window.buffer_days + max(window.rolling_days, window.pre_event_days, window.post_event_days) + 30)
    start = event.date - buffer
    end = event.date + buffer

    eq_ret = fetch_yf_returns(equity_ticker, start, end)
    vix_ret = fetch_yf_returns(vix_ticker, start, end)

    common = eq_ret.index.intersection(vix_ret.index)
    eq_ret = eq_ret.loc[common]
    vix_ret = vix_ret.loc[common]

    rolling = eq_ret.rolling(window.rolling_days).corr(vix_ret).dropna()

    pre, post, _ = _split_window(rolling, event.date, window.pre_event_days, window.post_event_days)
    pre_corr = float(pre.mean()) if len(pre) > 0 else 0.0
    post_corr = float(post.mean()) if len(post) > 0 else 0.0

    return CorrelationResult(
        series_a_name=equity_ticker,
        series_b_name=vix_ticker,
        rolling_corr=rolling,
        pre_event_corr=pre_corr,
        post_event_corr=post_corr,
        corr_shift=post_corr - pre_corr,
    )


def run_flow_analysis(
    event: MacroEvent | str,
    equity_ticker: str = "SPY",
    window: FlowWindow | None = None,
) -> FlowAnalysisResult:
    """Full institutional flow analysis for one event."""
    if isinstance(event, str):
        ev = get_event(event)
        if ev is None:
            raise ValueError(f"Unknown event ID: {event}")
        event = ev

    fx_corr = analyze_fx_equity_correlation(event, equity_ticker, window=window)
    gold_ratio = analyze_gold_equity_ratio(event, window=window)
    vix_corr = analyze_vix_correlation(event, equity_ticker, window=window)

    return FlowAnalysisResult(
        event=event,
        fx_equity_corr=fx_corr,
        gold_equity_ratio=gold_ratio,
        vix_equity_corr=vix_corr,
    )


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def summarize_flow(results: list[FlowAnalysisResult]) -> pd.DataFrame:
    """Aggregate flow analysis results into a summary DataFrame."""
    rows = []
    for r in results:
        rows.append({
            "event_id": r.event.id,
            "event_name": r.event.name,
            "date": r.event.date.isoformat(),
            "fx_eq_pre_corr": round(r.fx_equity_corr.pre_event_corr, 4),
            "fx_eq_post_corr": round(r.fx_equity_corr.post_event_corr, 4),
            "fx_eq_corr_shift": round(r.fx_equity_corr.corr_shift, 4),
            "gold_spy_mean_shift_pct": round(r.gold_equity_ratio.mean_shift_pct, 3),
            "gold_spy_pre_vol": round(r.gold_equity_ratio.pre_event_vol, 4),
            "gold_spy_post_vol": round(r.gold_equity_ratio.post_event_vol, 4),
            "vix_eq_pre_corr": round(r.vix_equity_corr.pre_event_corr, 4),
            "vix_eq_post_corr": round(r.vix_equity_corr.post_event_corr, 4),
            "vix_eq_corr_shift": round(r.vix_equity_corr.corr_shift, 4),
        })
    return pd.DataFrame(rows)
