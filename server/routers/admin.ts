import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, transactions, trades, kycDocuments, auditLog } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

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
        .limit(100);

      const userTrades = await db
        .select()
        .from(trades)
        .where(eq(trades.userId, input.userId))
        .orderBy(desc(trades.openedAt))
        .limit(100);

      return {
        user: user[0],
        transactions: userTransactions,
        trades: userTrades,
      };
    }),

  getAllDeposits: adminProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      if (input?.status) {
        const deposits = await db
          .select()
          .from(transactions)
          .where(and(eq(transactions.type, "deposit"), eq(transactions.status, input.status as any)))
          .orderBy(desc(transactions.createdAt))
          .limit(input?.limit ?? 50);
        return deposits;
      }

      const deposits = await db
        .select()
        .from(transactions)
        .where(eq(transactions.type, "deposit"))
        .orderBy(desc(transactions.createdAt))
        .limit(input?.limit ?? 50);

      return deposits;
    }),

  getDepositDetails: adminProcedure
    .input(z.object({ transactionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const transaction = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, input.transactionId))
        .limit(1);

      if (!transaction.length) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });

      return transaction[0];
    }),

  confirmDeposit: adminProcedure
    .input(z.object({ transactionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(transactions)
        .set({ status: "completed" })
        .where(eq(transactions.id, input.transactionId));

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
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      if (input?.status) {
        const withdrawals = await db
          .select()
          .from(transactions)
          .where(and(eq(transactions.type, "withdrawal"), eq(transactions.status, input.status as any)))
          .orderBy(desc(transactions.createdAt))
          .limit(input?.limit ?? 50);
        return withdrawals;
      }

      const withdrawals = await db
        .select()
        .from(transactions)
        .where(eq(transactions.type, "withdrawal"))
        .orderBy(desc(transactions.createdAt))
        .limit(input?.limit ?? 50);

      return withdrawals;
    }),

  approveWithdrawal: adminProcedure
    .input(z.object({ transactionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(transactions)
        .set({ status: "processing" })
        .where(eq(transactions.id, input.transactionId));

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

      await db
        .update(transactions)
        .set({ status: "cancelled" })
        .where(eq(transactions.id, input.transactionId));

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

      if (input?.status) {
        const docs = await db
          .select()
          .from(kycDocuments)
          .where(eq(kycDocuments.status, input.status as any))
          .orderBy(desc(kycDocuments.createdAt))
          .limit(input?.limit ?? 50);
        return docs;
      }

      const docs = await db
        .select()
        .from(kycDocuments)
        .orderBy(desc(kycDocuments.createdAt))
        .limit(input?.limit ?? 50);

      return docs;
    }),

  approveKyc: adminProcedure
    .input(z.object({ kycId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(kycDocuments)
        .set({ status: "approved" })
        .where(eq(kycDocuments.id, input.kycId));

      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: "admin.approve_kyc",
        entity: "kyc",
        entityId: String(input.kycId),
        details: JSON.stringify({ kycId: input.kycId }),
        createdAt: new Date(),
      });

      return { success: true };
    }),

  rejectKyc: adminProcedure
    .input(z.object({ kycId: z.number(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(kycDocuments)
        .set({ status: "rejected" })
        .where(eq(kycDocuments.id, input.kycId));

      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: "admin.reject_kyc",
        entity: "kyc",
        entityId: String(input.kycId),
        details: JSON.stringify({ kycId: input.kycId, reason: input.reason }),
        createdAt: new Date(),
      });

      return { success: true };
    }),

  getAllTrades: adminProcedure
    .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const allTrades = await db
        .select()
        .from(trades)
        .orderBy(desc(trades.openedAt))
        .limit(input?.limit ?? 100)
        .offset(input?.offset ?? 0);

      return allTrades;
    }),

  getPlatformAnalytics: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const totalUsers = await db.select().from(users);
    const totalDeposits = await db
      .select()
      .from(transactions)
      .where(eq(transactions.type, "deposit"));
    const totalWithdrawals = await db
      .select()
      .from(transactions)
      .where(eq(transactions.type, "withdrawal"));
    const totalTrades = await db.select().from(trades);

    const depositVolume = totalDeposits.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const withdrawalVolume = totalWithdrawals.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const completedDeposits = totalDeposits.filter((t) => t.status === "completed").length;
    const completedWithdrawals = totalWithdrawals.filter((t) => t.status === "completed").length;

    return {
      totalUsers: totalUsers.length,
      totalDeposits: totalDeposits.length,
      totalWithdrawals: totalWithdrawals.length,
      completedDeposits,
      completedWithdrawals,
      depositVolume: depositVolume.toFixed(2),
      withdrawalVolume: withdrawalVolume.toFixed(2),
      totalTrades: totalTrades.length,
      netVolume: (depositVolume - withdrawalVolume).toFixed(2),
    };
  }),
});
