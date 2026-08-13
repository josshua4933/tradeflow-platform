import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  closeTrade: vi.fn(),
  createNotification: vi.fn(),
  createTransaction: vi.fn(),
  getDefaultWallet: vi.fn(),
  getInstrumentBySymbol: vi.fn(),
  getOpenTrades: vi.fn(),
  logAudit: vi.fn(),
  updateWalletBalance: vi.fn(),
}));

vi.mock("./db", () => mocks);
vi.mock("./routers/market", () => ({
  getCurrentPrice: vi.fn(() => ({ bid: 94, ask: 95, price: 94.5 })),
}));

import {
  settleAccountRisk,
  settleTriggeredPositions,
  settleTradeForUser,
} from "./tradingSettlement";

const wallet = {
  id: 1,
  userId: 1,
  currency: "USD",
  balance: "100.00",
  equity: "100.00",
  margin: "20.00",
  freeMargin: "80.00",
  leverage: 100,
};

const instrument = { symbol: "BTCUSD", contractSize: "1", marginRequirement: "1" };

const trade = {
  id: 7,
  userId: 1,
  walletId: 1,
  symbol: "BTCUSD",
  type: "buy",
  lotSize: "1",
  openPrice: "100",
  margin: "20",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.closeTrade.mockResolvedValue(true);
  mocks.createNotification.mockResolvedValue(undefined);
  mocks.createTransaction.mockResolvedValue(undefined);
  mocks.getDefaultWallet.mockResolvedValue(wallet);
  mocks.getInstrumentBySymbol.mockResolvedValue(instrument);
  mocks.getOpenTrades.mockResolvedValue([]);
  mocks.logAudit.mockResolvedValue(undefined);
  mocks.updateWalletBalance.mockResolvedValue(undefined);
});

describe("settled wallet accounting", () => {
  it("realizes P&L and releases reserved margin on close", async () => {
    const result = await settleTradeForUser({ userId: 1, trade, closePrice: 110, reason: "manual" });

    expect(result.closed).toBe(true);
    expect(result.pnl).toBe(10);
    expect(mocks.updateWalletBalance).toHaveBeenCalledWith(1, "110.00", "110.00", "0.00");
    expect(mocks.createTransaction).toHaveBeenCalledWith(expect.objectContaining({ type: "trade_profit", amount: "10.00" }));
  });

  it("automatically closes a buy at stop-loss and settles its wallet state", async () => {
    const stopLossTrade = { ...trade, stopLoss: "95" };
    mocks.getOpenTrades.mockResolvedValueOnce([stopLossTrade]).mockResolvedValue([]);

    const result = await settleTriggeredPositions(1);

    expect(result.closed).toEqual([{ tradeId: 7, reason: "stop_loss", pnl: -6 }]);
    expect(mocks.closeTrade).toHaveBeenCalledWith(7, "94", "-6");
    expect(mocks.updateWalletBalance).toHaveBeenCalledWith(1, "94.00", "94.00", "0.00");
  });

  it("does not duplicate settlement credits when the sweep runs twice", async () => {
    let isOpen = true;
    const triggeredTrade = { ...trade, stopLoss: "95" };
    mocks.getOpenTrades.mockImplementation(async () => isOpen ? [triggeredTrade] : []);
    mocks.closeTrade.mockImplementation(async () => {
      if (!isOpen) return false;
      isOpen = false;
      return true;
    });

    const first = await settleTriggeredPositions(1);
    const second = await settleTriggeredPositions(1);

    expect(first.closed).toEqual([{ tradeId: 7, reason: "stop_loss", pnl: -6 }]);
    expect(second.closed).toEqual([]);
    expect(mocks.createTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.updateWalletBalance).toHaveBeenCalledTimes(1);
    expect(mocks.closeTrade).toHaveBeenCalledTimes(1);
  });

  it("liquidates positions when equity breaches zero and sweeps reserved margin", async () => {
    const lowBalanceWallet = { ...wallet, balance: "10.00", equity: "10.00", margin: "20.00", freeMargin: "-10.00" };
    mocks.getDefaultWallet.mockResolvedValue(lowBalanceWallet);
    let openTradesCalls = 0;
    mocks.getOpenTrades.mockImplementation(async () => {
      openTradesCalls += 1;
      return openTradesCalls <= 2 ? [trade] : [];
    });

    const result = await settleAccountRisk(1);

    expect(result.wasLiquidated).toBe(true);
    expect(result.closed).toEqual([{ tradeId: 7, reason: "liquidation", pnl: -6 }]);
    expect(mocks.updateWalletBalance).toHaveBeenCalledWith(1, "4.00", "4.00", "0.00");
    expect(mocks.createNotification).toHaveBeenCalledWith(expect.objectContaining({ title: "Position Liquidated: BTCUSD" }));
  });
});
