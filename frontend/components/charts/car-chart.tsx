"use client";

import { useEffect, useRef } from "react";
import { createChart, type IChartApi, LineSeries } from "lightweight-charts";
import { useChartTheme } from "@/components/chart-theme";
import { ChartDataTable } from "@/components/chart-data-table";

interface CarChartProps {
  data: Record<string, number>;
}

export function CarChart({ data }: CarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const theme = useChartTheme();

  const entries = Object.entries(data);
  const tableHeaders = ["Day", "CAR (%)"];
  const tableRows = entries.map(([k, v]) => [k, (v * 100).toFixed(3)]);

  useEffect(() => {
    if (!containerRef.current || entries.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 320,
      ...theme.lightweight,
      timeScale: {
        timeVisible: false,
        borderColor: theme.lightweight.grid.vertLines.color,
      },
    });

    const series = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      crosshairMarkerRadius: 4,
    });

    const chartData = entries.map(([, v], i) => ({
      time: (i + 1) as unknown as import("lightweight-charts").Time,
      value: v * 100,
    }));

    series.setData(chartData);
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
  }, [data, theme, entries]);

  return (
    <div>
      <div ref={containerRef} className="w-full" />
      <ChartDataTable
        caption="Cumulative Abnormal Return data"
        headers={tableHeaders}
        rows={tableRows}
      />
    </div>
  );
}
