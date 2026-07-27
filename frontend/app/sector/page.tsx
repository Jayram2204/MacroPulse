"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEvents } from "@/hooks/use-events";
import { useSectorSensitivity } from "@/hooks/use-sector-sensitivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SectorHeatmap } from "@/components/charts/sector-heatmap";
import { CorrelationMatrix } from "@/components/charts/correlation-matrix";
import { ErrorBoundary } from "@/components/error-boundary";
import type { SectorRequest } from "@/types";

const schema = z.object({
  estimationDays: z.coerce.number(),
  eventWindowDays: z.coerce.number(),
});

type FormValues = z.infer<typeof schema>;

function SectorContent() {
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get("eventId") ?? "";

  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [request, setRequest] = useState<SectorRequest | null>(null);

  const { data: events } = useEvents();
  const { data: result, isLoading } = useSectorSensitivity(request);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      estimationDays: 252,
      eventWindowDays: 5,
    },
  });

  const onSubmit = useCallback(
    (values: FormValues) => {
      if (!selectedEventId) return;
      setRequest({
        event_id: selectedEventId,
        estimation_days: values.estimationDays,
        event_window_days: values.eventWindowDays,
      });
    },
    [selectedEventId]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Sector Sensitivity</h2>
        <p className="text-muted-foreground mt-1">
          Sector betas, event-day CARs, and cross-sector correlation matrix.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Parameter Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Event</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                  >
                    <option value="">Select an event...</option>
                    {events?.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} ({ev.date})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Estimation (d)</Label>
                    <Input type="number" {...form.register("estimationDays")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Event Window (d)</Label>
                    <Input type="number" {...form.register("eventWindowDays")} />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedEventId || isLoading}
                >
                  {isLoading ? "Running..." : "Run Sector Analysis"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-80" />
              <Skeleton className="h-96" />
            </div>
          )}

          {result && (
            <ErrorBoundary>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Sector Betas</CardTitle>
                </CardHeader>
                <CardContent>
                  <SectorHeatmap data={result.heatmap} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cross-Sector Correlation Matrix</CardTitle>
                </CardHeader>
                <CardContent>
                  <CorrelationMatrix data={result.correlation_matrix} />
                </CardContent>
              </Card>
            </ErrorBoundary>
          )}

          {!isLoading && !result && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {selectedEventId
                  ? "Configure parameters and click \"Run Sector Analysis\" to begin."
                  : "Select an event from the sidebar to begin."}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SectorPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Skeleton className="h-[300px] rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-80" />
            </div>
          </div>
        </div>
      }
    >
      <SectorContent />
    </Suspense>
  );
}
