import { trpc } from "@/lib/trpc";
import { Shield } from "lucide-react";

export default function AuditPanel() {
  const { data: logs } = trpc.audit.myLog.useQuery();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px w-6 bg-foreground/30"></div>
          <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Compliance</span>
        </div>
        <h1 className="font-serif text-3xl font-bold">Audit Trail</h1>
        <p className="text-muted-foreground text-sm mt-1">Complete log of all account actions for compliance and security.</p>
      </div>

      <div className="border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Activity Log</span>
        </div>
        {logs && logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Timestamp", "Action", "Details", "IP Address"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium capitalize">{log.action.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{log.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">No audit logs yet.</div>
        )}
      </div>
    </div>
  );
}
