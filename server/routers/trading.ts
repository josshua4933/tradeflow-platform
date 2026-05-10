import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  closeTrade,
  createNotification,
  createTrade,
  createTransaction,
  getDefaultWallet,
  getInstrumentBySymbol,
  getNotifications,
  getOpenTrades,
  getTradeHistory,
  getWalletsByUserId,
  logAudit,
  updateTradeSlTp,
  updateWalletBalance,
} from "../db";
import { getCurrentPrice } from "./market";

export const tradingRouter = router({
  openTrades: protectedProcedure.query(async ({ ctx }) => {
    const trades = await getOpenTrades(ctx.user.id);
    // Enrich with live P&L
    return trades.map((trade) => {
      const { price } = getCurrentPrice(trade.symbol);
      const lotSize = parseFloat(trade.lotSize);
      const openPrice = parseFloat(trade.openPrice);
      const contractSize = 100000; // simplified
      let pnl = 0;
      if (trade.type === "buy") {
        pnl = (price - openPrice) * lotSize * contractSize * 0.0001;
      } else {
        pnl = (openPrice - price) * lotSize * contractSize * 0.0001;
      }
      return {
        ...trade,
        currentPrice: price,
        unrealizedPnl: parseFloat(pnl.toFixed(2)),
      };
    });
  }),

  tradeHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(500).default(100) }).optional())
    .query(async ({ ctx, input }) => {
      return getTradeHistory(ctx.user.id, input?.limit ?? 100);
    }),

  placeTrade: protectedProcedure
    .input(
      z.object({
        symbol: z.string(),
        type: z.enum(["buy", "sell"]),
        lotSize: z.number().min(0.001).max(100),
        stopLoss: z.number().optional(),
        takeProfit: z.number().optional(),
        leverage: z.number().min(1).max(1000).default(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const instrument = await getInstrumentBySymbol(input.symbol);
      if (!instrument) throw new TRPCError({ code: "NOT_FOUND", message: "Instrument not found" });

      const wallet = await getDefaultWallet(ctx.user.id);
      if (!wallet) throw new TRPCError({ code: "BAD_REQUEST", message: "No wallet found. Please deposit funds first." });

      const { bid, ask } = getCurrentPrice(input.symbol);
      const openPrice = input.type === "buy" ? ask : bid;
      
      // Calculate margin required
      const contractSize = parseFloat(instrument.contractSize ?? "100000");
      const marginReq = parseFloat(instrument.marginRequirement ?? "1");
      const margin = (openPrice * input.lotSize * contractSize * marginReq) / input.leverage;
      
      const balance = parseFloat(wallet.balance);
      const currentMargin = parseFloat(wallet.margin);
      const freeMargin = balance - currentMargin;
      
      if (margin > freeMargin) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient margin. Required: $${margin.toFixed(2)}, Available: $${freeMargin.toFixed(2)}`,
        });
      }

      await createTrade({
        userId: ctx.user.id,
        walletId: wallet.id,
        instrumentId: instrument.id,
        symbol: input.symbol,
        type: input.type,
        lotSize: input.lotSize.toString(),
        openPrice: openPrice.toString(),
        stopLoss: input.stopLoss?.toString(),
        takeProfit: input.takeProfit?.toString(),
        margin: margin.toFixed(2),
        leverage: input.leverage,
      });

      // Update wallet margin
      const newMargin = currentMargin + margin;
      await updateWalletBalance(wallet.id, wallet.balance, wallet.equity, newMargin.toFixed(2));

      await createNotification({
        userId: ctx.user.id,
        type: "trade_execution",
        title: `Trade Opened: ${input.symbol}`,
        message: `${input.type.toUpperCase()} ${input.lotSize} lots of ${input.symbol} at ${openPrice.toFixed(5)}`,
        metadata: { symbol: input.symbol, type: input.type, lotSize: input.lotSize, openPrice },
      });

      await logAudit({
        userId: ctx.user.id,
        action: "trade.open",
        entity: "trade",
        details: { symbol: input.symbol, type: input.type, lotSize: input.lotSize, openPrice, margin },
      });

      return { success: true, openPrice, margin: margin.toFixed(2) };
    }),

  closeTrade: protectedProcedure
    .input(z.object({ tradeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const openTrades = await getOpenTrades(ctx.user.id);
      const trade = openTrades.find((t) => t.id === input.tradeId);
      if (!trade) throw new TRPCError({ code: "NOT_FOUND", message: "Trade not found" });

      const { bid, ask } = getCurrentPrice(trade.symbol);
      const closePrice = trade.type === "buy" ? bid : ask;
      const openPrice = parseFloat(trade.openPrice);
      const lotSize = parseFloat(trade.lotSize);
      
      // Simplified P&L calculation
      let pnl = 0;
      if (trade.type === "buy") {
        pnl = (closePrice - openPrice) * lotSize * 10000;
      } else {
        pnl = (openPrice - closePrice) * lotSize * 10000;
      }
      pnl = parseFloat(pnl.toFixed(2));

      await closeTrade(input.tradeId, closePrice.toString(), pnl.toString());

      // Update wallet balance
      const wallet = await getDefaultWallet(ctx.user.id);
      if (wallet) {
        const newBalance = parseFloat(wallet.balance) + pnl;
        const newMargin = Math.max(0, parseFloat(wallet.margin) - parseFloat(trade.margin));
        await updateWalletBalance(wallet.id, newBalance.toFixed(2), newBalance.toFixed(2), newMargin.toFixed(2));

        // Record transaction
        await createTransaction({
          userId: ctx.user.id,
          walletId: wallet.id,
          type: pnl >= 0 ? "trade_profit" : "trade_loss",
          amount: Math.abs(pnl).toFixed(2),
          currency: wallet.currency,
          status: "completed",
          description: `Trade closed: ${trade.symbol} ${trade.type} ${trade.lotSize} lots`,
        });
      }

      await createNotification({
        userId: ctx.user.id,
        type: "trade_execution",
        title: `Trade Closed: ${trade.symbol}`,
        message: `${trade.type.toUpperCase()} ${trade.lotSize} lots of ${trade.symbol} closed at ${closePrice.toFixed(5)}. P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
        metadata: { symbol: trade.symbol, pnl, closePrice },
      });

      await logAudit({
        userId: ctx.user.id,
        action: "trade.close",
        entity: "trade",
        entityId: String(input.tradeId),
        details: { symbol: trade.symbol, closePrice, pnl },
      });

      return { success: true, closePrice, pnl };
    }),

  updateSlTp: protectedProcedure
    .input(
      z.object({
        tradeId: z.number(),
        stopLoss: z.number().optional(),
        takeProfit: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const openTrades = await getOpenTrades(ctx.user.id);
      const trade = openTrades.find((t) => t.id === input.tradeId);
      if (!trade) throw new TRPCError({ code: "NOT_FOUND", message: "Trade not found" });

      await updateTradeSlTp(
        input.tradeId,
        input.stopLoss?.toString(),
        input.takeProfit?.toString()
      );

      await logAudit({
        userId: ctx.user.id,
        action: "trade.update_sltp",
        entity: "trade",
        entityId: String(input.tradeId),
        details: { stopLoss: input.stopLoss, takeProfit: input.takeProfit },
      });

      return { success: true };
    }),

  riskCalculator: protectedProcedure
    .input(
      z.object({
        symbol: z.string(),
        lotSize: z.number(),
        leverage: z.number().default(100),
        stopLossPips: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const instrument = await getInstrumentBySymbol(input.symbol);
      if (!instrument) throw new TRPCError({ code: "NOT_FOUND", message: "Instrument not found" });

      const { price } = getCurrentPrice(input.symbol);
      const contractSize = parseFloat(instrument.contractSize ?? "100000");
      const pipSize = parseFloat(instrument.pipSize ?? "0.0001");
      const marginReq = parseFloat(instrument.marginRequirement ?? "1");

      const margin = (price * input.lotSize * contractSize * marginReq) / input.leverage;
      const pipValue = input.lotSize * contractSize * pipSize;
      const riskAmount = input.stopLossPips ? pipValue * input.stopLossPips : 0;

      const wallet = await getDefaultWallet(ctx.user.id);
      const balance = wallet ? parseFloat(wallet.balance) : 0;
      const riskPercent = balance > 0 ? (riskAmount / balance) * 100 : 0;

      return {
        margin: margin.toFixed(2),
        pipValue: pipValue.toFixed(4),
        riskAmount: riskAmount.toFixed(2),
        riskPercent: riskPercent.toFixed(2),
        currentPrice: price,
        recommendedLotSize: balance > 0
          ? ((balance * 0.02) / (pipValue * (input.stopLossPips ?? 20))).toFixed(4)
          : "0.01",
      };
    }),

  portfolioSummary: protectedProcedure.query(async ({ ctx }) => {
    const wallets = await getWalletsByUserId(ctx.user.id);
    const openTrades = await getOpenTrades(ctx.user.id);
    
    let totalUnrealizedPnl = 0;
    openTrades.forEach((trade) => {
      const { price } = getCurrentPrice(trade.symbol);
      const lotSize = parseFloat(trade.lotSize);
      const openPrice = parseFloat(trade.openPrice);
      let pnl = 0;
      if (trade.type === "buy") {
        pnl = (price - openPrice) * lotSize * 10000;
      } else {
        pnl = (openPrice - price) * lotSize * 10000;
      }
      totalUnrealizedPnl += pnl;
    });

    const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance), 0);
    const totalMargin = wallets.reduce((sum, w) => sum + parseFloat(w.margin), 0);
    const equity = totalBalance + totalUnrealizedPnl;
    const freeMargin = equity - totalMargin;
    const marginLevel = totalMargin > 0 ? (equity / totalMargin) * 100 : 0;
    const isMarginCall = marginLevel > 0 && marginLevel < 100;
    const isStopOut = marginLevel > 0 && marginLevel < 50;

    // Fire margin call notification if margin level is critically low
    if (isMarginCall && openTrades.length > 0) {
      const recentNotifs = await getNotifications(ctx.user.id, 5);
      const lastMarginAlert = recentNotifs.find(
        (n: { type: string; createdAt: Date | null }) =>
          n.type === "margin_call" &&
          n.createdAt &&
          Date.now() - new Date(n.createdAt).getTime() < 60 * 60 * 1000
      );
      if (!lastMarginAlert) {
        await createNotification({
          userId: ctx.user.id,
          type: "margin_call",
          title: isStopOut ? "⚠️ Stop-Out Warning" : "⚠️ Margin Call Alert",
          message: isStopOut
            ? `Your margin level is critically low at ${marginLevel.toFixed(0)}%. Positions may be closed automatically.`
            : `Your margin level has fallen to ${marginLevel.toFixed(0)}%. Please deposit funds or close positions.`,
          metadata: { marginLevel: marginLevel.toFixed(2), equity: equity.toFixed(2), margin: totalMargin.toFixed(2) },
        });
      }
    }

    return {
      totalBalance: totalBalance.toFixed(2),
      equity: equity.toFixed(2),
      margin: totalMargin.toFixed(2),
      freeMargin: freeMargin.toFixed(2),
      marginLevel: marginLevel.toFixed(2),
      unrealizedPnl: totalUnrealizedPnl.toFixed(2),
      openPositions: openTrades.length,
      isMarginCall,
      isStopOut,
    };
  }),
});
