export type DrawingToolType = "pointer" | "horizontal" | "trendline";

export type DrawingItem = {
  id: string;
  type: "horizontal" | "trendline";
  symbol: string;
  timeframe: string;
  p1: { time: number; price: number };
  p2?: { time: number; price: number };
  color: string;
};

export function coordinateToTimePrice(
  param: { time?: unknown; point?: { x: number; y: number } },
  chart: any,
  series: any
): { time: number; price: number } | null {
  if (!chart || !series || !param || !param.point) return null;
  const timeScale = chart.timeScale();
  const time = timeScale.coordinateToTime(param.point.x);
  const price = series.coordinateToPrice(param.point.y);

  if (time === null || price === null || !Number.isFinite(Number(time)) || !Number.isFinite(Number(price))) {
    return null;
  }

  return { time: Number(time), price: Number(price) };
}

export function loadDrawings(symbol: string, timeframe: string): DrawingItem[] {
  try {
    const raw = localStorage.getItem(`tradeflow_drawings_${symbol}_${timeframe}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDrawings(symbol: string, timeframe: string, drawings: DrawingItem[]) {
  try {
    localStorage.setItem(`tradeflow_drawings_${symbol}_${timeframe}`, JSON.stringify(drawings));
  } catch {
    // ignore storage restrictions
  }
}
