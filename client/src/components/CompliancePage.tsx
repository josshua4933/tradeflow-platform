import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

const content = {
  terms: {
    title: "Terms of Service",
    subtitle: "Last updated: May 2026",
    sections: [
      { heading: "1. Acceptance of Terms", body: "By accessing or using TradeFlow (the 'Platform'), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Platform. These terms constitute a legally binding agreement between you and TradeFlow Ltd." },
      { heading: "2. Eligibility", body: "You must be at least 18 years of age and legally permitted to trade financial instruments in your jurisdiction. By using the Platform, you represent and warrant that you meet these requirements." },
      { heading: "3. Account Registration", body: "You agree to provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account." },
      { heading: "4. Trading and Financial Risk", body: "Trading financial derivatives involves substantial risk of loss and is not suitable for all investors. You may lose some or all of your invested capital. Past performance is not indicative of future results. You should only trade with money you can afford to lose." },
      { heading: "5. Leverage and Margin", body: "The Platform offers leveraged trading products. Leverage amplifies both profits and losses. You are responsible for maintaining sufficient margin in your account. The Platform reserves the right to close positions if margin requirements are not met." },
      { heading: "6. Prohibited Activities", body: "You may not use the Platform for money laundering, market manipulation, unauthorized access, or any illegal activity. Violation of these prohibitions may result in immediate account termination and reporting to relevant authorities." },
      { heading: "7. Intellectual Property", body: "All content, software, and technology on the Platform is the exclusive property of TradeFlow Ltd. and is protected by applicable intellectual property laws." },
      { heading: "8. Limitation of Liability", body: "TradeFlow Ltd. shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform, including but not limited to trading losses, data loss, or business interruption." },
      { heading: "9. Governing Law", body: "These Terms are governed by the laws of the jurisdiction in which TradeFlow Ltd. is incorporated. Any disputes shall be resolved through binding arbitration." },
    ],
  },
  risk: {
    title: "Risk Disclosure",
    subtitle: "Important information about trading risks",
    sections: [
      { heading: "General Risk Warning", body: "Trading financial derivatives, including forex, CFDs, cryptocurrencies, and synthetic indices, carries a high level of risk and may not be suitable for all investors. You should carefully consider your investment objectives, level of experience, and risk appetite before trading." },
      { heading: "Leverage Risk", body: "Leveraged products can work against you as well as for you. Leverage can lead to large losses that may exceed your initial deposit. A small adverse market movement can result in a loss greater than your investment." },
      { heading: "Market Risk", body: "Financial markets are subject to rapid and unpredictable price movements due to economic events, geopolitical developments, and market sentiment. These movements can result in significant losses." },
      { heading: "Liquidity Risk", body: "In certain market conditions, it may be difficult or impossible to execute trades at desired prices. This can occur during periods of extreme market volatility or when trading illiquid instruments." },
      { heading: "Technology Risk", body: "Trading via electronic platforms involves risks including system failures, internet connectivity issues, and software errors. These technical issues could prevent you from executing trades or managing open positions." },
      { heading: "Currency Risk", body: "If you trade instruments denominated in a currency other than your base currency, changes in exchange rates may affect your profits and losses." },
      { heading: "Counterparty Risk", body: "As a market maker, TradeFlow acts as the counterparty to your trades. While we maintain adequate capital reserves, there is an inherent counterparty risk in all OTC derivatives transactions." },
      { heading: "Regulatory Risk", body: "Changes in laws and regulations may affect the availability of certain products or trading conditions. You are responsible for ensuring that your trading activities comply with applicable laws in your jurisdiction." },
    ],
  },
  aml: {
    title: "AML Policy",
    subtitle: "Anti-Money Laundering & Know Your Customer Policy",
    sections: [
      { heading: "1. Policy Statement", body: "TradeFlow Ltd. is committed to preventing money laundering and terrorist financing. We comply with all applicable anti-money laundering (AML) laws and regulations, including the Financial Action Task Force (FATF) recommendations." },
      { heading: "2. Customer Due Diligence (CDD)", body: "We apply customer due diligence measures to all clients, including identity verification, address verification, and assessment of the nature of the business relationship. Enhanced due diligence is applied to high-risk clients." },
      { heading: "3. Know Your Customer (KYC)", body: "All clients must complete our KYC process before accessing full trading features. This includes providing government-issued photo identification, proof of address, and source of funds documentation where required." },
      { heading: "4. Suspicious Activity Monitoring", body: "We continuously monitor transactions for suspicious activity patterns. Unusual transactions may trigger additional verification requirements or account restrictions pending investigation." },
      { heading: "5. Reporting Obligations", body: "We are legally obligated to report suspicious activities to relevant financial intelligence units. We cooperate fully with law enforcement and regulatory authorities in investigations." },
      { heading: "6. Record Keeping", body: "We maintain records of all customer identification documents and transaction records for a minimum of five years as required by applicable regulations." },
      { heading: "7. Training and Compliance", body: "Our staff receive regular AML training and are required to report any suspicious activity to our Compliance Officer. We conduct regular audits of our AML procedures." },
      { heading: "8. Sanctions Screening", body: "All clients are screened against international sanctions lists including OFAC, EU, and UN sanctions. Accounts belonging to sanctioned individuals or entities will be immediately frozen and reported." },
    ],
  },
};

export default function CompliancePage({ type }: { type: "terms" | "risk" | "aml" }) {
  const [, navigate] = useLocation();
  const page = content[type];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <a href="/" className="font-serif text-lg font-bold">TradeFlow</a>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8 bg-foreground/30"></div>
            <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Legal</span>
          </div>
          <h1 className="font-serif text-4xl font-bold mb-2">{page.title}</h1>
          <p className="text-muted-foreground text-sm">{page.subtitle}</p>
        </div>

        <div className="space-y-8">
          {page.sections.map((section, i) => (
            <div key={i}>
              <h2 className="font-serif text-xl font-bold mb-3">{section.heading}</h2>
              <p className="text-muted-foreground leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>TradeFlow Ltd. · Registered Financial Services Provider · All rights reserved.</p>
          <div className="flex gap-4 mt-2">
            <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="/risk-disclosure" className="hover:text-foreground transition-colors">Risk Disclosure</a>
            <a href="/aml-policy" className="hover:text-foreground transition-colors">AML Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
}
