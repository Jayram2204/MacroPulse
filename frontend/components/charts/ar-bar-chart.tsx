"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react";
import { useChartTheme } from "@/components/chart-theme";
import { ChartDataTable } from "@/components/chart-data-table";

interface ArBarChartProps {
  data: Record<string, number>;
}

export function ArBarChart({ data }: ArBarChartProps) {
  const theme = useChartTheme();

  const { categories, values } = useMemo(() => {
    const entries = Object.entries(data);
    return {
      categories: entries.map(([k]) => k),
      values: entries.map(([, v]) => +(v * 100).toFixed(4)),
    };
  }, [data]);

  const tableHeaders = ["Day", "AR (%)"];
  const tableRows = categories.map((c, i) => [c, values[i].toFixed(3)]);

  const option = {
    ...theme.echarts,
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: theme.echarts.tooltipBg,
      textStyle: { color: theme.echarts.textStyle.color },
    },
    xAxis: {
      type: "category" as const,
      data: categories,
      axisLine: { lineStyle: { color: theme.echarts.axisLineColor } },
      axisLabel: { color: theme.echarts.textStyle.color, fontSize: 10 },
    },
    yAxis: {
      type: "value" as const,
      name: "AR (%)",
      axisLine: { lineStyle: { color: theme.echarts.axisLineColor } },
      splitLine: { lineStyle: { color: theme.echarts.splitLineColor } },
      axisLabel: { color: theme.echarts.textStyle.color },
    },
    series: [
      {
        type: "bar" as const,
        data: values.map((v) => ({
          value: v,
          itemStyle: { color: v >= 0 ? "#22c55e" : "#ef4444" },
        })),
        barMaxWidth: 32,
      },
    ],
    grid: { left: 48, right: 16, top: 16, bottom: 32 },
  };

  return (
    <div>
      <ReactEChartsCore option={option} style={{ height: 320 }} />
      <ChartDataTable
        caption="Abnormal Returns data"
        headers={tableHeaders}
        rows={tableRows}
      />
    </div>
  );
}
