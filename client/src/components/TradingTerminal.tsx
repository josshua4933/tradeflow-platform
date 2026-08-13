import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Activity,
  BarChart2,
  BarChart3,
  CandlestickChart,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Crosshair,
  Expand,
  Gauge,
  Info,
  LineChart,
  Maximize2,
  PanelBottom,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
  Zap,
  PenTool,
  Minus,
  Trash2,
} from "lucide-react";
import { coordinateToTimePrice, loadDrawings, saveDrawings, type DrawingToolType, type DrawingItem } from "./chartDrawing";
import { ChartDrawingOverlay } from "./ChartDrawingOverlay";
import { createChart, ColorType, CrosshairMode, HistogramSeries, LineSeries, LineStyle, CandlestickSeries } from "lightweight-charts";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { normalizeHistoricalCandles, LiveCandleGuard } from "./chartNormalization";
import { filterTerminalSymbols, formatMoney, formatPrice, getQuoteSides } from "./tradingTerminal.helpers";

type ChartMode = "candles" | "line";
type OrderMode = "market" | "limit" | "stop" | "risk";
type ChartPoint = { time: unknown; open: number; high: number; low: number; close: number; volume?: number };


const SYMBOLS = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "ADAUSD", "SOLUSD", "DOGEUSD", "AVAXUSD"];
const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

// ─── Chart Component ─────────────────────────────────────────────────────────
function PriceChart({
  symbol,
  timeframe,
  chartMode,
  showEma,
  showSma,
  showVolume,
  marketDataError,
  onRetry,
  onCrosshairChange,
  drawingTool,
  drawings,
  onAddDrawing,
  selectedDrawingId,
  onSelectDrawing,
}: {
  symbol: string;
  timeframe: string;
  chartMode: ChartMode;
  showEma: boolean;
  showSma: boolean;
  showVolume: boolean;
  marketDataError?: string;
  onRetry: () => void;
  onCrosshairChange: (point: ChartPoint | null) => void;
  drawingTool: DrawingToolType;
  drawings: DrawingItem[];
  onAddDrawing: (drawing: DrawingItem) => void;
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const lineSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const emaSeriesRef = useRef<any>(null);
  const smaSeriesRef = useRef<any>(null);
  const crosshairCallbackRef = useRef(onCrosshairChange);
  crosshairCallbackRef.current = onCrosshairChange;
  const { candles: wsCandles, subscribeToCandles, getCandle } = useWebSocketContext();
  const liveCandle = getCandle(symbol, timeframe);
  const { data: candles, isLoading, isError } = trpc.market.candles.useQuery(
    { symbol, timeframe: timeframe as any },
    { refetchInterval: 60000 },
  );

  useEffect(() => {
    subscribeToCandles(symbol, timeframe);
  }, [symbol, timeframe, subscribeToCandles]);

  useEffect(() => {
    if (!chartRef.current) return;
    const container = chartRef.current;
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f1115" },
        textColor: "#8d96a5",
        fontSize: 11,
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "#20252d", style: LineStyle.Dotted },
        horzLines: { color: "#20252d", style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#64748b", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#334155" },
        horzLine: { color: "#64748b", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#334155" },
      },
      rightPriceScale: { borderColor: "#303744", scaleMargins: { top: 0.08, bottom: 0.16 } },
      timeScale: { borderColor: "#303744", timeVisible: true, secondsVisible: false, rightOffset: 5, barSpacing: 7 },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      width: Math.max(container.clientWidth, 320),
      height: Math.max(container.clientHeight, 420),
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceLineVisible: true,
      lastValueVisible: true,
    });
    const lineSeries = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      visible: false,
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "#33415599",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const emaSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      visible: false,
    });
    const smaSeries = chart.addSeries(LineSeries, {
      color: "#c084fc",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      visible: false,
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    const handleCrosshairMove = (param: any) => {
      const point = param.seriesData?.get(candleSeries);
      if (!point || point.open === undefined) {
        crosshairCallbackRef.current(null);
        return;
      }
      const volumePoint = param.seriesData?.get(volumeSeries);
      crosshairCallbackRef.current({
        time: point.time,
        open: Number(point.open),
        high: Number(point.high),
        low: Number(point.low),
        close: Number(point.close),
        volume: volumePoint?.value !== undefined ? Number(volumePoint.value) : undefined,
      });
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    chartInstance.current = chart;
    candleSeriesRef.current = candleSeries;
    lineSeriesRef.current = lineSeries;
    volumeSeriesRef.current = volumeSeries;
    emaSeriesRef.current = emaSeries;
    smaSeriesRef.current = smaSeries;

    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width > 0 && height > 0) chart.applyOptions({ width, height });
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);
    requestAnimationFrame(handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      crosshairCallbackRef.current(null);
      chart.remove();
      chartInstance.current = null;
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
      volumeSeriesRef.current = null;
      emaSeriesRef.current = null;
      smaSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    candleSeriesRef.current?.applyOptions({ visible: chartMode === "candles" });
    lineSeriesRef.current?.applyOptions({ visible: chartMode === "line" });
    emaSeriesRef.current?.applyOptions({ visible: showEma });
    smaSeriesRef.current?.applyOptions({ visible: showSma });
    volumeSeriesRef.current?.applyOptions({ visible: showVolume });
  }, [chartMode, showEma, showSma, showVolume]);

  useEffect(() => {
    if (!candles?.length || !candleSeriesRef.current) return;
    const data = normalizeHistoricalCandles(candles as any);
    if (!data.length) return;

    candleSeriesRef.current.setData(data);
    lineSeriesRef.current?.setData(data.map((c: any) => ({ time: c.time, value: c.close })));
    volumeSeriesRef.current?.setData(data.map((c: any) => ({
      time: c.time,
      value: Number.isFinite(c.volume) ? c.volume : 0,
      color: c.close >= c.open ? "#26a69a55" : "#ef535055",
    })));

    let ema = data[0].close;
    const multiplier = 2 / (20 + 1);
    emaSeriesRef.current?.setData(data.map((c: any) => {
      ema = (c.close - ema) * multiplier + ema;
      return { time: c.time, value: ema };
    }));
    const smaPeriod = 50;
    smaSeriesRef.current?.setData(data.map((c: any, index: number) => {
      const windowStart = Math.max(0, index - smaPeriod + 1);
      const window = data.slice(windowStart, index + 1);
      return { time: c.time, value: window.reduce((sum: number, item: any) => sum + item.close, 0) / window.length };
    }));
    chartInstance.current?.timeScale().fitContent();
  }, [candles]);

  const liveGuardRef = useRef(new LiveCandleGuard());

  useEffect(() => {
    liveGuardRef.current.reset(0);
  }, [symbol, timeframe]);

  useEffect(() => {
    const wsCandle = getCandle(symbol, timeframe);
    if (!wsCandle || !candleSeriesRef.current) return;
    const rawTime = Number(wsCandle.openTime);
    const candleTime = Math.floor(rawTime > 1e12 ? rawTime / 1000 : rawTime);
    if (!liveGuardRef.current.accept(candleTime)) return;

    const update = { time: candleTime as any, open: wsCandle.open, high: wsCandle.high, low: wsCandle.low, close: wsCandle.close };
    try {
      candleSeriesRef.current.update(update);
      lineSeriesRef.current?.update({ time: candleTime as any, value: wsCandle.close });
      volumeSeriesRef.current?.update({
        time: candleTime as any,
        value: wsCandle.volume,
        color: wsCandle.close >= wsCandle.open ? "#26a69a55" : "#ef535055",
      });
    } catch (error) {
      console.warn("[TradingTerminal] Chart update error suppressed:", error);
    }
  }, [wsCandles, symbol, timeframe, getCandle]);

  return (
    <div className="relative h-full min-h-[520px] w-full bg-[#0f1115]">
      <div ref={chartRef} className="absolute inset-0" />
      {(isLoading || isError) && !candles?.length && !liveCandle && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[#8d96a5] pointer-events-none">
          {isError ? "Waiting for Binance market data…" : "Loading live Binance candles…"}
        </div>
      )}
      {marketDataError && (
        <div className="absolute left-3 right-3 top-3 z-10 flex items-center justify-between gap-3 rounded border border-[#6b2c32] bg-[#281316]/95 px-3 py-2 text-[11px] text-[#ffb4b9] shadow-lg">
          <span>{marketDataError}</span>
          <button type="button" onClick={onRetry} className="shrink-0 rounded bg-[#512027] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#672831]">Retry stream</button>
        </div>
      )}
    </div>
  );
}

// ─── Order Ticket ────────────────────────────────────────────────────────────
function OrderPanel({ symbol, price, bid, ask }: { symbol: string; price: number; bid: number; ask: number }) {
  const [orderMode, setOrderMode] = useState<OrderMode>("market");
  const [lotSize, setLotSize] = useState("0.01");
  const [leverage, setLeverage] = useState("100");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { data: instrument, isLoading: instrumentLoading } = trpc.market.instrumentBySymbol.useQuery({ symbol });
  const { data: summary } = trpc.trading.portfolioSummary.useQuery(undefined, { refetchInterval: 5000 });
  const minLot = Number(instrument?.minLot ?? 0.001);
  const canTrade = !instrumentLoading && Boolean(instrument?.isActive);
  const quoteDecimals = price >= 100 ? 2 : price >= 1 ? 4 : 5;

  const { data: riskCalc } = trpc.trading.riskCalculator.useQuery({
    symbol,
    lotSize: Number(lotSize) || 0.01,
    leverage: Number(leverage) || 100,
    stopLossPips: stopLoss ? Math.abs((price - Number(stopLoss)) / 0.0001) : undefined,
  }, { enabled: canTrade && price > 0 });

  const placeTrade = trpc.trading.placeTrade.useMutation({
    onSuccess: (data) => {
      const message = `Trade opened at ${formatPrice(data.openPrice, symbol)} · margin ${formatMoney(data.margin)}`;
      setExecutionMessage(message);
      toast.success(`Trade opened at ${formatPrice(data.openPrice, symbol)}`, { description: `Margin used: ${formatMoney(data.margin)}` });
      utils.trading.openTrades.invalidate();
      utils.trading.portfolioSummary.invalidate();
    },
    onError: (err) => {
      setExecutionMessage(err.message);
      toast.error(err.message);
    },
  });

  const handleTrade = (type: "buy" | "sell") => {
    const numericLotSize = Number(lotSize);
    const numericLeverage = Number(leverage);
    const numericStopLoss = stopLoss ? Number(stopLoss) : undefined;
    const numericTakeProfit = takeProfit ? Number(takeProfit) : undefined;
    setExecutionMessage(null);

    if (orderMode !== "market") {
      toast.info(`${orderMode === "limit" ? "Limit" : "Stop"} orders are staged in the ticket but market execution is currently enabled for this account.`);
      return;
    }
    if (!canTrade) return toast.error(`${symbol} is not available for trading yet`);
    if (!Number.isFinite(numericLotSize) || numericLotSize < minLot) return toast.error(`Lot size must be at least ${minLot}`);
    if (!Number.isFinite(numericLeverage) || numericLeverage < 1) return toast.error("Select a valid leverage");
    if (numericStopLoss !== undefined && !Number.isFinite(numericStopLoss)) return toast.error("Stop loss must be a valid price");
    if (numericTakeProfit !== undefined && !Number.isFinite(numericTakeProfit)) return toast.error("Take profit must be a valid price");

    placeTrade.mutate({ symbol, type, lotSize: numericLotSize, leverage: numericLeverage, stopLoss: numericStopLoss, takeProfit: numericTakeProfit });
  };

  return (
    <div className="flex h-full min-h-[520px] flex-col bg-[#12151a] text-[#e5e7eb]">
      <div className="flex items-center justify-between border-b border-[#2a303a] px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#7f8999]">Order ticket</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold">{symbol}<span className="text-[10px] font-normal text-[#7f8999]">{instrument?.category ?? "market"}</span></div>
        </div>
        <Gauge className="h-4 w-4 text-[#94a3b8]" />
      </div>

      <div className="grid grid-cols-4 border-b border-[#2a303a]">
        {(["market", "limit", "stop", "risk"] as OrderMode[]).map((mode) => (
          <button key={mode} type="button" onClick={() => setOrderMode(mode)} className={`border-b-2 px-2 py-2.5 text-[11px] capitalize transition-colors ${orderMode === mode ? "border-[#f59e0b] text-[#f8fafc]" : "border-transparent text-[#7f8999] hover:text-[#e5e7eb]"}`}>{mode === "risk" ? "Risk" : mode}</button>
        ))}
      </div>

      {orderMode === "risk" ? (
        <div className="flex flex-1 flex-col gap-4 p-4 text-xs">
          <div className="rounded border border-[#2a303a] bg-[#0f1115] p-3 text-[#94a3b8]">Risk calculator uses the selected symbol, lot size, leverage, and optional stop loss below.</div>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-[#7f8999]">Required margin</span><strong>{formatMoney(riskCalc?.margin)}</strong></div>
            <div className="flex justify-between"><span className="text-[#7f8999]">Pip value</span><strong>{riskCalc?.pipValue ?? "—"}</strong></div>
            <div className="flex justify-between"><span className="text-[#7f8999]">Risk amount</span><strong className="text-[#ef5350]">{formatMoney(riskCalc?.riskAmount)}</strong></div>
            <div className="flex justify-between"><span className="text-[#7f8999]">Risk percentage</span><strong>{riskCalc?.riskPercent ? `${riskCalc.riskPercent}%` : "—"}</strong></div>
          </div>
          <div className="mt-auto rounded border border-[#2a303a] p-3"><span className="text-[#7f8999]">Suggested lot size</span><div className="mt-1 text-lg font-semibold">{riskCalc?.recommendedLotSize ?? "—"}</div></div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-[#3a262a] bg-[#1a1215] p-3 text-center transition-colors hover:border-[#ef5350]"><div className="text-[10px] uppercase tracking-wide text-[#9f858a]">Sell / Bid</div><div className="mt-1 text-lg font-semibold tabular-nums text-[#ef5350]">{formatPrice(bid, symbol)}</div></div>
            <div className="rounded border border-[#1c3a35] bg-[#101a18] p-3 text-center transition-colors hover:border-[#26a69a]"><div className="text-[10px] uppercase tracking-wide text-[#8aa59f]">Buy / Ask</div><div className="mt-1 text-lg font-semibold tabular-nums text-[#26a69a]">{formatPrice(ask, symbol)}</div></div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#7f8999]"><span>Spread {formatPrice(Math.max(ask - bid, 0), symbol)}</span><span>Mid {formatPrice(price, symbol)}</span></div>

          {orderMode !== "market" && <div className="rounded border border-[#55421a] bg-[#201a0d] p-2.5 text-[11px] text-[#d6b466]">{orderMode === "limit" ? "Limit" : "Stop"} ticket is preview-only. It will not submit or create a pending order; use Market for live execution.</div>}

          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px] text-[#7f8999]">Quantity / lots</Label><Input value={lotSize} onChange={(e) => setLotSize(e.target.value)} className="mt-1 h-8 border-[#303744] bg-[#0f1115] text-xs" type="number" step="0.001" min={minLot} /></div>
            <div><Label className="text-[11px] text-[#7f8999]">Leverage</Label><Select value={leverage} onValueChange={setLeverage}><SelectTrigger className="mt-1 h-8 border-[#303744] bg-[#0f1115] text-xs"><SelectValue /></SelectTrigger><SelectContent>{["1", "5", "10", "25", "50", "100", "200", "500", "1000"].map((value) => <SelectItem key={value} value={value}>1:{value}</SelectItem>)}</SelectContent></Select></div>
          </div>

          {orderMode !== "market" && <div><Label className="text-[11px] text-[#7f8999]">Trigger price</Label><Input value={triggerPrice} onChange={(e) => setTriggerPrice(e.target.value)} className="mt-1 h-8 border-[#303744] bg-[#0f1115] text-xs" placeholder={formatPrice(price, symbol)} type="number" /></div>}

          <div className="grid grid-cols-2 gap-3"><div><Label className="text-[11px] text-[#7f8999]">Stop loss</Label><Input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="mt-1 h-8 border-[#303744] bg-[#0f1115] text-xs" placeholder="Optional" type="number" /></div><div><Label className="text-[11px] text-[#7f8999]">Take profit</Label><Input value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className="mt-1 h-8 border-[#303744] bg-[#0f1115] text-xs" placeholder="Optional" type="number" /></div></div>

          <div className="space-y-2 rounded border border-[#2a303a] bg-[#0f1115] p-3 text-[11px]"><div className="flex justify-between"><span className="text-[#7f8999]">Est. margin</span><span>{formatMoney(riskCalc?.margin)}</span></div><div className="flex justify-between"><span className="text-[#7f8999]">Free margin</span><span>{formatMoney(summary?.freeMargin)}</span></div><div className="flex justify-between"><span className="text-[#7f8999]">Account equity</span><span>{formatMoney(summary?.equity)}</span></div></div>

          {executionMessage && <div className={`rounded border p-2 text-[11px] ${placeTrade.error ? "border-[#6b2c32] bg-[#281316] text-[#ff8b91]" : "border-[#1f665d] bg-[#10221f] text-[#7ce4d2]"}`} role="status" aria-live="polite">{executionMessage}</div>}
          {!canTrade && !instrumentLoading && <div className="rounded border border-[#6b2c32] bg-[#281316] p-2 text-[11px] text-[#ff8b91]" role="alert">This symbol has no active execution instrument.</div>}

          <div className="mt-auto grid grid-cols-2 gap-2"><Button onClick={() => handleTrade("sell")} disabled={placeTrade.isPending || !canTrade || bid <= 0 || orderMode !== "market"} aria-busy={placeTrade.isPending} className="h-11 bg-[#b83c46] text-white hover:bg-[#c84a54] disabled:opacity-50">{placeTrade.isPending ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <TrendingDown className="mr-1.5 h-4 w-4" />}{placeTrade.isPending ? "EXECUTING" : "SELL"}</Button><Button onClick={() => handleTrade("buy")} disabled={placeTrade.isPending || !canTrade || ask <= 0 || orderMode !== "market"} aria-busy={placeTrade.isPending} className="h-11 bg-[#178f7e] text-white hover:bg-[#1da997] disabled:opacity-50">{placeTrade.isPending ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-1.5 h-4 w-4" />}{placeTrade.isPending ? "EXECUTING" : "BUY"}</Button></div>
        </div>
      )}
    </div>
  );
}

// ─── Bottom Trading Panel ────────────────────────────────────────────────────
function TradePanel({ symbol, price }: { symbol: string; price: number }) {
  const utils = trpc.useUtils();
  const { data: openTrades, isLoading: openLoading } = trpc.trading.openTrades.useQuery(undefined, { refetchInterval: 3000 });
  const { data: history, isLoading: historyLoading } = trpc.trading.tradeHistory.useQuery({ limit: 100 }, { refetchInterval: 5000 });
  const { data: summary } = trpc.trading.portfolioSummary.useQuery(undefined, { refetchInterval: 5000 });
  const { data: instrument } = trpc.market.instrumentBySymbol.useQuery({ symbol });
  const closeTrade = trpc.trading.closeTrade.useMutation({
    onSuccess: (data) => {
      toast.success(`Trade closed. P&L: ${data.pnl >= 0 ? "+" : ""}${formatMoney(data.pnl)}`);
      utils.trading.openTrades.invalidate();
      utils.trading.portfolioSummary.invalidate();
      utils.trading.tradeHistory.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Tabs defaultValue="positions" className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[#2a303a] bg-[#12151a] px-3"><TabsList className="h-10 rounded-none bg-transparent"><TabsTrigger value="positions" className="h-10 rounded-none border-b-2 border-transparent px-3 text-[11px] text-[#7f8999] data-[state=active]:border-[#f59e0b] data-[state=active]:bg-transparent data-[state=active]:text-[#f8fafc]">Positions <span className="ml-1 text-[10px]">{openTrades?.length ?? 0}</span></TabsTrigger><TabsTrigger value="orders" className="h-10 rounded-none border-b-2 border-transparent px-3 text-[11px] text-[#7f8999] data-[state=active]:border-[#f59e0b] data-[state=active]:bg-transparent data-[state=active]:text-[#f8fafc]">Pending Orders</TabsTrigger><TabsTrigger value="history" className="h-10 rounded-none border-b-2 border-transparent px-3 text-[11px] text-[#7f8999] data-[state=active]:border-[#f59e0b] data-[state=active]:bg-transparent data-[state=active]:text-[#f8fafc]">Trade History</TabsTrigger><TabsTrigger value="account" className="h-10 rounded-none border-b-2 border-transparent px-3 text-[11px] text-[#7f8999] data-[state=active]:border-[#f59e0b] data-[state=active]:bg-transparent data-[state=active]:text-[#f8fafc]">Account</TabsTrigger><TabsTrigger value="asset" className="h-10 rounded-none border-b-2 border-transparent px-3 text-[11px] text-[#7f8999] data-[state=active]:border-[#f59e0b] data-[state=active]:bg-transparent data-[state=active]:text-[#f8fafc]">Asset Info</TabsTrigger></TabsList><div className="hidden items-center gap-4 text-[10px] text-[#7f8999] md:flex"><span>Chart: {symbol}</span><span>Last: {formatPrice(price, symbol)}</span><span className="flex items-center gap-1 text-[#26a69a]"><Activity className="h-3 w-3" />Live updates</span></div></div>
      <TabsContent value="positions" className="m-0 min-h-0 flex-1 overflow-auto bg-[#0f1115] p-0">{openLoading ? <div className="p-5 text-xs text-[#7f8999]">Loading positions…</div> : openTrades?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-xs"><thead><tr className="border-b border-[#252b34] text-left text-[10px] uppercase tracking-wide text-[#7f8999]"><th className="px-3 py-2">Symbol</th><th className="px-3 py-2">Side</th><th className="px-3 py-2">Size</th><th className="px-3 py-2">Open price</th><th className="px-3 py-2">Current</th><th className="px-3 py-2">P&L</th><th className="px-3 py-2">Action</th></tr></thead><tbody>{openTrades.map((trade) => { const pnl = Number(trade.unrealizedPnl ?? 0); return <tr key={trade.id} className="border-b border-[#1e242c] text-[#cbd5e1] hover:bg-[#151a21]"><td className="px-3 py-2.5 font-semibold">{trade.symbol}</td><td className={`px-3 py-2.5 font-bold ${trade.type === "buy" ? "text-[#26a69a]" : "text-[#ef5350]"}`}>{trade.type.toUpperCase()}</td><td className="px-3 py-2.5 tabular-nums">{trade.lotSize}</td><td className="px-3 py-2.5 tabular-nums">{formatPrice(Number(trade.openPrice), trade.symbol)}</td><td className="px-3 py-2.5 tabular-nums">{formatPrice(Number(trade.currentPrice), trade.symbol)}</td><td className={`px-3 py-2.5 tabular-nums font-semibold ${pnl >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}`}>{pnl >= 0 ? "+" : ""}{formatMoney(pnl)}</td><td className="px-3 py-2.5"><button type="button" onClick={() => closeTrade.mutate({ tradeId: trade.id })} disabled={closeTrade.isPending} className="rounded p-1 text-[#7f8999] hover:bg-[#281316] hover:text-[#ff8b91]" title="Close position"><X className="h-4 w-4" /></button></td></tr>; })}</tbody></table></div> : <div className="flex h-full min-h-[120px] items-center justify-center text-xs text-[#7f8999]">No open positions. Your active trades will appear here.</div>}</TabsContent>
      <TabsContent value="orders" className="m-0 min-h-0 flex-1 bg-[#0f1115]"><div className="flex h-full items-center justify-center text-xs text-[#7f8999]">Pending orders are not enabled for this account. Limit and stop tickets are preview-only; use Market for live execution.</div></TabsContent>
      <TabsContent value="history" className="m-0 min-h-0 flex-1 overflow-auto bg-[#0f1115]">{historyLoading ? <div className="p-5 text-xs text-[#7f8999]">Loading trade history…</div> : history?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-xs"><thead><tr className="border-b border-[#252b34] text-left text-[10px] uppercase tracking-wide text-[#7f8999]"><th className="px-3 py-2">Symbol</th><th className="px-3 py-2">Side</th><th className="px-3 py-2">Size</th><th className="px-3 py-2">Open</th><th className="px-3 py-2">Close</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{history.map((trade) => <tr key={trade.id} className="border-b border-[#1e242c] text-[#cbd5e1]"><td className="px-3 py-2.5 font-semibold">{trade.symbol}</td><td className={`px-3 py-2.5 font-bold ${trade.type === "buy" ? "text-[#26a69a]" : "text-[#ef5350]"}`}>{trade.type.toUpperCase()}</td><td className="px-3 py-2.5 tabular-nums">{trade.lotSize}</td><td className="px-3 py-2.5 tabular-nums">{formatPrice(Number(trade.openPrice), trade.symbol)}</td><td className="px-3 py-2.5 tabular-nums">{formatPrice(Number(trade.closePrice), trade.symbol)}</td><td className="px-3 py-2.5 text-[#7f8999]">{trade.status}</td></tr>)}</tbody></table></div> : <div className="flex h-full items-center justify-center text-xs text-[#7f8999]">No completed trades yet.</div>}</TabsContent>
      <TabsContent value="account" className="m-0 min-h-0 flex-1 overflow-auto bg-[#0f1115] p-4"><div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[["Balance", summary?.totalBalance], ["Equity", summary?.equity], ["Free margin", summary?.freeMargin], ["Used margin", summary?.margin], ["Margin level", summary?.marginLevel ? `${summary.marginLevel}%` : "—"]].map(([label, value]) => <div key={String(label)} className="rounded border border-[#2a303a] bg-[#12151a] p-3"><div className="text-[10px] uppercase tracking-wide text-[#7f8999]">{label}</div><div className="mt-1 text-sm font-semibold text-[#e5e7eb]">{String(label) === "Margin level" ? value : formatMoney(value)}</div></div>)}</div></TabsContent>
      <TabsContent value="asset" className="m-0 min-h-0 flex-1 overflow-auto bg-[#0f1115] p-4"><div className="grid gap-3 text-xs text-[#cbd5e1] md:grid-cols-3"><div><span className="text-[#7f8999]">Instrument</span><div className="mt-1 font-semibold">{instrument?.name ?? symbol}</div></div><div><span className="text-[#7f8999]">Category</span><div className="mt-1 font-semibold capitalize">{instrument?.category ?? "crypto"}</div></div><div><span className="text-[#7f8999]">Trading session</span><div className="mt-1 font-semibold">24/7 Binance market</div></div><div><span className="text-[#7f8999]">Contract size</span><div className="mt-1 font-semibold">{instrument?.contractSize ?? "—"}</div></div><div><span className="text-[#7f8999]">Minimum lot</span><div className="mt-1 font-semibold">{instrument?.minLot ?? "—"}</div></div><div><span className="text-[#7f8999]">Maximum leverage</span><div className="mt-1 font-semibold">1:{instrument?.maxLeverage ?? "—"}</div></div></div></TabsContent>
    </Tabs>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function TradingTerminal() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSD");
  const [selectedTimeframe, setSelectedTimeframe] = useState<(typeof TIMEFRAMES)[number]>("1m");
  const [chartMode, setChartMode] = useState<ChartMode>("candles");
  const [showEma, setShowEma] = useState(false);
  const [showSma, setShowSma] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [crosshairPoint, setCrosshairPoint] = useState<ChartPoint | null>(null);
  const [drawingTool, setDrawingTool] = useState<DrawingToolType>("pointer");
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [symbolFilter, setSymbolFilter] = useState("");

  useEffect(() => {
    setDrawings(loadDrawings(selectedSymbol, selectedTimeframe));
    setSelectedDrawingId(null);
  }, [selectedSymbol, selectedTimeframe]);

  const handleAddDrawing = (item: DrawingItem) => {
    const next = [...drawings, item];
    setDrawings(next);
    saveDrawings(selectedSymbol, selectedTimeframe, next);
  };

  const handleDeleteSelectedDrawing = () => {
    if (!selectedDrawingId) return;
    const next = drawings.filter((d) => d.id !== selectedDrawingId);
    setDrawings(next);
    saveDrawings(selectedSymbol, selectedTimeframe, next);
    setSelectedDrawingId(null);
    toast.success("Drawing removed");
  };

  const handleClearAllDrawings = () => {
    setDrawings([]);
    saveDrawings(selectedSymbol, selectedTimeframe, []);
    setSelectedDrawingId(null);
    toast.success("All drawings cleared");
  };
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const previousPrice = useRef(0);
  const { isConnected, getPrice, subscribePrices, subscribeToCandles, marketDataErrors, clearMarketDataErrors } = useWebSocketContext();
  const { data: quotes } = trpc.market.prices.useQuery({ symbols: [selectedSymbol] }, { refetchInterval: 2000 });
  const { data: marketStats } = trpc.market.binancePrices.useQuery({ symbols: [selectedSymbol] }, { refetchInterval: 5000 });
  const polledQuote = quotes?.[0];
  const stats = marketStats?.[0];
  const streamQuote = getPrice(selectedSymbol);
  const livePrice = streamQuote?.price ?? polledQuote?.price ?? 0;
  const spread = Math.max((polledQuote?.ask ?? 0) - (polledQuote?.bid ?? 0), livePrice >= 100 ? 10 : 0.0002);
  const { bid, ask } = getQuoteSides(livePrice, spread);
  const changePercent = streamQuote?.changePercent24h ?? (stats && "changePercent24h" in stats ? Number(stats.changePercent24h) : 0);
  const dayHigh = stats && "high24h" in stats ? Number(stats.high24h) : 0;
  const dayLow = stats && "low24h" in stats ? Number(stats.low24h) : 0;
  const filteredSymbols = useMemo(() => filterTerminalSymbols(SYMBOLS, symbolFilter), [symbolFilter]);
  const selectedMarketError = marketDataErrors.find((error) => error.symbol === selectedSymbol && (!error.interval || error.interval === selectedTimeframe));

  const retryMarketData = () => {
    clearMarketDataErrors(selectedSymbol, selectedTimeframe);
    subscribeToCandles(selectedSymbol, selectedTimeframe);
  };

  useEffect(() => {
    subscribePrices([selectedSymbol]);
    setCrosshairPoint(null);
  }, [selectedSymbol, subscribePrices]);

  useEffect(() => {
    if (!livePrice || !previousPrice.current) {
      previousPrice.current = livePrice;
      return;
    }
    if (livePrice !== previousPrice.current) {
      setPriceDirection(livePrice > previousPrice.current ? "up" : "down");
      previousPrice.current = livePrice;
      const timer = window.setTimeout(() => setPriceDirection(null), 700);
      return () => window.clearTimeout(timer);
    }
  }, [livePrice]);

  useEffect(() => {
    const handleFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    if (!terminalRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await terminalRef.current.requestFullscreen();
  };

  const legend = crosshairPoint;
  const legendText = legend
    ? `O ${formatPrice(legend.open, selectedSymbol)}  H ${formatPrice(legend.high, selectedSymbol)}  L ${formatPrice(legend.low, selectedSymbol)}  C ${formatPrice(legend.close, selectedSymbol)}${legend.volume !== undefined ? `  V ${Math.round(legend.volume).toLocaleString()}` : ""}`
    : "Move cursor over chart for OHLCV";

  return (
    <div ref={terminalRef} className="flex min-h-[calc(100dvh-8rem)] w-full min-w-0 flex-col overflow-hidden border-y border-[#252b34] bg-[#0b0d10] text-[#e5e7eb]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#252b34] bg-[#12151a] px-3 py-2">
        <div className="flex items-center gap-2 border-r border-[#2a303a] pr-3"><div className="flex h-7 w-7 items-center justify-center rounded bg-[#1d2733] text-[#38bdf8]"><BarChart2 className="h-4 w-4" /></div><div className="hidden sm:block"><div className="text-[11px] font-semibold">TradeFlow Pro</div><div className="text-[9px] text-[#7f8999]">Advanced charting terminal</div></div></div>
        <div className="flex items-center gap-2"><div className="relative hidden md:block"><Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-[#64748b]" /><Input value={symbolFilter} onChange={(e) => setSymbolFilter(e.target.value)} placeholder="Search symbols" className="h-8 w-32 border-[#303744] bg-[#0f1115] pl-7 text-xs" /></div><Select value={selectedSymbol} onValueChange={(value) => { setSelectedSymbol(value); setSymbolFilter(""); }}><SelectTrigger className="h-8 w-32 border-[#303744] bg-[#0f1115] text-xs font-semibold"><SelectValue /></SelectTrigger><SelectContent>{(filteredSymbols.length ? filteredSymbols : SYMBOLS).map((symbol) => <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>)}</SelectContent></Select></div>
        <div className={`flex items-center gap-2 rounded px-2 py-1 transition-colors ${priceDirection === "up" ? "bg-[#12342e]" : priceDirection === "down" ? "bg-[#34181c]" : ""}`}><span className="text-sm font-semibold tabular-nums">{formatPrice(livePrice, selectedSymbol)}</span><span className={`text-[10px] ${changePercent >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}`}>{changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%</span></div>
        <div className="hidden items-center gap-1 text-[10px] text-[#7f8999] lg:flex"><span>24h</span><span className="tabular-nums">H {formatPrice(dayHigh, selectedSymbol)}</span><span className="tabular-nums">L {formatPrice(dayLow, selectedSymbol)}</span></div>
        <div className="ml-auto flex items-center gap-1"><div className={`mr-2 hidden items-center gap-1 text-[10px] uppercase tracking-wide sm:flex ${isConnected ? "text-[#26a69a]" : "text-[#94a3b8]"}`}><span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-[#26a69a]" : "bg-[#94a3b8]"}`} />{isConnected ? "Binance live" : "Connecting"}</div><div className="relative"><button type="button" onClick={() => setIndicatorsOpen((open) => !open)} className={`flex items-center gap-1 rounded px-2 py-1.5 text-[10px] ${indicatorsOpen ? "bg-[#263241] text-[#e5e7eb]" : "text-[#7f8999] hover:bg-[#1a2028] hover:text-[#e5e7eb]"}`}><SlidersHorizontal className="h-3.5 w-3.5" /><span className="hidden sm:inline">Indicators</span><ChevronDown className="h-3 w-3" /></button>{indicatorsOpen && <div className="absolute right-0 top-9 z-30 w-48 rounded border border-[#303744] bg-[#171c23] p-2 text-[11px] shadow-2xl"><div className="mb-2 px-2 text-[10px] uppercase tracking-wide text-[#7f8999]">Overlays and panes</div><label className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-[#222a35]"><input type="checkbox" checked={showEma} onChange={(event) => setShowEma(event.target.checked)} className="accent-[#f59e0b]" /><span className="text-[#fbbf24]">EMA 20</span></label><label className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-[#222a35]"><input type="checkbox" checked={showSma} onChange={(event) => setShowSma(event.target.checked)} className="accent-[#c084fc]" /><span className="text-[#c084fc]">SMA 50</span></label><label className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-[#222a35]"><input type="checkbox" checked={showVolume} onChange={(event) => setShowVolume(event.target.checked)} className="accent-[#38bdf8]" /><span className="text-[#cbd5e1]">Volume</span></label></div>}</div><button type="button" onClick={() => setChartMode("candles")} className={`rounded p-1.5 ${chartMode === "candles" ? "bg-[#263241] text-[#e5e7eb]" : "text-[#7f8999] hover:bg-[#1a2028]"}`} title="Candlestick chart"><CandlestickChart className="h-4 w-4" /></button><button type="button" onClick={() => setChartMode("line")} className={`rounded p-1.5 ${chartMode === "line" ? "bg-[#263241] text-[#e5e7eb]" : "text-[#7f8999] hover:bg-[#1a2028]"}`} title="Line chart"><LineChart className="h-4 w-4" /></button><button type="button" onClick={toggleFullscreen} className="rounded p-1.5 text-[#7f8999] hover:bg-[#1a2028] hover:text-[#e5e7eb]" title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>{isFullscreen ? <Expand className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button><button type="button" className="rounded p-1.5 text-[#7f8999] hover:bg-[#1a2028] hover:text-[#e5e7eb]" title="Chart settings"><Settings2 className="h-4 w-4" /></button></div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-[#252b34] bg-[#0f1115] px-3 py-1.5 text-[10px] text-[#7f8999]"><div className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /><span>Timeframe</span></div><div className="flex items-center gap-0.5">{TIMEFRAMES.map((timeframe) => <button key={timeframe} type="button" onClick={() => setSelectedTimeframe(timeframe)} className={`rounded px-2 py-1 ${selectedTimeframe === timeframe ? "bg-[#263241] text-[#f8fafc]" : "hover:bg-[#1a2028] hover:text-[#e5e7eb]"}`}>{timeframe}</button>)}</div><div className="flex items-center gap-1 border-l border-[#252b34] pl-3"><span className="hidden sm:inline">Drawings:</span><button type="button" onClick={() => setDrawingTool("pointer")} className={`rounded px-2 py-1 ${drawingTool === "pointer" ? "bg-[#263241] text-[#f8fafc]" : "hover:bg-[#1a2028]"}`} title="Pointer / Select"><Crosshair className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setDrawingTool("horizontal")} className={`rounded px-2 py-1 ${drawingTool === "horizontal" ? "bg-[#263241] text-[#f8fafc]" : "hover:bg-[#1a2028]"}`} title="Horizontal Level"><Minus className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setDrawingTool("trendline")} className={`rounded px-2 py-1 ${drawingTool === "trendline" ? "bg-[#263241] text-[#f8fafc]" : "hover:bg-[#1a2028]"}`} title="Trendline"><PenTool className="h-3.5 w-3.5" /></button>{selectedDrawingId && <button type="button" onClick={handleDeleteSelectedDrawing} className="rounded bg-[#281316] px-2 py-1 text-[#ff8b91] hover:bg-[#381a1f]" title="Delete selected drawing"><Trash2 className="h-3.5 w-3.5" /></button>}{drawings.length > 0 && <button type="button" onClick={handleClearAllDrawings} className="rounded px-2 py-1 text-[#94a3b8] hover:bg-[#1a2028] hover:text-[#f8fafc]" title="Clear all drawings">Clear</button>}</div><div className="ml-auto hidden items-center gap-3 md:flex"><span className="flex items-center gap-1"><SlidersHorizontal className="h-3.5 w-3.5" />Indicators</span><span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-[#f59e0b]" />Binance spot feed</span></div></div>

      <div className="grid min-h-[560px] h-[clamp(560px,66vh,780px)] flex-1 grid-cols-1 gap-px bg-[#252b34] xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="flex min-w-0 flex-col bg-[#0f1115]"><div className="flex items-center justify-between border-b border-[#252b34] px-3 py-2 text-[10px] text-[#7f8999]"><div className="flex items-center gap-3"><span className="font-semibold text-[#e5e7eb]">{selectedSymbol} · {selectedTimeframe}</span><span className="hidden max-w-[520px] truncate sm:inline">{legendText}</span></div><div className="flex items-center gap-2"><span className="hidden sm:inline">Volume</span><BarChart3 className="h-3.5 w-3.5" /><button type="button" className="rounded p-1 hover:bg-[#1a2028]" title="Chart options"><Settings2 className="h-3.5 w-3.5" /></button></div></div><div className="min-h-0 flex-1"><PriceChart symbol={selectedSymbol} timeframe={selectedTimeframe} chartMode={chartMode} showEma={showEma} showSma={showSma} showVolume={showVolume} marketDataError={selectedMarketError?.message} onRetry={retryMarketData} onCrosshairChange={setCrosshairPoint} drawingTool={drawingTool} drawings={drawings} onAddDrawing={handleAddDrawing} selectedDrawingId={selectedDrawingId} onSelectDrawing={setSelectedDrawingId} /></div></div>
        <div className="min-h-0 bg-[#12151a]"><OrderPanel symbol={selectedSymbol} price={livePrice} bid={bid} ask={ask} /></div>
      </div>

      <div className="h-[clamp(240px,30vh,360px)] min-h-[240px] border-t border-[#252b34] bg-[#0f1115]"><TradePanel symbol={selectedSymbol} price={livePrice} /></div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#252b34] bg-[#12151a] px-3 py-1.5 text-[10px] text-[#64748b]"><div className="flex items-center gap-3"><span className="flex items-center gap-1"><PanelBottom className="h-3 w-3" />Trade panel</span><span className="flex items-center gap-1"><WalletCards className="h-3 w-3" />Account-linked execution</span></div><div className="flex items-center gap-3"><span>Data may move rapidly</span><span className="flex items-center gap-1"><Info className="h-3 w-3" />Trading involves risk</span></div></div>
    </div>
  );
}
