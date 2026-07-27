"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react";
import { useChartTheme } from "@/components/chart-theme";
import { ChartDataTable } from "@/components/chart-data-table";

interface GroupedBarChartProps {
  pre: number;
  post: number;
  label: string;
}

export function GroupedBarChart({ pre, post, label }: GroupedBarChartProps) {
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
            { value: +pre.toFixed(4), itemStyle: { color: "#6366f1" } },
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
  ];

  return (
    <div>
      <ReactEChartsCore option={option} style={{ height: 280 }} />
      <ChartDataTable caption={label} headers={["Window", "Value"]} rows={tableRows} />
    </div>
  );
}
