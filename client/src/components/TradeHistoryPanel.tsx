import { trpc } from "@/lib/trpc";
import { History } from "lucide-react";

export default function TradeHistoryPanel() {
  const { data: history, isLoading } = trpc.trading.tradeHistory.useQuery();
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px w-6 bg-foreground/30"></div>
          <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Records</span>
        </div>
        <h1 className="font-serif text-3xl font-bold">Trade History</h1>
      </div>
      <div className="border border-border bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : history && history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["#", "Symbol", "Type", "Lots", "Open Price", "Close Price", "P&L", "Opened", "Closed"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((trade, i) => {
                  const pnl = parseFloat((trade as any).profit ?? "0");
                  return (
                    <tr key={trade.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold">{trade.symbol}</td>
                      <td className={`px-4 py-3 font-bold ${trade.type === "buy" ? "text-bull" : "text-bear"}`}>{trade.type.toUpperCase()}</td>
                      <td className="px-4 py-3 tabular-nums">{trade.lotSize}</td>
                      <td className="px-4 py-3 tabular-nums">{parseFloat(trade.openPrice).toFixed(5)}</td>
                      <td className="px-4 py-3 tabular-nums">{trade.closePrice ? parseFloat(trade.closePrice).toFixed(5) : "—"}</td>
                      <td className={`px-4 py-3 tabular-nums font-semibold ${pnl >= 0 ? "text-bull" : "text-bear"}`}>{pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(trade.openedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{trade.closedAt ? new Date(trade.closedAt).toLocaleString() : "Open"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <History className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No trade history yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
