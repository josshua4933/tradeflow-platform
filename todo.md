
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
