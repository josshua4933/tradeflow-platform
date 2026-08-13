# TradeFlow Platform — TODO

## Phase 1: Foundation
- [x] Design system: Didone serif editorial theme, CSS variables, typography scale
- [x] Install dependencies: lightweight-charts, speakeasy (2FA), stripe, zod validators
- [x] Database schema: users extended, wallets, trades, positions, instruments, alerts, kyc, audit_log, referrals, copy_trading, signals, notifications
- [x] Run migrations via webdev_execute_sql

## Phase 2: Backend Routers
- [x] Auth router: login, 2FA setup/verify, session management
- [x] KYC router: submit documents, status check
- [x] Market data router: instruments list, OHLCV candles, bid/ask prices, market hours
- [x] Trading router: place order, close position, trade history, open positions
- [x] Account router: wallets, deposit, withdrawal, transaction history, leverage
- [x] Risk router: margin calc, equity calc, position size calculator, margin call check
- [x] Social router: leaderboard, follow trader, copy trade settings, signals
- [x] Notifications router: list, mark read, create alert, price alert triggers
- [x] Affiliate router: referral code, referral stats, commission history
- [x] Compliance router: audit log, terms acceptance
- [x] LLM assistant router: market analysis, trade suggestions, risk explanations
- [x] Price simulation engine: realistic prices for all asset classes

## Phase 3: Core Frontend
- [x] Editorial design system in index.css (Didone serif, cream palette, typography)
- [x] Landing page with hero, features, markets preview, CTA
- [x] Dashboard layout with sidebar navigation
- [x] Profile/settings page with 2FA and KYC

## Phase 4: Trading Interface
- [x] TradingView Lightweight Charts integration (v5 API)
- [x] Multi-timeframe chart controls (1m, 5m, 15m, 1h, 4h, 1d)
- [x] Asset selector with Forex, Crypto, Commodities, Stocks, Synthetic
- [x] Real-time bid/ask price display with spread
- [x] Order placement panel (buy/sell, lot size, leverage, SL/TP)
- [x] Open positions table with live P&L
- [x] Closed positions / trade history table
- [x] Price alerts configuration

## Phase 5: Account Management
- [x] Multi-currency wallet dashboard
- [x] Deposit flow with Stripe integration
- [x] Withdrawal request form and status tracking
- [x] Transaction history table
- [x] Leverage settings per wallet
- [x] Account verification status display (KYC)

## Phase 6: Advanced Features
- [x] Copy trading: browse traders, follow/unfollow, copy settings
- [x] Social leaderboard with performance metrics
- [x] Trading signals feed with buy/sell indicators and confidence scores
- [x] Economic calendar with event severity indicators
- [x] LLM trading assistant chat interface with quick prompts
- [x] Educational resources section

## Phase 7: Risk & Compliance
- [x] Portfolio summary: margin level, equity, free margin, P&L
- [x] Position size calculator tool
- [x] Margin call alert system
- [x] Affiliate/referral program dashboard
- [x] Audit trail log viewer
- [x] Terms of Service page
- [x] Risk Disclosure page
- [x] AML Policy page
- [x] In-app notification center

## Phase 8: Polish & Delivery
- [x] PWA manifest
- [x] Mobile responsive design
- [x] Vitest unit tests (42 tests, 2 test files, all passing)
- [x] Final checkpoint and delivery


## Phase 9: Admin Dashboard
- [x] Admin router: getAllUsers, getUserDetails, updateUserStatus
- [x] Admin router: getAllDeposits, getDepositDetails, confirmDeposit
- [x] Admin router: getAllWithdrawals, approveWithdrawal, rejectWithdrawal
- [x] Admin router: getAllKycDocuments, approveKyc, rejectKyc
- [x] Admin router: getAllTrades, getTradingStats
- [x] Admin router: getPlatformAnalytics (total deposits, withdrawals, users, volume)
- [x] Admin router: manageNotifications (send system-wide alerts)
- [x] Admin page: Users management table with filters
- [x] Admin page: Deposits tracking with approval workflow
- [x] Admin page: Withdrawals management with approve/reject
- [x] Admin page: KYC documents review with approval
- [x] Admin page: Trading activity monitor
- [x] Admin page: Platform analytics dashboard
- [x] Role-gating: /admin route protected to admin users only
- [x] Update owner user to admin role
- [x] Test admin workflows

## Phase 10: PalPlus Payment Integration
- [x] PalPlus service layer: createPayplusDeposit, createPayplusPayout, webhook verification
- [x] Account router: createDepositIntent (returns checkout URL)
- [x] Account router: requestWithdrawal (creates pending withdrawal)
- [x] PalPlus webhook handler: payment.completed, payout.completed, payout.failed
- [x] Register PalPlus webhook route at /api/payplus/webhook
- [x] Webhook updates wallet balances on deposit confirmation
- [x] Webhook handles payout completion and failure with refunds
- [x] Admin approval workflow for withdrawals
- [x] End-to-end deposit flow: checkout -> webhook -> wallet credit
- [x] End-to-end withdrawal flow: request -> admin approval -> payout -> webhook

## Phase 11: Live Market Verification
- [x] Trace Binance klines startup and Trading Terminal subscription wiring; verify live candle data reaches the frontend
- [x] Fix missing Binance klines initialization or invalid stream subscriptions if confirmed
- [x] Run TypeScript/tests and verify runtime Binance and frontend candle events before checkpoint
- [x] Save a checkpoint only after live-data verification passes

> Note: Do not mark these items complete until the server and frontend delivery are verified.

## Phase 12: Trading Terminal Chart Display Fix
- [x] Trace why verified live candle data is not visibly rendered in the Trading Terminal
- [x] Fix chart initialization, historical candle transformation, and live candle updates
- [x] Run TypeScript/tests and verify the candle delivery path and chart data are valid; browser visual verification requires an authenticated terminal session
- [x] Save a checkpoint after live data, chart sizing, production build, and end-to-end candle delivery verification; visual route inspection remains blocked by the expired browser login session

## Phase 13: Professional Trading Terminal Layout and Order Controls
- [x] Redesign the Trading Terminal to use at least 80% of the viewport and align with page edges
- [x] Expand the chart and analysis workspace for clear candlestick review
- [x] Make Buy and Sell controls execute reliably with validation, loading, success, and error feedback
- [x] Run TypeScript/tests, verify the responsive preview, and save a checkpoint

- [x] Replace the narrow terminal wrapper with an edge-to-edge, viewport-sized trading workspace
- [x] Verify every selectable crypto symbol has an active instrument record and live executable pricing
- [x] Reconcile order execution and open-position pricing with the Binance price feed for supported crypto pairs
- [x] Add explicit Buy/Sell loading, success, and error feedback and validate the flow with tests

## Phase 14: TradingView-Style Terminal Transformation
- [x] Build a TradingView-style top toolbar with asset search, ticker badge, change indicator, timeframe selector, chart type toggle, indicators menu, and fullscreen controls
- [x] Upgrade the Lightweight Charts container with dark professional styling, crosshair sync, grid dots, volume pane, and price scale padding
- [x] Create a right-hand professional order ticket tabbed interface (Market, Limit, Stop, Risk Calculator) with real-time bid/ask and leverage controls
- [x] Build a bottom multi-tab trading panel (Open Positions with live P&L and quick close, Pending Orders, Trade History, Account Summary, Asset Info)
- [x] Add real-time price flashing, notification toast integration, and robust error handling matching TradingView/Binance UX
- [x] Add unit coverage for TradingView-style terminal formatting, quote-side calculations, and symbol filtering

## Phase 15: TradingView-Style Terminal Follow-Up
- [x] Implement a real indicators menu with selectable overlays instead of static indicator labels
- [x] Add a crosshair-linked chart legend/status readout for OHLC and volume values
- [x] Add explicit websocket/chart market-data error handling and recovery state in the terminal UI
- [x] Clarify unsupported pending limit/stop order staging in the UI and prevent it from appearing as executable functionality

## Phase 16: Execution Verification Before Delivery
- [x] Add focused regression coverage for authenticated Buy/Sell submission validation, live quote pricing, and open-position pricing
- [x] Verify the selectable crypto symbol set against active database instruments and the live quote source with a documented query result
- [x] Capture authenticated `/trade` verification or clearly preserve the login-blocked limitation in the delivery notes
- [x] Save the final checkpoint after the execution verification work is complete

## Phase 17: Position Lifecycle and Account Settlement
- [x] Add a shared position settlement helper that calculates close-side execution price and realized P&L consistently for buy and sell positions
- [x] Recalculate wallet balance, equity, used margin, free margin, and margin level after every close or automatic settlement
- [x] Automatically close positions when stop-loss or take-profit is reached and release their reserved margin
- [x] Automatically liquidate positions when account equity/free margin breaches the configured liquidation threshold
- [x] Add focused tests for realized P&L, margin release, stop-loss/take-profit, and liquidation behavior
- [x] Refresh the closed-trade history panel after automatic settlement so realized P&L is visible immediately
- [x] Reconcile persisted wallet margin and free margin against currently open trades even when a position was previously closed without releasing its reservation

## Phase 18: Autonomous Settlement Sweep
- [x] Add a platform-safe `/api/scheduled/settleAccounts` callback that sweeps every funded account without relying on in-process timers
- [x] Centralize the stop-out threshold and equity/free-margin liquidation rules so the policy is explicit and testable
- [x] Add cron-handler tests for cron-only authentication, idempotent account sweeping, and structured error responses
- [x] Add a repeated-sweep regression test proving no duplicate wallet credit, transaction, or trade closure occurs on a second run
- [x] Create and activate the project-level Heartbeat schedule after the deployed callback is available

## Phase 19: Lightweight Charts Timestamp Ordering Fix
- [x] Sort historical and live candles monotonically by timestamp in the Trading Terminal
- [x] Deduplicate and filter out stale or out-of-order candle updates before calling `series.update()` or `series.setData()`
- [x] Add unit tests for monotonic sorting and duplicate/stale candle filtering in Lightweight Charts
- [x] Run full test suite, rebuild, and save checkpoint
