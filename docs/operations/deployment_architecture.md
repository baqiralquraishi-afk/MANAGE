# Humanity Platform — Deployment Architecture & Infrastructure Specification

**Document Version:** 1.0.0  
**Effective Date:** 13 November 2026  
**Status:** Approved for Deployment Preparation Only  
**Target Region:** Republic of Iraq (Baghdad / Erbil Data Centers)

---

## 1. Architectural Overview & Sovereign Hosting Model

The Humanity Platform is designed to operate on **organization-controlled infrastructure in Iraq** (or an explicitly approved sovereign in-country cloud data center, such as EarthLink Data Center Baghdad or Zain Cloud Iraq). This sovereign hosting posture guarantees that sensitive biometric records, Iraqi National IDs, household vulnerabilities, and protection documents never leave national legal jurisdiction.

```
                           INTERNET / CELLULAR CARRIERS
                          (Asiacell / Zain / Korek / FIB)
                                        │
                                        ▼ HTTPS (Port 443 only - TLS 1.3)
                       ┌─────────────────────────────────┐
                       │  DMZ EDGE FIREWALL / REVERSE    │
                       │             PROXY               │
                       │        (Traefik v3.2.1)         │
                       └────────────────┬────────────────┘
                                        │
                      ┌─────────────────┴─────────────────┐
                      │    INTERNAL APPLICATION NETWORK   │
                      │          (172.28.2.0/24)          │
                      │                                   │
                      │   ┌───────────────┐               │
                      │   │ Next.js Web   │               │
                      │   │ App (Port     │               │
                      │   │ 3000)         │               │
                      │   └───────┬───────┘               │
                      │           │                       │
                      │   ┌───────┴───────┐               │
                      │   │ Kong API      │               │
                      │   │ Gateway (Port │               │
                      │   │ 8000)         │               │
                      │   └───┬───────┬───┘               │
                      │       │       │                   │
                      │   ┌───┴───┐ ┌─┴─────────┐         │
                      │   │GoTrue │ │PostgREST  │         │
                      │   │Auth   │ │REST API   │         │
                      │   └───────┘ └───────────┘         │
                      └───────────────┬───────────────────┘
                                      │
                      ┌───────────────┴───────────────────┐
                      │    ISOLATED DATABASE & STORAGE    │
                      │              NETWORK              │
                      │     (172.28.3.0/24, no ingress)   │
                      │                                   │
                      │   ┌───────────────────────────┐   │
                      │   │ Hardened PostgreSQL 15.8  │   │
                      │   │ (Port 5432 - NO HOST PORT)│   │
                      │   │  - NVMe SSD Persistent    │   │
                      │   │  - Continuous WAL Archive │   │
                      │   └─────────────┬─────────────┘   │
                      │                 │                 │
                      │   ┌─────────────┴─────────────┐   │
                      │   │ Private MinIO S3 Store    │   │
                      │   │ (Encrypted at Rest)       │   │
                      │   │  - Opaque UUID Documents  │   │
                      │   │  - ZERO Public URLs       │   │
                      │   └───────────────────────────┘   │
                      └───────────────────────────────────┘
```

---

## 2. Component Specifications

### 2.1 Next.js Web Application (`apps/web`)

- **Runtime:** Node.js 22 LTS Alpine base container.
- **Clustering:** 2+ stateless container replicas behind Traefik load balancer.
- **Session Handling:** Stateless JWT token authentication via Supabase Auth. No sticky sessions required.
- **Port:** 3000 (Internal application network only; never directly exposed).

### 2.2 API Gateway & Ingress Layer (Traefik v3.2 & Kong v2.8)

- **Edge Proxy:** Traefik v3.2 manages TLS 1.3 termination, SNI routing, and rate limiting.
- **API Routing:** Kong routes inbound requests:
  - `/auth/v1/*` $\rightarrow$ GoTrue Auth service (Port 9999).
  - `/rest/v1/*` $\rightarrow$ PostgREST REST API (Port 3000).
  - `/storage/v1/*` $\rightarrow$ Supabase Storage API (Port 5000).
- **Protection:** Rate limiting: 100 req/min for general web assets, 60 req/min for API endpoints.

### 2.3 Database Engine (Hardened PostgreSQL 15.8)

- **Engine:** Supabase PostgreSQL 15.8.1.
- **Security:**
  - Password authentication: `scram-sha-256`.
  - SSL encryption: `TLSv1.3` mandatory (`hostssl`).
  - Network isolation: Bound strictly to `db-net` (`172.28.3.0/24`). **No ports exposed to host (0.0.0.0:5432 is strictly prohibited).**
- **Sizing & Tuning (Baseline Node: 16 GB RAM / 4 vCPU):**
  - `shared_buffers = 4GB` (25% system RAM).
  - `effective_cache_size = 12GB` (75% system RAM).
  - `work_mem = 16MB`.
  - `maintenance_work_mem = 1GB`.

### 2.4 Private Document Storage (MinIO S3-Compatible)

- **Engine:** MinIO `RELEASE.2024-11-07T00-52-20Z`.
- **Isolation:** Bound strictly to `storage-net` (`172.28.4.0/24`). Web console disabled (`MINIO_BROWSER=off`).
- **Encryption at Rest:** Server-Side Encryption with Customer-Provided Keys (SSE-C) or KMS-managed AES-256-GCM.
- **Bucket Layout:** Single non-public bucket `humanity-private-documents`. Opaque UUID file paths (`cases/<case_id>/<opaque_uuid>`). Zero public URLs; downloads require 60s–900s time-bound signed tokens issued via `workflow_request_document_download`.

---

## 3. Network Boundaries, Firewall & DMZ Topology

| Security Zone              | CIDR Subnet               | Inbound Allowed                                                     | Outbound Allowed         | Function                                     |
| :------------------------- | :------------------------ | :------------------------------------------------------------------ | :----------------------- | :------------------------------------------- |
| **Public DMZ**             | Public IP / VLAN 10       | Port 443 (HTTPS), Port 80 (Redirect only)                           | Established sessions     | Edge TLS termination & WAF inspection        |
| **Application Network**    | `172.28.2.0/24` / VLAN 20 | Traefik $\rightarrow$ Web (3000), Traefik $\rightarrow$ Kong (8000) | `db-net`, `storage-net`  | Next.js and Supabase stateless microservices |
| **Database Network**       | `172.28.3.0/24` / VLAN 30 | `app-net` $\rightarrow$ Postgres (5432)                             | None (Strictly internal) | Relational database engine & WAL archive     |
| **Storage Network**        | `172.28.4.0/24` / VLAN 40 | `app-net` (Storage API) $\rightarrow$ MinIO (9000)                  | None (Strictly internal) | Private encrypted document store             |
| **Management Out-of-Band** | Hardware VLAN 99          | Bastion SSH (Port 2222 via WireGuard VPN)                           | Internal subnets         | Sysadmin access via hardware FIDO2 keys      |

---

## 4. Health Checks & Probes

| Service              | Probe Type           | Endpoint / Command           | Frequency | Timeout | Failure Threshold | Action on Failure                |
| :------------------- | :------------------- | :--------------------------- | :-------- | :------ | :---------------- | :------------------------------- |
| **Traefik**          | Liveness             | `traefik healthcheck --ping` | 10s       | 3s      | 3                 | Container restart                |
| **Web App**          | Liveness & Readiness | `GET /api/health`            | 15s       | 5s      | 3                 | Traefik evicts node from pool    |
| **Kong API Gateway** | Liveness             | `kong health`                | 10s       | 3s      | 3                 | Container restart                |
| **GoTrue Auth**      | Liveness             | `GET /health`                | 10s       | 3s      | 3                 | Container restart                |
| **PostgREST**        | Liveness             | `GET /live`                  | 10s       | 3s      | 3                 | Container restart                |
| **Storage API**      | Liveness             | `GET /status`                | 10s       | 3s      | 3                 | Container restart                |
| **MinIO Store**      | Readiness            | `mc ready local`             | 10s       | 3s      | 3                 | Traffic diverted                 |
| **PostgreSQL**       | Liveness & Readiness | `pg_isready -U postgres`     | 10s       | 3s      | 5                 | Alert on-call SRE; auto-failover |

---

## 5. Monitoring, Alerting & Observability

- **Metrics Collection:** Prometheus agent scraping node metrics (`node_exporter`), PostgreSQL metrics (`postgres_exporter` scraping `pg_stat_database`, `pg_stat_statements`), and container metrics (`cAdvisor`).
- **Dashboards:** Grafana visualizing:
  - Database active connections, query latencies, cache hit ratio ($> 98\%$).
  - API error rates (4xx, 5xx), response latencies (p50, p95, p99).
  - Storage volume utilization, WAL disk capacity.
- **Alerting Thresholds:**
  - Critical: Database connection exhaustion ($> 85\%$).
  - Critical: WAL archive partition capacity ($> 80\%$).
  - High: API error rate ($> 2\%$ for 5 minutes).
  - High: Slow queries ($> 250\text{ ms}$ sustained).

---

## 6. Log Retention & Forensic Audit Policy

In compliance with international humanitarian donor mandates (UN OCHA, USAID, EU ECHO):

1. **Audit Logs:** The `audit_logs` database table is append-only and retained indefinitely (minimum 7 years).
2. **Log Redaction:** All application and proxy loggers sanitize request payloads to strip bearer tokens, passwords, session cookies, and Iraqi National IDs before forwarding.
3. **Log Shipping:** System logs are shipped via TLS Syslog / Promtail to an immutable, off-site security log archive with WORM (Write-Once-Read-Many) storage policies.

---

## 7. Time Synchronization (Chrony / NTP)

Accurate timekeeping is critical for maker-checker dual authorization timestamps, time-bound document token expiration, and offline sync conflict resolution:

- **Daemon:** `chrony` configured on all host nodes.
- **NTP Sources:** Stratum-1 in-country time servers (e.g. Iraq National Meteorological / Regional GPS time references) paired with international pool servers (`0.pool.ntp.org`).
- **Jitter Tolerance:** Maximum allowable time drift is $< 50\text{ ms}$. If drift exceeds $100\text{ ms}$, Alertmanager triggers a warning alert.

---

## 8. Patching & Vulnerability Management

- **Operating System:** Ubuntu 24.04 LTS with automated `unattended-upgrades` applied for security-critical packages.
- **Container Images:** Pinned strictly by semantic release tag and digest. Images undergo daily automated vulnerability scanning via Trivy.
- **Emergency Patch Window:** Zero-day vulnerabilities in edge components (Traefik, OpenSSL, PostgreSQL) require remediation within 24 hours of vendor patch release.

---

## 9. Capacity Planning & Sizing Matrix

| Metric / Resource           | 10k Beneficiaries (Staging) | 100k Beneficiaries (Production Pilot) | 500k Beneficiaries (Full Scale Iraq) |
| :-------------------------- | :-------------------------- | :------------------------------------ | :----------------------------------- |
| **Compute (Web App)**       | 2 vCPU / 4 GB RAM           | 4 vCPU / 8 GB RAM                     | 8 vCPU / 16 GB RAM                   |
| **Compute (PostgreSQL)**    | 4 vCPU / 16 GB RAM          | 8 vCPU / 32 GB RAM                    | 16 vCPU / 64 GB RAM                  |
| **Database Storage (NVMe)** | 50 GB                       | 250 GB                                | 1 TB                                 |
| **WAL Storage**             | 20 GB                       | 100 GB                                | 250 GB                               |
| **Object Storage (Docs)**   | 100 GB                      | 1 TB                                  | 5 TB                                 |
| **Network Bandwidth**       | 20 Mbps burstable           | 100 Mbps dedicated                    | 500 Mbps dedicated                   |

---

## 10. Disaster Recovery & Business Continuity (BC/DR)

- **Recovery Point Objective (RPO):** $< 5\text{ minutes}$ (achieved via continuous PostgreSQL WAL archiving).
- **Recovery Time Objective (RTO):** $< 2\text{ hours}$ (full database restoration and application cluster reboot).
- **Backup Architecture:**
  - Daily full physical database backup via `pg_basebackup` / Barman.
  - Continuous WAL streaming to secondary storage volume.
  - Weekly off-site encrypted backup replica transported to secondary secure data center in Erbil.
  - Monthly automated backup restoration rehearsal in isolated staging sandbox.
