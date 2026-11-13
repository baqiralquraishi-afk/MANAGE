# Operations, Infrastructure & Deployment Documentation

This directory contains the operational specifications, architecture designs, data residency assessments, software matrices, and production runbooks for the **Humanitarian Operations Management Platform**.

> [!IMPORTANT]
> **Deployment Preparation Only**: These documents and configurations represent staging/production architecture designs for organization-controlled sovereign infrastructure in Iraq or approved private hosting. No live cloud accounts, DNS changes, or public firewall ports have been created or modified.

---

## 1. Core Architectural & Governance Specifications

| Document                                                                                                                 | Purpose                                       | Key Standards / Topics Covered                                                                                                                                                                                                                                                                                                                     |
| :----------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [deployment_architecture.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/deployment_architecture.md)             | Primary Deployment Architecture Specification | Sovereign in-country topology, network isolation, 4 security zones (DMZ, App, Storage, DB), zero-exposure database rules, Traefik TLS 1.3 reverse proxy, Prometheus/Grafana monitoring, 7-year audit retention, Chrony NTP time sync, capacity planning for 10k/100k/500k beneficiaries, and Disaster Recovery (RPO $\le 5$ min, RTO $\le 2$ hrs). |
| [software_compatibility_matrix.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/software_compatibility_matrix.md) | Software Pinning & Upgrade Lifecycle Matrix   | Pinned versions for Ubuntu 24.04 LTS, Docker 27.3.1, PostgreSQL 15.8, PostgREST 12.2, GoTrue 2.158, MinIO, Next.js 15.1.7, React 19, Node 22 LTS, and Flutter 3.24.5. Includes 4-stage upgrade verification gate.                                                                                                                                  |
| [data_residency_and_hosting.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/data_residency_and_hosting.md)       | Iraq Data Residency & Hosting Questionnaire   | Regulatory analysis of humanitarian data sovereignty in Iraq (Baghdad/Erbil data centers), legal risk matrix, cross-border restrictions, and 12-question operational questionnaire for Head of Mission, Legal Counsel, DPO, and CISO.                                                                                                              |

---

## 2. Operational Runbooks

Standard Operating Procedures (SOPs) for systems engineering, operations, and incident response:

| Runbook                                                                                                | Audience                      | Summary                                                                                                                                                                                                                                                                  |
| :----------------------------------------------------------------------------------------------------- | :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [runbooks/deployment.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/runbooks/deployment.md)   | Release Coordinators & DevOps | Pre-flight checklist, release tag verification, Vault secret injection, transactional database migrations, smoke tests, health probes, and zero-downtime blue/green routing switch.                                                                                      |
| [runbooks/rollback.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/runbooks/rollback.md)       | Incident Commanders & SREs    | Automated trigger criteria (5xx $> 2\%$, health check failures), SEV-1/SEV-2 incident classification, application container rollback ($N-1$), forward-only schema decision tree, and Point-in-Time-Recovery (PITR) with PostgreSQL WAL replay.                           |
| [runbooks/maintenance.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/runbooks/maintenance.md) | DBAs & Systems Administrators | Daily WAL archiving validation, monthly isolated disaster recovery rehearsals, OS/Docker patching cycles, autovacuum & index maintenance (`REINDEX CONCURRENTLY`), 90-day secret rotation (PostgreSQL, JWT with grace overlap, MinIO), and 7-year legal hold compliance. |

---

## 3. Infrastructure Manifests

All infrastructure-as-code manifests are located under [infra/](file:///c:/Users/MSI/Desktop/MANAGE/infra):

- `docker-compose.staging.yml`: Self-hosted stack configuration with isolated internal Docker subnets (`dmz-net`, `app-net`, `db-net`, `storage-net`).
- `config/postgres.conf`: Hardened PostgreSQL 15 configuration with `TLSv1.3`, `scram-sha-256`, continuous WAL archiving, and slow query logging.
- `config/pg_hba.conf`: Host-based authentication rules rejecting plaintext passwords and unencrypted connections.
- `config/traefik_dynamic.yml`: Reverse proxy dynamic routing with strict TLS 1.3, HSTS (`63072000` seconds), rate limiting, and security headers.
- `.env.staging.example`: Non-secret environment variable template with zero production credentials.
