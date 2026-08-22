import { useMemo, useState } from "react";
import { CalendarDays, Clock3, ExternalLink, Filter, Loader2, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const impactStyles = {
  high: "border-red-300 bg-red-50 text-red-700",
  medium: "border-amber-300 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

const impactDotStyles = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
} as const;

function formatEventTime(value: Date | string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatEventDay(value: Date | string) {
  return new Date(value).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatFetchedAt(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function EconomicCalendarPanel() {
  const [selectedDay, setSelectedDay] = useState("all");
  const [selectedCurrency, setSelectedCurrency] = useState("all");
  const [selectedImpact, setSelectedImpact] = useState("all");
  const { data, isLoading, isFetching, isError, refetch } = trpc.market.forexFactoryCalendar.useQuery(
    { days: 14 },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: true },
  );

  const events = data?.events ?? [];
  const currencies = useMemo(
    () => Array.from(new Set(events.map((event) => event.currency))).sort(),
    [events],
  );
  const days = useMemo(
    () => Array.from(new Map(events.map((event) => [formatEventDay(event.scheduledAt), formatEventDay(event.scheduledAt)])).values()),
    [events],
  );
  const filteredEvents = useMemo(
    () => events.filter((event) => {
      const matchesDay = selectedDay === "all" || formatEventDay(event.scheduledAt) === selectedDay;
      const matchesCurrency = selectedCurrency === "all" || event.currency === selectedCurrency;
      const matchesImpact = selectedImpact === "all" || event.impact === selectedImpact;
      return matchesDay && matchesCurrency && matchesImpact;
    }),
    [events, selectedDay, selectedCurrency, selectedImpact],
  );

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, typeof filteredEvents>();
    filteredEvents.forEach((event) => {
      const day = formatEventDay(event.scheduledAt);
      const current = groups.get(day) ?? [];
      current.push(event);
      groups.set(day, current);
    });
    return Array.from(groups.entries());
  }, [filteredEvents]);

  return (
    <div className="min-h-full bg-[#f7f5f0] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span className="h-px w-7 bg-slate-400" />
              Market intelligence
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Economic Calendar</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Daily Forex Factory releases, central-bank events, and market-moving indicators in your local time.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className={`inline-flex h-2 w-2 rounded-full ${data?.source === "forex_factory" ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span>{data?.source === "forex_factory" ? "Forex Factory live feed" : "Saved TradeFlow events"}</span>
            {data?.fetchedAt && <span>· updated {formatFetchedAt(data.fetchedAt)}</span>}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="ml-1 h-8 gap-1.5 bg-white">
              {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </Button>
          </div>
        </div>

        <div className="mb-5 border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-slate-500" />
              Filters
            </div>
            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="text-xs text-slate-500">
                Day
                <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-800 outline-none focus:border-slate-400">
                  <option value="all">All upcoming days</option>
                  {days.map((day) => <option key={day} value={day}>{day}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-500">
                Currency
                <select value={selectedCurrency} onChange={(event) => setSelectedCurrency(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-800 outline-none focus:border-slate-400">
                  <option value="all">All currencies</option>
                  {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-500">
                Impact
                <select value={selectedImpact} onChange={(event) => setSelectedImpact(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm capitalize outline-none focus:border-slate-400">
                  <option value="all">All impact levels</option>
                  <option value="high">High impact</option>
                  <option value="medium">Medium impact</option>
                  <option value="low">Low impact</option>
                </select>
              </label>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-xs text-slate-500">
            <span className="font-medium text-slate-700">{filteredEvents.length} events</span>
            <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${impactDotStyles.high}`} />High</span>
            <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${impactDotStyles.medium}`} />Medium</span>
            <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${impactDotStyles.low}`} />Low</span>
            <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-medium text-slate-700 hover:underline">
              View source <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {data?.warning && <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{data.warning}</div>}
        {isError && <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Calendar data could not be loaded. Use Refresh to try again.</div>}

        <div className="border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading daily events…</div>
          ) : groupedEvents.length > 0 ? (
            <div>
              {groupedEvents.map(([day, dayEvents]) => (
                <section key={day}>
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    {day}
                    <span className="ml-auto text-xs font-normal text-slate-500">{dayEvents.length} events</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {dayEvents.map((event) => (
                      <article key={event.id} className="grid gap-3 px-4 py-4 transition-colors hover:bg-slate-50 md:grid-cols-[92px_78px_minmax(0,1fr)_170px] md:items-center">
                        <div className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-slate-800"><Clock3 className="h-3.5 w-3.5 text-slate-400" />{formatEventTime(event.scheduledAt)}</div>
                        <div><Badge variant="outline" className="border-slate-300 bg-slate-50 font-semibold text-slate-700">{event.currency}</Badge></div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">{event.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{event.country}</span>
                            {event.actual && <span className="font-medium text-slate-700">Actual {event.actual}</span>}
                            {event.forecast && <span>Forecast {event.forecast}</span>}
                            {event.previous && <span>Previous {event.previous}</span>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 md:justify-end">
                          <Badge variant="outline" className={`capitalize ${impactStyles[event.impact]}`}>{event.impact} impact</Badge>
                          <a href={event.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open ${event.title} source`} className="text-slate-400 hover:text-slate-800"><ExternalLink className="h-4 w-4" /></a>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <CalendarDays className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No events match these filters.</p>
              <p className="mt-1 text-xs text-slate-500">Try another day, currency, or impact level.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
