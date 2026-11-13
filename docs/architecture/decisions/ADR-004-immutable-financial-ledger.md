# ADR-004: Immutable Financial Ledger & Reversal Accounting

**Status:** Accepted  
**Date:** 13 November 2026

## Context

Humanitarian cash and voucher assistance in Iraq requires strict donor accountability (UNOCHA, USAID, EU ECHO, UNHCR). Traditional database designs that update account balances in-place or permit record deletion allow fraud, conceal embezzlement, and prevent forensic audit trails.

## Decision

1. **Append-Only Ledger:** Financial assistance distributions and voucher redemptions are written to an append-only ledger (`finance_transactions`).
2. **PostgreSQL Immutability Triggers:** Database triggers intercept and raise exceptions on any `UPDATE` or `DELETE` statement targeting posted ledger records.
3. **Double-Entry Reversals:** Errors, duplicate disbursements, or canceled aid packages must be rectified exclusively through compensating reversal transactions referencing the original transaction ID with a recorded rationale.
4. **Segregation of Duties (Maker-Checker):** Any transaction entry creation requires distinct Maker (caseworker/officer) and Checker (finance controller) identities. Database constraints prevent a user from approving their own disbursement.

## Consequences

- **Positive:** Complete mathematical and legal traceability for donor audits and internal compliance.
- **Negative:** Requires ledger reconciliation procedures and prevents quick manual edits of incorrect records in the database.
