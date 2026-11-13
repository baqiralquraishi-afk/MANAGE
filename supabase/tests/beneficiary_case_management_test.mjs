import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

test('Beneficiary, Household, Duplicate Review & Case Management Workflow Suite', async (t) => {
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

  // 5. Run Migration 05 (Beneficiary, Duplicates & Case Workflows)
  const m5 = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/migrations/20261113000005_beneficiary_case_management.sql'),
    'utf8'
  );
  await db.exec(m5);

  // 6. Run Seed Data
  const seed = fs.readFileSync(
    path.join(ROOT_DIR, 'supabase/seed.sql'),
    'utf8'
  );
  await db.exec(seed);

  // Configure scopes for test actors:
  // Caseworker (Ninewa, FIN): 00000000-0000-0000-0000-000000000003
  // Supervisor (Baghdad, multi-prog): 00000000-0000-0000-0000-000000000002
  // Security Admin (Nationwide): 00000000-0000-0000-0000-000000000001
  await db.exec(`
    INSERT INTO staff_scopes (staff_id, governorate_id, programme_code) VALUES
      ('00000000-0000-0000-0000-000000000003', 'IQ-NI', 'FIN'),
      ('00000000-0000-0000-0000-000000000002', 'IQ-BG', NULL)
    ON CONFLICT DO NOTHING;
  `);

  const CASEWORKER_NINEWA = '00000000-0000-0000-0000-000000000003';
  const SUPERVISOR_BAGHDAD = '00000000-0000-0000-0000-000000000002';
  const ADMIN_NATIONWIDE = '00000000-0000-0000-0000-000000000001';

  let primaryBeneficiaryId;
  let duplicateBeneficiaryId;
  let duplicateReviewId;
  let testHouseholdId;
  let testCaseId;

  // SUBTEST 1: Beneficiary Registration with Mandatory Consent
  await t.test('1. Permitted Staff Registers Beneficiary with Consent', async () => {
    const res = await db.query(`
      SELECT workflow_register_beneficiary(
        'national_unified_card',
        '198811223344',
        'مريم جواد كاظم',
        'Maryam Jawad Kazim',
        'فاطمة علي',
        '1988-05-15',
        'female',
        '+9647701112233',
        NULL,
        'IQ-NI',
        'IQ-NI-MOS',
        'الموصل - حي الزهور',
        'idp',
        ARRAY['female_headed_household'],
        true, -- General consent given
        false,
        '${CASEWORKER_NINEWA}'
      ) as result;
    `);

    const result = res.rows[0].result;
    assert.ok(result.beneficiary_id, 'Must return created beneficiary_id');
    assert.strictEqual(result.duplicate_status, 'clean', 'First registration must be clean');
    assert.strictEqual(result.duplicates_flagged_count, 0, 'No duplicates flagged');
    primaryBeneficiaryId = result.beneficiary_id;

    // Verify consent record
    const consentRes = await db.query(
      `SELECT * FROM beneficiary_consents WHERE beneficiary_id = '${primaryBeneficiaryId}';`
    );
    assert.strictEqual(consentRes.rows.length, 1, 'Consent record must be created');
    assert.strictEqual(consentRes.rows[0].has_given_general_consent, true);
  });

  // SUBTEST 2: Missing Consent Fails Registration
  await t.test('2. Missing Informed Consent Aborts Beneficiary Registration', async () => {
    await assert.rejects(
      db.query(`
        SELECT workflow_register_beneficiary(
          'national_unified_card',
          '199988776655',
          'سعد حميد كريم',
          'Saad Hamid Karim',
          'خديجة حسن',
          '1999-01-20',
          'male',
          '+9647709998877',
          NULL,
          'IQ-NI',
          'IQ-NI-MOS',
          'الموصل - الحدباء',
          'host_community',
          '{}'::TEXT[],
          false, -- Consent denied / missing
          false,
          '${CASEWORKER_NINEWA}'
        );
      `),
      /ERR_CONSENT_MANDATORY/,
      'Registration without consent must fail closed'
    );
  });

  // SUBTEST 3: Geographic Scope Boundary Enforced
  await t.test('3. Out-of-Scope Governorate Registration is Denied', async () => {
    // Caseworker Ninewa attempts to register a beneficiary in Baghdad (IQ-BG)
    await assert.rejects(
      db.query(`
        SELECT workflow_register_beneficiary(
          'national_unified_card',
          '199511112222',
          'كريم حسين عبد',
          NULL,
          'أمل محمود',
          '1995-07-10',
          'male',
          '+9647705556677',
          NULL,
          'IQ-BG', -- Out of Ninewa caseworker scope
          'IQ-BG-KAR',
          'بغداد - الكرخ',
          'host_community',
          '{}'::TEXT[],
          true,
          false,
          '${CASEWORKER_NINEWA}'
        );
      `),
      /ERR_GOVERNORATE_OUT_OF_SCOPE/,
      'Out of scope registration must be rejected'
    );
  });

  // SUBTEST 4: Automated Duplicate Detection Flags Candidate Without Auto-Merging
  await t.test('4. Duplicate Detection Flags Candidate Without Silently Merging', async () => {
    // Register another beneficiary with the SAME phone number as primaryBeneficiaryId
    const res = await db.query(`
      SELECT workflow_register_beneficiary(
        'civil_id',
        '999988887777',
        'مريم جواد كاظم الثانية',
        NULL,
        'فاطمة علي',
        '1988-05-15',
        'female',
        '+9647701112233', -- Identical phone
        NULL,
        'IQ-BG',
        'IQ-BG-KAR',
        'بغداد - المنصور',
        'idp',
        '{}'::TEXT[],
        true,
        false,
        '${SUPERVISOR_BAGHDAD}'
      ) as result;
    `);

    const result = res.rows[0].result;
    assert.strictEqual(result.duplicate_status, 'suspected_duplicate', 'Must be flagged as suspected duplicate');
    assert.strictEqual(result.duplicates_flagged_count, 1, 'Exactly 1 candidate flagged');
    duplicateBeneficiaryId = result.beneficiary_id;

    // Invariant: Both records must exist as distinct rows (NO AUTO-MERGE)
    const checkBoth = await db.query(
      `SELECT count(*) as count FROM beneficiaries WHERE id IN ('${primaryBeneficiaryId}', '${duplicateBeneficiaryId}');`
    );
    assert.strictEqual(parseInt(checkBoth.rows[0].count, 10), 2, 'Both records must remain distinct in database');

    // Duplicate review queue item created
    const reviewRes = await db.query(
      `SELECT * FROM duplicate_reviews WHERE target_beneficiary_id = '${duplicateBeneficiaryId}';`
    );
    assert.strictEqual(reviewRes.rows.length, 1, 'Duplicate review record must exist');
    assert.strictEqual(reviewRes.rows[0].status, 'pending', 'Review status must be pending');
    duplicateReviewId = reviewRes.rows[0].id;
  });

  // SUBTEST 5: Unauthorized Staff Denied from Deciding Duplicate Review
  await t.test('5. Caseworker Cannot Authorize Duplicate Review Decision', async () => {
    await assert.rejects(
      db.query(`
        SELECT workflow_review_duplicate(
          '${duplicateReviewId}',
          'confirmed_duplicate',
          'Caseworker attempting to decide duplicate review',
          '${CASEWORKER_NINEWA}',
          '${primaryBeneficiaryId}'
        );
      `),
      /ERR_UNAUTHORIZED_ROLE/,
      'Caseworker must not be able to decide duplicate review'
    );
  });

  // SUBTEST 6: Authorized Human Decision Confirms Duplicate (Preserving Records)
  await t.test('6. Supervisor Confirms Duplicate & Links Primary Without Deletion', async () => {
    const res = await db.query(`
      SELECT workflow_review_duplicate(
        '${duplicateReviewId}',
        'confirmed_duplicate',
        'Verified via phone interview and civil registry match with primary record',
        '${SUPERVISOR_BAGHDAD}',
        '${primaryBeneficiaryId}'
      ) as result;
    `);

    assert.strictEqual(res.rows[0].result.decision, 'confirmed_duplicate');

    // Target beneficiary must be updated with primary link
    const targetBeneficiary = await db.query(
      `SELECT duplicate_status, primary_beneficiary_id FROM beneficiaries WHERE id = '${duplicateBeneficiaryId}';`
    );
    assert.strictEqual(targetBeneficiary.rows[0].duplicate_status, 'confirmed_duplicate');
    assert.strictEqual(targetBeneficiary.rows[0].primary_beneficiary_id, primaryBeneficiaryId);

    // Primary beneficiary is untouched and active
    const primaryRecord = await db.query(
      `SELECT deleted_at FROM beneficiaries WHERE id = '${primaryBeneficiaryId}';`
    );
    assert.strictEqual(primaryRecord.rows[0].deleted_at, null, 'Primary must remain active');
  });

  // SUBTEST 7: Case Creation with Programme Sector Validation & State History
  await t.test('7. Create Case in Sector FIN with Sequential Reference & Initial State', async () => {
    // Setup household
    const hhRes = await db.query(`
      INSERT INTO households (head_beneficiary_id, governorate_id, district_id, shelter_type)
      VALUES ('${primaryBeneficiaryId}', 'IQ-NI', 'IQ-NI-MOS', 'rented_house')
      RETURNING id;
    `);
    testHouseholdId = hhRes.rows[0].id;

    // Create case
    const caseRes = await db.query(`
      SELECT workflow_create_case(
        '${primaryBeneficiaryId}',
        '${testHouseholdId}',
        'FIN',
        'high',
        'IQ-NI',
        '${CASEWORKER_NINEWA}',
        '${CASEWORKER_NINEWA}',
        'Urgent financial assistance requested for IDP household'
      ) as result;
    `);

    const result = caseRes.rows[0].result;
    assert.ok(result.case_id, 'Case ID must be returned');
    assert.ok(result.case_reference.startsWith('CASE-'), 'Case reference must have format CASE-YYYY-XXXXX');
    assert.strictEqual(result.status, 'submitted');
    testCaseId = result.case_id;

    // Verify initial case_status_history
    const historyRes = await db.query(
      `SELECT * FROM case_status_history WHERE case_id = '${testCaseId}';`
    );
    assert.strictEqual(historyRes.rows.length, 1, 'Initial state history must be recorded');
    assert.strictEqual(historyRes.rows[0].from_status, 'draft');
    assert.strictEqual(historyRes.rows[0].to_status, 'submitted');
  });

  // SUBTEST 8: Field Activity & Visit Logging
  await t.test('8. Log Field Visit Activity with Coordinates & Notes', async () => {
    const activityRes = await db.query(`
      SELECT workflow_log_case_activity(
        '${testCaseId}',
        CURRENT_DATE,
        'Field assessment conducted at rented shelter; living conditions verified',
        '${CASEWORKER_NINEWA}',
        36.335000,
        43.118889
      ) as result;
    `);

    assert.strictEqual(activityRes.rows[0].result.status, 'recorded');

    const visitRes = await db.query(
      `SELECT * FROM caseworker_visits WHERE case_id = '${testCaseId}';`
    );
    assert.strictEqual(visitRes.rows.length, 1);
    assert.strictEqual(visitRes.rows[0].caseworker_id, CASEWORKER_NINEWA);
  });

  // SUBTEST 9: Safe Case Closure Enforces Lifecycle Rules & Justification
  await t.test('9. Case Closure Requires Valid Lifecycle Status & Mandatory Reason', async () => {
    // Attempting to close a case in 'submitted' status must be blocked by lifecycle rules
    await assert.rejects(
      db.query(`
        SELECT workflow_close_case(
          '${testCaseId}',
          'Premature closure attempt',
          'No justification',
          '${SUPERVISOR_BAGHDAD}'
        );
      `),
      /ERR_INVALID_TRANSITION/,
      'Cannot close a case directly from submitted status'
    );

    // Transition case to approved
    await db.query(`
      UPDATE cases SET status = 'approved' WHERE id = '${testCaseId}';
    `);

    // Now close the case with proper reason
    const closeRes = await db.query(`
      SELECT workflow_close_case(
        '${testCaseId}',
        'Cash assistance disbursed, shelter verified, and file goals completed',
        'Household reached economic self-sufficiency benchmark',
        '${SUPERVISOR_BAGHDAD}'
      ) as result;
    `);

    assert.strictEqual(closeRes.rows[0].result.status, 'closed');

    // Verify case record has closed_at and closure_reason
    const closedCase = await db.query(
      `SELECT status, closed_at, closure_reason FROM cases WHERE id = '${testCaseId}';`
    );
    assert.strictEqual(closedCase.rows[0].status, 'closed');
    assert.ok(closedCase.rows[0].closed_at !== null);
    assert.ok(closedCase.rows[0].closure_reason.includes('Cash assistance disbursed'));
  });

  // SUBTEST 10: Accidental Destruction Safeguards
  await t.test('10. Accidental Destruction Safeguards Prevent Hard Deletions', async () => {
    // Direct DELETE on beneficiary is prohibited
    await assert.rejects(
      db.query(`DELETE FROM beneficiaries WHERE id = '${primaryBeneficiaryId}';`),
      /ERR_ACCIDENTAL_DESTRUCTION/,
      'Hard deletion of beneficiary must be blocked by trigger'
    );

    // Direct DELETE on case is prohibited
    await assert.rejects(
      db.query(`DELETE FROM cases WHERE id = '${testCaseId}';`),
      /ERR_ACCIDENTAL_DESTRUCTION/,
      'Hard deletion of case must be blocked by trigger'
    );

    // Direct DELETE on case_status_history is prohibited
    await assert.rejects(
      db.query(`DELETE FROM case_status_history WHERE case_id = '${testCaseId}';`),
      /ERR_HISTORY_IMMUTABLE/,
      'Modification of status history must be blocked by trigger'
    );
  });
});
