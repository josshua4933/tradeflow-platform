import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createPriceAlert,
  deletePriceAlert,
  getNotifications,
  getPriceAlerts,
  markAllNotificationsRead,
  markNotificationRead,
} from "../db";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      return getNotifications(ctx.user.id, input?.limit ?? 50);
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),

  priceAlerts: protectedProcedure.query(async ({ ctx }) => {
    return getPriceAlerts(ctx.user.id);
  }),

  createPriceAlert: protectedProcedure
    .input(
      z.object({
        symbol: z.string(),
        condition: z.enum(["above", "below"]),
        targetPrice: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createPriceAlert({
        userId: ctx.user.id,
        symbol: input.symbol,
        condition: input.condition,
        targetPrice: input.targetPrice.toString(),
      });
      return { success: true };
    }),

  deletePriceAlert: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deletePriceAlert(input.id, ctx.user.id);
      return { success: true };
    }),
});
