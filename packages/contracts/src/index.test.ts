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
