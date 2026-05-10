import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, X, RefreshCw, ChevronDown, BarChart2, Activity } from "lucide-react";
import { createChart, ColorType, CrosshairMode, LineStyle, CandlestickSeries } from "lightweight-charts";

// ─── Chart Component ─────────────────────────────────────────────────────────
function PriceChart({ symbol, timeframe }: { symbol: string; timeframe: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const { data: candles } = trpc.market.candles.useQuery({ symbol, timeframe: timeframe as any }, { refetchInterval: 10000 });
  const { data: prices } = trpc.market.prices.useQuery({ symbols: [symbol] }, { refetchInterval: 2000 });

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#1a1a1a" },
        textColor: "#a0998a",
        fontSize: 11,
        fontFamily: "Inter, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "#2a2a2a", style: LineStyle.Dotted },
        horzLines: { color: "#2a2a2a", style: LineStyle.Dotted },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#333333" },
      timeScale: {
        borderColor: "#333333",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartInstance.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth, height: chartRef.current.clientHeight });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !candles || candles.length === 0) return;
    const data = candles.map((c: any) => ({
      time: Math.floor(c.time / 1000) as any,
      open: typeof c.open === 'string' ? parseFloat(c.open) : c.open,
      high: typeof c.high === 'string' ? parseFloat(c.high) : c.high,
      low: typeof c.low === 'string' ? parseFloat(c.low) : c.low,
      close: typeof c.close === 'string' ? parseFloat(c.close) : c.close,
    }));
    candleSeriesRef.current.setData(data);
    chartInstance.current?.timeScale().fitContent();
  }, [candles]);

  // Update last candle with live price
  useEffect(() => {
    if (!candleSeriesRef.current || !prices?.[0] || !candles?.length) return;
    const lastCandle = candles[candles.length - 1];
    const livePrice = prices[0].price;
    const toNum = (v: any) => typeof v === 'string' ? parseFloat(v) : v;
    candleSeriesRef.current.update({
      time: Math.floor((lastCandle.time ?? Date.now()) / 1000) as any,
      open: toNum(lastCandle.open),
      high: Math.max(toNum(lastCandle.high), livePrice),
      low: Math.min(toNum(lastCandle.low), livePrice),
      close: livePrice,
    });
  }, [prices]);

  return <div ref={chartRef} className="w-full h-full" />;
}

// ─── Order Panel ─────────────────────────────────────────────────────────────
function OrderPanel({ symbol, price }: { symbol: string; price: number }) {
  const [lotSize, setLotSize] = useState("0.01");
  const [leverage, setLeverage] = useState("100");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const utils = trpc.useUtils();

  const { data: riskCalc } = trpc.trading.riskCalculator.useQuery({
    symbol,
    lotSize: parseFloat(lotSize) || 0.01,
    leverage: parseInt(leverage) || 100,
    stopLossPips: stopLoss ? Math.abs((price - parseFloat(stopLoss)) / 0.0001) : undefined,
  }, { enabled: !!symbol });

  const placeTrade = trpc.trading.placeTrade.useMutation({
    onSuccess: (data, vars) => {
      toast.success(`Trade opened at ${data.openPrice.toFixed(5)}`, {
        description: `Margin used: $${data.margin}`,
      });
      utils.trading.openTrades.invalidate();
      utils.trading.portfolioSummary.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleTrade = (type: "buy" | "sell") => {
    placeTrade.mutate({
      symbol,
      type,
      lotSize: parseFloat(lotSize) || 0.01,
      leverage: parseInt(leverage) || 100,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
    });
  };

  const bid = price * 0.9999;
  const ask = price * 1.0001;
  const spread = ((ask - bid) * 10000).toFixed(1);

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Live prices */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-border p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">SELL / BID</div>
          <div className="font-serif text-xl font-bold tabular-nums text-bear">{bid.toFixed(5)}</div>
        </div>
        <div className="border border-border p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">BUY / ASK</div>
          <div className="font-serif text-xl font-bold tabular-nums text-bull">{ask.toFixed(5)}</div>
        </div>
      </div>
      <div className="text-center text-xs text-muted-foreground">Spread: {spread} pips</div>

      {/* Lot size */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Lot Size</Label>
        <div className="flex gap-1">
          {["0.01", "0.1", "1.0"].map((v) => (
            <button key={v} onClick={() => setLotSize(v)}
              className={`flex-1 text-xs py-1.5 border transition-colors ${lotSize === v ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50"}`}>
              {v}
            </button>
          ))}
          <Input value={lotSize} onChange={(e) => setLotSize(e.target.value)} className="flex-1 text-xs h-8" type="number" step="0.01" min="0.001" />
        </div>
      </div>

      {/* Leverage */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Leverage</Label>
        <Select value={leverage} onValueChange={setLeverage}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["1", "5", "10", "25", "50", "100", "200", "500", "1000"].map((v) => (
              <SelectItem key={v} value={v}>1:{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* SL/TP */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Stop Loss</Label>
          <Input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="h-8 text-xs" placeholder="Optional" type="number" step="0.00001" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Take Profit</Label>
          <Input value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className="h-8 text-xs" placeholder="Optional" type="number" step="0.00001" />
        </div>
      </div>

      {/* Risk info */}
      {riskCalc && (
        <div className="border border-border p-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Margin Required</span>
            <span className="tabular-nums font-medium">${riskCalc.margin}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pip Value</span>
            <span className="tabular-nums font-medium">${riskCalc.pipValue}</span>
          </div>
          {riskCalc.riskAmount !== "0.00" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risk Amount</span>
              <span className={`tabular-nums font-medium ${parseFloat(riskCalc.riskPercent) > 2 ? "text-bear" : "text-bull"}`}>
                ${riskCalc.riskAmount} ({riskCalc.riskPercent}%)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Trade buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => handleTrade("sell")}
          disabled={placeTrade.isPending}
          className="h-12 bg-bear hover:bg-bear/90 text-white font-semibold text-sm"
        >
          <TrendingDown className="h-4 w-4 mr-1.5" /> SELL
        </Button>
        <Button
          onClick={() => handleTrade("buy")}
          disabled={placeTrade.isPending}
          className="h-12 bg-bull hover:bg-bull/90 text-white font-semibold text-sm"
        >
          <TrendingUp className="h-4 w-4 mr-1.5" /> BUY
        </Button>
      </div>
    </div>
  );
}

// ─── Positions Panel ──────────────────────────────────────────────────────────
function PositionsPanel() {
  const utils = trpc.useUtils();
  const { data: openTrades } = trpc.trading.openTrades.useQuery(undefined, { refetchInterval: 3000 });
  const { data: history } = trpc.trading.tradeHistory.useQuery();

  const closeTrade = trpc.trading.closeTrade.useMutation({
    onSuccess: (data) => {
      toast.success(`Trade closed. P&L: ${data.pnl >= 0 ? "+" : ""}$${data.pnl.toFixed(2)}`);
      utils.trading.openTrades.invalidate();
      utils.trading.portfolioSummary.invalidate();
      utils.trading.tradeHistory.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Tabs defaultValue="open">
      <TabsList className="w-full rounded-none border-b border-border bg-transparent h-9">
        <TabsTrigger value="open" className="flex-1 text-xs rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent">
          Open ({openTrades?.length ?? 0})
        </TabsTrigger>
        <TabsTrigger value="history" className="flex-1 text-xs rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent">
          History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="open" className="m-0">
        {openTrades && openTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Symbol", "Type", "Lots", "Open", "Current", "P&L", ""].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openTrades.map((trade) => {
                  const pnl = trade.unrealizedPnl ?? 0;
                  return (
                    <tr key={trade.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2 font-semibold">{trade.symbol}</td>
                      <td className={`px-3 py-2 font-bold ${trade.type === "buy" ? "text-bull" : "text-bear"}`}>
                        {trade.type.toUpperCase()}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{trade.lotSize}</td>
                      <td className="px-3 py-2 tabular-nums">{parseFloat(trade.openPrice).toFixed(5)}</td>
                      <td className="px-3 py-2 tabular-nums">{(trade.currentPrice ?? 0).toFixed(5)}</td>
                      <td className={`px-3 py-2 tabular-nums font-medium ${pnl >= 0 ? "text-bull" : "text-bear"}`}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => closeTrade.mutate({ tradeId: trade.id })}
                          disabled={closeTrade.isPending}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Close trade"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground">No open positions</div>
        )}
      </TabsContent>

      <TabsContent value="history" className="m-0">
        {history && history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Symbol", "Type", "Lots", "Open", "Close", "P&L", "Date"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map((trade) => {
                  const pnl = parseFloat((trade as any).pnl ?? (trade as any).realizedPnl ?? "0");
                  return (
                    <tr key={trade.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2 font-semibold">{trade.symbol}</td>
                      <td className={`px-3 py-2 font-bold ${trade.type === "buy" ? "text-bull" : "text-bear"}`}>
                        {trade.type.toUpperCase()}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{trade.lotSize}</td>
                      <td className="px-3 py-2 tabular-nums">{parseFloat(trade.openPrice).toFixed(5)}</td>
                      <td className="px-3 py-2 tabular-nums">{trade.closePrice ? parseFloat(trade.closePrice).toFixed(5) : "—"}</td>
                      <td className={`px-3 py-2 tabular-nums font-medium ${pnl >= 0 ? "text-bull" : "text-bear"}`}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(trade.openedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground">No trade history</div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// ─── Instrument Selector ──────────────────────────────────────────────────────
function InstrumentSelector({ selected, onSelect }: { selected: string; onSelect: (s: string) => void }) {
  const { data: instruments } = trpc.market.instruments.useQuery();
  const [category, setCategory] = useState("forex");

  const categories = [
    { id: "forex", label: "Forex" },
    { id: "crypto", label: "Crypto" },
    { id: "commodity", label: "Commodities" },
    { id: "stock", label: "Stocks" },
    { id: "index", label: "Indices" },
    { id: "synthetic", label: "Synthetic" },
  ];

  const filtered = instruments?.filter((i) => i.category === category) ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Category tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${
              category === cat.id
                ? "border-b-2 border-foreground text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {/* Instruments */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((inst) => (
          <button
            key={inst.symbol}
            onClick={() => onSelect(inst.symbol)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs border-b border-border transition-colors ${
              selected === inst.symbol ? "bg-secondary" : "hover:bg-secondary/50"
            }`}
          >
            <div className="text-left">
              <div className="font-semibold">{inst.symbol}</div>
              <div className="text-muted-foreground text-[10px]">{inst.name}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Terminal ────────────────────────────────────────────────────────────
export default function TradingTerminal({ defaultSymbol = "EURUSD" }: { defaultSymbol?: string }) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [timeframe, setTimeframe] = useState("1h");
  const [showInstruments, setShowInstruments] = useState(false);

  const { data: prices } = trpc.market.prices.useQuery({ symbols: [symbol] }, { refetchInterval: 1000 });
  const currentPrice = prices?.[0]?.price ?? 0;

  const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] bg-background">
      {/* ─── Terminal Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0">
        <button
          onClick={() => setShowInstruments(!showInstruments)}
          className="flex items-center gap-2 hover:bg-secondary px-2 py-1 rounded transition-colors"
        >
          <span className="font-serif font-bold text-lg">{symbol}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {currentPrice > 0 && (
          <span className="font-serif text-xl font-bold tabular-nums">
            {currentPrice > 1000
              ? currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })
              : currentPrice.toFixed(5)}
          </span>
        )}

        <div className="flex-1" />

        {/* Timeframe selector */}
        <div className="flex items-center gap-0.5 border border-border rounded">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-xs transition-colors ${
                timeframe === tf ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Area ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Instrument sidebar */}
        {showInstruments && (
          <div className="w-48 border-r border-border bg-card shrink-0 overflow-hidden">
            <InstrumentSelector selected={symbol} onSelect={(s) => { setSymbol(s); setShowInstruments(false); }} />
          </div>
        )}

        {/* Chart */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 chart-container">
            <PriceChart symbol={symbol} timeframe={timeframe} />
          </div>

          {/* Positions panel */}
          <div className="h-48 border-t border-[oklch(0.25_0.02_30)] bg-[oklch(0.14_0.02_30)] text-[oklch(0.90_0.010_80)] overflow-hidden">
            <PositionsPanel />
          </div>
        </div>

        {/* Order panel */}
        <div className="w-64 border-l border-border bg-card shrink-0 overflow-y-auto">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">New Order</span>
            </div>
          </div>
          <OrderPanel symbol={symbol} price={currentPrice} />
        </div>
      </div>
    </div>
  );
}
