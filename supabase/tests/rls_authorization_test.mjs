import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

test('Supabase Local RLS & Security Verification Suite', async t => {
  const db = new PGlite();

  // 1. Run Migration 01 (Core Schema)
  let migration1 = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/migrations/20261113000001_core_schema.sql'),
    'utf8'
  );
  // Strip external C extensions not compiled in WASM PGlite; gen_random_uuid() is native in PG13+
  migration1 = migration1
    .replace(/CREATE EXTENSION IF NOT EXISTS "[^"]+";/g, '-- extension omitted in test')
    .replace(/USING gin \(full_name_ar gin_trgm_ops\)/g, '(full_name_ar)');
  await db.exec(migration1);

  // 2. Run Migration 02 (RLS & Security Policies)
  const migration2 = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/migrations/20261113000002_rls_and_storage_policies.sql'),
    'utf8'
  );
  await db.exec(migration2);

  // 3. Run Seed Data
  const seedSql = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/seed.sql'),
    'utf8'
  );
  await db.exec(seedSql);

  // Helper to switch session auth context between standard Supabase non-superuser roles
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

  // Seed scope for test caseworker and supervisor
  await db.exec(`
    INSERT INTO staff_scopes (staff_id, governorate_id, programme_code) VALUES
      ('00000000-0000-0000-0000-000000000003', 'IQ-NI', 'FIN'),
      ('00000000-0000-0000-0000-000000000002', 'IQ-BG', NULL)
    ON CONFLICT DO NOTHING;
  `);

  await t.test('1. Anonymous Access Denied (RLS returns 0 rows)', async () => {
    await asUser(null);
    const ben = await db.query('SELECT * FROM beneficiaries;');
    assert.strictEqual(ben.rows.length, 0, 'Anonymous query on beneficiaries must return 0 rows');

    const cases = await db.query('SELECT * FROM cases;');
    assert.strictEqual(cases.rows.length, 0, 'Anonymous query on cases must return 0 rows');

    const ledger = await db.query('SELECT * FROM finance_ledger;');
    assert.strictEqual(ledger.rows.length, 0, 'Anonymous query on finance_ledger must return 0 rows');

    const audit = await db.query('SELECT * FROM audit_logs;');
    assert.strictEqual(audit.rows.length, 0, 'Anonymous query on audit_logs must return 0 rows');
  });

  await t.test('2. Caseworker Scoped Query & Forbidden Operation', async () => {
    // Caseworker in Ninewa (IQ-NI)
    await asUser('00000000-0000-0000-0000-000000000003');

    // Should see assigned Ninewa case
    const assignedCases = await db.query(
      "SELECT id, case_reference, governorate_id FROM cases WHERE id = '50000000-0000-0000-0000-000000000001';"
    );
    assert.strictEqual(assignedCases.rows.length, 1, 'Caseworker must see assigned case');

    // Should NOT see unassigned Baghdad case (cross-geographic / unassigned denial)
    const crossCases = await db.query(
      "SELECT id FROM cases WHERE id = '50000000-0000-0000-0000-000000000002';"
    );
    assert.strictEqual(crossCases.rows.length, 0, 'Caseworker cannot see unassigned cross-governorate cases');

    // Forbidden Action: Caseworker attempting to approve case
    let errorThrown = false;
    try {
      await db.exec(
        "UPDATE cases SET status = 'approved' WHERE id = '50000000-0000-0000-0000-000000000001';"
      );
    } catch {
      errorThrown = true;
    }
    assert.strictEqual(errorThrown, true, 'Caseworker attempting to self-approve a case must fail RLS check');
  });

  await t.test('3. Supervisor Scope & Allowed Approvals', async () => {
    // Baghdad Supervisor
    await asUser('00000000-0000-0000-0000-000000000002');

    // Can see Baghdad cases
    const bgCases = await db.query(
      "SELECT id, governorate_id FROM cases WHERE governorate_id = 'IQ-BG';"
    );
    assert.strictEqual(bgCases.rows.length, 1, 'Supervisor must see cases within their governorate');

    // Cannot see Ninewa cases
    const niCases = await db.query(
      "SELECT id, governorate_id FROM cases WHERE governorate_id = 'IQ-NI';"
    );
    assert.strictEqual(niCases.rows.length, 0, 'Supervisor cannot see cases outside their governorate');
  });

  await t.test('4. Financial Maker-Checker Enforcement', async () => {
    // Finance Maker
    await asUser('00000000-0000-0000-0000-000000000004');

    // Attempting self-approval where maker == checker must be blocked
    let selfApprovalBlocked = false;
    try {
      await db.exec(`
        INSERT INTO finance_ledger (
          entitlement_id, transaction_type, transaction_reference,
          amount, currency, maker_id, checker_id, rationale
        ) VALUES (
          gen_random_uuid(), 'disbursement', 'TEST-SELF-APP',
          150000.00, 'IQD',
          '00000000-0000-0000-0000-000000000004',
          '00000000-0000-0000-0000-000000000004', -- Self-approval attempt!
          'Fraud attempt'
        );
      `);
    } catch {
      selfApprovalBlocked = true;
    }
    assert.strictEqual(selfApprovalBlocked, true, 'Self-approval in financial ledger must be blocked');
  });

  await t.test('5. Financial Ledger Immutability (UPDATE & DELETE Blocked)', async () => {
    // Finance Maker creates valid entitlement & ledger entry with Checker
    await asUser('00000000-0000-0000-0000-000000000004');
    const entId = '70000000-0000-0000-0000-000000000001';
    const txId = '80000000-0000-0000-0000-000000000001';

    await asAdmin();
    await db.exec(`
      INSERT INTO assistance_entitlements (id, case_id, assistance_type, currency, authorized_amount)
      VALUES ('${entId}', '50000000-0000-0000-0000-000000000002', 'cash_mpca', 'IQD', 300000.00)
      ON CONFLICT DO NOTHING;
    `);

    await asUser('00000000-0000-0000-0000-000000000004');
    await db.exec(`
      INSERT INTO finance_ledger (
        id, entitlement_id, transaction_type, transaction_reference,
        amount, currency, maker_id, checker_id, rationale
      ) VALUES (
        '${txId}', '${entId}', 'disbursement', 'TX-LEGIT-001',
        300000.00, 'IQD',
        '00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000005',
        'Legitimate authorized cash assistance'
      );
    `);

    // Under authenticated user, UPDATE is denied by RLS (updates 0 rows)
    await db.exec(`UPDATE finance_ledger SET amount = 10.00 WHERE id = '${txId}';`);
    const checkAmt = await db.query(`SELECT amount FROM finance_ledger WHERE id = '${txId}';`);
    assert.strictEqual(Number(checkAmt.rows[0].amount), 300000.00, 'Ledger amount must remain unchanged');

    // Under admin/superuser, UPDATE trigger strictly throws ERR_LEDGER_IMMUTABLE
    await asAdmin();
    let triggerBlocked = false;
    try {
      await db.exec(`UPDATE finance_ledger SET amount = 10.00 WHERE id = '${txId}';`);
    } catch (err) {
      if (err.message.includes('ERR_LEDGER_IMMUTABLE')) {
        triggerBlocked = true;
      }
    }
    assert.strictEqual(triggerBlocked, true, 'Trigger trg_prevent_ledger_modification must raise ERR_LEDGER_IMMUTABLE');

    // Under admin/superuser, DELETE trigger strictly throws ERR_LEDGER_IMMUTABLE
    let deleteTriggerBlocked = false;
    try {
      await db.exec(`DELETE FROM finance_ledger WHERE id = '${txId}';`);
    } catch (err) {
      if (err.message.includes('ERR_LEDGER_IMMUTABLE')) {
        deleteTriggerBlocked = true;
      }
    }
    assert.strictEqual(deleteTriggerBlocked, true, 'DELETE on posted finance_ledger must raise ERR_LEDGER_IMMUTABLE');
  });

  await t.test('6. Security Audit Trail Protection', async () => {
    // Caseworker cannot read audit logs
    await asUser('00000000-0000-0000-0000-000000000003');
    const logsCaseworker = await db.query('SELECT * FROM audit_logs;');
    assert.strictEqual(logsCaseworker.rows.length, 0, 'Caseworker cannot view audit logs');

    // Auditor CAN read audit logs
    await asUser('00000000-0000-0000-0000-000000000006');
    await db.exec(`
      INSERT INTO audit_logs (actor_id, actor_role, event_category, action_name, entity_table)
      VALUES ('00000000-0000-0000-0000-000000000006', 'auditor', 'auth', 'LOGIN', 'staff_profiles');
    `);
    const logsAuditor = await db.query('SELECT * FROM audit_logs;');
    assert.strictEqual(logsAuditor.rows.length >= 1, true, 'Auditor must be able to read audit logs');

    // Audit logs modification must be blocked by trigger
    await asAdmin();
    let auditModified = false;
    try {
      await db.exec('DELETE FROM audit_logs;');
    } catch (err) {
      if (err.message.includes('ERR_AUDIT_IMMUTABLE')) {
        auditModified = true;
      }
    }
    assert.strictEqual(auditModified, true, 'Audit logs cannot be deleted (ERR_AUDIT_IMMUTABLE)');
  });

  await t.test('7. Deactivated / Suspended Staff Denied Access', async () => {
    // Caseworker starts active and can read assigned cases
    await asUser('00000000-0000-0000-0000-000000000003');
    const activeCheck = await db.query('SELECT * FROM cases;');
    assert.strictEqual(activeCheck.rows.length, 1);

    // Deactivate caseworker
    await asUser('00000000-0000-0000-0000-000000000001'); // Admin
    await db.exec("UPDATE staff_profiles SET is_active = false WHERE id = '00000000-0000-0000-0000-000000000003';");

    // Deactivated caseworker queries again
    await asUser('00000000-0000-0000-0000-000000000003');
    const deactivatedCheck = await db.query('SELECT * FROM cases;');
    assert.strictEqual(deactivatedCheck.rows.length, 0, 'Deactivated staff must receive 0 rows on all protected tables');
  });

  await t.test('8. Document Metadata Private Access', async () => {
    // Reactivate caseworker for test
    await asAdmin();
    await db.exec("UPDATE staff_profiles SET is_active = true WHERE id = '00000000-0000-0000-0000-000000000003';");

    // Insert private document metadata for Ninewa beneficiary via authorized caseworker
    await asUser('00000000-0000-0000-0000-000000000003');
    await db.exec(`
      INSERT INTO document_metadata (
        beneficiary_id, document_category, storage_bucket, storage_path,
        file_name_original, mime_type, file_size_bytes, uploaded_by
      ) VALUES (
        '20000000-0000-0000-0000-000000000001', 'national_id_scan', 'documents-private',
        '20000000-0000-0000-0000-000000000001/doc_id_001.pdf', 'national_card.pdf',
        'application/pdf', 1048576, '00000000-0000-0000-0000-000000000003'
      ) ON CONFLICT (storage_path) DO NOTHING;
    `);

    // Ninewa caseworker can view metadata
    const docs = await db.query('SELECT * FROM document_metadata;');
    assert.strictEqual(docs.rows.length, 1, 'Caseworker can view metadata for assigned beneficiary');

    // Baghdad supervisor cannot view Ninewa document metadata
    await asUser('00000000-0000-0000-0000-000000000002');
    const bgDocs = await db.query('SELECT * FROM document_metadata;');
    assert.strictEqual(bgDocs.rows.length, 0, 'Baghdad supervisor cannot view Ninewa documents');
  });
});
