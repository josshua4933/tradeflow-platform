import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { accountRouter } from "./routers/account";
import { assistantRouter } from "./routers/assistant";
import { marketRouter } from "./routers/market";
import { notificationsRouter } from "./routers/notifications";
import { socialRouter } from "./routers/social";
import { tradingRouter } from "./routers/trading";
import { getAuditLog, getAssistantMessages } from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  market: marketRouter,
  trading: tradingRouter,
  account: accountRouter,
  social: socialRouter,
  notifications: notificationsRouter,
  assistant: assistantRouter,

  // Audit log (admin + own)
  audit: router({
    myLog: protectedProcedure.query(async ({ ctx }) => {
      return getAuditLog(ctx.user.id, 100);
    }),
    adminLog: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        return getAuditLog(ctx.user.id, 100);
      }
      return getAuditLog(undefined, 500);
    }),
  }),
});

export type AppRouter = typeof appRouter;
