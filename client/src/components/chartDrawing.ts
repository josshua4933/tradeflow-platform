export type DrawingToolType = "pointer" | "horizontal" | "trendline" | "fibonacci";

export type DrawingItem = {
  id: string;
  type: "horizontal" | "trendline" | "fibonacci";
  symbol: string;
  timeframe: string;
  p1: { time: number; price: number };
  p2?: { time: number; price: number };
  color: string;
};

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.618, 2.618];

export function calculateFibonacciPrices(p1Price: number, p2Price: number): Array<{ ratio: number; price: number }> {
  const diff = p2Price - p1Price;
  return FIB_LEVELS.map((ratio) => ({
    ratio,
    price: p1Price + diff * ratio,
  }));
}

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
