# Disaster Recovery Restore-Drill Procedure

> **Standard Operating Procedure (SOP)**: Monthly Disaster Recovery Rehearsal.  
> **Frequency**: Monthly (First Monday of every calendar month) or prior to major version upgrades.  
> **Audience**: Site Reliability Engineers, Database Administrators, and Incident Commanders.

---

> [!CAUTION]
> **STRICT SAFETY CONSTRAINT: NEVER USE PRODUCTION DATA WITHOUT SEPARATE AUTHORIZATION**  
> Disaster recovery restore drills must NEVER restore, read, or process live production databases, real beneficiary PII, or actual financial transactions without an explicit, approved Change Authorization Ticket signed by the Head of Mission and Data Protection Officer.  
> All drills must strictly utilize **synthetic or approved sanitized datasets** in an air-gapped, isolated sandbox environment.

---

## 1. Drill Objectives & Success Criteria

The primary goal of the restore drill is to validate the organization's business continuity readiness under controlled simulated disaster conditions:

1. **Verify Recovery Time Objective (RTO)**: Total time from disaster declaration to fully operational, queryable database must be **$\le 2$ hours** (target: $< 15$ minutes in automated sandboxes).
2. **Verify Recovery Point Objective (RPO)**: WAL replay and transaction continuity must prove data loss is **$\le 5$ minutes** of simulated activity.
3. **Verify Data Integrity**:
   - Zero missing or corrupted records across core entities (`beneficiaries`, `households`, `cases`, `assistance_deliveries`, `financial_transactions`).
   - $100\%$ continuity of the immutable audit trail (`audit_events`).
   - SHA-256 cryptographic checksum matching between source backup archive and target restore stream.

---

## 2. Rehearsal Environment Architecture

Restore drills are conducted in an isolated sandbox environment physically or logically separated from production:

```mermaid
flowchart TD
    subgraph Isolated_Drill_Harness["Air-Gapped Sandbox Environment"]
        SourceInstance["Primary Isolated DB (Synthetic Data)"]
        BackupArchive["Synthetic Backup (.dump / .sql + .sha256)"]
        TargetInstance["Clean Target Database (Wiped State)"]
        Verifier["Verification Suite (Integrity & Row Auditing)"]

        SourceInstance -->|1. Generate Backup| BackupArchive
        SourceInstance -.->|2. Simulate Disaster (Wipe)| SourceInstance
        BackupArchive -->|3. Timed Restore| TargetInstance
        TargetInstance -->|4. Validate Schema & State| Verifier
        Verifier -->|5. Output Evidence & RTO| Certificate["DR Audit Certificate"]
    end
```

---

## 3. Step-by-Step Drill Execution Procedure

### Phase 1: Pre-Drill Preparation & Baseline Metrics

1. **Initialize Isolated Test Environment**:
   Ensure no network connectivity exists between the drill host and the live production network:
   ```bash
   export DRILL_DATE=$(date +%Y%m%d_%H%M%S)
   mkdir -p /tmp/dr_drill_${DRILL_DATE}
   cd /tmp/dr_drill_${DRILL_DATE}
   ```
2. **Load Schema & Verified Synthetic Seed**:
   Apply migrations `000001` through `000009` and populate with high-volume synthetic beneficiary records (e.g., via `scripts/performance-benchmark.js` or `scripts/restore-drill.js`).
3. **Record Source Baseline Counts & Hash**:
   Capture exact row counts across all tables:
   ```sql
   SELECT table_name, count(*)
   FROM information_schema.tables t
   JOIN ...
   GROUP BY table_name;
   ```

### Phase 2: Backup Archive Creation & Checksum Calculation

1. **Trigger Backup Operation**:
   ```bash
   # Create logical dump or base backup archive
   pg_dump -U postgres -d sandbox_primary -F c -b -v -f /tmp/dr_drill_${DRILL_DATE}/synthetic_backup.dump
   ```
2. **Calculate Cryptographic Checksum**:
   ```bash
   sha256sum synthetic_backup.dump > synthetic_backup.dump.sha256
   cat synthetic_backup.dump.sha256
   ```
3. **Record File Metadata**:
   Document the exact archive size in bytes and creation timestamp in the drill record.

### Phase 3: Simulated Catastrophic Disaster

1. **Declare Simulated Disaster**:
   Log the incident start timestamp: `DRILL_START_TIME=$(date +%s%N)`.
2. **Simulate Total Destruction of Primary Node**:
   Completely terminate and drop the primary database instance:
   ```bash
   dropdb -U postgres sandbox_primary --if-exists --force
   ```

### Phase 4: Timed Restoration to Fresh Sandbox Target

1. **Initialize Clean Target Database**:
   ```bash
   createdb -U postgres sandbox_restored
   ```
2. **Verify Checksum Prior to Ingestion**:
   ```bash
   sha256sum -c synthetic_backup.dump.sha256 || { echo "ERROR: Checksum mismatch!"; exit 1; }
   ```
3. **Execute Timed Database Restoration**:
   ```bash
   pg_restore -U postgres -d sandbox_restored -v synthetic_backup.dump
   ```
4. **Mark Restoration Completion**:
   Log recovery timestamp: `DRILL_STOP_TIME=$(date +%s%N)`.
   Compute elapsed recovery time: `ELAPSED_SECONDS=$(( (DRILL_STOP_TIME - DRILL_START_TIME) / 1000000000 ))`.

### Phase 5: Rigorous Data Integrity Verification

Execute post-restore verification queries against `sandbox_restored`:

1. **Table-by-Table Row Count Audit**:
   Compare restored counts against Phase 1 baseline. Zero discrepancy allowed.
2. **Referential Integrity & Foreign Key Check**:
   ```sql
   -- Verify all cases reference valid beneficiaries
   SELECT count(*) FROM cases c
   LEFT JOIN beneficiaries b ON c.beneficiary_id = b.id
   WHERE b.id IS NULL;
   -- Must return 0
   ```
3. **Audit Trail Completeness**:
   ```sql
   -- Verify audit sequence continuity
   SELECT count(*) FROM audit_events;
   ```
4. **Maker-Checker State Consistency**:
   Confirm that all approved assistance delivery records have both `maker_id` and `checker_id` intact.

---

## 4. Post-Drill Certification & Reporting

1. **Compile Drill Evidence**:
   Every drill must produce an immutable Markdown record saved in `docs/operations/dr_records/restore_drill_report_YYYYMMDD.md`.
2. **Required Report Fields**:
   - Date, time, and operator name.
   - Backup archive filename, size (bytes), and SHA-256 hash.
   - Measured Restoration Time (RTO achieved).
   - Baseline vs Restored row counts for each entity.
   - Integrity check results (Pass/Fail).
   - Observations, bottlenecks, and recommendations.
3. **Sign-Off Requirements**:
   - Rehearsal Engineer (Sign & Date).
   - SRE / DBA Lead (Sign & Date).
   - Data Protection Officer (Compliance Review).
