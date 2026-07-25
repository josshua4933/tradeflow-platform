import { nanoid } from "nanoid";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { createPalPlussSTKPush, convertToKSH, getExchangeRate } from "../payplus";

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
  awardReferralBonus,
  trackReferralDeposit,
  getUserByReferralCode,
  createReferral,
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
        action: "profile.update",
        details: input,
      });
      return { success: true };
    }),

  // ─── 2FA Setup ─────────────────────────────────────────────────────────────
  enable2fa: protectedProcedure.mutation(async ({ ctx }) => {
    const secret = speakeasy.generateSecret({
      name: `TradeFlow (${ctx.user.email})`,
      issuer: "TradeFlow",
      length: 32,
    });

    const otpauth = secret.otpauth_url;

    await logAudit({
      userId: ctx.user.id,
      action: "2fa.setup_initiated",
      details: {},
    });

    return {
      secret: secret.base32,
      otpauth,
      manualEntry: secret.base32,
    };
  }),

  verify2fa: protectedProcedure
    .input(z.object({ token: z.string(), secret: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const verified = speakeasy.totp.verify({
        secret: input.secret,
        encoding: "base32",
        token: input.token,
        window: 2,
      });

      if (!verified) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid 2FA token" });
      }

      await updateUser(ctx.user.id, { twoFactorSecret: input.secret, twoFactorEnabled: true });
      await logAudit({
        userId: ctx.user.id,
        action: "2fa.enabled",
        details: {},
      });

      return { success: true };
    }),

  disable2fa: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user.twoFactorSecret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "2FA not enabled" });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: input.token,
        window: 2,
      });

      if (!verified) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid 2FA token" });
      }

      await updateUser(ctx.user.id, { twoFactorSecret: null, twoFactorEnabled: false });
      await logAudit({
        userId: ctx.user.id,
        action: "2fa.disabled",
        details: {},
      });

      return { success: true };
    }),

  // ─── KYC ───────────────────────────────────────────────────────────────────
  submitKyc: protectedProcedure
    .input(
      z.object({
        documentType: z.enum(["passport", "drivers_license", "national_id", "utility_bill", "bank_statement"]),
        documentUrl: z.string().url(),
        country: z.string(),
        fullName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createKycDocument({
        userId: ctx.user.id,
        documentType: input.documentType as "passport" | "drivers_license" | "national_id" | "utility_bill" | "bank_statement",
        documentUrl: input.documentUrl,
      });

      await logAudit({
        userId: ctx.user.id,
        action: "kyc.submitted",
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

  // ─── Deposits (Payplus) ────────────────────────────────────────────────────
  createDepositIntent: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(10).max(100000),
        currency: z.enum(["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "INR", "ZAR"]).default("USD"),
        phoneNumber: z.string().min(10).max(20),
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

      // Create PalPluss STK push for mobile deposit
      const origin = input.origin ?? "https://tradeflow.manus.space";
      const accountReference = `TF-DEP-${ctx.user.id}-${nanoid(8).toUpperCase()}`;
      // Store pending transaction BEFORE calling PalPluss
      const reference = accountReference;
      await createTransaction({
        userId: ctx.user.id,
        walletId: wallet.id,
        type: "deposit",
        amount: input.amount.toFixed(2),
        currency: input.currency,
        status: "pending",
        reference,
        description: `PalPluss STK push deposit`,
      });

      // Now call PalPluss to send STK push
      const palplussResult = await createPalPlussSTKPush({
        amount: input.amount,
        userId: ctx.user.id,
        phoneNumber: input.phoneNumber,
        accountReference,
        currency: input.currency,
      });

      if (palplussResult.success) {
        // Check if user was referred and award bonus on first deposit
        if (ctx.user.referredBy) {
          // Award 5% referral bonus to the referrer
          await awardReferralBonus(ctx.user.referredBy, input.amount, 5);

          // Track the referral deposit
          await trackReferralDeposit(ctx.user.referredBy, ctx.user.id, input.amount);

          await logAudit({
            userId: ctx.user.id,
            action: "account.deposit.referral_bonus_awarded",
            details: { referrerId: ctx.user.referredBy, bonusAmount: (input.amount * 5) / 100 },
          });
        }

        await logAudit({
          userId: ctx.user.id,
          action: "account.deposit.stk_push_initiated",
          details: { amount: input.amount, phoneNumber: input.phoneNumber, reference },
        });

        return {
          success: true,
          transactionId: reference,
          status: palplussResult.status || "pending",
          message: "STK push sent to your phone. Please complete the payment.",
        };
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: palplussResult.error || "Failed to initiate STK push",
      });
    }),

  // ─── Withdrawals (Payplus) ────────────────────────────────────────────────
  requestWithdrawal: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(10).max(100000),
        walletId: z.number(),
        accountNumber: z.string().optional(),
        bankCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const wallet = (await getWalletsByUserId(ctx.user.id)).find((w) => w.id === input.walletId);
      if (!wallet) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });

      const balance = parseFloat(wallet.balance);
      if (balance < input.amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
      }

      const reference = `WD-${nanoid(10).toUpperCase()}`;
      await createTransaction({
        userId: ctx.user.id,
        walletId: wallet.id,
        type: "withdrawal",
        amount: input.amount.toFixed(2),
        currency: wallet.currency,
        status: "pending",
        reference,
        description: `Withdrawal request`,
      });

      await logAudit({
        userId: ctx.user.id,
        action: "withdrawal.requested",
        details: { amount: input.amount, reference },
      });

      return { success: true, reference };
    }),

  transactions: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return getTransactionsByUserId(ctx.user.id, input.limit);
    }),

  getTransaction: protectedProcedure
    .input(z.object({ transactionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const transactions = await getTransactionsByUserId(ctx.user.id, 1000);
      return transactions.find((t) => t.reference === input.transactionId) || null;
    }),
});
