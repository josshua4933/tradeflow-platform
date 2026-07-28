import React, { createContext, useContext } from "react";
import { useWebSocket } from "@/_core/hooks/useWebSocket";

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

interface WebSocketContextType {
  isConnected: boolean;
  prices: PriceUpdate[];
  getPrice: (symbol: string) => PriceUpdate | undefined;
  subscribePrices: (symbols: string[]) => void;
  unsubscribePrices: (symbols: string[]) => void;
  orderConfirmations: OrderConfirmation[];
  tradeExecutions: TradeExecution[];
  notifications: Notification[];
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const websocket = useWebSocket();

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketContext must be used within WebSocketProvider");
  }
  return context;
}
