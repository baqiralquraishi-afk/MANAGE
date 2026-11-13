# Humanity Platform — Software Release Pinning & Upgrade Compatibility Matrix

**Document Version:** 1.0.0  
**Effective Date:** 13 November 2026  
**Status:** Approved for Deployment Preparation Only

---

## 1. Pinned Software Releases

All infrastructure, runtime engines, and application libraries are pinned to specific semantic version releases to guarantee deterministic behavior and prevent breaking changes during automated deployments.

| Component / Layer        | Software Package        | Pinned Version       | Image / Digest Reference                   | Support EOL |
| :----------------------- | :---------------------- | :------------------- | :----------------------------------------- | :---------- |
| **Host OS**              | Ubuntu Server LTS       | `24.04.1 LTS`        | `ubuntu-24.04-live-server-amd64`           | April 2029  |
| **Container Engine**     | Docker Community Engine | `27.3.1`             | `docker-ce_27.3.1-1~ubuntu.24.04`          | 2026+       |
| **Compose Orchestrator** | Docker Compose Plugin   | `v2.29.7`            | `docker-compose-plugin_2.29.7`             | 2026+       |
| **Edge Reverse Proxy**   | Traefik Proxy           | `v3.2.1`             | `traefik:v3.2.1`                           | Late 2025   |
| **API Gateway**          | Kong Gateway            | `2.8.1-alpine`       | `kong:2.8.1-alpine`                        | LTS         |
| **Database Engine**      | PostgreSQL              | `15.8.1.085`         | `supabase/postgres:15.8.1.085`             | Nov 2027    |
| **REST Data API**        | PostgREST               | `v12.2.0`            | `postgrest/postgrest:v12.2.0`              | 2026+       |
| **Auth Microservice**    | Supabase GoTrue         | `v2.158.1`           | `supabase/gotrue:v2.158.1`                 | Active LTS  |
| **Storage API Service**  | Supabase Storage API    | `v1.11.1`            | `supabase/storage-api:v1.11.1`             | Active LTS  |
| **Private Object Store** | MinIO Server            | `RELEASE.2024-11-07` | `minio/minio:RELEASE.2024-11-07T00-52-20Z` | Active LTS  |
| **Web Runtime**          | Node.js Alpine          | `22.13.1`            | `node:22.13.1-alpine3.20`                  | April 2027  |
| **Web Framework**        | Next.js App Router      | `15.1.7`             | `next@15.1.7`                              | Active      |
| **UI Library**           | React                   | `19.0.0`             | `react@19.0.0`                             | Active      |
| **Mobile Framework**     | Flutter SDK             | `3.24.5`             | Channel stable                             | Active      |
| **Mobile Language**      | Dart SDK                | `3.5.4`              | Bundled with Flutter 3.24.5                | Active      |
| **Package Manager**      | pnpm                    | `12.18.0`            | Corepack pinned                            | Active      |

---

## 2. Upgrade Gates & Verification Policy

Upgrades to any layer in the Humanity Platform must pass the following multi-stage verification gates:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Gate 1: Security │ ──> │ Gate 2: Database │ ──> │ Gate 3: Offline  │ ──> │ Gate 4: Staging  │
│ & Dependency     │     │ Migration Test   │     │ Backward Compat  │     │ Canary Soak      │
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Gate 1: Security & License Review

- Run `node scripts/verify-licenses.js` to ensure zero copyleft or viral licenses are introduced.
- Run `node scripts/verify-setup.js` to ensure no credentials or debug flags are introduced.
- Run `trivy image <container_tag>` ensuring zero Critical or High CVEs without vendor mitigations.

### Gate 2: Database Migration & Schema Compatibility

- All schema alterations must be **strictly additive or backward-compatible**:
  - `ALTER TABLE ... ADD COLUMN` must provide a `DEFAULT` or allow `NULL`.
  - Column renames or table drops in a single release are **strictly forbidden**.
  - All PL/pgSQL function alterations must use `CREATE OR REPLACE FUNCTION` and preserve parameter backward-compatibility.
  - Test against disposable backend: `pnpm test` and `node scripts/test-sql-syntax.js`.

### Gate 3: Offline Synchronization Backward Compatibility

- Field caseworkers may hold unsynchronized drafts on mobile devices running previous client versions ($N-1$).
- The server ingest workflow (`workflow_ingest_sync_mutation_v2`) must accept schema versions $V_{current}$ and $V_{current - 1}$.
- Schema version increments must be paired with field conversion logic in the mobile SQLite migration handler.

### Gate 4: Staging Soak Period

- Deploy candidate image to staging environment (`docker-compose.staging.yml`).
- Execute high-volume benchmark: `node scripts/performance-benchmark.js` (10k beneficiaries, 100+ staff).
- Soak for a minimum of **48 hours** under simulated continuous load before initiating production deployment.

---

## 3. Rollback Compatibility Matrix

| Upgrade Category          |    Automatic Rollback Viable?    | Rollback Procedure                                                                                                     | Required Pre-Flight Condition                                 |
| :------------------------ | :------------------------------: | :--------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------ |
| **Web Container (`web`)** |             **Yes**              | Revert Traefik target to previous container tag ($N-1$).                                                               | Zero breaking API contract changes.                           |
| **API Gateway (`kong`)**  |             **Yes**              | Revert Kong container tag and re-apply declarative config.                                                             | Previous declarative config preserved.                        |
| **Database Migrations**   |         **Conditional**          | Execute compensating reversal migration script.                                                                        | Migration must have verified down-migration; no data dropped. |
| **PostgreSQL Engine**     | **No** (Major) / **Yes** (Minor) | Minor (15.7 $\leftrightarrow$ 15.8) is binary reversible. Major (15 $\rightarrow$ 16) requires full `pg_dump` restore. | Valid physical backup taken immediately prior to upgrade.     |
| **Mobile Field App**      |              **No**              | Mobile clients cannot be forcibly rolled back. Server must maintain $N-1$ API compatibility.                           | Mobile client version check endpoint active.                  |
