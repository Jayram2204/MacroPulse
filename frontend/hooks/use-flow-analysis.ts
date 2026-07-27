"use client";

import { useQuery } from "@tanstack/react-query";
import { runFlowAnalysis } from "@/lib/api";
import type { FlowRequest } from "@/types";

export function useFlowAnalysis(req: FlowRequest | null) {
  return useQuery({
    queryKey: ["flow-analysis", req],
    queryFn: () => runFlowAnalysis(req!),
    enabled: !!req?.event_id,
    staleTime: 5 * 60 * 1000,
  });
}
