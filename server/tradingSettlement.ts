import {
  closeTrade as persistCloseTrade,
  createNotification,
  createTransaction,
  getDefaultWallet,
  getInstrumentBySymbol,
  getOpenTrades,
  logAudit,
  updateWalletBalance,
} from "./db";
import { getCurrentPrice } from "./routers/market";
import { shouldLiquidate } from "./tradingRiskPolicy";

type PositionType = "buy" | "sell" | string;

export type SettlementTrade = {
  id: number;
  userId: number;
  walletId: number;
  symbol: string;
  type: PositionType;
  lotSize: string | number;
  openPrice: string | number;
  margin: string | number;
  stopLoss?: string | number | null;
  takeProfit?: string | number | null;
};

export type SettlementReason = "manual" | "stop_loss" | "take_profit" | "liquidation";

export type AccountMetrics = {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  unrealizedPnl: number;
};

function numberValue(value: string | number | null | undefined, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function isBuy(type: PositionType) {
  return type === "buy";
}

export function getExecutableClosePrice(type: PositionType, bid: number, ask: number) {
  return isBuy(type) ? bid : ask;
}

export function calculateRealizedPnl(
  trade: Pick<SettlementTrade, "type" | "lotSize" | "openPrice">,
  closePrice: number,
  contractSize: number
) {
  const priceDelta = closePrice - numberValue(trade.openPrice);
  const direction = isBuy(trade.type) ? 1 : -1;
  return roundMoney(priceDelta * numberValue(trade.lotSize) * contractSize * direction);
}

export function calculateUnrealizedPnl(
  trade: Pick<SettlementTrade, "type" | "lotSize" | "openPrice">,
  currentPrice: number,
  contractSize: number
) {
  return calculateRealizedPnl(trade, currentPrice, contractSize);
}

export function getTriggeredCloseReason(
  trade: Pick<SettlementTrade, "type" | "stopLoss" | "takeProfit">,
  executableClosePrice: number
): Exclude<SettlementReason, "manual" | "liquidation"> | null {
  const stopLoss = numberValue(trade.stopLoss, Number.NaN);
  const takeProfit = numberValue(trade.takeProfit, Number.NaN);

  if (isBuy(trade.type)) {
    if (Number.isFinite(stopLoss) && executableClosePrice <= stopLoss) return "stop_loss";
    if (Number.isFinite(takeProfit) && executableClosePrice >= takeProfit) return "take_profit";
  } else {
    if (Number.isFinite(stopLoss) && executableClosePrice >= stopLoss) return "stop_loss";
    if (Number.isFinite(takeProfit) && executableClosePrice <= takeProfit) return "take_profit";
  }

  return null;
}

async function getContractSize(symbol: string) {
  const instrument = await getInstrumentBySymbol(symbol);
  return numberValue(instrument?.contractSize, 100000);
}

export async function calculateAccountMetrics(
  userId: number,
  balanceOverride?: number,
  tradesOverride?: SettlementTrade[]
): Promise<AccountMetrics> {
  const wallet = await getDefaultWallet(userId);
  const balance = balanceOverride ?? numberValue(wallet?.balance);
  const openTrades = tradesOverride ?? (await getOpenTrades(userId) as SettlementTrade[]);
  let unrealizedPnl = 0;
  let margin = 0;

  for (const trade of openTrades) {
    const { price } = getCurrentPrice(trade.symbol);
    const contractSize = await getContractSize(trade.symbol);
    unrealizedPnl += calculateUnrealizedPnl(trade, price, contractSize);
    margin += numberValue(trade.margin);
  }

  const roundedUnrealized = roundMoney(unrealizedPnl);
  const roundedMargin = roundMoney(margin);
  const equity = roundMoney(balance + roundedUnrealized);
  const freeMargin = roundMoney(equity - roundedMargin);
  const marginLevel = roundedMargin > 0 ? roundMoney((equity / roundedMargin) * 100) : 0;

  return {
    balance: roundMoney(balance),
    equity,
    margin: roundedMargin,
    freeMargin,
    marginLevel,
    unrealizedPnl: roundedUnrealized,
  };
}

export async function settleTradeForUser({
  userId,
  trade,
  closePrice,
  reason = "manual",
}: {
  userId: number;
  trade: SettlementTrade;
  closePrice?: number;
  reason?: SettlementReason;
}) {
  const quote = getCurrentPrice(trade.symbol);
  const executableClosePrice = closePrice ?? getExecutableClosePrice(trade.type, quote.bid, quote.ask);
  const contractSize = await getContractSize(trade.symbol);
  const pnl = calculateRealizedPnl(trade, executableClosePrice, contractSize);
  const didClose = await persistCloseTrade(trade.id, executableClosePrice.toString(), pnl.toString());

  // A conditional status update can lose a race with another request. In that case,
  // do not credit the wallet twice or create duplicate settlement transactions.
  if (didClose === false) {
    return { closed: false, closePrice: executableClosePrice, pnl, reason };
  }

  const wallet = await getDefaultWallet(userId);
  let account: AccountMetrics | undefined;
  if (wallet) {
    const currentBalance = numberValue(wallet.balance);
    const newBalance = Math.max(0, roundMoney(currentBalance + pnl));
    const remainingTrades = await getOpenTrades(userId) as SettlementTrade[];
    account = await calculateAccountMetrics(userId, newBalance, remainingTrades);

    await updateWalletBalance(
      wallet.id,
      newBalance.toFixed(2),
      account.equity.toFixed(2),
      account.margin.toFixed(2)
    );

    await createTransaction({
      userId,
      walletId: wallet.id,
      type: pnl >= 0 ? "trade_profit" : "trade_loss",
      amount: Math.abs(pnl).toFixed(2),
      currency: wallet.currency,
      status: "completed",
      description: `${reason.replace("_", " ")} close: ${trade.symbol} ${trade.type} ${trade.lotSize} lots`,
      metadata: { reason, closePrice: executableClosePrice, realizedPnl: pnl },
    });
  }

  await createNotification({
    userId,
    type: "trade_execution",
    title: reason === "liquidation" ? `Position Liquidated: ${trade.symbol}` : `Trade Closed: ${trade.symbol}`,
    message: `${trade.type.toUpperCase()} ${trade.lotSize} lots of ${trade.symbol} closed at ${executableClosePrice.toFixed(5)}. P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}${reason === "manual" ? "" : ` (${reason.replace("_", " ")})`}`,
    metadata: { symbol: trade.symbol, pnl, closePrice: executableClosePrice, reason },
  });

  await logAudit({
    userId,
    action: reason === "liquidation" ? "trade.liquidate" : "trade.close",
    entity: "trade",
    entityId: String(trade.id),
    details: { symbol: trade.symbol, closePrice: executableClosePrice, pnl, reason },
  });

  return { closed: true, closePrice: executableClosePrice, pnl, reason, account };
}

export async function reconcileWalletForOpenPositions(
  userId: number,
  tradesOverride?: SettlementTrade[]
) {
  const wallet = await getDefaultWallet(userId);
  if (!wallet) return undefined;

  const openTrades = tradesOverride ?? (await getOpenTrades(userId) as SettlementTrade[]);
  const account = await calculateAccountMetrics(userId, numberValue(wallet.balance), openTrades);
  const storedEquity = numberValue(wallet.equity);
  const storedMargin = numberValue(wallet.margin);
  const storedFreeMargin = numberValue(wallet.freeMargin);
  const storedMarginLevel = numberValue(wallet.marginLevel);

  if (
    storedEquity !== account.equity ||
    storedMargin !== account.margin ||
    storedFreeMargin !== account.freeMargin ||
    storedMarginLevel !== account.marginLevel
  ) {
    await updateWalletBalance(
      wallet.id,
      numberValue(wallet.balance).toFixed(2),
      account.equity.toFixed(2),
      account.margin.toFixed(2)
    );
  }

  return account;
}

export async function settleTriggeredPositions(userId: number) {
  const openTrades = await getOpenTrades(userId) as SettlementTrade[];
  const closed: Array<{ tradeId: number; reason: SettlementReason; pnl: number }> = [];

  for (const trade of openTrades) {
    const quote = getCurrentPrice(trade.symbol);
    const closePrice = getExecutableClosePrice(trade.type, quote.bid, quote.ask);
    const reason = getTriggeredCloseReason(trade, closePrice);
    if (!reason) continue;

    const result = await settleTradeForUser({ userId, trade, closePrice, reason });
    if (result.closed) closed.push({ tradeId: trade.id, reason, pnl: result.pnl });
  }

  return { closed, remainingTrades: await getOpenTrades(userId) as SettlementTrade[] };
}

export async function settleAccountRisk(userId: number) {
  const triggerResult = await settleTriggeredPositions(userId);
  let remainingTrades = triggerResult.remainingTrades;
  const account = await reconcileWalletForOpenPositions(userId, remainingTrades) ?? {
    balance: 0,
    equity: 0,
    margin: 0,
    freeMargin: 0,
    marginLevel: 0,
    unrealizedPnl: 0,
  };
  const shouldLiquidateNow = remainingTrades.length > 0 && shouldLiquidate(account);

  const liquidated = [...triggerResult.closed];
  if (shouldLiquidateNow) {
    for (const trade of remainingTrades) {
      const result = await settleTradeForUser({ userId, trade, reason: "liquidation" });
      if (result.closed) liquidated.push({ tradeId: trade.id, reason: "liquidation", pnl: result.pnl });
    }
    remainingTrades = await getOpenTrades(userId) as SettlementTrade[];
  }

  const finalAccount = await reconcileWalletForOpenPositions(userId, remainingTrades) ?? account;

  return {
    closed: liquidated,
    remainingTrades,
    account: finalAccount,
    wasLiquidated: liquidated.some((trade) => trade.reason === "liquidation"),
  };
}
