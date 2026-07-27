"""Sector Sensitivity Matrix engine.

Computes sector betas, event-day CARs, and cross-sector correlation
matrices. Outputs data for heatmap rendering.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

import numpy as np
import pandas as pd
import statsmodels.api as sm

from data.fetcher import (
    SECTOR_ETFS,
    fetch_benchmark_returns,
    fetch_sector_returns,
    fetch_yf_returns,
)
from macro_events.registry import MacroEvent, get_event


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class SectorBeta:
    """Beta estimate for a single sector."""
    sector_name: str
    beta: float
    alpha: float
    r_squared: float
    beta_se: float


@dataclass
class SectorEventCAR:
    """Event-day CAR for a single sector."""
    sector_name: str
    car: float
    ar_series: pd.Series = field(default_factory=pd.Series)


@dataclass
class SectorSensitivityResult:
    """Full sensitivity matrix for one event."""
    event: MacroEvent
    betas: list[SectorBeta] = field(default_factory=list)
    event_cars: list[SectorEventCAR] = field(default_factory=list)
    correlation_matrix: pd.DataFrame = field(default_factory=pd.DataFrame)
    beta_matrix: pd.DataFrame = field(default_factory=pd.DataFrame)


# ---------------------------------------------------------------------------
# Core engine
# ---------------------------------------------------------------------------

def estimate_sector_betas(
    start: date,
    end: date,
    benchmark: str = "^GSPC",
    lookback_days: int = 252,
) -> list[SectorBeta]:
    """OLS beta estimation for all 11 SPDR sector ETFs."""
    bm_ret = fetch_benchmark_returns(start, end)
    sec_ret = fetch_sector_returns(start, end)

    # Use last lookback_days
    bm_ret = bm_ret.iloc[-lookback_days:]
    sec_ret = sec_ret.iloc[-lookback_days:]

    common = bm_ret.index.intersection(sec_ret.index)
    bm_ret = bm_ret.loc[common]
    sec_ret = sec_ret.loc[common]

    X = sm.add_constant(bm_ret.values)
    betas = []

    for col in sec_ret.columns:
        y = sec_ret[col].dropna().values
        if len(y) < 30:
            continue
        # Re-align
        common_idx = sec_ret[col].dropna().index.intersection(bm_ret.index)
        y = sec_ret[col].loc[common_idx].values
        Xc = sm.add_constant(bm_ret.loc[common_idx].values)

        model = sm.OLS(y, Xc).fit()
        betas.append(SectorBeta(
            sector_name=col,
            beta=float(model.params[1]),
            alpha=float(model.params[0]),
            r_squared=float(model.rsquared),
            beta_se=float(model.bse[1]),
        ))

    return betas


def compute_sector_event_cars(
    event: MacroEvent,
    benchmark: str = "^GSPC",
    estimation_days: int = 252,
    event_window_days: int = 5,
) -> list[SectorEventCAR]:
    """Compute event-day CAR for each sector using the market model."""
    buffer = timedelta(days=estimation_days + event_window_days + 100)
    data_start = event.date - buffer
    data_end = event.date + timedelta(days=event_window_days + 10)

    bm_ret = fetch_benchmark_returns(data_start, data_end)
    sec_ret = fetch_sector_returns(data_start, data_end)

    common = bm_ret.index.intersection(sec_ret.index)
    bm_ret = bm_ret.loc[common]
    sec_ret = sec_ret.loc[common]

    # Locate event date
    event_ts = pd.Timestamp(event.date)
    event_idx = common.get_indexer([event_ts], method="nearest")[0]

    # Estimation window
    est_slice = slice(event_idx - estimation_days, event_idx - event_window_days)
    bm_est = bm_ret.iloc[est_slice]
    X_est = sm.add_constant(bm_est.values)

    # Event window
    evt_slice = slice(event_idx, event_idx + event_window_days + 1)
    bm_evt = bm_ret.iloc[evt_slice]
    event_dates = common[evt_slice]

    cars = []
    for col in sec_ret.columns:
        y_est = sec_ret[col].iloc[est_slice]
        common_est = y_est.dropna().index.intersection(bm_est.index)
        if len(common_est) < 30:
            continue

        model = sm.OLS(
            sec_ret[col].loc[common_est].values,
            sm.add_constant(bm_est.loc[common_est].values),
        ).fit()

        alpha = model.params[0]
        beta = model.params[1]

        sec_evt = sec_ret[col].iloc[evt_slice].reindex(common_est).values
        expected = alpha + beta * bm_evt.loc[common_est].values if len(common_est) > 0 else np.array([])

        # Use all event window values
        sec_evt_all = sec_ret[col].iloc[evt_slice]
        bm_evt_all = bm_ret.iloc[evt_slice]
        expected_all = alpha + beta * bm_evt_all.values
        ar = pd.Series(sec_evt_all.values - expected_all, index=event_dates)
        car_total = float(ar.sum())

        cars.append(SectorEventCAR(
            sector_name=col,
            car=car_total,
            ar_series=ar,
        ))

    return cars


def build_correlation_matrix(
    start: date,
    end: date,
    window_days: int = 252,
) -> pd.DataFrame:
    """Cross-sector return correlation matrix."""
    sec_ret = fetch_sector_returns(start, end)
    return sec_ret.iloc[-window_days:].corr()


def run_sector_sensitivity(
    event: MacroEvent | str,
    estimation_days: int = 252,
    event_window_days: int = 5,
) -> SectorSensitivityResult:
    """Full sector sensitivity analysis for one event."""
    if isinstance(event, str):
        ev = get_event(event)
        if ev is None:
            raise ValueError(f"Unknown event ID: {event}")
        event = ev

    buffer = timedelta(days=estimation_days + event_window_days + 100)
    data_start = event.date - buffer
    data_end = event.date + timedelta(days=event_window_days + 10)

    betas = estimate_sector_betas(data_start, data_end)
    cars = compute_sector_event_cars(event)
    corr = build_correlation_matrix(data_start, data_end)

    # Build beta matrix as a simple DataFrame for heatmap
    beta_df = pd.DataFrame({
        b.sector_name: {"beta": b.beta, "alpha": b.alpha, "r_squared": b.r_squared}
        for b in betas
    }).T

    return SectorSensitivityResult(
        event=event,
        betas=betas,
        event_cars=cars,
        correlation_matrix=corr,
        beta_matrix=beta_df,
    )


# ---------------------------------------------------------------------------
# Summary / heatmap data
# ---------------------------------------------------------------------------

def sensitivity_heatmap_data(result: SectorSensitivityResult) -> pd.DataFrame:
    """Extract a DataFrame suitable for heatmap rendering.

    Returns a matrix with sectors as rows and CAR / Beta as columns.
    """
    beta_map = {b.sector_name: b.beta for b in result.betas}
    car_map = {c.sector_name: c.car for c in result.event_cars}

    rows = []
    for sector in beta_map:
        rows.append({
            "sector": sector,
            "beta": round(beta_map.get(sector, 0), 4),
            "car_pct": round(car_map.get(sector, 0) * 100, 3),
        })
    return pd.DataFrame(rows).set_index("sector")


def summarize_sector_sensitivity(results: list[SectorSensitivityResult]) -> pd.DataFrame:
    """Aggregate multiple event sensitivity analyses."""
    rows = []
    for r in results:
        for b in r.betas:
            car_val = 0.0
            for c in r.event_cars:
                if c.sector_name == b.sector_name:
                    car_val = c.car
                    break
            rows.append({
                "event_id": r.event.id,
                "event_name": r.event.name,
                "date": r.event.date.isoformat(),
                "sector": b.sector_name,
                "beta": round(b.beta, 4),
                "car_pct": round(car_val * 100, 3),
            })
    return pd.DataFrame(rows)
