import { beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, transactions, wallets } from "../drizzle/schema";

const state = vi.hoisted(() => ({
  wallet: { id: 7, userId: 42, currency: "USD", balance: "1000.00000000", equity: "1000.00000000", margin: "100.00000000", freeMargin: "900.00000000", marginLevel: "1000.00" },
  transactions: [] as any[],
  audits: [] as any[],
}));

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    transaction: async (callback: (tx: any) => Promise<unknown>) => callback(makeTx()),
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () => table === wallets ? [state.wallet] : state.transactions.slice(0, 1),
        }),
      }),
    }),
    update: (table: unknown) => ({
      set: (value: any) => ({
        where: async () => {
          if (table === transactions && state.transactions[0]) Object.assign(state.transactions[0], value);
        },
      }),
    }),
  })),
}));

function makeTx() {
  return {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () => table === wallets ? [state.wallet] : state.transactions.slice(0, 1),
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: async (value: any) => {
        if (table === transactions) state.transactions.push({ id: state.transactions.length + 1, ...value });
        if (table === auditLog) state.audits.push(value);
      },
    }),
    update: (table: unknown) => ({
      set: (value: any) => ({
        where: async () => {
          if (table === wallets) Object.assign(state.wallet, value);
          if (table === transactions && state.transactions[0]) Object.assign(state.transactions[0], value);
        },
      }),
    }),
  };
}

const { createWithdrawalRequest, settleWithdrawalFailure, settleWithdrawalSuccess, settleDeposit, createAdminBalanceAdjustment } = await import("./walletLedger");

describe("wallet ledger integration contracts", () => {
  beforeEach(() => {
    state.wallet = { id: 7, userId: 42, currency: "USD", balance: "1000.00000000", equity: "1000.00000000", margin: "100.00000000", freeMargin: "900.00000000", marginLevel: "1000.00" };
    state.transactions = [];
    state.audits = [];
  });

  it("reserves a withdrawal once and restores it once on failure", async () => {
    await createWithdrawalRequest({ userId: 42, walletId: 7, amount: 125, currency: "USD", reference: "WD-1" });
    expect(state.wallet.balance).toBe("875.00000000");
    expect(state.transactions).toHaveLength(1);

    await settleWithdrawalFailure("WD-1", "provider rejected");
    expect(state.wallet.balance).toBe("1000.00000000");
    expect(state.transactions[0].status).toBe("failed");
    expect(state.transactions[0].metadata.refundApplied).toBe(true);

    await settleWithdrawalFailure("WD-1", "duplicate webhook");
    expect(state.wallet.balance).toBe("1000.00000000");
  });

  it("completes a withdrawal once without refunding reserved funds", async () => {
    await createWithdrawalRequest({ userId: 42, walletId: 7, amount: 125, currency: "USD", reference: "WD-2" });
    const first = await settleWithdrawalSuccess("WD-2");
    const second = await settleWithdrawalSuccess("WD-2");
    expect(first.alreadySettled).toBe(false);
    expect(second.alreadySettled).toBe(true);
    expect(state.wallet.balance).toBe("875.00000000");
    expect(state.transactions[0].status).toBe("completed");
  });

  it("settles a deposit only once even when confirmation is repeated", async () => {
    state.transactions = [{ id: 1, userId: 42, walletId: 7, type: "deposit", amount: "250.00000000", currency: "USD", status: "pending", reference: "DEP-1", metadata: null }];
    await settleDeposit({ reference: "DEP-1", userId: 42, currency: "USD" });
    await settleDeposit({ reference: "DEP-1", userId: 42, currency: "USD" });
    expect(state.wallet.balance).toBe("1250.00000000");
    expect(state.transactions[0].status).toBe("completed");
    expect(state.transactions[0].metadata.ledgerApplied).toBe(true);
  });

  it("creates both a balance transaction and an audit entry for admin credit", async () => {
    const result = await createAdminBalanceAdjustment({ adminUserId: 1, userId: 42, walletId: 7, delta: 50, currency: "USD", reason: "Verified compensation" });
    expect(result.delta).toBe("50.00000000");
    expect(state.wallet.balance).toBe("1050.00000000");
    expect(state.transactions[0].type).toBe("bonus");
    expect(state.audits[0].action).toBe("admin.adjust_balance");
  });
});
