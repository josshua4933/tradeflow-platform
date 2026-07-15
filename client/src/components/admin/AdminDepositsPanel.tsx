import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminDepositsPanel() {
  const { data: deposits, isLoading, refetch } = trpc.admin.getAllDeposits.useQuery({ limit: 100 });
  const confirmMutation = trpc.admin.confirmDeposit.useMutation();

  const handleConfirm = async (transactionId: number) => {
    try {
      await confirmMutation.mutateAsync({ transactionId });
      toast.success("Deposit confirmed");
      refetch();
    } catch (error) {
      toast.error("Failed to confirm deposit");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposits ({deposits?.length || 0})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deposits?.map((deposit) => (
              <TableRow key={deposit.id}>
                <TableCell className="font-mono text-sm">{deposit.id}</TableCell>
                <TableCell className="font-mono text-sm">{deposit.userId}</TableCell>
                <TableCell className="font-semibold">${deposit.amount}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    deposit.status === "completed" ? "bg-green-100 text-green-800" :
                    deposit.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {deposit.status}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{new Date(deposit.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {deposit.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(deposit.id)}
                      disabled={confirmMutation.isPending}
                    >
                      {confirmMutation.isPending ? "..." : "Confirm"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
