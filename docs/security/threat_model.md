# Humanity Platform: Comprehensive Threat Model & Mitigation Strategy

**Version:** 1.0.0  
**Context:** Humanitarian Operations in Iraq  
**Compliance Standard:** Principle of Least Privilege, Zero Trust Architecture, Protection of Vulnerable Populations

---

## 1. Threat Landscape & Threat Actors

In humanitarian contexts across Iraq, systems manage highly sensitive personal identifiable information (PII) including religious affiliations, displacement history, biometric document numbers, and physical addresses. Compromise of this data exposes beneficiaries to extortion, sectarian discrimination, physical violence, or financial theft.

### Threat Actor Profiles:

1. **Opportunistic Device Thieves / Lost Device Finders:** Physical access to field caseworker phones or tablets in public transit, checkpoints, or field camps.
2. **Curious or Malicious Insiders:** Caseworkers or staff seeking unauthorized information about neighbors, prominent community members, or attempting to misdirect financial assistance.
3. **External Cyber Attackers:** Remote threat actors targeting web interfaces to exfiltrate database records or deploy ransomware.
4. **Coerced Field Staff:** Caseworkers pressured at local checkpoints or by armed actors to disclose beneficiary registries.

---

## 2. Threat Scenarios & Architectural Mitigations

| #         | Threat Scenario                                   | Attack Vector & Impact                                                                         | Architectural Mitigation & Enforcement                                                                                                                                                                                                                                                                      |
| :-------- | :------------------------------------------------ | :--------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TH-01** | **Lost / Stolen Field Device**                    | Physical seizure of caseworker device containing cached beneficiary profiles.                  | • AES-256 local database encryption using platform Keystore/Keychain.<br/>• Strictly bounded caching: only cases explicitly assigned to the caseworker are stored locally.<br/>• Master data bulk export disabled on mobile.<br/>• Configurable auto-wipe on session expiration or remote token revocation. |
| **TH-02** | **Account Takeover (ATO)**                        | Credential stuffing, phishing, or stolen JWT access token.                                     | • MFA/TOTP required for all administrative and finance roles.<br/>• Strict session lifetime (1 hour max for access tokens, rolling refresh tokens).<br/>• Supabase GoTrue token revocation on password change or suspicious IP anomaly.<br/>• Dedicated device binding where practical.                     |
| **TH-03** | **Malicious Insider Querying / Snooping**         | Caseworker querying records outside their assigned governorate or programme.                   | • Deny-by-default Row-Level Security (RLS) evaluated inside PostgreSQL.<br/>• Role and scope resolved server-side from `user_roles` and `user_scopes` relational tables, never client JWT claims.<br/>• Attempted unauthorized cross-scope queries return empty sets or fail.                               |
| **TH-04** | **Beneficiary Enumeration & Scraping**            | Scripted attacker querying sequential IDs or pagination to harvest the beneficiary registry.   | • UUIDv4 primary keys throughout all tables (no sequential integer IDs exposed).<br/>• Strict rate-limiting at API Gateway (Traefik/Kong): max 60 requests/min per IP/token.<br/>• Keyset cursor pagination enforcing maximum page size of 50 records.                                                      |
| **TH-05** | **Mass Data Exfiltration / Unauthorized Exports** | Staff member with reporting access attempting to dump the entire national database.            | • Export capability restricted exclusively to `report_viewer` and `security_admin` roles.<br/>• Mandatory export reason logging in immutable `audit_logs` including date range and query parameters.<br/>• Hard query row budget caps on exports (max 1,000 rows per export).                               |
| **TH-06** | **Offline Data Cache Extraction**                 | Direct extraction of device flash storage via ADB/root debugging.                              | • Root/Jailbreak detection on mobile app startup with execution block.<br/>• Database files encrypted with SQLCipher; decryption key never written to persistent disk.<br/>• Memory clearing of sensitive records on app minimization or backgrounding.                                                     |
| **TH-07** | **Sync Replay & Tampered Conflict Injection**     | Attacker intercepting sync requests to replay modified case approvals or assistance amounts.   | • Every sync mutation carries an `idempotency_key` and cryptographic signature.<br/>• Server-side revalidation of eligibility, case status, and permissions upon ingest.<br/>• Offline mutations can **never** execute financial disbursements or approvals.                                                |
| **TH-08** | **Document Tampering & Direct Link Leakage**      | Attacker guessing document URLs to access scanned identity cards or medical reports.           | • Storage buckets configured as **strictly private** (public read access disabled).<br/>• Storage object keys use opaque UUIDs (`storage/documents/<uuid>/<file_uuid>`).<br/>• Access granted exclusively via signed, time-limited URLs (15 minutes maximum validity) verified against RLS object policies. |
| **TH-09** | **Financial Assistance Fraud (Self-Approval)**    | Staff member creating a synthetic case and approving a cash grant to themselves or associates. | • Dual-authorization Maker-Checker enforcement.<br/>• Database constraint: `CHECK (created_by != approved_by)` on financial allocations.<br/>• Financial ledger is append-only with immutable trigger protection (updates and deletions strictly raise exceptions).                                         |
| **TH-10** | **Ransomware / Host Destruction in Iraq**         | Physical destruction of local server or ransomware attack on hosting environment.              | • Automated, encrypted, scheduled daily backups (AES-256).<br/>• Off-site / secondary geographically isolated immutable replica.<br/>• Documented and routinely tested Disaster Recovery (DR) restoration runbooks.                                                                                         |

---

## 3. Incident Response Runbooks

### 3.1 Lost or Compromised Mobile Device Runbook

1. **Immediate Notification:** Field caseworker immediately reports device loss to the Security Admin.
2. **Token & Session Revocation:** Security Admin executes the immediate revocation procedure:
   - Invalidates active Supabase refresh tokens for the affected user.
   - Updates `staff_devices` table setting `status = 'revoked'`.
3. **Database Audit:** Queries `audit_logs` for all data queried or mutated by the compromised device in the preceding 72 hours.
4. **Local Device Wipe:** Upon next network connection attempt, the mobile app receives a `401 / Device Revoked` payload which triggers the hardware-level wiping of the local encrypted SQLite database and keystore secrets.

### 3.2 Insider Breach / Credential Leak Runbook

1. Account status switched to `suspended` immediately via Admin Console or direct DB emergency procedure.
2. Active sessions terminated across all devices.
3. Full forensic extract of `audit_logs` filtered by the user's UUID generated for the Executive Director and Legal/Safeguarding lead.
4. If beneficiary PII was exfiltrated, affected community leaders and beneficiaries are notified according to the organizational safeguarding protocol.
