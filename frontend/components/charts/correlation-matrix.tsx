"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react";
import { useChartTheme } from "@/components/chart-theme";
import { ChartDataTable } from "@/components/chart-data-table";

interface CorrelationMatrixProps {
  data: Record<string, Record<string, number>>;
}

export function CorrelationMatrix({ data }: CorrelationMatrixProps) {
  const theme = useChartTheme();

  const { sectors, heatData } = useMemo(() => {
    const keys = Object.keys(data);
    const flat: [number, number, number][] = [];
    keys.forEach((row, i) => {
      keys.forEach((col, j) => {
        flat.push([i, j, +(data[row][col] ?? 0).toFixed(2)]);
      });
    });
    return { sectors: keys, heatData: flat };
  }, [data]);

  const option = useMemo(
    () => ({
      ...theme.echarts,
      tooltip: {
        backgroundColor: theme.echarts.tooltipBg,
        textStyle: { color: theme.echarts.textStyle.color },
        formatter: (p: [number, number, number]) => {
          const [x, y, v] = p;
          return `${sectors[x]} × ${sectors[y]}: ${v}`;
        },
      },
      grid: { left: 80, right: 16, top: 16, bottom: 80 },
      xAxis: {
        type: "category" as const,
        data: sectors,
        axisLine: { lineStyle: { color: theme.echarts.axisLineColor } },
        axisLabel: { color: theme.echarts.textStyle.color, rotate: 45, fontSize: 10 },
        splitArea: { show: true },
      },
      yAxis: {
        type: "category" as const,
        data: sectors,
        axisLine: { lineStyle: { color: theme.echarts.axisLineColor } },
        axisLabel: { color: theme.echarts.textStyle.color, fontSize: 10 },
        splitArea: { show: true },
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: "horizontal" as const,
        left: "center",
        bottom: 0,
        inRange: {
          color: ["#3b82f6", "#ffffff", "#ef4444"],
        },
        textStyle: { color: theme.echarts.textStyle.color },
      },
      series: [
        {
          type: "heatmap" as const,
          data: heatData,
          label: { show: true, fontSize: 9, color: theme.echarts.textStyle.color },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: "rgba(0, 0, 0, 0.5)" },
          },
        },
      ],
    }),
    [sectors, heatData, theme]
  );

  const tableHeaders = ["", ...sectors];
  const tableRows = sectors.map((row) => [
    row,
    ...sectors.map((col) => (data[row][col] ?? 0).toFixed(2)),
  ]);

  return (
    <div>
      <ReactEChartsCore option={option} style={{ height: 450 }} />
      <ChartDataTable
        caption="Cross-sector correlation matrix"
        headers={tableHeaders}
        rows={tableRows}
      />
    </div>
  );
}
