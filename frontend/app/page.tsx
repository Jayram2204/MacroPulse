"use client";

import Link from "next/link";
import { Calendar, TrendingUp, GitBranch, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">MacroPulse</h2>
        <p className="text-muted-foreground mt-1">
          Macro event impact analysis toolkit for equities and ETFs.
          Select an event and engine to begin.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>1.</strong> Go to <Link href="/events" className="underline">Events</Link> and
            pick a macro event (Fed decision, tariff, election, etc.)
          </p>
          <p>
            <strong>2.</strong> Click into Event Study, Flow &amp; FX, or Sector to run the analysis
          </p>
          <p>
            <strong>3.</strong> Tune parameters, compare across events, share via URL
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
