import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, LockKeyhole, LogIn } from "lucide-react";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import AdminDepositsPanel from "@/components/admin/AdminDepositsPanel";
import AdminWithdrawalsPanel from "@/components/admin/AdminWithdrawalsPanel";
import AdminKycPanel from "@/components/admin/AdminKycPanel";
import AdminAnalyticsPanel from "@/components/admin/AdminAnalyticsPanel";
import AdminAuditLogPanel from "@/components/admin/AdminAuditLogPanel";
import AdminBulkActionsPanel from "@/components/admin/AdminBulkActionsPanel";
import AdminConfigPanel from "@/components/admin/AdminConfigPanel";
import AdminReconciliationPanel from "@/components/admin/AdminReconciliationPanel";
import AdminLeaderboardPanel from "@/components/admin/AdminLeaderboardPanel";
import { getAdminAccessMessage, getAdminAccessState } from "./adminAccess";

export default function AdminDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const accessState = getAdminAccessState({
    loading,
    isAuthenticated,
    role: user?.role,
  });

  if (accessState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading administrator access" />
      </div>
    );
  }

  if (accessState !== "allowed") {
    const isUnauthenticated = accessState === "unauthenticated";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {isUnauthenticated ? <LogIn className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Administrator access required</h1>
          <p className="mt-3 text-sm text-muted-foreground">{getAdminAccessMessage(accessState)}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>Back to Dashboard</Button>
            {isUnauthenticated && (
              <Button onClick={() => { window.location.href = getLoginUrl(); }}>Sign in</Button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
          <TabsList className="grid w-full grid-cols-10 mb-12 overflow-x-auto gap-1">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="kyc">KYC Review</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
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

          <TabsContent value="reconciliation" className="mt-8">
            <AdminReconciliationPanel />
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-8">
            <AdminLeaderboardPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
