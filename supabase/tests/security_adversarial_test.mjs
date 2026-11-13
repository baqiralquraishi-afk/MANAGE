import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

test('Adversarial Security & Resilience Verification Suite (Phase 15)', async (t) => {
  const db = new PGlite();

  // 1. Run Migrations 01 through 09
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
  // Security Admin: 00000000-0000-0000-0000-000000000001
  // Supervisor Baghdad: 00000000-0000-0000-0000-000000000002
  // Caseworker Ninewa: 00000000-0000-0000-0000-000000000003
  // Finance Maker: 00000000-0000-0000-0000-000000000004
  // Finance Checker: 00000000-0000-0000-0000-000000000005
  // Auditor: 00000000-0000-0000-0000-000000000006
  const SECURITY_ADMIN = '00000000-0000-0000-0000-000000000001';
  const SUPERVISOR_BAGHDAD = '00000000-0000-0000-0000-000000000002';
  const CASEWORKER_NINEWA = '00000000-0000-0000-0000-000000000003';
  const FINANCE_MAKER = '00000000-0000-0000-0000-000000000004';
  const FINANCE_CHECKER = '00000000-0000-0000-0000-000000000005';
  const AUDITOR = '00000000-0000-0000-0000-000000000006';

  const BEN_NINEWA = '20000000-0000-0000-0000-000000000001';
  const BEN_BAGHDAD = '20000000-0000-0000-0000-000000000002';
  const CASE_NINEWA = '50000000-0000-0000-0000-000000000001';

  await db.exec(`
    INSERT INTO staff_scopes (staff_id, governorate_id, programme_code) VALUES
      ('00000000-0000-0000-0000-000000000003', 'IQ-NI', 'FIN'),
      ('00000000-0000-0000-0000-000000000002', 'IQ-BG', NULL),
      ('00000000-0000-0000-0000-000000000001', NULL, NULL),
      ('00000000-0000-0000-0000-000000000006', NULL, NULL)
    ON CONFLICT DO NOTHING;
  `);

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

  // SUBTEST 1: Enumeration & IDOR Protection across Scopes
  await t.test('1. Enumeration & IDOR: Anonymous and Out-of-Scope Caseworker denied beneficiary enumeration', async () => {
    // 1a. Anonymous user gets 0 rows
    await asUser(null);
    const anonBen = await db.query(`SELECT COUNT(*) as count FROM beneficiaries;`);
    assert.strictEqual(Number(anonBen.rows[0].count), 0, 'Anonymous caller cannot enumerate beneficiaries');

    const anonCases = await db.query(`SELECT COUNT(*) as count FROM cases;`);
    assert.strictEqual(Number(anonCases.rows[0].count), 0, 'Anonymous caller cannot enumerate cases');

    // 1b. Caseworker scoped to Ninewa cannot see Baghdad beneficiaries
    await asUser(CASEWORKER_NINEWA);
    const idorProbe = await db.query(`SELECT * FROM beneficiaries WHERE id = '${BEN_BAGHDAD}';`);
    assert.strictEqual(idorProbe.rows.length, 0, 'Caseworker cannot access out-of-scope Baghdad beneficiary by direct ID probe');

    // 1c. Caseworker can only query beneficiaries in Ninewa
    const scopedList = await db.query(`SELECT governorate_id FROM beneficiaries;`);
    for (const row of scopedList.rows) {
      assert.strictEqual(row.governorate_id, 'IQ-NI', 'All returned beneficiaries must be inside Ninewa scope');
    }

    await asAdmin();
  });

  // SUBTEST 2: Scope & Role Escalation Attacks Blocked
  await t.test('2. Scope & Privilege Escalation: Caseworker self-elevation and unauthorized workflow execution blocked', async () => {
    await asUser(CASEWORKER_NINEWA);

    // 2a. Caseworker attempts to grant themselves 'security_admin' role
    await assert.rejects(
      db.query(`
        SELECT workflow_assign_staff_role(
          '${CASEWORKER_NINEWA}',
          'security_admin',
          'محاولة ترقية غير مصرح بها لاختراق الصلاحيات'
        );
      `),
      /ERR_UNAUTHORIZED/,
      'Caseworker must not be able to assign security_admin role'
    );

    // 2b. Caseworker attempts to expand their own geographic scope to Baghdad
    await assert.rejects(
      db.query(`
        SELECT workflow_assign_staff_scope(
          '${CASEWORKER_NINEWA}',
          'IQ-BG',
          'FIN',
          'محاولة توسيع نطاق غير مصرح بها'
        );
      `),
      /ERR_UNAUTHORIZED/,
      'Caseworker must not be able to modify staff scopes'
    );

    // 2c. Caseworker attempts to execute supervisor-only case approval
    await assert.rejects(
      db.query(`
        SELECT workflow_maker_checker_approve(
          '70000000-0000-0000-0000-000000000001',
          'approved',
          'محاولة اعتماد غير مصرح بها من باحث ميداني',
          'idem-exploit-auth-001'
        );
      `),
      /ERR_UNAUTHORIZED|ERR_APPROVAL_NOT_FOUND|ERR_SELF_APPROVAL_PROHIBITED/,
      'Caseworker cannot approve cases'
    );

    // 2d. Caseworker attempts to release financial disbursement
    await assert.rejects(
      db.query(`
        SELECT workflow_disburse_financial_assistance(
          '60000000-0000-0000-0000-000000000001',
          'TX-EXPLOIT-001',
          250000.00,
          'IQD',
          '${CASEWORKER_NINEWA}',
          '${CASEWORKER_NINEWA}',
          'محاولة صرف غير مصرح بها',
          'idem-exploit-disburse-001'
        );
      `),
      /ERR_FORBIDDEN|ERR_UNAUTHORIZED|ERR_MAKER_CHECKER_SAME_USER/,
      'Caseworker cannot disburse funds'
    );

    await asAdmin();
  });

  // SUBTEST 3: Unauthorized Uploads, Disallowed MIME, and Traversal Attacks
  await t.test('3. Unauthorized Uploads: Executables, oversized payloads, and path traversals rejected', async () => {
    await asUser(SUPERVISOR_BAGHDAD);

    // 3a. Executable / dangerous MIME type rejected
    await assert.rejects(
      db.query(`
        SELECT workflow_register_document_metadata(
          '${BEN_BAGHDAD}',
          NULL,
          'national_id',
          'cases/doc-payload.exe',
          'malicious_payload.exe',
          'application/x-msdownload',
          2048,
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        );
      `),
      /ERR_INVALID_FILE_TYPE|ERR_DISALLOWED_MIME_TYPE/,
      'Executable files (.exe) must be rejected'
    );

    // 3b. HTML / Script MIME type rejected (XSS prevention in document preview)
    await assert.rejects(
      db.query(`
        SELECT workflow_register_document_metadata(
          '${BEN_BAGHDAD}',
          NULL,
          'residency_proof',
          'cases/exploit.html',
          'exploit.html',
          'text/html',
          1024,
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        );
      `),
      /ERR_INVALID_FILE_TYPE|ERR_DISALLOWED_MIME_TYPE/,
      'HTML files must be rejected'
    );

    // 3c. Oversized file (>10MB) rejected
    const elevenMB = 11 * 1024 * 1024;
    await assert.rejects(
      db.query(`
        SELECT workflow_register_document_metadata(
          '${BEN_BAGHDAD}',
          NULL,
          'medical_report',
          'cases/oversized-scan.pdf',
          'oversized_scan.pdf',
          'application/pdf',
          ${elevenMB},
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        );
      `),
      /ERR_FILE_TOO_LARGE/,
      'Files exceeding 10MB limit must be rejected'
    );

    await asAdmin();
  });

  // SUBTEST 4: Replay Attacks and Idempotency Protection
  await t.test('4. Replay Attacks: Duplicate offline sync mutation replay fails safe without side effects', async () => {
    await asUser(CASEWORKER_NINEWA);
    const replayIdemKey = 'replay-attack-idem-key-99999999';

    // First submission succeeds
    const firstRes = await db.query(`
      SELECT workflow_ingest_sync_mutation_v2(
        '${replayIdemKey}',
        'device-mob-001',
        'update_case_notes',
        'cases',
        '${CASE_NINEWA}',
        '{"notes": "Valid field intake note"}'::jsonb,
        0,
        1
      ) AS result;
    `);

    const firstResult = firstRes.rows[0].result;
    assert.strictEqual(firstResult.status, 'accepted');

    // Second submission with identical idempotency key is intercepted as replay
    const secondRes = await db.query(`
      SELECT workflow_ingest_sync_mutation_v2(
        '${replayIdemKey}',
        'device-mob-001',
        'update_case_notes',
        'cases',
        '${CASE_NINEWA}',
        '{"notes": "Replayed mutated note"}'::jsonb,
        0,
        1
      ) AS result;
    `);

    const secondResult = secondRes.rows[0].result;
    assert.strictEqual(secondResult.status, 'already_applied', 'Replayed mutation must return already_applied');

    await asAdmin();
  });

  // SUBTEST 5: Replay on Financial Disbursement Prevented
  await t.test('5. Replay Attacks: Double-disbursement of financial assistance is strictly blocked', async () => {
    // Seed an entitlement in FIN sector for disbursement test
    await asAdmin();
    const entRes = await db.query(`
      INSERT INTO assistance_entitlements (
        case_id, assistance_type, currency, authorized_amount, disbursed_amount, status
      ) VALUES (
        '${CASE_NINEWA}', 'winterization_grant', 'IQD', 200000.00, 0.00, 'authorized'
      ) RETURNING id;
    `);
    const entId = entRes.rows[0].id;

    // First disbursement succeeds
    await asUser(FINANCE_CHECKER);
    const disburseRes = await db.query(`
      SELECT workflow_disburse_financial_assistance(
        '${entId}',
        'TX-DISBURSE-REPLAY-01',
        200000.00,
        'IQD',
        '${FINANCE_MAKER}',
        '${FINANCE_CHECKER}',
        'صرف مساعدة مالية دورية أولى',
        'idem-disburse-replay-001'
      ) AS result;
    `);
    assert.strictEqual(disburseRes.rows[0].result.status, 'posted');

    // Replay attempt on same entitlement with exhausted remaining balance
    await assert.rejects(
      db.query(`
        SELECT workflow_disburse_financial_assistance(
          '${entId}',
          'TX-DISBURSE-REPLAY-02',
          200000.00,
          'IQD',
          '${FINANCE_MAKER}',
          '${FINANCE_CHECKER}',
          'محاولة تكرار الصرف لنفس الاستحقاق',
          'idem-disburse-replay-002'
        );
      `),
      /ERR_QUOTA_EXCEEDED|ERR_INSUFFICIENT_BALANCE|ERR_ALREADY_DISBURSED/,
      'Duplicate disbursement on same entitlement must fail closed'
    );

    await asAdmin();
  });

  // SUBTEST 6: Rate Limiting & Rapid Burst Security Auditing
  await t.test('6. Flood & Rate Limiting: Rapid security alerts logged defensively without data corruption', async () => {
    await asUser(CASEWORKER_NINEWA);

    // Simulate 10 rapid security alerts triggered by an automated probe
    for (let i = 1; i <= 10; i++) {
      const res = await db.query(`
        SELECT workflow_log_security_alert(
          'security_violation',
          'PROBE_BURST_ATTEMPT',
          'cases',
          'probe-${i}',
          jsonb_build_object('burst_sequence', ${i})
        ) AS result;
      `);
      assert.strictEqual(res.rows[0].result.status, 'logged');
    }

    // Verify all 10 alerts recorded immutably under security admin view
    await asUser(SECURITY_ADMIN);
    const alertCount = await db.query(`
      SELECT COUNT(*) as count FROM audit_logs WHERE action_name = 'PROBE_BURST_ATTEMPT';
    `);
    assert.strictEqual(Number(alertCount.rows[0].count), 10, 'All 10 security alerts must be recorded');

    await asAdmin();
  });
});
