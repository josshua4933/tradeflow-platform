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


## Phase 9: Admin Dashboard (NEW)
- [ ] Admin router: getAllUsers, getUserDetails, updateUserStatus
- [ ] Admin router: getAllDeposits, getDepositDetails, confirmDeposit
- [ ] Admin router: getAllWithdrawals, approveWithdrawal, rejectWithdrawal
- [ ] Admin router: getAllKycDocuments, approveKyc, rejectKyc
- [ ] Admin router: getAllTrades, getTradingStats
- [ ] Admin router: getPlatformAnalytics (total deposits, withdrawals, users, volume)
- [ ] Admin router: manageNotifications (send system-wide alerts)
- [ ] Admin page: Users management table with filters
- [ ] Admin page: Deposits tracking with approval workflow
- [ ] Admin page: Withdrawals management with approve/reject
- [ ] Admin page: KYC documents review with approval
- [ ] Admin page: Trading activity monitor
- [ ] Admin page: Platform analytics dashboard
- [ ] Role-gating: /admin route protected to admin users only
- [ ] Update owner user to admin role
- [ ] Test admin workflows
