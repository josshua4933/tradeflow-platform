
## Phase 22: Admin Ledger-Reconciliation Report & Correction Workflow
- [x] Implement `admin.getWalletReconciliationReport` query returning stored balances alongside ledger transaction totals and calculated discrepancy metrics
- [x] Add an admin reconciliation panel component displaying each wallet, user details, stored balance, transaction sum, and drift
- [x] Wire the reconciliation panel to `admin.reconcileUserBalance` so administrators can submit audited corrections directly from the report
- [x] Add regression tests for ledger reconciliation reporting and correction audit logging
- [x] Run test suite, build, verify the admin report, and save a checkpoint
- [x] Add explicit regression coverage for `reconcileWalletToTarget` producing auditable ledger adjustments and audit records

## Phase 23: Isolate Action Loading States
- [x] Trace shared pending/loading state used by deposit and withdrawal controls
- [x] Trace shared pending/loading state used by BUY and SELL controls
- [x] Separate deposit and withdrawal pending indicators so only the tapped action spins
- [x] Separate BUY and SELL pending indicators so only the tapped side spins
- [x] Add regression tests for action-specific loading isolation
- [x] Run tests, build, verify the affected flows, and save a checkpoint

## Phase 24: Deposit Success Feedback and Spinner Cleanup
- [x] Trace deposit success/error handling and remaining shared spinner behavior
- [x] Add clear in-page deposit success confirmation and remove misleading success-path error feedback
- [x] Harden deposit, withdrawal, BUY, and SELL loading cleanup so only the active action spins
- [x] Add regression tests for deposit success feedback, error handling, and spinner isolation
- [x] Run tests, build, verify wallet behavior, and save a checkpoint

## Phase 25: Deposit Initiation Copy Correction
- [x] Inspect current deposit success and error copy paths
- [x] Replace misleading STK push failure wording with clear deposit initiation success feedback
- [x] Add or update tests for the deposit initiation message and save a checkpoint
