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
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: wallets, isLoading: walletsLoading } = trpc.account.wallets.useQuery();
  const depositMutation = trpc.account.createDepositIntent.useMutation();
  const transactionsMutation = trpc.account.transactions.useQuery({ limit: 50 });

  const KSH_RATE = 130;
  const currencyData = SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency);
  const usdEquivalent = depositAmount ? parseFloat(depositAmount) / (currencyData?.rate || 1) : 0;
  const amountInKSH = depositAmount ? Math.round(usdEquivalent * KSH_RATE) : 0;

  const handleDeposit = async () => {
    if (!depositAmount || !selectedWallet || !phoneNumber) {
      toast.error("Please enter amount, phone number, and select wallet");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await depositMutation.mutateAsync({
        amount: parseFloat(depositAmount),
        currency: selectedCurrency as "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF" | "CNY" | "INR" | "ZAR",
        phoneNumber,
        walletId: selectedWallet,
        origin: window.location.origin,
      });

      if (result.success) {
        toast.success(`STK push sent for ${amountInKSH} KSH! Check your phone.`);
        // Redirect to confirmation page
        setTimeout(() => {
          setLocation(`/deposit-confirmation?txnId=${result.transactionId}&amount=${depositAmount}&currency=USD&phone=${phoneNumber}`);
        }, 500);
        setDepositAmount("");
        setPhoneNumber("");
      }
    } catch (error: any) {
      // Error is already handled by tRPC, just show generic message
      toast.error("Failed to send STK push. Please try again.");
    } finally {
      setIsProcessing(false);
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
              disabled={isProcessing}
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
              onChange={(e) => setDepositAmount(e.target.value)}
              min="10"
              max="100000"
              disabled={isProcessing}
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
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground mt-1">STK push will be sent to this number</p>
          </div>

          <Button
            onClick={handleDeposit}
            disabled={!selectedWallet || !depositAmount || !phoneNumber || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending STK Push...
              </>
            ) : (
              "Send STK Push"
            )}
          </Button>
        </CardContent>
      </Card>

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
