# MacroPulse Frontend — Complete Plan

## Tech Stack Decision

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | Next.js 15 (App Router) | SSR for fast initial load, RSC for server-side data fetching, API routes as BFF |
| **Language** | TypeScript | Type safety across API contracts + chart configs |
| **UI Components** | shadcn/ui | Accessible, copy-paste, Tailwind-native, no runtime dependency |
| **Styling** | Tailwind CSS v4 | Utility-first, dark mode via CSS variables, matches shadcn |
| **Charts (financial)** | TradingView Lightweight Charts v5 | Purpose-built for finance, 12KB gzipped, Canvas-rendered, smooth at scale |
| **Charts (general)** | Recharts | Bar charts, line charts, metric sparklines — composable React components |
| **Charts (heatmap)** | ECharts (via echarts-for-react) | Best heatmap/matrix rendering, Canvas-based, handles large matrices |
| **Server State** | TanStack Query v5 | Caching, deduplication, background refetch, loading/error states |
| **Forms** | React Hook Form + Zod | Parameter tuning forms with validation |
| **Icons** | Lucide React | Matches shadcn, tree-shakeable |
| **Deployment** | Vercel (frontend) + Render/Railway (Python API) | Zero-config for Next.js, free tier for API |

---

## Why NOT Streamlit (current `ui/dashboard.py`)

- Streamlit re-runs entire script on every interaction — poor UX for parameter tuning
- No routing, no SEO, no shareable URLs
- Limited layout control (no responsive grids, no custom components)
- Can't embed TradingView charts or custom Canvas renderers
- Feels like a prototype tool, not a portfolio-quality product

**Decision**: Replace Streamlit with Next.js. Keep `ui/dashboard.py` as a quick-reference for logic, delete it from production.

---

## Architecture

```
macro-alpha/
├── api/                    # FastAPI (existing, keep as-is)
│   └── app.py
├── frontend/               # Next.js 15 app (NEW)
│   ├── app/
│   │   ├── layout.tsx      # Root layout, theme provider
│   │   ├── page.tsx        # Landing / overview dashboard
│   │   ├── globals.css     # Tailwind + shadcn variables
│   │   ├── events/
│   │   │   └── page.tsx    # Event browser / timeline
│   │   ├── event-study/
│   │   │   └── page.tsx    # OLS, AR/CAR, Patell Z
│   │   ├── flow-fx/
│   │   │   └── page.tsx    # Institutional flow & FX corr
│   │   └── sector/
│   │       └── page.tsx    # Sector sensitivity matrix
│   ├── components/
│   │   ├── ui/             # shadcn primitives (button, card, etc.)
│   │   ├── charts/
│   │   │   ├── car-chart.tsx
│   │   │   ├── ar-bar-chart.tsx
│   │   │   ├── rolling-corr-chart.tsx
│   │   │   ├── sector-heatmap.tsx
│   │   │   └── correlation-matrix.tsx
│   │   ├── event-selector.tsx
│   │   ├── parameter-panel.tsx
│   │   ├── metric-card.tsx
│   │   └── nav-sidebar.tsx
│   ├── lib/
│   │   ├── api.ts          # Typed fetch wrappers for FastAPI
│   │   └── utils.ts        # cn() helper, formatters
│   ├── hooks/
│   │   ├── use-event-study.ts
│   │   ├── use-flow-analysis.ts
│   │   └── use-sector-sensitivity.ts
│   ├── types/
│   │   └── index.ts        # Shared TypeScript interfaces
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── engines/
├── data/
└── pyproject.toml
```

---

## Screen-by-Screen Breakdown

### Screen 1: Overview Dashboard (`/`)
**Purpose**: Landing page with quick summary of latest analysis

| Component | Library | Data |
|-----------|---------|------|
| Event timeline | Custom (vertical stepper) | `GET /events` |
| Quick metrics row | shadcn Card + Recharts Sparkline | Last run results |
| Recent activity log | shadcn Table | Local state / localStorage |

### Screen 2: Event Browser (`/events`)
**Purpose**: Browse, filter, and select macro events

| Component | Library | Data |
|-----------|---------|------|
| Event cards grid | shadcn Card | `GET /events` |
| Category filter | shadcn Select/Tabs | Client-side filter |
| Date range picker | shadcn DateRangePicker | Client-side filter |
| Event detail drawer | shadcn Sheet | `GET /events/{id}` |

### Screen 3: Event Study (`/event-study`)
**Purpose**: OLS market model, AR/CAR visualization, Patell Z significance

| Component | Library | Data |
|-----------|---------|------|
| Parameter panel | React Hook Form + Zod | User input |
| CAR line chart | TradingView Lightweight Charts v5 | `POST /event-study` |
| AR bar chart | Recharts BarChart | `POST /event-study` |
| Metric cards (CAR, Z, Beta, R²) | shadcn Card | `POST /event-study` |
| Significance badge | shadcn Badge | Computed from p-value |
| OLS details accordion | shadcn Accordion | `POST /event-study` |
| Multi-event comparison table | shadcn Table | `POST /event-study/multi` |

### Screen 4: Flow & FX (`/flow-fx`)
**Purpose**: Institutional flow regime detection, FX/gold/VIX correlations

| Component | Library | Data |
|-----------|---------|------|
| Parameter panel | React Hook Form | User input |
| Rolling correlation line | TradingView Lightweight Charts | `POST /flow-analysis` |
| Pre/Post metric cards | shadcn Card | `POST /flow-analysis` |
| Gold/SPY ratio chart | Recharts AreaChart | `POST /flow-analysis` |
| VIX correlation comparison | Recharts BarChart (grouped) | `POST /flow-analysis` |

### Screen 5: Sector Sensitivity (`/sector`)
**Purpose**: Sector beta heatmap, event CARs, cross-sector correlation

| Component | Library | Data |
|-----------|---------|------|
| Parameter panel | React Hook Form | User input |
| Sector CAR heatmap | ECharts Heatmap | `POST /sector-sensitivity` |
| Sector beta bar chart | Recharts BarChart | `POST /sector-sensitivity` |
| Correlation matrix | ECharts Heatmap (diverging) | `POST /sector-sensitivity` |
| Data table (raw) | shadcn Table + TanStack Table | `POST /sector-sensitivity` |

---

## Chart Library Mapping

| Visualization | Library | Reason |
|---------------|---------|--------|
| CAR time-series | TradingView Lightweight Charts | Smooth Canvas line, zoom, crosshair |
| AR daily bars | Recharts BarChart | Green/red bars, tooltips, composable |
| Rolling correlation | TradingView Lightweight Charts | Large dataset, smooth rendering |
| Gold/SPY ratio area | Recharts AreaChart | Gradient fill, easy React integration |
| Sector CAR heatmap | ECharts `heatmap` | Native heatmap coordinate system |
| Correlation matrix | ECharts `heatmap` | Diverging color scale (RdBu) |
| Metric sparklines | Recharts LineChart (mini) | 60px height, no axes |
| VIX grouped bars | Recharts BarChart | Pre/post grouped comparison |

---

## Dark Mode

shadcn/ui ships with CSS variable-based theming. One toggle in the navbar:

```css
:root { --background: 0 0% 100%; ... }        /* light */
.dark { --background: 222 47% 6%; ... }        /* dark */
```

Charts respect the theme via a `useTheme()` hook that swaps TradingView chart colors and ECharts color scales.

---

## API Integration Pattern

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchEvents(category?: string) {
  const params = category ? `?category=${category}` : "";
  const res = await fetch(`${API_BASE}/events${params}`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function runEventStudy(req: EventStudyRequest) {
  const res = await fetch(`${API_BASE}/event-study`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("Failed to run event study");
  return res.json();
}
```

Each hook wraps the API call with TanStack Query:

```typescript
// hooks/use-event-study.ts
export function useEventStudy(req: EventStudyRequest | null) {
  return useQuery({
    queryKey: ["event-study", req],
    queryFn: () => runEventStudy(req!),
    enabled: !!req,
    staleTime: 5 * 60 * 1000,  // cache 5 min
  });
}
```

---

## Implementation Phases

| Phase | Scope | Time Est. |
|-------|-------|-----------|
| **F1** | Next.js scaffold, shadcn setup, Tailwind, layout + nav | 1 day |
| **F2** | API client + types + TanStack Query hooks | 0.5 day |
| **F3** | Event Browser screen (`/events`) | 1 day |
| **F4** | Event Study screen — CAR chart (Lightweight Charts), AR bars (Recharts), metric cards | 2 days |
| **F5** | Flow & FX screen — rolling correlation, ratio charts, VIX comparison | 1.5 days |
| **F6** | Sector Sensitivity screen — ECharts heatmaps, correlation matrix | 1.5 days |
| **F7** | Overview dashboard, dark mode, responsive polish | 1 day |
| **F8** | Loading states, error boundaries, empty states | 0.5 day |
| **Total** | | **~9 days** |

---

## Commands to Start

```bash
# In macro-alpha/ root
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false
cd frontend
npx shadcn@latest init
npx shadcn@latest add card button tabs select badge accordion table sheet date-picker
npm install @tanstack/react-query lightweight-charts recharts echarts echarts-for-react react-hook-form @hookform/resolvers zod lucide-react
```

---

## Deployment

| Service | What | Config |
|---------|------|--------|
| **Vercel** | Next.js frontend | `vercel.json` — set `NEXT_PUBLIC_API_URL` env var |
| **Render** | FastAPI Python backend | `render.yaml` — Docker or pip start |
| **GitHub Actions** | CI — lint + typecheck on push | `.github/workflows/ci.yml` |

The Python API runs separately. The frontend hits it via `NEXT_PUBLIC_API_URL`. No CORS issues because FastAPI already supports `CORSMiddleware`.

---

## v2 Roadmap (NOT in scope)

- Streaming WebSocket for real-time event alerts
- User accounts + saved analyses (Supabase Auth)
- PostgreSQL migration from SQLite
- Sentiment analysis engine (NLP + Qdrant)
- PDF export of event study reports
- Mobile-responsive bottom nav
