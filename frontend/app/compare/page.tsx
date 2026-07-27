"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useEvents } from "@/hooks/use-events";
import { useMultiEventStudy } from "@/hooks/use-event-study";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiEventStudyRequest } from "@/types";

function CompareContent() {
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get("eventId") ?? "";

  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    initialEventId ? [initialEventId] : []
  );
  const [ticker, setTicker] = useState("SPY");
  const [benchmark, setBenchmark] = useState("^GSPC");
  const [request, setRequest] = useState<MultiEventStudyRequest | null>(null);

  const { data: events } = useEvents();
  const { data: results, isLoading } = useMultiEventStudy(request);

  const toggleEvent = useCallback((eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  }, []);

  const handleRun = useCallback(() => {
    if (selectedEvents.length === 0) return;
    setRequest({
      event_ids: selectedEvents,
      ticker,
      benchmark,
    });
  }, [selectedEvents, ticker, benchmark]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Compare Events</h2>
        <p className="text-muted-foreground mt-1">
          Compare CAR, significance, and OLS parameters across multiple macro events.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Selection Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">Select Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {events?.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-start gap-2 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={selectedEvents.includes(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                    />
                    <div>
                      <span className="font-medium">{event.name}</span>
                      <span className="text-muted-foreground ml-1">
                        ({event.date})
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ticker</Label>
                  <Input value={ticker} onChange={(e) => setTicker(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Benchmark</Label>
                  <Input value={benchmark} onChange={(e) => setBenchmark(e.target.value)} />
                </div>
              </div>

              <Button
                className="w-full"
                disabled={selectedEvents.length === 0 || isLoading}
                onClick={handleRun}
              >
                {isLoading
                  ? "Running..."
                  : `Compare ${selectedEvents.length} Events`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-64" />
            </div>
          )}

          {results && results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Comparison Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Event</th>
                        <th className="text-right py-2 px-4 text-muted-foreground font-medium">Date</th>
                        <th className="text-right py-2 px-4 text-muted-foreground font-medium">CAR (%)</th>
                        <th className="text-right py-2 px-4 text-muted-foreground font-medium">Z-stat</th>
                        <th className="text-right py-2 px-4 text-muted-foreground font-medium">p-value</th>
                        <th className="text-right py-2 px-4 text-muted-foreground font-medium">Beta</th>
                        <th className="text-right py-2 px-4 text-muted-foreground font-medium">R²</th>
                        <th className="text-center py-2 pl-4 text-muted-foreground font-medium">Sig.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.event_id} className="border-b border-border/50 hover:bg-accent/50">
                          <td className="py-2 pr-4 font-medium max-w-[200px] truncate">{r.event_name}</td>
                          <td className="text-right py-2 px-4 text-muted-foreground">{r.date}</td>
                          <td className="text-right py-2 px-4 font-mono">
                            {r.car_total_pct >= 0 ? "+" : ""}
                            {r.car_total_pct.toFixed(3)}%
                          </td>
                          <td className="text-right py-2 px-4 font-mono">{r.z_stat.toFixed(3)}</td>
                          <td className="text-right py-2 px-4 font-mono">{r.p_value.toFixed(4)}</td>
                          <td className="text-right py-2 px-4 font-mono">{r.beta.toFixed(4)}</td>
                          <td className="text-right py-2 px-4 font-mono">{r.r_squared.toFixed(4)}</td>
                          <td className="text-center py-2 pl-4">
                            <Badge
                              variant={r.significant ? (r.car_total_pct >= 0 ? "default" : "destructive") : "secondary"}
                              className="text-xs"
                            >
                              {r.significant ? "Yes" : "No"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {results && results.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No valid results returned for the selected events.
              </CardContent>
            </Card>
          )}

          {!isLoading && !results && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select 2+ events and click &quot;Compare Events&quot; to see a
                side-by-side comparison of their market impact.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Skeleton className="h-[500px] rounded-lg" />
            <Skeleton className="h-64" />
          </div>
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
