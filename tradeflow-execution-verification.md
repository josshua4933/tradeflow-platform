# TradeFlow Execution Verification

## Automated verification

The focused execution contract tests pass in `server/tradeflow.test.ts`. They cover an authenticated BTCUSD Buy request returning a positive executable open price and margin, invalid Buy/Sell quantity rejection before execution, and open-position enrichment returning a finite current price and unrealized P&L. The existing live-market tests also confirm Binance symbol normalization and a deterministic BTCUSD quote of 65,432.10 with bid 65,427.10 and ask 65,437.10. Additional router tests assert that Buy uses the ask, Sell uses the bid, missing instruments return `NOT_FOUND`, and insufficient margin is rejected before `createTrade` is called.

The full Vitest suite passes with 60 tests across 5 test files. TypeScript validation with `pnpm exec tsc --noEmit` passes, and the production build completes successfully.

## Database verification

The terminal exposes these symbols: BTCUSD, ETHUSD, BNBUSD, XRPUSD, ADAUSD, SOLUSD, DOGEUSD, and AVAXUSD. A direct database query returned exactly 8 rows for those symbols. Every returned row has `isActive = 1`, a positive `minLot`, `contractSize = 1.0000`, and a populated `marginRequirement`.

| Symbol | Active | Minimum lot | Contract size | Margin requirement |
|---|---:|---:|---:|---:|
| ADAUSD | 1 | 0.0010 | 1.0000 | 1.0000 |
| AVAXUSD | 1 | 0.0010 | 1.0000 | 1.0000 |
| BNBUSD | 1 | 0.0010 | 1.0000 | 1.0000 |
| BTCUSD | 1 | 0.0010 | 1.0000 | 1.0000 |
| DOGEUSD | 1 | 0.0010 | 1.0000 | 1.0000 |
| ETHUSD | 1 | 0.0100 | 1.0000 | 1.0000 |
| SOLUSD | 1 | 0.1000 | 1.0000 | 2.0000 |
| XRPUSD | 1 | 1.0000 | 1.0000 | 2.0000 |

## Browser verification limitation

The development preview redirects unauthenticated requests to the Manus sign-in page. The authenticated `/trade` route could not be exercised in this sandbox session because no active browser login was available. Runtime logs nevertheless show the Binance kline stream and Socket.IO market-data services active, and no chart exception was recorded. The remaining browser step is to sign in, open `/trade`, and visually confirm the rendered terminal plus one Buy and one Sell interaction in the authenticated session.

A final browser recheck of `/trade` was attempted after the project status preview showed the dashboard. The sandbox browser itself still redirected `/trade` to the Manus sign-in page, so the terminal could not be visually exercised in that browser session. This remains an environment/session limitation rather than a TypeScript, build, database, or automated execution-test failure.
