import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import Stripe from "stripe";
import { protectedProcedure, router } from "../_core/trpc";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

import {
  createKycDocument,
  createNotification,
  createTransaction,
  createWallet,
  getDefaultWallet,
  getKycDocuments,
  getTransactionsByUserId,
  getWalletsByUserId,
  logAudit,
  updateUser,
  updateWalletBalance,
} from "../db";

import { createRequire } from "module";
const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const speakeasy = _require("speakeasy") as any;

export const accountRouter = router({
  // ─── Profile ───────────────────────────────────────────────────────────────
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100).optional(),
        phone: z.string().optional(),
        country: z.string().optional(),
        dateOfBirth: z.string().optional(),
        address: z.string().optional(),
        preferredLanguage: z.enum(["en", "es", "fr", "de"]).optional(),
        emailNotifications: z.boolean().optional(),
        inAppNotifications: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateUser(ctx.user.id, input);
      await logAudit({
        userId: ctx.user.id,
        action: "account.update_profile",
        entity: "user",
        entityId: String(ctx.user.id),
        details: { fields: Object.keys(input) },
      });
      return { success: true };
    }),

  acceptTerms: protectedProcedure
    .input(z.object({ terms: z.boolean(), riskDisclosure: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {};
      if (input.terms) updates.termsAcceptedAt = new Date();
      if (input.riskDisclosure) updates.riskDisclosureAcceptedAt = new Date();
      await updateUser(ctx.user.id, updates);
      await logAudit({ userId: ctx.user.id, action: "account.accept_terms", details: input });
      return { success: true };
    }),

  // ─── 2FA ───────────────────────────────────────────────────────────────────
  setup2FA: protectedProcedure.mutation(async ({ ctx }) => {
    const secretObj = speakeasy.generateSecret({ length: 20, name: `TradeFlow:${ctx.user.email ?? ctx.user.name ?? "user"}` });
    const secret = secretObj.base32 as string;
    const otpauth = secretObj.otpauth_url as string;
    await updateUser(ctx.user.id, { twoFactorSecret: secret });
    return { secret, otpauth };
  }),

  verify2FA: protectedProcedure
    .input(z.object({ token: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user.twoFactorSecret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "2FA not set up" });
      }
      const isValid = speakeasy.totp.verify({
        token: input.token,
        secret: user.twoFactorSecret,
        encoding: "base32",
        window: 1,
      }) as boolean;
      if (!isValid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid 2FA token" });
      }
      await updateUser(ctx.user.id, { twoFactorEnabled: true });
      await logAudit({ userId: ctx.user.id, action: "account.enable_2fa" });
      return { success: true };
    }),

  disable2FA: protectedProcedure
    .input(z.object({ token: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user.twoFactorSecret || !user.twoFactorEnabled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "2FA not enabled" });
      }
      const isValid = speakeasy.totp.verify({
        token: input.token,
        secret: user.twoFactorSecret,
        encoding: "base32",
        window: 1,
      }) as boolean;
      if (!isValid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid 2FA token" });
      }
      await updateUser(ctx.user.id, { twoFactorEnabled: false, twoFactorSecret: null });
      await logAudit({ userId: ctx.user.id, action: "account.disable_2fa" });
      return { success: true };
    }),

  // ─── KYC ───────────────────────────────────────────────────────────────────
  submitKyc: protectedProcedure
    .input(
      z.object({
        documentType: z.enum(["passport", "national_id", "drivers_license", "utility_bill", "bank_statement"]),
        documentUrl: z.string().url(),
        phone: z.string().optional(),
        country: z.string().optional(),
        dateOfBirth: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createKycDocument({
        userId: ctx.user.id,
        documentType: input.documentType,
        documentUrl: input.documentUrl,
      });
      await updateUser(ctx.user.id, {
        kycStatus: "submitted",
        kycSubmittedAt: new Date(),
        ...(input.phone && { phone: input.phone }),
        ...(input.country && { country: input.country }),
        ...(input.dateOfBirth && { dateOfBirth: input.dateOfBirth }),
        ...(input.address && { address: input.address }),
      });
      await createNotification({
        userId: ctx.user.id,
        type: "kyc_update",
        title: "KYC Documents Submitted",
        message: "Your identity verification documents have been submitted and are under review. This typically takes 1-2 business days.",
      });
      await logAudit({
        userId: ctx.user.id,
        action: "kyc.submit",
        details: { documentType: input.documentType },
      });
      return { success: true };
    }),

  kycDocuments: protectedProcedure.query(async ({ ctx }) => {
    return getKycDocuments(ctx.user.id);
  }),

  // ─── Wallets ───────────────────────────────────────────────────────────────
  wallets: protectedProcedure.query(async ({ ctx }) => {
    const userWallets = await getWalletsByUserId(ctx.user.id);
    if (userWallets.length === 0) {
      await createWallet({ userId: ctx.user.id, currency: "USD", isDefault: true });
      return getWalletsByUserId(ctx.user.id);
    }
    return userWallets;
  }),

  createWallet: protectedProcedure
    .input(z.object({ currency: z.enum(["USD", "EUR", "GBP", "BTC", "ETH"]) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getWalletsByUserId(ctx.user.id);
      if (existing.find((w) => w.currency === input.currency)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Wallet already exists for this currency" });
      }
      await createWallet({ userId: ctx.user.id, currency: input.currency });
      await logAudit({ userId: ctx.user.id, action: "wallet.create", details: { currency: input.currency } });
      return { success: true };
    }),

  // ─── Deposits ──────────────────────────────────────────────────────────────
  createDepositIntent: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(10).max(100000),
        currency: z.string().default("USD"),
        walletId: z.number().optional(),
        origin: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const walletList = await getWalletsByUserId(ctx.user.id);
      let wallet = input.walletId
        ? walletList.find((w) => w.id === input.walletId)
        : walletList.find((w) => w.isDefault) ?? walletList[0];

      if (!wallet) {
        await createWallet({ userId: ctx.user.id, currency: "USD", isDefault: true });
        const newWallets = await getWalletsByUserId(ctx.user.id);
        wallet = newWallets[0];
      }
      if (!wallet) throw new TRPCError({ code: "BAD_REQUEST", message: "Wallet not found" });

      // Use Stripe Checkout when configured
      const stripe = getStripe();
      if (stripe) {
        const origin = input.origin ?? "https://tradeflow.manus.space";
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: ctx.user.email ?? undefined,
          line_items: [
            {
              price_data: {
                currency: input.currency.toLowerCase(),
                product_data: {
                  name: "TradeFlow Wallet Deposit",
                  description: `Deposit to your ${input.currency} trading wallet`,
                },
                unit_amount: Math.round(input.amount * 100),
              },
              quantity: 1,
            },
          ],
          metadata: {
            user_id: ctx.user.id.toString(),
            wallet_id: wallet.id.toString(),
            customer_email: ctx.user.email ?? "",
            customer_name: ctx.user.name ?? "",
          },
          client_reference_id: ctx.user.id.toString(),
          allow_promotion_codes: true,
          success_url: `${origin}/wallets?deposit=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/wallets?deposit=cancelled`,
        });
        await logAudit({
          userId: ctx.user.id,
          action: "account.deposit.stripe_initiated",
          details: { amount: input.amount, currency: input.currency, sessionId: session.id },
        });
        return { success: true, checkoutUrl: session.url, reference: session.id, newBalance: wallet.balance };
      }

      // Fallback: demo deposit (no Stripe key configured)
      const reference = `DEP-${nanoid(10).toUpperCase()}`;
      await createTransaction({
        userId: ctx.user.id,
        walletId: wallet.id,
        type: "deposit",
        amount: input.amount.toFixed(2),
        currency: input.currency,
        status: "completed",
        reference,
        description: `Demo deposit`,
      });

      const newBalance = parseFloat(wallet.balance) + input.amount;
      await updateWalletBalance(wallet.id, newBalance.toFixed(2), newBalance.toFixed(2), wallet.margin);

      await createNotification({
        userId: ctx.user.id,
        type: "withdrawal_update",
        title: "Deposit Successful",
        message: `$${input.amount.toFixed(2)} has been credited to your ${input.currency} wallet. Reference: ${reference}`,
        metadata: { reference, amount: input.amount },
      });

      await logAudit({
        userId: ctx.user.id,
        action: "account.deposit",
        details: { amount: input.amount, currency: input.currency, reference },
      });

      return { success: true, reference, newBalance: newBalance.toFixed(2) };
    }),

  // ─── Withdrawals ───────────────────────────────────────────────────────────
  requestWithdrawal: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(10),
        currency: z.string().default("USD"),
        method: z.enum(["bank_transfer", "card", "crypto", "ewallet"]),
        destination: z.string().min(5),
        walletId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const walletList = await getWalletsByUserId(ctx.user.id);
      const wallet = input.walletId
        ? walletList.find((w) => w.id === input.walletId)
        : walletList.find((w) => w.isDefault) ?? walletList[0];

      if (!wallet) throw new TRPCError({ code: "BAD_REQUEST", message: "Wallet not found" });

      const balance = parseFloat(wallet.balance);
      if (input.amount > balance) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
      }

      const reference = `WD-${nanoid(10).toUpperCase()}`;
      await createTransaction({
        userId: ctx.user.id,
        walletId: wallet.id,
        type: "withdrawal",
        amount: input.amount.toFixed(2),
        currency: input.currency,
        status: "processing",
        reference,
        description: `Withdrawal via ${input.method} to ${input.destination}`,
        metadata: { method: input.method, destination: input.destination },
      });

      const newBalance = balance - input.amount;
      await updateWalletBalance(wallet.id, newBalance.toFixed(2), newBalance.toFixed(2), wallet.margin);

      await createNotification({
        userId: ctx.user.id,
        type: "withdrawal_update",
        title: "Withdrawal Request Submitted",
        message: `Your withdrawal of $${input.amount.toFixed(2)} via ${input.method} is being processed. Reference: ${reference}`,
        metadata: { reference, amount: input.amount, method: input.method },
      });

      await logAudit({
        userId: ctx.user.id,
        action: "account.withdrawal",
        details: { amount: input.amount, method: input.method, reference },
      });

      return { success: true, reference };
    }),

  // ─── Transactions ──────────────────────────────────────────────────────────
  transactions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(500).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      return getTransactionsByUserId(ctx.user.id, input?.limit ?? 50);
    }),

  // ─── Leverage ──────────────────────────────────────────────────────────────
  updateLeverage: protectedProcedure
    .input(z.object({ walletId: z.number(), leverage: z.number().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const wallets = await getWalletsByUserId(ctx.user.id);
      const wallet = wallets.find((w) => w.id === input.walletId);
      if (!wallet) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });
      const db = await (await import("../db")).getDb();
      if (db) {
        const { wallets: walletsTable } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(walletsTable).set({ leverage: input.leverage }).where(eq(walletsTable.id, input.walletId));
      }
      await logAudit({ userId: ctx.user.id, action: "account.update_leverage", details: { walletId: input.walletId, leverage: input.leverage } });
      return { success: true };
    }),

  // ─── Referral ──────────────────────────────────────────────────────────────
  generateReferralCode: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.referralCode) return { code: ctx.user.referralCode };
    const code = nanoid(8).toUpperCase();
    await updateUser(ctx.user.id, { referralCode: code });
    return { code };
  }),

  referralStats: protectedProcedure.query(async ({ ctx }) => {
    const { getReferralStats } = await import("../db");
    return getReferralStats(ctx.user.id);
  }),
});
