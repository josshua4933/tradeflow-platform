import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Globe, Smartphone, LogOut } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function ActivityDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Queries
  const loginHistoryQuery = trpc.account.getLoginHistory.useQuery();
  const activeSessionsQuery = trpc.account.getActiveSessions.useQuery();

  // Mutations
  const terminateSessionMutation = trpc.account.terminateSession.useMutation({
    onSuccess: () => {
      toast.success("Session terminated successfully");
      activeSessionsQuery.refetch();
      setSelectedSession(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to terminate session");
    },
  });

  if (!user) {
    setLocation("/");
    return null;
  }

  const handleTerminateSession = (sessionId: string) => {
    if (confirm("Are you sure you want to terminate this session?")) {
      terminateSessionMutation.mutate({ sessionId });
    }
  };

  const getDeviceIcon = () => {
    return <Globe className="h-4 w-4" />;
  };

  const formatDate = (date: Date | string | number) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-5xl font-serif font-bold text-foreground mb-2">Activity Dashboard</h1>
          <p className="text-lg text-muted-foreground">Monitor your login history and manage active sessions</p>
        </div>

        <Tabs defaultValue="sessions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
            <TabsTrigger value="history">Login History</TabsTrigger>
          </TabsList>

          {/* Active Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            {activeSessionsQuery.isLoading ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Loading sessions...</p>
              </Card>
            ) : activeSessionsQuery.data && activeSessionsQuery.data.length > 0 ? (
              <div className="space-y-4">
                {activeSessionsQuery.data.map((session) => (
                  <Card
                    key={session.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedSession === session.sessionId ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedSession(session.sessionId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">{getDeviceIcon()}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{session.deviceName || "Unknown Device"}</h3>
                            <Badge variant="outline" className="text-xs">
                              Active
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {session.browser} on {session.os}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            IP: {session.ipAddress} • {session.city && `${session.city}, `}
                            {session.country}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Last active: {formatDate(session.lastActivityAt)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTerminateSession(session.sessionId);
                        }}
                        disabled={terminateSessionMutation.isPending}
                      >
                        <LogOut className="h-4 w-4 mr-1" />
                        Terminate
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No active sessions found</p>
              </Card>
            )}
          </TabsContent>

          {/* Login History Tab */}
          <TabsContent value="history" className="space-y-4">
            {loginHistoryQuery.isLoading ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Loading history...</p>
              </Card>
            ) : loginHistoryQuery.data && loginHistoryQuery.data.length > 0 ? (
              <div className="space-y-3">
                {loginHistoryQuery.data.map((activity) => (
                  <Card key={activity.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{activity.deviceName || "Unknown Device"}</h3>
                          <Badge
                            variant={activity.isSuccessful ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {activity.isSuccessful ? "Success" : "Failed"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {activity.browser} on {activity.os}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          IP: {activity.ipAddress} • {activity.city && `${activity.city}, `}
                          {activity.country}
                        </p>
                        {activity.failureReason && (
                          <p className="text-xs text-destructive mt-1">Reason: {activity.failureReason}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(activity.createdAt)}
                          {activity.logoutAt && ` - Logged out: ${formatDate(activity.logoutAt)}`}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No login history found</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Security Info */}
        <Card className="mt-8 p-4 bg-secondary/50">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Security Tips
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Regularly review your active sessions and login history</li>
            <li>• Terminate any sessions you don't recognize immediately</li>
            <li>• If you see suspicious activity, change your password right away</li>
            <li>• Enable two-factor authentication for enhanced security</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
