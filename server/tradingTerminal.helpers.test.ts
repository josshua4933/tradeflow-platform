import { describe, expect, it } from "vitest";
import { filterTerminalSymbols, formatMoney, formatPrice, getQuoteSides } from "../client/src/components/tradingTerminal.helpers";

describe("TradingView-style terminal helpers", () => {
  it("formats crypto prices by quote magnitude and rejects invalid values", () => {
    expect(formatPrice(62500, "BTCUSD")).toBe("62,500.00");
    expect(formatPrice(0.523, "XRPUSD")).toBe("0.52300");
    expect(formatPrice(0, "BTCUSD")).toBe("—");
  });

  it("formats account values consistently as money", () => {
    expect(formatMoney("1234.5")).toBe("$1,234.50");
    expect(formatMoney(undefined)).toBe("$0.00");
  });

  it("filters symbols case-insensitively without changing the source list", () => {
    const symbols = ["BTCUSD", "ETHUSD", "SOLUSD"];
    expect(filterTerminalSymbols(symbols, "eth")).toEqual(["ETHUSD"]);
    expect(filterTerminalSymbols(symbols, "")).toEqual(symbols);
  });

  it("calculates executable bid and ask sides around the live price", () => {
    expect(getQuoteSides(100, 2)).toEqual({ bid: 99, ask: 101 });
    expect(getQuoteSides(0, 2)).toEqual({ bid: 0, ask: 0 });
  });
});
