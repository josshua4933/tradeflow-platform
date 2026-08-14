# Wallet Ledger Verification

## Scope

TradeFlow now uses `server/walletLedger.ts` as the single balance mutation layer for funding and administrative adjustments. The service updates the wallet and its ledger transaction inside the same database transaction for deposits, withdrawal reservation/refund, and admin balance adjustments. Admin adjustments also write `admin.adjust_balance` to `audit_log` in that same transaction.

## Delegated paths

| Entry point | Ledger operation | Idempotency behavior |
|---|---|---|
| `account.requestWithdrawal` | `createWithdrawalRequest` | Balance is reserved once at request creation |
| `account.createWithdrawal` | `createWithdrawalRequest` | Balance is reserved once at request creation |
| `admin.confirmDeposit` | `settleDeposit` | Completed or ledger-applied deposits are ignored on repeat |
| `admin.approveWithdrawal` | `reserveExistingWithdrawal` | Legacy pending withdrawals are reserved once before payout |
| `admin.rejectWithdrawal` | `settleWithdrawalFailure` | A reserved withdrawal is refunded once |
| PalPluss `payment.completed` | `settleDeposit` | Repeated webhook delivery cannot credit twice |
| PalPluss `payout.completed` | `settleWithdrawalSuccess` | Repeated completion cannot refund or mutate balance |
| PalPluss `payout.failed` | `settleWithdrawalFailure` | Repeated failure cannot refund twice |
| Stripe `checkout.session.completed` | `settleDeposit` | Existing references are reused and repeated events do not credit twice |
| `admin.adjustUserBalance` | `createAdminBalanceAdjustment` | Creates a completed ledger row and admin audit row atomically |
| `admin.reconcileUserBalance` | `reconcileWalletToTarget` | Converts an explicit target into a documented admin adjustment |

## Automated coverage

`server/walletLedger.test.ts` covers fixed-point normalization, funding deltas, equity/margin preservation, and negative-balance rejection. `server/walletLedger.integration.test.ts` covers deposit confirmation idempotency, withdrawal reservation/refund, successful withdrawal completion, duplicate completion, and the paired admin ledger/audit writes. The complete project suite passed with 89 tests, TypeScript passed, and the production build passed.

## Existing-data limitation

Legacy wallet rows may contain historical transactions that were created before this service stamped `ledgerApplied`, `balanceReserved`, or `refundApplied`. Those rows are not silently rewritten. An administrator must use `admin.reconcileUserBalance` with a documented target and reason; the operation creates an auditable adjustment rather than changing the wallet balance without a ledger entry.

This verification is service/adapter-level coverage. The route and webhook handlers listed above delegate to these tested operations; live payment-provider delivery and production admin interaction still require authenticated deployment testing.
