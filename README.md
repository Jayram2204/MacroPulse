# MacroPulse

**Macro event impact analysis toolkit for equities and ETFs** — event studies, flow/FX correlation, and sector sensitivity, wrapped in a fast API with a modern frontend.

## What It Does

MacroPulse quantifies how macro events (central bank decisions, CPI prints, Fed minutes, jobs reports, geopolitics) actually move markets:

- **Event Study** — OLS regression with abnormal returns (AR), cumulative abnormal returns (CAR), and Patell Z significance testing around event windows.
- **Inflow / FX Correlation** — measures how fund flows and foreign-exchange moves correlate with asset-class returns around events.
- **Sector Sensitivity** — computes sector betas and heatmaps so you can see which sectors are most exposed to a given event.

## Architecture

```
Browser  →  Next.js (BFF)  →  FastAPI (Core API)
                │                      │
          Auth / session         All calculation logic
          Response reshaping     Event registry
          Combine 2 calls → 1    OLS / AR / CAR / Patell Z
          Never: business logic  Flow / FX correlation
                                Sector betas / heatmaps
```

The Next.js layer handles auth, session state, and response reshaping only — every calculation lives in the Python `engines/` package.

## Project Structure

```
├── api/            FastAPI layer wrapping all three engines behind REST endpoints
├── engines/        Calculation logic
│   ├── event_study/      OLS / AR / CAR / Patell Z
│   ├── inflow_fx/        Flow & FX correlation
│   └── sector_sensitivity/  Sector betas & heatmaps
├── data/           Market data fetching + macro event registry
└── frontend/       Next.js app (event study, flow-FX, compare, methodology pages)
```

## Getting Started

### Backend (FastAPI)

```bash
cd api
pip install -r requirements.txt   # or uv sync
uvicorn app:app --reload
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 to explore the event study, flow/FX, and sector sensitivity dashboards.

## Docs

- [API_SPEC.md](API_SPEC.md) — API boundary specification and routes
- [FRONTEND_PLAN.md](FRONTEND_PLAN.md) — frontend architecture and roadmap

## Tech Stack

Python · FastAPI · TypeScript · Next.js · OLS/event-study statistics

## License

MIT — see [LICENSE](LICENSE).
