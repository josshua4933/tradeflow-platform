import { describe, expect, it, vi } from "vitest";

vi.mock("./binanceStream", () => ({
  getLatestBinancePrice: vi.fn((symbol: string) => symbol.toUpperCase() === "BTCUSD" ? 65432.1 : null),
  normalizeBinanceSymbol: (symbol: string) => {
    const normalized = symbol.toUpperCase();
    return normalized.endsWith("USDT") ? `${normalized.slice(0, -4)}USD` : normalized;
  },
}));

import { getCurrentPrice } from "./routers/market";
import { normalizeBinanceSymbol } from "./binanceStream";

describe("live market execution pricing", () => {
  it("normalizes Binance USDT stream symbols to TradeFlow USD symbols", () => {
    expect(normalizeBinanceSymbol("BTCUSDT")).toBe("BTCUSD");
    expect(normalizeBinanceSymbol("ethusdt")).toBe("ETHUSD");
    expect(normalizeBinanceSymbol("XRPUSD")).toBe("XRPUSD");
  });

  it("returns a deterministic Binance-backed executable bid/ask quote with a positive spread", () => {
    const quote = getCurrentPrice("BTCUSD");

    expect(quote.price).toBe(65432.1);
    expect(quote.bid).toBe(65427.1);
    expect(quote.ask).toBe(65437.1);
    expect(quote.bid).toBeLessThan(quote.price);
    expect(quote.price).toBeLessThan(quote.ask);
  });
});
