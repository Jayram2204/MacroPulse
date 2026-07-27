"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react";
import { useChartTheme } from "@/components/chart-theme";
import { ChartDataTable } from "@/components/chart-data-table";

interface CorrCompareChartProps {
  pre: number;
  post: number;
  label?: string;
}

export function CorrCompareChart({ pre, post, label = "Correlation" }: CorrCompareChartProps) {
  const theme = useChartTheme();

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
        data: ["Pre-event", "Post-event"],
        axisLine: { lineStyle: { color: theme.echarts.axisLineColor } },
        axisLabel: { color: theme.echarts.textStyle.color },
      },
      yAxis: {
        type: "value" as const,
        name: label,
        axisLine: { lineStyle: { color: theme.echarts.axisLineColor } },
        splitLine: { lineStyle: { color: theme.echarts.splitLineColor } },
        axisLabel: { color: theme.echarts.textStyle.color },
      },
      series: [
        {
          type: "bar" as const,
          data: [
            { value: +pre.toFixed(4), itemStyle: { color: "#8b5cf6" } },
            { value: +post.toFixed(4), itemStyle: { color: "#ec4899" } },
          ],
          barMaxWidth: 64,
        },
      ],
      grid: { left: 48, right: 16, top: 32, bottom: 32 },
    }),
    [pre, post, label, theme]
  );

  const tableRows = [
    ["Pre-event", pre.toFixed(4)],
    ["Post-event", post.toFixed(4)],
    ["Shift", (post - pre).toFixed(4)],
  ];

  return (
    <div>
      <ReactEChartsCore option={option} style={{ height: 280 }} />
      <ChartDataTable caption={`${label} pre vs post event`} headers={["Window", "Value"]} rows={tableRows} />
    </div>
  );
}
