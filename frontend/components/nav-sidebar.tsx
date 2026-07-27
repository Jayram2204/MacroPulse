"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BarChart3,
  Calendar,
  GitBranch,
  Layers,
  Moon,
  Sun,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSyncExternalStore } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: Layers },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/event-study", label: "Event Study", icon: TrendingUp },
  { href: "/flow-fx", label: "Flow & FX", icon: GitBranch },
  { href: "/sector", label: "Sector", icon: BarChart3 },
] as const;

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function NavSidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useIsMounted();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          MacroPulse
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          size="icon"
          className="w-full"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
