import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminWithdrawalsPanel() {
  const { data: withdrawals, isLoading, refetch } = trpc.admin.getAllWithdrawals.useQuery({ limit: 100 });
  const approveMutation = trpc.admin.approveWithdrawal.useMutation();
  const rejectMutation = trpc.admin.rejectWithdrawal.useMutation();

  const handleApprove = async (transactionId: number) => {
    try {
      await approveMutation.mutateAsync({ transactionId });
      toast.success("Withdrawal approved");
      refetch();
    } catch (error) {
      toast.error("Failed to approve withdrawal");
    }
  };

  const handleReject = async (transactionId: number) => {
    try {
      await rejectMutation.mutateAsync({ transactionId, reason: "Rejected by admin" });
      toast.success("Withdrawal rejected");
      refetch();
    } catch (error) {
      toast.error("Failed to reject withdrawal");
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
        <CardTitle>Withdrawals ({withdrawals?.length || 0})</CardTitle>
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
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals?.map((withdrawal) => (
              <TableRow key={withdrawal.id}>
                <TableCell className="font-mono text-sm">{withdrawal.id}</TableCell>
                <TableCell className="font-mono text-sm">{withdrawal.userId}</TableCell>
                <TableCell className="font-semibold">${withdrawal.amount}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    withdrawal.status === "completed" ? "bg-green-100 text-green-800" :
                    withdrawal.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                    withdrawal.status === "processing" ? "bg-blue-100 text-blue-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {withdrawal.status}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{new Date(withdrawal.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="space-x-2">
                  {withdrawal.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(withdrawal.id)}
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(withdrawal.id)}
                        disabled={rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                    </>
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
