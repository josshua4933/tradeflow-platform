import axios from "axios";

// PalPluss configuration
const PALPLUSS_API_KEY = process.env.PALPLUSS_API_KEY || "";
const PALPLUSS_WEBHOOK_SECRET = process.env.PALPLUSS_WEBHOOK_SECRET || "";
const PALPLUSS_BASE_URL = "https://api.palpluss.com";

// Currency conversion rates (fixed for now, can be updated dynamically)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.10,
  GBP: 1.27,
  JPY: 0.0067,
  AUD: 0.65,
  CAD: 0.74,
  CHF: 1.12,
  CNY: 0.14,
  INR: 0.012,
  ZAR: 0.053,
};

const KSH_RATE = 130; // 1 USD = 130 KSH

/**
 * Get exchange rate for a currency
 */
export function getExchangeRate(currency: string): number {
  return EXCHANGE_RATES[currency] || 1;
}

/**
 * Convert any currency to KSH
 */
export function convertToKSH(amount: number, currency: string): number {
  const usdAmount = amount / getExchangeRate(currency);
  return Math.round(usdAmount * KSH_RATE);
}

/**
 * Convert KSH to any currency
 */
export function convertFromKSH(kshAmount: number, currency: string): number {
  const usdAmount = kshAmount / KSH_RATE;
  return Math.round((usdAmount * getExchangeRate(currency)) * 100) / 100;
}

/**
 * Convert USD amount to KSH (legacy)
 */
export function convertUSDToKSH(usdAmount: number): number {
  return Math.round(usdAmount * KSH_RATE);
}

/**
 * Convert KSH amount to USD (legacy)
 */
export function convertKSHToUSD(kshAmount: number): number {
  return Math.round((kshAmount / KSH_RATE) * 100) / 100;
}

interface PalPlussSTKPushRequest {
  amount: number;
  userId: number;
  phoneNumber: string;
  accountReference: string;
  currency?: string; // Added currency support
}

interface PalPlussResponse {
  success: boolean;
  transactionId?: string;
  status?: string;
  error?: string;
}

/**
 * Create a PalPluss STK push for M-Pesa deposits
 * Sends STK prompt to user's phone for payment
 */
export async function createPalPlussSTKPush(
  req: PalPlussSTKPushRequest
): Promise<PalPlussResponse> {
  try {
    if (!PALPLUSS_API_KEY) {
      console.error("[PalPluss] Missing API credentials");
      return {
        success: false,
        error: "Payment gateway not configured",
      };
    }

    // Encode API key for Basic Authentication
    const basicAuth = Buffer.from(`${PALPLUSS_API_KEY}:`).toString("base64");

    // Convert amount to KSH for PalPluss
    const currency = req.currency || "USD";
    const amountInKSH = convertToKSH(req.amount, currency);

    console.log(`[PalPluss] Initiating STK push for user ${req.userId}, phone: ${req.phoneNumber}, amount: ${req.amount} ${currency} = ${amountInKSH} KSH`);

    // Create STK push request to PalPluss
    const response = await axios.post(
      `${PALPLUSS_BASE_URL}/v1/payments/stk`,
      {
        phone: req.phoneNumber,
        amount: amountInKSH,
        accountReference: req.accountReference,
      },
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`[PalPluss] STK push response:`, response.data);

    if (response.data && response.data.transactionId) {
      return {
        success: true,
        transactionId: response.data.transactionId,
        status: response.data.status || "pending",
      };
    }

    return {
      success: false,
      error: "Failed to initiate STK push",
    };
  } catch (error: any) {
    console.error("[PalPluss STK Push Error]", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message || "STK push failed",
    };
  }
}

/**
 * Verify PalPluss webhook signature
 */
export function verifyPalPlussWebhook(payload: string, signature: string): boolean {
  try {
    const crypto = require("crypto");
    const hash = crypto
      .createHmac("sha256", PALPLUSS_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    return hash === signature;
  } catch (error) {
    console.error("[PalPluss Webhook Verification Error]", error);
    return false;
  }
}

/**
 * Create a PalPluss withdrawal/payout
 */
export async function createPalPlussWithdrawal(
  req: PalPlussSTKPushRequest
): Promise<PalPlussResponse> {
  try {
    if (!PALPLUSS_API_KEY) {
      console.error("[PalPluss] Missing API credentials");
      return {
        success: false,
        error: "Payment gateway not configured",
      };
    }

    const basicAuth = Buffer.from(`${PALPLUSS_API_KEY}:`).toString("base64");

    console.log(`[PalPluss] Initiating withdrawal for user ${req.userId}, phone: ${req.phoneNumber}, amount: ${req.amount}`);

    // Create withdrawal request to PalPluss
    const response = await axios.post(
      `${PALPLUSS_BASE_URL}/v1/withdrawals/create`,
      {
        phone: req.phoneNumber,
        amount: req.amount,
        accountReference: req.accountReference,
      },
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`[PalPluss] Withdrawal response:`, response.data);

    if (response.data && response.data.withdrawalId) {
      return {
        success: true,
        transactionId: response.data.withdrawalId,
        status: response.data.status || "pending",
      };
    }

    return {
      success: false,
      error: "Failed to initiate withdrawal",
    };
  } catch (error: any) {
    console.error("[PalPluss Withdrawal Error]", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message || "Withdrawal failed",
    };
  }
}

/**
 * Get payout status from PalPluss
 */
export async function getPalPlussPaymentStatus(transactionId: string): Promise<any> {
  try {
    const basicAuth = Buffer.from(`${PALPLUSS_API_KEY}:`).toString("base64");

    const response = await axios.get(
      `${PALPLUSS_BASE_URL}/v1/payments/${transactionId}`,
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("[PalPluss Get Payment Status Error]", error.message);
    return null;
  }
}
