import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";

export default function NotificationsPanel() {
  const utils = trpc.useUtils();
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery({ limit: 50 });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
    onError: (err) => toast.error(err.message),
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const typeColors: Record<string, string> = {
    margin_call: "border-l-bear",
    trade_executed: "border-l-bull",
    price_alert: "border-l-blue-500",
    withdrawal: "border-l-yellow-500",
    deposit: "border-l-bull",
    kyc: "border-l-purple-500",
    system: "border-l-muted-foreground",
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-px w-6 bg-foreground/30"></div>
            <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Alerts</span>
          </div>
          <h1 className="font-serif text-3xl font-bold">Notifications</h1>
        </div>
        {notifications && notifications.some((n) => !n.isRead) && (
          <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()}>
            <Check className="h-3.5 w-3.5 mr-1.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="border border-border bg-card divide-y divide-border">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : notifications && notifications.length > 0 ? (
          notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 px-4 py-4 border-l-2 ${typeColors[n.type] ?? "border-l-border"} ${!n.isRead ? "bg-secondary/20" : ""}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold">{n.title}</span>
                  {!n.isRead && <span className="w-1.5 h-1.5 bg-foreground rounded-full"></span>}
                </div>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && (
                <button onClick={() => markRead.mutate({ id: n.id })} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
