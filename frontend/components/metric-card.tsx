import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
  className?: string;
}

export function MetricCard({
  title,
  value,
  delta,
  deltaType = "neutral",
  className,
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {delta && (
          <p
            className={cn(
              "text-xs mt-1",
              deltaType === "positive" && "text-green-600 dark:text-green-400",
              deltaType === "negative" && "text-red-600 dark:text-red-400",
              deltaType === "neutral" && "text-muted-foreground"
            )}
          >
            {delta}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
