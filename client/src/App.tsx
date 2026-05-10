import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import TradingPage from "./pages/TradingPage";
import AccountPage from "./pages/AccountPage";
import WalletsPage from "./pages/WalletsPage";
import HistoryPage from "./pages/HistoryPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import SignalsPage from "./pages/SignalsPage";
import CalendarPage from "./pages/CalendarPage";
import AssistantPage from "./pages/AssistantPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import AffiliatesPage from "./pages/AffiliatesPage";
import TermsPage from "./pages/TermsPage";
import RiskDisclosurePage from "./pages/RiskDisclosurePage";
import AmlPolicyPage from "./pages/AmlPolicyPage";
import AuditPage from "./pages/AuditPage";
import EducationPage from "./pages/EducationPage";

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/risk-disclosure" component={RiskDisclosurePage} />
      <Route path="/aml-policy" component={AmlPolicyPage} />
      <Route path="/education" component={EducationPage} />

      {/* App — protected by DashboardLayout internally */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/trade" component={TradingPage} />
      <Route path="/trade/:symbol" component={TradingPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/wallets" component={WalletsPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/signals" component={SignalsPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/assistant" component={AssistantPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/affiliates" component={AffiliatesPage} />
      <Route path="/audit" component={AuditPage} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
