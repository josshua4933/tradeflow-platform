import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createNotification,
  createTrade,
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
import { settleAccountRisk, settleTradeForUser } from "../tradingSettlement";

const CONTRACT_SIZE_FALLBACK = 100000;

export const tradingRouter = router({
  openTrades: protectedProcedure.query(async ({ ctx }) => {
    // Polling this query is the event-driven settlement trigger for the UI. It
    // closes SL/TP positions and stop-outs before returning account state.
    await settleAccountRisk(ctx.user.id);
    const trades = await getOpenTrades(ctx.user.id);

    return Promise.all(trades.map(async (trade) => {
      const { price } = getCurrentPrice(trade.symbol);
      const instrument = await getInstrumentBySymbol(trade.symbol);
      const lotSize = parseFloat(trade.lotSize);
      const openPrice = parseFloat(trade.openPrice);
      const contractSize = parseFloat(instrument?.contractSize ?? String(CONTRACT_SIZE_FALLBACK));
      const direction = trade.type === "buy" ? 1 : -1;
      const pnl = (price - openPrice) * lotSize * contractSize * direction;

      return {
        ...trade,
        currentPrice: price,
        unrealizedPnl: parseFloat(pnl.toFixed(2)),
      };
    }));
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
      // Sweep stale/triggered positions before checking available margin so a
      // finished trade cannot keep reserving margin for a new order.
      await settleAccountRisk(ctx.user.id);

      const instrument = await getInstrumentBySymbol(input.symbol);
      if (!instrument) throw new TRPCError({ code: "NOT_FOUND", message: "Instrument not found" });

      const wallet = await getDefaultWallet(ctx.user.id);
      if (!wallet) throw new TRPCError({ code: "BAD_REQUEST", message: "No wallet found. Please deposit funds first." });

      const { bid, ask } = getCurrentPrice(input.symbol);
      const openPrice = input.type === "buy" ? ask : bid;

      const contractSize = parseFloat(instrument.contractSize ?? String(CONTRACT_SIZE_FALLBACK));
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

      const newMargin = currentMargin + margin;
      const newEquity = balance;
      const newFreeMargin = newEquity - newMargin;
      await updateWalletBalance(wallet.id, balance.toFixed(2), newEquity.toFixed(2), newMargin.toFixed(2));

      await createNotification({
        userId: ctx.user.id,
        type: "trade_execution",
        title: `Trade Opened: ${input.symbol}`,
        message: `${input.type.toUpperCase()} ${input.lotSize} lots of ${input.symbol} at ${openPrice.toFixed(5)}. Free margin: $${newFreeMargin.toFixed(2)}`,
        metadata: { symbol: input.symbol, type: input.type, lotSize: input.lotSize, openPrice, margin },
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
      const trade = openTrades.find((candidate) => candidate.id === input.tradeId);
      if (!trade) throw new TRPCError({ code: "NOT_FOUND", message: "Trade not found" });

      const result = await settleTradeForUser({ userId: ctx.user.id, trade, reason: "manual" });
      if (!result.closed) throw new TRPCError({ code: "CONFLICT", message: "Trade was already closed" });

      return { success: true, closePrice: result.closePrice, pnl: result.pnl };
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
      const trade = openTrades.find((candidate) => candidate.id === input.tradeId);
      if (!trade) throw new TRPCError({ code: "NOT_FOUND", message: "Trade not found" });

      await updateTradeSlTp(input.tradeId, input.stopLoss?.toString(), input.takeProfit?.toString());
      await settleAccountRisk(ctx.user.id);

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
      await settleAccountRisk(ctx.user.id);
      const instrument = await getInstrumentBySymbol(input.symbol);
      if (!instrument) throw new TRPCError({ code: "NOT_FOUND", message: "Instrument not found" });

      const { price } = getCurrentPrice(input.symbol);
      const contractSize = parseFloat(instrument.contractSize ?? String(CONTRACT_SIZE_FALLBACK));
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
    const riskState = await settleAccountRisk(ctx.user.id);
    const wallets = await getWalletsByUserId(ctx.user.id);
    const openTrades = await getOpenTrades(ctx.user.id);
    const totalBalance = wallets.reduce((sum, wallet) => sum + parseFloat(wallet.balance), 0);
    const totalMargin = wallets.reduce((sum, wallet) => sum + parseFloat(wallet.margin), 0);
    const equity = riskState.account.equity;
    const freeMargin = riskState.account.freeMargin;
    const marginLevel = totalMargin > 0 ? (equity / totalMargin) * 100 : 0;
    const isMarginCall = marginLevel > 0 && marginLevel < 100;
    const isStopOut = marginLevel > 0 && marginLevel < 50;

    if (isMarginCall && openTrades.length > 0) {
      const recentNotifs = await getNotifications(ctx.user.id, 5);
      const lastMarginAlert = recentNotifs.find(
        (notification: { type: string; createdAt: Date | null }) =>
          notification.type === "margin_call" &&
          notification.createdAt &&
          Date.now() - new Date(notification.createdAt).getTime() < 60 * 60 * 1000
      );
      if (!lastMarginAlert) {
        await createNotification({
          userId: ctx.user.id,
          type: "margin_call",
          title: isStopOut ? "Stop-Out Protection Triggered" : "Margin Call Alert",
          message: isStopOut
            ? "Positions were automatically closed because account equity breached the stop-out threshold."
            : `Your margin level is ${marginLevel.toFixed(0)}%. Add funds or reduce exposure.`,
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
      unrealizedPnl: riskState.account.unrealizedPnl.toFixed(2),
      openPositions: openTrades.length,
      isMarginCall,
      isStopOut,
    };
  }),
});
