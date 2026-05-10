import { trpc } from "@/lib/trpc";
import { Calendar } from "lucide-react";

const impactColors: Record<string, string> = {
  high: "text-bear font-bold",
  medium: "text-yellow-600 font-medium",
  low: "text-muted-foreground",
};

export default function EconomicCalendarPanel() {
  const { data: events } = trpc.market.economicCalendar.useQuery();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px w-6 bg-foreground/30"></div>
          <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Market Intelligence</span>
        </div>
        <h1 className="font-serif text-3xl font-bold">Economic Calendar</h1>
      </div>

      <div className="border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Upcoming Events</span>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="text-bear font-bold">● High</span>
            <span className="text-yellow-600">● Medium</span>
            <span className="text-muted-foreground">● Low</span>
          </div>
        </div>
        {events && events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Time", "Country", "Event", "Impact", "Forecast", "Previous"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{new Date(event.scheduledAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{event.country}</td>
                    <td className="px-4 py-3 font-semibold">{event.title}</td>
                    <td className={`px-4 py-3 capitalize ${impactColors[event.impact ?? "low"]}`}>{event.impact}</td>
                    <td className="px-4 py-3 tabular-nums">{event.forecast ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{event.previous ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">No upcoming events.</div>
        )}
      </div>
    </div>
  );
}
