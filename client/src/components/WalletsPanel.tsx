import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { buildDepositSuccessNotice, canStartAction, getDepositButtonLabel, getDepositStatusPath, getIndependentActionBusyState } from "./walletAction.helpers";

const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar", rate: 1 },
  { code: "EUR", name: "Euro", rate: 1.10 },
  { code: "GBP", name: "British Pound", rate: 1.27 },
  { code: "AUD", name: "Australian Dollar", rate: 0.65 },
  { code: "CAD", name: "Canadian Dollar", rate: 0.74 },
];

export default function WalletsPanel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [depositAmount, setDepositAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<number | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  
  const [activeWalletAction, setActiveWalletAction] = useState<"deposit" | "withdrawal" | null>(null);
  const { deposit: isDepositing, withdrawal: isWithdrawing } = getIndependentActionBusyState(activeWalletAction);
  const [depositNotice, setDepositNotice] = useState<ReturnType<typeof buildDepositSuccessNotice> | { type: "error"; message: string } | null>(null);

  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalPhone, setWithdrawalPhone] = useState("");
  const [selectedWithdrawalWallet, setSelectedWithdrawalWallet] = useState<number | null>(null);

  const { data: wallets, isLoading: walletsLoading } = trpc.account.wallets.useQuery();
  const depositMutation = trpc.account.createDepositIntent.useMutation();
  const withdrawalMutation = trpc.account.createWithdrawal.useMutation();
  const transactionsMutation = trpc.account.transactions.useQuery({ limit: 50 });
  const utils = trpc.useUtils();

  const KSH_RATE = 130;
  const currencyData = SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency);
  const usdEquivalent = depositAmount ? parseFloat(depositAmount) / (currencyData?.rate || 1) : 0;
  const amountInKSH = depositAmount ? Math.round(usdEquivalent * KSH_RATE) : 0;

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || !selectedWithdrawalWallet || !withdrawalPhone) {
      toast.error("Please enter amount, phone number, and select wallet");
      return;
    }

    if (!canStartAction(activeWalletAction)) return;
    setActiveWalletAction("withdrawal");
    try {
      const result = await withdrawalMutation.mutateAsync({
        amount: parseFloat(withdrawalAmount),
        walletId: selectedWithdrawalWallet,
        phoneNumber: withdrawalPhone,
      });

      if (result.success) {
        toast.success(`Withdrawal of $${withdrawalAmount} initiated! Check your phone for confirmation.`);
        setWithdrawalAmount("");
        setWithdrawalPhone("");
        setSelectedWithdrawalWallet(null);
      }
    } catch (error: any) {
      toast.error("Failed to process withdrawal. Please try again.");
    } finally {
      setActiveWalletAction(null);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || !selectedWallet || !phoneNumber) {
      toast.error("Please enter amount, phone number, and select wallet");
      return;
    }

    if (!canStartAction(activeWalletAction)) return;
    setDepositNotice(null);
    setActiveWalletAction("deposit");
    try {
      const result = await depositMutation.mutateAsync({
        amount: parseFloat(depositAmount),
        currency: selectedCurrency as "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF" | "CNY" | "INR" | "ZAR",
        phoneNumber,
        walletId: selectedWallet,
        origin: window.location.origin,
      });

      if (result.success) {
        setDepositNotice(buildDepositSuccessNotice({
          amount: parseFloat(depositAmount),
          amountInKSH,
          currency: selectedCurrency,
          phoneNumber,
          transactionId: result.transactionId,
        }));
        toast.success("Deposit initiated successfully", { description: `Complete the ${amountInKSH} KSH payment on your phone.` });
        void Promise.all([
          utils.account.transactions.invalidate(),
          utils.account.wallets.invalidate(),
        ]).catch(() => {
          // The deposit request already succeeded; a cache refresh failure must not replace success feedback with an error.
        });
        setDepositAmount("");
        setPhoneNumber("");
      }
    } catch (error: any) {
      setDepositNotice({ type: "error", message: error?.message || "The deposit request could not be completed. Please try again." });
      toast.error("Deposit request could not be completed");
    } finally {
      setActiveWalletAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallets */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">My Wallets</CardTitle>
          <CardDescription>Manage your trading wallets</CardDescription>
        </CardHeader>
        <CardContent>
          {walletsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin" />
            </div>
          ) : wallets && wallets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="p-4 border border-border rounded-lg cursor-pointer hover:bg-accent transition"
                  onClick={() => setSelectedWallet(wallet.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{wallet.currency}</p>
                      <p className="text-sm text-muted-foreground">Balance</p>
                    </div>
                    {selectedWallet === wallet.id && (
                      <div className="w-4 h-4 rounded-full bg-accent"></div>
                    )}
                  </div>
                  <p className="text-2xl font-bold">${parseFloat(wallet.balance).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-2">Margin: ${parseFloat(wallet.margin).toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No wallets found</p>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Withdraw Funds</CardTitle>
          <CardDescription>Withdraw funds from your trading account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="withdrawal-wallet">Select Wallet</Label>
            <select
              id="withdrawal-wallet"
              value={selectedWithdrawalWallet || ""}
              onChange={(e) => setSelectedWithdrawalWallet(e.target.value ? parseInt(e.target.value) : null)}
              disabled={isWithdrawing || Boolean(activeWalletAction && activeWalletAction !== "withdrawal")}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="">Choose a wallet...</option>
              {wallets?.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.currency} - ${parseFloat(wallet.balance).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="withdrawal-amount">Amount (USD)</Label>
            <Input
              id="withdrawal-amount"
              type="number"
              placeholder="Enter amount"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
              min="1"
              max="100000"
              disabled={isWithdrawing || Boolean(activeWalletAction && activeWalletAction !== "withdrawal")}
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum: $1 | Maximum: $100,000</p>
          </div>

          <div>
            <Label htmlFor="withdrawal-phone">Phone Number</Label>
            <Input
              id="withdrawal-phone"
              type="tel"
              placeholder="Enter your phone number"
              value={withdrawalPhone}
              onChange={(e) => setWithdrawalPhone(e.target.value)}
              disabled={isWithdrawing || Boolean(activeWalletAction && activeWalletAction !== "withdrawal")}
            />
            <p className="text-xs text-muted-foreground mt-1">Confirmation will be sent to this number</p>
          </div>

          <Button
            onClick={handleWithdrawal}
            disabled={!selectedWithdrawalWallet || !withdrawalAmount || !withdrawalPhone || Boolean(activeWalletAction)}
            className="w-full"
          >
            {isWithdrawing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Withdrawal...
              </>
            ) : (
              "Initiate Withdrawal"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Deposit */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Deposit Funds</CardTitle>
          <CardDescription>Add funds to your trading account via Payplus</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              disabled={isDepositing || Boolean(activeWalletAction && activeWalletAction !== "deposit")}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} - {curr.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="deposit-amount">Amount ({selectedCurrency})</Label>
            <Input
              id="deposit-amount"
              type="number"
              placeholder="Enter amount"
              value={depositAmount}
              onChange={(e) => { setDepositAmount(e.target.value); setDepositNotice(null); }}
              min="10"
              max="100000"
              disabled={isDepositing || Boolean(activeWalletAction && activeWalletAction !== "deposit")}
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum: 10 {selectedCurrency} | Maximum: 100,000 {selectedCurrency}</p>
            {depositAmount && (
              <p className="text-sm font-semibold mt-2 text-accent">
                You will be charged: {amountInKSH} KSH (~${usdEquivalent.toFixed(2)} USD)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="phone-number">Phone Number</Label>
            <Input
              id="phone-number"
              type="tel"
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value); setDepositNotice(null); }}
              disabled={isDepositing || Boolean(activeWalletAction && activeWalletAction !== "deposit")}
            />
            <p className="text-xs text-muted-foreground mt-1">STK push will be sent to this number</p>
          </div>

          <Button
            onClick={handleDeposit}
            disabled={!selectedWallet || !depositAmount || !phoneNumber || Boolean(activeWalletAction)}
            className="w-full"
          >
              {isDepositing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {getDepositButtonLabel(depositNotice, isDepositing)}
          </Button>
        </CardContent>
      </Card>

      {depositNotice && (
        <Card className={depositNotice.type === "success" ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"} role="status" aria-live="polite">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={`font-semibold ${depositNotice.type === "success" ? "text-green-800" : "text-red-800"}`}>
                {depositNotice.type === "success" ? "Deposit request successful" : "Deposit request not completed"}
              </p>
              <p className={`mt-1 text-sm ${depositNotice.type === "success" ? "text-green-700" : "text-red-700"}`}>{depositNotice.message}</p>
            </div>
            {depositNotice.type === "success" && depositNotice.transactionId && (
              <Button
                variant="outline"
                className="shrink-0 border-green-400 bg-white text-green-800 hover:bg-green-100"
                onClick={() => setLocation(getDepositStatusPath(depositNotice))}
              >
                View payment status
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Transaction History</CardTitle>
          <CardDescription>Recent deposits and withdrawals</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsMutation.data && transactionsMutation.data.length > 0 ? (
            <div className="space-y-2">
              {transactionsMutation.data.map((tx: any) => (
                <div key={tx.id} className="flex justify-between items-center p-3 border border-border rounded">
                  <div>
                    <p className="font-semibold capitalize">{tx.type}</p>
                    <p className="text-sm text-muted-foreground">{tx.reference}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.type === "deposit" ? "text-green-600" : "text-red-600"}`}>
                      {tx.type === "deposit" ? "+" : "-"}${parseFloat(tx.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
