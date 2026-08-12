import axios from "axios";
import WebSocket from "ws";
import { getWebSocket } from "./websocket";

export interface Candle {
  symbol: string;
  interval: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteAssetVolume: number;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: number;
  takerBuyQuoteAssetVolume: number;
  isClosed: boolean;
}

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Market-data-only REST endpoint works for public klines in restricted environments.
const BINANCE_REST_URL = "https://data-api.binance.vision/api/v3";
const DEFAULT_INTERVAL = "1m";

// Platform symbols are USD-quoted, while Binance spot uses USDT-quoted pairs.
const CRYPTO_SYMBOL_MAP: Record<string, string> = {
  BTCUSD: "BTCUSDT",
  ETHUSD: "ETHUSDT",
  BNBUSD: "BNBUSDT",
  XRPUSD: "XRPUSDT",
  ADAUSD: "ADAUSDT",
  SOLUSD: "SOLUSDT",
  DOGEUSD: "DOGEUSDT",
  AVAXUSD: "AVAXUSDT",
  LINKUSD: "LINKUSDT",
  DOTUSD: "DOTUSDT",
  LTCUSD: "LTCUSDT",
  BCHUSD: "BCHUSDT",
  TRXUSD: "TRXUSDT",
  UNIUSD: "UNIUSDT",
  AAVEUSD: "AAVEUSDT",
};

const BINANCE_TO_PLATFORM = Object.fromEntries(
  Object.entries(CRYPTO_SYMBOL_MAP).map(([platform, binance]) => [binance, platform])
);

const DEFAULT_CRYPTO_SYMBOLS = Object.keys(CRYPTO_SYMBOL_MAP);

let klinesWs: WebSocket | null = null;
let isConnected = false;
let subscriptions = new Set<string>();
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const loggedCandleSymbols = new Set<string>();

function toBinanceSymbol(symbol: string): string | null {
  const normalized = symbol.toUpperCase();
  if (CRYPTO_SYMBOL_MAP[normalized]) return CRYPTO_SYMBOL_MAP[normalized];
  if (/^[A-Z0-9]+USDT$/.test(normalized)) return normalized;
  return null;
}

function toPlatformSymbol(symbol: string): string {
  const normalized = symbol.toUpperCase();
  return BINANCE_TO_PLATFORM[normalized] ?? (normalized.endsWith("USDT") ? `${normalized.slice(0, -4)}USD` : normalized);
}

/** Fetch real historical candles from Binance for supported crypto pairs. */
export async function getBinanceKlines(
  symbol: string,
  interval: string,
  limit = 100,
): Promise<ChartCandle[] | null> {
  const binanceSymbol = toBinanceSymbol(symbol);
  if (!binanceSymbol) return null;

  try {
    const response = await axios.get(`${BINANCE_REST_URL}/klines`, {
      params: { symbol: binanceSymbol, interval, limit: Math.min(Math.max(limit, 10), 1000) },
      timeout: 7000,
    });

    return response.data.map((row: [number, string, string, string, string, string]) => ({
      time: Math.floor(row[0] / 1000),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }));
  } catch (error) {
    console.error(`[BinanceKlines] Historical request failed for ${symbol}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/** Initialize the Binance WebSocket connection for live crypto klines. */
export function initializeBinanceKlines() {
  if (klinesWs && isConnected) {
    console.log("[BinanceKlines] Already connected");
    return;
  }

  console.log("[BinanceKlines] Connecting to Binance klines stream...");
  klinesWs = new WebSocket("wss://data-stream.binance.vision/ws");

  klinesWs.on("open", () => {
    console.log("[BinanceKlines] Connected to Binance WebSocket");
    isConnected = true;
    reconnectAttempts = 0;
    subscriptions.clear();
    subscribeToAllCryptoKlines(DEFAULT_INTERVAL);
  });

  klinesWs.on("message", (data) => {
    try {
      handleKlinesMessage(JSON.parse(data.toString()));
    } catch (error) {
      console.error("[BinanceKlines] Error parsing message:", error);
    }
  });

  klinesWs.on("error", (error) => {
    console.error("[BinanceKlines] WebSocket error:", error.message);
    isConnected = false;
  });

  klinesWs.on("close", (code, reason) => {
    console.log(`[BinanceKlines] Disconnected from Binance (code ${code}, reason ${reason.toString()})`);
    isConnected = false;
    klinesWs = null;
    subscriptions.clear();

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts += 1;
      console.log(`[BinanceKlines] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      setTimeout(initializeBinanceKlines, delay);
    }
  });
}

/** Subscribe to all supported crypto pairs in one Binance subscription request. */
export function subscribeToAllCryptoKlines(interval = DEFAULT_INTERVAL) {
  if (!klinesWs || klinesWs.readyState !== WebSocket.OPEN) {
    console.warn("[BinanceKlines] WebSocket not ready for bulk subscription");
    return;
  }

  const streams = DEFAULT_CRYPTO_SYMBOLS.map((symbol) => {
    const binanceSymbol = CRYPTO_SYMBOL_MAP[symbol];
    subscriptions.add(`${binanceSymbol}:${interval}`);
    return `${binanceSymbol.toLowerCase()}@kline_${interval}`;
  });

  // Binance limits incoming client messages to 5 per second; send one bulk request.
  klinesWs.send(JSON.stringify({
    method: "SUBSCRIBE",
    params: streams,
    id: Date.now(),
  }));
  console.log(`[BinanceKlines] Subscribed to ${streams.length} crypto pairs in one request`);
}

/** Subscribe to a platform symbol or a raw Binance USDT symbol. */
export function subscribeToKlines(symbol: string, interval = DEFAULT_INTERVAL): boolean {
  if (!klinesWs || klinesWs.readyState !== WebSocket.OPEN) {
    console.warn(`[BinanceKlines] WebSocket not ready for ${symbol}:${interval}`);
    return false;
  }

  const binanceSymbol = toBinanceSymbol(symbol);
  if (!binanceSymbol) {
    console.warn(`[BinanceKlines] Unsupported non-crypto symbol: ${symbol}`);
    return false;
  }

  const subscriptionKey = `${binanceSymbol}:${interval}`;
  if (subscriptions.has(subscriptionKey)) return true;

  klinesWs.send(JSON.stringify({
    method: "SUBSCRIBE",
    params: [`${binanceSymbol.toLowerCase()}@kline_${interval}`],
    id: Date.now(),
  }));
  subscriptions.add(subscriptionKey);
  console.log(`[BinanceKlines] Subscribed to ${binanceSymbol} ${interval} candles`);
  return true;
}

export function unsubscribeFromKlines(symbol: string, interval = DEFAULT_INTERVAL) {
  if (!klinesWs || klinesWs.readyState !== WebSocket.OPEN) return;
  const binanceSymbol = toBinanceSymbol(symbol);
  if (!binanceSymbol) return;

  klinesWs.send(JSON.stringify({
    method: "UNSUBSCRIBE",
    params: [`${binanceSymbol.toLowerCase()}@kline_${interval}`],
    id: Date.now(),
  }));
  subscriptions.delete(`${binanceSymbol}:${interval}`);
}

function handleKlinesMessage(message: any) {
  if (message.code) {
    console.error(`[BinanceKlines] Binance stream error ${message.code}: ${message.msg}`);
    return;
  }
  if (message.result === null && message.id) return;
  if (message.e !== "kline" || !message.k) return;

  const k = message.k;
  const candle: Candle = {
    symbol: toPlatformSymbol(message.s),
    interval: k.i,
    openTime: k.t,
    closeTime: k.T,
    open: Number(k.o),
    high: Number(k.h),
    low: Number(k.l),
    close: Number(k.c),
    volume: Number(k.v),
    quoteAssetVolume: Number(k.q),
    numberOfTrades: k.n,
    takerBuyBaseAssetVolume: Number(k.V),
    takerBuyQuoteAssetVolume: Number(k.Q),
    isClosed: Boolean(k.x),
  };

  if (!loggedCandleSymbols.has(candle.symbol)) {
    loggedCandleSymbols.add(candle.symbol);
    console.log(`[BinanceKlines] Candle received and broadcast: ${candle.symbol} ${candle.interval} close=${candle.close}`);
  }

  const io = getWebSocket();
  io?.emit("candle_update", { ...candle, timestamp: Date.now() });
}

export function isKlinesConnected(): boolean {
  return isConnected && klinesWs?.readyState === WebSocket.OPEN;
}

export function getActiveSubscriptions(): string[] {
  return Array.from(subscriptions);
}

export function disconnectBinanceKlines() {
  if (klinesWs) klinesWs.close();
  klinesWs = null;
  isConnected = false;
  subscriptions.clear();
}

export { CRYPTO_SYMBOL_MAP };

// Keep the platform crypto symbols available to startup diagnostics.
console.log(`[BinanceKlines] Supported crypto pairs: ${DEFAULT_CRYPTO_SYMBOLS.join(", ")}`);
