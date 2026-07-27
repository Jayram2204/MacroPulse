# API Boundary Specification

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

## Next.js API Routes (BFF) — What They Do

| Route | Purpose | Example |
|-------|---------|---------|
| `/api/auth/*` | Session management (if added in v2) | Login, logout, token refresh |
| `/api/reshape/*` | Flatten nested JSON for UI consumption | Combine event detail + last run into one response |
| `/api/proxy/*` | Forward to FastAPI with session headers | Authenticated requests (v2) |

## Next.js API Routes — What They Never Do

- Run OLS regressions or compute CAR/Z-scores
- Fetch market data from yfinance/FRED
- Store or cache analysis results (that's SQLite's job on the Python side)
- Hold state between requests
- Duplicate any calculation from `engines/`

## FastAPI Endpoints (Core API)

All business logic lives here. The frontend calls these directly via `NEXT_PUBLIC_API_URL`.

```
GET  /events                           → list all macro events
GET  /events/{event_id}                → single event detail
POST /event-study                      → OLS, AR/CAR, Patell Z for one event
POST /event-study/multi                → multi-event comparison
POST /flow-analysis                    → FX/gold/VIX correlation analysis
POST /sector-sensitivity               → sector betas, CARs, correlation matrix
```

## Type Contract

Frontend types are **auto-generated** from FastAPI's OpenAPI spec:

```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.d.ts
```

Run as a prebuild step. Types are never hand-written on the frontend — if the Pydantic schema changes, the TypeScript types break at build time, not at runtime in production.

## CORS

FastAPI serves on a separate port/domain. `CORSMiddleware` in `api/app.py` allows the Vercel-deployed frontend origin. No proxy needed for production — the browser calls FastAPI directly.
