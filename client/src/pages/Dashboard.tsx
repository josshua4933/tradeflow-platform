import TradingLayout from "@/components/TradingLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, Activity, BarChart2, ChevronRight, Zap, AlertTriangle, ArrowRight
} from "lucide-react";

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="border border-border p-5 bg-card">
      <div className="text-xs tracking-widest uppercase text-muted-foreground mb-2">{label}</div>
      <div className="font-serif text-2xl font-bold tabular-nums">{value}</div>
      {sub && (
        <div className={`text-xs mt-1 ${positive === undefined ? "text-muted-foreground" : positive ? "text-bull" : "text-bear"}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: summary } = trpc.trading.portfolioSummary.useQuery(undefined, { refetchInterval: 5000 });
  const { data: openTrades } = trpc.trading.openTrades.useQuery(undefined, { refetchInterval: 5000 });
  const { data: prices } = trpc.market.prices.useQuery(
    { symbols: ["EURUSD", "BTCUSD", "XAUUSD", "GBPUSD", "US500"] },
    { refetchInterval: 3000 }
  );
  const { data: signals } = trpc.market.signals.useQuery();
  const { data: notifications } = trpc.notifications.list.useQuery({ limit: 5 });

  const pnl = summary ? parseFloat(summary.unrealizedPnl) : 0;
  const balance = summary ? parseFloat(summary.totalBalance) : 0;
  const equity = summary ? parseFloat(summary.equity) : 0;
  const marginLevel = summary ? parseFloat(summary.marginLevel) : 0;

  return (
    <TradingLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-px w-6 bg-foreground/30"></div>
              <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Overview</span>
            </div>
            <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
          </div>
          <Button onClick={() => navigate("/trade")} size="sm" className="gap-2">
            <TrendingUp className="h-4 w-4" /> New Trade
          </Button>
        </div>

        {summary?.isMarginCall && (
          <div className="mb-6 border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <div className="font-semibold text-destructive text-sm">Margin Call Warning</div>
              <div className="text-xs text-muted-foreground">
                Your margin level is {marginLevel.toFixed(0)}%. Please deposit funds or close positions.
              </div>
            </div>
            <Button size="sm" variant="destructive" className="ml-auto shrink-0" onClick={() => navigate("/wallets")}>
              Deposit Now
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Balance" value={`$${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} sub="Available funds" />
          <StatCard label="Equity" value={`$${equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} sub={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} unrealized`} positive={pnl >= 0} />
          <StatCard label="Open Positions" value={String(summary?.openPositions ?? 0)} sub={`$${parseFloat(summary?.margin ?? "0").toFixed(2)} margin used`} />
          <StatCard label="Margin Level" value={`${marginLevel > 0 ? marginLevel.toFixed(0) : "—"}%`} sub={marginLevel > 200 ? "Healthy" : marginLevel > 100 ? "Warning" : marginLevel > 0 ? "Critical" : "No margin"} positive={marginLevel > 200 || marginLevel === 0} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Open Positions */}
          <div className="lg:col-span-2 border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Open Positions</span>
                {openTrades && openTrades.length > 0 && (
                  <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{openTrades.length}</span>
                )}
              </div>
              <a href="/trade" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                Manage <ChevronRight className="h-3 w-3" />
              </a>
            </div>
            {openTrades && openTrades.length > 0 ? (
              <div>
                {openTrades.slice(0, 6).map((trade) => {
                  const p = trade.unrealizedPnl ?? 0;
                  const up = p >= 0;
                  return (
                    <div key={trade.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-secondary/30 px-4 transition-colors">
                      <div className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded ${up ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"}`}>
                        {trade.type === "buy" ? "B" : "S"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">{trade.symbol}</div>
                        <div className="text-xs text-muted-foreground">{trade.lotSize} lots</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm tabular-nums font-medium">{(trade.currentPrice ?? 0).toFixed(5)}</div>
                        <div className={`text-xs tabular-nums ${up ? "text-bull" : "text-bear"}`}>{up ? "+" : ""}${p.toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <BarChart2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No open positions</p>
                <Button size="sm" variant="outline" onClick={() => navigate("/trade")}>Start Trading</Button>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Quick Trade</span>
              </div>
              <div className="space-y-2">
                {prices?.slice(0, 3).map((p) => (
                  <button key={p.symbol} onClick={() => navigate(`/trade/${p.symbol}`)}
                    className="w-full flex items-center justify-between p-2.5 border border-border hover:border-foreground/30 hover:bg-secondary/50 transition-colors text-left">
                    <span className="text-sm font-medium">{p.symbol}</span>
                    <span className="text-sm tabular-nums font-medium">
                      {p.price > 1000 ? p.price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : p.price.toFixed(5)}
                    </span>
                  </button>
                ))}
              </div>
              <Button className="w-full mt-3" size="sm" onClick={() => navigate("/trade")}>
                Open Terminal <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>

            <div className="border border-border bg-card">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold">Notifications</span>
                <a href="/notifications" className="text-xs text-muted-foreground hover:text-foreground">View all</a>
              </div>
              <div className="divide-y divide-border">
                {notifications && notifications.length > 0 ? (
                  notifications.slice(0, 4).map((n) => (
                    <div key={n.id} className={`px-4 py-3 ${!n.isRead ? "bg-secondary/30" : ""}`}>
                      <div className="text-xs font-semibold mb-0.5">{n.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">No notifications</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {signals && signals.length > 0 && (
          <div className="mt-4 border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Trading Signals</span>
              </div>
              <a href="/signals" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </a>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
              {signals.slice(0, 4).map((signal) => (
                <div key={signal.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{signal.symbol}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${signal.direction === "buy" ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"}`}>
                      {signal.direction?.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>Entry: <span className="tabular-nums text-foreground">{parseFloat(signal.entryPrice ?? "0").toFixed(5)}</span></div>
                    <div>SL: <span className="tabular-nums text-bear">{parseFloat(signal.stopLoss ?? "0").toFixed(5)}</span></div>
                    <div>TP: <span className="tabular-nums text-bull">{parseFloat(signal.takeProfit ?? "0").toFixed(5)}</span></div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Confidence: <span className="font-medium">{signal.confidence}%</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TradingLayout>
  );
}
