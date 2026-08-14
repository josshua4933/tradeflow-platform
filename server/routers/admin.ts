import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getWalletsByUserId, updateWalletBalance, createNotification } from "../db";
import { users, transactions, trades, kycDocuments, auditLog, wallets } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { createPalPlussWithdrawal } from "../payplus";
import { createAdminBalanceAdjustment, reconcileWalletToTarget, reserveExistingWithdrawal, settleDeposit, settleWithdrawalFailure } from "../walletLedger";
import { aggregateWalletReconciliation } from "../walletReconciliation";


const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const adminRouter = router({
  getAllUsers: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      return allUsers;
    }),

  getWalletReconciliationReport: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const [walletRows, userRows, transactionRows] = await Promise.all([
      db.select().from(wallets),
      db.select().from(users),
      db.select().from(transactions),
    ]);
    return aggregateWalletReconciliation(walletRows, userRows, transactionRows);
  }),

  getUserWallets: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db.select().from(wallets).where(eq(wallets.userId, input.userId));
    }),

  getUserDetails: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const user = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user.length) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const userTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, input.userId))
        .orderBy(desc(transactions.createdAt))
        .limit(50);

      return { user: user[0], transactions: userTransactions };
    }),

  getAllDeposits: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const deposits = await db
        .select()
        .from(transactions)
        .where(eq(transactions.type, "deposit"))
        .orderBy(desc(transactions.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      return deposits;
    }),

  getDepositDetails: adminProcedure
    .input(z.object({ transactionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const deposit = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, input.transactionId), eq(transactions.type, "deposit")))
        .limit(1);

      if (!deposit.length) throw new TRPCError({ code: "NOT_FOUND", message: "Deposit not found" });

      return deposit[0];
    }),

  confirmDeposit: adminProcedure
    .input(z.object({ transactionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const deposit = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, input.transactionId))
        .limit(1);

      if (!deposit.length) throw new TRPCError({ code: "NOT_FOUND", message: "Deposit not found" });

      const txn = deposit[0];

      if (!txn.reference) throw new TRPCError({ code: "BAD_REQUEST", message: "Deposit is missing a settlement reference" });
      try {
        await settleDeposit({ reference: txn.reference, userId: txn.userId, amount: txn.amount, currency: txn.currency });
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Unable to settle deposit" });
      }

      // Send notification
      await createNotification({
        userId: txn.userId,
        type: "trade_execution",
        title: "Deposit Confirmed",
        message: `Your deposit of ${txn.amount} ${txn.currency} has been confirmed.`,
        metadata: { transactionId: input.transactionId },
      });

      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: "admin.confirm_deposit",
        entity: "transaction",
        entityId: String(input.transactionId),
        details: JSON.stringify({ transactionId: input.transactionId }),
        createdAt: new Date(),
      });

      return { success: true };
    }),

  getAllWithdrawals: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const withdrawals = await db
        .select()
        .from(transactions)
        .where(eq(transactions.type, "withdrawal"))
        .orderBy(desc(transactions.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      return withdrawals;
    }),

  approveWithdrawal: adminProcedure
    .input(z.object({ transactionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get the transaction details
      const txn = await db.select().from(transactions).where(eq(transactions.id, input.transactionId)).limit(1);
      if (!txn.length) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });

      const transaction = txn[0];
      if (transaction.type !== "withdrawal") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only approve withdrawal transactions" });
      }

      try {
        await reserveExistingWithdrawal(input.transactionId);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Unable to reserve withdrawal" });
      }

      // Update transaction status to processing
      await db
        .update(transactions)
        .set({ status: "processing" })
        .where(eq(transactions.id, input.transactionId));

      // Trigger PalPlus withdrawal
      try {
        // Get user details for phone number
        const userRows = await db.select().from(users).where(eq(users.id, transaction.userId)).limit(1);
        const user = userRows[0];

        if (!user || !user.phone) {
          throw new Error("User phone number not found");
        }

        const withdrawalRef = `TF-WD-${transaction.userId}-${Date.now()}`;
        const withdrawal = await createPalPlussWithdrawal({
          amount: parseFloat(transaction.amount),
          userId: transaction.userId,
          phoneNumber: user.phone,
          accountReference: withdrawalRef,
        });

        // Store withdrawal reference
        await db
          .update(transactions)
          .set({ reference: withdrawal.transactionId })
          .where(eq(transactions.id, input.transactionId));

        // Send notification
        await createNotification({
          userId: transaction.userId,
          type: "withdrawal_update",
          title: "Withdrawal Approved",
          message: `Your withdrawal of ${transaction.amount} ${transaction.currency} has been approved and is being processed.`,
          metadata: { transactionId: input.transactionId, withdrawalId: withdrawal.transactionId },
        });
      } catch (error) {
        console.error("[Admin] Error initiating payout:", error);
        try {
          await settleWithdrawalFailure(input.transactionId, error instanceof Error ? error.message : "Payout initiation failed");
        } catch (refundError) {
          console.error("[Admin] Failed to release reserved withdrawal balance:", refundError);
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to initiate payout" });
      }

      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: "admin.approve_withdrawal",
        entity: "transaction",
        entityId: String(input.transactionId),
        details: JSON.stringify({ transactionId: input.transactionId }),
        createdAt: new Date(),
      });

      return { success: true };
    }),

  rejectWithdrawal: adminProcedure
    .input(z.object({ transactionId: z.number(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get the transaction details
      const txn = await db.select().from(transactions).where(eq(transactions.id, input.transactionId)).limit(1);
      if (!txn.length) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });

      const transaction = txn[0];

      // Update transaction status to cancelled
      await db
        .update(transactions)
        .set({ status: "cancelled" })
        .where(eq(transactions.id, input.transactionId));

      if (transaction.type === "withdrawal") {
        try {
          await settleWithdrawalFailure(input.transactionId, input.reason);
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Unable to refund withdrawal" });
        }
      }

      // Send notification
      await createNotification({
        userId: transaction.userId,
        type: "withdrawal_update",
        title: "Withdrawal Rejected",
        message: `Your withdrawal request has been rejected. Reason: ${input.reason}`,
        metadata: { transactionId: input.transactionId, reason: input.reason },
      });

      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: "admin.reject_withdrawal",
        entity: "transaction",
        entityId: String(input.transactionId),
        details: JSON.stringify({ transactionId: input.transactionId, reason: input.reason }),
        createdAt: new Date(),
      });

      return { success: true };
    }),

  getAllKycDocuments: adminProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const docs = await db
        .select()
        .from(kycDocuments)
        .where(input?.status ? eq(kycDocuments.status, input.status as any) : undefined)
        .orderBy(desc(kycDocuments.createdAt))
        .limit(input?.limit ?? 50);

      return docs;
    }),

  approveKyc: adminProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const doc = await db.select().from(kycDocuments).where(eq(kycDocuments.id, input.documentId)).limit(1);
      if (!doc.length) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      await db
        .update(kycDocuments)
        .set({ status: "approved" })
        .where(eq(kycDocuments.id, input.documentId));

      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: "admin.approve_kyc",
        entity: "kyc_document",
        entityId: String(input.documentId),
        details: JSON.stringify({ documentId: input.documentId }),
        createdAt: new Date(),
      });

      return { success: true };
    }),

  rejectKyc: adminProcedure
    .input(z.object({ documentId: z.number(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const doc = await db.select().from(kycDocuments).where(eq(kycDocuments.id, input.documentId)).limit(1);
      if (!doc.length) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      await db
        .update(kycDocuments)
        .set({ status: "rejected" })
        .where(eq(kycDocuments.id, input.documentId));

      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: "admin.reject_kyc",
        entity: "kyc_document",
        entityId: String(input.documentId),
        details: JSON.stringify({ documentId: input.documentId, reason: input.reason }),
        createdAt: new Date(),
      });

      return { success: true };
    }),

  getAllTrades: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const allTrades = await db
        .select()
        .from(trades)
        .orderBy(desc(trades.openedAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      return allTrades;
    }),

  getTradingStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    // Get total trades
    const allTrades = await db.select().from(trades);
    const totalTrades = allTrades.length;
    const winningTrades = allTrades.filter((t) => t.profit && parseFloat(t.profit) > 0).length;
    const losingTrades = allTrades.filter((t) => t.profit && parseFloat(t.profit) < 0).length;
    const totalVolume = allTrades.reduce((sum, t) => sum + parseFloat(t.margin || "0"), 0);
    const totalPnL = allTrades.reduce((sum, t) => sum + parseFloat(t.profit || "0"), 0);

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      totalVolume: totalVolume.toFixed(2),
      totalPnL: totalPnL.toFixed(2),
    };
  }),

  getPlatformAnalytics: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const allUsers = await db.select().from(users);
    const allTransactions = await db.select().from(transactions);
    const allTrades = await db.select().from(trades);

    const deposits = allTransactions.filter((t) => t.type === "deposit");
    const withdrawals = allTransactions.filter((t) => t.type === "withdrawal");

    const totalDeposits = deposits.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalVolume = allTrades.reduce((sum, t) => sum + parseFloat(t.margin || "0"), 0);

    return {
      totalUsers: allUsers.length,
      totalDeposits: totalDeposits.toFixed(2),
      totalWithdrawals: totalWithdrawals.toFixed(2),
      totalVolume: totalVolume.toFixed(2),
      totalTransactions: allTransactions.length,
      totalTrades: allTrades.length,
    };
  }),

    manageNotifications: adminProcedure
    .input(z.object({ title: z.string(), message: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const allUsers = await db.select().from(users);
      for (const user of allUsers) {
        await createNotification({
          userId: user.id,
          type: "system",
          title: input.title,
          message: input.message,
          metadata: { sentBy: ctx.user.id },
        });
      }
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: "admin.send_notification",
        entity: "system",
        entityId: "system",
        details: JSON.stringify({ title: input.title, userCount: allUsers.length }),
        createdAt: new Date(),
      });
      return { success: true, notificationsSent: allUsers.length };
    }),

  reconcileUserBalance: adminProcedure
    .input(z.object({
      userId: z.number().int().positive(),
      walletId: z.number().int().positive(),
      currency: z.string().min(3).max(8),
      targetBalance: z.number().finite().min(0),
      reason: z.string().trim().min(3).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await reconcileWalletToTarget({ ...input, adminUserId: ctx.user.id });
        if (!result.alreadyReconciled) {
          await createNotification({
            userId: input.userId,
            type: "system",
            title: "Account balance reconciled",
            message: `An administrator reconciled your ${input.currency} balance to ${input.targetBalance.toFixed(2)}. Reason: ${input.reason}`,
            metadata: { reference: "reference" in result ? result.reference : undefined, targetBalance: input.targetBalance, currency: input.currency },
          });
        }
        return { success: true, ...result };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Unable to reconcile balance" });
      }
    }),

  adjustUserBalance: adminProcedure
    .input(z.object({
      userId: z.number().int().positive(),
      walletId: z.number().int().positive(),
      currency: z.string().min(3).max(8),
      delta: z.number().finite().refine((value) => value !== 0, "Adjustment cannot be zero"),
      reason: z.string().trim().min(3).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await createAdminBalanceAdjustment({
          adminUserId: ctx.user.id,
          userId: input.userId,
          walletId: input.walletId,
          currency: input.currency,
          delta: input.delta,
          reason: input.reason,
        });
        await createNotification({
          userId: input.userId,
          type: "system",
          title: "Account balance adjusted",
          message: `An administrator adjusted your ${input.currency} balance by ${input.delta.toFixed(2)}. Reason: ${input.reason}`,
          metadata: { reference: result.reference, delta: input.delta, currency: input.currency },
        });
        return { success: true, ...result };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Unable to adjust balance" });
      }
    }),

  // ─── Audit Log Viewer ──────────────────────────────────────────────────
  getAuditLog: adminProcedure
    .input(z.object({
      limit: z.number().default(100),
      offset: z.number().default(0),
      action: z.string().optional(),
      userId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [];

      if (input?.action) {
        conditions.push(eq(auditLog.action, input.action));
      }
      if (input?.userId) {
        conditions.push(eq(auditLog.userId, input.userId));
      }

      let query = db.select().from(auditLog);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const logs = await (query as any)
        .orderBy(desc(auditLog.createdAt))
        .limit(input?.limit ?? 100)
        .offset(input?.offset ?? 0);

      return logs;
    }),

  // ─── Bulk User Management ──────────────────────────────────────────────
  exportUsers: adminProcedure
    .input(z.object({ format: z.enum(["json", "csv"]).default("json") }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const allUsers = await db.select().from(users);
      return {
        format: input?.format ?? "json",
        count: allUsers.length,
        data: allUsers,
      };
    }),

  bulkSuspendUsers: adminProcedure
    .input(z.object({ userIds: z.array(z.number()), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      for (const userId of input.userIds) {
        await db.update(users).set({ accountType: "standard" }).where(eq(users.id, userId));
        await createNotification({
          userId,
          type: "system",
          title: "Account Suspended",
          message: input.reason,
          metadata: { suspendedBy: ctx.user.id },
        });
      }

      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: "admin.bulk_suspend_users",
        entity: "users",
        entityId: input.userIds.join(","),
        details: JSON.stringify({ count: input.userIds.length, reason: input.reason }),
        createdAt: new Date(),
      });

      return { success: true, suspended: input.userIds.length };
    }),

  bulkSendNotification: adminProcedure
    .input(z.object({ userIds: z.array(z.number()), title: z.string(), message: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      for (const userId of input.userIds) {
        await createNotification({
          userId,
          type: "system",
          title: input.title,
          message: input.message,
          metadata: { sentBy: ctx.user.id },
        });
      }

      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: "admin.bulk_notification",
        entity: "users",
        entityId: input.userIds.join(","),
        details: JSON.stringify({ count: input.userIds.length, title: input.title }),
        createdAt: new Date(),
      });

      return { success: true, notificationsSent: input.userIds.length };
    }),
});
