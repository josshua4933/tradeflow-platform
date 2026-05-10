import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  TrendingUp, TrendingDown, BarChart2, Shield, Zap, Globe,
  ChevronRight, ArrowRight, Star, Users, Activity, BookOpen,
  Lock, Award, Clock, AlertTriangle
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

// Price ticker component
function PriceTicker() {
  const symbols = ["EURUSD", "BTCUSD", "XAUUSD", "GBPUSD", "ETHUSD", "US500", "USDJPY", "XAGUSD"];
  const { data: prices } = trpc.market.prices.useQuery({ symbols }, { refetchInterval: 3000 });

  const items = prices ?? symbols.map((s, i) => ({
    symbol: s,
    price: [1.0845, 62500, 2320, 1.268, 3150, 5248, 154.2, 27.4][i],
    bid: 0, ask: 0, timestamp: 0
  }));

  const tickerContent = [...items, ...items].map((item, i) => (
    <span key={i} className="inline-flex items-center gap-2 px-6">
      <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{item.symbol}</span>
      <span className="tabular-nums text-sm font-medium text-foreground">
        {item.price > 1000 ? item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : item.price > 10 ? item.price.toFixed(3)
          : item.price.toFixed(5)}
      </span>
      <span className={`text-xs ${Math.random() > 0.5 ? "text-bull" : "text-bear"}`}>
        {Math.random() > 0.5 ? "▲" : "▼"} {(Math.random() * 0.5).toFixed(2)}%
      </span>
    </span>
  ));

  return (
    <div className="border-y border-border bg-secondary/50 overflow-hidden py-2.5">
      <div className="flex ticker-animate whitespace-nowrap">
        {tickerContent}
      </div>
    </div>
  );
}

// Asset category card
function AssetCard({ icon, name, count, change, positive }: { icon: string; name: string; count: string; change: string; positive: boolean }) {
  return (
    <div className="border border-border p-5 hover:border-foreground/30 transition-colors group cursor-pointer">
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-xs tracking-widest uppercase text-muted-foreground mb-1">{name}</div>
      <div className="font-serif text-xl font-semibold">{count}</div>
      <div className={`text-xs mt-1 ${positive ? "text-bull" : "text-bear"}`}>
        {positive ? "▲" : "▼"} {change}
      </div>
    </div>
  );
}

// Feature block
function FeatureBlock({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 border border-border flex items-center justify-center shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-sm mb-1">{title}</div>
        <div className="text-sm text-muted-foreground leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Navigation ─────────────────────────────────────────────────── */}
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-foreground flex items-center justify-center">
                <span className="text-background text-xs font-bold">TF</span>
              </div>
              <span className="font-serif text-lg font-semibold tracking-tight">TradeFlow</span>
            </a>
            <div className="hidden md:flex items-center gap-6">
              {["Markets", "Products", "Education", "About"].map((item) => (
                <a key={item} href={item === "Education" ? "/education" : "#"} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={getLoginUrl()} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </a>
            <a href={getLoginUrl()}>
              <Button size="sm" className="font-medium text-sm px-5">
                Open Account
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* ─── Price Ticker ────────────────────────────────────────────────── */}
      <PriceTicker />

      {/* ─── Hero Section ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            {/* Fine rule + label */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8 bg-foreground/30"></div>
              <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">
                Professional Trading Platform
              </span>
            </div>

            {/* Massive Didone headline */}
            <h1 className="font-serif text-6xl lg:text-7xl xl:text-8xl font-bold leading-[0.95] tracking-tight mb-6">
              Trade the
              <br />
              <em className="not-italic text-foreground/70">World's</em>
              <br />
              Markets.
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-md">
              Access Forex, Crypto, Commodities, Stocks, and Synthetic Indices through
              a platform built for precision, speed, and intelligence.
            </p>

            <div className="flex items-center gap-4 mb-10">
              <a href={getLoginUrl()}>
                <Button size="lg" className="font-medium px-8 h-12">
                  Start Trading <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="/education" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                Learn more <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-6 pt-6 border-t border-border">
              {[
                { icon: <Shield className="h-4 w-4" />, label: "SSL Encrypted" },
                { icon: <Lock className="h-4 w-4" />, label: "PCI-DSS Compliant" },
                { icon: <Award className="h-4 w-4" />, label: "Regulated Platform" },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {badge.icon}
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Stats + Markets preview */}
          <div className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "10,000+", label: "Active Traders" },
                { value: "$2.4B", label: "Daily Volume" },
                { value: "30+", label: "Instruments" },
              ].map((stat) => (
                <div key={stat.label} className="border border-border p-4 text-center">
                  <div className="font-serif text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Live market preview */}
            <div className="border border-border">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs tracking-widest uppercase text-muted-foreground font-medium">Live Markets</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              </div>
              <div className="divide-y divide-border">
                {[
                  { symbol: "EUR/USD", price: "1.08450", change: "+0.12%", up: true },
                  { symbol: "BTC/USD", price: "62,500", change: "+1.85%", up: true },
                  { symbol: "XAU/USD", price: "2,320.50", change: "+0.34%", up: true },
                  { symbol: "GBP/USD", price: "1.26800", change: "-0.08%", up: false },
                  { symbol: "ETH/USD", price: "3,150.00", change: "+2.14%", up: true },
                ].map((item) => (
                  <div key={item.symbol} className="px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 flex items-center justify-center ${item.up ? "text-bull" : "text-bear"}`}>
                        {item.up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </div>
                      <span className="text-sm font-medium">{item.symbol}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="tabular-nums text-sm font-medium">{item.price}</span>
                      <span className={`text-xs font-medium w-14 text-right ${item.up ? "text-bull" : "text-bear"}`}>
                        {item.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-border">
                <a href={getLoginUrl()} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  View all markets <ChevronRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Asset Classes ────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px w-8 bg-foreground/30"></div>
            <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">Asset Classes</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <AssetCard icon="💱" name="Forex" count="8 pairs" change="0.12%" positive={true} />
            <AssetCard icon="₿" name="Crypto" count="4 assets" change="1.85%" positive={true} />
            <AssetCard icon="🥇" name="Commodities" count="4 assets" change="0.34%" positive={true} />
            <AssetCard icon="📈" name="Stocks" count="4 stocks" change="0.08%" positive={false} />
            <AssetCard icon="📊" name="Indices" count="4 indices" change="0.45%" positive={true} />
            <AssetCard icon="⚡" name="Synthetic" count="4 indices" change="0.92%" positive={true} />
          </div>
        </div>
      </section>

      {/* ─── Platform Features ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8 bg-foreground/30"></div>
              <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">Platform</span>
            </div>
            <h2 className="font-serif text-4xl font-bold mb-4 leading-tight">
              Every tool a
              <br />
              <em>professional</em> needs.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              From real-time TradingView charts to AI-powered market analysis,
              TradeFlow equips you with institutional-grade tools in an elegant interface.
            </p>
            <a href={getLoginUrl()}>
              <Button variant="outline" className="font-medium">
                Explore Platform <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
          <div className="space-y-5">
            <FeatureBlock
              icon={<BarChart2 className="h-5 w-5" />}
              title="TradingView Charts"
              desc="Professional-grade charting with 6 timeframes, technical indicators, and real-time price feeds."
            />
            <FeatureBlock
              icon={<Zap className="h-5 w-5" />}
              title="One-Click Trading"
              desc="Execute trades instantly with configurable stop loss, take profit, and leverage settings."
            />
            <FeatureBlock
              icon={<Activity className="h-5 w-5" />}
              title="Real-Time Risk Management"
              desc="Live margin calculations, equity monitoring, and automated margin call alerts."
            />
            <FeatureBlock
              icon={<Users className="h-5 w-5" />}
              title="Copy Trading"
              desc="Follow and automatically copy the trades of top-performing traders on the leaderboard."
            />
            <FeatureBlock
              icon={<Star className="h-5 w-5" />}
              title="AI Trading Assistant"
              desc="LLM-powered market analysis, personalized trade suggestions, and risk explanations."
            />
            <FeatureBlock
              icon={<Globe className="h-5 w-5" />}
              title="Multi-Language Support"
              desc="Available in English, Spanish, French, and German with localized content."
            />
          </div>
        </div>
      </section>

      {/* ─── Risk Warning Banner ──────────────────────────────────────────── */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Risk Warning:</strong> Trading derivatives and leveraged products carries a high level of risk and may not be suitable for all investors.
              You may lose more than your initial investment. Please ensure you fully understand the risks involved and seek independent advice if necessary.
              Past performance is not indicative of future results. See our{" "}
              <a href="/risk-disclosure" className="underline hover:text-foreground">Risk Disclosure</a> and{" "}
              <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-foreground/20"></div>
            <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">Get Started</span>
            <div className="h-px w-12 bg-foreground/20"></div>
          </div>
          <h2 className="font-serif text-5xl font-bold mb-4">
            Begin your journey.
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Open a free account in minutes. No minimum deposit required to explore the platform.
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg" className="font-medium px-10 h-12">
              Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="font-serif font-semibold mb-3">TradeFlow</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A sophisticated multi-asset trading platform for professional traders.
              </p>
            </div>
            {[
              { title: "Platform", links: ["Markets", "Trading", "Copy Trading", "Signals"] },
              { title: "Resources", links: ["Education", "Economic Calendar", "API Docs", "Affiliates"] },
              { title: "Legal", links: [
                { label: "Terms of Service", href: "/terms" },
                { label: "Risk Disclosure", href: "/risk-disclosure" },
                { label: "AML Policy", href: "/aml-policy" },
                { label: "Privacy Policy", href: "#" },
              ]},
            ].map((col) => (
              <div key={col.title}>
                <div className="text-xs tracking-widest uppercase text-muted-foreground font-medium mb-3">{col.title}</div>
                <div className="space-y-2">
                  {col.links.map((link) => (
                    <div key={typeof link === "string" ? link : link.label}>
                      <a
                        href={typeof link === "string" ? "#" : link.href}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {typeof link === "string" ? link : link.label}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              © 2026 TradeFlow. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Trading involves substantial risk of loss. Not suitable for all investors.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
