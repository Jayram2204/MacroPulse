"use client";

import { useQuery } from "@tanstack/react-query";
import { runEventStudy, runMultiEventStudy } from "@/lib/api";
import type { EventStudyRequest, MultiEventStudyRequest } from "@/types";

export function useEventStudy(req: EventStudyRequest | null) {
  return useQuery({
    queryKey: ["event-study", req],
    queryFn: () => runEventStudy(req!),
    enabled: !!req?.event_id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMultiEventStudy(req: MultiEventStudyRequest | null) {
  return useQuery({
    queryKey: ["event-study-multi", req],
    queryFn: () => runMultiEventStudy(req!),
    enabled: !!req && req.event_ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
