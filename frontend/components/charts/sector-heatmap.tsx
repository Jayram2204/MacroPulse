"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react";
import { useChartTheme } from "@/components/chart-theme";
import { ChartDataTable } from "@/components/chart-data-table";

interface SectorHeatmapProps {
  data: Record<string, { beta: number; alpha: number; r_squared: number }>;
}

export function SectorHeatmap({ data }: SectorHeatmapProps) {
  const theme = useChartTheme();

  const { sectors, betas, rSquaredVals } = useMemo(() => {
    const entries = Object.entries(data);
    return {
      sectors: entries.map(([k]) => k),
      betas: entries.map(([, v]) => v.beta),
      rSquaredVals: entries.map(([, v]) => v.r_squared),
    };
  }, [data]);

  const option = useMemo(
    () => ({
      ...theme.echarts,
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: theme.echarts.tooltipBg,
        textStyle: { color: theme.echarts.textStyle.color },
      },
      xAxis: {
        type: "category" as const,
        data: sectors,
        axisLine: { lineStyle: { color: theme.echarts.axisLineColor } },
        axisLabel: { color: theme.echarts.textStyle.color, rotate: 45, fontSize: 10 },
      },
      yAxis: {
        type: "value" as const,
        name: "Beta",
        axisLine: { lineStyle: { color: theme.echarts.axisLineColor } },
        splitLine: { lineStyle: { color: theme.echarts.splitLineColor } },
        axisLabel: { color: theme.echarts.textStyle.color },
      },
      series: [
        {
          type: "bar" as const,
          data: betas.map((v) => ({
            value: +v.toFixed(4),
            itemStyle: { color: v > 1 ? "var(--loss)" : v > 0.8 ? "#f59e0b" : "var(--gain)" },
          })),
          barMaxWidth: 40,
        },
      ],
      grid: { left: 48, right: 16, top: 32, bottom: 80 },
    }),
    [sectors, betas, theme]
  );

  const tableHeaders = ["Sector", "Beta", "R²"];
  const tableRows = sectors.map((s, i) => [s, betas[i].toFixed(4), rSquaredVals[i].toFixed(4)]);

  return (
    <div>
      <ReactEChartsCore option={option} style={{ height: 350 }} />
      <ChartDataTable caption="Sector betas" headers={tableHeaders} rows={tableRows} />
    </div>
  );
}
