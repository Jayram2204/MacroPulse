"""Event Study & Econometrics engine.

OLS market model → AR / CAR → Patell Z-score significance.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Literal

import numpy as np
import pandas as pd
import statsmodels.api as sm
from scipy import stats

from data.fetcher import fetch_benchmark_returns, fetch_yf_returns
from macro_events.registry import MacroEvent, all_events, get_event


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class EventWindow:
    """Event study window parameters (in trading days)."""
    estimation_start: int = -252  # ~12 months before event
    estimation_end: int = -30     # 1 month gap before event window
    event_start: int = -5         # 5 days before event
    event_end: int = +5           # 5 days after event


@dataclass
class EventStudyResult:
    """Single-event, single-security result."""
    event: MacroEvent
    ticker: str

    # OLS estimation
    alpha: float = 0.0
    alpha_se: float = 0.0
    beta: float = 0.0
    beta_se: float = 0.0
    r_squared: float = 0.0
    estimation_obs: int = 0

    # AR / CAR
    ar: pd.Series = field(default_factory=pd.Series)
    car: pd.Series = field(default_factory=pd.Series)
    car_total: float = 0.0

    # Patell test
    z_stat: float = 0.0
    p_value: float = 0.0
    significant_5pct: bool = False

    # Raw prices for context
    event_dates: pd.DatetimeIndex = field(default_factory=pd.DatetimeIndex)


# ---------------------------------------------------------------------------
# Core engine
# ---------------------------------------------------------------------------

def _align_to_trading_days(d: date, returns: pd.Series) -> int | None:
    """Return the integer position of date *d* in the returns index, or None."""
    ts = pd.Timestamp(d)
    idx = returns.index.get_indexer([ts], method="nearest")[0]
    if idx < 0 or idx >= len(returns):
        return None
    return int(idx)


def run_event_study(
    event: MacroEvent | str,
    ticker: str,
    benchmark: str = "^GSPC",
    window: EventWindow | None = None,
    data_start: date | None = None,
    data_end: date | None = None,
) -> EventStudyResult:
    """Run a full event study for one event on one ticker.

    Parameters
    ----------
    event : MacroEvent or str
        Event object or event ID from the registry.
    ticker : str
        Security ticker (e.g. "SPY", "AAPL").
    benchmark : str
        Benchmark index ticker (default: S&P 500).
    window : EventWindow
        Window parameters.
    data_start / data_end : date
        Overall data range. Defaults to covering the estimation window.
    """
    if window is None:
        window = EventWindow()

    if isinstance(event, str):
        ev = get_event(event)
        if ev is None:
            raise ValueError(f"Unknown event ID: {event}")
        event = ev

    # Fetch enough history for estimation + event windows
    est_days_needed = abs(window.estimation_start) + abs(window.event_end) + 60  # buffer for weekends
    if data_start is None:
        data_start = event.date - timedelta(days=int(est_days_needed * 1.5))
    if data_end is None:
        data_end = event.date + timedelta(days=abs(window.event_end) * 2 + 10)

    sec_returns = fetch_yf_returns(ticker, data_start, data_end)
    bm_returns = fetch_yf_returns(benchmark, data_start, data_end)

    # Align on common dates
    common = sec_returns.index.intersection(bm_returns.index)
    sec_returns = sec_returns.loc[common]
    bm_returns = bm_returns.loc[common]

    if len(common) < abs(window.estimation_start) + abs(window.event_end) + 30:
        raise ValueError(
            f"Insufficient data for {ticker} around {event.date}. "
            f"Got {len(common)} trading days."
        )

    # Locate event date index
    event_idx = _align_to_trading_days(event.date, sec_returns)
    if event_idx is None:
        raise ValueError(f"Event date {event.date} not found in trading calendar.")

    # --- Estimation window ---------------------------------------------------
    est_slice = slice(event_idx + window.estimation_start, event_idx + window.estimation_end)
    sec_est = sec_returns.iloc[est_slice]
    bm_est = bm_returns.iloc[est_slice]

    X = sm.add_constant(bm_est.values)
    y = sec_est.values
    ols = sm.OLS(y, X).fit()

    alpha = float(ols.params[0])
    alpha_se = float(ols.bse[0])
    beta = float(ols.params[1])
    beta_se = float(ols.bse[1])
    r_squared = float(ols.rsquared)

    # --- Event window --------------------------------------------------------
    evt_slice = slice(event_idx + window.event_start, event_idx + window.event_end + 1)
    sec_evt = sec_returns.iloc[evt_slice]
    bm_evt = bm_returns.iloc[evt_slice]
    event_dates = sec_returns.index[evt_slice]

    # Expected returns under market model
    expected = alpha + beta * bm_evt.values

    # Abnormal returns
    ar = pd.Series(sec_evt.values - expected, index=event_dates, name="AR")

    # Cumulative abnormal return
    car = ar.cumsum()
    car.name = "CAR"
    car_total = float(car.iloc[-1]) if len(car) > 0 else 0.0

    # --- Patell Z-score ------------------------------------------------------
    # Z = CAR_total / sqrt(sum of AR variance predictions in event window)
    # Under H0, CAR ~ N(0, sigma_car)
    # Patell (1976): uses estimation window residuals to estimate sigma
    est_residuals = ols.resid
    sigma2_est = float(np.sum(est_residuals ** 2) / (len(est_residuals) - 2))

    n_event = len(ar)
    # Prediction error variance for each event day accumulates
    # Var(AR_t) = sigma_est^2 * (1 + 1/n_est + (R_t - R_bar)^2 / S_xx)
    # For simplicity (and following most implementations), use:
    # Var(CAR) = n_event * sigma_est^2 (assuming benchmark returns are known)
    # Patell's original test conditions on the benchmark in the event window.
    s_xx = float(np.sum((bm_est.values - bm_est.values.mean()) ** 2))
    bm_event_mean = float(bm_est.values.mean())

    var_ar_sum = 0.0
    for bm_t in bm_evt.values:
        var_t = sigma2_est * (1.0 + 1.0 / len(sec_est) + (bm_t - bm_event_mean) ** 2 / s_xx)
        var_ar_sum += var_t

    if var_ar_sum <= 0:
        z_stat = 0.0
        p_value = 1.0
    else:
        z_stat = car_total / np.sqrt(var_ar_sum)
        p_value = 2.0 * (1.0 - stats.norm.cdf(abs(z_stat)))

    return EventStudyResult(
        event=event,
        ticker=ticker,
        alpha=alpha,
        alpha_se=alpha_se,
        beta=beta,
        beta_se=beta_se,
        r_squared=r_squared,
        estimation_obs=len(sec_est),
        ar=ar,
        car=car,
        car_total=car_total,
        z_stat=z_stat,
        p_value=p_value,
        significant_5pct=p_value < 0.05,
        event_dates=event_dates,
    )


# ---------------------------------------------------------------------------
# Multi-event aggregation
# ---------------------------------------------------------------------------

def run_event_study_multiple(
    event_ids: list[str],
    ticker: str,
    benchmark: str = "^GSPC",
    window: EventWindow | None = None,
) -> list[EventStudyResult]:
    """Run event study across multiple events for the same ticker."""
    results = []
    for eid in event_ids:
        try:
            r = run_event_study(eid, ticker, benchmark, window)
            results.append(r)
        except (ValueError, Exception) as exc:
            print(f"[WARN] Skipping {eid}: {exc}")
    return results


def summarize_results(results: list[EventStudyResult]) -> pd.DataFrame:
    """Aggregate results into a summary DataFrame."""
    rows = []
    for r in results:
        rows.append({
            "event_id": r.event.id,
            "event_name": r.event.name,
            "date": r.event.date.isoformat(),
            "category": r.event.category,
            "ticker": r.ticker,
            "alpha": round(r.alpha, 6),
            "beta": round(r.beta, 4),
            "r_squared": round(r.r_squared, 4),
            "car_total_pct": round(r.car_total * 100, 3),
            "z_stat": round(r.z_stat, 3),
            "p_value": round(r.p_value, 4),
            "significant": r.significant_5pct,
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Sanity check helper
# ---------------------------------------------------------------------------

def sanity_check_fed_hike(
    ticker: str = "SPY",
    event_id: str = "fed_hike_2022_06",
) -> EventStudyResult:
    """Run and print a sanity check on the 2022-06 surprise 75bp hike.

    Expected: negative CAR (markets fell on the surprise hike).
    """
    result = run_event_study(event_id, ticker)
    print(f"\n{'='*60}")
    print(f"Sanity Check: {result.event.name}")
    print(f"Date: {result.event.date}")
    print(f"Ticker: {result.ticker}")
    print(f"---")
    print(f"Alpha:  {result.alpha:.6f}  (SE: {result.alpha_se:.6f})")
    print(f"Beta:   {result.beta:.4f}   (SE: {result.beta_se:.4f})")
    print(f"R²:     {result.r_squared:.4f}")
    print(f"Est N:  {result.estimation_obs}")
    print(f"---")
    print(f"CAR:    {result.car_total*100:+.3f}%")
    print(f"Z:      {result.z_stat:.3f}")
    print(f"P-val:  {result.p_value:.4f}")
    print(f"Sig 5%: {result.significant_5pct}")
    print(f"{'='*60}\n")
    return result
