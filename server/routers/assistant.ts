import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getAssistantMessages, saveAssistantMessage, getOpenTrades, getDefaultWallet } from "../db";
import { invokeLLM } from "../_core/llm";
import { getCurrentPrice } from "./market";

const SYSTEM_PROMPT = `You are TradeFlow's intelligent trading assistant — a sophisticated, knowledgeable financial advisor embedded in a professional multi-asset trading platform.

Your expertise covers:
- Forex, Cryptocurrency, Commodities, Stocks, Indices, Binary Options, and Synthetic Indices
- Technical analysis: chart patterns, indicators (RSI, MACD, Bollinger Bands, Moving Averages), support/resistance
- Fundamental analysis: economic data, central bank policy, geopolitical events
- Risk management: position sizing, stop loss placement, risk/reward ratios, margin requirements
- Trading psychology: discipline, emotional control, journaling
- Platform features: how to place trades, manage positions, use risk tools

Guidelines:
- Be precise and professional, like a Bloomberg terminal analyst
- Always include risk warnings when suggesting trades
- Use specific numbers and percentages where relevant
- Acknowledge market uncertainty — never guarantee profits
- Explain concepts clearly for both beginners and experienced traders
- When asked about a specific instrument, provide current context and analysis
- Always recommend proper risk management (never risk more than 1-2% per trade)

Important: You are an educational tool. Always remind users that trading involves substantial risk of loss.`;

export const assistantRouter = router({
  history: protectedProcedure.query(async ({ ctx }) => {
    return getAssistantMessages(ctx.user.id, 50);
  }),

  chat: protectedProcedure
    .input(z.object({ message: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      // Get context: open trades, wallet, recent prices
      const [openTrades, wallet] = await Promise.all([
        getOpenTrades(ctx.user.id),
        getDefaultWallet(ctx.user.id),
      ]);

      const contextPrices = ["EURUSD", "BTCUSD", "XAUUSD", "US500"].map((sym) => ({
        symbol: sym,
        ...getCurrentPrice(sym),
      }));

      const contextMessage = `
Current market context:
${contextPrices.map((p) => `- ${p.symbol}: ${p.price.toFixed(5)}`).join("\n")}

User account:
- Balance: $${wallet ? parseFloat(wallet.balance).toFixed(2) : "0.00"}
- Open positions: ${openTrades.length}
- Open trades: ${openTrades.map((t) => `${t.symbol} ${t.type} ${t.lotSize} lots`).join(", ") || "None"}
`;

      // Get recent conversation history
      const history = await getAssistantMessages(ctx.user.id, 10);
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: SYSTEM_PROMPT + "\n\n" + contextMessage },
        ...history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: input.message },
      ];

      // Save user message
      await saveAssistantMessage({
        userId: ctx.user.id,
        role: "user",
        content: input.message,
      });

      // Call LLM
      const response = await invokeLLM({ messages });
      const rawContent = response.choices?.[0]?.message?.content;
      const assistantContent = typeof rawContent === "string" ? rawContent : "I apologize, I could not process your request at this time.";

      // Save assistant response
      await saveAssistantMessage({
        userId: ctx.user.id,
        role: "assistant",
        content: assistantContent,
      });

      return { response: assistantContent };
    }),

  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await (await import("../db")).getDb();
    if (db) {
      const { assistantMessages } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.delete(assistantMessages).where(eq(assistantMessages.userId, ctx.user.id));
    }
    return { success: true };
  }),

  marketAnalysis: protectedProcedure
    .input(z.object({ symbol: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { price, bid, ask } = getCurrentPrice(input.symbol);
      const prompt = `Provide a concise but comprehensive market analysis for ${input.symbol}.
Current price: ${price.toFixed(5)} (Bid: ${bid.toFixed(5)}, Ask: ${ask.toFixed(5)})

Include:
1. Current market sentiment (bullish/bearish/neutral)
2. Key support and resistance levels
3. Technical outlook (2-3 key indicators)
4. Fundamental drivers to watch
5. Risk factors
6. Short-term trade bias with entry/SL/TP levels
7. Risk warning

Keep it professional and actionable. Format with clear sections.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      });

      const rawAnalysis = response.choices?.[0]?.message?.content;
      const analysis = typeof rawAnalysis === "string" ? rawAnalysis : "Analysis unavailable";
      return { symbol: input.symbol, analysis, price, timestamp: Date.now() };
    }),
});
