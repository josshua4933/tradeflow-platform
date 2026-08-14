import { transactions, users, wallets } from "../drizzle/schema";

type TransactionRow = typeof transactions.$inferSelect;
type UserRow = typeof users.$inferSelect;
type WalletRow = typeof wallets.$inferSelect;

const POSITIVE_TYPES = new Set(["deposit", "bonus", "trade_profit"]);
const NEGATIVE_TYPES = new Set(["withdrawal", "trade_loss", "fee", "commission"]);
const RESERVED_WITHDRAWAL_STATUSES = new Set(["pending", "processing", "completed"]);

export type WalletReconciliationRow = {
  walletId: number;
  userId: number;
  userName: string;
  userEmail: string;
  currency: string;
  storedBalance: string;
  ledgerNet: string;
  discrepancy: string;
  pendingDeposits: string;
  reservedWithdrawals: string;
  transactionCount: number;
  lastTransactionAt: Date | null;
  isBalanced: boolean;
};

function money(value: number): string {
  return value.toFixed(8);
}

export function aggregateWalletReconciliation(
  walletRows: WalletRow[],
  userRows: UserRow[],
  transactionRows: TransactionRow[],
): WalletReconciliationRow[] {
  const usersById = new Map(userRows.map((user) => [user.id, user]));

  return walletRows.map((wallet) => {
    const user = usersById.get(wallet.userId);
    const rows = transactionRows.filter((transaction) => transaction.walletId === wallet.id);
    let ledgerNet = 0;
    let pendingDeposits = 0;
    let reservedWithdrawals = 0;

    for (const transaction of rows) {
      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount)) continue;
      if (transaction.type === "deposit" && transaction.status !== "completed") pendingDeposits += amount;
      if (transaction.type === "withdrawal" && RESERVED_WITHDRAWAL_STATUSES.has(transaction.status)) reservedWithdrawals += amount;
      if (transaction.status !== "completed" && transaction.type !== "withdrawal") continue;
      if (POSITIVE_TYPES.has(transaction.type)) ledgerNet += amount;
      else if (NEGATIVE_TYPES.has(transaction.type)) ledgerNet -= amount;
    }

    const storedBalance = Number(wallet.balance);
    const discrepancy = storedBalance - ledgerNet;
    const lastTransactionAt = rows.reduce<Date | null>((latest, transaction) => {
      if (!transaction.createdAt) return latest;
      if (!latest || transaction.createdAt > latest) return transaction.createdAt;
      return latest;
    }, null);

    return {
      walletId: wallet.id,
      userId: wallet.userId,
      userName: user?.name ?? "Unknown user",
      userEmail: user?.email ?? "—",
      currency: wallet.currency,
      storedBalance: money(storedBalance),
      ledgerNet: money(ledgerNet),
      discrepancy: money(discrepancy),
      pendingDeposits: money(pendingDeposits),
      reservedWithdrawals: money(reservedWithdrawals),
      transactionCount: rows.length,
      lastTransactionAt,
      isBalanced: Math.abs(discrepancy) < 0.00000001,
    };
  });
}
