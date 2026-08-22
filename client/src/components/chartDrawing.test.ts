import { describe, expect, it, beforeEach } from "vitest";
import { loadDrawings, saveDrawings, calculateFibonacciPrices, type DrawingItem } from "./chartDrawing";
import { calculateEma, calculateRsi, calculateSma, createIndicatorPreset, loadIndicatorPresets, normalizeIndicatorSettings, saveIndicatorPresets, type IndicatorPreset } from "./indicatorPresets";

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

  it("persists named indicator presets and removes malformed entries", () => {
    const preset = createIndicatorPreset("Momentum mix", {
      showEma: true,
      emaPeriod: 21,
      showSma: false,
      smaPeriod: 50,
      showRsi: true,
      rsiPeriod: 14,
      showVolume: true,
    });
    expect(preset).not.toBeNull();
    const saved = [preset as IndicatorPreset, { id: "", name: "  ", showEma: true } as IndicatorPreset];
    saveIndicatorPresets(saved);
    expect(loadIndicatorPresets()).toEqual([expect.objectContaining({ name: "Momentum mix", emaPeriod: 21, showRsi: true })]);
    expect(createIndicatorPreset("   ", normalizeIndicatorSettings({}))).toBeNull();
  });

  it("calculates EMA, SMA, and bounded RSI values for preset indicators", () => {
    const values = [100, 102, 101, 105, 106];
    expect(calculateEma(values, 3)).toHaveLength(values.length);
    expect(calculateSma(values, 3)[2]).toBeCloseTo(101);
    const rsi = calculateRsi(values, 3);
    expect(rsi).toHaveLength(values.length);
    expect(rsi.every((value) => value >= 0 && value <= 100)).toBe(true);
    expect(rsi[0]).toBe(50);
  });
});
