import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  assistantMessages,
  auditLog,
  copyTradingRelations,
  economicEvents,
  instruments,
  kycDocuments,
  notifications,
  priceAlerts,
  referrals,
  traderProfiles,
  trades,
  tradingSignals,
  transactions,
  users,
  wallets,
  type InsertUser,
  type User,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUser(id: number, data: Partial<User>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function getUserByReferralCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.referralCode, code)).limit(1);
  return result[0];
}

// ─── Wallets ──────────────────────────────────────────────────────────────────
export async function getWalletsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wallets).where(eq(wallets.userId, userId));
}

export async function getDefaultWallet(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.isDefault, true)))
    .limit(1);
  return result[0];
}

export async function createWallet(data: {
  userId: number;
  currency: string;
  isDefault?: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(wallets).values({
    userId: data.userId,
    currency: data.currency,
    isDefault: data.isDefault ?? false,
    balance: "0",
    equity: "0",
    margin: "0",
    freeMargin: "0",
    marginLevel: "0",
    leverage: 100,
  });
}

export async function updateWalletBalance(
  walletId: number,
  balance: string,
  equity?: string,
  margin?: string
) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { balance };
  if (equity !== undefined) updateData.equity = equity;
  if (margin !== undefined) {
    updateData.margin = margin;
    const bal = parseFloat(balance);
    const mar = parseFloat(margin);
    updateData.freeMargin = String(bal - mar);
    updateData.marginLevel = mar > 0 ? String((bal / mar) * 100) : "0";
  }
  await db.update(wallets).set(updateData).where(eq(wallets.id, walletId));
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export async function getTransactionsByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

export async function createTransaction(data: {
  userId: number;
  walletId: number;
  type: "deposit" | "withdrawal" | "trade_profit" | "trade_loss" | "bonus" | "commission" | "fee" | "transfer";
  amount: string;
  currency: string;
  status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
  reference?: string;
  stripePaymentIntentId?: string;
  description?: string;
  metadata?: unknown;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(transactions).values({
    ...data,
    status: data.status ?? "pending",
    metadata: data.metadata as Record<string, unknown> | null,
  });
}

export async function updateTransactionStatus(
  id: number,
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(transactions).set({ status }).where(eq(transactions.id, id));
}

// ─── Instruments ──────────────────────────────────────────────────────────────
export async function getInstruments(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return db
      .select()
      .from(instruments)
      .where(
        and(
          eq(instruments.isActive, true),
          eq(
            instruments.category,
            category as
              | "forex"
              | "crypto"
              | "commodity"
              | "stock"
              | "index"
              | "binary"
              | "synthetic"
          )
        )
      );
  }
  return db.select().from(instruments).where(eq(instruments.isActive, true));
}

export async function getInstrumentBySymbol(symbol: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(instruments)
    .where(eq(instruments.symbol, symbol))
    .limit(1);
  return result[0];
}

// ─── Trades ───────────────────────────────────────────────────────────────────
export async function getOpenTrades(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(trades)
    .where(and(eq(trades.userId, userId), eq(trades.status, "open")))
    .orderBy(desc(trades.openedAt));
}

export async function getTradeHistory(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(trades)
    .where(and(eq(trades.userId, userId), eq(trades.status, "closed")))
    .orderBy(desc(trades.closedAt))
    .limit(limit);
}

export async function createTrade(data: {
  userId: number;
  walletId: number;
  instrumentId: number;
  symbol: string;
  type: "buy" | "sell";
  lotSize: string;
  openPrice: string;
  stopLoss?: string;
  takeProfit?: string;
  margin: string;
  leverage: number;
  copiedFromUserId?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(trades).values({
    ...data,
    status: "open",
    profit: "0",
    swap: "0",
    commission: "0",
  });
}

export async function closeTrade(
  tradeId: number,
  closePrice: string,
  profit: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(trades)
    .set({
      status: "closed",
      closePrice,
      profit,
      closedAt: new Date(),
    })
    .where(eq(trades.id, tradeId));
}

export async function updateTradeSlTp(
  tradeId: number,
  stopLoss?: string,
  takeProfit?: string
) {
  const db = await getDb();
  if (!db) return;
  const data: Record<string, unknown> = {};
  if (stopLoss !== undefined) data.stopLoss = stopLoss;
  if (takeProfit !== undefined) data.takeProfit = takeProfit;
  await db.update(trades).set(data).where(eq(trades.id, tradeId));
}

// ─── Price Alerts ─────────────────────────────────────────────────────────────
export async function getPriceAlerts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(priceAlerts)
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.isActive, true)));
}

export async function createPriceAlert(data: {
  userId: number;
  symbol: string;
  condition: "above" | "below";
  targetPrice: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(priceAlerts).values(data);
}

export async function deletePriceAlert(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(priceAlerts)
    .set({ isActive: false })
    .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, userId)));
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function getNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function createNotification(data: {
  userId: number;
  type: "margin_call" | "price_alert" | "trade_execution" | "withdrawal_update" | "kyc_update" | "system" | "copy_trade";
  title: string;
  message: string;
  metadata?: unknown;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({
    ...data,
    metadata: data.metadata as Record<string, unknown> | null,
  });
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
}

// ─── KYC ──────────────────────────────────────────────────────────────────────
export async function getKycDocuments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(kycDocuments)
    .where(eq(kycDocuments.userId, userId))
    .orderBy(desc(kycDocuments.createdAt));
}

export async function createKycDocument(data: {
  userId: number;
  documentType: "passport" | "national_id" | "drivers_license" | "utility_bill" | "bank_statement";
  documentUrl: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(kycDocuments).values(data);
}

// ─── Copy Trading ─────────────────────────────────────────────────────────────
export async function getTraderProfiles(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(traderProfiles)
    .where(and(eq(traderProfiles.isPublic, true), eq(traderProfiles.allowCopying, true)))
    .orderBy(desc(traderProfiles.monthlyReturn))
    .limit(limit);
}

export async function getTraderProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(traderProfiles)
    .where(eq(traderProfiles.userId, userId))
    .limit(1);
  return result[0];
}

export async function upsertTraderProfile(data: {
  userId: number;
  displayName: string;
  bio?: string;
  isPublic?: boolean;
  allowCopying?: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(traderProfiles)
    .values(data)
    .onDuplicateKeyUpdate({ set: data });
}

export async function getCopyRelations(followerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(copyTradingRelations)
    .where(
      and(
        eq(copyTradingRelations.followerId, followerId),
        eq(copyTradingRelations.isActive, true)
      )
    );
}

export async function createCopyRelation(data: {
  followerId: number;
  traderId: number;
  copyRatio?: string;
  maxLotSize?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(copyTradingRelations).values(data);
}

export async function stopCopyRelation(id: number, followerId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(copyTradingRelations)
    .set({ isActive: false })
    .where(
      and(
        eq(copyTradingRelations.id, id),
        eq(copyTradingRelations.followerId, followerId)
      )
    );
}

// ─── Trading Signals ──────────────────────────────────────────────────────────
export async function getTradingSignals() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(tradingSignals)
    .where(eq(tradingSignals.isActive, true))
    .orderBy(desc(tradingSignals.createdAt))
    .limit(20);
}

// ─── Economic Events ──────────────────────────────────────────────────────────
export async function getEconomicEvents(days = 7) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(economicEvents)
    .where(
      and(
        gte(economicEvents.scheduledAt, now),
        lte(economicEvents.scheduledAt, future)
      )
    )
    .orderBy(economicEvents.scheduledAt);
}

// ─── Referrals ────────────────────────────────────────────────────────────────
export async function getReferralStats(userId: number) {
  const db = await getDb();
  if (!db) return { referrals: [], totalCommission: 0 };
  const refs = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, userId));
  const totalCommission = refs.reduce(
    (sum, r) => sum + parseFloat(r.totalCommission ?? "0"),
    0
  );
  return { referrals: refs, totalCommission };
}

export async function createReferral(referrerId: number, referredUserId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(referrals).values({ referrerId, referredUserId });
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
export async function logAudit(data: {
  userId?: number;
  action: string;
  entity?: string;
  entityId?: string;
  details?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLog).values({
    ...data,
    details: data.details as Record<string, unknown> | null,
  });
}

export async function getAuditLog(userId?: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return db
      .select()
      .from(auditLog)
      .where(eq(auditLog.userId, userId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}

// ─── Assistant Messages ───────────────────────────────────────────────────────
export async function getAssistantMessages(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(assistantMessages)
    .where(eq(assistantMessages.userId, userId))
    .orderBy(assistantMessages.createdAt)
    .limit(limit);
}

export async function saveAssistantMessage(data: {
  userId: number;
  role: "user" | "assistant";
  content: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(assistantMessages).values(data);
}
