import { describe, expect, it } from "vitest";
import { getKlineSubscriptionErrorMessage } from "./websocket.helpers";

describe("Binance kline subscription messages", () => {
  it("reports temporary stream availability when the connection is down", () => {
    expect(getKlineSubscriptionErrorMessage(false)).toContain("temporarily unavailable");
  });

  it("reports unsupported symbols only when the stream is connected", () => {
    expect(getKlineSubscriptionErrorMessage(true)).toBe("This symbol is not available on Binance spot markets.");
  });
});
