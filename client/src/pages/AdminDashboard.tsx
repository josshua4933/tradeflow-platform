import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-5xl font-serif font-bold text-foreground mb-3">Admin Dashboard</h1>
          <p className="text-lg text-muted-foreground mb-2">Platform management and oversight</p>
          <p className="text-sm text-muted-foreground">Current user: {user?.name} ({user?.email})</p>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-12 overflow-x-auto gap-1">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="kyc">KYC Review</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-8">
            <AdminAnalyticsPanel />
          </TabsContent>

          <TabsContent value="users" className="mt-8">
            <AdminUsersPanel />
          </TabsContent>

          <TabsContent value="deposits" className="mt-8">
            <AdminDepositsPanel />
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-8">
            <AdminWithdrawalsPanel />
          </TabsContent>

          <TabsContent value="kyc" className="mt-8">
            <AdminKycPanel />
          </TabsContent>

          <TabsContent value="audit" className="mt-8">
            <AdminAuditLogPanel />
          </TabsContent>

          <TabsContent value="bulk" className="mt-8">
            <AdminBulkActionsPanel />
          </TabsContent>

          <TabsContent value="config" className="mt-8">
            <AdminConfigPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
