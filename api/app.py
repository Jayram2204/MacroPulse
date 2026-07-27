"""FastAPI layer — wraps all three engines behind REST endpoints."""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from macro_events.registry import (
    all_events,
    events_between,
    events_by_category,
    get_event,
)
from engines.event_study.engine import (
    EventStudyResult,
    EventWindow,
    run_event_study,
    run_event_study_multiple,
    summarize_results,
)
from engines.inflow_fx.engine import (
    FlowAnalysisResult,
    FlowWindow,
    run_flow_analysis,
    summarize_flow,
)
from engines.sector_sensitivity.engine import (
    SectorSensitivityResult,
    run_sector_sensitivity,
    sensitivity_heatmap_data,
    summarize_sector_sensitivity,
)

app = FastAPI(
    title="Macro Alpha API",
    description="Macro event impact analysis toolkit",
    version="0.1.0",
)


# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------

class EventStudyRequest(BaseModel):
    event_id: str
    ticker: str = "SPY"
    benchmark: str = "^GSPC"
    estimation_start: int = -252
    estimation_end: int = -30
    event_start: int = -5
    event_end: int = 5


class MultiEventStudyRequest(BaseModel):
    event_ids: list[str]
    ticker: str = "SPY"
    benchmark: str = "^GSPC"
    estimation_start: int = -252
    estimation_end: int = -30
    event_start: int = -5
    event_end: int = 5


class FlowRequest(BaseModel):
    event_id: str
    equity_ticker: str = "SPY"
    rolling_days: int = 60
    pre_event_days: int = 30
    post_event_days: int = 30


class SectorRequest(BaseModel):
    event_id: str
    estimation_days: int = 252
    event_window_days: int = 5


# ---------------------------------------------------------------------------
# Events endpoints
# ---------------------------------------------------------------------------

@app.get("/events")
def list_events(
    category: Optional[str] = Query(None),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
):
    """List macro events, optionally filtered by category and/or date range."""
    if start and end:
        evts = events_between(date.fromisoformat(start), date.fromisoformat(end))
    elif category:
        evts = events_by_category(category)
    else:
        evts = all_events()

    return [
        {
            "id": e.id,
            "name": e.name,
            "category": e.category,
            "date": e.date.isoformat(),
            "expected": e.expected,
            "magnitude_bp": e.magnitude_bp,
        }
        for e in evts
    ]


@app.get("/events/{event_id}")
def get_event_detail(event_id: str):
    """Get details for a single event."""
    ev = get_event(event_id)
    if ev is None:
        raise HTTPException(status_code=404, detail=f"Event not found: {event_id}")
    return {
        "id": ev.id,
        "name": ev.name,
        "category": ev.category,
        "date": ev.date.isoformat(),
        "description": ev.description,
        "expected": ev.expected,
        "magnitude_bp": ev.magnitude_bp,
    }


# ---------------------------------------------------------------------------
# Event Study endpoints
# ---------------------------------------------------------------------------

@app.post("/event-study")
def post_event_study(req: EventStudyRequest):
    """Run event study for a single event and ticker."""
    window = EventWindow(
        estimation_start=req.estimation_start,
        estimation_end=req.estimation_end,
        event_start=req.event_start,
        event_end=req.event_end,
    )
    try:
        result = run_event_study(req.event_id, req.ticker, req.benchmark, window)
    except (ValueError, Exception) as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "event_id": result.event.id,
        "event_name": result.event.name,
        "date": result.event.date.isoformat(),
        "ticker": result.ticker,
        "alpha": round(result.alpha, 6),
        "beta": round(result.beta, 4),
        "r_squared": round(result.r_squared, 4),
        "estimation_obs": result.estimation_obs,
        "car_total_pct": round(result.car_total * 100, 3),
        "z_stat": round(result.z_stat, 3),
        "p_value": round(result.p_value, 4),
        "significant": result.significant_5pct,
        "car_series": {
            str(k): round(v, 6) for k, v in result.car.items()
        },
    }


@app.post("/event-study/multi")
def post_multi_event_study(req: MultiEventStudyRequest):
    """Run event study across multiple events for one ticker."""
    window = EventWindow(
        estimation_start=req.estimation_start,
        estimation_end=req.estimation_end,
        event_start=req.event_start,
        event_end=req.event_end,
    )
    results = run_event_study_multiple(req.event_ids, req.ticker, req.benchmark, window)
    summary = summarize_results(results)
    return summary.to_dict(orient="records")


# ---------------------------------------------------------------------------
# Flow Analysis endpoints
# ---------------------------------------------------------------------------

@app.post("/flow-analysis")
def post_flow_analysis(req: FlowRequest):
    """Run institutional flow & FX correlation analysis for an event."""
    window = FlowWindow(
        rolling_days=req.rolling_days,
        pre_event_days=req.pre_event_days,
        post_event_days=req.post_event_days,
    )
    try:
        result = run_flow_analysis(req.event_id, req.equity_ticker, window)
    except (ValueError, Exception) as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "event_id": result.event.id,
        "event_name": result.event.name,
        "date": result.event.date.isoformat(),
        "fx_equity_corr": {
            "pre": round(result.fx_equity_corr.pre_event_corr, 4),
            "post": round(result.fx_equity_corr.post_event_corr, 4),
            "shift": round(result.fx_equity_corr.corr_shift, 4),
        },
        "gold_spy_ratio": {
            "pre_mean": round(result.gold_equity_ratio.pre_event_mean, 4),
            "post_mean": round(result.gold_equity_ratio.post_event_mean, 4),
            "mean_shift_pct": round(result.gold_equity_ratio.mean_shift_pct, 3),
        },
        "vix_equity_corr": {
            "pre": round(result.vix_equity_corr.pre_event_corr, 4),
            "post": round(result.vix_equity_corr.post_event_corr, 4),
            "shift": round(result.vix_equity_corr.corr_shift, 4),
        },
    }


# ---------------------------------------------------------------------------
# Sector Sensitivity endpoints
# ---------------------------------------------------------------------------

@app.post("/sector-sensitivity")
def post_sector_sensitivity(req: SectorRequest):
    """Run sector sensitivity analysis for an event."""
    try:
        result = run_sector_sensitivity(req.event_id, req.estimation_days, req.event_window_days)
    except (ValueError, Exception) as e:
        raise HTTPException(status_code=400, detail=str(e))

    heatmap = sensitivity_heatmap_data(result)
    return {
        "event_id": result.event.id,
        "event_name": result.event.name,
        "date": result.event.date.isoformat(),
        "heatmap": heatmap.to_dict(orient="index"),
        "correlation_matrix": result.correlation_matrix.to_dict(),
    }
