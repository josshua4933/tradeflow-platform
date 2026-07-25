import axios from "axios";

// Payplus configuration
const PAYPLUS_API_KEY = process.env.PAYPLUS_API_KEY || "";
const PAYPLUS_SECRET_KEY = process.env.PAYPLUS_SECRET_KEY || "";
const PAYPLUS_WEBHOOK_SECRET = process.env.PAYPLUS_WEBHOOK_SECRET || "";
const PAYPLUS_BASE_URL = "https://api.payplus.io";

interface PayplusDepositRequest {
  amount: number;
  currency: string;
  userId: number;
  userEmail: string;
  userName: string;
  returnUrl: string;
  notifyUrl: string;
}

interface PayplusWithdrawalRequest {
  amount: number;
  currency: string;
  userId: number;
  userEmail: string;
  accountNumber?: string;
  bankCode?: string;
}

interface PayplusResponse {
  success: boolean;
  transactionId?: string;
  checkoutUrl?: string;
  payoutId?: string;
  status?: string;
  error?: string;
}

/**
 * Create a Payplus deposit/payment session
 */
export async function createPayplusDeposit(
  req: PayplusDepositRequest
): Promise<PayplusResponse> {
  try {
    // Validate required fields
    if (!PAYPLUS_API_KEY || !PAYPLUS_SECRET_KEY) {
      console.error("[Payplus] Missing API credentials");
      return {
        success: false,
        error: "Payment gateway not configured",
      };
    }

    // Create payment request to Payplus
    const response = await axios.post(
      `${PAYPLUS_BASE_URL}/v1/payments/checkout`,
      {
        amount: Math.round(req.amount * 100), // Convert to cents
        currency: req.currency || "USD",
        description: `TradeFlow Deposit - User ${req.userId}`,
        customer: {
          email: req.userEmail,
          name: req.userName,
        },
        metadata: {
          userId: req.userId,
          type: "deposit",
        },
        returnUrl: req.returnUrl,
        notifyUrl: req.notifyUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYPLUS_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data && response.data.checkoutUrl) {
      return {
        success: true,
        transactionId: response.data.transactionId,
        checkoutUrl: response.data.checkoutUrl,
      };
    }

    return {
      success: false,
      error: "Failed to create checkout session",
    };
  } catch (error: any) {
    console.error("[Payplus Deposit Error]", error.message);
    return {
      success: false,
      error: error.message || "Payment processing failed",
    };
  }
}

/**
 * Create a Payplus withdrawal/payout
 */
export async function createPayplusPayout(
  req: PayplusWithdrawalRequest
): Promise<PayplusResponse> {
  try {
    if (!PAYPLUS_API_KEY || !PAYPLUS_SECRET_KEY) {
      console.error("[Payplus] Missing API credentials");
      return {
        success: false,
        error: "Payment gateway not configured",
      };
    }

    // Create payout request to Payplus
    const response = await axios.post(
      `${PAYPLUS_BASE_URL}/v1/payouts/create`,
      {
        amount: Math.round(req.amount * 100), // Convert to cents
        currency: req.currency || "USD",
        recipient: {
          email: req.userEmail,
          accountNumber: req.accountNumber,
          bankCode: req.bankCode,
        },
        metadata: {
          userId: req.userId,
          type: "withdrawal",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYPLUS_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data && response.data.payoutId) {
      return {
        success: true,
        payoutId: response.data.payoutId,
        status: response.data.status || "pending",
      };
    }

    return {
      success: false,
      error: "Failed to create payout",
    };
  } catch (error: any) {
    console.error("[Payplus Payout Error]", error.message);
    return {
      success: false,
      error: error.message || "Payout processing failed",
    };
  }
}

/**
 * Verify Payplus webhook signature
 */
export function verifyPayplusWebhook(
  payload: string,
  signature: string
): boolean {
  try {
    if (!PAYPLUS_WEBHOOK_SECRET) {
      console.warn("[Payplus] Webhook secret not configured");
      return false;
    }

    // Simple HMAC verification (adjust based on Payplus actual implementation)
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", PAYPLUS_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    return signature === expectedSignature;
  } catch (error) {
    console.error("[Payplus Webhook Verification Error]", error);
    return false;
  }
}

/**
 * Get payment status from Payplus
 */
export async function getPayplusPaymentStatus(
  transactionId: string
): Promise<PayplusResponse> {
  try {
    const response = await axios.get(
      `${PAYPLUS_BASE_URL}/v1/payments/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${PAYPLUS_API_KEY}`,
        },
      }
    );

    return {
      success: true,
      status: response.data.status,
      transactionId: response.data.transactionId,
    };
  } catch (error: any) {
    console.error("[Payplus Status Check Error]", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get payout status from Payplus
 */
export async function getPayplusPayoutStatus(
  payoutId: string
): Promise<PayplusResponse> {
  try {
    const response = await axios.get(
      `${PAYPLUS_BASE_URL}/v1/payouts/${payoutId}`,
      {
        headers: {
          Authorization: `Bearer ${PAYPLUS_API_KEY}`,
        },
      }
    );

    return {
      success: true,
      status: response.data.status,
      payoutId: response.data.payoutId,
    };
  } catch (error: any) {
    console.error("[Payplus Payout Status Error]", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
