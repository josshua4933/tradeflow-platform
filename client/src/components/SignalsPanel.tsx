import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Zap, TrendingUp, TrendingDown } from "lucide-react";

export default function SignalsPanel() {
  const { data: signals } = trpc.market.signals.useQuery();
  const [, navigate] = useLocation();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px w-6 bg-foreground/30"></div>
          <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Analysis</span>
        </div>
        <h1 className="font-serif text-3xl font-bold">Trading Signals</h1>
        <p className="text-muted-foreground text-sm mt-1">AI-powered trade recommendations with entry, stop loss, and take profit levels.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {signals?.map((signal) => (
          <div key={signal.id} className="border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {signal.direction === "buy" ? <TrendingUp className="h-5 w-5 text-bull" /> : <TrendingDown className="h-5 w-5 text-bear" />}
                <span className="font-serif text-xl font-bold">{signal.symbol}</span>
              </div>
              <span className={`text-sm font-bold px-2.5 py-1 rounded ${signal.direction === "buy" ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"}`}>
                {signal.direction?.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
              <div className="border border-border p-2 text-center">
                <div className="text-muted-foreground mb-1">Entry</div>
                <div className="font-bold tabular-nums">{parseFloat(signal.entryPrice ?? "0").toFixed(5)}</div>
              </div>
              <div className="border border-bear/30 p-2 text-center">
                <div className="text-muted-foreground mb-1">Stop Loss</div>
                <div className="font-bold tabular-nums text-bear">{parseFloat(signal.stopLoss ?? "0").toFixed(5)}</div>
              </div>
              <div className="border border-bull/30 p-2 text-center">
                <div className="text-muted-foreground mb-1">Take Profit</div>
                <div className="font-bold tabular-nums text-bull">{parseFloat(signal.takeProfit ?? "0").toFixed(5)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-muted-foreground">
                Confidence: <span className="font-semibold text-foreground">{signal.confidence}%</span>
              </div>
              <div className="text-xs text-muted-foreground capitalize">{signal.source}</div>
            </div>

            {signal.analysis && (
              <p className="text-xs text-muted-foreground border-t border-border pt-3 mb-3">{signal.analysis}</p>
            )}

            <Button size="sm" className="w-full" onClick={() => navigate(`/trade/${signal.symbol}`)}>
              Trade This Signal <TrendingUp className="ml-1.5 h-3 w-3" />
            </Button>
          </div>
        ))}
        {(!signals || signals.length === 0) && (
          <div className="col-span-2 border border-border p-8 text-center">
            <Zap className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No active signals at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
