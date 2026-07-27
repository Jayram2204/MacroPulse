// TypeScript types matching FastAPI Pydantic schemas
// In production, auto-generated via: npm run generate:types

export interface MacroEvent {
  id: string;
  name: string;
  category: string;
  date: string;
  expected: boolean;
  magnitude_bp: number | null;
  description?: string;
}

export interface EventStudyRequest {
  event_id: string;
  ticker?: string;
  benchmark?: string;
  estimation_start?: number;
  estimation_end?: number;
  event_start?: number;
  event_end?: number;
}

export interface EventStudyResponse {
  event_id: string;
  event_name: string;
  date: string;
  ticker: string;
  alpha: number;
  beta: number;
  r_squared: number;
  estimation_obs: number;
  car_total_pct: number;
  z_stat: number;
  p_value: number;
  significant: boolean;
  car_series: Record<string, number>;
  ar_series: Record<string, number>;
}

export interface MultiEventStudyRequest {
  event_ids: string[];
  ticker?: string;
  benchmark?: string;
  estimation_start?: number;
  estimation_end?: number;
  event_start?: number;
  event_end?: number;
}

export interface FlowRequest {
  event_id: string;
  equity_ticker?: string;
  rolling_days?: number;
  pre_event_days?: number;
  post_event_days?: number;
}

export interface FlowAnalysisResponse {
  event_id: string;
  event_name: string;
  date: string;
  fx_equity_corr: {
    pre: number;
    post: number;
    shift: number;
  };
  gold_spy_ratio: {
    pre_mean: number;
    post_mean: number;
    mean_shift_pct: number;
  };
  vix_equity_corr: {
    pre: number;
    post: number;
    shift: number;
  };
}

export interface SectorRequest {
  event_id: string;
  estimation_days?: number;
  event_window_days?: number;
}

export interface SectorSensitivityResponse {
  event_id: string;
  event_name: string;
  date: string;
  heatmap: Record<string, { beta: number; alpha: number; r_squared: number }>;
  correlation_matrix: Record<string, Record<string, number>>;
}
