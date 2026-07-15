import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import AdminDepositsPanel from "@/components/admin/AdminDepositsPanel";
import AdminWithdrawalsPanel from "@/components/admin/AdminWithdrawalsPanel";
import AdminKycPanel from "@/components/admin/AdminKycPanel";
import AdminAnalyticsPanel from "@/components/admin/AdminAnalyticsPanel";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if not admin
  if (user && user.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-5xl font-serif font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-lg text-muted-foreground">Platform management and oversight</p>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="kyc">KYC Review</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
}
