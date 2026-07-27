"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEvents, fetchEventDetail } from "@/lib/api";

export function useEvents(category?: string) {
  return useQuery({
    queryKey: ["events", category],
    queryFn: () => fetchEvents(category),
    staleTime: 10 * 60 * 1000,
  });
}

export function useEventDetail(eventId: string | null) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventDetail(eventId!),
    enabled: !!eventId,
    staleTime: 10 * 60 * 1000,
  });
}
