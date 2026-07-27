"use client";

import { useQuery } from "@tanstack/react-query";
import { runSectorSensitivity } from "@/lib/api";
import type { SectorRequest } from "@/types";

export function useSectorSensitivity(req: SectorRequest | null) {
  return useQuery({
    queryKey: ["sector-sensitivity", req],
    queryFn: () => runSectorSensitivity(req!),
    enabled: !!req?.event_id,
    staleTime: 5 * 60 * 1000,
  });
}
