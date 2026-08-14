import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, WalletCards } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsersPanel() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const { data: users, isLoading } = trpc.admin.getAllUsers.useQuery({ limit: 100 });
  const { data: selectedWallets, isLoading: walletsLoading } = trpc.admin.getUserWallets.useQuery(
    { userId: selectedUserId ?? 0 },
    { enabled: selectedUserId !== null },
  );
  const utils = trpc.useUtils();
  const adjustBalance = trpc.admin.adjustUserBalance.useMutation({
    onSuccess: () => {
      toast.success("Balance adjusted and recorded in the ledger");
      setDelta("");
      setReason("");
      void utils.admin.getUserWallets.invalidate();
      void utils.admin.getUserDetails.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const selectedUser = users?.find((user) => user.id === selectedUserId);
  const selectedWallet = selectedWallets?.find((wallet) => wallet.isDefault) ?? selectedWallets?.[0];
  const amount = Number(delta);

  const submitAdjustment = () => {
    if (!selectedUser || !selectedWallet || !Number.isFinite(amount) || amount === 0 || reason.trim().length < 3) {
      toast.error("Select a wallet, enter a non-zero amount, and provide a reason");
      return;
    }
    adjustBalance.mutate({
      userId: selectedUser.id,
      walletId: selectedWallet.id,
      currency: selectedWallet.currency,
      delta: amount,
      reason: reason.trim(),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Users ({users?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Created</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>{users?.map((user) => (
              <TableRow key={user.id} data-state={selectedUserId === user.id ? "selected" : undefined}>
                <TableCell className="font-mono text-sm">{user.id}</TableCell>
                <TableCell>{user.name || "—"}</TableCell>
                <TableCell className="text-sm">{user.email || "—"}</TableCell>
                <TableCell><span className={`rounded px-2 py-1 text-xs font-semibold ${user.role === "admin" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>{user.role}</span></TableCell>
                <TableCell className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell><Button type="button" size="sm" variant="outline" onClick={() => setSelectedUserId(user.id)}><WalletCards className="mr-1 h-3.5 w-3.5" />Balance</Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedUserId !== null && (
        <Card>
          <CardHeader><CardTitle>Adjust balance · {selectedUser?.name || selectedUser?.email || `User ${selectedUserId}`}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
            <div><Label>Wallet</Label><div className="mt-2 rounded border px-3 py-2 text-sm">{walletsLoading ? "Loading…" : selectedWallet ? `${selectedWallet.currency} · ${selectedWallet.balance}` : "No wallet"}</div></div>
            <div><Label htmlFor="balance-delta">Adjustment</Label><Input id="balance-delta" type="number" step="0.01" value={delta} onChange={(event) => setDelta(event.target.value)} placeholder="+100 or -25" /></div>
            <div><Label htmlFor="balance-reason">Reason</Label><Input id="balance-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Documented reason for the adjustment" /></div>
            <Button type="button" onClick={submitAdjustment} disabled={adjustBalance.isPending || !selectedWallet}>{adjustBalance.isPending ? "Saving…" : "Save adjustment"}</Button>
            <p className="text-xs text-muted-foreground md:col-span-4">Positive values credit the wallet; negative values debit it. Every adjustment creates a completed ledger transaction and an administrator audit trail.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
