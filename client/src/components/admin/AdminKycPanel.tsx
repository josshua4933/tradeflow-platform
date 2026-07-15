import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminKycPanel() {
  const { data: kycDocs, isLoading, refetch } = trpc.admin.getAllKycDocuments.useQuery({ limit: 100 });
  const approveMutation = trpc.admin.approveKyc.useMutation();
  const rejectMutation = trpc.admin.rejectKyc.useMutation();

  const handleApprove = async (kycId: number) => {
    try {
      await approveMutation.mutateAsync({ kycId });
      toast.success("KYC approved");
      refetch();
    } catch (error) {
      toast.error("Failed to approve KYC");
    }
  };

  const handleReject = async (kycId: number) => {
    try {
      await rejectMutation.mutateAsync({ kycId, reason: "Rejected by admin" });
      toast.success("KYC rejected");
      refetch();
    } catch (error) {
      toast.error("Failed to reject KYC");
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
        <CardTitle>KYC Documents ({kycDocs?.length || 0})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Document Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kycDocs?.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-mono text-sm">{doc.id}</TableCell>
                <TableCell className="font-mono text-sm">{doc.userId}</TableCell>
                <TableCell className="capitalize">{doc.documentType}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    doc.status === "approved" ? "bg-green-100 text-green-800" :
                    doc.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {doc.status}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="space-x-2">
                  {doc.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(doc.id)}
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(doc.id)}
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
