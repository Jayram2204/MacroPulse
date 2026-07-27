"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useEvents, useEventDetail } from "@/hooks/use-events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, GitBranch, BarChart3, Calendar } from "lucide-react";
import Link from "next/link";
import { getCategoryClasses, getCategoryLabel } from "@/lib/constants";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "fed_decision", label: "Fed Decisions" },
  { value: "tariff", label: "Tariffs" },
  { value: "election", label: "Elections" },
  { value: "banking_crisis", label: "Banking" },
  { value: "exogenous_shock", label: "Shocks" },
] as const;

function EventsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("eventId");
  const [category, setCategory] = useState("all");

  const { data: events, isLoading } = useEvents(
    category === "all" ? undefined : category
  );
  const { data: selectedEvent } = useEventDetail(selectedId);

  function handleSelectEvent(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("eventId", id);
    router.push(`/events?${params.toString()}`);
  }

  function handleClose() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("eventId");
    router.push(`/events?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Macro Events</h2>
        <p className="text-muted-foreground mt-1">
          Browse and select US policy events for analysis.
        </p>
      </div>

      <Tabs value={category} onValueChange={setCategory}>
        <TabsList>
          {CATEGORIES.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events?.map((event) => (
            <Card
              key={event.id}
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => handleSelectEvent(event.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-tight">
                    {event.name}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className={getCategoryClasses(event.category)}
                  >
                    {getCategoryLabel(event.category)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {event.date}
                  {event.magnitude_bp !== null && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {event.magnitude_bp > 0 ? "+" : ""}
                      {event.magnitude_bp}bp
                    </Badge>
                  )}
                </div>
                {event.expected !== undefined && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {event.expected ? "Expected" : "Surprise"}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!selectedId} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>{selectedEvent?.name}</SheetTitle>
            <SheetDescription>{selectedEvent?.date}</SheetDescription>
          </SheetHeader>
          {selectedEvent && (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                {selectedEvent.description}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {getCategoryLabel(selectedEvent.category)}
                </Badge>
                {selectedEvent.magnitude_bp !== null && (
                  <Badge variant="outline">
                    {selectedEvent.magnitude_bp > 0 ? "+" : ""}
                    {selectedEvent.magnitude_bp}bp
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Link href={`/event-study?eventId=${selectedEvent.id}`}>
                  <Button size="sm">
                    <TrendingUp className="mr-2 h-3 w-3" />
                    Event Study
                  </Button>
                </Link>
                <Link href={`/flow-fx?eventId=${selectedEvent.id}`}>
                  <Button size="sm" variant="outline">
                    <GitBranch className="mr-2 h-3 w-3" />
                    Flow &amp; FX
                  </Button>
                </Link>
                <Link href={`/sector?eventId=${selectedEvent.id}`}>
                  <Button size="sm" variant="outline">
                    <BarChart3 className="mr-2 h-3 w-3" />
                    Sector
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-96" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  );
}
