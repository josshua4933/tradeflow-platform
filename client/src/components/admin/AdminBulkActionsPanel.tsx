import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, Mail, Ban } from "lucide-react";

export default function AdminBulkActionsPanel() {
  const [userIds, setUserIds] = useState("");
  const [action, setAction] = useState<"suspend" | "notify" | "export">("export");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");

  const exportUsers = trpc.admin.exportUsers.useQuery(undefined, { enabled: false });
  const bulkSuspend = trpc.admin.bulkSuspendUsers.useMutation();
  const bulkNotify = trpc.admin.bulkSendNotification.useMutation();

  const handleExport = async () => {
    const result = await exportUsers.refetch();
    if (result.data?.data) {
      const csv = [
        ["ID", "Name", "Email", "Role", "Created At", "Last Signed In"],
        ...result.data.data.map((user: any) => [
          user.id,
          user.name,
          user.email,
          user.role,
          new Date(user.createdAt).toLocaleString(),
          new Date(user.lastSignedIn).toLocaleString(),
        ]),
      ]
        .map((row: any) => row.map((cell: any) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${new Date().toISOString()}.csv`;
      a.click();
      toast.success(`Exported ${result.data.count} users`);
    }
  };

  const handleSuspend = async () => {
    const ids = userIds.split(",").map((id) => parseInt(id.trim())).filter(Boolean);
    if (!ids.length || !reason) {
      toast.error("Enter user IDs and suspension reason");
      return;
    }
    try {
      await bulkSuspend.mutateAsync({ userIds: ids, reason });
      toast.success(`Suspended ${ids.length} users`);
      setUserIds("");
      setReason("");
    } catch (error) {
      toast.error("Failed to suspend users");
    }
  };

  const handleNotify = async () => {
    const ids = userIds.split(",").map((id) => parseInt(id.trim())).filter(Boolean);
    if (!ids.length || !title || !message) {
      toast.error("Enter user IDs, title, and message");
      return;
    }
    try {
      await bulkNotify.mutateAsync({ userIds: ids, title, message });
      toast.success(`Sent notification to ${ids.length} users`);
      setUserIds("");
      setTitle("");
      setMessage("");
    } catch (error) {
      toast.error("Failed to send notifications");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Button
          variant={action === "export" ? "default" : "outline"}
          onClick={() => setAction("export")}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export Users
        </Button>
        <Button
          variant={action === "notify" ? "default" : "outline"}
          onClick={() => setAction("notify")}
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          Send Bulk Notification
        </Button>
        <Button
          variant={action === "suspend" ? "default" : "outline"}
          onClick={() => setAction("suspend")}
          className="gap-2"
        >
          <Ban className="h-4 w-4" />
          Suspend Users
        </Button>
      </div>

      {action === "export" && (
        <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Export all users to CSV format</p>
          <Button onClick={handleExport} disabled={exportUsers.isLoading} className="w-full">
            {exportUsers.isLoading ? "Exporting..." : "Download CSV"}
          </Button>
        </div>
      )}

      {action === "notify" && (
        <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">User IDs (comma-separated)</label>
            <Input
              placeholder="1,2,3,4,5"
              value={userIds}
              onChange={(e) => setUserIds(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notification Title</label>
            <Input
              placeholder="Important Update"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Message</label>
            <Textarea
              placeholder="Enter notification message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-sm min-h-24"
            />
          </div>
          <Button
            onClick={handleNotify}
            disabled={bulkNotify.isPending}
            className="w-full"
          >
            {bulkNotify.isPending ? "Sending..." : "Send to Selected Users"}
          </Button>
        </div>
      )}

      {action === "suspend" && (
        <div className="space-y-4 p-4 bg-secondary/50 rounded-lg border border-destructive/20">
          <div className="text-sm text-destructive font-semibold">⚠️ Account Suspension</div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">User IDs (comma-separated)</label>
            <Input
              placeholder="1,2,3,4,5"
              value={userIds}
              onChange={(e) => setUserIds(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Suspension Reason</label>
            <Textarea
              placeholder="Enter reason for suspension..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-sm min-h-24"
            />
          </div>
          <Button
            onClick={handleSuspend}
            disabled={bulkSuspend.isPending}
            variant="destructive"
            className="w-full"
          >
            {bulkSuspend.isPending ? "Suspending..." : "Suspend Selected Users"}
          </Button>
        </div>
      )}
    </div>
  );
}
