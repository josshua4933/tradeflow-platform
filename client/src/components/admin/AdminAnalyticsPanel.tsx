import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AdminAnalyticsPanel() {
  const { data: analytics, isLoading } = trpc.admin.getPlatformAnalytics.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center py-8 text-muted-foreground">No analytics data</div>;
  }

  const metrics = [
    { label: "Total Users", value: analytics.totalUsers, color: "bg-blue-50" },
    { label: "Total Deposits", value: `$${analytics.totalDeposits}`, color: "bg-green-50" },
    { label: "Total Withdrawals", value: `$${analytics.totalWithdrawals}`, color: "bg-orange-50" },
    { label: "Total Volume", value: `$${analytics.totalVolume}`, color: "bg-purple-50" },
    { label: "Total Transactions", value: analytics.totalTransactions, color: "bg-emerald-50" },
    { label: "Total Trades", value: analytics.totalTrades, color: "bg-indigo-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className={metric.color}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-lg font-semibold">{analytics.totalTransactions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Deposit</p>
              <p className="text-lg font-semibold">
                ${parseFloat(analytics.totalDeposits) > 0 ? (parseFloat(analytics.totalDeposits) / analytics.totalTransactions).toFixed(2) : 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Withdrawal</p>
              <p className="text-lg font-semibold">
                ${parseFloat(analytics.totalWithdrawals) > 0 ? (parseFloat(analytics.totalWithdrawals) / analytics.totalTransactions).toFixed(2) : 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trading Volume</p>
              <p className="text-lg font-semibold">${analytics.totalVolume}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
