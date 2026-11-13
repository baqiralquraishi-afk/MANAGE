# Operational Handover Guide: Systems Operators & Site Reliability Engineers

> **Target Roles**: Systems Operators, Site Reliability Engineers (SREs), Database Administrators (DBAs).  
> **Key Responsibilities**: Stack availability, network boundary enforcement, continuous database archiving, health monitoring, and disaster recovery execution.

---

## 1. System Architecture & Container Stack Overview

The self-hosted platform runs as a multi-tier containerized stack orchestrated via Docker Compose:

```
/srv/humanity-platform/
├── infra/
│   ├── docker-compose.staging.yml  # Master container orchestration
│   ├── .env.staging                # Injected secrets from Vault (chmod 600)
│   └── config/
│       ├── postgres.conf           # Hardened PostgreSQL engine settings
│       ├── pg_hba.conf             # Subnet-restricted authentication rules
│       └── traefik_dynamic.yml     # TLS 1.3 reverse proxy & rate limiting
```

### Core Services & Port Topology:

- **Traefik (Reverse Proxy)**: Exposes ports `80` (HTTP $\to$ HTTPS redirect) and `443` (TLS 1.3 termination).
- **Next.js Web Frontend**: Internal port `3000` (bridged to `app-net`).
- **Kong API Gateway**: Internal port `8000` (bridged to `app-net`).
- **PostgREST / GoTrue / Storage**: Connected to internal `app-net` and `db-net`.
- **PostgreSQL 15 (`supabase-db`)**: **ZERO HOST PORTS PUBLISHED**. Binds only to `db-net` (`172.28.3.0/24`).
- **MinIO S3 (`minio`)**: **ZERO HOST PORTS PUBLISHED**. Binds only to `storage-net` (`172.28.4.0/24`).

---

## 2. Daily Routine & Health Verification Procedures

### Step 2.1: Morning Service Sanity Inspection

Log in to the deployment bastion and verify container states:

```bash
cd /srv/humanity-platform
docker compose -f infra/docker-compose.staging.yml ps
```

_Pass Criteria_: All 8 containers report `healthy` status.

### Step 2.2: Continuous WAL Archiving Check

Confirm PostgreSQL Write-Ahead Log archiving is actively operating:

```bash
docker compose -f infra/docker-compose.staging.yml exec -T supabase-db \
  psql -U postgres -d postgres -c "SELECT archived_count, last_archived_time, failed_count FROM pg_stat_archiver;"
```

_Alert Threshold_: If `failed_count > 0` or `last_archived_time` is $> 10$ minutes ago, inspect disk space on `/var/lib/postgresql/wal_archive`.

### Step 2.3: Storage & Disk Saturation Review

```bash
df -h /var/lib/docker /var/lib/postgresql/data /mnt/backups
```

_Alert Threshold_: If any volume exceeds $75\%$ utilization, trigger log pruning or volume expansion.

---

## 3. Standard Operational Runbook References

- **Deploying Updates**: Follow [docs/operations/runbooks/deployment.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/runbooks/deployment.md).
- **Rolling Back Service**: Follow [docs/operations/runbooks/rollback.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/runbooks/rollback.md).
- **Disaster Recovery Rehearsal**: Follow [docs/operations/runbooks/restore_drill_procedure.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/runbooks/restore_drill_procedure.md) (`pnpm.cmd dr:drill`).
- **Service Outage Containment**: Follow [docs/operations/incident_response/service_outage.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/incident_response/service_outage.md).

---

## 4. On-Call Escalation Matrix

If a SEV-1 incident occurs (e.g. database unrecoverable, host compromise):

1. Page Lead SRE: **Tariq Al-Jubouri** (`+964 770 000 0201`).
2. Convene Incident Command Bridge on secure radio Channel 4.
3. If recovery exceeds 30 minutes, initiate secondary site failover to Erbil.
