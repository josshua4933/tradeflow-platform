import { describe, expect, it } from "vitest";

type CandleInput = { time: number; open: number; high: number; low: number; close: number; volume?: number };

function processHistoricalCandles(rawCandles: CandleInput[]) {
  return rawCandles
    .map((c) => ({
      time: Math.floor(Number(c.time)),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume ?? 0),
    }))
    .filter((c) => c.time > 0 && [c.open, c.high, c.low, c.close].every(Number.isFinite))
    .sort((a, b) => a.time - b.time)
    .filter((item, index, arr) => index === 0 || item.time !== arr[index - 1].time);
}

describe("chart timestamp ordering and deduplication", () => {
  it("sorts candles monotonically by time and removes duplicates", () => {
    const raw = [
      { time: 200, open: 1, high: 2, low: 0, close: 1.5 },
      { time: 100, open: 1, high: 2, low: 0, close: 1.2 },
      { time: 200, open: 1.1, high: 2.1, low: 0.1, close: 1.6 }, // duplicate timestamp
      { time: 150, open: 1, high: 2, low: 0, close: 1.4 },
    ];

    const processed = processHistoricalCandles(raw);
    expect(processed.map((c) => c.time)).toEqual([100, 150, 200]);
    expect(processed.find((c) => c.time === 200)?.close).toBe(1.5); // keeps first or sorts deterministically
  });

  it("filters out older or malformed live updates", () => {
    let lastTime = 150;
    const evaluateUpdate = (incomingTime: number) => {
      if (!Number.isFinite(incomingTime) || incomingTime <= 0) return false;
      if (incomingTime < lastTime) return false;
      lastTime = incomingTime;
      return true;
    };

    expect(evaluateUpdate(160)).toBe(true);
    expect(evaluateUpdate(150)).toBe(false); // older than current
    expect(evaluateUpdate(165)).toBe(true);
    expect(evaluateUpdate(Number.NaN)).toBe(false);
  });
});
