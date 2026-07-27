"""Streamlit dashboard — visual front-end for all three engines."""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure project root is on sys.path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go

from macro_events.registry import all_events, get_event, events_by_category
from engines.event_study.engine import (
    EventWindow,
    run_event_study,
    summarize_results,
)
from engines.inflow_fx.engine import (
    FlowWindow,
    run_flow_analysis,
    summarize_flow,
)
from engines.sector_sensitivity.engine import (
    run_sector_sensitivity,
    sensitivity_heatmap_data,
)

st.set_page_config(page_title="Macro Alpha", layout="wide")
st.title("Macro Alpha — Event Impact Analysis")

# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------

st.sidebar.header("Configuration")
TICKER = st.sidebar.text_input("Ticker", value="SPY")
BENCHMARK = st.sidebar.text_input("Benchmark", value="^GSPC")

# ---------------------------------------------------------------------------
# Event selection
# ---------------------------------------------------------------------------

events = all_events()
event_options = {f"{e.name} ({e.date})": e for e in events}
selected_label = st.sidebar.selectbox("Macro Event", list(event_options.keys()))
selected_event = event_options[selected_label]

st.sidebar.markdown(f"**{selected_event.name}**")
st.sidebar.markdown(f"Date: {selected_event.date}")
st.sidebar.markdown(f"Category: {selected_event.category}")
st.sidebar.markdown(selected_event.description)

# ---------------------------------------------------------------------------
# Tabs
# ---------------------------------------------------------------------------

tab1, tab2, tab3 = st.tabs(["Event Study", "Flow & FX", "Sector Sensitivity"])

# --- Tab 1: Event Study -----------------------------------------------------

with tab1:
    st.header("Event Study & Econometrics")

    col1, col2 = st.columns(2)
    with col1:
        est_start = st.number_input("Estimation start (days)", value=-252, step=1)
        est_end = st.number_input("Estimation end (days)", value=-30, step=1)
    with col2:
        evt_start = st.number_input("Event window start (days)", value=-5, step=1)
        evt_end = st.number_input("Event window end (days)", value=5, step=1)

    if st.button("Run Event Study", key="run_es"):
        window = EventWindow(est_start, est_end, evt_start, evt_end)
        with st.spinner("Running OLS market model + Patell test..."):
            result = run_event_study(selected_event, TICKER, BENCHMARK, window)

        # Summary metrics
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("CAR", f"{result.car_total*100:+.3f}%")
        m2.metric("Patell Z", f"{result.z_stat:.3f}", delta=f"p={result.p_value:.4f}")
        m3.metric("Beta", f"{result.beta:.4f}")
        m4.metric("R²", f"{result.r_squared:.4f}")

        sig_label = "Significant" if result.significant_5pct else "Not Significant"
        if result.significant_5pct:
            st.success(f"CAR is statistically significant at 5% level (p={result.p_value:.4f})")
        else:
            st.warning(f"CAR is NOT significant at 5% level (p={result.p_value:.4f})")

        # CAR chart
        fig_car = go.Figure()
        fig_car.add_trace(go.Scatter(
            x=result.car.index,
            y=result.car.values * 100,
            mode="lines+markers",
            name="CAR",
            line=dict(color="#1f77b4", width=2),
        ))
        fig_car.update_layout(
            title="Cumulative Abnormal Return (CAR)",
            xaxis_title="Trading Day (relative to event)",
            yaxis_title="CAR (%)",
            template="plotly_white",
        )
        st.plotly_chart(fig_car, use_container_width=True)

        # AR chart
        fig_ar = go.Figure()
        colors = ["#2ca02c" if v >= 0 else "#d62728" for v in result.ar.values]
        fig_ar.add_trace(go.Bar(
            x=result.ar.index,
            y=result.ar.values * 100,
            name="AR",
            marker_color=colors,
        ))
        fig_ar.update_layout(
            title="Abnormal Returns (AR) by Day",
            xaxis_title="Trading Day",
            yaxis_title="AR (%)",
            template="plotly_white",
        )
        st.plotly_chart(fig_ar, use_container_width=True)

        # OLS summary
        with st.expander("OLS Estimation Details"):
            st.write(f"Alpha: {result.alpha:.6f} (SE: {result.alpha_se:.6f})")
            st.write(f"Beta: {result.beta:.4f} (SE: {result.beta_se:.4f})")
            st.write(f"R²: {result.r_squared:.4f}")
            st.write(f"Estimation observations: {result.estimation_obs}")


# --- Tab 2: Flow & FX -------------------------------------------------------

with tab2:
    st.header("Institutional Flow & FX Correlation")

    rolling = st.number_input("Rolling correlation window (days)", value=60, step=5)
    pre_days = st.number_input("Pre-event window (days)", value=30, step=5)
    post_days = st.number_input("Post-event window (days)", value=30, step=5)

    if st.button("Run Flow Analysis", key="run_flow"):
        window = FlowWindow(rolling, pre_days, post_days)
        with st.spinner("Computing correlations and ratios..."):
            result = run_flow_analysis(selected_event, TICKER, window)

        st.subheader("FX-Equity Correlation (Dollar Index vs S&P)")
        c1, c2, c3 = st.columns(3)
        c1.metric("Pre-event corr", f"{result.fx_equity_corr.pre_event_corr:.4f}")
        c2.metric("Post-event corr", f"{result.fx_equity_corr.post_event_corr:.4f}")
        c3.metric("Shift", f"{result.fx_equity_corr.corr_shift:+.4f}")

        st.subheader("Gold/SPY Ratio (Safe Haven Demand)")
        c1, c2, c3 = st.columns(3)
        c1.metric("Pre-event mean", f"{result.gold_equity_ratio.pre_event_mean:.4f}")
        c2.metric("Post-event mean", f"{result.gold_equity_ratio.post_event_mean:.4f}")
        c3.metric("Mean shift", f"{result.gold_equity_ratio.mean_shift_pct:+.3f}%")

        st.subheader("VIX-Equity Correlation")
        c1, c2, c3 = st.columns(3)
        c1.metric("Pre-event corr", f"{result.vix_equity_corr.pre_event_corr:.4f}")
        c2.metric("Post-event corr", f"{result.vix_equity_corr.post_event_corr:.4f}")
        c3.metric("Shift", f"{result.vix_equity_corr.corr_shift:+.4f}")

        # Rolling correlation chart
        fig_corr = go.Figure()
        fig_corr.add_trace(go.Scatter(
            x=result.fx_equity_corr.rolling_corr.index,
            y=result.fx_equity_corr.rolling_corr.values,
            name="USD-SPY corr",
            line=dict(color="#9467bd"),
        ))
        fig_corr.update_layout(
            title=f"Rolling {rolling}-Day Correlation: {TICKER} vs USD Index",
            yaxis_title="Correlation",
            template="plotly_white",
        )
        st.plotly_chart(fig_corr, use_container_width=True)


# --- Tab 3: Sector Sensitivity -----------------------------------------------

with tab3:
    st.header("Sector Sensitivity Matrix")

    est_days = st.number_input("Estimation period (days)", value=252, step=10)
    evt_window = st.number_input("Event window (days)", value=5, step=1)

    if st.button("Run Sector Analysis", key="run_sector"):
        with st.spinner("Computing sector betas and CARs..."):
            result = run_sector_sensitivity(selected_event, est_days, evt_window)

        heatmap = sensitivity_heatmap_data(result)

        # Heatmap: CAR by sector
        st.subheader("Sector CAR Heatmap")
        fig_heat = px.bar(
            heatmap.reset_index(),
            x="sector",
            y="car_pct",
            color="car_pct",
            color_continuous_scale="RdYlGn",
            title=f"Sector CAR (%) — {selected_event.name}",
        )
        fig_heat.update_layout(template="plotly_white")
        st.plotly_chart(fig_heat, use_container_width=True)

        # Beta comparison
        st.subheader("Sector Betas")
        fig_beta = px.bar(
            heatmap.reset_index(),
            x="sector",
            y="beta",
            color="beta",
            color_continuous_scale="Blues",
            title=f"Sector Betas — {selected_event.name}",
        )
        fig_beta.update_layout(template="plotly_white")
        st.plotly_chart(fig_beta, use_container_width=True)

        # Correlation matrix heatmap
        st.subheader("Cross-Sector Correlation Matrix")
        corr = result.correlation_matrix
        fig_corr = px.imshow(
            corr,
            text_auto=".2f",
            color_continuous_scale="RdBu_r",
            zmin=-1,
            zmax=1,
            title="Sector Return Correlations",
        )
        fig_corr.update_layout(template="plotly_white")
        st.plotly_chart(fig_corr, use_container_width=True)

        # Data table
        with st.expander("Raw Data"):
            st.dataframe(heatmap)
