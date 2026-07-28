import {
  broadcastOrderConfirmation,
  broadcastTradeExecution,
  broadcastWithdrawalConfirmation,
  broadcastDepositConfirmation,
  getWebSocket,
} from "./websocket";

/**
 * Emit order confirmation event
 */
export function emitOrderConfirmation(userId: number, order: {
  id: number;
  symbol: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  status: string;
  timestamp: number;
}) {
  broadcastOrderConfirmation(userId, {
    ...order,
    event: "order_confirmed",
    timestamp: Date.now(),
  });

  console.log(`[WebSocket] Order confirmed for user ${userId}: ${order.symbol}`);
}

/**
 * Emit trade execution event
 */
export function emitTradeExecution(userId: number, trade: {
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
}) {
  broadcastTradeExecution(userId, {
    ...trade,
    event: "trade_executed",
    timestamp: Date.now(),
  });

  console.log(`[WebSocket] Trade executed for user ${userId}: ${trade.symbol} ${trade.type}`);
}

/**
 * Emit withdrawal confirmation event
 */
export function emitWithdrawalConfirmation(userId: number, withdrawal: {
  id: number;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  timestamp: number;
}) {
  broadcastWithdrawalConfirmation(userId, {
    ...withdrawal,
    event: "withdrawal_confirmed",
    timestamp: Date.now(),
  });

  console.log(`[WebSocket] Withdrawal confirmed for user ${userId}: ${withdrawal.currency} ${withdrawal.amount}`);
}

/**
 * Emit deposit confirmation event
 */
export function emitDepositConfirmation(userId: number, deposit: {
  id: number;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  timestamp: number;
}) {
  broadcastDepositConfirmation(userId, {
    ...deposit,
    event: "deposit_confirmed",
    timestamp: Date.now(),
  });

  console.log(`[WebSocket] Deposit confirmed for user ${userId}: ${deposit.currency} ${deposit.amount}`);
}

/**
 * Broadcast notification to all connected clients
 */
export function broadcastNotification(message: {
  type: "info" | "success" | "warning" | "error";
  title: string;
  content: string;
  userId?: number;
}) {
  const io = getWebSocket();
  if (!io) return;

  if (message.userId) {
    // Send to specific user
    io.emit("notification", {
      ...message,
      timestamp: Date.now(),
    });
  } else {
    // Broadcast to all
    io.emit("notification", {
      ...message,
      timestamp: Date.now(),
    });
  }
}

/**
 * Emit price alert triggered
 */
export function emitPriceAlert(userId: number, alert: {
  id: number;
  symbol: string;
  triggerPrice: number;
  currentPrice: number;
  condition: "above" | "below";
  timestamp: number;
}) {
  const io = getWebSocket();
  if (!io) return;

  io.emit("price_alert", {
    ...alert,
    userId,
    event: "price_alert_triggered",
    timestamp: Date.now(),
  });

  console.log(`[WebSocket] Price alert triggered for user ${userId}: ${alert.symbol}`);
}

/**
 * Emit margin call warning
 */
export function emitMarginCall(userId: number, marginData: {
  currentMargin: number;
  requiredMargin: number;
  marginLevel: number;
  timestamp: number;
}) {
  const io = getWebSocket();
  if (!io) return;

  io.emit("margin_call", {
    ...marginData,
    userId,
    event: "margin_call_warning",
    timestamp: Date.now(),
  });

  console.log(`[WebSocket] Margin call warning for user ${userId}: margin level ${marginData.marginLevel}%`);
}
