#!/usr/bin/env node

/**
 * Humanitarian Platform - Data Migration Dry-Run Rehearsal Runner (Phase 18)
 *
 * Simulates a full, isolated migration dry run from synthetic legacy data sources
 * (KoboToolbox surveys, Excel trackers, RAIS case dumps) into the PostgreSQL 15 schema.
 *
 * STRICT CONSTRAINT: Never accesses or touches production systems or live data.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { performance } = require('perf_hooks');
const { PGlite } = require('@electric-sql/pglite');

const ROOT_DIR = path.resolve(__dirname, '..');

function generateUUID(idx) {
  const hex = idx.toString(16).padStart(12, '0');
  return `00000000-0000-4000-b000-${hex}`;
}

const GOVERNORATES = ['IQ-BG', 'IQ-NI', 'IQ-AR', 'IQ-BA'];
const DISTRICTS_MAP = {
  'IQ-BG': 'IQ-BG-RUS',
  'IQ-NI': 'IQ-NI-MOS',
  'IQ-AR': 'IQ-AR-ERB',
  'IQ-BA': 'IQ-BA-BAS',
};
const PROGRAMMES = ['FIN', 'FOD', 'MED', 'HOU', 'EDU', 'EMG', 'EMP', 'SOC'];

async function runMigrationDryRun() {
  console.log('================================================================');
  console.log('   HUMANITARIAN PLATFORM - DATA MIGRATION DRY-RUN REHEARSAL    ');
  console.log('================================================================');
  console.log(`[INIT] Timestamp: ${new Date().toISOString()}`);
  console.log('[SAFETY] Mode: Air-Gapped Sandbox Migration Rehearsal (Synthetic Data)');
  console.log('[SAFETY] Production Access: STRICTLY PROHIBITED & BYPASSED\n');

  const startTime = performance.now();
  const db = new PGlite();
  await db.exec('CREATE SCHEMA IF NOT EXISTS auth;');
  await db.exec('CREATE SCHEMA IF NOT EXISTS storage;');

  // Step 1: Apply Target Schema
  console.log('--- Phase 1: Applying Target PostgreSQL 15 Schema ---');
  const migrations = [
    '20261113000001_core_schema.sql',
    '20261113000002_rls_and_storage_policies.sql',
    '20261113000003_safe_backend_workflows.sql',
    '20261113000004_case_assignment_and_reconciliation.sql',
    '20261113000005_beneficiary_case_management.sql',
    '20261113000006_assistance_financial_workflows.sql',
    '20261113000007_supporting_modules.sql',
    '20261113000008_encrypted_offline_sync.sql',
    '20261113000009_audit_and_security_hardening.sql',
  ];

  for (const mig of migrations) {
    let sql = fs.readFileSync(path.join(ROOT_DIR, 'supabase/migrations', mig), 'utf8');
    if (mig === '20261113000001_core_schema.sql') {
      sql = sql
        .replace(/CREATE EXTENSION IF NOT EXISTS "[^"]+";/g, '-- extension omitted')
        .replace(/USING gin \(full_name_ar gin_trgm_ops\)/g, '(full_name_ar)');
    }
    await db.exec(sql);
  }
  const seed = fs.readFileSync(path.join(ROOT_DIR, 'supabase/seed.sql'), 'utf8');
  await db.exec(seed);
  console.log('  ✔ Target schema and governorate/programme reference seeds loaded.');

  // Step 2: Generate Synthetic Legacy Dataset
  console.log('\n--- Phase 2: Generating Synthetic Legacy Source Records ---');
  const staffIdMaker = generateUUID(101);
  const staffIdChecker = generateUUID(102);
  const staffIdCaseworker = generateUUID(103);
  const migrationServiceId = '00000000-0000-0000-0000-000000000001';

  await db.exec(`
    INSERT INTO staff_profiles (id, email, full_name_ar, full_name_en, phone_number, is_active)
    VALUES 
      ('${staffIdMaker}', 'maker@humanity.iq', 'صانع مالي', 'Finance Maker', '+9647700000101', true),
      ('${staffIdChecker}', 'checker@humanity.iq', 'مدقق مالي', 'Finance Checker', '+9647700000102', true),
      ('${staffIdCaseworker}', 'caseworker@humanity.iq', 'باحث ميداني', 'Field Caseworker', '+9647700000103', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO staff_roles (staff_id, role, is_active)
    VALUES 
      ('${staffIdMaker}', 'finance_maker', true),
      ('${staffIdChecker}', 'finance_checker', true),
      ('${staffIdCaseworker}', 'caseworker', true)
    ON CONFLICT DO NOTHING;
  `);

  // Generate 200 synthetic legacy Kobo records (including 10 intentional duplicates)
  const legacyKoboRecords = [];
  const TOTAL_LEGACY = 200;
  const EXPECTED_DUPLICATES = 10;
  let totalLegacyDisbursementIQD = 0;

  for (let i = 1; i <= TOTAL_LEGACY; i++) {
    const isDuplicate = i > TOTAL_LEGACY - EXPECTED_DUPLICATES;
    const targetIdx = isDuplicate ? i - 100 : i;

    const nid = isDuplicate
      ? `IQ-LEGACY-NID-${100000 + targetIdx}` // Identical national ID to trigger duplicate review
      : `IQ-LEGACY-NID-${100000 + i}`;

    const rawPhone = `0770 123 ${i.toString().padStart(4, '0')}`; // Unformatted phone
    const gov = GOVERNORATES[i % GOVERNORATES.length];

    legacyKoboRecords.push({
      legacy_id: `KOBO-${1000 + i}`,
      national_id: nid,
      id_type: 'national_unified_card',
      full_name_ar: `المستفيد التاريخي رقم ${targetIdx}`,
      full_name_en: `Legacy Beneficiary ${targetIdx}`,
      dob: '1982-04-12',
      gender: i % 2 === 0 ? 'F' : 'M',
      raw_phone: rawPhone,
      gov_code: gov,
      displacement: 'idp',
      disbursement_amount: 150000.0, // 150,000 IQD per entitlement
      is_duplicate_candidate: isDuplicate,
      matched_legacy_id: isDuplicate ? `KOBO-${1000 + targetIdx}` : null,
    });

    totalLegacyDisbursementIQD += 150000.0;
  }

  console.log(`  ✔ Generated ${legacyKoboRecords.length} legacy survey records`);
  console.log(
    `  ✔ Embedded ${EXPECTED_DUPLICATES} candidate duplicate records for human adjudication`,
  );
  console.log(
    `  ✔ Total Legacy Financial Portfolio: ${totalLegacyDisbursementIQD.toLocaleString()} IQD`,
  );

  // Step 3: Execute Transformation, Deduplication & Ingestion
  console.log('\n--- Phase 3: Executing ETL Ingestion & Duplicate Analysis ---');
  let insertedBeneficiaries = 0;
  let flaggedDuplicates = 0;
  let insertedCases = 0;
  let insertedLedgerEntries = 0;
  let totalIngestedDisbursementIQD = 0;

  const seenNationalIds = new Map(); // NID -> UUID

  for (let i = 0; i < legacyKoboRecords.length; i++) {
    const rec = legacyKoboRecords[i];
    const benId = generateUUID(2000 + i + 1);
    const hhId = generateUUID(1000 + i + 1);
    const caseId = generateUUID(3000 + i + 1);
    const entId = generateUUID(4000 + i + 1);
    const delId = generateUUID(5000 + i + 1);

    // 1. Phone Normalization to E.164 (+9647XXXXXXXXX)
    const cleanedPhone = '+964' + rec.raw_phone.replace(/\D/g, '').replace(/^0/, '');
    const genderMapped = rec.gender === 'F' ? 'female' : 'male';
    const dist = DISTRICTS_MAP[rec.gov_code];
    const prog = PROGRAMMES[i % PROGRAMMES.length];
    const caseRef = `HUM-2026-${prog}-${(1000 + i).toString()}`;

    // 2. Duplicate Detection Check
    let duplicateStatus = 'clean';
    let matchedBenId = null;

    if (seenNationalIds.has(rec.national_id)) {
      duplicateStatus = 'pending_review';
      matchedBenId = seenNationalIds.get(rec.national_id);
      flaggedDuplicates++;
    } else {
      seenNationalIds.set(rec.national_id, benId);
    }

    // 3. Insert Beneficiary
    await db.exec(`
      INSERT INTO beneficiaries (
        id, national_id_type, national_id_number, full_name_ar, full_name_en,
        date_of_birth, gender, phone_primary, governorate_id, district_id,
        address_details, displacement_status, duplicate_status, created_by
      ) VALUES (
        '${benId}', '${rec.id_type}', '${rec.national_id}', '${rec.full_name_ar}', '${rec.full_name_en}',
        '${rec.dob}', '${genderMapped}', '${cleanedPhone}', '${rec.gov_code}', '${dist}',
        'محلة تاريخية مستوردة من نظام كوبو', '${rec.displacement}', '${duplicateStatus}', '${migrationServiceId}'
      );
    `);
    insertedBeneficiaries++;

    // 4. If Duplicate, Stage into duplicate_reviews without auto-merging
    if (duplicateStatus === 'pending_review' && matchedBenId) {
      await db.exec(`
        INSERT INTO duplicate_reviews (
          target_beneficiary_id, matched_beneficiary_id, match_score, match_reasons, status
        ) VALUES (
          '${benId}', '${matchedBenId}', 1.00, '{"reason": "exact_national_id_match", "source": "kobo_migration"}'::jsonb, 'pending'
        );
      `);
    }

    // 5. Insert Household & Case
    await db.exec(`
      INSERT INTO households (id, head_beneficiary_id, governorate_id, district_id, shelter_type)
      VALUES ('${hhId}', '${benId}', '${rec.gov_code}', '${dist}', 'rented_house');

      INSERT INTO cases (
        id, case_reference, beneficiary_id, household_id, programme_code,
        status, priority, assigned_caseworker_id, governorate_id, created_by
      ) VALUES (
        '${caseId}', '${caseRef}', '${benId}', '${hhId}', '${prog}',
        'under_assessment', 'medium', '${staffIdCaseworker}', '${rec.gov_code}', '${migrationServiceId}'
      );
    `);
    insertedCases++;

    // 6. Insert Financial Entitlement & Double-Entry Ledger Entry
    const txRef = `TX-MIG-2026-${(1000 + i).toString()}`;
    const delRef = `DEL-MIG-2026-${(1000 + i).toString()}`;

    await db.exec(`
      INSERT INTO assistance_entitlements (
        id, case_id, assistance_type, currency, authorized_amount, disbursed_amount, status
      ) VALUES (
        '${entId}', '${caseId}', 'emergency_cash', 'IQD', ${rec.disbursement_amount}, ${rec.disbursement_amount}, 'disbursed'
      );

      INSERT INTO finance_ledger (
        id, entitlement_id, transaction_type, transaction_reference, amount,
        currency, maker_id, checker_id, rationale
      ) VALUES (
        gen_random_uuid(), '${entId}', 'disbursement', '${txRef}', ${rec.disbursement_amount},
        'IQD', '${staffIdMaker}', '${staffIdChecker}', 'Historical Kobo/Excel migration disbursement'
      );

      INSERT INTO assistance_deliveries (
        id, entitlement_id, case_id, delivery_reference, recipient_national_id,
        quantity_or_amount, delivered_by, verified_by_recipient, verification_method, delivery_notes
      ) VALUES (
        '${delId}', '${entId}', '${caseId}', '${delRef}', '${rec.national_id}',
        ${rec.disbursement_amount}, '${staffIdMaker}', true, 'national_id_check', 'Migrated delivery'
      );
    `);
    insertedLedgerEntries++;
    totalIngestedDisbursementIQD += rec.disbursement_amount;
  }

  // Record Audit Trail of Migration
  await db.exec(`
    INSERT INTO audit_logs (
      event_uuid, actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
    ) VALUES (
      gen_random_uuid(), '${migrationServiceId}', 'system', 'case_mutation', 'data_migration_dry_run_completed', 'migration_batch', 'BATCH-202611-01',
      '{"total_records": ${insertedBeneficiaries}, "duplicates_flagged": ${flaggedDuplicates}, "total_iqd": ${totalIngestedDisbursementIQD}}'::jsonb
    );
  `);

  const elapsedMs = performance.now() - startTime;

  // Step 4: Verification & Validation Totals
  console.log('\n--- Phase 4: Migration Validation Totals & Reconciliation ---');

  // 1. Beneficiary Parity
  console.log(
    `  ✔ Source Records: ${legacyKoboRecords.length} | Ingested Beneficiaries: ${insertedBeneficiaries} (100% PARITY)`,
  );

  // 2. Duplicate Review Audit
  const dupeRes = await db.query(
    `SELECT count(*) AS cnt FROM duplicate_reviews WHERE status = 'pending';`,
  );
  const actualDupes = parseInt(dupeRes.rows[0].cnt, 10);
  console.log(
    `  ✔ Expected Duplicates: ${EXPECTED_DUPLICATES} | Staged for Human Review: ${actualDupes} (MATCH)`,
  );

  // 3. Financial Reconciliation
  const ledgerSumRes = await db.query(
    `SELECT SUM(amount) AS total FROM finance_ledger WHERE transaction_type = 'disbursement';`,
  );
  const actualLedgerTotalIQD = parseFloat(ledgerSumRes.rows[0].total);
  const financialVariance = actualLedgerTotalIQD - totalLegacyDisbursementIQD;

  console.log(`  ✔ Source Legacy Ledger Total: ${totalLegacyDisbursementIQD.toLocaleString()} IQD`);
  console.log(`  ✔ Ingested Target Ledger Total: ${actualLedgerTotalIQD.toLocaleString()} IQD`);
  console.log(
    `  ✔ Reconciliation Variance: ${financialVariance.toFixed(2)} IQD (Must be 0.00 IQD)`,
  );

  // 4. Foreign Key & Integrity Check
  const orphanedCasesRes = await db.query(`
    SELECT count(*) AS cnt FROM cases c LEFT JOIN beneficiaries b ON c.beneficiary_id = b.id WHERE b.id IS NULL;
  `);
  const orphanedCases = parseInt(orphanedCasesRes.rows[0].cnt, 10);
  console.log(`  ✔ Orphaned Cases: ${orphanedCases} (Must be 0)`);

  const auditCountRes = await db.query(
    `SELECT count(*) AS cnt FROM audit_logs WHERE action_name = 'data_migration_dry_run_completed';`,
  );
  console.log(
    `  ✔ Migration Audit Log Verification: ${auditCountRes.rows[0].cnt} batch audit record generated`,
  );

  console.log(
    `\n  ✔ Migration Dry Run Elapsed Duration: ${elapsedMs.toFixed(2)} ms (${(elapsedMs / 1000).toFixed(3)}s)`,
  );

  await db.close();

  if (financialVariance !== 0 || orphanedCases !== 0 || actualDupes !== EXPECTED_DUPLICATES) {
    console.error('\n[MIGRATION DRY RUN FAILED] Validation discrepancies detected!');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('   DATA MIGRATION DRY RUN COMPLETED: ALL GATES VERIFIED        ');
  console.log('================================================================\n');
}

if (require.main === module) {
  runMigrationDryRun().catch(err => {
    console.error('\n[MIGRATION ERROR]:', err);
    process.exit(1);
  });
}

module.exports = { runMigrationDryRun };
