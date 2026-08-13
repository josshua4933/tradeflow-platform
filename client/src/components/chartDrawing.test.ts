import { describe, expect, it, beforeEach } from "vitest";
import { loadDrawings, saveDrawings, type DrawingItem } from "./chartDrawing";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("chart drawing storage and state", () => {
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
});
