import { describe, expect, it } from "vitest";
import { normalizeHistoricalCandles, LiveCandleGuard } from "./chartNormalization";

describe("chart normalization and live guards", () => {
  it("sorts historical candles monotonically and deduplicates timestamps", () => {
    const raw = [
      { time: 200, open: 1, high: 2, low: 0, close: 1.5 },
      { time: 100, open: 1, high: 2, low: 0, close: 1.1 },
      { time: 200, open: 1.2, high: 2.2, low: 0.2, close: 1.8 }, // duplicate time replacement
      { time: 150, open: 1, high: 2, low: 0, close: 1.3 },
    ];

    const normalized = normalizeHistoricalCandles(raw as any);
    expect(normalized.map((c) => c.time)).toEqual([100, 150, 200]);
    expect(normalized.find((c) => c.time === 200)?.close).toBe(1.8);
  });

  it("handles empty or malformed historical candle inputs safely", () => {
    expect(normalizeHistoricalCandles([])).toEqual([]);
    expect(normalizeHistoricalCandles(null)).toEqual([]);
    expect(normalizeHistoricalCandles([{ time: 0, open: NaN, high: 1, low: 0, close: 1 }] as any)).toEqual([]);
  });

  it("guards live updates against stale or out-of-order timestamps", () => {
    const guard = new LiveCandleGuard();
    guard.reset(100);

    expect(guard.accept(100)).toBe(true); // equal is allowed for intrajoint candle updates
    expect(guard.accept(99)).toBe(false); // strictly older is rejected
    expect(guard.accept(105)).toBe(true); // newer is accepted
    expect(guard.accept(Number.NaN)).toBe(false);
  });
});
