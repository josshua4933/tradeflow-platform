import { describe, expect, it } from "vitest";
import { calculateWalletMutation, normalizeLedgerAmount } from "./walletLedger";

describe("wallet ledger invariants", () => {
  it("normalizes funding amounts deterministically", () => {
    expect(normalizeLedgerAmount("100.1")).toBe("100.10000000");
    expect(normalizeLedgerAmount(0.00000001)).toBe("0.00000001");
  });

  it("credits balance and equity together while preserving margin", () => {
    const next = calculateWalletMutation({ balance: "1000.00", equity: "1012.50", margin: "200.00" }, "250.00");
    expect(next.balance).toBe("1250.00000000");
    expect(next.equity).toBe("1262.50000000");
    expect(next.margin).toBe("200.00000000");
    expect(next.freeMargin).toBe("1062.50000000");
    expect(next.marginLevel).toBe("631.25000000");
  });

  it("debits available balance without double-counting unrealized P&L", () => {
    const next = calculateWalletMutation({ balance: "1000.00", equity: "980.00", margin: "200.00" }, "-100.00");
    expect(next.balance).toBe("900.00000000");
    expect(next.equity).toBe("880.00000000");
    expect(next.freeMargin).toBe("680.00000000");
  });

  it("rejects a debit that would make the wallet balance negative", () => {
    expect(() => calculateWalletMutation({ balance: "50", equity: "50", margin: "0" }, "-50.01")).toThrow("Insufficient available wallet balance");
  });
});
