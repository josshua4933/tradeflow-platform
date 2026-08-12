import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./useAuth";

interface PriceUpdate {
  symbol: string;
  price: number;
  changePercent24h?: number;
  timestamp: number;
}

interface OrderConfirmation {
  id: number;
  symbol: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  status: string;
  timestamp: number;
}

interface TradeExecution {
  id: number;
  symbol: string;
  type: "buy" | "sell";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  status: string;
  timestamp: number;
}

interface Notification {
  type: "info" | "success" | "warning" | "error";
  title: string;
  content: string;
  timestamp: number;
}

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
  timestamp: number;
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [orderConfirmations, setOrderConfirmations] = useState<OrderConfirmation[]>([]);
  const [tradeExecutions, setTradeExecutions] = useState<TradeExecution[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [candles, setCandles] = useState<Map<string, Candle>>(new Map());
  const [marketDataErrors, setMarketDataErrors] = useState<Array<{ type: string; symbol?: string; interval?: string; message: string; timestamp: number }>>([]);
  const pendingCandleSubscriptions = useRef(new Set<string>());

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user?.id) return;

    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WebSocket] Connected");
      setIsConnected(true);

      // Authenticate user
      socket.emit("authenticate", { userId: user.id });

      // Subscribe to default symbols
      socket.emit("subscribe_prices", {
        symbols: ["EURUSD", "BTCUSD", "XAUUSD", "GBPUSD", "US500", "ETHUSD"],
      });

      // Flush candle subscriptions requested before Socket.IO finished connecting.
      pendingCandleSubscriptions.current.forEach((key) => {
        const [symbol, interval] = key.split(":");
        socket.emit("subscribe_klines", { symbol, interval });
      });
    });

    socket.on("disconnect", () => {
      console.log("[WebSocket] Disconnected");
      setIsConnected(false);
    });

    // Price updates
    socket.on("prices_update", (data: { prices: PriceUpdate[] }) => {
      setPrices((previous) => {
        const newPrices = new Map(previous);
        data.prices.forEach((price) => {
          newPrices.set(price.symbol, price);
        });
        return newPrices;
      });
    });

    socket.on("price_update", (data: PriceUpdate) => {
      setPrices((prev) => new Map(prev).set(data.symbol, data));
    });

    // Order confirmations
    socket.on("order_confirmation", (data: OrderConfirmation) => {
      setOrderConfirmations((prev) => [data, ...prev].slice(0, 50));
    });

    // Trade executions
    socket.on("trade_execution", (data: TradeExecution) => {
      setTradeExecutions((prev) => [data, ...prev].slice(0, 50));
    });

    // Notifications
    socket.on("notification", (data: Notification) => {
      setNotifications((prev) => [data, ...prev].slice(0, 50));
    });

    // Candlestick updates
    socket.on("candle_update", (data: Candle) => {
      setCandles((prev) => {
        const key = `${data.symbol}:${data.interval}`;
        return new Map(prev).set(key, data);
      });
    });

    // Market-data and transport errors
    socket.on("market_data_error", (error: { type?: string; symbol?: string; interval?: string; message?: string }) => {
      const entry = {
        type: error.type ?? "market_data",
        symbol: error.symbol,
        interval: error.interval,
        message: error.message ?? "Market data is temporarily unavailable.",
        timestamp: Date.now(),
      };
      setMarketDataErrors((previous) => [entry, ...previous].slice(0, 20));
      console.error("[WebSocket] Market data error:", entry);
    });

    socket.on("error", (error: { message?: string }) => {
      const entry = { type: "transport", message: error?.message ?? "WebSocket connection error.", timestamp: Date.now() };
      setMarketDataErrors((previous) => [entry, ...previous].slice(0, 20));
      console.error("[WebSocket] Error:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  // Subscribe to specific symbols
  const subscribePrices = useCallback((symbols: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("subscribe_prices", { symbols });
    }
  }, []);

  // Unsubscribe from symbols
  const unsubscribePrices = useCallback((symbols: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("unsubscribe_prices", { symbols });
    }
  }, []);

  const clearMarketDataErrors = useCallback((symbol?: string, interval?: string) => {
    setMarketDataErrors((previous) => previous.filter((error) => {
      if (symbol && error.symbol !== symbol) return true;
      if (interval && error.interval !== interval) return true;
      return false;
    }));
  }, []);

  // Get price for symbol
  const getPrice = useCallback((symbol: string): PriceUpdate | undefined => {
    return prices.get(symbol);
  }, [prices]);

  // Get all prices as array
  const getPricesArray = useCallback((): PriceUpdate[] => {
    return Array.from(prices.values());
  }, [prices]);

  // Subscribe to candles
  const subscribeToCandles = useCallback((symbol: string, interval: string = "1m") => {
    const key = `${symbol.toUpperCase()}:${interval}`;
    pendingCandleSubscriptions.current.add(key);

    if (socketRef.current?.connected) {
      socketRef.current.emit("subscribe_klines", {
        symbol: symbol.toUpperCase(),
        interval,
      });
    }
  }, []);

  // Get candle for symbol and interval
  const getCandle = useCallback((symbol: string, interval: string = "1m"): Candle | undefined => {
    return candles.get(`${symbol}:${interval}`);
  }, [candles]);

  return {
    isConnected,
    prices: getPricesArray(),
    getPrice,
    subscribePrices,
    unsubscribePrices,
    orderConfirmations,
    tradeExecutions,
    notifications,
    candles: Array.from(candles.values()),
    getCandle,
    subscribeToCandles,
    marketDataErrors,
    clearMarketDataErrors,
  };
}
