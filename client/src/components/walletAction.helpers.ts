export type DepositSuccessNotice = {
  type: "success";
  message: string;
  transactionId: string;
  amount: number;
  currency: string;
  phoneNumber: string;
};

export type ActionKind = "deposit" | "withdrawal" | "buy" | "sell";

export function buildDepositSuccessNotice(input: {
  amount: number;
  amountInKSH: number;
  currency: string;
  phoneNumber: string;
  transactionId: string;
}): DepositSuccessNotice {
  return {
    type: "success",
    message: `Deposit request sent successfully. ${input.amountInKSH} KSH STK push sent to your phone. Complete the payment to credit your wallet.`,
    transactionId: input.transactionId,
    amount: input.amount,
    currency: input.currency,
    phoneNumber: input.phoneNumber,
  };
}

export function getDepositStatusPath(notice: Pick<DepositSuccessNotice, "transactionId" | "amount" | "currency" | "phoneNumber">) {
  const params = new URLSearchParams({
    txnId: notice.transactionId,
    amount: String(notice.amount),
    currency: notice.currency,
    phone: notice.phoneNumber,
  });
  return `/deposit-confirmation?${params.toString()}`;
}

export function getIndependentActionBusyState(activeAction: ActionKind | null) {
  return {
    deposit: activeAction === "deposit",
    withdrawal: activeAction === "withdrawal",
    buy: activeAction === "buy",
    sell: activeAction === "sell",
  };
}

export function canStartAction(activeAction: ActionKind | null) {
  return activeAction === null;
}
