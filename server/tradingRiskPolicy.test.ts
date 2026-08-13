import { describe, expect, it } from "vitest";
import { shouldLiquidate, STOP_OUT_MARGIN_LEVEL } from "./tradingRiskPolicy";

describe("centralized trading risk policy", () => {
  it("uses the configured default stop-out threshold", () => {
    expect(STOP_OUT_MARGIN_LEVEL).toBeGreaterThan(0);
    expect(shouldLiquidate({ equity: 100, freeMargin: 50, margin: 200, marginLevel: STOP_OUT_MARGIN_LEVEL - 0.01 })).toBe(true);
  });

  it("liquidates when equity is zero or free margin is negative", () => {
    expect(shouldLiquidate({ equity: 0, freeMargin: 0, margin: 10, marginLevel: 100 })).toBe(true);
    expect(shouldLiquidate({ equity: 10, freeMargin: -0.01, margin: 10, marginLevel: 100 })).toBe(true);
  });

  it("does not liquidate a healthy account or an account with no used margin", () => {
    expect(shouldLiquidate({ equity: 100, freeMargin: 50, margin: 50, marginLevel: 200 })).toBe(false);
    expect(shouldLiquidate({ equity: 0, freeMargin: 0, margin: 0, marginLevel: 0 })).toBe(false);
  });
});
