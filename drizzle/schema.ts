import {
  bigint,
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // 2FA
  twoFactorSecret: varchar("twoFactorSecret", { length: 128 }),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  // KYC
  kycStatus: mysqlEnum("kycStatus", ["pending", "submitted", "approved", "rejected"]).default("pending").notNull(),
  kycSubmittedAt: timestamp("kycSubmittedAt"),
  kycReviewedAt: timestamp("kycReviewedAt"),
  kycNotes: text("kycNotes"),
  // Profile
  phone: varchar("phone", { length: 32 }),
  country: varchar("country", { length: 64 }),
  dateOfBirth: varchar("dateOfBirth", { length: 16 }),
  address: text("address"),
  preferredLanguage: varchar("preferredLanguage", { length: 8 }).default("en"),
  accountType: mysqlEnum("accountType", ["standard", "professional"]).default("standard").notNull(),
  // Referral
  referralCode: varchar("referralCode", { length: 16 }).unique(),
  referredBy: int("referredBy"),
  // Notifications
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  inAppNotifications: boolean("inAppNotifications").default(true).notNull(),
  // Terms
  termsAcceptedAt: timestamp("termsAcceptedAt"),
  riskDisclosureAcceptedAt: timestamp("riskDisclosureAcceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── KYC Documents ────────────────────────────────────────────────────────────
export const kycDocuments = mysqlTable("kyc_documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentType: mysqlEnum("documentType", ["passport", "national_id", "drivers_license", "utility_bill", "bank_statement"]).notNull(),
  documentUrl: text("documentUrl").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Instruments ──────────────────────────────────────────────────────────────
export const instruments = mysqlTable("instruments", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 32 }).notNull().unique(),
  name: text("name").notNull(),
  category: mysqlEnum("category", ["forex", "crypto", "commodity", "stock", "index", "binary", "synthetic"]).notNull(),
  baseCurrency: varchar("baseCurrency", { length: 8 }),
  quoteCurrency: varchar("quoteCurrency", { length: 8 }),
  pipSize: decimal("pipSize", { precision: 18, scale: 8 }).default("0.00010"),
  contractSize: decimal("contractSize", { precision: 18, scale: 4 }).default("100000"),
  minLot: decimal("minLot", { precision: 10, scale: 4 }).default("0.01"),
  maxLot: decimal("maxLot", { precision: 10, scale: 2 }).default("100"),
  maxLeverage: int("maxLeverage").default(100),
  marginRequirement: decimal("marginRequirement", { precision: 8, scale: 4 }).default("1.0000"),
  tradingHoursStart: varchar("tradingHoursStart", { length: 8 }).default("00:00"),
  tradingHoursEnd: varchar("tradingHoursEnd", { length: 8 }).default("23:59"),
  tradingDays: varchar("tradingDays", { length: 32 }).default("1,2,3,4,5"),
  isActive: boolean("isActive").default(true).notNull(),
  spread: decimal("spread", { precision: 10, scale: 5 }).default("0.00020"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Wallets ──────────────────────────────────────────────────────────────────
export const wallets = mysqlTable("wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  currency: varchar("currency", { length: 8 }).notNull(),
  balance: decimal("balance", { precision: 20, scale: 8 }).default("0").notNull(),
  equity: decimal("equity", { precision: 20, scale: 8 }).default("0").notNull(),
  margin: decimal("margin", { precision: 20, scale: 8 }).default("0").notNull(),
  freeMargin: decimal("freeMargin", { precision: 20, scale: 8 }).default("0").notNull(),
  marginLevel: decimal("marginLevel", { precision: 10, scale: 2 }).default("0").notNull(),
  leverage: int("leverage").default(100).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  walletId: int("walletId").notNull(),
  type: mysqlEnum("type", ["deposit", "withdrawal", "trade_profit", "trade_loss", "bonus", "commission", "fee", "transfer"]).notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 8 }).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "cancelled"]).default("pending").notNull(),
  reference: varchar("reference", { length: 128 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  description: text("description"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Trades / Positions ───────────────────────────────────────────────────────
export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  walletId: int("walletId").notNull(),
  instrumentId: int("instrumentId").notNull(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  type: mysqlEnum("type", ["buy", "sell", "buy_limit", "sell_limit", "buy_stop", "sell_stop"]).notNull(),
  status: mysqlEnum("status", ["open", "closed", "pending", "cancelled"]).default("open").notNull(),
  lotSize: decimal("lotSize", { precision: 10, scale: 4 }).notNull(),
  openPrice: decimal("openPrice", { precision: 18, scale: 8 }).notNull(),
  closePrice: decimal("closePrice", { precision: 18, scale: 8 }),
  stopLoss: decimal("stopLoss", { precision: 18, scale: 8 }),
  takeProfit: decimal("takeProfit", { precision: 18, scale: 8 }),
  margin: decimal("margin", { precision: 20, scale: 8 }).notNull(),
  profit: decimal("profit", { precision: 20, scale: 8 }).default("0"),
  swap: decimal("swap", { precision: 20, scale: 8 }).default("0"),
  commission: decimal("commission", { precision: 20, scale: 8 }).default("0"),
  leverage: int("leverage").default(100),
  // Copy trading
  copiedFromTradeId: int("copiedFromTradeId"),
  copiedFromUserId: int("copiedFromUserId"),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  expiresAt: timestamp("expiresAt"),
});

// ─── Price Alerts ─────────────────────────────────────────────────────────────
export const priceAlerts = mysqlTable("price_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  condition: mysqlEnum("condition", ["above", "below"]).notNull(),
  targetPrice: decimal("targetPrice", { precision: 18, scale: 8 }).notNull(),
  isTriggered: boolean("isTriggered").default(false).notNull(),
  triggeredAt: timestamp("triggeredAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["margin_call", "price_alert", "trade_execution", "withdrawal_update", "kyc_update", "system", "copy_trade"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Copy Trading ─────────────────────────────────────────────────────────────
export const copyTradingRelations = mysqlTable("copy_trading_relations", {
  id: int("id").autoincrement().primaryKey(),
  followerId: int("followerId").notNull(),
  traderId: int("traderId").notNull(),
  copyRatio: decimal("copyRatio", { precision: 5, scale: 2 }).default("1.00"),
  maxLotSize: decimal("maxLotSize", { precision: 10, scale: 4 }).default("1.0000"),
  isActive: boolean("isActive").default(true).notNull(),
  totalCopied: int("totalCopied").default(0),
  totalProfit: decimal("totalProfit", { precision: 20, scale: 8 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Trader Profiles (for leaderboard) ───────────────────────────────────────
export const traderProfiles = mysqlTable("trader_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  displayName: varchar("displayName", { length: 64 }).notNull(),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  isPublic: boolean("isPublic").default(false).notNull(),
  allowCopying: boolean("allowCopying").default(false).notNull(),
  totalTrades: int("totalTrades").default(0),
  winRate: decimal("winRate", { precision: 5, scale: 2 }).default("0"),
  totalProfit: decimal("totalProfit", { precision: 20, scale: 8 }).default("0"),
  monthlyReturn: decimal("monthlyReturn", { precision: 8, scale: 4 }).default("0"),
  maxDrawdown: decimal("maxDrawdown", { precision: 8, scale: 4 }).default("0"),
  followersCount: int("followersCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Trading Signals ──────────────────────────────────────────────────────────
export const tradingSignals = mysqlTable("trading_signals", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  direction: mysqlEnum("direction", ["buy", "sell", "neutral"]).notNull(),
  entryPrice: decimal("entryPrice", { precision: 18, scale: 8 }),
  stopLoss: decimal("stopLoss", { precision: 18, scale: 8 }),
  takeProfit: decimal("takeProfit", { precision: 18, scale: 8 }),
  confidence: int("confidence").default(50),
  analysis: text("analysis"),
  source: varchar("source", { length: 64 }).default("ai"),
  isActive: boolean("isActive").default(true).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Economic Calendar ────────────────────────────────────────────────────────
export const economicEvents = mysqlTable("economic_events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  country: varchar("country", { length: 4 }).notNull(),
  currency: varchar("currency", { length: 8 }),
  impact: mysqlEnum("impact", ["low", "medium", "high"]).default("medium").notNull(),
  actual: varchar("actual", { length: 32 }),
  forecast: varchar("forecast", { length: 32 }),
  previous: varchar("previous", { length: 32 }),
  scheduledAt: timestamp("scheduledAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Referrals ────────────────────────────────────────────────────────────────
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),
  referredUserId: int("referredUserId").notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 4 }).default("0.1000"),
  totalCommission: decimal("totalCommission", { precision: 20, scale: 8 }).default("0"),
  status: mysqlEnum("status", ["pending", "active", "paid"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Audit Log ────────────────────────────────────────────────────────────────
export const auditLog = mysqlTable("audit_log", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 128 }).notNull(),
  entity: varchar("entity", { length: 64 }),
  entityId: varchar("entityId", { length: 64 }),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── LLM Chat History ─────────────────────────────────────────────────────────
export const assistantMessages = mysqlTable("assistant_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
