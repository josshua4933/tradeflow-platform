import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, TrendingUp, Wallet, History, Users, Zap,
  Calendar, MessageSquare, Bell, User, LogOut, Settings,
  BarChart2, Award, BookOpen, Link2, FileText, Shield,
  ChevronDown, Menu, X, AlertTriangle
} from "lucide-react";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: string;
}

const navGroups = [
  {
    title: "Trading",
    items: [
      { icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard", href: "/dashboard" },
      { icon: <TrendingUp className="h-4 w-4" />, label: "Trade", href: "/trade" },
      { icon: <History className="h-4 w-4" />, label: "History", href: "/history" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: <Wallet className="h-4 w-4" />, label: "Wallets", href: "/wallets" },
      { icon: <Settings className="h-4 w-4" />, label: "Account", href: "/account" },
    ],
  },
  {
    title: "Social",
    items: [
      { icon: <Award className="h-4 w-4" />, label: "Leaderboard", href: "/leaderboard" },
      { icon: <Zap className="h-4 w-4" />, label: "Signals", href: "/signals" },
    ],
  },
  {
    title: "Tools",
    items: [
      { icon: <Calendar className="h-4 w-4" />, label: "Calendar", href: "/calendar" },
      { icon: <MessageSquare className="h-4 w-4" />, label: "AI Assistant", href: "/assistant" },
      { icon: <BookOpen className="h-4 w-4" />, label: "Education", href: "/education" },
      { icon: <Link2 className="h-4 w-4" />, label: "Affiliates", href: "/affiliates" },
    ],
  },
];

function PortfolioBar() {
  const { data: summary } = trpc.trading.portfolioSummary.useQuery(undefined, { refetchInterval: 5000 });

  if (!summary) return null;

  const pnl = parseFloat(summary.unrealizedPnl);
  const marginLevel = parseFloat(summary.marginLevel);

  return (
    <div className="border-b border-border bg-secondary/50 px-4 py-2 flex items-center gap-6 text-xs overflow-x-auto">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-muted-foreground">Balance:</span>
        <span className="font-medium tabular-nums">${parseFloat(summary.totalBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-muted-foreground">Equity:</span>
        <span className="font-medium tabular-nums">${parseFloat(summary.equity).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-muted-foreground">P&L:</span>
        <span className={`font-medium tabular-nums ${pnl >= 0 ? "text-bull" : "text-bear"}`}>
          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-muted-foreground">Margin:</span>
        <span className="font-medium tabular-nums">${parseFloat(summary.margin).toFixed(2)}</span>
      </div>
      {summary.isMarginCall && (
        <div className="flex items-center gap-1 text-bear shrink-0">
          <AlertTriangle className="h-3 w-3" />
          <span className="font-semibold">MARGIN CALL</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <span className="text-muted-foreground">Positions:</span>
        <span className="font-medium">{summary.openPositions}</span>
      </div>
    </div>
  );
}

export default function TradingLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: notifications } = trpc.notifications.list.useQuery({ limit: 10 }, { refetchInterval: 30000 });
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading TradeFlow...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Top Bar ────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-card h-14 flex items-center px-4 gap-4 shrink-0 z-40">
        <button
          className="lg:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <a href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 bg-foreground flex items-center justify-center">
            <span className="text-background text-xs font-bold">TF</span>
          </div>
          <span className="font-serif text-base font-semibold tracking-tight hidden sm:block">TradeFlow</span>
        </a>

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <a href="/notifications" className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </a>
          <a href="/profile" className="flex items-center gap-2 p-1.5 hover:bg-secondary rounded transition-colors">
            <div className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <span className="text-sm font-medium hidden sm:block max-w-24 truncate">{user?.name ?? "Account"}</span>
          </a>
          <button
            onClick={() => logout()}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <PortfolioBar />

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar ──────────────────────────────────────────────────── */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-30 w-56 flex-col
            bg-[oklch(0.14_0.02_30)] text-[oklch(0.90_0.010_80)]
            border-r border-[oklch(0.25_0.02_30)]
            transition-transform duration-200
            ${mobileOpen ? "translate-x-0 flex" : "-translate-x-full lg:translate-x-0 lg:flex"}
            pt-14 lg:pt-0
          `}
        >
          <div className="flex-1 overflow-y-auto py-4 px-2">
            {navGroups.map((group) => (
              <div key={group.title} className="mb-5">
                <div className="px-3 mb-1.5">
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[oklch(0.45_0.012_75)] font-medium">
                    {group.title}
                  </span>
                </div>
                {group.items.map((item) => {
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all mb-0.5
                        ${isActive
                          ? "bg-[oklch(0.22_0.02_30)] text-[oklch(0.90_0.010_80)] border-l-2 border-[oklch(0.72_0.14_75)] pl-[10px]"
                          : "text-[oklch(0.60_0.012_75)] hover:bg-[oklch(0.20_0.02_30)] hover:text-[oklch(0.90_0.010_80)]"
                        }
                      `}
                    >
                      <span className={isActive ? "text-[oklch(0.72_0.14_75)]" : ""}>{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar footer */}
          <div className="border-t border-[oklch(0.25_0.02_30)] p-3 space-y-1">
            <a href="/terms" className="flex items-center gap-2 px-3 py-1.5 text-xs text-[oklch(0.45_0.012_75)] hover:text-[oklch(0.70_0.012_75)] transition-colors">
              <FileText className="h-3 w-3" /> Terms
            </a>
            <a href="/risk-disclosure" className="flex items-center gap-2 px-3 py-1.5 text-xs text-[oklch(0.45_0.012_75)] hover:text-[oklch(0.70_0.012_75)] transition-colors">
              <Shield className="h-3 w-3" /> Risk Disclosure
            </a>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ─── Main Content ─────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
