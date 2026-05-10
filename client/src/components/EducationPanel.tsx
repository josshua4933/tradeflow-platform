import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, BookOpen, Play, ChevronRight } from "lucide-react";

const modules = [
  {
    category: "Fundamentals",
    articles: [
      { title: "Introduction to Forex Trading", duration: "10 min", level: "Beginner", desc: "Learn the basics of currency pairs, how forex markets work, and why traders participate in them." },
      { title: "Understanding Leverage & Margin", duration: "12 min", level: "Beginner", desc: "A comprehensive guide to leverage, margin requirements, and how they affect your trading capital." },
      { title: "Reading Candlestick Charts", duration: "15 min", level: "Beginner", desc: "Master the art of reading price action through candlestick patterns and chart analysis." },
      { title: "Risk Management Essentials", duration: "20 min", level: "Intermediate", desc: "Learn position sizing, stop loss placement, and how to protect your trading capital." },
    ],
  },
  {
    category: "Technical Analysis",
    articles: [
      { title: "Support & Resistance Levels", duration: "18 min", level: "Intermediate", desc: "Identify key price levels where markets tend to reverse or consolidate." },
      { title: "Moving Averages Explained", duration: "14 min", level: "Intermediate", desc: "How to use SMA, EMA, and MACD to identify trends and generate trading signals." },
      { title: "RSI & Momentum Indicators", duration: "16 min", level: "Intermediate", desc: "Use the Relative Strength Index and other momentum indicators to time entries and exits." },
      { title: "Fibonacci Retracements", duration: "20 min", level: "Advanced", desc: "Apply Fibonacci levels to identify potential reversal zones in trending markets." },
    ],
  },
  {
    category: "Advanced Topics",
    articles: [
      { title: "Trading Synthetic Indices", duration: "25 min", level: "Advanced", desc: "Understand AI-generated synthetic markets, their properties, and trading strategies." },
      { title: "Binary & Digital Options", duration: "22 min", level: "Advanced", desc: "How binary options work, payout structures, and risk/reward considerations." },
      { title: "Copy Trading Strategies", duration: "18 min", level: "Intermediate", desc: "How to evaluate traders to follow, risk allocation, and managing a copy portfolio." },
      { title: "Economic Calendar Trading", duration: "20 min", level: "Advanced", desc: "Trading around high-impact economic events including NFP, CPI, and central bank decisions." },
    ],
  },
];

const levelColors: Record<string, string> = {
  Beginner: "bg-bull/10 text-bull",
  Intermediate: "bg-yellow-500/10 text-yellow-600",
  Advanced: "bg-bear/10 text-bear",
};

export default function EducationPanel() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <a href="/" className="font-serif text-lg font-bold">TradeFlow</a>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8 bg-foreground/30"></div>
            <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Learning Center</span>
          </div>
          <h1 className="font-serif text-4xl font-bold mb-2">Education</h1>
          <p className="text-muted-foreground">Master trading with our comprehensive educational resources.</p>
        </div>

        <div className="space-y-8">
          {modules.map((mod) => (
            <div key={mod.category}>
              <h2 className="font-serif text-xl font-bold mb-4">{mod.category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mod.articles.map((article) => (
                  <div key={article.title} className="border border-border bg-card p-4 hover:border-foreground/30 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-sm group-hover:underline">{article.title}</h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{article.desc}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${levelColors[article.level]}`}>{article.level}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {article.duration}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
