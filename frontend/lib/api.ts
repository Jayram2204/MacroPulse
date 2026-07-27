import type {
  MacroEvent,
  EventStudyRequest,
  EventStudyResponse,
  MultiEventStudyRequest,
  FlowRequest,
  FlowAnalysisResponse,
  SectorRequest,
  SectorSensitivityResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function fetchEvents(category?: string): Promise<MacroEvent[]> {
  const params = category ? `?category=${category}` : "";
  return apiFetch<MacroEvent[]>(`/events${params}`);
}

export function fetchEventDetail(eventId: string): Promise<MacroEvent> {
  return apiFetch<MacroEvent>(`/events/${eventId}`);
}

// ---------------------------------------------------------------------------
// Event Study
// ---------------------------------------------------------------------------

export function runEventStudy(req: EventStudyRequest): Promise<EventStudyResponse> {
  return apiFetch<EventStudyResponse>("/event-study", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function runMultiEventStudy(
  req: MultiEventStudyRequest
): Promise<EventStudyResponse[]> {
  return apiFetch<EventStudyResponse[]>("/event-study/multi", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// ---------------------------------------------------------------------------
// Flow & FX
// ---------------------------------------------------------------------------

export function runFlowAnalysis(req: FlowRequest): Promise<FlowAnalysisResponse> {
  return apiFetch<FlowAnalysisResponse>("/flow-analysis", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// ---------------------------------------------------------------------------
// Sector Sensitivity
// ---------------------------------------------------------------------------

export function runSectorSensitivity(
  req: SectorRequest
): Promise<SectorSensitivityResponse> {
  return apiFetch<SectorSensitivityResponse>("/sector-sensitivity", {
    method: "POST",
    body: JSON.stringify(req),
  });
}
