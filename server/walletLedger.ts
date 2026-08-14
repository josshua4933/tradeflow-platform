import { and, eq, or } from "drizzle-orm";
import { getDb } from "./db";
import { auditLog, transactions, wallets } from "../drizzle/schema";

const SCALE = 8;
const UNIT = 100_000_000;

type LedgerMetadata = Record<string, unknown>;

type WalletMutation = {
  balance: string;
  equity: string;
  margin: string;
  freeMargin: string;
  marginLevel: string;
};

function parseUnits(value: string | number | null | undefined): number {
  const raw = String(value ?? "0").trim();
  if (!raw || raw === "-" || raw === ".") return 0;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? Math.round(numeric * UNIT) : 0;
}

function formatUnits(units: number): string {
  if (!Number.isFinite(units)) throw new Error("Invalid monetary value");
  return (units / UNIT).toFixed(SCALE);
}

export function normalizeLedgerAmount(value: string | number): string {
  return formatUnits(parseUnits(value));
}

export function calculateWalletMutation(current: {
  balance: string | number;
  equity: string | number;
  margin: string | number;
}, delta: string | number): WalletMutation {
  const deltaUnits = parseUnits(delta);
  const currentBalance = parseUnits(current.balance);
  const currentEquity = parseUnits(current.equity);
  const currentMargin = parseUnits(current.margin);
  const nextBalance = currentBalance + deltaUnits;
  if (nextBalance < 0) throw new Error("Insufficient available wallet balance");

  // Preserve any unrealized equity component while applying the same funding delta.
  const unrealized = currentEquity - currentBalance;
  const nextEquity = nextBalance + unrealized;
  const freeMargin = nextEquity - currentMargin;
  const marginLevel = currentMargin > 0
    ? ((nextEquity / currentMargin) * 100).toFixed(8)
    : "0.00000000";

  return {
    balance: formatUnits(nextBalance),
    equity: formatUnits(nextEquity),
    margin: formatUnits(currentMargin),
    freeMargin: formatUnits(freeMargin),
    marginLevel,
  };
}

function mergeMetadata(metadata: unknown, additions: LedgerMetadata): LedgerMetadata {
  return {
    ...(metadata && typeof metadata === "object" ? metadata as LedgerMetadata : {}),
    ...additions,
  };
}

async function updateWalletInTransaction(tx: any, walletId: number, delta: string | number) {
  const rows = await tx.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
  const wallet = rows[0];
  if (!wallet) throw new Error("Wallet not found");

  const mutation = calculateWalletMutation(wallet, delta);
  await tx.update(wallets).set(mutation).where(eq(wallets.id, walletId));
  return { wallet, mutation };
}

function transactionCondition(key: string | number) {
  return typeof key === "number"
    ? eq(transactions.id, key)
    : or(eq(transactions.reference, key), eq(transactions.stripePaymentIntentId, key));
}

export async function settleDeposit(input: {
  reference: string | number;
  amount?: string | number;
  currency?: string;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return db.transaction(async (tx: any) => {
    const rows = await tx.select().from(transactions).where(transactionCondition(input.reference)).limit(1);
    const transaction = rows[0];
    if (!transaction || transaction.type !== "deposit") throw new Error("Deposit transaction not found");

    const metadata = transaction.metadata && typeof transaction.metadata === "object" ? transaction.metadata as LedgerMetadata : {};
    if (metadata.ledgerApplied === true || transaction.status === "completed") {
      return { alreadySettled: true, transaction, wallet: null };
    }

    if (input.userId !== undefined && transaction.userId !== input.userId) throw new Error("Deposit ownership mismatch");
    const amount = normalizeLedgerAmount(input.amount ?? transaction.amount);
    if (parseUnits(amount) <= 0) throw new Error("Deposit amount must be positive");
    if (input.currency && input.currency !== transaction.currency) throw new Error("Deposit currency mismatch");

    const { mutation } = await updateWalletInTransaction(tx, transaction.walletId, amount);
    const nextMetadata = mergeMetadata(transaction.metadata, {
      ledgerApplied: true,
      ledgerAmount: amount,
      settledAt: new Date().toISOString(),
    });

    await tx.update(transactions).set({
      status: "completed",
      metadata: nextMetadata,
    }).where(eq(transactions.id, transaction.id));

    return { alreadySettled: false, transaction, wallet: mutation };
  });
}

export async function createWithdrawalRequest(input: {
  userId: number;
  walletId: number;
  amount: string | number;
  currency: string;
  reference: string;
  metadata?: LedgerMetadata;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const amount = normalizeLedgerAmount(input.amount);
  if (parseUnits(amount) <= 0) throw new Error("Withdrawal amount must be positive");

  return db.transaction(async (tx: any) => {
    const walletRows = await tx.select().from(wallets).where(and(eq(wallets.id, input.walletId), eq(wallets.userId, input.userId))).limit(1);
    const wallet = walletRows[0];
    if (!wallet) throw new Error("Wallet not found");

    const mutation = calculateWalletMutation(wallet, `-${amount}`);
    const metadata = mergeMetadata(input.metadata, {
      balanceReserved: true,
      reservedAmount: amount,
      reservedAt: new Date().toISOString(),
    });

    await tx.insert(transactions).values({
      userId: input.userId,
      walletId: input.walletId,
      type: "withdrawal",
      amount,
      currency: input.currency,
      status: "pending",
      reference: input.reference,
      description: input.description ?? "Withdrawal request",
      metadata,
    });
    await tx.update(wallets).set(mutation).where(eq(wallets.id, input.walletId));

    return { amount, wallet, mutation };
  });
}

export async function reserveExistingWithdrawal(key: string | number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return db.transaction(async (tx: any) => {
    const rows = await tx.select().from(transactions).where(transactionCondition(key)).limit(1);
    const transaction = rows[0];
    if (!transaction || transaction.type !== "withdrawal") throw new Error("Withdrawal transaction not found");
    const metadata = transaction.metadata && typeof transaction.metadata === "object" ? transaction.metadata as LedgerMetadata : {};
    if (metadata.balanceReserved === true) return { alreadyReserved: true, transaction };
    if (["completed", "failed", "cancelled"].includes(transaction.status)) throw new Error("Withdrawal is no longer pending");

    const mutation = (await updateWalletInTransaction(tx, transaction.walletId, `-${transaction.amount}`)).mutation;
    await tx.update(transactions).set({
      metadata: mergeMetadata(transaction.metadata, {
        balanceReserved: true,
        reservedAmount: normalizeLedgerAmount(transaction.amount),
        reservedAt: new Date().toISOString(),
      }),
    }).where(eq(transactions.id, transaction.id));
    return { alreadyReserved: false, transaction, mutation };
  });
}

export async function settleWithdrawalFailure(key: string | number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return db.transaction(async (tx: any) => {
    const rows = await tx.select().from(transactions).where(transactionCondition(key)).limit(1);
    const transaction = rows[0];
    if (!transaction || transaction.type !== "withdrawal") throw new Error("Withdrawal transaction not found");

    const metadata = transaction.metadata && typeof transaction.metadata === "object" ? transaction.metadata as LedgerMetadata : {};
    if (metadata.refundApplied === true || (transaction.status === "failed" && metadata.balanceReserved !== true)) {
      return { alreadySettled: true, transaction };
    }

    let mutation = null;
    if (metadata.balanceReserved === true) {
      mutation = (await updateWalletInTransaction(tx, transaction.walletId, transaction.amount)).mutation;
    }

    await tx.update(transactions).set({
      status: "failed",
      metadata: mergeMetadata(transaction.metadata, {
        refundApplied: metadata.balanceReserved === true,
        refundReason: reason,
        refundedAt: new Date().toISOString(),
      }),
    }).where(eq(transactions.id, transaction.id));

    return { alreadySettled: false, transaction, mutation };
  });
}

export async function settleWithdrawalSuccess(key: string | number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(transactions).where(transactionCondition(key)).limit(1);
  const transaction = rows[0];
  if (!transaction || transaction.type !== "withdrawal") throw new Error("Withdrawal transaction not found");
  if (transaction.status === "completed") return { alreadySettled: true, transaction };
  await db.update(transactions).set({ status: "completed" }).where(eq(transactions.id, transaction.id));
  return { alreadySettled: false, transaction };
}

export async function reconcileWalletToTarget(input: {
  adminUserId: number;
  userId: number;
  walletId: number;
  targetBalance: string | number;
  currency: string;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(wallets).where(and(eq(wallets.id, input.walletId), eq(wallets.userId, input.userId))).limit(1);
  const wallet = rows[0];
  if (!wallet) throw new Error("Wallet not found");
  if (wallet.currency !== input.currency) throw new Error("Wallet currency mismatch");
  const target = normalizeLedgerAmount(input.targetBalance);
  const current = normalizeLedgerAmount(wallet.balance);
  const delta = formatUnits(parseUnits(target) - parseUnits(current));
  if (parseUnits(delta) === 0) return { alreadyReconciled: true, currentBalance: current };
  const result = await createAdminBalanceAdjustment({
    adminUserId: input.adminUserId,
    userId: input.userId,
    walletId: input.walletId,
    delta,
    currency: input.currency,
    reason: `Legacy balance reconciliation: ${input.reason}`,
  });
  return { alreadyReconciled: false, currentBalance: current, targetBalance: target, ...result };
}

export async function createAdminBalanceAdjustment(input: {
  adminUserId: number;
  userId: number;
  walletId: number;
  delta: string | number;
  currency: string;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const delta = normalizeLedgerAmount(input.delta);
  if (parseUnits(delta) === 0) throw new Error("Adjustment cannot be zero");

  return db.transaction(async (tx: any) => {
    const rows = await tx.select().from(wallets).where(and(eq(wallets.id, input.walletId), eq(wallets.userId, input.userId))).limit(1);
    const wallet = rows[0];
    if (!wallet) throw new Error("Wallet not found");
    if (wallet.currency !== input.currency) throw new Error("Wallet currency mismatch");

    const mutation = await updateWalletInTransaction(tx, input.walletId, delta);
    const positive = parseUnits(delta) > 0;
    const reference = `ADMIN-ADJ-${input.adminUserId}-${Date.now()}`;
    await tx.insert(transactions).values({
      userId: input.userId,
      walletId: input.walletId,
      type: positive ? "bonus" : "fee",
      amount: formatUnits(positive ? parseUnits(delta) : -parseUnits(delta)),
      currency: input.currency,
      status: "completed",
      reference,
      description: positive ? "Admin balance credit" : "Admin balance debit",
      metadata: {
        adjustment: true,
        delta,
        reason: input.reason,
        adminUserId: input.adminUserId,
      },
    });
    await tx.insert(auditLog).values({
      userId: input.adminUserId,
      action: "admin.adjust_balance",
      entity: "wallet",
      entityId: String(input.walletId),
      details: JSON.stringify({
        targetUserId: input.userId,
        walletId: input.walletId,
        currency: input.currency,
        delta,
        reason: input.reason,
        reference,
      }),
      createdAt: new Date(),
    });

    return { reference, delta, wallet: mutation.mutation };
  });
}
