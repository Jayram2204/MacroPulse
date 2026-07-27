"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEvents } from "@/hooks/use-events";
import { useFlowAnalysis } from "@/hooks/use-flow-analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RollingCorrChart } from "@/components/charts/rolling-corr-chart";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";
import { MetricCard } from "@/components/metric-card";
import type { FlowRequest } from "@/types";

const schema = z.object({
  equityTicker: z.string().min(1),
  rollingDays: z.coerce.number(),
  preEventDays: z.coerce.number(),
  postEventDays: z.coerce.number(),
});

type FormValues = z.infer<typeof schema>;

function FlowFxContent() {
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get("eventId") ?? "";

  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [request, setRequest] = useState<FlowRequest | null>(null);

  const { data: events } = useEvents();
  const { data: result, isLoading } = useFlowAnalysis(request);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      equityTicker: "SPY",
      rollingDays: 60,
      preEventDays: 30,
      postEventDays: 30,
    },
  });

  const onSubmit = useCallback(
    (values: FormValues) => {
      if (!selectedEventId) return;
      setRequest({
        event_id: selectedEventId,
        equity_ticker: values.equityTicker,
        rolling_days: values.rollingDays,
        pre_event_days: values.preEventDays,
        post_event_days: values.postEventDays,
      });
    },
    [selectedEventId]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Flow &amp; FX</h2>
        <p className="text-muted-foreground mt-1">
          Institutional flow regime detection, FX/gold/VIX correlations around macro events.
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

                <div className="space-y-2">
                  <Label>Equity Ticker</Label>
                  <Input {...form.register("equityTicker")} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Rolling (d)</Label>
                    <Input type="number" {...form.register("rollingDays")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Pre (d)</Label>
                    <Input type="number" {...form.register("preEventDays")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Post (d)</Label>
                    <Input type="number" {...form.register("postEventDays")} />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedEventId || isLoading}
                >
                  {isLoading ? "Running..." : "Run Flow Analysis"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {isLoading && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-72" />
            </div>
          )}

          {result && (
            <>
              {/* FX-Equity Correlation */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  FX-Equity Correlation (USD Index vs S&amp;P)
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard
                    title="Pre-event"
                    value={result.fx_equity_corr.pre.toFixed(4)}
                  />
                  <MetricCard
                    title="Post-event"
                    value={result.fx_equity_corr.post.toFixed(4)}
                  />
                  <MetricCard
                    title="Shift"
                    value={`${result.fx_equity_corr.shift >= 0 ? "+" : ""}${result.fx_equity_corr.shift.toFixed(4)}`}
                    deltaType={result.fx_equity_corr.shift > 0 ? "positive" : "negative"}
                  />
                </div>
              </div>

              {/* Gold/SPY Ratio */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Gold/SPY Ratio (Safe Haven Demand)
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard
                    title="Pre mean"
                    value={result.gold_spy_ratio.pre_mean.toFixed(4)}
                  />
                  <MetricCard
                    title="Post mean"
                    value={result.gold_spy_ratio.post_mean.toFixed(4)}
                  />
                  <MetricCard
                    title="Mean shift"
                    value={`${result.gold_spy_ratio.mean_shift_pct >= 0 ? "+" : ""}${result.gold_spy_ratio.mean_shift_pct.toFixed(3)}%`}
                    deltaType={result.gold_spy_ratio.mean_shift_pct > 0 ? "positive" : "negative"}
                  />
                </div>
              </div>

              {/* VIX Correlation */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  VIX-Equity Correlation
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard
                    title="Pre-event"
                    value={result.vix_equity_corr.pre.toFixed(4)}
                  />
                  <MetricCard
                    title="Post-event"
                    value={result.vix_equity_corr.post.toFixed(4)}
                  />
                  <MetricCard
                    title="Shift"
                    value={`${result.vix_equity_corr.shift >= 0 ? "+" : ""}${result.vix_equity_corr.shift.toFixed(4)}`}
                    deltaType={result.vix_equity_corr.shift > 0 ? "positive" : "negative"}
                  />
                </div>
              </div>

              {/* Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">FX-Equity Correlation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RollingCorrChart
                      pre={result.fx_equity_corr.pre}
                      post={result.fx_equity_corr.post}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">VIX Correlation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GroupedBarChart
                      pre={result.vix_equity_corr.pre}
                      post={result.vix_equity_corr.post}
                      label="Correlation"
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {!isLoading && !result && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {selectedEventId
                  ? "Configure parameters and click \"Run Flow Analysis\" to begin."
                  : "Select an event from the sidebar to begin."}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlowFxPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Skeleton className="h-[400px] rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-72" />
            </div>
          </div>
        </div>
      }
    >
      <FlowFxContent />
    </Suspense>
  );
}
