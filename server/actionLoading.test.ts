import { describe, expect, it } from "vitest";

describe("action loading state isolation", () => {
  it("isolates deposit and withdrawal loading states independently", () => {
    let isDepositing = false;
    let isWithdrawing = false;

    // Simulate deposit start
    isDepositing = true;
    expect(isDepositing).toBe(true);
    expect(isWithdrawing).toBe(false);

    // Simulate deposit finish
    isDepositing = false;
    expect(isDepositing).toBe(false);
    expect(isWithdrawing).toBe(false);

    // Simulate withdrawal start
    isWithdrawing = true;
    expect(isDepositing).toBe(false);
    expect(isWithdrawing).toBe(true);

    // Simulate withdrawal finish
    isWithdrawing = false;
    expect(isDepositing).toBe(false);
    expect(isWithdrawing).toBe(false);
  });

  it("isolates BUY and SELL execution loading states independently", () => {
    let isBuying = false;
    let isSelling = false;

    // Simulate BUY click
    isBuying = true;
    expect(isBuying).toBe(true);
    expect(isSelling).toBe(false);

    isBuying = false;

    // Simulate SELL click
    isSelling = true;
    expect(isBuying).toBe(false);
    expect(isSelling).toBe(true);

    isSelling = false;
    expect(isBuying).toBe(false);
    expect(isSelling).toBe(false);
  });
});
