import { getUserIdsWithDefaultWallet } from "./db";
import { settleAccountRisk } from "./tradingSettlement";

export type SettlementSweepResult = {
  accountsScanned: number;
  accountsSettled: number;
  positionsClosed: number;
  liquidations: number;
};

export async function runSettlementSweep(): Promise<SettlementSweepResult> {
  const userIds = await getUserIdsWithDefaultWallet();
  let accountsSettled = 0;
  let positionsClosed = 0;
  let liquidations = 0;

  for (const userId of userIds) {
    const result = await settleAccountRisk(userId);
    accountsSettled += 1;
    positionsClosed += result.closed.length;
    liquidations += result.closed.filter((trade) => trade.reason === "liquidation").length;
  }

  return {
    accountsScanned: userIds.length,
    accountsSettled,
    positionsClosed,
    liquidations,
  };
}
