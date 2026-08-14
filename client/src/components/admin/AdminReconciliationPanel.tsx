import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

export default function AdminReconciliationPanel() {
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [targetBalance, setTargetBalance] = useState("");
  const [reason, setReason] = useState("");
  const { data: report, isLoading, isFetching, refetch } = trpc.admin.getWalletReconciliationReport.useQuery();
  const utils = trpc.useUtils();
  const reconcile = trpc.admin.reconcileUserBalance.useMutation({
    onSuccess: () => {
      toast.success("Wallet reconciled and adjustment recorded");
      setSelectedWalletId(null);
      setTargetBalance("");
      setReason("");
      void utils.admin.getWalletReconciliationReport.invalidate();
      void utils.admin.getUserWallets.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const selected = report?.find((row) => row.walletId === selectedWalletId);
  const balancedCount = report?.filter((row) => row.isBalanced).length ?? 0;

  const submit = () => {
    const target = Number(targetBalance);
    if (!selected || !Number.isFinite(target) || target < 0 || reason.trim().length < 3) {
      toast.error("Choose a wallet, enter a non-negative target balance, and provide a reason");
      return;
    }
    reconcile.mutate({
      userId: selected.userId,
      walletId: selected.walletId,
      currency: selected.currency,
      targetBalance: target,
      reason: reason.trim(),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div><CardTitle>Wallet reconciliation</CardTitle><p className="mt-1 text-sm text-muted-foreground">{balancedCount} of {report?.length ?? 0} wallets currently match the auditable ledger total.</p></div>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}><RefreshCcw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Refresh</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Wallet</TableHead><TableHead>Stored balance</TableHead><TableHead>Ledger total</TableHead><TableHead>Drift</TableHead><TableHead>Pending / reserved</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>{report?.map((row) => (
              <TableRow key={row.walletId} data-state={row.walletId === selectedWalletId ? "selected" : undefined}>
                <TableCell><div className="font-medium">{row.userName}</div><div className="text-xs text-muted-foreground">{row.userEmail}</div></TableCell>
                <TableCell>{row.currency} <span className="text-xs text-muted-foreground">#{row.walletId}</span></TableCell>
                <TableCell>{row.storedBalance}</TableCell>
                <TableCell>{row.ledgerNet}</TableCell>
                <TableCell className={row.isBalanced ? "text-emerald-600" : "text-amber-600"}>{row.discrepancy}</TableCell>
                <TableCell><div className="text-xs">Deposits: {row.pendingDeposits}</div><div className="text-xs">Withdrawals: {row.reservedWithdrawals}</div></TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => { setSelectedWalletId(row.walletId); setTargetBalance(row.storedBalance); setReason(""); }}>Reconcile</Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader><CardTitle>Reconcile wallet #{selected.walletId}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
            <div><Label htmlFor="target-balance">Target balance ({selected.currency})</Label><Input id="target-balance" type="number" min="0" step="0.01" value={targetBalance} onChange={(event) => setTargetBalance(event.target.value)} /></div>
            <div><Label htmlFor="reconciliation-reason">Reason</Label><Input id="reconciliation-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the verified source for this target" /></div>
            <Button onClick={submit} disabled={reconcile.isPending}>{reconcile.isPending ? "Saving…" : "Apply audited correction"}</Button>
            <p className="text-xs text-muted-foreground md:col-span-3">This does not silently overwrite the wallet. It creates an admin ledger adjustment and audit record for the difference between the current balance and the target.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
