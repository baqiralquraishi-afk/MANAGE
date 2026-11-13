import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

test('Safe Backend Workflows, Maker-Checker & Idempotency Suite', async t => {
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

  // 3. Run Migration 03 (Safe Backend Workflows)
  const m3 = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/migrations/20261113000003_safe_backend_workflows.sql'),
    'utf8'
  );
  await db.exec(m3);

  // 4. Run Migration 04 (Case Assignment & Reconciliation)
  const m4 = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/migrations/20261113000004_case_assignment_and_reconciliation.sql'),
    'utf8'
  );
  await db.exec(m4);

  // 5. Run Seed Data
  const seed = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/seed.sql'),
    'utf8'
  );
  await db.exec(seed);

  // Scope assignments
  await db.exec(`
    INSERT INTO staff_scopes (staff_id, governorate_id, programme_code) VALUES
      ('00000000-0000-0000-0000-000000000003', 'IQ-NI', 'FIN'),
      ('00000000-0000-0000-0000-000000000002', 'IQ-BG', NULL),
      ('00000000-0000-0000-0000-000000000004', NULL, NULL),
      ('00000000-0000-0000-0000-000000000005', NULL, NULL)
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

  const testCaseId = '50000000-0000-0000-0000-000000000001'; // Ninewa case (under_assessment)
  const caseworkerId = '00000000-0000-0000-0000-000000000003';
  const supervisorId = '00000000-0000-0000-0000-000000000002';
  const financeMakerId = '00000000-0000-0000-0000-000000000004';
  const financeCheckerId = '00000000-0000-0000-0000-000000000005';

  await t.test('1. Case State Machine: Invalid Transitions & Caseworker Approval Block', async () => {
    // Caseworker submits draft to pending_approval
    await asUser(caseworkerId);

    // Invalid transition: under_assessment -> approved (jumping state machine)
    let invalidJump = false;
    try {
      await db.query(`
        SELECT public.workflow_transition_case(
          '${testCaseId}', 'approved', 'Direct jump attempt', 'idem-trans-01'
        );
      `);
    } catch (err) {
      if (err.message.includes('ERR_INVALID_TRANSITION')) {
        invalidJump = true;
      }
    }
    assert.strictEqual(invalidJump, true, 'Jumping from under_assessment to approved must fail with ERR_INVALID_TRANSITION');

    // Valid transition: under_assessment -> pending_approval
    const validTrans = await db.query(`
      SELECT public.workflow_transition_case(
        '${testCaseId}', 'pending_approval', 'Field assessment completed', 'idem-trans-02'
      );
    `);
    assert.strictEqual(validTrans.rows[0].workflow_transition_case.status, 'success');

    // Caseworker forbidden from approving: pending_approval -> approved
    let caseworkerApproveBlocked = false;
    try {
      await db.query(`
        SELECT public.workflow_transition_case(
          '${testCaseId}', 'approved', 'Caseworker approval attempt', 'idem-trans-03'
        );
      `);
    } catch (err) {
      if (err.message.includes('ERR_FORBIDDEN')) {
        caseworkerApproveBlocked = true;
      }
    }
    assert.strictEqual(caseworkerApproveBlocked, true, 'Caseworker approving a case must be rejected with ERR_FORBIDDEN');
  });

  await t.test('2. Case State Machine: Idempotent Transitions & Audit Logging', async () => {
    await asUser(caseworkerId);

    // Repeating the same transition to pending_approval must return idempotent success
    const repeatTrans = await db.query(`
      SELECT public.workflow_transition_case(
        '${testCaseId}', 'pending_approval', 'Repeat transition call', 'idem-trans-02'
      );
    `);
    assert.strictEqual(repeatTrans.rows[0].workflow_transition_case.idempotent, true);

    // Verify audit log entry was appended
    await asAdmin();
    const auditRes = await db.query(`
      SELECT * FROM audit_logs WHERE action_name = 'CASE_STATUS_TRANSITION' AND entity_id = '${testCaseId}';
    `);
    assert.strictEqual(auditRes.rows.length >= 1, true, 'Case transition must generate audit log record');
  });

  await t.test('3. Maker-Checker Dual-Authorization: Self-Approval Prevention', async () => {
    const approvalId = '60000000-0000-0000-0000-000000000001';

    // Create approval record with supervisor as maker
    await asAdmin();
    await db.exec(`
      INSERT INTO case_approvals (id, case_id, approval_type, maker_id, status)
      VALUES ('${approvalId}', '${testCaseId}', 'programme_eligibility', '${supervisorId}', 'pending')
      ON CONFLICT DO NOTHING;
    `);

    // Supervisor attempts to approve their OWN approval request (self-approval!)
    await asUser(supervisorId);
    let selfApprovalBlocked = false;
    try {
      await db.query(`
        SELECT public.workflow_maker_checker_approve(
          '${approvalId}', 'approved', 'Self approving', 'idem-app-01'
        );
      `);
    } catch (err) {
      if (err.message.includes('ERR_SELF_APPROVAL_PROHIBITED')) {
        selfApprovalBlocked = true;
      }
    }
    assert.strictEqual(selfApprovalBlocked, true, 'Maker cannot approve their own request (ERR_SELF_APPROVAL_PROHIBITED)');

    // Legitimate distinct checker: Programme Manager / Admin approves
    const adminCheckerId = '00000000-0000-0000-0000-000000000001';
    await asAdmin();
    await db.exec(`
      INSERT INTO staff_roles (staff_id, role, is_active, assigned_by)
      VALUES ('${adminCheckerId}', 'programme_manager', true, '${adminCheckerId}')
      ON CONFLICT DO NOTHING;
    `);

    await asUser(adminCheckerId);
    const approvedRes = await db.query(`
      SELECT public.workflow_maker_checker_approve(
        '${approvalId}', 'approved', 'Verified eligibility criteria met', 'idem-app-02'
      );
    `);
    assert.strictEqual(approvedRes.rows[0].workflow_maker_checker_approve.decision, 'approved');

    // Case must now be transitioned to approved
    const caseCheck = await db.query(`SELECT status FROM cases WHERE id = '${testCaseId}';`);
    assert.strictEqual(caseCheck.rows[0].status, 'approved', 'Case status must be updated to approved');
  });

  await t.test('4. Financial Disbursement Workflow: Quota & Maker-Checker Enforced', async () => {
    const entId = '70000000-0000-0000-0000-000000000002';
    await asAdmin();
    await db.exec(`
      INSERT INTO assistance_entitlements (id, case_id, assistance_type, currency, authorized_amount, disbursed_amount)
      VALUES ('${entId}', '${testCaseId}', 'cash_mpca', 'IQD', 500000.00, 0.00)
      ON CONFLICT DO NOTHING;
    `);

    // Self-approval in finance disbursement: Checker tries to pass self as maker
    await asUser(financeCheckerId);
    let financeSelfAppBlocked = false;
    try {
      await db.query(`
        SELECT public.workflow_disburse_finance(
          '${entId}', 'TX-TEST-001', 200000.00, 'IQD',
          '${financeCheckerId}', -- Self maker!
          'Disbursement', 'idem-fin-01'
        );
      `);
    } catch (err) {
      if (err.message.includes('ERR_SELF_APPROVAL_PROHIBITED')) {
        financeSelfAppBlocked = true;
      }
    }
    assert.strictEqual(financeSelfAppBlocked, true, 'Finance checker cannot disburse a transaction they made');

    // Quota Exceeded check
    let quotaExceeded = false;
    try {
      await db.query(`
        SELECT public.workflow_disburse_finance(
          '${entId}', 'TX-TEST-OVER', 9999999.00, 'IQD',
          '${financeMakerId}', 'Disbursement over quota', 'idem-fin-02'
        );
      `);
    } catch (err) {
      if (err.message.includes('ERR_QUOTA_EXCEEDED')) {
        quotaExceeded = true;
      }
    }
    assert.strictEqual(quotaExceeded, true, 'Disbursement exceeding authorized quota must be rejected');

    // Legitimate Disbursement
    const disburseRes = await db.query(`
      SELECT public.workflow_disburse_finance(
        '${entId}', 'TX-LEGIT-500', 300000.00, 'IQD',
        '${financeMakerId}', 'Monthly Cash MPCA', 'idem-fin-03'
      );
    `);
    const txData = disburseRes.rows[0].workflow_disburse_finance;
    assert.strictEqual(txData.status, 'success');
    assert.strictEqual(Number(txData.remaining_quota), 200000.00);

    // Verify assistance_entitlements.disbursed_amount was incremented
    const entCheck = await db.query(`SELECT disbursed_amount FROM assistance_entitlements WHERE id = '${entId}';`);
    assert.strictEqual(Number(entCheck.rows[0].disbursed_amount), 300000.00);
  });

  await t.test('5. Financial Reversal Accounting (Never In-Place Mutation)', async () => {
    await asUser(financeCheckerId);
    const ledgerTx = await db.query(`SELECT id FROM finance_ledger WHERE transaction_reference = 'TX-LEGIT-500';`);
    const origTxId = ledgerTx.rows[0].id;

    // Issue Reversal Entry
    const revRes = await db.query(`
      SELECT public.workflow_reverse_finance(
        '${origTxId}', 'reversal_credit', 'Canceled voucher reversal', 'idem-rev-01'
      );
    `);
    assert.strictEqual(revRes.rows[0].workflow_reverse_finance.status, 'success');

    // Verify original transaction is STILL intact in finance_ledger
    const origTxCheck = await db.query(`SELECT * FROM finance_ledger WHERE id = '${origTxId}';`);
    assert.strictEqual(origTxCheck.rows.length, 1, 'Original transaction must remain immutable in ledger');

    // Verify reversal entry exists referencing original ID
    const revTxCheck = await db.query(`SELECT * FROM finance_ledger WHERE reversal_of_transaction_id = '${origTxId}';`);
    assert.strictEqual(revTxCheck.rows.length, 1, 'Compensating reversal transaction must exist');
    assert.strictEqual(revTxCheck.rows[0].transaction_type, 'reversal_credit');
  });

  await t.test('6. Offline Sync Ingest: Forbid Financial Actions & Enforce Idempotency', async () => {
    await asUser(caseworkerId);

    // Offline financial approval mutation must be REJECTED
    let offlineFinBlocked = false;
    try {
      await db.query(`
        SELECT public.workflow_ingest_sync_mutation(
          'sync-fin-illegal-01', 'device-tablet-01', 'DISBURSE_FINANCE', '{"amount": 1000}'::jsonb
        );
      `);
    } catch (err) {
      if (err.message.includes('ERR_OFFLINE_FORBIDDEN')) {
        offlineFinBlocked = true;
      }
    }
    assert.strictEqual(offlineFinBlocked, true, 'Offline financial mutations must be blocked with ERR_OFFLINE_FORBIDDEN');

    // Valid offline draft ingest
    const syncRes = await db.query(`
      SELECT public.workflow_ingest_sync_mutation(
        'sync-valid-draft-001', 'device-tablet-01', 'CREATE_DRAFT', '{"name": "test beneficiary"}'::jsonb
      );
    `);
    assert.strictEqual(syncRes.rows[0].workflow_ingest_sync_mutation.status, 'success');

    // Replay of same idempotency key
    const replayRes = await db.query(`
      SELECT public.workflow_ingest_sync_mutation(
        'sync-valid-draft-001', 'device-tablet-01', 'CREATE_DRAFT', '{"name": "test beneficiary"}'::jsonb
      );
    `);
    assert.strictEqual(replayRes.rows[0].workflow_ingest_sync_mutation.idempotent, true);
    assert.strictEqual(replayRes.rows[0].workflow_ingest_sync_mutation.status, 'already_applied');
  });

  await t.test('7. Case Assignment Workflow: Role & Governorate Scope Enforced', async () => {
    // Caseworker attempting to assign case must be rejected
    await asUser(caseworkerId);
    let workerAssignBlocked = false;
    try {
      await db.query(`
        SELECT public.workflow_assign_case(
          '${testCaseId}', '${caseworkerId}', 'Self assigning', 'idem-assign-01'
        );
      `);
    } catch (err) {
      if (err.message.includes('ERR_FORBIDDEN')) {
        workerAssignBlocked = true;
      }
    }
    assert.strictEqual(workerAssignBlocked, true, 'Caseworker cannot assign cases');

    // Baghdad Supervisor attempting to assign Ninewa case must be rejected (cross-scope)
    await asUser(supervisorId);
    let crossGovAssignBlocked = false;
    try {
      await db.query(`
        SELECT public.workflow_assign_case(
          '${testCaseId}', '${caseworkerId}', 'Cross-gov assigning', 'idem-assign-02'
        );
      `);
    } catch (err) {
      if (err.message.includes('ERR_SCOPE_DENIED')) {
        crossGovAssignBlocked = true;
      }
    }
    assert.strictEqual(crossGovAssignBlocked, true, 'Supervisor out of governorate scope cannot assign case');

    // Grant Ninewa Supervisor scope and assign
    const ninewaSupId = '00000000-0000-0000-0000-000000000099';
    await asAdmin();
    await db.exec(`
      INSERT INTO staff_profiles (id, email, full_name_ar, full_name_en, is_active)
      VALUES ('${ninewaSupId}', 'sup.ninewa@humanity.local', 'مشرف نينوى', 'Supervisor Ninewa', true)
      ON CONFLICT DO NOTHING;

      INSERT INTO staff_roles (staff_id, role, is_active)
      VALUES ('${ninewaSupId}', 'supervisor', true)
      ON CONFLICT DO NOTHING;

      INSERT INTO staff_scopes (staff_id, governorate_id)
      VALUES ('${ninewaSupId}', 'IQ-NI')
      ON CONFLICT DO NOTHING;
    `);

    await asUser(ninewaSupId);
    const assignRes = await db.query(`
      SELECT public.workflow_assign_case(
        '${testCaseId}', '${caseworkerId}', 'Formal assignment to field worker', 'idem-assign-03'
      );
    `);
    assert.strictEqual(assignRes.rows[0].workflow_assign_case.status, 'success');
  });

  await t.test('8. Audited Document Access Request', async () => {
    const testDocId = '90000000-0000-0000-0000-000000000001';
    await asAdmin();
    await db.exec(`
      INSERT INTO document_metadata (
        id, beneficiary_id, case_id, document_category, storage_bucket,
        storage_path, file_name_original, mime_type, file_size_bytes, uploaded_by
      ) VALUES (
        '${testDocId}', '20000000-0000-0000-0000-000000000001', '${testCaseId}',
        'national_id_scan', 'documents-private', 'ninewa/doc1.pdf',
        'national_card.pdf', 'application/pdf', 500000, '${caseworkerId}'
      ) ON CONFLICT DO NOTHING;
    `);

    // Unauthorized staff (Baghdad supervisor) attempting to access Ninewa document
    await asUser(supervisorId);
    let docForbidden = false;
    try {
      await db.query(`SELECT public.workflow_request_document_access('${testDocId}');`);
    } catch (err) {
      if (err.message.includes('ERR_DOCUMENT_FORBIDDEN')) {
        docForbidden = true;
      }
    }
    assert.strictEqual(docForbidden, true, 'Cross-governorate document access must be forbidden');

    // Authorized caseworker requests document
    await asUser(caseworkerId);
    const docAccessRes = await db.query(`SELECT public.workflow_request_document_access('${testDocId}');`);
    assert.strictEqual(docAccessRes.rows[0].workflow_request_document_access.access_granted, true);

    // Verify DOCUMENT_ACCESS_REQUESTED audit log
    await asAdmin();
    const docAudit = await db.query(`
      SELECT * FROM audit_logs WHERE action_name = 'DOCUMENT_ACCESS_REQUESTED' AND entity_id = '${testDocId}';
    `);
    assert.strictEqual(docAudit.rows.length >= 1, true, 'Document access must generate audit log record');
  });

  await t.test('9. Financial Reconciliation Workflow', async () => {
    const entId = '70000000-0000-0000-0000-000000000002';

    // Unauthorized caseworker cannot reconcile batch
    await asUser(caseworkerId);
    let reconcileBlocked = false;
    try {
      await db.query(`
        SELECT public.workflow_reconcile_finance_batch(
          '${entId}', 'BANK-REF-998877', 'Caseworker reconciliation attempt', 'idem-rec-01'
        );
      `);
    } catch (err) {
      if (err.message.includes('ERR_FORBIDDEN')) {
        reconcileBlocked = true;
      }
    }
    assert.strictEqual(reconcileBlocked, true, 'Caseworker forbidden from financial reconciliation');

    // Authorized Finance Checker reconciles batch
    await asUser(financeCheckerId);
    const recRes = await db.query(`
      SELECT public.workflow_reconcile_finance_batch(
        '${entId}', 'BANK-REF-998877', 'Monthly bank clearing confirmed', 'idem-rec-02'
      );
    `);
    assert.strictEqual(recRes.rows[0].workflow_reconcile_finance_batch.status, 'success');

    // Verify audit log
    await asAdmin();
    const recAudit = await db.query(`
      SELECT * FROM audit_logs WHERE action_name = 'FINANCE_BATCH_RECONCILED' AND entity_id = '${entId}';
    `);
    assert.strictEqual(recAudit.rows.length >= 1, true, 'Reconciliation must be logged in audit trail');
  });
});

