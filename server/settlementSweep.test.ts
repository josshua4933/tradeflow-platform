import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserIdsWithDefaultWallet: vi.fn(),
  settleAccountRisk: vi.fn(),
}));

vi.mock("./db", () => mocks);
vi.mock("./tradingSettlement", () => ({ settleAccountRisk: mocks.settleAccountRisk }));

import { runSettlementSweep } from "./settlementSweep";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserIdsWithDefaultWallet.mockResolvedValue([1, 2, 3]);
  mocks.settleAccountRisk
    .mockResolvedValueOnce({ closed: [{ tradeId: 1, reason: "stop_loss", pnl: -2 }], remainingTrades: [], account: {}, wasLiquidated: false })
    .mockResolvedValueOnce({ closed: [{ tradeId: 2, reason: "liquidation", pnl: -8 }], remainingTrades: [], account: {}, wasLiquidated: true })
    .mockResolvedValueOnce({ closed: [], remainingTrades: [], account: {}, wasLiquidated: false });
});

describe("autonomous settlement sweep", () => {
  it("scans each funded account and aggregates closed positions and liquidations", async () => {
    const result = await runSettlementSweep();

    expect(result).toEqual({ accountsScanned: 3, accountsSettled: 3, positionsClosed: 2, liquidations: 1 });
    expect(mocks.settleAccountRisk).toHaveBeenCalledTimes(3);
    expect(mocks.settleAccountRisk).toHaveBeenNthCalledWith(1, 1);
    expect(mocks.settleAccountRisk).toHaveBeenNthCalledWith(3, 3);
  });
});
