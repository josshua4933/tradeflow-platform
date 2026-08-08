import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, X, RefreshCw, ChevronDown, BarChart2, Activity } from "lucide-react";
import { createChart, ColorType, CrosshairMode, LineStyle, CandlestickSeries } from "lightweight-charts";
import { useWebSocketContext } from "@/contexts/WebSocketContext";

// ─── Chart Component ─────────────────────────────────────────────────────────
function PriceChart({ symbol, timeframe }: { symbol: string; timeframe: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const { candles: wsCandles, subscribeToCandles, getCandle } = useWebSocketContext();
  const { data: candles } = trpc.market.candles.useQuery({ symbol, timeframe: timeframe as any }, { refetchInterval: 10000 });
  const { data: prices } = trpc.market.prices.useQuery({ symbols: [symbol] }, { refetchInterval: 2000 });

  // Subscribe to WebSocket candle updates
  useEffect(() => {
    subscribeToCandles(symbol, timeframe);
  }, [symbol, timeframe, subscribeToCandles]);

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

  // Update chart with REST API candles (initial load)
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

  // Update chart with WebSocket candles (real-time)
  useEffect(() => {
    const wsCandle = getCandle(symbol, timeframe);
    if (!candleSeriesRef.current || !wsCandle) return;

    const candleTime = Math.floor(wsCandle.openTime / 1000) as any;
    candleSeriesRef.current.update({
      time: candleTime,
      open: wsCandle.open,
      high: wsCandle.high,
      low: wsCandle.low,
      close: wsCandle.close,
    });
  }, [wsCandles, symbol, timeframe, getCandle]);

  // Update last candle with live price
  useEffect(() => {
    if (!candleSeriesRef.current || !prices?.[0]) return;
    const livePrice = prices[0].price;
    const wsCandle = getCandle(symbol, timeframe);
    if (!wsCandle) return;

    candleSeriesRef.current.update({
      time: Math.floor(wsCandle.openTime / 1000) as any,
      open: wsCandle.open,
      high: Math.max(wsCandle.high, livePrice),
      low: Math.min(wsCandle.low, livePrice),
      close: livePrice,
    });
  }, [prices, symbol, timeframe, getCandle]);

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
            <span className="text-muted-foreground">Margin:</span>
            <span className="font-semibold">${typeof riskCalc.margin === 'string' ? parseFloat(riskCalc.margin).toFixed(2) : riskCalc.margin}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Risk:</span>
            <span className="font-semibold text-bear">${typeof riskCalc.riskAmount === 'string' ? parseFloat(riskCalc.riskAmount).toFixed(2) : riskCalc.riskAmount}</span>
          </div>
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
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">No open trades</div>
        )}
      </TabsContent>

      <TabsContent value="history" className="m-0">
        {history && history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Symbol", "Type", "Lots", "Open", "Close", "P&L"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((trade) => (
                  <tr key={trade.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-2 font-semibold">{trade.symbol}</td>
                    <td className={`px-3 py-2 font-bold ${trade.type === "buy" ? "text-bull" : "text-bear"}`}>
                      {trade.type.toUpperCase()}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{trade.lotSize}</td>
                    <td className="px-3 py-2 tabular-nums">{parseFloat(trade.openPrice).toFixed(5)}</td>
                    <td className="px-3 py-2 tabular-nums">{parseFloat(trade.closePrice || "0").toFixed(5)}</td>
                    <td className="px-3 py-2 tabular-nums font-medium text-muted-foreground">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">No trade history</div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TradingTerminal() {
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1m");
  const { data: price } = trpc.market.prices.useQuery({ symbols: [selectedSymbol] }, { refetchInterval: 1000 });

  return (
    <div className="flex flex-col h-full bg-background border border-border">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Trading Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["EURUSD", "BTCUSD", "ETHUSD", "XAUUSD", "GBPUSD", "AUDUSD", "USDJPY", "XAGUSD"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-20 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
                <SelectItem key={tf} value={tf}>{tf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 gap-3 p-3 min-h-0">
        {/* Chart */}
        <div className="flex-1 border border-border rounded">
          <PriceChart symbol={selectedSymbol} timeframe={selectedTimeframe} />
        </div>

        {/* Right Panel */}
        <div className="w-64 flex flex-col gap-3">
          {/* Order Panel */}
          <div className="border border-border rounded flex-1 overflow-y-auto">
            <OrderPanel symbol={selectedSymbol} price={price?.[0]?.price ?? 0} />
          </div>

          {/* Positions */}
          <div className="border border-border rounded flex-1 overflow-y-auto">
            <PositionsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
