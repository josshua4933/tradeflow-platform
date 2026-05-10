import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { User, TrendingUp, Award } from "lucide-react";

export default function ProfilePanel() {
  const { user } = useAuth();
  const { data: stats } = trpc.social.myStats.useQuery();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px w-6 bg-foreground/30"></div>
          <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Profile</span>
        </div>
        <h1 className="font-serif text-3xl font-bold">My Profile</h1>
      </div>

      <div className="border border-border bg-card p-6 mb-4">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 bg-foreground text-background rounded-full flex items-center justify-center text-3xl font-bold font-serif">
            {user?.name?.charAt(0)?.toUpperCase() ?? "T"}
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold">{user?.name ?? "Trader"}</h2>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-4 border-t border-border pt-5">
            <div className="text-center">
              <div className="font-serif text-2xl font-bold tabular-nums">{stats.totalTrades}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Trades</div>
            </div>
            <div className="text-center border-x border-border">
              <div className={`font-serif text-2xl font-bold tabular-nums ${parseFloat(stats.totalPnl) >= 0 ? "text-bull" : "text-bear"}`}>
                ${parseFloat(stats.totalPnl).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Total P&L</div>
            </div>
            <div className="text-center">
              <div className="font-serif text-2xl font-bold tabular-nums">{parseFloat(stats.winRate).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground mt-1">Win Rate</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
