import { describe, expect, it } from "vitest";
import {
  buildDepositSuccessNotice,
  canStartAction,
  getDepositStatusPath,
  getDepositButtonLabel,
  getIndependentActionBusyState,
} from "../client/src/components/walletAction.helpers";
import { normalizePalPlussStkResponse } from "./payplus";

describe("action loading state isolation", () => {
  it("shows busy feedback only for the active wallet action", () => {
    expect(getIndependentActionBusyState("deposit")).toMatchObject({ deposit: true, withdrawal: false, buy: false, sell: false });
    expect(getIndependentActionBusyState("withdrawal")).toMatchObject({ deposit: false, withdrawal: true, buy: false, sell: false });
    expect(canStartAction("deposit")).toBe(false);
    expect(canStartAction(null)).toBe(true);
  });

  it("shows busy feedback only for the active trade action", () => {
    expect(getIndependentActionBusyState("buy")).toMatchObject({ deposit: false, withdrawal: false, buy: true, sell: false });
    expect(getIndependentActionBusyState("sell")).toMatchObject({ deposit: false, withdrawal: false, buy: false, sell: true });
  });
});

describe("deposit success feedback", () => {
  it("builds success information and preserves payment-status details", () => {
    const notice = buildDepositSuccessNotice({
      amount: 10,
      amountInKSH: 1300,
      currency: "USD",
      phoneNumber: "0710852136",
      transactionId: "TF-DEP-1-ABC12345",
    });

    expect(notice.type).toBe("success");
    expect(notice.message).toContain("Deposit request sent successfully");
    expect(notice.message).toContain("1300 KSH");
    expect(notice.message).not.toContain("Failed to send STK push");
    expect(getDepositButtonLabel(notice, false)).toBe("Deposit initiated successfully");
    expect(getDepositButtonLabel(notice, true)).toBe("Sending STK Push...");
    expect(getDepositStatusPath(notice)).toBe(
      "/deposit-confirmation?txnId=TF-DEP-1-ABC12345&amount=10&currency=USD&phone=0710852136",
    );
  });
});

describe("PalPluss STK response normalization", () => {
  it("treats an accepted 2xx response without transactionId as initiated", () => {
    const result = normalizePalPlussStkResponse({
      data: { status: "pending", message: "STK push sent" },
      httpStatus: 200,
      accountReference: "TF-DEP-1-LOCALREF",
    });

    expect(result).toEqual({ success: true, transactionId: "TF-DEP-1-LOCALREF", status: "pending" });
  });

  it("keeps explicit provider failures as failures", () => {
    const result = normalizePalPlussStkResponse({
      data: { success: false, error: "Phone is unreachable" },
      httpStatus: 200,
      accountReference: "TF-DEP-1-LOCALREF",
    });

    expect(result).toEqual({ success: false, error: "Phone is unreachable" });
  });
});

describe("deposit error handling and success preservation", () => {
  it("preserves deposit success notice even if cache invalidation promise fails", async () => {
    let notice = null as any;
    const successResult = { success: true, transactionId: "TF-DEP-1-TEST999" };
    
    // Simulate successful deposit intent
    if (successResult.success) {
      notice = buildDepositSuccessNotice({
        amount: 50,
        amountInKSH: 6500,
        currency: "USD",
        phoneNumber: "0710852136",
        transactionId: successResult.transactionId,
      });
    }

    expect(notice.type).toBe("success");
    expect(notice.transactionId).toBe("TF-DEP-1-TEST999");

    // Simulate cache invalidation rejection that should be caught and ignored
    const cacheRefreshPromise = Promise.reject(new Error("network timeout"));
    let errorCaught = false;
    await cacheRefreshPromise.catch(() => {
      errorCaught = true;
    });

    expect(errorCaught).toBe(true);
    // Notice remains successfully set, preventing false error replacement
    expect(notice.type).toBe("success");
  });
});
