import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createCopyRelation,
  getCopyRelations,
  getTraderProfile,
  getTraderProfiles,
  getTradeHistory,
  getReferralStats,
  logAudit,
  stopCopyRelation,
  upsertTraderProfile,
} from "../db";

export const socialRouter = router({
  leaderboard: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ input }) => {
      return getTraderProfiles(input?.limit ?? 20);
    }),

  myProfile: protectedProcedure.query(async ({ ctx }) => {
    return getTraderProfile(ctx.user.id);
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(2).max(64),
        bio: z.string().max(500).optional(),
        isPublic: z.boolean().optional(),
        allowCopying: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertTraderProfile({
        userId: ctx.user.id,
        displayName: input.displayName,
        bio: input.bio,
        isPublic: input.isPublic,
        allowCopying: input.allowCopying,
      });
      await logAudit({ userId: ctx.user.id, action: "social.update_profile", details: input });
      return { success: true };
    }),

  followTrader: protectedProcedure
    .input(
      z.object({
        traderId: z.number(),
        copyRatio: z.number().min(0.1).max(2).default(1),
        maxLotSize: z.number().min(0.01).max(10).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.traderId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot follow yourself" });
      }
      const traderProfile = await getTraderProfile(input.traderId);
      if (!traderProfile?.allowCopying) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This trader does not allow copy trading" });
      }
      const existing = await getCopyRelations(ctx.user.id);
      if (existing.find((r) => r.traderId === input.traderId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already following this trader" });
      }
      await createCopyRelation({
        followerId: ctx.user.id,
        traderId: input.traderId,
        copyRatio: input.copyRatio.toString(),
        maxLotSize: input.maxLotSize.toString(),
      });
      await logAudit({ userId: ctx.user.id, action: "social.follow_trader", details: { traderId: input.traderId } });
      return { success: true };
    }),

  unfollowTrader: protectedProcedure
    .input(z.object({ relationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await stopCopyRelation(input.relationId, ctx.user.id);
      await logAudit({ userId: ctx.user.id, action: "social.unfollow_trader", details: { relationId: input.relationId } });
      return { success: true };
    }),

  myFollowing: protectedProcedure.query(async ({ ctx }) => {
    return getCopyRelations(ctx.user.id);
  }),

  myStats: protectedProcedure.query(async ({ ctx }) => {
    const history = await getTradeHistory(ctx.user.id, 1000);
    const totalTrades = history.length;
    const wins = history.filter((t) => parseFloat(t.profit ?? "0") > 0).length;
    const totalPnl = history.reduce((sum, t) => sum + parseFloat(t.profit ?? "0"), 0);
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    return { totalTrades, totalPnl: totalPnl.toFixed(2), winRate: winRate.toFixed(1) };
  }),

  affiliateInfo: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getReferralStats(ctx.user.id);
    return {
      referralCode: ctx.user.referralCode ?? null,
      totalReferrals: stats.referrals.length,
      totalEarnings: stats.totalCommission.toFixed(2),
      pendingEarnings: stats.referrals
        .filter((r) => r.status === "pending")
        .reduce((sum, r) => sum + parseFloat(r.totalCommission ?? "0"), 0)
        .toFixed(2),
      referrals: stats.referrals,
    };
  }),
});
