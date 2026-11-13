# Repository Reconnaissance & Feasibility Report (Prompt 00)

**Date:** 13 November 2026  
**System:** Humanity Platform (Iraq Beneficiary & Case Management System)  
**Status:** Approved Gate 00 — Proceeding to Foundation

---

## 1. Inventory & Environment Baseline

- **Workspace Status:** Initialized private Git repository (`main` branch) at clean state.
- **Host Runtime:** Windows 10/11 x64, Node.js v26.13.1, npm/npx 11.20.0, pnpm 12.18.0, Git 2.56.1.
- **Secret Risk:** 0 secrets detected. No live credentials present in repository.
- **Target Stack:**
  - Mobile: Flutter + Dart (Android and iOS).
  - Web Administration: Next.js + TypeScript.
  - Shared Backend: One self-hosted Supabase / PostgreSQL instance.
  - Localization: Arabic (default RTL) and English (LTR).

---

## 2. Platform Constraints & Feasibility

- **macOS / iOS Constraint:** Windows host cannot build or sign iOS native artifacts. Mobile development on this host will execute Flutter Android builds, unit/widget tests, and linting. iOS builds must run on a designated macOS CI runner or Mac workstation with Xcode and certificates.
- **Scale Target:** Designed for 10,000+ beneficiaries and 100+ concurrent staff. Requires strict indexing, pagination, and query budgets on PostgreSQL.
- **Offline Synchronization:** Caseworkers require offline draft capability for remote Iraqi governorates. Data must be encrypted locally (AES-256 via platform keystore), bounded strictly to assigned cases, and enforce zero offline financial releases.

---

## 3. Required Organizational Owners & Decisions

1. **Safeguarding & Consent Owner:** Approves Arabic/English informed consent statements and child protection protocols.
2. **Programme Directors (8 Streams):** Finalizes assessment criteria for `FIN`, `FOD`, `MED`, `HOU`, `EDU`, `EMG`, `EMP`, `SOC`.
3. **Finance Controller:** Establishes maker-checker financial disbursement thresholds and reconciliation rules.
4. **Data Protection / Legal Officer:** Validates Iraqi data residency compliance and retention/anonymization schedules.
5. **Infrastructure & Security Lead:** Controls self-hosted deployment, backup integrity, and disaster recovery.
