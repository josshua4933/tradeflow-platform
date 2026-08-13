import { describe, expect, it } from "vitest";
import {
  calculateRealizedPnl,
  getExecutableClosePrice,
  getTriggeredCloseReason,
} from "./tradingSettlement";

describe("position settlement rules", () => {
  it("uses bid to close buys and ask to close sells", () => {
    expect(getExecutableClosePrice("buy", 99, 101)).toBe(99);
    expect(getExecutableClosePrice("sell", 99, 101)).toBe(101);
  });

  it("calculates realized P&L with direction and contract size", () => {
    expect(calculateRealizedPnl({ type: "buy", lotSize: "2", openPrice: "100" }, 110, 10)).toBe(200);
    expect(calculateRealizedPnl({ type: "sell", lotSize: "2", openPrice: "100" }, 90, 10)).toBe(200);
    expect(calculateRealizedPnl({ type: "buy", lotSize: "2", openPrice: "100" }, 90, 10)).toBe(-200);
  });

  it("triggers buy stop-loss and take-profit at executable close price", () => {
    expect(getTriggeredCloseReason({ type: "buy", stopLoss: 95, takeProfit: 120 }, 94.99)).toBe("stop_loss");
    expect(getTriggeredCloseReason({ type: "buy", stopLoss: 95, takeProfit: 120 }, 120)).toBe("take_profit");
    expect(getTriggeredCloseReason({ type: "buy", stopLoss: 95, takeProfit: 120 }, 100)).toBeNull();
  });

  it("triggers sell stop-loss and take-profit at executable close price", () => {
    expect(getTriggeredCloseReason({ type: "sell", stopLoss: 105, takeProfit: 80 }, 105.01)).toBe("stop_loss");
    expect(getTriggeredCloseReason({ type: "sell", stopLoss: 105, takeProfit: 80 }, 80)).toBe("take_profit");
    expect(getTriggeredCloseReason({ type: "sell", stopLoss: 105, takeProfit: 80 }, 100)).toBeNull();
  });
});
