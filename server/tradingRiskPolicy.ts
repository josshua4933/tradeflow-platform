export const DEFAULT_STOP_OUT_MARGIN_LEVEL = 50;
export const MINIMUM_FREE_MARGIN = 0;
export const MINIMUM_EQUITY = 0;

function parseThreshold(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STOP_OUT_MARGIN_LEVEL;
}

/**
 * Stop-out policy is centralized here so the UI, scheduled sweep, and tRPC
 * queries all apply the same account-protection rule. Set
 * TRADEFLOW_STOP_OUT_MARGIN_LEVEL to override the default 50% threshold.
 */
export const STOP_OUT_MARGIN_LEVEL = parseThreshold(process.env.TRADEFLOW_STOP_OUT_MARGIN_LEVEL);

export type RiskSnapshot = {
  equity: number;
  freeMargin: number;
  margin: number;
  marginLevel: number;
};

export function shouldLiquidate(snapshot: RiskSnapshot) {
  if (snapshot.margin <= 0) return false;
  return snapshot.equity <= MINIMUM_EQUITY ||
    snapshot.freeMargin < MINIMUM_FREE_MARGIN ||
    snapshot.marginLevel < STOP_OUT_MARGIN_LEVEL;
}
