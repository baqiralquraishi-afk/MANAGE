import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

test('Assistance & Financial Workflows Suite (Phase 10)', async (t) => {
  const db = new PGlite();

  // 1. Run Migration 01 (Core Schema)
  let m1 = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/migrations/20261113000001_core_schema.sql'),
    'utf8'
  );
  m1 = m1
    .replace(/CREATE EXTENSION IF NOT EXISTS "[^"]+";/g, '-- extension omitted in test')
    .replace(/USING gin \(full_name_ar gin_trgm_ops\)/g, '(full_name_ar)');
  await db.exec(m1);

  // 2. Run Migration 02 (RLS & Policies)
  const m2 = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/migrations/20261113000002_rls_and_storage_policies.sql'),
    'utf8'
  );
  await db.exec(m2);

  // 3. Run Migration 03 (Safe Workflows)
  const m3 = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/migrations/20261113000003_safe_backend_workflows.sql'),
    'utf8'
  );
  await db.exec(m3);

  // 4. Run Migration 04 (Case Assignment)
  const m4 = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/migrations/20261113000004_case_assignment_and_reconciliation.sql'),
    'utf8'
  );
  await db.exec(m4);

  // 5. Run Migration 05 (Beneficiary Case Management)
  const m5 = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/migrations/20261113000005_beneficiary_case_management.sql'),
    'utf8'
  );
  await db.exec(m5);

  // 6. Run Migration 06 (Assistance Financial Workflows)
  const m6 = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/migrations/20261113000006_assistance_financial_workflows.sql'),
    'utf8'
  );
  await db.exec(m6);

  // 7. Run Seed Data
  const seed = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/seed.sql'),
    'utf8'
  );
  await db.exec(seed);

  // Staff IDs from seed:
  // Caseworker Ninewa (FIN only): 00000000-0000-0000-0000-000000000003
  // Supervisor Baghdad (multi-prog): 00000000-0000-0000-0000-000000000002
  // Finance Maker (Nationwide, FIN): 00000000-0000-0000-0000-000000000004
  // Finance Checker (Nationwide, All): 00000000-0000-0000-0000-000000000005
  await db.exec(`
    INSERT INTO staff_scopes (staff_id, governorate_id, programme_code) VALUES
      ('00000000-0000-0000-0000-000000000003', 'IQ-NI', 'FIN'),
      ('00000000-0000-0000-0000-000000000002', 'IQ-BG', NULL),
      ('00000000-0000-0000-0000-000000000004', NULL, 'FIN'),
      ('00000000-0000-0000-0000-000000000005', NULL, NULL)
    ON CONFLICT DO NOTHING;
  `);

  const CASEWORKER_NINEWA = '00000000-0000-0000-0000-000000000003';
  const SUPERVISOR_BAGHDAD = '00000000-0000-0000-0000-000000000002';
  const FINANCE_MAKER = '00000000-0000-0000-0000-000000000004';
  const FINANCE_CHECKER = '00000000-0000-0000-0000-000000000005';

  const CASE_FIN = '50000000-0000-0000-0000-000000000001'; // In FIN
  const CASE_FOD = '50000000-0000-0000-0000-000000000002'; // In FOD

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

  let testEntitlementId;
  let testDeliveryId;
  let testTxId;

  // SUBTEST 1: Traceable Assessment Templates for all 8 Programmes
  await t.test('1. Versioned Assessment Templates Seeded for all 8 Sectors', async () => {
    const res = await db.query(`
      SELECT programme_code, version, title_ar, title_en, is_published
      FROM assessment_templates
      WHERE version = 1
      ORDER BY programme_code;
    `);

    const sectors = res.rows.map((r) => r.programme_code);
    const expected = ['EDU', 'EMG', 'EMP', 'FIN', 'FOD', 'HOU', 'MED', 'SOC'];
    assert.deepStrictEqual(sectors, expected, 'All 8 programmes must have published assessment templates');
    for (const r of res.rows) {
      assert.strictEqual(r.is_published, true, `Template for ${r.programme_code} must be published`);
    }
  });

  // SUBTEST 2: Cross-Programme Access Denied Where Scoped
  await t.test('2. Cross-Programme Assessment Access Denied Where Scoped', async () => {
    // Caseworker Ninewa is scoped strictly to 'FIN'. Attempting to submit FOD assessment must fail
    await assert.rejects(
      db.query(`
        SELECT workflow_submit_programme_assessment(
          '${CASE_FOD}',
          '60000000-0000-0000-0000-000000000002',
          '{"food_consumption_score": 24}'::jsonb,
          75.00,
          'monthly_food_parcel',
          1,
          '${CASEWORKER_NINEWA}'
        );
      `),
      /ERR_CROSS_PROGRAMME_DENIED/,
      'Caseworker scoped to FIN must be denied from assessing FOD case'
    );
  });

  // SUBTEST 3: Assessment Submission Queues Dual-Authorization Approval
  await t.test('3. Submit FIN Assessment & Queue Dual-Authorization', async () => {
    const res = await db.query(`
      SELECT workflow_submit_programme_assessment(
        '${CASE_FIN}',
        '60000000-0000-0000-0000-000000000001',
        '{"monthly_income_iqd": 120000, "debt_level_iqd": 800000}'::jsonb,
        88.50,
        'emergency_mpca_cash',
        450000,
        '${CASEWORKER_NINEWA}'
      ) as result;
    `);

    const result = res.rows[0].result;
    assert.ok(result.submission_id);
    assert.ok(result.approval_id);
    assert.strictEqual(result.status, 'pending_approval');

    // Case must now be pending_approval
    const cRes = await db.query(`SELECT status FROM cases WHERE id = '${CASE_FIN}';`);
    assert.strictEqual(cRes.rows[0].status, 'pending_approval');
  });

  // SUBTEST 4: Self-Approval Prohibited (Maker Cannot Approve Own Request)
  await t.test('4. Self-Approval Strictly Prohibited for Maker-Checker Separation', async () => {
    // Fetch pending approval created by CASEWORKER_NINEWA
    const apprRes = await db.query(
      `SELECT id FROM case_approvals WHERE case_id = '${CASE_FIN}' AND status = 'pending' LIMIT 1;`
    );
    const approvalId = apprRes.rows[0].id;

    // Set active session to CASEWORKER_NINEWA
    await asUser(CASEWORKER_NINEWA);

    // Caseworker attempts to approve own request
    await assert.rejects(
      db.query(`
        SELECT workflow_maker_checker_approve(
          '${approvalId}',
          'approved',
          'Self-approving my own recommendation',
          'idempotency-test-self-approval-001'
        );
      `),
      /ERR_SELF_APPROVAL_PROHIBITED/,
      'Self approval must be strictly prohibited'
    );
    await asAdmin();
  });

  // SUBTEST 5: Dual-Authorization Success by Supervisor Advances Case to Approved
  await t.test('5. Supervisor Dual-Authorization Advances Case to Approved', async () => {
    const apprRes = await db.query(
      `SELECT id FROM case_approvals WHERE case_id = '${CASE_FIN}' AND status = 'pending' LIMIT 1;`
    );
    const approvalId = apprRes.rows[0].id;

    // Supervisor Baghdad approves
    await asUser(SUPERVISOR_BAGHDAD);
    const res = await db.query(`
      SELECT workflow_maker_checker_approve(
        '${approvalId}',
        'approved',
        'Verified eligibility under emergency poverty criteria',
        'idempotency-test-dual-auth-001'
      ) as result;
    `);

    assert.strictEqual(res.rows[0].result.status, 'success');
    await asAdmin();

    // Case should now be approved
    const cRes = await db.query(`SELECT status FROM cases WHERE id = '${CASE_FIN}';`);
    assert.strictEqual(cRes.rows[0].status, 'approved');
  });

  // SUBTEST 6: Fail Closed When Financial Policy Configuration is Missing
  await t.test('6. Fail Closed When Policy Limit Configuration is Missing', async () => {
    // Create an unconfigured programme test case (e.g. in SOC sector where financial limit is absent)
    const socCase = await db.query(`
      INSERT INTO cases (
        case_reference, beneficiary_id, household_id, programme_code,
        status, priority, governorate_id, created_by
      ) VALUES (
        'HUM-2026-SOC-TEST',
        '20000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000001',
        'SOC',
        'approved',
        'medium',
        'IQ-BG',
        '${SUPERVISOR_BAGHDAD}'
      ) RETURNING id;
    `);
    const socCaseId = socCase.rows[0].id;

    // Attempting to create entitlement in SOC where no financial policy limit exists must FAIL CLOSED
    await assert.rejects(
      db.query(`
        SELECT workflow_create_assistance_entitlement(
          '${socCaseId}',
          'civil_documentation_stipend',
          150000,
          'IQD',
          '${SUPERVISOR_BAGHDAD}'
        );
      `),
      /ERR_POLICY_CONFIG_MISSING/,
      'Missing policy limit configuration must fail closed'
    );
  });

  // SUBTEST 7: Approval Limits Enforced (Cannot Exceed Maximum Policy Ceiling)
  await t.test('7. Approval Limits Enforced Against Configured Policy Ceiling', async () => {
    // In FIN, manager_max_limit is 2,500,000 IQD. Attempting to allocate 3,000,000 IQD must fail
    await assert.rejects(
      db.query(`
        SELECT workflow_create_assistance_entitlement(
          '${CASE_FIN}',
          'emergency_mpca_cash',
          3000000.00,
          'IQD',
          '${SUPERVISOR_BAGHDAD}'
        );
      `),
      /ERR_APPROVAL_LIMIT_EXCEEDED/,
      'Amount exceeding maximum policy ceiling must be rejected'
    );

    // Creating entitlement within policy limit (450,000 IQD) succeeds
    const entRes = await db.query(`
      SELECT workflow_create_assistance_entitlement(
        '${CASE_FIN}',
        'emergency_mpca_cash',
        450000.00,
        'IQD',
        '${SUPERVISOR_BAGHDAD}'
      ) as result;
    `);
    testEntitlementId = entRes.rows[0].result.entitlement_id;
    assert.ok(testEntitlementId, 'Entitlement created');
  });

  // SUBTEST 8: Delivery Confirmation & Repeated Delivery Prevention
  await t.test('8. Delivery Confirmation & Repeated Delivery Blocked', async () => {
    // First delivery: Deliver 450,000 IQD
    const deliv1 = await db.query(`
      SELECT workflow_confirm_delivery(
        '${testEntitlementId}',
        'DELIV-2026-FIN-0001',
        '198512345678',
        450000.00,
        'national_id_check',
        'Cash transfer voucher delivered against verified civil ID',
        '${CASEWORKER_NINEWA}'
      ) as result;
    `);

    assert.strictEqual(deliv1.rows[0].result.status, 'completed');
    assert.strictEqual(parseFloat(deliv1.rows[0].result.remaining_entitlement), 0);
    testDeliveryId = deliv1.rows[0].result.delivery_id;

    // Repeated Delivery Attempt: Must be blocked
    await assert.rejects(
      db.query(`
        SELECT workflow_confirm_delivery(
          '${testEntitlementId}',
          'DELIV-2026-FIN-0002',
          '198512345678',
          450000.00,
          'national_id_check',
          'Second delivery attempt',
          '${CASEWORKER_NINEWA}'
        );
      `),
      /ERR_REPEATED_DELIVERY/,
      'Repeated delivery on completed entitlement must be blocked'
    );
  });

  // SUBTEST 9: Financial Disbursement Release & Self-Disbursement Prevention
  await t.test('9. Financial Disbursement Maker-Checker & Limit Check', async () => {
    await asAdmin();
    // Reset entitlement for disbursement test
    const ent2 = await db.query(`
      INSERT INTO assistance_entitlements (case_id, assistance_type, currency, authorized_amount, disbursed_amount, status)
      VALUES ('${CASE_FIN}', 'winterization_grant', 'IQD', 400000.00, 0.00, 'authorized')
      RETURNING id;
    `);
    const entId = ent2.rows[0].id;

    // Self-disbursement prohibited: Maker cannot be checker
    await assert.rejects(
      db.query(`
        SELECT workflow_disburse_financial_assistance(
          '${entId}',
          'TX-IQD-2026-TEST-001',
          200000.00,
          'IQD',
          '${FINANCE_CHECKER}', -- Maker is Checker!
          '${FINANCE_CHECKER}',
          'Disbursement rationale',
          'idem-tx-001'
        );
      `),
      /ERR_SELF_APPROVAL_PROHIBITED/,
      'Finance checker cannot disburse a transaction they prepared as maker'
    );

    // Valid disbursement: Maker is FINANCE_MAKER, Checker is FINANCE_CHECKER
    const disbRes = await db.query(`
      SELECT workflow_disburse_financial_assistance(
        '${entId}',
        'TX-IQD-2026-TEST-002',
        200000.00,
        'IQD',
        '${FINANCE_MAKER}',
        '${FINANCE_CHECKER}',
        'Monthly cash allowance for winter heating',
        'idem-tx-002'
      ) as result;
    `);

    assert.strictEqual(disbRes.rows[0].result.status, 'posted');
    testTxId = disbRes.rows[0].result.transaction_id;
  });

  // SUBTEST 10: Reversal Behavior (Never Direct Edit or Delete)
  await t.test('10. Financial Reversal Behavior & Ledger Immutability', async () => {
    await asAdmin();
    // Direct UPDATE on finance_ledger is blocked by trigger
    await assert.rejects(
      db.query(`UPDATE finance_ledger SET amount = 100000 WHERE id = '${testTxId}';`),
      /ERR_LEDGER_IMMUTABLE/,
      'Direct UPDATE on ledger must be prohibited'
    );

    // Direct DELETE on finance_ledger is blocked by trigger
    await assert.rejects(
      db.query(`DELETE FROM finance_ledger WHERE id = '${testTxId}';`),
      /ERR_LEDGER_IMMUTABLE/,
      'Direct DELETE on ledger must be prohibited'
    );

    // Issue Compensating Reversal Entry via workflow
    await asUser(FINANCE_CHECKER);
    const revRes = await db.query(`
      SELECT workflow_reverse_finance(
        '${testTxId}',
        'reversal_credit',
        'Accounting adjustment: voucher cancelled and reissued under new serial number',
        'idem-rev-001'
      ) as result;
    `);

    assert.strictEqual(revRes.rows[0].result.status, 'success');
    assert.ok(revRes.rows[0].result.reversal_transaction_id, 'Reversal transaction ID returned');
    await asAdmin();

    // Invariant: Both transactions exist in ledger (immutability preserved)
    const checkLedger = await db.query(
      `SELECT count(*) as count FROM finance_ledger WHERE id = '${testTxId}' OR reversal_of_transaction_id = '${testTxId}';`
    );
    assert.strictEqual(parseInt(checkLedger.rows[0].count, 10), 2, 'Both original and reversal entry must exist in ledger');
  });
});
