import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getCachedPrices } from "./binance";

let io: SocketIOServer | null = null;
const activeSessions = new Map<string, { userId: number; symbol: string[] }>();

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? [] : "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Handle user authentication
    socket.on("authenticate", (data: { userId: number }) => {
      activeSessions.set(socket.id, { userId: data.userId, symbol: [] });
      console.log(`[WebSocket] User ${data.userId} authenticated`);
    });

    // Subscribe to price updates for specific symbols
    socket.on("subscribe_prices", async (data: { symbols: string[] }) => {
      const session = activeSessions.get(socket.id);
      if (!session) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      session.symbol = data.symbols;
      console.log(`[WebSocket] User subscribed to: ${data.symbols.join(", ")}`);

      // Send initial prices
      try {
        const prices = await getCachedPrices(data.symbols);
        socket.emit("prices_update", { prices, timestamp: Date.now() });
      } catch (error) {
        console.error("Failed to fetch initial prices:", error);
      }
    });

    // Subscribe to Binance candlestick updates for the Trading Terminal.
    socket.on("subscribe_klines", async (data: { symbol: string; interval?: string }) => {
      const session = activeSessions.get(socket.id);
      if (!session) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      try {
        const { subscribeToKlines, isKlinesConnected } = await import("./binanceKlines");
        const subscribed = subscribeToKlines(data.symbol, data.interval ?? "1m");
        if (!subscribed) {
          const { getKlineSubscriptionErrorMessage } = await import("./websocket.helpers");
          socket.emit("market_data_error", {
            type: "klines",
            symbol: data.symbol,
            interval: data.interval ?? "1m",
            message: getKlineSubscriptionErrorMessage(isKlinesConnected()),
          });
        }
      } catch (error) {
        console.error("[WebSocket] Failed to subscribe to klines:", error);
        socket.emit("market_data_error", {
          type: "klines",
          symbol: data.symbol,
          interval: data.interval ?? "1m",
          message: "Unable to subscribe to candle data.",
        });
      }
    });

    // Unsubscribe from price updates
    socket.on("unsubscribe_prices", (data: { symbols: string[] }) => {
      const session = activeSessions.get(socket.id);
      if (session) {
        session.symbol = session.symbol.filter((s) => !data.symbols.includes(s));
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      activeSessions.delete(socket.id);
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`[WebSocket] Error: ${error}`);
    });
  });

  return io;
}

/**
 * Get WebSocket server instance
 */
export function getWebSocket(): SocketIOServer | null {
  return io;
}

/**
 * Broadcast price update to all connected clients subscribed to a symbol
 */
export async function broadcastPriceUpdate(symbol: string, price: any) {
  if (!io) return;

  const normalizedPrice = typeof price === "number" ? price : Number(price?.price ?? price?.lastPrice);
  if (!Number.isFinite(normalizedPrice)) return;

  io.emit("price_update", {
    symbol,
    price: normalizedPrice,
    changePercent24h: Number(price?.changePercent24h ?? price?.priceChangePercent ?? 0),
    timestamp: Date.now(),
  });
}

/**
 * Broadcast order confirmation to a specific user
 */
export function broadcastOrderConfirmation(userId: number, order: any) {
  if (!io) return;

  io.emit("order_confirmation", {
    userId,
    order,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast trade execution to a specific user
 */
export function broadcastTradeExecution(userId: number, trade: any) {
  if (!io) return;

  io.emit("trade_execution", {
    userId,
    trade,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast withdrawal confirmation
 */
export function broadcastWithdrawalConfirmation(userId: number, withdrawal: any) {
  if (!io) return;

  io.emit("withdrawal_confirmation", {
    userId,
    withdrawal,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast deposit confirmation
 */
export function broadcastDepositConfirmation(userId: number, deposit: any) {
  if (!io) return;

  io.emit("deposit_confirmation", {
    userId,
    deposit,
    timestamp: Date.now(),
  });
}

/**
 * Start price streaming service
 */
export function startPriceStreaming() {
  if (!io) return;

  const symbols = ["EURUSD", "BTCUSD", "XAUUSD", "GBPUSD", "US500", "ETHUSD"];

  // Stream prices every 2 seconds
  setInterval(async () => {
    try {
      const prices = await getCachedPrices(symbols);
      prices.forEach((price) => {
        broadcastPriceUpdate(price.symbol, price);
      });
    } catch (error) {
      console.error("Failed to stream prices:", error);
    }
  }, 2000);

  console.log("[WebSocket] Price streaming started");
}
