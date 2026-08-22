export type EducationLevel = "Beginner" | "Intermediate" | "Advanced";

export type EducationSection = {
  heading: string;
  body: string;
  bullets?: string[];
};

export type EducationQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type EducationLesson = {
  id: string;
  category: string;
  title: string;
  durationMinutes: number;
  level: EducationLevel;
  description: string;
  objective: string;
  keyTakeaways: string[];
  sections: EducationSection[];
  quiz: EducationQuestion[];
  practiceHref?: string;
  practiceLabel?: string;
};

export const EDUCATION_LESSONS: EducationLesson[] = [
  {
    id: "introduction-to-forex-trading",
    category: "Fundamentals",
    title: "Introduction to Forex Trading",
    durationMinutes: 10,
    level: "Beginner",
    description: "Learn how currency pairs are quoted, why prices move, and how a trade is opened and closed.",
    objective: "Understand the basic vocabulary of the foreign-exchange market before placing a practice trade.",
    keyTakeaways: ["A currency pair compares a base currency with a quote currency.", "The bid is the price at which you can sell and the ask is the price at which you can buy.", "Every trade should have a defined risk before it is opened."],
    sections: [
      { heading: "What is a currency pair?", body: "Forex is quoted in pairs such as EUR/USD. EUR is the base currency and USD is the quote currency, so a price of 1.0850 means one euro is valued at 1.0850 US dollars.", bullets: ["Major pairs typically include USD and have deep liquidity.", "The first currency is the unit being bought or sold.", "A rising pair means the base currency is strengthening against the quote currency."] },
      { heading: "How a trade works", body: "You buy when you expect the pair to rise and sell when you expect it to fall. The difference between the opening and closing price, after spread and costs, determines the result. Start with a small practice position and use a stop-loss while learning." },
    ],
    quiz: [
      { id: "q1", prompt: "In EUR/USD, which currency is the base currency?", options: ["USD", "EUR", "Both equally", "The broker's currency"], correctIndex: 1, explanation: "The first currency in a pair is the base currency; EUR/USD compares euros against US dollars." },
      { id: "q2", prompt: "What does a rising EUR/USD price generally indicate?", options: ["EUR is strengthening against USD", "USD is strengthening against EUR", "The spread is widening", "The market is closed"], correctIndex: 0, explanation: "A higher pair price means one euro buys more dollars than before." },
    ],
    practiceHref: "/trade",
    practiceLabel: "Open practice terminal",
  },
  {
    id: "leverage-and-margin",
    category: "Fundamentals",
    title: "Understanding Leverage & Margin",
    durationMinutes: 12,
    level: "Beginner",
    description: "See how leverage changes required margin, exposure, and the speed at which losses can grow.",
    objective: "Calculate the relationship between position exposure, leverage, and required margin.",
    keyTakeaways: ["Leverage increases exposure without increasing account equity.", "Margin is collateral reserved for an open position.", "A high leverage ratio can turn a small market move into a large account change."],
    sections: [
      { heading: "Leverage is exposure, not free money", body: "If a position has 10:1 leverage, a $1,000 margin allocation controls approximately $10,000 of exposure. Profit and loss are calculated on the exposure, while available margin is calculated from the account balance and open positions." },
      { heading: "Margin discipline", body: "Free margin is the amount still available to support positions. When equity falls and margin usage rises, a platform may restrict new trades or liquidate positions according to its risk policy. Keep a buffer instead of using the maximum available leverage.", bullets: ["Exposure = margin × leverage.", "Margin level compares equity with used margin.", "A stop-loss limits planned risk but cannot guarantee execution at an exact price during gaps."] },
    ],
    quiz: [
      { id: "q1", prompt: "With 10:1 leverage, $500 of margin controls approximately what exposure?", options: ["$50", "$500", "$5,000", "$50,000"], correctIndex: 2, explanation: "Exposure is margin multiplied by leverage: $500 × 10 = $5,000." },
      { id: "q2", prompt: "What is margin primarily used for?", options: ["A guaranteed profit", "Collateral reserved for open exposure", "A transaction fee only", "A market forecast"], correctIndex: 1, explanation: "Margin is collateral held while a leveraged position is open." },
    ],
    practiceHref: "/trade",
    practiceLabel: "Review margin in terminal",
  },
  {
    id: "reading-candlestick-charts",
    category: "Fundamentals",
    title: "Reading Candlestick Charts",
    durationMinutes: 15,
    level: "Beginner",
    description: "Learn what open, high, low, and close reveal about price action and market pressure.",
    objective: "Read a candle, identify its range, and describe the balance between buyers and sellers.",
    keyTakeaways: ["The body shows the distance between open and close.", "Wicks show the highest and lowest traded prices in the period.", "A candle is context, not a complete trading signal by itself."],
    sections: [
      { heading: "The four prices", body: "Each candle records an open, high, low, and close for a selected timeframe. A bullish candle closes above its open; a bearish candle closes below its open. The wick shows rejection or exploration beyond the body." },
      { heading: "Read context first", body: "Compare a candle with nearby candles, trend direction, volume, and important levels. A long upper wick near resistance can show rejection, but it needs confirmation rather than an automatic entry.", bullets: ["Short body with long wicks can indicate indecision.", "Large body candles show directional movement but can also follow news volatility.", "Use the Calendar to check whether a high-impact release occurred near the move."] },
    ],
    quiz: [
      { id: "q1", prompt: "What does the upper wick represent?", options: ["The opening price only", "The highest traded price in the period", "The spread", "The account balance"], correctIndex: 1, explanation: "The upper wick extends to the candle's high." },
      { id: "q2", prompt: "Why should a candle pattern be read in context?", options: ["One candle cannot show trend, levels, or news conditions alone", "Candles never contain price information", "Context removes all risk", "Patterns guarantee the next price"], correctIndex: 0, explanation: "Candles are observations; context helps determine whether the observation is meaningful." },
    ],
    practiceHref: "/trade",
    practiceLabel: "Read live candles",
  },
  {
    id: "risk-management-essentials",
    category: "Fundamentals",
    title: "Risk Management Essentials",
    durationMinutes: 20,
    level: "Intermediate",
    description: "Build a repeatable process for position sizing, stop-loss placement, and protecting trading capital.",
    objective: "Create a pre-trade risk plan that defines loss limits before market exposure begins.",
    keyTakeaways: ["Risk is defined before entry, not after a loss begins.", "Position size should reflect stop distance and the amount you can afford to lose.", "Diversification does not remove correlated risk."],
    sections: [
      { heading: "Define the loss first", body: "Choose the maximum account amount you are willing to risk on a trade, then determine the stop distance and position size. A wider stop normally requires a smaller position when the cash risk is kept constant." },
      { heading: "Use a checklist", body: "Before submitting an order, confirm the thesis, entry, invalidation level, size, leverage, and event risk. After entry, respect the plan and review execution rather than moving a stop only to avoid accepting a loss.", bullets: ["Risk per trade should be consistent with your account plan.", "Avoid opening several positions that all depend on the same currency or market driver.", "Review closed trades to improve process, not to chase past outcomes."] },
    ],
    quiz: [
      { id: "q1", prompt: "When should the invalidation level be defined?", options: ["Before entering the trade", "Only after a loss", "When the position is profitable", "Never"], correctIndex: 0, explanation: "Defining invalidation before entry makes risk measurable and reduces emotional decisions." },
      { id: "q2", prompt: "If stop distance becomes wider while cash risk stays constant, position size should generally…", options: ["Increase", "Decrease", "Stay unlimited", "Ignore the stop"], correctIndex: 1, explanation: "A wider stop exposes more price distance, so size should usually be reduced to keep cash risk stable." },
    ],
    practiceHref: "/trade",
    practiceLabel: "Set a risk plan",
  },
  {
    id: "support-and-resistance",
    category: "Technical Analysis",
    title: "Support & Resistance Levels",
    durationMinutes: 18,
    level: "Intermediate",
    description: "Identify areas where price has repeatedly reacted and plan entries around confirmation rather than guesses.",
    objective: "Mark a level, describe why it matters, and plan what would invalidate the idea.",
    keyTakeaways: ["Levels are zones, not perfectly precise lines.", "A broken level can become a future support or resistance area.", "Reactions are more informative when they align with trend and volume."],
    sections: [
      { heading: "Find meaningful zones", body: "Look for repeated turning points, consolidation boundaries, and prior breakout areas. Mark a zone wide enough to reflect normal market noise instead of treating a single tick as exact." },
      { heading: "Wait for evidence", body: "Price touching a level is not proof that it will reverse. Look for rejection, a break-and-retest, or another defined confirmation. Use the drawing tools in the terminal to save levels for the selected symbol and timeframe." },
    ],
    quiz: [
      { id: "q1", prompt: "How should support and resistance usually be treated?", options: ["As exact guaranteed prices", "As zones where reactions may occur", "As broker fees", "As account balances"], correctIndex: 1, explanation: "Market reactions usually occur across an area rather than at one perfectly exact price." },
      { id: "q2", prompt: "What is a useful confirmation after a resistance break?", options: ["A break-and-retest that holds", "Ignoring price", "Increasing leverage automatically", "Removing all risk controls"], correctIndex: 0, explanation: "A successful retest can provide evidence that former resistance is being accepted as support." },
    ],
    practiceHref: "/trade",
    practiceLabel: "Mark a level",
  },
  {
    id: "moving-averages-explained",
    category: "Technical Analysis",
    title: "Moving Averages Explained",
    durationMinutes: 14,
    level: "Intermediate",
    description: "Compare SMA and EMA behavior and use moving averages as trend context rather than automatic signals.",
    objective: "Choose a moving-average period and explain what it can and cannot tell you.",
    keyTakeaways: ["SMA gives equal weight to observations in its window.", "EMA reacts faster because recent observations receive more weight.", "Moving averages lag price and work best with structure and risk controls."],
    sections: [
      { heading: "SMA versus EMA", body: "A simple moving average is the arithmetic mean of recent prices. An exponential moving average weights recent prices more heavily, so it typically responds faster to a new move. Neither predicts the future by itself." },
      { heading: "Use them as a framework", body: "A moving average can help describe direction, dynamic support, or a change in momentum. Compare it with price structure and a higher timeframe, and avoid treating a crossover as a guaranteed entry.", bullets: ["Short periods respond quickly but can generate more noise.", "Long periods smooth noise but react later.", "The terminal includes EMA 20 and SMA 50 overlays for practice."] },
    ],
    quiz: [
      { id: "q1", prompt: "Which average usually reacts faster to recent price changes?", options: ["EMA", "SMA", "Neither ever moves", "A fixed spread"], correctIndex: 0, explanation: "EMA gives more weight to recent observations, so it usually reacts faster." },
      { id: "q2", prompt: "What is a key limitation of moving averages?", options: ["They lag price", "They remove all volatility", "They guarantee reversals", "They replace risk management"], correctIndex: 0, explanation: "Moving averages summarize historical prices and therefore lag the current market." },
    ],
    practiceHref: "/trade",
    practiceLabel: "Use chart indicators",
  },
  {
    id: "rsi-and-momentum",
    category: "Technical Analysis",
    title: "RSI & Momentum Indicators",
    durationMinutes: 16,
    level: "Intermediate",
    description: "Use momentum readings to add context to trend, exhaustion, and possible divergence without treating them as guarantees.",
    objective: "Explain what momentum measures and how to combine it with market structure.",
    keyTakeaways: ["Momentum measures the speed or persistence of price movement.", "An overbought reading is not automatically a sell signal.", "Divergence is a clue that needs confirmation and risk control."],
    sections: [
      { heading: "Momentum is context", body: "Indicators such as RSI compare recent gains and losses over a chosen period. High readings can occur during strong trends, while low readings can persist during declines. The reading must be interpreted alongside trend and levels." },
      { heading: "Avoid single-indicator decisions", body: "Use momentum to ask better questions: Is the move accelerating? Is price making a new extreme while momentum fails to confirm? Then define an entry trigger and invalidation level before acting." },
    ],
    quiz: [
      { id: "q1", prompt: "Does an overbought RSI reading guarantee an immediate selloff?", options: ["Yes", "No; strong trends can remain overbought", "Only on weekends", "Only with high leverage"], correctIndex: 1, explanation: "Overbought describes recent momentum conditions, not a guaranteed reversal." },
      { id: "q2", prompt: "What is divergence best treated as?", options: ["A clue requiring confirmation", "A guaranteed entry", "A replacement for a stop-loss", "A transaction type"], correctIndex: 0, explanation: "Divergence can warn that momentum and price are behaving differently, but it still needs a plan." },
    ],
    practiceHref: "/trade",
    practiceLabel: "Study momentum context",
  },
  {
    id: "fibonacci-retracements",
    category: "Technical Analysis",
    title: "Fibonacci Retracements",
    durationMinutes: 20,
    level: "Advanced",
    description: "Map potential pullback zones from a clear swing and combine them with structure instead of trading a ratio alone.",
    objective: "Draw a retracement from a meaningful swing and define confirmation around the zone.",
    keyTakeaways: ["The anchor points must match the visible swing direction.", "Ratios are reference zones, not predictions.", "Confluence with structure is more useful than an isolated level."],
    sections: [
      { heading: "Anchor the swing", body: "For an upward move, measure from swing low to swing high; for a downward move, reverse the anchors. The resulting ratios describe areas where a pullback may pause, not where it must reverse." },
      { heading: "Build confluence", body: "Compare Fibonacci zones with support or resistance, trend direction, and candle behavior. If there is no confirmation or the stop distance produces unacceptable risk, the correct action can be to wait." },
    ],
    quiz: [
      { id: "q1", prompt: "What do Fibonacci ratios represent on a chart?", options: ["Potential reference zones", "Guaranteed reversal prices", "The broker's margin rate", "A news release time"], correctIndex: 0, explanation: "Ratios help organize possible pullback areas but do not guarantee a reaction." },
      { id: "q2", prompt: "What improves a Fibonacci setup?", options: ["Confluence with structure and confirmation", "Using maximum leverage", "Ignoring the swing anchors", "Removing the stop"], correctIndex: 0, explanation: "A ratio becomes more useful when it aligns with independent market evidence." },
    ],
    practiceHref: "/trade",
    practiceLabel: "Draw a retracement",
  },
  {
    id: "trading-synthetic-indices",
    category: "Advanced Topics",
    title: "Trading Synthetic Indices",
    durationMinutes: 25,
    level: "Advanced",
    description: "Understand the distinct behavior and risk considerations of continuously available synthetic instruments.",
    objective: "Differentiate synthetic-market mechanics from exchange-traded instruments and plan risk accordingly.",
    keyTakeaways: ["Synthetic instruments are not the same as real-world currency or equity markets.", "Continuous availability does not mean continuous liquidity in the same sense as an exchange.", "Read the instrument specification and use conservative risk limits."],
    sections: [
      { heading: "Know the instrument", body: "Synthetic indices are model-driven instruments with rules that differ from forex, stocks, and exchange-traded crypto. Before trading, review the instrument description, tick value, trading hours, and settlement behavior shown by the platform." },
      { heading: "Control model risk", body: "Use smaller exposure while learning, avoid assuming that a familiar chart pattern behaves identically across instruments, and keep a record of execution. A 24/7 schedule can make it easy to overtrade without a planned review routine." },
    ],
    quiz: [
      { id: "q1", prompt: "Why should synthetic indices not be assumed to behave like forex?", options: ["Their mechanics and price generation rules differ", "They never move", "They have no risk", "They always follow news"], correctIndex: 0, explanation: "Synthetic instruments have distinct mechanics and should be evaluated on their own specifications." },
      { id: "q2", prompt: "What is a sensible starting approach when learning a new synthetic instrument?", options: ["Use conservative size and review its specification", "Use maximum leverage immediately", "Assume every pattern transfers perfectly", "Trade without recording results"], correctIndex: 0, explanation: "Instrument-specific knowledge and conservative exposure reduce avoidable mistakes while learning." },
    ],
    practiceHref: "/trade",
    practiceLabel: "Review instruments",
  },
  {
    id: "binary-and-digital-options",
    category: "Advanced Topics",
    title: "Binary & Digital Options",
    durationMinutes: 22,
    level: "Advanced",
    description: "Learn how fixed-payout contracts work, why expiry matters, and how to evaluate risk before entering.",
    objective: "Compare stake, payout, expiry, and probability rather than focusing only on the headline return.",
    keyTakeaways: ["A fixed payout does not remove the possibility of losing the stake.", "Expiry creates a time-specific outcome condition.", "The break-even win rate depends on the payout structure."],
    sections: [
      { heading: "Understand the payoff", body: "A fixed-payout contract defines a stake, an outcome condition, an expiry, and a potential return. Losing trades can forfeit the stake, so the payout must be evaluated against the probability of success rather than treated as guaranteed income." },
      { heading: "Treat it as high risk", body: "Use only a clearly limited amount of risk, understand the contract terms, and avoid rapid sequences intended to recover a loss. The platform's educational material is not a promise of profitability or a substitute for reading the exact instrument specification." },
    ],
    quiz: [
      { id: "q1", prompt: "What does expiry determine in a fixed-payout contract?", options: ["When the outcome condition is evaluated", "The user's identity", "The account currency only", "The spread on every market"], correctIndex: 0, explanation: "The contract outcome is assessed at the specified expiry time or condition." },
      { id: "q2", prompt: "What should be evaluated alongside a potential payout?", options: ["The probability and possible loss of the stake", "Only the color of the button", "Maximum leverage", "A guarantee of profit"], correctIndex: 0, explanation: "Risk assessment requires considering both likelihood and the full downside." },
    ],
    practiceHref: "/trade",
    practiceLabel: "Review trade terms",
  },
  {
    id: "copy-trading-strategies",
    category: "Advanced Topics",
    title: "Copy Trading Strategies",
    durationMinutes: 18,
    level: "Intermediate",
    description: "Learn how to evaluate a strategy provider, understand allocation risk, and monitor copied positions responsibly.",
    objective: "Create a due-diligence checklist before allocating funds to a copied strategy.",
    keyTakeaways: ["Past performance does not guarantee future results.", "Drawdown, leverage, concentration, and holding period matter together.", "Set allocation limits and monitor changes in the strategy."],
    sections: [
      { heading: "Look beyond returns", body: "Review the length of the record, largest drawdown, number of trades, average holding time, leverage, and concentration. A high return paired with a large drawdown may not fit your risk tolerance." },
      { heading: "Use allocation controls", body: "Start with a limited allocation, define when you will pause copying, and understand whether copied trades can exceed your available margin. Reassess when the provider changes instruments, size, or behavior materially." },
    ],
    quiz: [
      { id: "q1", prompt: "Which metric is essential alongside historical return?", options: ["Maximum drawdown", "Profile color", "Number of followers only", "The provider's logo"], correctIndex: 0, explanation: "Drawdown shows how severe a historical decline was and adds important risk context." },
      { id: "q2", prompt: "Why use an allocation limit?", options: ["To cap how much account risk is delegated", "To guarantee copied profits", "To avoid reading the strategy", "To increase every position"], correctIndex: 0, explanation: "An allocation limit keeps one copied strategy from consuming an unsuitable share of the account." },
    ],
  },
  {
    id: "economic-calendar-trading",
    category: "Advanced Topics",
    title: "Economic Calendar Trading",
    durationMinutes: 20,
    level: "Advanced",
    description: "Use event timing, impact, forecast, and actual data to plan around releases without treating news as a guaranteed direction.",
    objective: "Build a pre-event checklist using the TradeFlow calendar and manage volatility risk.",
    keyTakeaways: ["Actual data is compared with forecast and previous values.", "High-impact releases can widen volatility and execution uncertainty.", "A sound plan includes what you will do before, during, and after the event."],
    sections: [
      { heading: "Read the release context", body: "The calendar shows the scheduled time, affected currency, impact classification, forecast, previous result, and—when available—the actual result. A surprise relative to forecast can move markets, but the reaction depends on positioning and broader conditions." },
      { heading: "Plan around volatility", body: "Decide whether to stay flat, reduce size, widen no-risk buffers, or wait for the first reaction to settle. Avoid entering solely because a release is labeled high impact. Use the Calendar's source link to inspect the original event details." },
    ],
    quiz: [
      { id: "q1", prompt: "What is a forecast used for in an economic release?", options: ["A comparison baseline for the actual result", "A guaranteed price target", "A leverage setting", "A withdrawal status"], correctIndex: 0, explanation: "The forecast provides an expectation against which the actual release can be compared." },
      { id: "q2", prompt: "Why can high-impact releases require extra caution?", options: ["They can increase volatility and execution uncertainty", "They guarantee a direction", "They stop all markets permanently", "They remove spread"], correctIndex: 0, explanation: "Important releases can produce rapid movement and less predictable execution conditions." },
    ],
    practiceHref: "/calendar",
    practiceLabel: "Open economic calendar",
  },
];

export function getEducationLesson(lessonId: string) {
  return EDUCATION_LESSONS.find((lesson) => lesson.id === lessonId);
}
