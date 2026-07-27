# MacroPulse Frontend — Complete Plan (v2)

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | Next.js 15 (App Router) | Shell, routing, BFF proxy (auth/session/response shaping only — no business logic) |
| **Language** | TypeScript | Type safety across API contracts + chart configs |
| **UI Components** | shadcn/ui | Accessible, copy-paste, Tailwind-native, no runtime dependency |
| **Styling** | Tailwind CSS v4 | Utility-first, dark mode via CSS variables, matches shadcn |
| **Charts (time-series)** | TradingView Lightweight Charts v5 | Purpose-built for finance, 12KB gzipped, Canvas, smooth at scale |
| **Charts (everything else)** | ECharts (via echarts-for-react) | AR bars, sparklines, heatmaps, correlation matrix, grouped bars — one library for all non-time-series |
| **Server State** | TanStack Query v5 | Caching, dedup, background refetch, loading/error states |
| **Forms** | React Hook Form + Zod | Parameter tuning with validated numeric inputs |
| **Icons** | Lucide React | Matches shadcn, tree-shakeable |
| **API Contract** | openapi-typescript | Auto-generate TS types from FastAPI OpenAPI spec — single source of truth |
| **Deployment** | Vercel (frontend) + Render/Railway (Python API) | Zero-config for Next.js, free tier for API |

### Dropped from v1
- **Recharts** — ECharts covers every chart type Recharts offered; no capability gap justifies a third rendering engine, three tooltip systems, and three theming APIs.
- **WebSocket** — Macro events, FII/DII flows, and sector betas update daily at most. REST + TanStack Query refetch is sufficient. WebSocket infra for daily-frequency data is complexity without justification.

---

## Why NOT Streamlit (current `ui/dashboard.py`)

- Streamlit re-runs entire script on every interaction — poor UX for parameter tuning
- No routing, no SEO, no shareable URLs
- Limited layout control (no responsive grids, no custom components)
- Can't embed TradingView charts or custom Canvas renderers
- Feels like a prototype tool, not a portfolio-quality product

**Decision**: Replace Streamlit with Next.js. Keep `ui/dashboard.py` as a quick-reference for logic, delete from production.

---

## RSC/SSR Boundary (be precise)

Every chart is inherently client-side (Canvas rendering, zoom/pan, tooltips). RSC does **not** make charts faster. What RSC actually powers:

- **Server-fetched**: Root layout, nav shell, initial event list on Overview screen (static data, no interaction)
- **Client-side**: All charts, all parameter forms, all interactive results
- **BFF proxy**: Next.js API routes handle auth/session and response reshaping — never duplicate calculation logic from FastAPI

README should state this boundary explicitly. Don't market "SSR for fast loads" as if it solves chart performance.

---

## Typed API Contract

```bash
# Generate TS types from FastAPI's OpenAPI spec
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.d.ts
```

This runs as a prebuild script. Pydantic schemas on the backend and TypeScript types on the frontend are never hand-written twice. Single source of truth, caught at build time if either side drifts.

---

## Architecture

```
macro-pulse/
├── api/                        # FastAPI (existing, keep as-is)
│   └── app.py
├── frontend/                   # Next.js 15 app (NEW)
│   ├── app/
│   │   ├── layout.tsx          # Root layout, ThemeProvider, QueryProvider
│   │   ├── page.tsx            # Overview dashboard (built LAST)
│   │   ├── globals.css         # Tailwind + shadcn CSS variables
│   │   ├── events/
│   │   │   └── page.tsx        # Event browser / timeline
│   │   ├── event-study/
│   │   │   └── page.tsx        # OLS, AR/CAR, Patell Z
│   │   ├── flow-fx/
│   │   │   └── page.tsx        # Institutional flow & FX corr
│   │   └── sector/
│   │       └── page.tsx        # Sector sensitivity matrix
│   ├── components/
│   │   ├── ui/                 # shadcn primitives (button, card, badge, etc.)
│   │   ├── charts/
│   │   │   ├── car-chart.tsx           # Lightweight Charts — CAR line
│   │   │   ├── ar-bar-chart.tsx        # ECharts — AR daily bars (green/red)
│   │   │   ├── rolling-corr-chart.tsx  # Lightweight Charts — rolling correlation
│   │   │   ├── ratio-area-chart.tsx    # ECharts — Gold/SPY area
│   │   │   ├── sector-heatmap.tsx      # ECharts — sector CAR heatmap
│   │   │   ├── correlation-matrix.tsx  # ECharts — cross-sector correlation
│   │   │   ├── grouped-bar-chart.tsx   # ECharts — pre/post VIX comparison
│   │   │   └── sparkline.tsx           # ECharts — metric sparklines
│   │   ├── chart-theme.ts             # Theme token bridge (see below)
│   │   ├── chart-data-table.tsx       # Accessibility: hidden data table for canvas charts
│   │   ├── event-selector.tsx
│   │   ├── parameter-panel.tsx
│   │   ├── metric-card.tsx
│   │   └── nav-sidebar.tsx
│   ├── lib/
│   │   ├── api.ts              # Typed fetch wrappers (uses generated types)
│   │   └── utils.ts            # cn() helper, date/number formatters
│   ├── hooks/
│   │   ├── use-event-study.ts
│   │   ├── use-flow-analysis.ts
│   │   └── use-sector-sensitivity.ts
│   ├── types/
│   │   └── api.d.ts            # Auto-generated from OpenAPI spec (not hand-written)
│   ├── scripts/
│   │   └── generate-types.sh   # openapi-typescript prebuild
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── engines/
├── data/
├── API_SPEC.md                 # Documents BFF boundary
└── pyproject.toml
```

---

## Cross-Screen State via URL Search Params

Clicking an event in Event Browser must carry that event into Event Study pre-filtered. No shared React context — use URL search params (Next.js supports this natively):

```
/events                        → no selection
/events?eventId=fed-hike-2022-06  → detail drawer open
/event-study?eventId=fed-hike-2022-06&ticker=SPY  → pre-filled, ready to run
/flow-fx?eventId=svb-collapse-2023
/sector?eventId=tariff-escalation-2025-04
```

Every screen reads `searchParams.eventId` on mount. If present, auto-select that event and pre-fill the form. This makes every analysis linkable and shareable — not just navigable within the app.

---

## Chart Theme Bridge

Canvas charts don't inherit CSS variables. A `chartTheme.ts` reads shadcn's CSS variables and passes matching colors into both Lightweight Charts and ECharts configs:

```typescript
// components/chart-theme.ts
import { useTheme } from "next-themes";

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return {
    // Lightweight Charts options
    lightweight: {
      layout: {
        background: { color: isDark ? "#0a0a0a" : "#ffffff" },
        textColor: isDark ? "#a1a1aa" : "#52525b",
      },
      grid: {
        vertLines: { color: isDark ? "#27272a" : "#f4f4f5" },
        horzLines: { color: isDark ? "#27272a" : "#f4f4f5" },
      },
    },
    // ECharts option overrides
    echarts: {
      backgroundColor: "transparent",
      textStyle: { color: isDark ? "#a1a1aa" : "#52525b" },
      axisLineColor: isDark ? "#27272a" : "#e4e4e7",
    },
  };
}
```

Every chart component calls `useChartTheme()` and merges the tokens into its options. Dark mode toggle works consistently across all charts.

---

## Accessibility: Chart Data Tables

Every canvas chart ships a visually-hidden data table (or a toggle "View as table") with the same underlying data. Screen readers get the actual numbers; sighted users get the visual.

```tsx
// components/chart-data-table.tsx
export function ChartDataTable({ data, caption }: { data: Record<string, unknown>[]; caption: string }) {
  return (
    <table className="sr-only" aria-label={caption}>
      <caption>{caption}</caption>
      {/* render rows from data */}
    </table>
  );
}
```

Each chart component renders `<ChartDataTable>` alongside its canvas. This is a known limitation called out in the README, not a bug discovered by a reviewer.

---

## Screen-by-Screen Breakdown

Build order matches backend engine phases — don't build UI ahead of working engines.

### Screen 1: Event Browser (`/events`) — build after Phase 0
**Purpose**: Browse, filter, and select macro events

| Component | Library | Data |
|-----------|---------|------|
| Event cards grid | shadcn Card | `GET /events` |
| Category filter | shadcn Tabs | Client-side filter |
| Date range picker | shadcn DateRangePicker | Client-side filter |
| Event detail drawer | shadcn Sheet | `GET /events/{id}` |
| Link to analysis | URL param `?eventId=` | Navigation to other screens |

### Screen 2: Event Study (`/event-study`) — build after Phase 1
**Purpose**: OLS market model, AR/CAR visualization, Patell Z significance

| Component | Library | Data |
|-----------|---------|------|
| Parameter panel (RHF + Zod) | React Hook Form | User input |
| CAR line chart | **Lightweight Charts** | `POST /event-study` |
| AR daily bars | **ECharts** BarChart | `POST /event-study` |
| Metric cards (CAR, Z, Beta, R²) | shadcn Card | `POST /event-study` |
| Significance badge | shadcn Badge | Computed from p-value |
| OLS details accordion | shadcn Accordion | `POST /event-study` |
| Multi-event comparison table | shadcn Table | `POST /event-study/multi` |
| Hidden data tables | `ChartDataTable` | Accessibility |

### Screen 3: Flow & FX (`/flow-fx`) — build after Phase 2
**Purpose**: Institutional flow regime detection, FX/gold/VIX correlations

| Component | Library | Data |
|-----------|---------|------|
| Parameter panel | React Hook Form | User input |
| Rolling correlation line | **Lightweight Charts** | `POST /flow-analysis` |
| Pre/Post metric cards | shadcn Card | `POST /flow-analysis` |
| Gold/SPY ratio area | **ECharts** AreaChart | `POST /flow-analysis` |
| VIX grouped bars (pre/post) | **ECharts** GroupedBar | `POST /flow-analysis` |
| Hidden data tables | `ChartDataTable` | Accessibility |

### Screen 4: Sector Sensitivity (`/sector`) — build after Phase 3
**Purpose**: Sector beta heatmap, event CARs, cross-sector correlation

| Component | Library | Data |
|-----------|---------|------|
| Parameter panel | React Hook Form | User input |
| Sector CAR heatmap | **ECharts** Heatmap | `POST /sector-sensitivity` |
| Sector beta bars | **ECharts** BarChart | `POST /sector-sensitivity` |
| Correlation matrix | **ECharts** Heatmap (diverging RdBu) | `POST /sector-sensitivity` |
| Data table (raw) | shadcn Table + TanStack Table | `POST /sector-sensitivity` |

### Screen 5: Overview Dashboard (`/`) — build LAST
**Purpose**: Composite summary screen — only valuable once all engines work

| Component | Library | Data |
|-----------|---------|------|
| Event timeline | Custom vertical stepper | `GET /events` (RSC, server-fetched) |
| Quick metrics row | shadcn Card + **ECharts** Sparkline | Last run results (localStorage) |
| Recent activity log | shadcn Table | localStorage |

---

## Chart Library Mapping (final)

| Visualization | Library | Reason |
|---------------|---------|--------|
| CAR time-series | **Lightweight Charts** | Purpose-built, smooth Canvas line, zoom, crosshair |
| Rolling correlation | **Lightweight Charts** | Large dataset, smooth rendering |
| AR daily bars | **ECharts** | Green/red bars, native tooltip, Canvas performance |
| Gold/SPY ratio area | **ECharts** | Gradient fill, area chart support |
| Sector CAR heatmap | **ECharts** Heatmap | Native heatmap coordinate system |
| Correlation matrix | **ECharts** Heatmap | Diverging color scale (RdBu) |
| Metric sparklines | **ECharts** Line (mini) | 60px height, no axes |
| VIX grouped bars | **ECharts** | Pre/post grouped comparison |

Two libraries. One theme bridge. Consistent visual language.

---

## Dark Mode

shadcn/ui ships with CSS variable-based theming:

```css
:root { --background: 0 0% 100%; ... }        /* light */
.dark { --background: 222 47% 6%; ... }        /* dark */
```

Charts respect the theme via `useChartTheme()` (see above). One toggle in the navbar — both chart libraries update simultaneously.

---

## API Integration Pattern

### BFF boundary (Next.js API routes)

Next.js API routes handle **only**:
- Auth/session management
- Response reshaping (flatten nested JSON for UI consumption)
- Combining 2 FastAPI calls into 1 round-trip (if needed)

Next.js API routes **never**:
- Duplicate calculation logic from FastAPI engines
- Store or transform business data
- Hold state between requests

Document this boundary in `API_SPEC.md`.

### Data fetching

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

Each hook wraps with TanStack Query:

```typescript
// hooks/use-event-study.ts
export function useEventStudy(req: EventStudyRequest | null) {
  return useQuery({
    queryKey: ["event-study", req],
    queryFn: () => runEventStudy(req!),
    enabled: !!req,
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## Implementation Phases

| Phase | Scope | Depends on | Time Est. |
|-------|-------|------------|-----------|
| **F1** | Next.js scaffold, shadcn setup, Tailwind, layout + nav, `generate-types.sh` | — | 1 day |
| **F2** | OpenAPI type generation, API client, TanStack Query hooks | F1 | 0.5 day |
| **F3** | Event Browser (`/events`) | Phase 0 backend | 1 day |
| **F4** | Event Study (`/event-study`) — CAR chart (LW), AR bars (ECharts), metric cards | Phase 1 backend | 2 days |
| **F5** | Flow & FX (`/flow-fx`) — rolling correlation (LW), ratio area, VIX bars (ECharts) | Phase 2 backend | 1.5 days |
| **F6** | Sector Sensitivity (`/sector`) — ECharts heatmaps, correlation matrix | Phase 3 backend | 1.5 days |
| **F7** | Overview dashboard (`/`) — composite, built last | All engines | 1 day |
| **F8** | `chartTheme.ts`, dark mode, accessibility tables, responsive polish | — | 1 day |
| **F9** | Loading states, error boundaries, empty states | — | 0.5 day |
| **Total** | | | **~10 days** |

---

## Commands to Start

```bash
cd /path/to/macro-pulse
npx create-next-app@latest frontend --typescript --tailwind --eslint --app
cd frontend
npx shadcn@latest init
npx shadcn@latest add card button tabs select badge accordion table sheet date-picker input label
npm install @tanstack/react-query lightweight-charts echarts echarts-for-react react-hook-form @hookform/resolvers zod lucide-react next-themes
npm install -D openapi-typescript
```

Prebuild script in `package.json`:
```json
{
  "scripts": {
    "generate:types": "openapi-typescript http://localhost:8000/openapi.json -o src/types/api.d.ts",
    "prebuild": "npm run generate:types",
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

---

## Deployment

| Service | What | Config |
|---------|------|--------|
| **Vercel** | Next.js frontend | `NEXT_PUBLIC_API_URL` env var pointing to Python API |
| **Render** | FastAPI Python backend | `render.yaml` — Docker or pip start |
| **GitHub Actions** | CI — lint + typecheck + generate-types check | `.github/workflows/ci.yml` |

The Python API runs separately. CORS handled by FastAPI `CORSMiddleware`.

---

## v2 Roadmap (NOT in scope)

- User accounts + saved analyses (Supabase Auth)
- PostgreSQL migration from SQLite
- Sentiment analysis engine (NLP + Qdrant)
- PDF export of event study reports
- Mobile-responsive bottom nav
- WebSocket streaming (only if sub-second data sources are added)
