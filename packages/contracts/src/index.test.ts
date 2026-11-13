import test from 'node:test';
import assert from 'node:assert';
import {
  ProgrammeCodeSchema,
  SystemRoleSchema,
  CaseStatusSchema,
  VALID_CASE_TRANSITIONS,
  CaseTransitionContractSchema,
  MakerCheckerApprovalContractSchema,
  FinancialDisbursementContractSchema,
  FinancialReversalContractSchema,
  SyncMutationContractSchema,
  BeneficiaryRegistrationSchema,
  ConsentCaptureSchema,
  HouseholdCreationSchema,
  DuplicateReviewDecisionSchema,
  CaseCreationSchema,
  CaseClosureSchema,
} from './index.js';

test('ProgrammeCodeSchema validates all 8 official humanitarian programmes', () => {
  const programmes = ['FIN', 'FOD', 'MED', 'HOU', 'EDU', 'EMG', 'EMP', 'SOC'];
  for (const prog of programmes) {
    assert.strictEqual(ProgrammeCodeSchema.parse(prog), prog);
  }
  assert.throws(() => ProgrammeCodeSchema.parse('INVALID_PROG'));
});

test('SystemRoleSchema validates system roles', () => {
  const roles = [
    'intake',
    'caseworker',
    'supervisor',
    'programme_manager',
    'finance_maker',
    'finance_checker',
    'auditor',
    'report_viewer',
    'security_admin',
  ];
  for (const role of roles) {
    assert.strictEqual(SystemRoleSchema.parse(role), role);
  }
  assert.throws(() => SystemRoleSchema.parse('super_admin'));
});

test('CaseStatusSchema validates state lifecycle', () => {
  assert.strictEqual(CaseStatusSchema.parse('draft'), 'draft');
  assert.strictEqual(CaseStatusSchema.parse('approved'), 'approved');
  assert.throws(() => CaseStatusSchema.parse('deleted'));
});

test('VALID_CASE_TRANSITIONS enforces strict state machine progression', () => {
  assert.deepStrictEqual(VALID_CASE_TRANSITIONS.draft, ['submitted']);
  assert.deepStrictEqual(VALID_CASE_TRANSITIONS.pending_approval, ['approved', 'rejected']);
  assert.ok(
    !VALID_CASE_TRANSITIONS.draft.includes('approved'),
    'Direct jump from draft to approved is forbidden',
  );
});

test('CaseTransitionContractSchema validates valid transition inputs', () => {
  const valid = {
    caseId: '50000000-0000-0000-0000-000000000001',
    toStatus: 'submitted',
    justification: 'Completed initial field intake and consent',
    idempotencyKey: 'idem-key-transition-001-xyz',
  };
  assert.deepStrictEqual(CaseTransitionContractSchema.parse(valid), valid);

  // Fails with short justification
  assert.throws(() =>
    CaseTransitionContractSchema.parse({
      ...valid,
      justification: 'abc',
    }),
  );
});

test('MakerCheckerApprovalContractSchema validates dual authorization requirements', () => {
  const approval = {
    caseId: '50000000-0000-0000-0000-000000000001',
    approvalType: 'programme_eligibility',
    makerId: '00000000-0000-0000-0000-000000000003',
    decision: 'approved',
    comments: 'Meets MPCA poverty threshold criteria',
    idempotencyKey: 'idem-key-approval-001-abc',
  };
  assert.deepStrictEqual(MakerCheckerApprovalContractSchema.parse(approval), approval);
});

test('FinancialDisbursementContractSchema rejects non-positive amounts and enforces fields', () => {
  const validDisbursement = {
    entitlementId: '70000000-0000-0000-0000-000000000001',
    transactionReference: 'REF-IQD-2026-999',
    amount: 480000.0,
    currency: 'IQD',
    makerId: '00000000-0000-0000-0000-000000000004',
    rationale: 'Monthly multi-purpose cash disbursement',
    idempotencyKey: 'idem-key-disburse-001-789',
  };
  assert.deepStrictEqual(
    FinancialDisbursementContractSchema.parse(validDisbursement),
    validDisbursement,
  );

  // Negative amount must fail
  assert.throws(() =>
    FinancialDisbursementContractSchema.parse({
      ...validDisbursement,
      amount: -100,
    }),
  );

  // Zero amount must fail
  assert.throws(() =>
    FinancialDisbursementContractSchema.parse({
      ...validDisbursement,
      amount: 0,
    }),
  );
});

test('SyncMutationContractSchema strictly blocks offline financial approvals', () => {
  const validOfflineDraft = {
    idempotencyKey: 'offline-sync-token-12345678',
    deviceId: 'device-android-galaxy-tab-a9',
    mutationType: 'CREATE_DRAFT',
    clientTimestamp: '2026-11-13T14:00:00.000Z',
    payload: { fullNameAr: 'أحمد صالح' },
  };
  assert.deepStrictEqual(SyncMutationContractSchema.parse(validOfflineDraft), validOfflineDraft);

  // Attempting offline financial action is blocked by contract schema
  assert.throws(() =>
    SyncMutationContractSchema.parse({
      ...validOfflineDraft,
      mutationType: 'DISBURSE_FINANCE',
    }),
  );
});

test('BeneficiaryRegistrationSchema enforces mandatory informed consent and identity fields', () => {
  const validRegistration = {
    nationalIdType: 'national_unified_card' as const,
    nationalIdNumber: '199512345678',
    fullNameAr: 'زينب كاظم حسن',
    motherNameAr: 'مريم علي',
    dateOfBirth: '1995-04-12',
    gender: 'female' as const,
    phonePrimary: '+9647701234567',
    governorateId: 'IQ-BG',
    districtId: 'IQ-BG-KR',
    addressDetails: 'بغداد - الكرخ - حي الجامعة',
    displacementStatus: 'idp' as const,
    vulnerabilityFlags: ['female_headed_household', 'chronic_illness'],
    consent: {
      hasGivenGeneralConsent: true as const,
      hasGivenDataSharingConsent: false,
      consentVersion: 'v1.0-2026',
      language: 'ar' as const,
    },
  };

  assert.deepStrictEqual(BeneficiaryRegistrationSchema.parse(validRegistration), validRegistration);

  // Missing or false consent must fail
  assert.throws(() =>
    BeneficiaryRegistrationSchema.parse({
      ...validRegistration,
      consent: {
        ...validRegistration.consent,
        hasGivenGeneralConsent: false,
      },
    }),
  );
});

test('DuplicateReviewDecisionSchema strictly requires human decision notes and valid decision', () => {
  const validDecision = {
    duplicateReviewId: '40000000-0000-0000-0000-000000000001',
    decision: 'confirmed_duplicate' as const,
    decisionNotes: 'Confirmed duplicate via matching national unified ID and mother name',
    primaryBeneficiaryId: '30000000-0000-0000-0000-000000000001',
  };

  assert.deepStrictEqual(DuplicateReviewDecisionSchema.parse(validDecision), validDecision);

  // Empty decision notes must fail
  assert.throws(() =>
    DuplicateReviewDecisionSchema.parse({
      ...validDecision,
      decisionNotes: 'short',
    }),
  );
});

test('CaseCreationSchema validates programme sector and required scope', () => {
  const validCase = {
    beneficiaryId: '30000000-0000-0000-0000-000000000001',
    householdId: '20000000-0000-0000-0000-000000000001',
    programmeCode: 'FIN' as const,
    priority: 'high' as const,
    governorateId: 'IQ-BG',
  };

  const parsed = CaseCreationSchema.parse(validCase);
  assert.strictEqual(parsed.beneficiaryId, validCase.beneficiaryId);
  assert.strictEqual(parsed.programmeCode, 'FIN');
  assert.strictEqual(parsed.priority, 'high');
  assert.strictEqual(parsed.governorateId, 'IQ-BG');

  // Invalid programme sector must fail
  assert.throws(() =>
    CaseCreationSchema.parse({
      ...validCase,
      programmeCode: 'INVALID_SECTOR' as any,
    }),
  );
});

test('CaseClosureSchema requires detailed closure reason and justification', () => {
  const validClosure = {
    caseId: '50000000-0000-0000-0000-000000000001',
    closureReason: 'All scheduled cash installments disbursed and verified in field audit',
    justification: 'Programme completion criteria fulfilled',
  };

  assert.deepStrictEqual(CaseClosureSchema.parse(validClosure), validClosure);

  // Inadequate closure reason must fail
  assert.throws(() =>
    CaseClosureSchema.parse({
      ...validClosure,
      closureReason: 'done',
    }),
  );
});
