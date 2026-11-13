import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

test('Audit Hardening, Immutability & Access Segregation Suite (Phase 14)', async (t) => {
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
  // Auditor: 00000000-0000-0000-0000-000000000006
  const SECURITY_ADMIN = '00000000-0000-0000-0000-000000000001';
  const SUPERVISOR_BAGHDAD = '00000000-0000-0000-0000-000000000002';
  const CASEWORKER_NINEWA = '00000000-0000-0000-0000-000000000003';
  const AUDITOR = '00000000-0000-0000-0000-000000000006';

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

  // SUBTEST 1: Append-Only Trigger strictly blocks UPDATE and DELETE on audit_logs
  await t.test('1. Append-Only Trigger strictly blocks UPDATE and DELETE on audit_logs', async () => {
    await asAdmin();

    // Insert a test audit log entry
    await db.query(`
      INSERT INTO audit_logs (
        actor_role, event_category, action_name, entity_table, entity_id
      ) VALUES (
        'system', 'security', 'INITIAL_TEST_EVENT', 'system', 'root'
      );
    `);

    // UPDATE must fail with ERR_AUDIT_IMMUTABLE
    await assert.rejects(
      db.query(`UPDATE audit_logs SET action_name = 'MUTATED' WHERE entity_id = 'root';`),
      /ERR_AUDIT_IMMUTABLE/,
      'Direct UPDATE on audit_logs must be prohibited'
    );

    // DELETE must fail with ERR_AUDIT_IMMUTABLE
    await assert.rejects(
      db.query(`DELETE FROM audit_logs WHERE entity_id = 'root';`),
      /ERR_AUDIT_IMMUTABLE/,
      'Direct DELETE on audit_logs must be prohibited'
    );
  });

  // SUBTEST 2: Segregated Audit Log Read Access under RLS
  await t.test('2. Audit Log SELECT is restricted to auditor and security_admin only', async () => {
    // Caseworker has zero read access to audit logs
    await asUser(CASEWORKER_NINEWA);
    const caseworkerRes = await db.query(`SELECT COUNT(*) as count FROM audit_logs;`);
    assert.strictEqual(Number(caseworkerRes.rows[0].count), 0, 'Caseworker cannot view audit logs');

    // Supervisor has zero read access to audit logs
    await asUser(SUPERVISOR_BAGHDAD);
    const supervisorRes = await db.query(`SELECT COUNT(*) as count FROM audit_logs;`);
    assert.strictEqual(Number(supervisorRes.rows[0].count), 0, 'Supervisor cannot view audit logs');

    // Security Admin has authorized read access
    await asUser(SECURITY_ADMIN);
    const adminRes = await db.query(`SELECT COUNT(*) as count FROM audit_logs;`);
    assert.ok(Number(adminRes.rows[0].count) > 0, 'Security Admin can inspect audit logs');

    // Auditor has authorized read access
    await asUser(AUDITOR);
    const auditorRes = await db.query(`SELECT COUNT(*) as count FROM audit_logs;`);
    assert.ok(Number(auditorRes.rows[0].count) > 0, 'Auditor can inspect audit logs');

    await asAdmin();
  });

  // SUBTEST 3: Audited Role Assignment requires security_admin and min 10 chars rationale
  await t.test('3. Audited Role Assignment requires security_admin and min 10 chars rationale', async () => {
    // Caseworker attempting to assign roles is denied
    await asUser(CASEWORKER_NINEWA);
    await assert.rejects(
      db.query(`
        SELECT workflow_assign_staff_role(
          '${SUPERVISOR_BAGHDAD}',
          'security_admin',
          'محاولة ترقية غير مصرح بها من باحث'
        );
      `),
      /ERR_UNAUTHORIZED/,
      'Caseworker cannot assign staff roles'
    );

    // Security admin with short rationale is denied (< 10 chars)
    await asUser(SECURITY_ADMIN);
    await assert.rejects(
      db.query(`
        SELECT workflow_assign_staff_role(
          '${CASEWORKER_NINEWA}',
          'supervisor',
          'ترقية'
        );
      `),
      /ERR_INVALID_RATIONALE/,
      'Rationale shorter than 10 characters must be rejected'
    );

    // Security admin assigns role with valid rationale
    const res = await db.query(`
      SELECT workflow_assign_staff_role(
        '${CASEWORKER_NINEWA}',
        'supervisor',
        'ترقية الباحث الميداني إلى مشرف مؤقت لمتابعة حالات الموصل'
      ) AS result;
    `);

    const parsed = res.rows[0].result;
    assert.strictEqual(parsed.status, 'success');
    assert.strictEqual(parsed.action, 'STAFF_ROLE_ASSIGNED');

    // Verify role was granted in staff_roles
    const roleCheck = await db.query(`
      SELECT * FROM staff_roles WHERE staff_id = '${CASEWORKER_NINEWA}' AND role = 'supervisor' AND is_active = true;
    `);
    assert.strictEqual(roleCheck.rows.length, 1);

    // Verify audit log appended
    const auditCheck = await db.query(`
      SELECT * FROM audit_logs WHERE action_name = 'STAFF_ROLE_ASSIGNED' AND entity_id = '${CASEWORKER_NINEWA}';
    `);
    assert.strictEqual(auditCheck.rows.length, 1);
    assert.strictEqual(auditCheck.rows[0].actor_role, 'security_admin');

    await asAdmin();
  });

  // SUBTEST 4: Audited Role Revocation
  await t.test('4. Audited Role Revocation deactivates role and appends audit entry', async () => {
    await asUser(SECURITY_ADMIN);

    const res = await db.query(`
      SELECT workflow_revoke_staff_role(
        '${CASEWORKER_NINEWA}',
        'supervisor',
        'انتهاء فترة التكليف المؤقتة لمشرف نينوى والعودة لصفة باحث'
      ) AS result;
    `);

    const parsed = res.rows[0].result;
    assert.strictEqual(parsed.status, 'success');
    assert.strictEqual(parsed.action, 'STAFF_ROLE_REVOKED');

    // Verify role was deactivated in staff_roles
    const roleCheck = await db.query(`
      SELECT * FROM staff_roles WHERE staff_id = '${CASEWORKER_NINEWA}' AND role = 'supervisor';
    `);
    assert.strictEqual(roleCheck.rows[0].is_active, false);

    // Verify audit log appended
    const auditCheck = await db.query(`
      SELECT * FROM audit_logs WHERE action_name = 'STAFF_ROLE_REVOKED' AND entity_id = '${CASEWORKER_NINEWA}';
    `);
    assert.strictEqual(auditCheck.rows.length, 1);

    await asAdmin();
  });

  // SUBTEST 5: Audited Staff Scope Assignment
  await t.test('5. Audited Staff Scope Assignment appends STAFF_SCOPE_ASSIGNED', async () => {
    await asUser(SECURITY_ADMIN);

    const res = await db.query(`
      SELECT workflow_assign_staff_scope(
        '${CASEWORKER_NINEWA}',
        'IQ-BG',
        'FOD',
        'توسيع نطاق الباحث الميداني ليشمل برنامج الأمن الغذائي في بغداد'
      ) AS result;
    `);

    const parsed = res.rows[0].result;
    assert.strictEqual(parsed.status, 'success');
    assert.strictEqual(parsed.action, 'STAFF_SCOPE_ASSIGNED');

    // Verify scope inserted
    const scopeCheck = await db.query(`
      SELECT * FROM staff_scopes WHERE staff_id = '${CASEWORKER_NINEWA}' AND governorate_id = 'IQ-BG' AND programme_code = 'FOD';
    `);
    assert.strictEqual(scopeCheck.rows.length, 1);

    // Verify audit log appended
    const auditCheck = await db.query(`
      SELECT * FROM audit_logs WHERE action_name = 'STAFF_SCOPE_ASSIGNED' AND details->>'target_staff_id' = '${CASEWORKER_NINEWA}';
    `);
    assert.strictEqual(auditCheck.rows.length, 1);

    await asAdmin();
  });

  // SUBTEST 6: Defensive Security Alert Logging with Data Minimization & Secret Cleansing
  await t.test('6. Defensive Security Alert Logging cleanses secrets and strips authentication tokens', async () => {
    await asUser(CASEWORKER_NINEWA);

    // Simulate logging an access denied attempt with sensitive headers/payload
    const res = await db.query(`
      SELECT workflow_log_security_alert(
        'security_violation',
        'UNAUTHORIZED_FINANCIAL_ACCESS_ATTEMPT',
        'finance_ledger',
        'entry-999',
        '{
          "reason": "Forbidden ledger modification attempt",
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitiveSecretToken",
          "password": "plain-text-secret-password",
          "serviceRoleKey": "service-role-secret-key-xyz",
          "targetResource": "finance_ledger/reversal"
        }'::jsonb
      ) AS result;
    `);

    const parsed = res.rows[0].result;
    assert.strictEqual(parsed.status, 'logged');
    const auditId = parsed.audit_id;

    // Verify audit log does NOT contain cleansed secrets
    await asUser(SECURITY_ADMIN);
    const auditCheck = await db.query(`
      SELECT details FROM audit_logs WHERE id = ${auditId};
    `);
    const details = auditCheck.rows[0].details;

    assert.strictEqual(details.token, undefined, 'Auth token must be cleansed from audit log');
    assert.strictEqual(details.password, undefined, 'Password must be cleansed from audit log');
    assert.strictEqual(details.serviceRoleKey, undefined, 'Service role key must be cleansed');
    assert.strictEqual(details.targetResource, 'finance_ledger/reversal');

    await asAdmin();
  });

  // SUBTEST 7: Sensitive Record Read Audit
  await t.test('7. Sensitive Record Read Audit logs SENSITIVE_RECORD_ACCESSED with access reason', async () => {
    const BEN_NINEWA = '20000000-0000-0000-0000-000000000001';

    await asUser(CASEWORKER_NINEWA);

    // Fails with short reason
    await assert.rejects(
      db.query(`
        SELECT workflow_audit_sensitive_read(
          'beneficiaries',
          '${BEN_NINEWA}',
          'قصير'
        );
      `),
      /ERR_INVALID_REASON/,
      'Access reason < 5 characters must be rejected'
    );

    // Succeeds with valid reason
    const res = await db.query(`
      SELECT workflow_audit_sensitive_read(
        'beneficiaries',
        '${BEN_NINEWA}',
        'تدقيق ملف الحماية الخاصة تمهيداً لزيارة المأوى'
      ) AS result;
    `);

    const parsed = res.rows[0].result;
    assert.strictEqual(parsed.status, 'logged');

    // Verify audit log exists
    await asUser(SECURITY_ADMIN);
    const auditCheck = await db.query(`
      SELECT * FROM audit_logs WHERE action_name = 'SENSITIVE_RECORD_ACCESSED' AND entity_id = '${BEN_NINEWA}';
    `);
    assert.strictEqual(auditCheck.rows.length, 1);
    assert.strictEqual(auditCheck.rows[0].details.access_reason, 'تدقيق ملف الحماية الخاصة تمهيداً لزيارة المأوى');

    await asAdmin();
  });
});
