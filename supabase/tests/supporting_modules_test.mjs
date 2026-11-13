import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

test('Supporting Modules Suite (Phase 11)', async (t) => {
  const db = new PGlite();

  // 1. Run Migrations 01 through 07
  const migrations = [
    '20261113000001_core_schema.sql',
    '20261113000002_rls_and_storage_policies.sql',
    '20261113000003_safe_backend_workflows.sql',
    '20261113000004_case_assignment_and_reconciliation.sql',
    '20261113000005_beneficiary_case_management.sql',
    '20261113000006_assistance_financial_workflows.sql',
    '20261113000007_supporting_modules.sql',
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

  // Staff IDs from seed:
  // Caseworker Ninewa (FIN only): 00000000-0000-0000-0000-000000000003
  // Supervisor Baghdad (multi-prog): 00000000-0000-0000-0000-000000000002
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

  const BEN_BAGHDAD = '20000000-0000-0000-0000-000000000002';
  const CASE_BAGHDAD = '50000000-0000-0000-0000-000000000002';

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

  let testDocId;
  let testDownloadToken;
  let testApptId;
  let testNotifId;

  // SUBTEST 1: Disallowed MIME Types Rejected (e.g. Executable, Scripts)
  await t.test('1. Document Upload Rejects Disallowed MIME Types', async () => {
    await asUser(SUPERVISOR_BAGHDAD);

    await assert.rejects(
      db.query(`
        SELECT workflow_register_document_metadata(
          '${BEN_BAGHDAD}',
          '${CASE_BAGHDAD}',
          'national_id',
          'cases/${CASE_BAGHDAD}/doc-payload.exe',
          'malicious_script.exe',
          'application/x-msdownload',
          1048576,
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        );
      `),
      /ERR_INVALID_FILE_TYPE/,
      'Executable files must be rejected'
    );
    await asAdmin();
  });

  // SUBTEST 2: Oversized Files (>10MB) Rejected
  await t.test('2. Document Upload Rejects Oversized Files (>10MB)', async () => {
    await asUser(SUPERVISOR_BAGHDAD);

    await assert.rejects(
      db.query(`
        SELECT workflow_register_document_metadata(
          '${BEN_BAGHDAD}',
          '${CASE_BAGHDAD}',
          'medical_report',
          'cases/${CASE_BAGHDAD}/oversized-scan.pdf',
          'medical_scan.pdf',
          'application/pdf',
          15728640, -- 15MB
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        );
      `),
      /ERR_FILE_TOO_LARGE/,
      'Files exceeding 10MB must be rejected'
    );
    await asAdmin();
  });

  // SUBTEST 3: Valid Document Upload with Opaque Path Succeeded & Audited Without File Content
  await t.test('3. Valid Document Upload Accepted with Opaque Path & Audited', async () => {
    await asUser(SUPERVISOR_BAGHDAD);

    const res = await db.query(`
      SELECT workflow_register_document_metadata(
        '${BEN_BAGHDAD}',
        '${CASE_BAGHDAD}',
        'national_id',
        'cases/${CASE_BAGHDAD}/doc-f47ac10b-58cc-4372-a567-0e02b2c3d479.pdf',
        'civil_id_scan.pdf',
        'application/pdf',
        2048576, -- 2MB
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      ) as result;
    `);

    const result = res.rows[0].result;
    assert.ok(result.document_id);
    assert.strictEqual(result.status, 'registered');
    testDocId = result.document_id;
    await asAdmin();

    // Verify audit log entry exists and contains NO document contents
    const auditRes = await db.query(`
      SELECT details FROM audit_logs
      WHERE action_name = 'DOCUMENT_METADATA_REGISTERED' AND entity_id = '${testDocId}'
      ORDER BY id DESC LIMIT 1;
    `);
    assert.ok(auditRes.rows.length > 0);
    const details = auditRes.rows[0].details;
    assert.strictEqual(details.mime_type, 'application/pdf');
    assert.strictEqual(details.file_size_bytes, 2048576);
    assert.strictEqual(details.content, undefined, 'Document body content must never be logged');
  });

  // SUBTEST 4: Out-of-Scope Caseworker Denied Download Access
  await t.test('4. Out-of-Scope Caseworker Denied Document Download Access', async () => {
    // Caseworker Ninewa has no scope on Baghdad case
    await asUser(CASEWORKER_NINEWA);

    await assert.rejects(
      db.query(`SELECT workflow_request_document_download('${testDocId}', 300);`),
      /ERR_DOCUMENT_FORBIDDEN/,
      'Caseworker without scope must be denied download access'
    );
    await asAdmin();
  });

  // SUBTEST 5: Authorized Download Token Generation & Verification
  await t.test('5. Authorized Staff Issues Time-Bound Signed Download Token', async () => {
    await asUser(SUPERVISOR_BAGHDAD);

    const res = await db.query(`
      SELECT workflow_request_document_download('${testDocId}', 300) as result;
    `);

    const result = res.rows[0].result;
    assert.ok(result.token, 'Token must be generated');
    assert.ok(result.expires_at, 'Expiration timestamp must be present');
    assert.strictEqual(result.file_name, 'civil_id_scan.pdf');
    testDownloadToken = result.token;

    // Verify token validity
    const verifyRes = await db.query(`
      SELECT workflow_verify_download_token('${testDownloadToken}') as result;
    `);
    assert.strictEqual(verifyRes.rows[0].result.valid, true);
    await asAdmin();
  });

  // SUBTEST 6: Expired Download Token Rejection
  await t.test('6. Expired Download Token Is Rejected (ERR_DOWNLOAD_LINK_EXPIRED)', async () => {
    // Manually expire the token in database
    await asAdmin();
    await db.query(`
      UPDATE document_access_tokens
      SET expires_at = clock_timestamp() - interval '10 seconds'
      WHERE token = '${testDownloadToken}';
    `);

    await asUser(SUPERVISOR_BAGHDAD);
    await assert.rejects(
      db.query(`SELECT workflow_verify_download_token('${testDownloadToken}');`),
      /ERR_DOWNLOAD_LINK_EXPIRED/,
      'Expired token must fail closed'
    );
    await asAdmin();
  });

  // SUBTEST 7: Legal-Hold Protection Intercepts Deletions
  await t.test('7. Legal-Hold Protection Intercepts Document Deletion', async () => {
    await asAdmin();
    // Place legal hold
    await db.query(`
      UPDATE document_metadata
      SET is_legal_hold = true,
          legal_hold_reason = 'Judicial safeguarding inquiry ref: BG-COURT-2026-99'
      WHERE id = '${testDocId}';
    `);

    // Deletion attempt must be blocked by trigger
    await assert.rejects(
      db.query(`DELETE FROM document_metadata WHERE id = '${testDocId}';`),
      /ERR_LEGAL_HOLD_ACTIVE/,
      'Document under legal hold cannot be deleted'
    );
  });

  // SUBTEST 8: Appointment Scheduling & Permissions
  await t.test('8. Appointment Scheduling Scoped & Enforced', async () => {
    // Out-of-scope Caseworker Ninewa cannot schedule appointment for Baghdad case
    await asUser(CASEWORKER_NINEWA);
    await assert.rejects(
      db.query(`
        SELECT workflow_schedule_appointment(
          '${CASE_BAGHDAD}',
          clock_timestamp() + interval '2 days',
          'coordination_center',
          '${CASEWORKER_NINEWA}',
          'Consultation on assistance'
        );
      `),
      /ERR_APPOINTMENT_FORBIDDEN/,
      'Out of scope staff cannot schedule appointment'
    );
    await asAdmin();

    // Supervisor Baghdad schedules valid appointment
    await asUser(SUPERVISOR_BAGHDAD);
    const apptRes = await db.query(`
      SELECT workflow_schedule_appointment(
        '${CASE_BAGHDAD}',
        clock_timestamp() + interval '3 days',
        'coordination_center',
        '${SUPERVISOR_BAGHDAD}',
        'Official case consultation'
      ) as result;
    `);

    const result = apptRes.rows[0].result;
    assert.ok(result.appointment_id);
    assert.strictEqual(result.status, 'scheduled');
    testApptId = result.appointment_id;

    // Transition status to completed
    const updRes = await db.query(`
      SELECT workflow_update_appointment_status(
        '${testApptId}',
        'completed',
        'Beneficiary attended on time; identity verified.'
      ) as result;
    `);
    assert.strictEqual(updRes.rows[0].result.status, 'completed');
    await asAdmin();
  });

  // SUBTEST 9: In-App Notifications Isolation & Read State
  await t.test('9. In-App Notifications Isolated to Recipient Under RLS', async () => {
    await asAdmin();
    // Send notification to Supervisor Baghdad
    const notifRes = await db.query(`
      SELECT workflow_send_in_app_notification(
        '${SUPERVISOR_BAGHDAD}',
        'طلب اعتماد جديد',
        'New Approval Required',
        'يوجد تقييم ميداني جديد بانتظار الاعتماد',
        'A new field assessment is pending your review',
        'approval_required',
        '/dashboard/approvals'
      ) as result;
    `);
    testNotifId = notifRes.rows[0].result.notification_id;

    // Caseworker Ninewa cannot see Supervisor Baghdad's notification under RLS
    await asUser(CASEWORKER_NINEWA);
    const cwCheck = await db.query(`
      SELECT count(*) as count FROM in_app_notifications WHERE id = '${testNotifId}';
    `);
    assert.strictEqual(parseInt(cwCheck.rows[0].count, 10), 0, 'Notifications must be isolated by RLS');
    await asAdmin();

    // Supervisor Baghdad sees notification and marks as read
    await asUser(SUPERVISOR_BAGHDAD);
    const supCheck = await db.query(`
      SELECT is_read FROM in_app_notifications WHERE id = '${testNotifId}';
    `);
    assert.strictEqual(supCheck.rows[0].is_read, false);

    const markRes = await db.query(`
      SELECT workflow_mark_notification_read('${testNotifId}') as result;
    `);
    assert.strictEqual(markRes.rows[0].result.is_read, true);
    await asAdmin();
  });

  // SUBTEST 10: Scoped Operational Reports with k-Anonymity Small-Group Suppression
  await t.test('10. Operational Reports Enforce Scope & k-Anonymity Suppression (<5 masked)', async () => {
    await asUser(SUPERVISOR_BAGHDAD);

    const repRes = await db.query(`
      SELECT workflow_generate_operational_report('sector_distribution', 'IQ-BG', NULL, 10, 0) as result;
    `);

    const result = repRes.rows[0].result;
    assert.strictEqual(result.report_type, 'sector_distribution');
    assert.ok(Array.isArray(result.data));

    // For any small group (<5 cases), it must be suppressed to prevent re-identification
    for (const row of result.data) {
      if (row.is_suppressed) {
        assert.strictEqual(row.total_cases_display, '< 5', 'Small groups must display < 5');
        assert.strictEqual(row.total_cases_numeric, -1, 'Numeric count must be masked to -1');
      }
    }
    await asAdmin();
  });

  // SUBTEST 11: Audited Report Exports
  await t.test('11. Operational Report Export Writes Immutable Audit Trail', async () => {
    await asUser(SUPERVISOR_BAGHDAD);

    const expRes = await db.query(`
      SELECT workflow_audit_report_export(
        'sector_distribution',
        '{"governorate_id": "IQ-BG"}'::jsonb,
        15,
        'csv'
      ) as result;
    `);

    assert.strictEqual(expRes.rows[0].result.export_audited, true);
    assert.strictEqual(expRes.rows[0].result.format, 'csv');
    const auditId = expRes.rows[0].result.audit_id;
    await asAdmin();

    // Verify audit log row
    const auditCheck = await db.query(`
      SELECT action_name, details FROM audit_logs WHERE id = ${auditId};
    `);
    assert.strictEqual(auditCheck.rows[0].action_name, 'EXPORT_OPERATIONAL_REPORT');
    assert.strictEqual(auditCheck.rows[0].details.row_count, 15);
  });
});
