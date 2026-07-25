import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Download } from "lucide-react";

export default function AdminAuditLogPanel() {
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [limit, setLimit] = useState(100);

  const { data: logs, isLoading } = trpc.admin.getAuditLog.useQuery({
    action: action || undefined,
    userId: userId ? parseInt(userId) : undefined,
    limit,
  });

  const handleExport = () => {
    if (!logs) return;
    const csv = [
      ["ID", "User ID", "Action", "Entity", "Entity ID", "Details", "Created At"],
      ...logs.map((log: any) => [
        log.id,
        log.userId || "",
        log.action,
        log.entity || "",
        log.entityId || "",
        log.details ? JSON.stringify(log.details) : "",
        new Date(log.createdAt).toLocaleString(),
      ]),
    ]
      .map((row: any) => row.map((cell: any) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="text-xs text-muted-foreground mb-1 block">Filter by Action</label>
          <Input
            placeholder="e.g., admin.send_notification"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="flex-1 min-w-48">
          <label className="text-xs text-muted-foreground mb-1 block">Filter by User ID</label>
          <Input
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="text-sm"
            type="number"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
      ) : !logs || logs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="px-4 py-2 font-semibold text-xs text-muted-foreground">ID</th>
                <th className="px-4 py-2 font-semibold text-xs text-muted-foreground">User</th>
                <th className="px-4 py-2 font-semibold text-xs text-muted-foreground">Action</th>
                <th className="px-4 py-2 font-semibold text-xs text-muted-foreground">Entity</th>
                <th className="px-4 py-2 font-semibold text-xs text-muted-foreground">Details</th>
                <th className="px-4 py-2 font-semibold text-xs text-muted-foreground">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-secondary/50">
                  <td className="px-4 py-2 text-xs">{log.id}</td>
                  <td className="px-4 py-2 text-xs">{log.userId || "-"}</td>
                  <td className="px-4 py-2 text-xs font-mono text-bull">{log.action}</td>
                  <td className="px-4 py-2 text-xs">{log.entity || "-"}</td>
                  <td className="px-4 py-2 text-xs max-w-xs truncate" title={JSON.stringify(log.details)}>
                    {log.details ? JSON.stringify(log.details).substring(0, 50) + "..." : "-"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
