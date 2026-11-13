# Operations, Infrastructure, Backups & Incident Response Documentation

This directory contains the operational specifications, architecture designs, data residency assessments, software matrices, disaster recovery procedures, incident response runbooks, rollout plans, migration specifications, and training handover curricula for the **Humanitarian Operations Management Platform**.

> [!IMPORTANT]
> **Deployment Preparation & Isolated Verification Only**: These documents and configurations represent staging/production architecture designs for organization-controlled sovereign infrastructure in Iraq or approved private hosting. No live cloud accounts, DNS changes, or public firewall ports have been created or modified. All recovery drills and migration rehearsals are conducted exclusively within isolated, air-gapped harnesses using synthetic data.

---

## 1. Core Architectural & Governance Specifications

| Document                                                                                                                 | Purpose                                       | Key Standards / Topics Covered                                                                                                                                                                                                                                                                                                                                     |
| :----------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [deployment_architecture.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/deployment_architecture.md)             | Primary Deployment Architecture Specification | Sovereign in-country topology, network isolation, 4 security zones (DMZ, App, Storage, DB), zero-exposure database rules, Traefik TLS 1.3 reverse proxy, Prometheus/Grafana monitoring, 7-year audit retention, Chrony NTP time sync, capacity planning for 10k/100k/500k beneficiaries, and Disaster Recovery (RPO $\le 5$ min, RTO $\le 2$ hrs).                 |
| [backup_and_recovery_policy.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/backup_and_recovery_policy.md)       | Backup, Restoration & Key Recovery Policy     | Comprehensive backup strategies for PostgreSQL (continuous WAL, base backups, logical dumps), Supabase configuration, private storage (MinIO S3 WORM), and cryptographic key recovery (Vault Shamir 3-of-5, JWT, DB, TLS). Approved retention (7-year audit, 30-day PITR), rotation, SHA-256 integrity checks, 3-2-1 protected copies, and RACI governance matrix. |
| [software_compatibility_matrix.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/software_compatibility_matrix.md) | Software Pinning & Upgrade Lifecycle Matrix   | Pinned versions for Ubuntu 24.04 LTS, Docker 27.3.1, PostgreSQL 15.8, PostgREST 12.2, GoTrue 2.158, MinIO, Next.js 15.1.7, React 19, Node 22 LTS, and Flutter 3.24.5. Includes 4-stage upgrade verification gate.                                                                                                                                                  |
| [data_residency_and_hosting.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/data_residency_and_hosting.md)       | Iraq Data Residency & Hosting Questionnaire   | Regulatory analysis of humanitarian data sovereignty in Iraq (Baghdad/Erbil data centers), legal risk matrix, cross-border restrictions, and 12-question operational questionnaire for Head of Mission, Legal Counsel, DPO, and CISO.                                                                                                                              |

---

## 2. Release Gates, Pilot & Staged Rollout

| Document                                                                                                         | Purpose                                          | Key Content Covered                                                                                                                                                                                                                                                                                            |
| :--------------------------------------------------------------------------------------------------------------- | :----------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [release_signoff_checklist.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/release_signoff_checklist.md) | Master Release Sign-Off & Go/No-Go Decision Gate | 15-gate verification matrix covering programme rules, safeguarding, privacy, financial segregation, RLS, accessibility, security, performance, monitoring, DR, and migration. Explicit executive decision board with **RELEASE BLOCKED** status pending formal in-person diplomatic review and staff training. |
| [staged_rollout_plan.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/staged_rollout_plan.md)             | Staged Rollout, Pilot & Support Operations Plan  | 6-stage lifecycle (Fictional Demo $\to$ Security Sandbox $\to$ Staff Training $\to$ Limited Field Pilot $\to$ Feedback Loop $\to$ Phased Regional Expansion). Quantitative rollback triggers and 4-tier support escalation architecture with named leads.                                                      |

---

## 3. Data Migration & Reconciliation

| Document                                                                                                   | Purpose                                | Key Content Covered                                                                                                                                                                                                                                    |
| :--------------------------------------------------------------------------------------------------------- | :------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [data_migration_runbook.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/data_migration_runbook.md) | Data Migration Specification & Runbook | Legacy KoboToolbox / Excel / RAIS to PostgreSQL mapping matrix, mandatory human duplicate review (never auto-merge), financial ledger reconciliation ($0.00$ IQD variance target), cutover window timeline, validation totals, and rollback ownership. |

_Automated Dry-Run Rehearsal_: Executable via `pnpm.cmd migration:dryrun` (`scripts/migration-dry-run.js`).

---

## 4. Role-Specific Training & Handover Guides

All operational training and handover modules are located in [docs/operations/handover/](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/handover/):

| Handover Guide                                                                                               | Target Roles                       | Core Operational Competencies                                                                                                                                           |
| :----------------------------------------------------------------------------------------------------------- | :--------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [handover/README.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/handover/README.md)                 | All Staff & Instructors            | Standardized handover framework, certification SLA, training sandbox reset rules.                                                                                       |
| [handover/operators.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/handover/operators.md)           | Systems Operators, SREs, DBAs      | Container stack lifecycle, Traefik reverse proxy, PostgreSQL continuous WAL archiving, MinIO S3 management, monitoring probes, backup restoration drills.               |
| [handover/administrators.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/handover/administrators.md) | Security Admins, Role Managers     | Role-based access control (`staff_roles`), geographic/programme scoping, credential revocation, audit forensics, remote device wipe.                                    |
| [handover/caseworkers.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/handover/caseworkers.md)       | Field Caseworkers, Intake Officers | Arabic RTL interface navigation, informed consent capture, duplicate candidate review, assessment scoring, offline mobile draft management, sync conflict resolution.   |
| [handover/finance_staff.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/handover/finance_staff.md)   | Finance Makers, Finance Checkers   | Maker-checker dual authorization, payment proposal generation, release authorization, approval limits, ledger immutability, compensating reversal accounting (ADR-004). |
| [handover/auditors.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/handover/auditors.md)             | Compliance Auditors, DPOs          | Immutable audit trail querying (`audit_logs`), export event tracking, k-anonymity verification ($< 5$ cell suppression), data minimization oversight.                   |

---

## 5. Operational & Disaster Recovery Runbooks

Standard Operating Procedures (SOPs) for systems engineering, operations, and business continuity:

| Runbook                                                                                                                        | Audience                      | Summary                                                                                                                                                                                                                                                                                           |
| :----------------------------------------------------------------------------------------------------------------------------- | :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [runbooks/deployment.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/runbooks/deployment.md)                           | Release Coordinators & DevOps | Pre-flight checklist, release tag verification, Vault secret injection, transactional database migrations, smoke tests, health probes, and zero-downtime blue/green routing switch.                                                                                                               |
| [runbooks/rollback.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/runbooks/rollback.md)                               | Incident Commanders & SREs    | Automated trigger criteria (5xx $> 2\%$, health check failures), SEV-1/SEV-2 incident classification, application container rollback ($N-1$), forward-only schema decision tree, and Point-in-Time-Recovery (PITR) with PostgreSQL WAL replay.                                                    |
| [runbooks/maintenance.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/runbooks/maintenance.md)                         | DBAs & Systems Administrators | Daily WAL archiving validation, monthly isolated disaster recovery rehearsals, OS/Docker patching cycles, autovacuum & index maintenance (`REINDEX CONCURRENTLY`), 90-day secret rotation (PostgreSQL, JWT with grace overlap, MinIO), and 7-year legal hold compliance.                          |
| [runbooks/restore_drill_procedure.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/runbooks/restore_drill_procedure.md) | SREs & Recovery Engineers     | Standard Operating Procedure for periodic disaster recovery restore drills in an air-gapped sandbox using synthetic data only. Strict prohibition against touching live production data. Step-by-step backup generation, checksum validation, timed restoration, and referential integrity audit. |

---

## 6. Incident Response Framework & Specialized Runbooks

Operational runbooks for rapid containment, eradication, and post-incident reporting:

| Document                                                                                                                               | Scenario                                        | Core Containment Action                                                                                                                          |
| :------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| [incident_response/README.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/incident_response/README.md)                         | Incident Response Master Framework              | Severity tiers (SEV-1 to SEV-4), incident lifecycle, escalation SLAs, and 72-hour regulatory DPO notification standard.                          |
| [incident_response/lost_device.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/incident_response/lost_device.md)               | Lost, Stolen, or Confiscated Field Device       | GoTrue session invalidation, staff role deactivation, remote MDM enterprise wipe, audit log forensics.                                           |
| [incident_response/account_compromise.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/incident_response/account_compromise.md) | Credential Compromise & Session Hijacking       | Immediate account ban, role suspension, 7-day mutation forensics, compensating ledger reversals under ADR-004.                                   |
| [incident_response/accidental_export.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/incident_response/accidental_export.md)   | Accidental / Unauthorized PII Data Export       | Audit trace of export filters, workstation network severance, cryptographic file shredding, k-anonymity DPIA.                                    |
| [incident_response/suspected_breach.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/incident_response/suspected_breach.md)     | Suspected Platform Breach & Server Intrusion    | Traefik blackhole / firewall isolation, volatile RAM capture, master credential rotation in Vault, forensic query audit.                         |
| [incident_response/ransomware.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/incident_response/ransomware.md)                 | Ransomware Outbreak & Storage Extortion         | Zero ransom payment mandate, network interface severance, bare-metal hardware wipe, immutable WORM backup restoration from Erbil secondary site. |
| [incident_response/service_outage.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/incident_response/service_outage.md)         | National Internet Blackout / Power Grid Failure | Mobile offline-first autonomous mode (ADR-003), satellite VSAT link activation, secondary data center failover.                                  |

---

## 7. Disaster Recovery Rehearsal Evidence & Records

Records of executed restore drills verifying actual recovery times and data integrity:

| Rehearsal Date | Scope                                       | Measured RTO                   | Checksum Status | Report Record                                                                                                                       |
| :------------- | :------------------------------------------ | :----------------------------- | :-------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **2026-11-13** | Air-Gapped Synthetic Rehearsal (Full Stack) | **1.289 Seconds** (1288.87 ms) | SHA-256 Passed  | [restore_drill_report_20261113.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/dr_records/restore_drill_report_20261113.md) |

---

## 8. Infrastructure Manifests

All infrastructure-as-code manifests are located under [infra/](file:///c:/Users/MSI/Desktop/MANAGE/infra):

- `docker-compose.staging.yml`: Self-hosted stack configuration with isolated internal Docker subnets (`dmz-net`, `app-net`, `db-net`, `storage-net`).
- `config/postgres.conf`: Hardened PostgreSQL 15 configuration with `TLSv1.3`, `scram-sha-256`, continuous WAL archiving, and slow query logging.
- `config/pg_hba.conf`: Host-based authentication rules rejecting plaintext passwords and unencrypted connections.
- `config/traefik_dynamic.yml`: Reverse proxy dynamic routing with strict TLS 1.3, HSTS (`63072000` seconds), rate limiting, and security headers.
- `.env.staging.example`: Non-secret environment variable template with zero production credentials.
