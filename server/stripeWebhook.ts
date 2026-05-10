import { Express, Request, Response } from "express";
import Stripe from "stripe";
import {
  createTransaction,
  createNotification,
  getWalletsByUserId,
  updateWalletBalance,
  logAudit,
  getUserByOpenId,
} from "./db";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

export function registerStripeWebhook(app: Express) {
  // Must be registered BEFORE express.json() in the middleware chain
  // We register it here and use express.raw() for this specific route
  app.post(
    "/api/stripe/webhook",
    // Use raw body for Stripe signature verification
    (req: Request, res: Response, next) => {
      // If body is already parsed (Buffer), pass through; otherwise parse raw
      if (Buffer.isBuffer(req.body)) return next();
      let data = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => { data += chunk; });
      req.on("end", () => {
        (req as any).rawBody = data;
        next();
      });
    },
    async (req: Request, res: Response) => {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ error: "Stripe not configured" });
      }

      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event: Stripe.Event;

      try {
        const body = (req as any).rawBody ?? req.body;
        if (webhookSecret && sig) {
          event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
        } else {
          event = typeof body === "string" ? JSON.parse(body) : body;
        }
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return res.status(400).json({ error: "Webhook signature verification failed" });
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = parseInt(session.metadata?.user_id ?? "0");
            const walletId = parseInt(session.metadata?.wallet_id ?? "0");
            const amount = (session.amount_total ?? 0) / 100; // Convert cents to dollars
            const currency = (session.currency ?? "usd").toUpperCase();
            const reference = session.id;

            if (userId && amount > 0) {
              // Find user's wallet
              const wallets = await getWalletsByUserId(userId);
              const wallet = walletId
                ? wallets.find((w) => w.id === walletId)
                : wallets.find((w) => w.isDefault) ?? wallets[0];

              if (wallet) {
                // Record transaction
                await createTransaction({
                  userId,
                  walletId: wallet.id,
                  type: "deposit",
                  amount: amount.toFixed(2),
                  currency,
                  status: "completed",
                  reference,
                  description: `Stripe deposit via checkout`,
                });

                // Update wallet balance
                const newBalance = parseFloat(wallet.balance) + amount;
                await updateWalletBalance(wallet.id, newBalance.toFixed(2), newBalance.toFixed(2), wallet.margin);

                // Send notification
                await createNotification({
                  userId,
                  type: "withdrawal_update",
                  title: "Deposit Confirmed",
                  message: `$${amount.toFixed(2)} ${currency} has been credited to your wallet. Reference: ${reference}`,
                  metadata: { reference, amount, currency },
                });

                // Audit log
                await logAudit({
                  userId,
                  action: "account.deposit.stripe",
                  details: { amount, currency, reference, sessionId: session.id },
                });

                console.log(`[Stripe Webhook] Deposit of $${amount} credited to user ${userId}`);
              }
            }
            break;
          }

          case "payment_intent.payment_failed": {
            const pi = event.data.object as Stripe.PaymentIntent;
            const userId = parseInt(pi.metadata?.user_id ?? "0");
            if (userId) {
              await createNotification({
                userId,
                type: "withdrawal_update",
                title: "Payment Failed",
                message: `Your deposit payment failed. Please try again or contact support.`,
                metadata: { paymentIntentId: pi.id },
              });
            }
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
      } catch (err) {
        console.error("[Stripe Webhook] Processing error:", err);
        // Still return 200 to prevent Stripe retries for processing errors
      }

      res.json({ received: true });
    }
  );
}
