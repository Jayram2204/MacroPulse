"use client";

import { useTheme } from "next-themes";

interface LightweightTheme {
  layout: {
    background: { color: string };
    textColor: string;
  };
  grid: {
    vertLines: { color: string };
    horzLines: { color: string };
  };
  crosshair: {
    vertLine: Record<string, unknown>;
    horzLine: Record<string, unknown>;
  };
}

interface EChartsTheme {
  backgroundColor: string;
  textStyle: { color: string };
  axisLineColor: string;
  splitLineColor: string;
  tooltipBg: string;
}

interface ChartTheme {
  lightweight: LightweightTheme;
  echarts: EChartsTheme;
}

const LIGHT_THEME: ChartTheme = {
  lightweight: {
    layout: {
      background: { color: "#ffffff" },
      textColor: "#52525b",
    },
    grid: {
      vertLines: { color: "#f4f4f5" },
      horzLines: { color: "#f4f4f5" },
    },
    crosshair: {
      vertLine: { color: "#a1a1aa", width: 1, style: 2 },
      horzLine: { color: "#a1a1aa", width: 1, style: 2 },
    },
  },
  echarts: {
    backgroundColor: "transparent",
    textStyle: { color: "#52525b" },
    axisLineColor: "#e4e4e7",
    splitLineColor: "#f4f4f5",
    tooltipBg: "#ffffff",
  },
};

const DARK_THEME: ChartTheme = {
  lightweight: {
    layout: {
      background: { color: "#0a0a0a" },
      textColor: "#a1a1aa",
    },
    grid: {
      vertLines: { color: "#27272a" },
      horzLines: { color: "#27272a" },
    },
    crosshair: {
      vertLine: { color: "#52525b", width: 1, style: 2 },
      horzLine: { color: "#52525b", width: 1, style: 2 },
    },
  },
  echarts: {
    backgroundColor: "transparent",
    textStyle: { color: "#a1a1aa" },
    axisLineColor: "#27272a",
    splitLineColor: "#1c1c1e",
    tooltipBg: "#18181b",
  },
};

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? DARK_THEME : LIGHT_THEME;
}
