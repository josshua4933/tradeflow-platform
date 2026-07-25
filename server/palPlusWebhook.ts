import { Request, Response } from "express";
import { createTransaction, updateWalletBalance, getWalletsByUserId, createNotification } from "./db";
import { verifyPalPlussWebhook } from "./payplus";
import { getDb } from "./db";
import { transactions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Handle PalPlus webhook for payment confirmations
 */
export async function handlePalPlusWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers["x-palpluss-signature"] as string;
    
    // Handle raw body from express.raw() middleware
    let payload: string;
    if (Buffer.isBuffer(req.body)) {
      payload = req.body.toString('utf-8');
    } else if (typeof req.body === 'string') {
      payload = req.body;
    } else {
      payload = JSON.stringify(req.body);
    }

    // Verify webhook signature against raw payload
    if (!verifyPalPlussWebhook(payload, signature)) {
      console.warn("[PalPlus Webhook] Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Parse the payload to get the event
    const event = JSON.parse(payload);

    // Handle payment.completed event
    if (event.type === "payment.completed") {
      const { transactionId, amount, currency, metadata } = event.data;
      const userId = metadata?.userId;

      if (!userId) {
        console.error("[PalPlus Webhook] Missing userId in metadata");
        return res.status(400).json({ error: "Missing userId" });
      }

      // Update transaction status to completed
      await updateTransactionStatus(transactionId, "completed");

      // Get user's wallet
      const wallets = await getWalletsByUserId(userId);
      const wallet = wallets.find((w) => w.currency === currency) || wallets[0];

      if (wallet) {
        // Update wallet balance
        const newBalance = parseFloat(wallet.balance) + amount;
        await updateWalletBalance(wallet.id, newBalance.toFixed(2), newBalance.toFixed(2), wallet.margin);

        // Send notification
        await createNotification({
          userId,
          type: "trade_execution",
          title: "Deposit Successful",
          message: `${amount} ${currency} has been credited to your wallet. Transaction ID: ${transactionId}`,
          metadata: { transactionId, amount, currency },
        });
      }

      console.log(`[PalPlus Webhook] Deposit confirmed: ${transactionId}`);
      return res.json({ success: true });
    }

    // Handle payout.completed event
    if (event.type === "payout.completed") {
      const { payoutId, amount, currency, metadata } = event.data;
      const userId = metadata?.userId;

      if (!userId) {
        console.error("[PalPlus Webhook] Missing userId in metadata");
        return res.status(400).json({ error: "Missing userId" });
      }

      // Update transaction status to completed
      await updateTransactionStatus(payoutId, "completed");

      // Send notification
      await createNotification({
        userId,
        type: "withdrawal_update",
        title: "Withdrawal Completed",
        message: `${amount} ${currency} has been withdrawn. Payout ID: ${payoutId}`,
        metadata: { payoutId, amount, currency },
      });

      console.log(`[PalPlus Webhook] Payout completed: ${payoutId}`);
      return res.json({ success: true });
    }

    // Handle payout.failed event
    if (event.type === "payout.failed") {
      const { payoutId, amount, currency, metadata, reason } = event.data;
      const userId = metadata?.userId;

      if (!userId) {
        console.error("[PalPlus Webhook] Missing userId in metadata");
        return res.status(400).json({ error: "Missing userId" });
      }

      // Update transaction status to failed
      await updateTransactionStatus(payoutId, "failed");

      // Refund wallet (add amount back)
      const wallets = await getWalletsByUserId(userId);
      const wallet = wallets.find((w) => w.currency === currency) || wallets[0];

      if (wallet) {
        const newBalance = parseFloat(wallet.balance) + amount;
        await updateWalletBalance(wallet.id, newBalance.toFixed(2), newBalance.toFixed(2), wallet.margin);
      }

      // Send notification
      await createNotification({
        userId,
        type: "withdrawal_update",
        title: "Withdrawal Failed",
        message: `Withdrawal failed: ${reason}. ${amount} ${currency} has been refunded to your wallet.`,
        metadata: { payoutId, amount, currency, reason },
      });

      console.log(`[PalPlus Webhook] Payout failed: ${payoutId}`);
      return res.json({ success: true });
    }

    // Unknown event type
    console.warn(`[PalPlus Webhook] Unknown event type: ${event.type}`);
    return res.json({ success: true });
  } catch (error) {
    console.error("[PalPlus Webhook Error]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Update transaction status using proper DB helper
 */
async function updateTransactionStatus(transactionId: string, status: "pending" | "completed" | "failed" | "processing" | "cancelled") {
  try {
    const db = await getDb();
    if (!db) {
      console.error(`[PalPlus] Database unavailable for transaction ${transactionId}`);
      return;
    }

    // Update transaction by reference (which stores the PalPlus transaction ID)
    await db.update(transactions)
      .set({ status })
      .where(eq(transactions.reference, transactionId));

    console.log(`[PalPlus] Updated transaction ${transactionId} to status ${status}`);
  } catch (error) {
    console.error(`[PalPlus] Error updating transaction ${transactionId}:`, error);
  }
}
