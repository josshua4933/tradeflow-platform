import { getEconomicEvents } from "./db";

export type ForexFactoryImpact = "low" | "medium" | "high";

export type ForexFactoryEvent = {
  id: string;
  title: string;
  country: string;
  currency: string;
  impact: ForexFactoryImpact;
  actual?: string;
  forecast?: string;
  previous?: string;
  scheduledAt: Date;
  sourceUrl: string;
};

export type ForexFactoryCalendarResult = {
  events: ForexFactoryEvent[];
  source: "forex_factory" | "tradeflow_fallback";
  sourceUrl: string;
  fetchedAt: string;
  warning?: string;
};

type RawForexFactoryEvent = {
  title?: unknown;
  country?: unknown;
  currency?: unknown;
  date?: unknown;
  impact?: unknown;
  actual?: unknown;
  forecast?: unknown;
  previous?: unknown;
  url?: unknown;
};

export const FOREX_FACTORY_SOURCE_URL = "https://www.forexfactory.com/calendar";
export const FOREX_FACTORY_FEED_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

function optionalText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function normalizeImpact(value: unknown): ForexFactoryImpact {
  const impact = String(value ?? "low").trim().toLowerCase();
  if (impact.includes("high")) return "high";
  if (impact.includes("medium") || impact.includes("med")) return "medium";
  return "low";
}

export function normalizeForexFactoryEvents(raw: unknown, now = new Date(), days = 7): ForexFactoryEvent[] {
  if (!Array.isArray(raw)) return [];

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  // Keep the previous seven days as context while showing the requested
  // upcoming window. This prevents the calendar from going blank on weekends
  // or during the weekly feed rollover.
  const start = new Date(dayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const end = new Date(dayStart.getTime() + days * 24 * 60 * 60 * 1000);

  return raw
    .map((item): ForexFactoryEvent | null => {
      const event = item as RawForexFactoryEvent;
      const title = optionalText(event.title);
      const currency = optionalText(event.currency ?? event.country);
      const dateText = optionalText(event.date);
      if (!title || !currency || !dateText) return null;

      const scheduledAt = new Date(dateText);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt < start || scheduledAt >= end) return null;

      const country = optionalText(event.country) ?? currency;
      const sourceUrl = optionalText(event.url) ?? FOREX_FACTORY_SOURCE_URL;
      const id = `ff-${scheduledAt.toISOString()}-${currency}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      return {
        id,
        title,
        country,
        currency,
        impact: normalizeImpact(event.impact),
        actual: optionalText(event.actual),
        forecast: optionalText(event.forecast),
        previous: optionalText(event.previous),
        scheduledAt,
        sourceUrl,
      };
    })
    .filter((event): event is ForexFactoryEvent => Boolean(event))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

export async function getForexFactoryCalendar(days = 7): Promise<ForexFactoryCalendarResult> {
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetch(FOREX_FACTORY_FEED_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Forex Factory feed returned HTTP ${response.status}`);

    const raw = await response.json();
    const events = normalizeForexFactoryEvents(raw, new Date(), days);
    return {
      events,
      source: "forex_factory",
      sourceUrl: FOREX_FACTORY_SOURCE_URL,
      fetchedAt,
      ...(events.length === 0 ? { warning: "The live feed returned no events for the selected period." } : {}),
    };
  } catch (error) {
    console.error("[Forex Factory] Feed unavailable:", error);
    const fallbackEvents = await getEconomicEvents(days);
    const events: ForexFactoryEvent[] = fallbackEvents.map((event) => ({
      id: `tradeflow-${event.id}`,
      title: event.title,
      country: event.country,
      currency: event.currency ?? event.country,
      impact: event.impact,
      actual: event.actual ?? undefined,
      forecast: event.forecast ?? undefined,
      previous: event.previous ?? undefined,
      scheduledAt: event.scheduledAt,
      sourceUrl: FOREX_FACTORY_SOURCE_URL,
    }));

    return {
      events,
      source: "tradeflow_fallback",
      sourceUrl: FOREX_FACTORY_SOURCE_URL,
      fetchedAt,
      warning: "Live Forex Factory data is temporarily unavailable. Showing saved TradeFlow events instead.",
    };
  }
}
