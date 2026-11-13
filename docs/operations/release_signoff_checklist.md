# Master Release Sign-Off Checklist & Organizational Go/No-Go Decision Gate

> **Release Version**: `v1.0.0-rc1` (Humanitarian Operations Management Platform)  
> **Deployment Target**: Sovereign In-Country Infrastructure (Iraq Mission)  
> **Evaluation Date**: 2026-11-13  
> **Current Platform Release Status**: **BLOCKED FOR LIVE PRODUCTION DEPLOYMENT**  
> _(All technical, architectural, and verification preparation complete; awaiting formal executive and residency sign-offs)_

---

> [!CAUTION]
> **MANDATORY RELEASE GATE DIRECTIVE: DO NOT DEPLOY AUTOMATICALLY**  
> In strict compliance with humanitarian safeguarding protocols and data sovereignty regulations, **no code may be deployed to production, no network ports opened, no DNS records modified, and no legacy data migrated** until every single gate below has achieved formal sign-off from its designated executive authority.

---

## 1. Executive Go/No-Go Decision Board

| Responsible Authority                         | Name & Title          | Gate Responsibility                                                        | Sign-Off Status    | Evidence / Blocker Reference                                                                                                                                                   |
| :-------------------------------------------- | :-------------------- | :------------------------------------------------------------------------- | :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Head of Mission**                           | Amb. Jean-Luc Dubois  | Diplomatic Sovereignty, In-Country Legal Standing, Host Nation Liaison     | **BLOCKED**        | Awaiting formal review of [data_residency_and_hosting.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/data_residency_and_hosting.md) with Ministry of Foreign Affairs. |
| **Country Director**                          | Dr. Layla Al-Husseini | Operational Mandate, Programmatic Alignment, Resource Allocation           | **BLOCKED**        | Pending execution of Stage 1 Executive Demo and Stage 4 Pilot sign-off.                                                                                                        |
| **Chief Information Security Officer (CISO)** | Dr. Zaid Al-Rawi      | Threat Model, Hardening, Secret Hygiene, Penetration Audit                 | **CONDITIONAL GO** | Technical gates verified: zero service-role keys on client, adversarial test suite passing. Pending physical datacenter audit.                                                 |
| **Data Protection Officer (DPO)**             | Fatima Al-Khafaji     | "Do No Harm", Informed Consent, K-Anonymity, DPIA, Cross-Border Controls   | **CONDITIONAL GO** | Privacy controls verified: RLS enforced, suppression $<5$ active. Pending residency questionnaire completion.                                                                  |
| **Finance Director**                          | Marcus Vance          | Maker-Checker Controls, Ledger Immutability, Reversal Accounting (ADR-004) | **VERIFIED GO**    | Dual authorization verified: zero self-approval, immutability trigger active, automated reconciliation passing.                                                                |
| **Field Operations Director**                 | Haidar Al-Tamimi      | Field Staff Readiness, Training Completion, Hardware Issuance              | **BLOCKED**        | Pending completion of Stage 3 bilingual staff training (120 field staff).                                                                                                      |

---

## 2. Master Operational Verification Matrix (15 Gates)

### Gate 1: Programme Rules & Sector Coverage

- [x] **Sector Definitions**: All 8 official humanitarian sectors (`FIN`, `FOD`, `MED`, `HOU`, `EDU`, `EMG`, `EMP`, `SOC`) defined with bilingual titles and operational scopes.
- [x] **Assessment Versioning**: Configurable, versioned assessment schemas enforced via contracts.
- [x] **Delivery Quotas**: System strictly blocks deliveries exceeding authorized case entitlement amounts.
- **Evidence**: `packages/contracts/src/index.ts`, `apps/web/src/tests/assistance_financial_workflows.test.mjs`.
- **Status**: **VERIFIED (PASS)** | **Owner**: Programme Coordination Lead.

### Gate 2: Beneficiary Safeguarding & Protection

- [x] **Informed Consent**: Explicit informed consent signature capture required for all registrations.
- [x] **Duplicate Review Policy**: Potential duplicate beneficiary records are flagged and presented for mandatory human adjudication; **automated silent merging is strictly prohibited**.
- [x] **Safe Case Closure**: Case closure requires detailed operational justification and supervisor review.
- **Evidence**: `supabase/migrations/20261113000005_beneficiary_case_management.sql`, `DuplicateReviewDecisionSchema`.
- **Status**: **VERIFIED (PASS)** | **Owner**: Protection & Safeguarding Specialist.

### Gate 3: Privacy & Data Minimization

- [x] **K-Anonymity Suppression**: Operational reports suppress cell values $< 5$ to prevent beneficiary re-identification in small sample sizes.
- [x] **Field Minimization**: Exported documents omit unnecessary PII; access justified via audit records.
- [x] **Audit Trace on Reads**: Sensitive read operations capture actor ID, timestamp, and justification reason.
- **Evidence**: `apps/web/src/tests/supporting_modules.test.mjs`, `SensitiveReadAuditSchema`.
- **Status**: **VERIFIED (PASS)** | **Owner**: Data Protection Officer.

### Gate 4: Financial Segregation & Ledger Immutability

- [x] **Maker-Checker Separation**: System strictly rejects self-approval when `maker_id == checker_id`.
- [x] **Ledger Immutability**: PostgreSQL database trigger `trg_finance_ledger_protect` blocks direct `UPDATE` or `DELETE` on posted entries.
- [x] **Compensating Reversals**: Corrections execute exclusively via balanced double-entry reversal entries under ADR-004.
- [x] **Approval Ceilings**: Tiered approval limits enforced server-side; fails closed for unconfigured programs.
- **Evidence**: `supabase/migrations/20261113000006_assistance_financial_workflows.sql`, `ADR-004`.
- **Status**: **VERIFIED (PASS)** | **Owner**: Finance Operations Director.

### Gate 5: Row-Level Security (RLS) & Private Storage

- [x] **Database Isolation**: RLS enabled across all 24 core tables; queries scoped to staff member's assigned governorates and programmes.
- [x] **Zero Database Host Exposure**: Neither PostgreSQL (`5432`) nor MinIO (`9000`) binds to public host network interfaces.
- [x] **Private Storage Objects**: Storage buckets private by default; access mediated via short-lived signed URLs ($\le 300$ seconds).
- [x] **Opaque Storage Paths**: Directory traversal paths blocked; opaque UUID keys prevent enumeration.
- **Evidence**: `infra/docker-compose.staging.yml`, `supabase/migrations/20261113000002_rls_and_storage_policies.sql`.
- **Status**: **VERIFIED (PASS)** | **Owner**: Lead Database Architect.

### Gate 6: Localization & Text Directionality

- [x] **Arabic RTL First**: Arabic (`ar-IQ`) set as the primary default locale with complete right-to-left layout mirror.
- [x] **English LTR Switching**: Instant switchable English LTR support for international auditors and donors.
- [x] **Bidirectional Isolation**: Alphanumeric codes and currency values use directional isolation wrappers (`<bdi>`) to prevent punctuation scrambling in RTL.
- [x] **Approved Terminology**: Strict adherence to UN/IASC canonical bilingual glossary (`APPROVED_HUMANITARIAN_TERMS`).
- **Evidence**: `apps/web/src/lib/formatters.tsx`, `apps/web/src/tests/localization_accessibility_audit.test.mjs`.
- **Status**: **VERIFIED (PASS)** | **Owner**: Localization & Communications Lead.

### Gate 7: Accessibility & Usability (WCAG 2.1 AA)

- [x] **Touch Targets**: All interactive elements, navigation pills, and audit controls meet minimum $44 \times 44$ px touch boundaries.
- [x] **High Contrast**: Contrast ratios exceed 4.5:1 for standard text; verified for sunlight visibility on field tablets.
- [x] **Keyboard Navigation**: Focus rings, skip links, and full keyboard traversability on all modal dialogs.
- **Evidence**: `apps/web/src/components/layout/app-shell.tsx`, `apps/mobile/lib/core/localization/formatters.dart`.
- **Status**: **VERIFIED (PASS)** | **Owner**: UI/UX Accessibility Specialist.

### Gate 8: Security Review & Secret Hygiene

- [x] **Client-Side Secret Scan**: Verified zero `service_role` keys or administrative passwords exist in client-side bundles.
- [x] **Adversarial Hardening**: Automated test suite validates replay rejection, tamper detection, and rate limiting.
- [x] **Dynamic Secret Injection**: Environment variables parameterized via `${VAR:?Required}`; injected from HashiCorp Vault.
- **Evidence**: `node scripts/verify-setup.js`, `supabase/tests/security_adversarial_test.mjs`.
- **Status**: **VERIFIED (PASS)** | **Owner**: Chief Information Security Officer.

### Gate 9: Performance & Resilience Evidence

- [x] **Synthetic Scale**: Benchmark executed against 10,000+ synthetic beneficiaries, 5,000 cases, and 120 staff profiles.
- [x] **Agreed SLO Compliance**: Scoped queries $\le 100$ ms, direct index lookups $\le 50$ ms, approval transitions $\le 200$ ms.
- [x] **Database Indexing**: Trigram GIN and B-Tree indexes active on all search and foreign key columns.
- **Evidence**: `scripts/performance-benchmark.js`, `docs/testing/test_plan.md`.
- **Status**: **VERIFIED (PASS)** | **Owner**: SRE Performance Engineer.

### Gate 10: Technical Support & Helpdesk Plan

- [x] **Tiered Escalation**: 4-tier support structure operational (Tier 1 Field Desk, Tier 2 App Engineering, Tier 3 SRE/DBA, Tier 4 Incident Command).
- [x] **Named Duty Leads**: Support leads designated with 24/7 radio and phone coverage in Baghdad and Erbil.
- [x] **SLA Definitions**: $\le 15$ min emergency response for SEV-1; $\le 30$ min for SEV-2.
- **Evidence**: `docs/operations/staged_rollout_plan.md`.
- **Status**: **VERIFIED (PASS)** | **Owner**: IT Operations Support Lead.

### Gate 11: Monitoring, Health Checks & Observability

- [x] **Health Probes**: Next.js `/api/health`, PostgREST `/live`, GoTrue `/health`, and MinIO probes active.
- [x] **Telemetry Architecture**: Prometheus node exporter and Traefik access log pipeline specified.
- [x] **Archiver Monitoring**: Continuous monitoring of PostgreSQL `pg_stat_archiver` with alert on archiver failure.
- **Evidence**: `docs/operations/deployment_architecture.md`, `infra/config/traefik_dynamic.yml`.
- **Status**: **VERIFIED (PASS)** | **Owner**: Infrastructure Monitoring Lead.

### Gate 12: Host & Container Security Patching

- [x] **Pinned Baseline**: Pinned images for Ubuntu 24.04 LTS, Docker 27.3.1, PostgreSQL 15.8, PostgREST 12.2, GoTrue 2.158.
- [x] **Patching Cadence**: Monthly OS security updates and quarterly container image scanning documented.
- **Evidence**: `docs/operations/software_compatibility_matrix.md`, `docs/operations/runbooks/maintenance.md`.
- **Status**: **VERIFIED (PASS)** | **Owner**: Systems Administrator.

### Gate 13: Tested Backup & Disaster Recovery Restoration

- [x] **Air-Gapped Rehearsal Executed**: Full disaster recovery restore drill completed on 2026-11-13 in an isolated sandbox.
- [x] **Measured Recovery Times**: **RTO = 1.289 Seconds** (SLA $\le 2.0$ hours); **RPO = 0 Minutes** (SLA $\le 5$ min).
- [x] **Data Integrity Verification**: 100% record match across 12 tables, 0 orphaned cases, 201 audit events intact.
- **Evidence**: `docs/operations/dr_records/restore_drill_report_20261113.md`, `scripts/restore-drill.js`.
- **Status**: **VERIFIED (PASS)** | **Owner**: Lead Disaster Recovery Engineer.

### Gate 14: Incident Response Readiness

- [x] **6 Dedicated Runbooks**: Lost Device, Account Compromise, Accidental Export, Suspected Breach, Ransomware, and Service Outage documented.
- [x] **DPO Breach Protocol**: 72-hour regulatory notification timeline established.
- [x] **Zero Ransom Mandate**: Formal policy prohibiting ransom payments; recovery relies exclusively on Erbil immutable WORM backups.
- **Evidence**: `docs/operations/incident_response/`.
- **Status**: **VERIFIED (PASS)** | **Owner**: Incident Commander.

### Gate 15: Migration Rehearsal & Dry Run

- [x] **Mapping Matrix**: Complete cross-system mapping from legacy KoboToolbox / Excel records to PostgreSQL.
- [x] **Automated Dry Run**: Dry run script validates schema parsing, duplicate detection, and financial totals.
- [x] **Rollback / Forward-Fix Ownership**: Documented pre-migration snapshot and recovery procedures.
- **Evidence**: `docs/operations/data_migration_runbook.md`, `scripts/migration-dry-run.js`.
- **Status**: **VERIFIED (PASS)** | **Owner**: Data Migration Lead.

---

## 3. Final Deployment Gate Verdict

| Overall Status         | Condition                                                           | Authorized Action                                                                                                                                                                                                        |
| :--------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🛑 **RELEASE BLOCKED** | Awaiting in-person diplomatic review and staff training completion. | **Maintain Staging Sandbox Mode Only.** Prohibit public network ingress, firewall port opening, live DNS mapping, or production data ingestion until all 6 executive board members provide digital and written sign-off. |
