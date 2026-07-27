"use client";

import { useEffect, useRef } from "react";
import { createChart, type IChartApi, LineSeries } from "lightweight-charts";
import { useChartTheme } from "@/components/chart-theme";
import { ChartDataTable } from "@/components/chart-data-table";

interface RollingCorrChartProps {
  pre: number;
  post: number;
}

export function RollingCorrChart({ pre, post }: RollingCorrChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const theme = useChartTheme();

  const tableHeaders = ["Window", "Correlation"];
  const tableRows = [
    ["Pre-event", pre.toFixed(4)],
    ["Post-event", post.toFixed(4)],
    ["Shift", (post - pre).toFixed(4)],
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 280,
      ...theme.lightweight,
    });

    const series = chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
    });

    // Bar chart showing pre vs post correlation
    const data = [
      { time: "Pre" as unknown as import("lightweight-charts").Time, value: pre },
      { time: "Post" as unknown as import("lightweight-charts").Time, value: post },
    ];
    series.setData(data);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [pre, post, theme]);

  return (
    <div>
      <div ref={containerRef} className="w-full" />
      <ChartDataTable
        caption="Rolling correlation pre vs post event"
        headers={tableHeaders}
        rows={tableRows}
      />
    </div>
  );
}
