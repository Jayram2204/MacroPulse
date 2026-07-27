"use client";

import Link from "next/link";
import { Calendar, TrendingUp, GitBranch, BarChart3, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEvents } from "@/hooks/use-events";
import { Skeleton } from "@/components/ui/skeleton";

const FEATURES = [
  {
    title: "Event Study",
    description: "OLS market model, AR/CAR, Patell Z-score significance testing",
    href: "/event-study",
    icon: TrendingUp,
  },
  {
    title: "Flow & FX",
    description: "Institutional flow regime detection, FX/gold/VIX correlations",
    href: "/flow-fx",
    icon: GitBranch,
  },
  {
    title: "Sector Sensitivity",
    description: "Sector betas, event-day CARs, cross-sector correlation matrix",
    href: "/sector",
    icon: BarChart3,
  },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  fed_decision: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  tariff: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  election: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  banking_crisis: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  exogenous_shock: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
};

export default function OverviewPage() {
  const { data: events, isLoading } = useEvents();

  const recentEvents = events
    ?.slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">MacroPulse</h2>
        <p className="text-muted-foreground mt-1">
          Quantify macro event impact on equities through OLS event studies,
          cross-asset correlation analysis, and sector sensitivity heatmaps.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {FEATURES.map(({ title, description, href, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="transition-colors hover:bg-accent h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {recentEvents?.map((event) => (
                <Link
                  key={event.id}
                  href={`/event-study?eventId=${event.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={`${CATEGORY_COLORS[event.category] ?? ""} text-xs`}
                    >
                      {event.category.replace("_", " ")}
                    </Badge>
                    <span className="font-medium">{event.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{event.date}</span>
                    {event.magnitude_bp !== null && (
                      <Badge variant="outline" className="text-xs">
                        {event.magnitude_bp > 0 ? "+" : ""}
                        {event.magnitude_bp}bp
                      </Badge>
                    )}
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          )}
          {events && events.length > 5 && (
            <Link
              href="/events"
              className="mt-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View all {events.length} events
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>1.</strong> Go to{" "}
            <Link href="/events" className="underline">
              Events
            </Link>{" "}
            and pick a macro event (Fed decision, tariff, election, etc.)
          </p>
          <p>
            <strong>2.</strong> Click into Event Study, Flow &amp; FX, or Sector
            to run the analysis
          </p>
          <p>
            <strong>3.</strong> Tune parameters, compare across events, share
            via URL
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
