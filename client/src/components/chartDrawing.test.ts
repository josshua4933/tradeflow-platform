import { describe, expect, it, beforeEach } from "vitest";
import { loadDrawings, saveDrawings, calculateFibonacciPrices, type DrawingItem } from "./chartDrawing";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("chart drawing and Fibonacci calculations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists and loads drawings per symbol and timeframe", () => {
    const sample: DrawingItem[] = [
      { id: "1", type: "horizontal", symbol: "BTCUSD", timeframe: "1m", p1: { time: 100, price: 60000 }, color: "#f59e0b" },
    ];

    saveDrawings("BTCUSD", "1m", sample);
    const loaded = loadDrawings("BTCUSD", "1m");
    expect(loaded).toEqual(sample);
    expect(loadDrawings("ETHUSD", "1m")).toEqual([]);
  });

  it("calculates accurate Fibonacci retracement and extension levels", () => {
    const levels = calculateFibonacciPrices(100, 200);
    const levelMap = new Map(levels.map((l) => [l.ratio, l.price]));

    expect(levelMap.get(0)).toBe(100);
    expect(levelMap.get(0.5)).toBe(150);
    expect(levelMap.get(0.618)).toBe(161.8);
    expect(levelMap.get(1.0)).toBe(200);
    expect(levelMap.get(1.618)).toBe(261.8);
  });

  it("calculates Fibonacci levels correctly with reversed or descending anchors", () => {
    const levels = calculateFibonacciPrices(200, 100);
    const levelMap = new Map(levels.map((l) => [l.ratio, l.price]));

    expect(levelMap.get(0)).toBe(200);
    expect(levelMap.get(0.5)).toBe(150);
    expect(levelMap.get(0.618)).toBe(138.2);
    expect(levelMap.get(1.0)).toBe(100);
  });
});
