"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEvents } from "@/hooks/use-events";
import { useEventStudy } from "@/hooks/use-event-study";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CarChart } from "@/components/charts/car-chart";
import { ArBarChart } from "@/components/charts/ar-bar-chart";
import { MetricCard } from "@/components/metric-card";
import { ErrorBoundary } from "@/components/error-boundary";
import type { EventStudyRequest } from "@/types";

const schema = z.object({
  ticker: z.string().min(1),
  benchmark: z.string().min(1),
  estimationStart: z.coerce.number(),
  estimationEnd: z.coerce.number(),
  eventStart: z.coerce.number(),
  eventEnd: z.coerce.number(),
});

type FormValues = z.infer<typeof schema>;

function EventStudyContent() {
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get("eventId") ?? "";

  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [request, setRequest] = useState<EventStudyRequest | null>(null);

  const { data: events } = useEvents();
  const { data: result, isLoading } = useEventStudy(request);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ticker: "SPY",
      benchmark: "^GSPC",
      estimationStart: -252,
      estimationEnd: -30,
      eventStart: -5,
      eventEnd: 5,
    },
  });

  const onSubmit = useCallback(
    (values: FormValues) => {
      if (!selectedEventId) return;
      setRequest({
        event_id: selectedEventId,
        ticker: values.ticker,
        benchmark: values.benchmark,
        estimation_start: values.estimationStart,
        estimation_end: values.estimationEnd,
        event_start: values.eventStart,
        event_end: values.eventEnd,
      });
    },
    [selectedEventId]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Event Study</h2>
        <p className="text-muted-foreground mt-1">
          OLS market model, abnormal returns, and Patell Z significance testing.
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
                  <Select
                    value={selectedEventId}
                    onValueChange={(val) => setSelectedEventId(val ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {events?.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id}>
                          {ev.name} ({ev.date})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Ticker</Label>
                    <Input {...form.register("ticker")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Benchmark</Label>
                    <Input {...form.register("benchmark")} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Est. Start</Label>
                    <Input type="number" {...form.register("estimationStart")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Est. End</Label>
                    <Input type="number" {...form.register("estimationEnd")} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Event Start</Label>
                    <Input type="number" {...form.register("eventStart")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Event End</Label>
                    <Input type="number" {...form.register("eventEnd")} />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedEventId || isLoading}
                >
                  {isLoading ? "Running..." : "Run Event Study"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {isLoading && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          )}

          {result && (
            <ErrorBoundary>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="CAR"
                  value={`${result.car_total_pct >= 0 ? "+" : ""}${result.car_total_pct.toFixed(3)}%`}
                  delta={result.significant ? "Significant at 5%" : "Not significant"}
                  deltaType={result.significant ? (result.car_total_pct >= 0 ? "positive" : "negative") : "neutral"}
                />
                <MetricCard
                  title="Patell Z"
                  value={result.z_stat.toFixed(3)}
                  delta={`p = ${result.p_value.toFixed(4)}`}
                />
                <MetricCard
                  title="Beta"
                  value={result.beta.toFixed(4)}
                />
                <MetricCard
                  title="R²"
                  value={result.r_squared.toFixed(4)}
                />
              </div>

              {result.significant && (
                <Badge variant={result.car_total_pct >= 0 ? "default" : "destructive"} className="text-sm">
                  CAR is statistically significant at 5% level (p={result.p_value.toFixed(4)})
                </Badge>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cumulative Abnormal Return</CardTitle>
                </CardHeader>
                <CardContent>
                  <CarChart data={result.car_series} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Daily Abnormal Returns</CardTitle>
                </CardHeader>
                <CardContent>
                  <ArBarChart data={result.ar_series} />
                </CardContent>
              </Card>

              <Accordion>
                <AccordionItem value="ols">
                  <AccordionTrigger>OLS Estimation Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Alpha:</span>{" "}
                        {result.alpha.toFixed(6)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Beta:</span>{" "}
                        {result.beta.toFixed(4)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">R²:</span>{" "}
                        {result.r_squared.toFixed(4)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Observations:</span>{" "}
                        {result.estimation_obs}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ErrorBoundary>
          )}

          {!isLoading && !result && selectedEventId && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Configure parameters and click &quot;Run Event Study&quot; to begin.
              </CardContent>
            </Card>
          )}

          {!selectedEventId && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select an event from the sidebar to begin.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventStudyPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Skeleton className="h-[500px] rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-80" />
            </div>
          </div>
        </div>
      }
    >
      <EventStudyContent />
    </Suspense>
  );
}
