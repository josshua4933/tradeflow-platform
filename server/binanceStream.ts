import WebSocket from "ws";
import { broadcastPriceUpdate, getWebSocket } from "./websocket";

interface BinanceStreamPrice {
  symbol: string;
  price: number;
  changePercent24h: number;
  timestamp: number;
}

let binanceWs: WebSocket | null = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// Major crypto pairs to subscribe to
const CRYPTO_PAIRS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT",
  "SOLUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT",
  "LTCUSDT", "BCHUSDT", "TRXUSDT", "UNIUSDT", "AAVEUSDT",
];

/**
 * Initialize Binance WebSocket connection
 */
export function initializeBinanceStream() {
  if (binanceWs) {
    console.log("[BinanceStream] Already connected");
    return;
  }

  console.log("[BinanceStream] Connecting to Binance WebSocket...");

  try {
    binanceWs = new WebSocket("wss://data-stream.binance.vision/ws");

    binanceWs.on("open", () => {
      console.log("[BinanceStream] Connected to Binance");
      isConnected = true;
      reconnectAttempts = 0;

      // Subscribe to all crypto pairs
      subscribeToCryptoPairs();
    });

    binanceWs.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleBinanceMessage(message);
      } catch (error) {
        console.error("[BinanceStream] Error parsing message:", error);
      }
    });

    binanceWs.on("error", (error: Error) => {
      console.error("[BinanceStream] WebSocket error:", error);
      isConnected = false;
    });

    binanceWs.on("close", (code, reason) => {
      console.log(`[BinanceStream] Disconnected from Binance (code ${code}, reason ${reason.toString()})`);
      isConnected = false;
      binanceWs = null;

      // Attempt to reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(
          `[BinanceStream] Reconnecting... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
        );
        setTimeout(() => {
          initializeBinanceStream();
        }, RECONNECT_DELAY);
      } else {
        console.error("[BinanceStream] Max reconnection attempts reached");
      }
    });
  } catch (error) {
    console.error("[BinanceStream] Failed to initialize:", error);
    isConnected = false;
  }
}

/**
 * Subscribe to crypto pairs
 */
function subscribeToCryptoPairs() {
  if (!binanceWs || binanceWs.readyState !== WebSocket.OPEN) {
    console.error("[BinanceStream] WebSocket not ready");
    return;
  }

  // Subscribe to 24h ticker for each pair
  const streams = CRYPTO_PAIRS.map((pair) => `${pair.toLowerCase()}@ticker`).join("/");

  const subscription = {
    method: "SUBSCRIBE",
    params: CRYPTO_PAIRS.map((pair) => `${pair.toLowerCase()}@ticker`),
    id: 1,
  };

  binanceWs.send(JSON.stringify(subscription));
  console.log(`[BinanceStream] Subscribed to ${CRYPTO_PAIRS.length} crypto pairs`);
}

/**
 * Handle incoming Binance messages
 */
function handleBinanceMessage(message: any) {
  // Handle subscription response
  if (message.result === null && message.id) {
    console.log("[BinanceStream] Subscription confirmed");
    return;
  }

  // Handle ticker data
  if (message.e === "24hrTicker") {
    const price: BinanceStreamPrice = {
      symbol: message.s,
      price: parseFloat(message.c), // Current price
      changePercent24h: parseFloat(message.P), // 24h change percent
      timestamp: Date.now(),
    };

    // Broadcast to all connected clients
    broadcastPriceUpdate(price.symbol, price);
  }
}

/**
 * Get connection status
 */
export function isBinanceStreamConnected(): boolean {
  return isConnected && binanceWs?.readyState === WebSocket.OPEN;
}

/**
 * Disconnect from Binance
 */
export function disconnectBinanceStream() {
  if (binanceWs) {
    binanceWs.close();
    binanceWs = null;
    isConnected = false;
    console.log("[BinanceStream] Disconnected");
  }
}

/**
 * Get list of subscribed pairs
 */
export function getSubscribedPairs(): string[] {
  return CRYPTO_PAIRS;
}

/**
 * Add custom pair to subscription
 */
export function addCustomPair(pair: string) {
  if (!binanceWs || binanceWs.readyState !== WebSocket.OPEN) {
    console.error("[BinanceStream] WebSocket not ready");
    return;
  }

  const subscription = {
    method: "SUBSCRIBE",
    params: [`${pair.toLowerCase()}@ticker`],
    id: 2,
  };

  binanceWs.send(JSON.stringify(subscription));
  console.log(`[BinanceStream] Subscribed to ${pair}`);
}
