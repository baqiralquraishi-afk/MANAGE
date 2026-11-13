# Data Retention, Secure Purging & Legal-Hold Policy

## 1. Overview and Operational Scope

The Humanity Platform serves Iraqi humanitarian casework and financial assistance operations. In accordance with humanitarian data protection standards, the Principle of Data Minimization, and strict PostgreSQL Row Level Security (RLS), personal data, private civil documents, and financial records are governed by defined retention horizons and legal-hold procedures.

## 2. Retention Horizons Matrix

| Data Category                           | Tables / Storage                                                     | Retention Period                       | Destruction / Purge Method                                            | Designated Policy Owner          |
| --------------------------------------- | -------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| **Active Cases & Beneficiary Profiles** | `beneficiaries`, `cases`, `households`                               | Active duration + 5 years post-closure | Soft-archival, followed by cryptographically verified deletion of PII | Safeguarding & Casework Lead     |
| **Private Document Attachments**        | `document_metadata`, `documents-private` (Storage)                   | 5 years post-case closure              | Secure storage object deletion and metadata nullification             | Data Protection Officer (DPO)    |
| **Financial Ledger & Reversals**        | `finance_ledger`, `assistance_entitlements`, `assistance_deliveries` | 10 years statutory financial horizon   | Append-only immutable retention; never truncated or mutated           | Head of Finance & Internal Audit |
| **Security Audit Logs**                 | `audit_logs`                                                         | Permanent (Immutable)                  | Append-only database triggers (`ERR_AUDIT_IMMUTABLE`)                 | Security Administrator           |
| **Temporary Signed Download Tokens**    | `document_access_tokens`                                             | 300 - 900 seconds (Max 15 minutes)     | Automatic TTL expiration (`ERR_DOWNLOAD_LINK_EXPIRED`)                | Security Administrator           |
| **In-App Notifications**                | `in_app_notifications`                                               | 90 days                                | Automated rollover purge                                              | Systems Administrator            |

## 3. Legal-Hold Override Policy

### 3.1 Definition & Authority

A **Legal Hold** is a mandatory administrative and technical freeze placed on case files, beneficiary records, or document metadata subject to ongoing judicial inquiries, safeguarding investigations, or donor compliance audits.

### 3.2 Technical Enforcement

- Database column: `document_metadata.is_legal_hold BOOLEAN NOT NULL DEFAULT false`
- Database column: `document_metadata.legal_hold_reason TEXT`
- Database Trigger: `trg_protect_legal_hold_documents` intercepts any `DELETE` or archival query on records with `is_legal_hold = true` and raises `ERR_LEGAL_HOLD_ACTIVE`.
- Deletion operations fail closed when legal hold is active.

### 3.3 Removal of Legal Hold

Removal of a legal hold requires explicit dual-authorization from the Legal Counsel and Data Protection Officer, with an immutable entry appended to `audit_logs`.

## 4. Privacy-Preserving Reporting (k-Anonymity Guard)

To prevent re-identification of beneficiaries in rare vulnerability categories or small geographic cells:

- All aggregate operational reports enforce a **k-anonymity suppression threshold of 5**.
- Any cell or breakdown count between 1 and 4 is automatically suppressed and reported as `< 5` in exports and visual dashboards.
- Individual casework velocity and sensitive assistance metrics are strictly scoped to the viewing staff member's authorized governorate and sector permissions.

## 5. Unresolved Policy Decisions & Designated Owners

| Policy Area                   | Unresolved Decision                                                | Options Under Review                                | Interim Rule                                                          | Designated Owner                |
| ----------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------- |
| **Civil ID Scan Retention**   | Exact horizon for national identity document scans post-assistance | 3 years vs 5 years post-closure                     | Retained for 5 years with encrypted private storage                   | Data Protection Officer         |
| **Biometric Image Storage**   | Retention of recipient visual verification photographs             | Immediate purge post-delivery vs 1 year retention   | Only verification metadata retained; photos not persisted permanently | Safeguarding Lead               |
| **Cross-Border Audit Access** | Scope of donor auditor access to individual documentation          | Anonymized extracts vs full signed temporary access | Anonymized extracts with k-anonymity suppression default              | Head of Mission & Legal Counsel |
