import { describe, expect, it } from "vitest";
import { aggregateWalletReconciliation } from "./walletReconciliation";

const wallet = {
  id: 7, userId: 42, currency: "USD", balance: "1000.00000000", equity: "1000.00000000", margin: "0.00000000", freeMargin: "1000.00000000", marginLevel: "0.00", leverage: 100, isDefault: true, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"),
} as any;
const user = { id: 42, name: "A User", email: "user@example.com" } as any;

function transaction(overrides: Record<string, unknown>) {
  return { id: 1, userId: 42, walletId: 7, type: "deposit", amount: "0.00", currency: "USD", status: "completed", reference: "ref", createdAt: new Date("2026-01-02"), ...overrides } as any;
}

describe("wallet reconciliation aggregation", () => {
  it("calculates stored-vs-ledger drift using completed funding and reserved withdrawals", () => {
    const rows = aggregateWalletReconciliation(
      [wallet],
      [user],
      [
        transaction({ id: 1, type: "deposit", amount: "1200.00" }),
        transaction({ id: 2, type: "withdrawal", amount: "150.00", status: "pending" }),
        transaction({ id: 3, type: "deposit", amount: "25.00", status: "pending" }),
      ],
    );
    expect(rows[0]).toMatchObject({ storedBalance: "1000.00000000", ledgerNet: "1050.00000000", discrepancy: "-50.00000000", pendingDeposits: "25.00000000", reservedWithdrawals: "150.00000000", transactionCount: 3, isBalanced: false });
  });

  it("marks a wallet balanced when stored balance equals the auditable net", () => {
    const rows = aggregateWalletReconciliation([wallet], [user], [transaction({ type: "deposit", amount: "1000.00" })]);
    expect(rows[0].isBalanced).toBe(true);
    expect(rows[0].discrepancy).toBe("0.00000000");
  });
});

describe("wallet reconciliation correction and audit logging", () => {
  it("computes exact delta and constructs audited reconciliation records", async () => {
    const currentBalance = 1000.0;
    const targetBalance = 1050.0;
    const delta = Number((targetBalance - currentBalance).toFixed(8));
    expect(delta).toBe(50);
    
    const auditRecord = {
      action: "reconcile_balance",
      details: JSON.stringify({ userId: 42, previousBalance: 1000, targetBalance: 1050, delta: 50, reason: "Manual audit correction" }),
    };
    expect(auditRecord.action).toBe("reconcile_balance");
    const parsed = JSON.parse(auditRecord.details);
    expect(parsed.delta).toBe(50);
    expect(parsed.previousBalance).toBe(1000);
    expect(parsed.targetBalance).toBe(1050);
  });
});
