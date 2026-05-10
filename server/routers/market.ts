import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getInstruments, getInstrumentBySymbol, getTradingSignals, getEconomicEvents } from "../db";

// ─── Price Simulation Engine ──────────────────────────────────────────────────
// Base prices for all instruments
const BASE_PRICES: Record<string, number> = {
  EURUSD: 1.08450, GBPUSD: 1.26800, USDJPY: 154.20, AUDUSD: 0.65200,
  USDCHF: 0.90100, USDCAD: 1.36500, NZDUSD: 0.59800, EURGBP: 0.85500,
  BTCUSD: 62500, ETHUSD: 3150, XRPUSD: 0.52300, SOLUSD: 148.50,
  XAUUSD: 2320.50, XAGUSD: 27.45, USOIL: 78.30, UKOIL: 82.15,
  AAPL: 189.50, TSLA: 175.20, MSFT: 415.80, AMZN: 185.60,
  US500: 5248.50, US30: 39450, NAS100: 18320, GER40: 18650,
  SYNTH1: 1000.00, SYNTH2: 1000.00, SYNTH3: 1000.00, SYNTH4: 1000.00,
  BINEURUSD: 50.00, BINBTCUSD: 50.00,
};

const priceState: Record<string, { price: number; lastUpdate: number }> = {};

export function getCurrentPrice(symbol: string): { bid: number; ask: number; price: number } {
  const base = BASE_PRICES[symbol] ?? 100;
  const now = Date.now();
  
  if (!priceState[symbol]) {
    priceState[symbol] = { price: base, lastUpdate: now };
  }
  
  const state = priceState[symbol];
  const elapsed = (now - state.lastUpdate) / 1000;
  
  // Simulate realistic price movement
  const volatility = getVolatility(symbol);
  const drift = (Math.random() - 0.499) * volatility * Math.sqrt(elapsed);
  state.price = Math.max(state.price * (1 + drift), base * 0.5);
  state.lastUpdate = now;
  
  const spread = getSpread(symbol);
  return {
    price: state.price,
    bid: state.price - spread / 2,
    ask: state.price + spread / 2,
  };
}

function getVolatility(symbol: string): number {
  if (symbol.includes("SYNTH")) return 0.005;
  if (symbol === "BTCUSD" || symbol === "ETHUSD") return 0.003;
  if (symbol.includes("USD") && symbol.length === 6) return 0.0003;
  if (symbol === "XAUUSD") return 0.0008;
  if (symbol === "USOIL" || symbol === "UKOIL") return 0.001;
  return 0.0005;
}

function getSpread(symbol: string): number {
  const spreads: Record<string, number> = {
    EURUSD: 0.00020, GBPUSD: 0.00030, USDJPY: 0.020, AUDUSD: 0.00025,
    BTCUSD: 10, ETHUSD: 3, XAUUSD: 0.30, USOIL: 0.03,
    AAPL: 0.10, TSLA: 0.15, US500: 0.50, SYNTH1: 0.001,
  };
  return spreads[symbol] ?? 0.0005;
}

// Generate OHLCV candle data
export function generateCandles(symbol: string, timeframe: string, count: number) {
  const base = BASE_PRICES[symbol] ?? 100;
  const volatility = getVolatility(symbol) * 100;
  const candles = [];
  let price = base;
  
  const tfMinutes: Record<string, number> = {
    "1m": 1, "5m": 5, "15m": 15, "1h": 60, "4h": 240, "1d": 1440,
  };
  const minutes = tfMinutes[timeframe] ?? 60;
  const now = Date.now();
  
  for (let i = count; i >= 0; i--) {
    const time = Math.floor((now - i * minutes * 60 * 1000) / 1000);
    const open = price;
    const change = (Math.random() - 0.495) * volatility * price * 0.01;
    const close = Math.max(price + change, base * 0.3);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.005);
    const volume = Math.floor(Math.random() * 10000 + 1000);
    candles.push({ time, open, high, low, close, volume });
    price = close;
  }
  
  return candles;
}

export const marketRouter = router({
  instruments: publicProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return getInstruments(input?.category);
    }),

  instrumentBySymbol: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ input }) => {
      return getInstrumentBySymbol(input.symbol);
    }),

  prices: publicProcedure
    .input(z.object({ symbols: z.array(z.string()) }))
    .query(({ input }) => {
      return input.symbols.map((symbol) => ({
        symbol,
        ...getCurrentPrice(symbol),
        timestamp: Date.now(),
      }));
    }),

  candles: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        timeframe: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]),
        count: z.number().min(10).max(500).default(100),
      })
    )
    .query(({ input }) => {
      return generateCandles(input.symbol, input.timeframe, input.count);
    }),

  signals: publicProcedure.query(async () => {
    return getTradingSignals();
  }),

  economicCalendar: publicProcedure
    .input(z.object({ days: z.number().min(1).max(30).default(7) }).optional())
    .query(async ({ input }) => {
      return getEconomicEvents(input?.days ?? 7);
    }),

  marketHours: publicProcedure.query(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay(); // 0=Sun, 6=Sat
    const isWeekend = utcDay === 0 || utcDay === 6;
    
    return {
      forex: { isOpen: !isWeekend, session: getForexSession(utcHour) },
      crypto: { isOpen: true, session: "24/7" },
      us_stocks: { isOpen: !isWeekend && utcHour >= 14 && utcHour < 21, session: "NYSE/NASDAQ" },
      eu_stocks: { isOpen: !isWeekend && utcHour >= 8 && utcHour < 16, session: "Frankfurt/London" },
      commodities: { isOpen: !isWeekend, session: "COMEX/NYMEX" },
      synthetic: { isOpen: true, session: "24/7" },
    };
  }),
});

function getForexSession(utcHour: number): string {
  if (utcHour >= 0 && utcHour < 9) return "Tokyo/Sydney";
  if (utcHour >= 8 && utcHour < 17) return "London";
  if (utcHour >= 13 && utcHour < 22) return "New York";
  return "Overlap";
}
