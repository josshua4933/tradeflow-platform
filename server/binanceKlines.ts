import WebSocket from "ws";
import { getWebSocket } from "./websocket";

interface Candle {
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

let klinesWs: WebSocket | null = null;
let isConnected = false;
let subscriptions = new Set<string>();

/**
 * Initialize Binance klines WebSocket connection
 */
export function initializeBinanceKlines() {
  if (klinesWs) {
    console.log("[BinanceKlines] Already connected");
    return;
  }

  console.log("[BinanceKlines] Connecting to Binance klines stream...");

  try {
    klinesWs = new WebSocket("wss://stream.binance.com:9443/ws");

    klinesWs.on("open", () => {
      console.log("[BinanceKlines] Connected to Binance");
      isConnected = true;
    });

    klinesWs.on("message", (data: string) => {
      try {
        const message = JSON.parse(data);
        handleKlinesMessage(message);
      } catch (error) {
        console.error("[BinanceKlines] Error parsing message:", error);
      }
    });

    klinesWs.on("error", (error: Error) => {
      console.error("[BinanceKlines] WebSocket error:", error);
      isConnected = false;
    });

    klinesWs.on("close", () => {
      console.log("[BinanceKlines] Disconnected from Binance");
      isConnected = false;
      klinesWs = null;

      // Reconnect after 3 seconds
      setTimeout(() => {
        initializeBinanceKlines();
      }, 3000);
    });
  } catch (error) {
    console.error("[BinanceKlines] Failed to initialize:", error);
    isConnected = false;
  }
}

/**
 * Subscribe to klines for a specific symbol and interval
 * Intervals: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
 */
export function subscribeToKlines(symbol: string, interval: string = "1m") {
  if (!klinesWs || klinesWs.readyState !== WebSocket.OPEN) {
    console.error("[BinanceKlines] WebSocket not ready");
    return;
  }

  const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
  const subscriptionKey = `${symbol}:${interval}`;

  if (subscriptions.has(subscriptionKey)) {
    console.log(`[BinanceKlines] Already subscribed to ${subscriptionKey}`);
    return;
  }

  const subscription = {
    method: "SUBSCRIBE",
    params: [streamName],
    id: Date.now(),
  };

  klinesWs.send(JSON.stringify(subscription));
  subscriptions.add(subscriptionKey);
  console.log(`[BinanceKlines] Subscribed to ${symbol} ${interval} candles`);
}

/**
 * Unsubscribe from klines
 */
export function unsubscribeFromKlines(symbol: string, interval: string = "1m") {
  if (!klinesWs || klinesWs.readyState !== WebSocket.OPEN) {
    return;
  }

  const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
  const subscriptionKey = `${symbol}:${interval}`;

  const subscription = {
    method: "UNSUBSCRIBE",
    params: [streamName],
    id: Date.now(),
  };

  klinesWs.send(JSON.stringify(subscription));
  subscriptions.delete(subscriptionKey);
  console.log(`[BinanceKlines] Unsubscribed from ${symbol} ${interval}`);
}

/**
 * Handle incoming klines messages from Binance
 */
function handleKlinesMessage(message: any) {
  // Handle subscription response
  if (message.result === null && message.id) {
    return;
  }

  // Handle kline data
  if (message.e === "kline") {
    const k = message.k;
    const candle: Candle = {
      symbol: message.s,
      interval: k.i,
      openTime: k.t,
      closeTime: k.T,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
      quoteAssetVolume: parseFloat(k.q),
      numberOfTrades: k.n,
      takerBuyBaseAssetVolume: parseFloat(k.V),
      takerBuyQuoteAssetVolume: parseFloat(k.Q),
      isClosed: k.x,
    };

    // Broadcast to all connected clients
    broadcastCandle(candle);
  }
}

/**
 * Broadcast candle update to all connected clients
 */
function broadcastCandle(candle: Candle) {
  const io = getWebSocket();
  if (!io) return;

  io.emit("candle_update", {
    ...candle,
    timestamp: Date.now(),
  });
}

/**
 * Get connection status
 */
export function isKlinesConnected(): boolean {
  return isConnected && klinesWs?.readyState === WebSocket.OPEN;
}

/**
 * Get all active subscriptions
 */
export function getActiveSubscriptions(): string[] {
  return Array.from(subscriptions);
}

/**
 * Disconnect from Binance klines
 */
export function disconnectBinanceKlines() {
  if (klinesWs) {
    klinesWs.close();
    klinesWs = null;
    isConnected = false;
    subscriptions.clear();
    console.log("[BinanceKlines] Disconnected");
  }
}
