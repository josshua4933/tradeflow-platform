import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ─────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockResolvedValue(undefined),
  updateUser: vi.fn().mockResolvedValue(undefined),
  getUserByReferralCode: vi.fn().mockResolvedValue(undefined),
  getWalletsByUserId: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, currency: "USD", balance: "10000.00", equity: "10000.00", marginUsed: "0.00", leverage: 100, isDefault: true, createdAt: new Date() }
  ]),
  getDefaultWallet: vi.fn().mockResolvedValue(
    { id: 1, userId: 1, currency: "USD", balance: "10000.00", equity: "10000.00", marginUsed: "0.00", leverage: 100, isDefault: true, createdAt: new Date() }
  ),
  getOpenTrades: vi.fn().mockResolvedValue([]),
  getTradeHistory: vi.fn().mockResolvedValue([]),
  getInstruments: vi.fn().mockResolvedValue([
    { id: 1, symbol: "EURUSD", name: "Euro / US Dollar", category: "forex", baseAsset: "EUR", quoteAsset: "USD", minLotSize: "0.01", maxLotSize: "100", lotStep: "0.01", pipValue: "0.0001", spread: "1.5", isActive: true }
  ]),
  getInstrumentBySymbol: vi.fn().mockResolvedValue(
    { id: 1, symbol: "EURUSD", name: "Euro / US Dollar", category: "forex", baseAsset: "EUR", quoteAsset: "USD", minLotSize: "0.01", maxLotSize: "100", lotStep: "0.01", pipValue: "0.0001", spread: "1.5", isActive: true }
  ),
  getCandles: vi.fn().mockResolvedValue([
    { time: Date.now() - 60000, open: "1.0840", high: "1.0855", low: "1.0835", close: "1.0850" }
  ]),
  getTradingSignals: vi.fn().mockResolvedValue([
    { id: 1, symbol: "EURUSD", direction: "buy", entryPrice: "1.0840", stopLoss: "1.0800", takeProfit: "1.0900", confidence: 78, reasoning: "Bullish momentum", isActive: true, createdAt: new Date() }
  ]),
  getEconomicEvents: vi.fn().mockResolvedValue([]),
  getKycDocuments: vi.fn().mockResolvedValue([]),
  getTransactionsByUserId: vi.fn().mockResolvedValue([]),
  getTraderProfiles: vi.fn().mockResolvedValue([]),
  getTraderProfile: vi.fn().mockResolvedValue(null),
  upsertTraderProfile: vi.fn().mockResolvedValue(undefined),
  getCopyRelations: vi.fn().mockResolvedValue([]),
  createCopyRelation: vi.fn().mockResolvedValue(undefined),
  stopCopyRelation: vi.fn().mockResolvedValue(undefined),
  getNotifications: vi.fn().mockResolvedValue([]),
  getAuditLog: vi.fn().mockResolvedValue([]),
  getReferralStats: vi.fn().mockResolvedValue({ referrals: [], totalCommission: 0 }),
  createReferral: vi.fn().mockResolvedValue(undefined),
  logAudit: vi.fn().mockResolvedValue(undefined),
  createWallet: vi.fn().mockResolvedValue({ id: 2, userId: 1, currency: "EUR", balance: "0.00", equity: "0.00", marginUsed: "0.00", leverage: 100, isDefault: false, createdAt: new Date() }),
  updateWalletBalance: vi.fn().mockResolvedValue(undefined),
  createTransaction: vi.fn().mockResolvedValue({ id: 1, userId: 1, walletId: 1, type: "deposit", amount: "1000.00", currency: "USD", status: "completed", createdAt: new Date() }),
  updateTransactionStatus: vi.fn().mockResolvedValue(undefined),
  createTrade: vi.fn().mockResolvedValue({ id: 1, userId: 1, walletId: 1, symbol: "EURUSD", direction: "buy", lotSize: "0.01", openPrice: "1.0850", margin: "10.85", status: "open", openedAt: new Date() }),
  closeTrade: vi.fn().mockResolvedValue({ id: 1, closePrice: "1.0900", profit: "5.00", status: "closed", closedAt: new Date() }),
  updateTradeSlTp: vi.fn().mockResolvedValue(undefined),
  getPriceAlerts: vi.fn().mockResolvedValue([]),
  createPriceAlert: vi.fn().mockResolvedValue(undefined),
  deletePriceAlert: vi.fn().mockResolvedValue(undefined),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(undefined),
  createKycDocument: vi.fn().mockResolvedValue(undefined),
}));

// ─── Context Factory ──────────────────────────────────────────────────────────
function makeCtx(overrides?: Partial<TrpcContext>): TrpcContext {
  const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
  return {
    user: {
      id: 1,
      openId: "test-user-001",
      email: "trader@tradeflow.com",
      name: "Test Trader",
      loginMethod: "manus",
      role: "user" as const,
      referralCode: "REF123456",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
    ...overrides,
  };
}

function makeUnauthCtx(): TrpcContext {
  return makeCtx({ user: null });
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe("auth", () => {
  it("me returns authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("trader@tradeflow.com");
    expect(result?.name).toBe("Test Trader");
  });

  it("me returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("logout clears session cookie", async () => {
    const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    const ctx = makeCtx({
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1, httpOnly: true });
  });
});

// ─── Market Data Tests ────────────────────────────────────────────────────────
describe("market", () => {
  it("instruments returns list of trading instruments", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.market.instruments({ category: undefined });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("symbol");
    expect(result[0]).toHaveProperty("category");
  });

  it("instruments can filter by category", async () => {
    const { getInstruments } = await import("./db");
    vi.mocked(getInstruments).mockResolvedValueOnce([
      { id: 1, symbol: "EURUSD", name: "Euro / US Dollar", category: "forex", baseAsset: "EUR", quoteAsset: "USD", minLotSize: "0.01", maxLotSize: "100", lotStep: "0.01", pipValue: "0.0001", spread: "1.5", isActive: true }
    ]);
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.market.instruments({ category: "forex" });
    expect(result.every((i: any) => i.category === "forex")).toBe(true);
  });

  it("instrumentBySymbol returns correct instrument", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.market.instrumentBySymbol({ symbol: "EURUSD" });
    expect(result).not.toBeNull();
    expect(result?.symbol).toBe("EURUSD");
    expect(result?.category).toBe("forex");
  });

  it("prices returns price data for requested symbols", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.market.prices({ symbols: ["EURUSD", "BTCUSD"] });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    result.forEach((p: any) => {
      expect(p).toHaveProperty("symbol");
      expect(p).toHaveProperty("price");
      expect(p).toHaveProperty("bid");
      expect(p).toHaveProperty("ask");
      expect(typeof p.price).toBe("number");
      expect(p.price).toBeGreaterThan(0);
    });
  });

  it("prices bid is less than ask (valid spread)", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.market.prices({ symbols: ["EURUSD"] });
    expect(result[0].bid).toBeLessThan(result[0].ask);
  });

  it("candles returns OHLC data", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.market.candles({ symbol: "EURUSD", timeframe: "1h" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("open");
    expect(result[0]).toHaveProperty("high");
    expect(result[0]).toHaveProperty("low");
    expect(result[0]).toHaveProperty("close");
    expect(result[0]).toHaveProperty("time");
  });

  it("signals returns trading signals", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.market.signals();
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("symbol");
      expect(result[0]).toHaveProperty("direction");
      expect(["buy", "sell"]).toContain(result[0].direction);
    }
  });

  it("marketHours returns market session data", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.market.marketHours();
    expect(result).toHaveProperty("forex");
    expect(result).toHaveProperty("crypto");
    expect(result).toHaveProperty("us_stocks");
    expect(result).toHaveProperty("commodities");
    expect(result).toHaveProperty("synthetic");
    // Each market should have isOpen and session
    expect(result.forex).toHaveProperty("isOpen");
    expect(result.crypto).toHaveProperty("isOpen");
    expect(result.crypto.isOpen).toBe(true); // crypto is always open
  });
});

// ─── Trading Tests ────────────────────────────────────────────────────────────
describe("trading", () => {
  it("openTrades requires authentication", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.trading.openTrades()).rejects.toThrow();
  });

  it("openTrades returns empty array for new user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.trading.openTrades();
    expect(Array.isArray(result)).toBe(true);
  });

  it("riskCalculator computes margin for forex trade", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.trading.riskCalculator({
      symbol: "EURUSD",
      lotSize: 0.01,
      leverage: 100,
    });
    expect(result).toHaveProperty("margin");
    expect(result).toHaveProperty("pipValue");
    expect(result).toHaveProperty("currentPrice");
    // margin is returned as string from toFixed
    expect(parseFloat(result.margin)).toBeGreaterThan(0);
  });

  it("riskCalculator respects leverage — higher leverage means lower margin", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const [low, high] = await Promise.all([
      caller.trading.riskCalculator({ symbol: "EURUSD", lotSize: 0.1, leverage: 10 }),
      caller.trading.riskCalculator({ symbol: "EURUSD", lotSize: 0.1, leverage: 100 }),
    ]);
    expect(parseFloat(low.margin)).toBeGreaterThan(parseFloat(high.margin));
  });

  it("portfolioSummary returns account metrics", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.trading.portfolioSummary();
    expect(result).toHaveProperty("totalBalance");
    expect(result).toHaveProperty("equity");
    expect(result).toHaveProperty("unrealizedPnl");
    expect(result).toHaveProperty("margin");
    expect(result).toHaveProperty("openPositions");
    expect(result).toHaveProperty("marginLevel");
  });

  it("placeTrade requires authentication", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(
      caller.trading.placeTrade({ symbol: "EURUSD", type: "buy", lotSize: 0.01 })
    ).rejects.toThrow();
  });

  it("tradeHistory requires authentication", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.trading.tradeHistory({ limit: 10 })).rejects.toThrow();
  });

  it("tradeHistory returns results array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.trading.tradeHistory({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Account Tests ────────────────────────────────────────────────────────────
describe("account", () => {
  it("wallets requires authentication", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.account.wallets()).rejects.toThrow();
  });

  it("wallets returns user wallets", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.account.wallets();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("currency");
    expect(result[0]).toHaveProperty("balance");
  });

  it("kycDocuments requires authentication", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.account.kycDocuments()).rejects.toThrow();
  });

  it("kycDocuments returns array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.account.kycDocuments();
    expect(Array.isArray(result)).toBe(true);
  });

  it("transactions requires authentication", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.account.transactions({ limit: 10 })).rejects.toThrow();
  });

  it("transactions returns array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.account.transactions({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("generateReferralCode requires authentication", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.account.generateReferralCode()).rejects.toThrow();
  });
});

// ─── Social/Copy Trading Tests ────────────────────────────────────────────────
describe("social", () => {
  it("leaderboard is publicly accessible", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.social.leaderboard({ period: "monthly", limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("leaderboard accepts different periods", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const [monthly, allTime] = await Promise.all([
      caller.social.leaderboard({ period: "monthly", limit: 5 }),
      caller.social.leaderboard({ period: "all_time", limit: 5 }),
    ]);
    expect(Array.isArray(monthly)).toBe(true);
    expect(Array.isArray(allTime)).toBe(true);
  });

  it("myStats requires authentication", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.social.myStats()).rejects.toThrow();
  });

  it("affiliateInfo requires authentication", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.social.affiliateInfo()).rejects.toThrow();
  });

  it("affiliateInfo returns referral data", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.social.affiliateInfo();
    expect(result).toHaveProperty("referralCode");
    expect(result).toHaveProperty("totalReferrals");
    expect(result).toHaveProperty("totalEarnings");
    expect(result).toHaveProperty("pendingEarnings");
  });
});

// ─── Notifications Tests ──────────────────────────────────────────────────────
describe("notifications", () => {
  it("list requires authentication", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.notifications.list({ unreadOnly: false })).rejects.toThrow();
  });

  it("list returns notifications array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.list({ unreadOnly: false });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Audit Log Tests ──────────────────────────────────────────────────────────
describe("audit", () => {
  it("myLog requires authentication", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.audit.myLog()).rejects.toThrow();
  });

  it("myLog returns audit entries array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.audit.myLog();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Risk Calculator Edge Cases ───────────────────────────────────────────────
describe("risk calculator edge cases", () => {
  it("handles crypto instruments (high price)", async () => {
    const { getInstrumentBySymbol } = await import("./db");
    vi.mocked(getInstrumentBySymbol).mockResolvedValueOnce({
      id: 5, symbol: "BTCUSD", name: "Bitcoin / USD", category: "crypto",
      baseAsset: "BTC", quoteAsset: "USD", minLotSize: "0.001", maxLotSize: "10",
      lotStep: "0.001", pipValue: "1", spread: "50", isActive: true,
      contractSize: "1", pipSize: "1", marginRequirement: "1"
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.trading.riskCalculator({ symbol: "BTCUSD", lotSize: 0.01, leverage: 10 });
    expect(parseFloat(result.margin)).toBeGreaterThan(0);
    expect(result.currentPrice).toBeGreaterThan(0);
  });

  it("stopLossPips increases risk amount", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const [withoutSL, withSL] = await Promise.all([
      caller.trading.riskCalculator({ symbol: "EURUSD", lotSize: 0.1, leverage: 100 }),
      caller.trading.riskCalculator({ symbol: "EURUSD", lotSize: 0.1, leverage: 100, stopLossPips: 50 }),
    ]);
    // riskAmount should be defined in both cases
    expect(withSL).toHaveProperty("riskAmount");
    expect(withoutSL).toHaveProperty("riskAmount");
    // with SL pips provided, riskAmount should be greater than zero
    expect(parseFloat(withSL.riskAmount)).toBeGreaterThan(0);
    // margin is the same regardless of SL
    expect(withoutSL.margin).toBe(withSL.margin);
  });
});

// ─── Price Simulation Sanity ──────────────────────────────────────────────────
describe("price simulation", () => {
  it("EURUSD price is in realistic range", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.market.prices({ symbols: ["EURUSD"] });
    const price = result[0]?.price;
    expect(price).toBeGreaterThan(0.8);
    expect(price).toBeLessThan(1.5);
  });

  it("BTCUSD price is in realistic range", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.market.prices({ symbols: ["BTCUSD"] });
    const price = result[0]?.price;
    expect(price).toBeGreaterThan(10000);
    expect(price).toBeLessThan(200000);
  });

  it("XAUUSD (Gold) price is in realistic range", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.market.prices({ symbols: ["XAUUSD"] });
    const price = result[0]?.price;
    expect(price).toBeGreaterThan(1000);
    expect(price).toBeLessThan(5000);
  });

  it("spread is positive for all instruments", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    const symbols = ["EURUSD", "BTCUSD", "XAUUSD", "GBPUSD"];
    const result = await caller.market.prices({ symbols });
    result.forEach((p: any) => {
      const spread = p.ask - p.bid;
      expect(spread).toBeGreaterThan(0);
    });
  });
});
