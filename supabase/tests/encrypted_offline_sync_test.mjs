import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

test('Encrypted Offline Sync, Bounded Caching & Conflict Resolution Suite (ADR-003)', async (t) => {
  const db = new PGlite();

  // 1. Run Migrations 01 through 08
  const migrations = [
    '20261113000001_core_schema.sql',
    '20261113000002_rls_and_storage_policies.sql',
    '20261113000003_safe_backend_workflows.sql',
    '20261113000004_case_assignment_and_reconciliation.sql',
    '20261113000005_beneficiary_case_management.sql',
    '20261113000006_assistance_financial_workflows.sql',
    '20261113000007_supporting_modules.sql',
    '20261113000008_encrypted_offline_sync.sql',
  ];

  for (const m of migrations) {
    let sql = fs.readFileSync(path.join(ROOT_DIR, 'supabase/migrations', m), 'utf8');
    if (m === '20261113000001_core_schema.sql') {
      sql = sql
        .replace(/CREATE EXTENSION IF NOT EXISTS "[^"]+";/g, '-- extension omitted in test')
        .replace(/USING gin \(full_name_ar gin_trgm_ops\)/g, '(full_name_ar)');
    }
    await db.exec(sql);
  }

  // 2. Run Seed Data
  const seed = fs.readFileSync(path.join(ROOT_DIR, 'supabase/seed.sql'), 'utf8');
  await db.exec(seed);

  // Staff Profiles from Seed:
  // Caseworker Ninewa (FIN): 00000000-0000-0000-0000-000000000003
  // Supervisor Baghdad: 00000000-0000-0000-0000-000000000002
  // Security Admin / Auditor: 00000000-0000-0000-0000-000000000006
  const CASEWORKER_NINEWA = '00000000-0000-0000-0000-000000000003';
  const SUPERVISOR_BAGHDAD = '00000000-0000-0000-0000-000000000002';
  const SECURITY_ADMIN = '00000000-0000-0000-0000-000000000006';

  await db.exec(`
    INSERT INTO staff_scopes (staff_id, governorate_id, programme_code) VALUES
      ('00000000-0000-0000-0000-000000000003', 'IQ-NI', 'FIN'),
      ('00000000-0000-0000-0000-000000000002', 'IQ-BG', NULL),
      ('00000000-0000-0000-0000-000000000006', NULL, NULL)
    ON CONFLICT DO NOTHING;
  `);

  const CASE_NINEWA = '50000000-0000-0000-0000-000000000001';
  const BEN_NINEWA = '20000000-0000-0000-0000-000000000001';

  async function asUser(userId) {
    if (userId) {
      await db.exec(`SET ROLE authenticated;`);
      await db.exec(`SET request.jwt.claim.sub = '${userId}';`);
    } else {
      await db.exec(`SET ROLE anon;`);
      await db.exec(`SET request.jwt.claim.sub = '';`);
    }
  }

  async function asAdmin() {
    await db.exec(`SET ROLE postgres;`);
    await db.exec(`SET request.jwt.claim.sub = '';`);
  }

  // SUBTEST 1: Ingest valid offline visit mutation with schema versioning
  await t.test('1. Ingest valid offline visit mutation with schema versioning', async () => {
    await asUser(CASEWORKER_NINEWA);

    const res = await db.query(`
      SELECT workflow_ingest_sync_mutation_v2(
        'idem-offline-sync-visit-001',
        'tablet-android-samsung-01',
        'LOG_VISIT',
        'cases',
        '${CASE_NINEWA}',
        '{"notesAr": "زيارة ميدانية تفقدية في مخيم الجدعة", "visitType": "home_visit"}'::jsonb,
        0,
        1
      ) AS result;
    `);

    const parsed = res.rows[0].result;
    assert.strictEqual(parsed.status, 'accepted');
    assert.ok(parsed.mutation_id, 'Must return mutation ID');

    // Verify activity logged
    const activityCheck = await db.query(`
      SELECT * FROM caseworker_visits WHERE case_id = '${CASE_NINEWA}';
    `);
    assert.strictEqual(activityCheck.rows.length, 1);
    assert.strictEqual(activityCheck.rows[0].notes, 'زيارة ميدانية تفقدية في مخيم الجدعة');

    await asAdmin();
  });

  // SUBTEST 2: Idempotent replay returns existing status without duplication
  await t.test('2. Idempotent replay returns already_applied without duplication', async () => {
    await asUser(CASEWORKER_NINEWA);

    const res = await db.query(`
      SELECT workflow_ingest_sync_mutation_v2(
        'idem-offline-sync-visit-001',
        'tablet-android-samsung-01',
        'LOG_VISIT',
        'cases',
        '${CASE_NINEWA}',
        '{"notesAr": "زيارة ميدانية تفقدية في مخيم الجدعة"}'::jsonb,
        0,
        1
      ) AS result;
    `);

    const parsed = res.rows[0].result;
    assert.strictEqual(parsed.status, 'already_applied');
    assert.strictEqual(parsed.idempotent, true);

    // Verify caseworker_visits table has NOT added duplicate
    const activityCheck = await db.query(`
      SELECT * FROM caseworker_visits WHERE case_id = '${CASE_NINEWA}';
    `);
    assert.strictEqual(activityCheck.rows.length, 1);

    await asAdmin();
  });

  // SUBTEST 3: Offline approvals and financial disbursements are structurally prohibited
  await t.test('3. Structural Prohibition: Offline approvals and financial disbursements fail closed', async () => {
    await asUser(CASEWORKER_NINEWA);

    await assert.rejects(
      db.query(`
        SELECT workflow_ingest_sync_mutation_v2(
          'idem-prohibited-approve-001',
          'tablet-android-samsung-01',
          'APPROVE_CASE',
          'cases',
          '${CASE_NINEWA}',
          '{"status": "approved"}'::jsonb,
          0,
          1
        );
      `),
      /ERR_OFFLINE_FORBIDDEN/,
      'Offline case approval must be rejected'
    );

    await assert.rejects(
      db.query(`
        SELECT workflow_ingest_sync_mutation_v2(
          'idem-prohibited-disburse-001',
          'tablet-android-samsung-01',
          'DISBURSE_FINANCE',
          'assistance_entitlements',
          '70000000-0000-0000-0000-000000000001',
          '{"amount": 500000}'::jsonb,
          0,
          1
        );
      `),
      /ERR_OFFLINE_FORBIDDEN/,
      'Offline financial disbursement must be rejected'
    );

    await asAdmin();
  });

  // SUBTEST 4: Schema version validation (< 1 rejected)
  await t.test('4. Schema version validation (< 1 rejected)', async () => {
    await asUser(CASEWORKER_NINEWA);

    await assert.rejects(
      db.query(`
        SELECT workflow_ingest_sync_mutation_v2(
          'idem-invalid-schema-001',
          'tablet-android-samsung-01',
          'LOG_VISIT',
          'cases',
          '${CASE_NINEWA}',
          '{"notesAr": "اختبار"}'::jsonb,
          0,
          0
        );
      `),
      /ERR_SCHEMA_VERSION_INVALID/,
      'Schema version 0 must be rejected'
    );

    await asAdmin();
  });

  // SUBTEST 5: Conflict detection and state preservation
  let testConflictId;
  await t.test('5. Conflict detection flags newer server state without silent overwrite', async () => {
    await asAdmin();
    // Simulate server-side update to beneficiary at a specific time
    await db.query(`
      UPDATE beneficiaries
      SET phone_primary = '+9647709999999',
          updated_at = '2026-11-13 14:00:00+00'
      WHERE id = '${BEN_NINEWA}';
    `);

    // Caseworker comes online with an older snapshot base timestamp: 2026-11-13 12:00:00 UTC (1731499200000 ms)
    const olderBaseTimestampMs = 1731499200000;

    await asUser(CASEWORKER_NINEWA);
    const res = await db.query(`
      SELECT workflow_ingest_sync_mutation_v2(
        'idem-conflict-draft-001',
        'tablet-android-samsung-01',
        'UPDATE_BENEFICIARY_PHONE',
        'beneficiaries',
        '${BEN_NINEWA}',
        '{"phonePrimary": "+9647701112233", "notes": "رقم الهاتف المحدث من الميدان"}'::jsonb,
        ${olderBaseTimestampMs},
        1
      ) AS result;
    `);

    const parsed = res.rows[0].result;
    assert.strictEqual(parsed.status, 'conflict');
    assert.ok(parsed.conflict_id, 'Conflict ID must be returned');
    testConflictId = parsed.conflict_id;

    // Verify server record was NOT overwritten!
    const benCheck = await db.query(`
      SELECT phone_primary FROM beneficiaries WHERE id = '${BEN_NINEWA}';
    `);
    assert.strictEqual(
      benCheck.rows[0].phone_primary,
      '+9647709999999',
      'Server record must not be silently overwritten'
    );

    // Switch to admin to inspect sync_conflicts table (caseworker has no direct select on sync_conflicts)
    await asAdmin();
    const conflictCheck = await db.query(`
      SELECT * FROM sync_conflicts WHERE id = '${testConflictId}';
    `);
    assert.strictEqual(conflictCheck.rows.length, 1);
    assert.strictEqual(conflictCheck.rows[0].status, 'unresolved');
    assert.strictEqual(conflictCheck.rows[0].server_state.phone_primary, '+9647709999999');
    assert.strictEqual(conflictCheck.rows[0].client_state.phonePrimary, '+9647701112233');

    await asAdmin();
  });

  // SUBTEST 6: Conflict resolution by unauthorized caseworker is denied
  await t.test('6. Conflict resolution by unauthorized caseworker is denied', async () => {
    await asUser(CASEWORKER_NINEWA);

    await assert.rejects(
      db.query(`
        SELECT workflow_resolve_sync_conflict(
          '${testConflictId}',
          'use_client',
          'موافقة على بيانات العميل من قبل الباحث'
        );
      `),
      /ERR_UNAUTHORIZED/,
      'Caseworker cannot resolve their own sync conflict'
    );

    await asAdmin();
  });

  // SUBTEST 7: Conflict resolution requires minimum 10 characters notes
  await t.test('7. Conflict resolution requires minimum 10 characters notes', async () => {
    await asUser(SUPERVISOR_BAGHDAD);

    await assert.rejects(
      db.query(`
        SELECT workflow_resolve_sync_conflict(
          '${testConflictId}',
          'use_client',
          'قصير'
        );
      `),
      /ERR_INVALID_INPUT/,
      'Resolution notes shorter than 10 characters must be rejected'
    );

    await asAdmin();
  });

  // SUBTEST 8: Authorized supervisor resolves conflict with audit trail
  await t.test('8. Authorized supervisor resolves conflict with audit trail', async () => {
    await asUser(SUPERVISOR_BAGHDAD);

    const res = await db.query(`
      SELECT workflow_resolve_sync_conflict(
        '${testConflictId}',
        'use_client',
        'تم تدقيق رقم الهاتف الميداني واعتماده بعد التحقق من المستفيد'
      ) AS result;
    `);

    const parsed = res.rows[0].result;
    assert.strictEqual(parsed.status, 'resolved');
    assert.strictEqual(parsed.resolution, 'use_client');

    // Verify beneficiary record was updated to client state as chosen by supervisor (asAdmin)
    await asAdmin();
    const benCheck = await db.query(`
      SELECT phone_primary FROM beneficiaries WHERE id = '${BEN_NINEWA}';
    `);
    assert.strictEqual(benCheck.rows[0].phone_primary, '+9647701112233');

    // Verify audit log exists
    const auditCheck = await db.query(`
      SELECT * FROM audit_logs WHERE action_name = 'SYNC_CONFLICT_RESOLVED' AND entity_id = '${testConflictId}';
    `);
    assert.strictEqual(auditCheck.rows.length, 1);

    await asAdmin();
  });

  // SUBTEST 9: Bounded assigned cases offline batch caps at 50 max
  await t.test('9. Bounded assigned cases offline batch strictly caps at 50 max and scopes to caller', async () => {
    await asUser(CASEWORKER_NINEWA);

    // Call with limit 100
    const res = await db.query(`
      SELECT * FROM get_caseworker_assigned_cases_offline_batch(100);
    `);

    // Verify returned rows do not exceed 50
    assert.ok(res.rows.length <= 50, 'Must never exceed 50 cases');
    // Ensure all returned cases are assigned to CASEWORKER_NINEWA
    for (const row of res.rows) {
      assert.strictEqual(row.case_id, CASE_NINEWA);
    }

    await asAdmin();
  });
});
