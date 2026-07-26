import { useAuth } from "@/_core/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import AdminDepositsPanel from "@/components/admin/AdminDepositsPanel";
import AdminWithdrawalsPanel from "@/components/admin/AdminWithdrawalsPanel";
import AdminKycPanel from "@/components/admin/AdminKycPanel";
import AdminAnalyticsPanel from "@/components/admin/AdminAnalyticsPanel";
import AdminAuditLogPanel from "@/components/admin/AdminAuditLogPanel";
import AdminBulkActionsPanel from "@/components/admin/AdminBulkActionsPanel";
import AdminConfigPanel from "@/components/admin/AdminConfigPanel";

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-5xl font-serif font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-lg text-muted-foreground">Platform management and oversight</p>
          <p className="text-sm text-muted-foreground mt-2">Current user: {user?.name} ({user?.email})</p>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-8 overflow-x-auto">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="kyc">KYC Review</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AdminAnalyticsPanel />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsersPanel />
          </TabsContent>

          <TabsContent value="deposits">
            <AdminDepositsPanel />
          </TabsContent>

          <TabsContent value="withdrawals">
            <AdminWithdrawalsPanel />
          </TabsContent>

          <TabsContent value="kyc">
            <AdminKycPanel />
          </TabsContent>

          <TabsContent value="audit">
            <AdminAuditLogPanel />
          </TabsContent>

          <TabsContent value="bulk">
            <AdminBulkActionsPanel />
          </TabsContent>

          <TabsContent value="config">
            <AdminConfigPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
