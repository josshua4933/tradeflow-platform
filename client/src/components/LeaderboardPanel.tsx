import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Award, TrendingUp, Users } from "lucide-react";

export default function LeaderboardPanel() {
  const { data: leaderboard } = trpc.social.leaderboard.useQuery();
  const follow = trpc.social.followTrader.useMutation({
    onSuccess: () => toast.success("Now following trader"),
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px w-6 bg-foreground/30"></div>
          <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Social Trading</span>
        </div>
        <h1 className="font-serif text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Follow top traders and copy their strategies automatically.</p>
      </div>

      <div className="border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Award className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Top Traders — This Month</span>
        </div>
        {leaderboard && leaderboard.length > 0 ? (
          <div className="divide-y divide-border">
            {leaderboard.map((trader, i) => (
              <div key={trader.userId} className="flex items-center gap-4 px-4 py-4 hover:bg-secondary/30 transition-colors">
                <div className={`w-8 h-8 flex items-center justify-center font-bold text-sm rounded-full ${i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-amber-600 text-white" : "bg-secondary text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center font-bold font-serif">
                  {trader.displayName?.charAt(0)?.toUpperCase() ?? "T"}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{trader.displayName ?? "Anonymous"}</div>
                  <div className="text-xs text-muted-foreground">{trader.totalTrades} trades · {trader.followersCount} followers</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold tabular-nums ${parseFloat(trader.monthlyReturn ?? "0") >= 0 ? "text-bull" : "text-bear"}`}>
                    {parseFloat(trader.monthlyReturn ?? "0") >= 0 ? "+" : ""}{parseFloat(trader.monthlyReturn ?? "0").toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Win: {parseFloat(trader.winRate ?? "0").toFixed(0)}%</div>
                </div>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => follow.mutate({ traderId: trader.userId })}>
                  <Users className="h-3 w-3 mr-1" /> Follow
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            No leaderboard data yet.
          </div>
        )}
      </div>
    </div>
  );
}
