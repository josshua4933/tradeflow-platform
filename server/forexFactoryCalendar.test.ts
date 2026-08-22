import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({ getEconomicEvents: vi.fn() }));
vi.mock("./db", () => dbMock);

import { getForexFactoryCalendar, normalizeForexFactoryEvents } from "./forexFactoryCalendar";

beforeEach(() => {
  dbMock.getEconomicEvents.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Forex Factory calendar normalization", () => {
  const now = new Date("2026-08-22T00:00:00.000Z");

  it("normalizes fields, maps impact levels, sorts events, and keeps source values", () => {
    const events = normalizeForexFactoryEvents([
      {
        title: "US CPI m/m",
        country: "USD",
        date: "2026-08-22T13:30:00.000Z",
        impact: "High",
        actual: "0.3%",
        forecast: "0.2%",
        previous: "0.1%",
      },
      {
        title: "ECB Speech",
        country: "EUR",
        date: "2026-08-22T09:00:00.000Z",
        impact: "Medium",
      },
    ], now, 1);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ title: "ECB Speech", currency: "EUR", impact: "medium" });
    expect(events[1]).toMatchObject({
      title: "US CPI m/m",
      country: "USD",
      currency: "USD",
      impact: "high",
      actual: "0.3%",
      forecast: "0.2%",
      previous: "0.1%",
      sourceUrl: "https://www.forexfactory.com/calendar",
    });
    expect(events[1].scheduledAt).toEqual(new Date("2026-08-22T13:30:00.000Z"));
    expect(events[1].id).toContain("ff-2026-08-22t13-30-00-000z-usd-us-cpi-m-m");
  });

  it("keeps recent context and the requested upcoming window while dropping malformed rows", () => {
    const events = normalizeForexFactoryEvents([
      { title: "Recent", country: "USD", date: "2026-08-21T23:59:59.000Z", impact: "Low" },
      { title: "Today", country: "GBP", date: "2026-08-22T00:00:00.000Z", impact: "Low" },
      { title: "Tomorrow", country: "JPY", date: "2026-08-23T23:59:59.000Z", impact: "Low" },
      { title: "Outside", country: "EUR", date: "2026-08-24T00:00:00.000Z", impact: "Low" },
      { title: "Too old", country: "CAD", date: "2026-08-14T23:59:59.000Z", impact: "Low" },
      { title: "No date", country: "CAD", impact: "Low" },
    ], now, 2);

    expect(events.map((event) => event.title)).toEqual(["Recent", "Today", "Tomorrow"]);
  });

  it("accepts alternate currency and source URL fields", () => {
    const events = normalizeForexFactoryEvents([
      {
        title: "Bank holiday",
        currency: "AUD",
        date: "2026-08-22T15:00:00.000Z",
        impact: "Non-Economic",
        url: "https://www.forexfactory.com/calendar",
      },
    ], now, 1);

    expect(events[0]).toMatchObject({ currency: "AUD", country: "AUD", impact: "low", sourceUrl: "https://www.forexfactory.com/calendar" });
  });
});

describe("Forex Factory calendar retrieval", () => {
  it("falls back to saved TradeFlow events when the live feed fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("feed unavailable")));
    dbMock.getEconomicEvents.mockResolvedValue([
      {
        id: 41,
        title: "Saved CPI",
        country: "USD",
        currency: "USD",
        impact: "high",
        actual: null,
        forecast: "2.0%",
        previous: "1.9%",
        scheduledAt: new Date("2026-08-22T12:00:00.000Z"),
      },
    ]);

    const result = await getForexFactoryCalendar(7);

    expect(result.source).toBe("tradeflow_fallback");
    expect(result.warning).toContain("temporarily unavailable");
    expect(result.events[0]).toMatchObject({ title: "Saved CPI", currency: "USD", sourceUrl: "https://www.forexfactory.com/calendar" });
  });

  it("returns a live-feed empty warning when there are no upcoming events", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }));

    const result = await getForexFactoryCalendar(7);

    expect(result).toMatchObject({ source: "forex_factory", events: [], warning: "The live feed returned no events for the selected period." });
    expect(dbMock.getEconomicEvents).not.toHaveBeenCalled();
  });
});
