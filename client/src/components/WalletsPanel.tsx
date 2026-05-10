import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, CreditCard, Bitcoin, Building2, Smartphone } from "lucide-react";

function DepositDialog({ walletId, currency }: { walletId: number; currency: string }) {
  const [amount, setAmount] = useState("100");
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const deposit = trpc.account.createDepositIntent.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast.info("Redirecting to secure payment...", {
          description: "Complete your deposit on the Stripe checkout page.",
        });
        window.open(data.checkoutUrl, "_blank");
        setOpen(false);
      } else {
        toast.success(`Deposit successful! Ref: ${data.reference}`, {
          description: `New balance: $${data.newBalance}`,
        });
        utils.account.wallets.invalidate();
        utils.account.transactions.invalidate();
        setOpen(false);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <ArrowDownLeft className="h-3.5 w-3.5" /> Deposit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Deposit Funds</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <CreditCard className="h-4 w-4" />, label: "Credit Card" },
                { icon: <Bitcoin className="h-4 w-4" />, label: "Crypto" },
                { icon: <Building2 className="h-4 w-4" />, label: "Bank Transfer" },
                { icon: <Smartphone className="h-4 w-4" />, label: "E-Wallet" },
              ].map((method) => (
                <div key={method.label} className="border border-border p-3 flex items-center gap-2 text-sm cursor-pointer hover:border-foreground/50 transition-colors">
                  {method.icon}
                  <span>{method.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Amount ({currency})</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="10"
              max="100000"
              step="10"
            />
            <div className="flex gap-2 mt-2">
              {["50", "100", "500", "1000"].map((v) => (
                <button key={v} onClick={() => setAmount(v)}
                  className="flex-1 text-xs py-1 border border-border hover:border-foreground/50 transition-colors">
                  ${v}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-border p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium tabular-nums">${parseFloat(amount || "0").toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processing Fee</span>
              <span className="font-medium text-bull">Free</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 mt-1">
              <span className="font-medium">Total Credit</span>
              <span className="font-bold tabular-nums">${parseFloat(amount || "0").toFixed(2)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => deposit.mutate({ amount: parseFloat(amount), currency, walletId, origin: window.location.origin })}
            disabled={deposit.isPending || !amount || parseFloat(amount) < 10}
          >
            {deposit.isPending ? "Processing..." : `Deposit $${amount}`}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Deposits are processed instantly. PCI-DSS compliant.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({ walletId, currency, balance }: { walletId: number; currency: string; balance: string }) {
  const [amount, setAmount] = useState("100");
  const [method, setMethod] = useState<"bank_transfer" | "card" | "crypto" | "ewallet">("bank_transfer");
  const [destination, setDestination] = useState("");
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const withdraw = trpc.account.requestWithdrawal.useMutation({
    onSuccess: (data) => {
      toast.success(`Withdrawal submitted! Ref: ${data.reference}`, {
        description: "Processing within 1-3 business days.",
      });
      utils.account.wallets.invalidate();
      utils.account.transactions.invalidate();
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <ArrowUpRight className="h-3.5 w-3.5" /> Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Withdraw Funds</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Withdrawal Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
                <SelectItem value="ewallet">E-Wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {method === "bank_transfer" ? "IBAN / Account Number" : method === "crypto" ? "Wallet Address" : "Account / Email"}
            </Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={method === "bank_transfer" ? "GB29 NWBK 6016 1331 9268 19" : method === "crypto" ? "0x..." : "account@example.com"}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Amount ({currency})</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="10" max={balance} />
            <p className="text-xs text-muted-foreground mt-1">Available: ${parseFloat(balance).toFixed(2)}</p>
          </div>

          <Button
            className="w-full"
            onClick={() => withdraw.mutate({ amount: parseFloat(amount), currency, method, destination, walletId })}
            disabled={withdraw.isPending || !amount || parseFloat(amount) < 10 || !destination}
          >
            {withdraw.isPending ? "Submitting..." : `Withdraw $${amount}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WalletsPanel() {
  const { data: wallets, isLoading } = trpc.account.wallets.useQuery();
  const { data: transactions } = trpc.account.transactions.useQuery();
  const utils = trpc.useUtils();

  const createWallet = trpc.account.createWallet.useMutation({
    onSuccess: () => {
      toast.success("Wallet created");
      utils.account.wallets.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const currencyFlags: Record<string, string> = {
    USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", BTC: "₿", ETH: "Ξ"
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-px w-6 bg-foreground/30"></div>
            <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Finance</span>
          </div>
          <h1 className="font-serif text-3xl font-bold">Wallets</h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Wallet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-serif">Create New Wallet</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {(["EUR", "GBP", "BTC", "ETH"] as const).map((currency) => (
                <Button
                  key={currency}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => createWallet.mutate({ currency })}
                  disabled={createWallet.isPending || wallets?.some((w) => w.currency === currency)}
                >
                  <span className="text-lg">{currencyFlags[currency]}</span>
                  <span>{currency} Wallet</span>
                  {wallets?.some((w) => w.currency === currency) && (
                    <span className="ml-auto text-xs text-muted-foreground">Exists</span>
                  )}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Wallets Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="border border-border p-5 animate-pulse">
              <div className="h-4 bg-secondary rounded w-20 mb-3"></div>
              <div className="h-8 bg-secondary rounded w-32"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {wallets?.map((wallet) => (
            <div key={wallet.id} className="border border-border p-5 bg-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{currencyFlags[wallet.currency] ?? "💰"}</span>
                  <div>
                    <div className="text-xs tracking-widest uppercase text-muted-foreground">{wallet.currency}</div>
                    {wallet.isDefault && <div className="text-[10px] text-muted-foreground">Default</div>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <DepositDialog walletId={wallet.id} currency={wallet.currency} />
                  <WithdrawDialog walletId={wallet.id} currency={wallet.currency} balance={wallet.balance} />
                </div>
              </div>
              <div className="font-serif text-3xl font-bold tabular-nums mb-1">
                {wallet.currency === "BTC" || wallet.currency === "ETH"
                  ? parseFloat(wallet.balance).toFixed(8)
                  : `$${parseFloat(wallet.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>Equity: ${parseFloat(wallet.equity).toFixed(2)}</div>
                <div>Margin Used: ${parseFloat(wallet.margin).toFixed(2)}</div>
                <div>Leverage: 1:{wallet.leverage}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction History */}
      <div className="border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm">Transaction History</h2>
        </div>
        {transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Date", "Type", "Amount", "Currency", "Status", "Reference"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 capitalize font-medium">{tx.type.replace("_", " ")}</td>
                    <td className={`px-4 py-2.5 tabular-nums font-medium ${tx.type === "deposit" || tx.type === "trade_profit" ? "text-bull" : "text-bear"}`}>
                      {tx.type === "deposit" || tx.type === "trade_profit" ? "+" : "-"}${parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5">{tx.currency}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        tx.status === "completed" ? "bg-bull/10 text-bull" :
                        tx.status === "processing" ? "bg-yellow-500/10 text-yellow-600" :
                        "bg-bear/10 text-bear"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-[10px]">{tx.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Wallet className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            No transactions yet. Make your first deposit to start trading.
          </div>
        )}
      </div>
    </div>
  );
}
