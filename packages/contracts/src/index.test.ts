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
  ProgrammeAssessmentSubmissionSchema,
  AssistanceDeliveryConfirmationSchema,
  ProgrammeFinancialLimitSchema,
  DocumentMetadataRegistrationSchema,
  DocumentDownloadRequestSchema,
  AppointmentScheduleSchema,
  AppointmentStatusUpdateSchema,
  InAppNotificationSchema,
  OperationalReportFilterSchema,
  ReportExportAuditSchema,
  SyncMutationStateSchema,
  PermittedOfflineMutationTypeSchema,
  ProhibitedOfflineMutationTypeSchema,
  OFFLINE_BOUNDS,
  OfflineDraftMutationSchema,
  SyncConflictStatusSchema,
  SyncConflictRecordSchema,
  SyncConflictResolutionRequestSchema,
  StaffRoleAssignmentSchema,
  StaffRoleRevocationSchema,
  StaffScopeAssignmentSchema,
  SecurityAuditCategorySchema,
  SecurityAuditAlertSchema,
  SensitiveReadAuditSchema,
  APPROVED_HUMANITARIAN_TERMS,
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

test('OfflineDraftMutationSchema validates versioned bounded draft lifecycle states', () => {
  const validDraft = {
    idempotencyKey: '00000000-0000-0000-0000-000000000099',
    schemaVersion: 1,
    deviceId: 'field-tablet-device-01',
    caseworkerId: '00000000-0000-0000-0000-000000000002',
    mutationType: 'LOG_VISIT' as const,
    entityTable: 'case_activities',
    entityId: '50000000-0000-0000-0000-000000000001',
    payload: { notesAr: 'زيارة ميدانية أولية للمأوى' },
    baseServerVersion: 1731513600000,
    state: 'queued' as const,
  };
  assert.deepStrictEqual(OfflineDraftMutationSchema.parse(validDraft), validDraft);

  // Prohibited offline approval mutations fail schema validation
  assert.throws(() =>
    OfflineDraftMutationSchema.parse({
      ...validDraft,
      mutationType: 'APPROVE_CASE',
    }),
  );

  assert.throws(() =>
    OfflineDraftMutationSchema.parse({
      ...validDraft,
      mutationType: 'DISBURSE_FINANCE',
    }),
  );
});

test('OFFLINE_BOUNDS enforces strict ADR-003 limits and prohibitions', () => {
  assert.strictEqual(OFFLINE_BOUNDS.MAX_ASSIGNED_CASES, 50);
  assert.strictEqual(OFFLINE_BOUNDS.MAX_QUEUED_DRAFTS, 100);
  assert.strictEqual(OFFLINE_BOUNDS.RETENTION_HORIZON_HOURS, 72);
  assert.ok(OFFLINE_BOUNDS.PROHIBITED_OFFLINE_MUTATIONS.includes('APPROVE_CASE'));
  assert.ok(OFFLINE_BOUNDS.PROHIBITED_OFFLINE_MUTATIONS.includes('DISBURSE_FINANCE'));
});

test('SyncConflictRecordSchema and ResolutionSchema validate conflict lifecycle', () => {
  const conflictRecord = {
    conflictId: '80000000-0000-0000-0000-000000000001',
    entityTable: 'beneficiaries',
    entityId: '10000000-0000-0000-0000-000000000001',
    serverState: { phonePrimary: '+9647701111111', updated_at: '2026-11-13T10:00:00Z' },
    clientState: { phonePrimary: '+9647702222222', updated_at: '2026-11-13T09:00:00Z' },
    status: 'unresolved' as const,
  };
  assert.deepStrictEqual(SyncConflictRecordSchema.parse(conflictRecord), conflictRecord);

  // Resolution requires at least 10 chars notes
  const validResolution = {
    conflictId: '80000000-0000-0000-0000-000000000001',
    resolution: 'manual_merge' as const,
    mergedPayload: { phonePrimary: '+9647702222222' },
    resolutionNotes: 'Verified phone update with head of household directly',
  };
  assert.deepStrictEqual(
    SyncConflictResolutionRequestSchema.parse(validResolution),
    validResolution,
  );

  assert.throws(() =>
    SyncConflictResolutionRequestSchema.parse({
      ...validResolution,
      resolutionNotes: 'too short',
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

test('ProgrammeAssessmentSubmissionSchema validates scoring and sector matching', () => {
  const validAssessment = {
    caseId: '50000000-0000-0000-0000-000000000001',
    templateId: '60000000-0000-0000-0000-000000000001',
    programmeCode: 'FIN' as const,
    responses: { incomeIqd: 150000, shelterScore: 3 },
    computedScore: 82.5,
    assessedBy: '00000000-0000-0000-0000-000000000003',
    recommendedAssistanceType: 'emergency_mpca_cash',
    recommendedAmount: 250000,
  };

  assert.deepStrictEqual(
    ProgrammeAssessmentSubmissionSchema.parse(validAssessment),
    validAssessment,
  );

  // Score out of bounds must fail
  assert.throws(() =>
    ProgrammeAssessmentSubmissionSchema.parse({
      ...validAssessment,
      computedScore: 105,
    }),
  );
});

test('AssistanceDeliveryConfirmationSchema enforces positive delivery amount and verification', () => {
  const validDelivery = {
    entitlementId: '70000000-0000-0000-0000-000000000001',
    caseId: '50000000-0000-0000-0000-000000000001',
    deliveryReference: 'DELIV-2026-FOD-0001',
    recipientNationalId: '198512345678',
    quantityOrAmount: 1, // e.g. 1 food basket or cash unit
    deliveredBy: '00000000-0000-0000-0000-000000000003',
    verifiedByRecipient: true,
    verificationMethod: 'national_id_check' as const,
    deliveryNotes: 'Verified ID document and recipient signature',
  };

  assert.deepStrictEqual(AssistanceDeliveryConfirmationSchema.parse(validDelivery), validDelivery);

  // Zero or negative delivery amount must fail
  assert.throws(() =>
    AssistanceDeliveryConfirmationSchema.parse({
      ...validDelivery,
      quantityOrAmount: 0,
    }),
  );
});

test('ProgrammeFinancialLimitSchema enforces positive approval limits', () => {
  const validLimits = {
    programmeCode: 'FIN' as const,
    currency: 'IQD' as const,
    supervisorMaxLimit: 500000,
    managerMaxLimit: 2000000,
    isActive: true,
  };

  assert.deepStrictEqual(ProgrammeFinancialLimitSchema.parse(validLimits), validLimits);

  assert.throws(() =>
    ProgrammeFinancialLimitSchema.parse({
      ...validLimits,
      supervisorMaxLimit: -100,
    }),
  );
});

test('DocumentMetadataRegistrationSchema enforces opaque paths, allowed MIME types, and 10MB limit', () => {
  const validDoc = {
    beneficiaryId: '20000000-0000-0000-0000-000000000001',
    caseId: '50000000-0000-0000-0000-000000000001',
    documentCategory: 'national_id' as const,
    storagePath:
      'cases/50000000-0000-0000-0000-000000000001/doc-f47ac10b-58cc-4372-a567-0e02b2c3d479.pdf',
    fileNameOriginal: 'civil_id_scan.pdf',
    mimeType: 'application/pdf' as const,
    fileSizeBytes: 2048576, // 2MB
    checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  };

  assert.deepStrictEqual(DocumentMetadataRegistrationSchema.parse(validDoc), validDoc);

  // Directory traversal in storage path must fail
  assert.throws(() =>
    DocumentMetadataRegistrationSchema.parse({
      ...validDoc,
      storagePath: '../etc/passwd',
    }),
  );

  // Executable MIME type must fail
  assert.throws(() =>
    DocumentMetadataRegistrationSchema.parse({
      ...validDoc,
      mimeType: 'application/x-msdownload' as any,
    }),
  );

  // Oversized file (>10MB) must fail
  assert.throws(() =>
    DocumentMetadataRegistrationSchema.parse({
      ...validDoc,
      fileSizeBytes: 15 * 1024 * 1024,
    }),
  );
});

test('DocumentDownloadRequestSchema validates token expiry bounds', () => {
  const validReq = {
    documentId: '80000000-0000-0000-0000-000000000001',
    expiresInSeconds: 300,
  };
  assert.deepStrictEqual(DocumentDownloadRequestSchema.parse(validReq), validReq);

  // Expiration exceeding max (900s) must fail
  assert.throws(() =>
    DocumentDownloadRequestSchema.parse({
      ...validReq,
      expiresInSeconds: 3600,
    }),
  );
});

test('AppointmentScheduleSchema validates date/time and appointment bounds', () => {
  const validAppt = {
    caseId: '50000000-0000-0000-0000-000000000001',
    scheduledTime: '2026-11-15T10:00:00.000Z',
    locationType: 'coordination_center' as const,
    officerId: '00000000-0000-0000-0000-000000000003',
    notes: 'Legal verification consultation',
  };
  assert.deepStrictEqual(AppointmentScheduleSchema.parse(validAppt), validAppt);

  // Invalid date format must fail
  assert.throws(() =>
    AppointmentScheduleSchema.parse({
      ...validAppt,
      scheduledTime: 'not-a-datetime',
    }),
  );
});

test('OperationalReportFilterSchema enforces k-anonymity suppression and pagination', () => {
  const validFilter = {
    reportType: 'sector_distribution' as const,
    governorateId: 'IQ-BG',
    limit: 25,
    offset: 0,
    suppressionThreshold: 5,
  };
  assert.deepStrictEqual(OperationalReportFilterSchema.parse(validFilter), validFilter);

  // Page limit > 100 must fail
  assert.throws(() =>
    OperationalReportFilterSchema.parse({
      ...validFilter,
      limit: 500,
    }),
  );
});

test('ReportExportAuditSchema validates export audit records', () => {
  const validExport = {
    reportType: 'assistance_delivery',
    format: 'csv' as const,
    rowCount: 142,
    filters: { governorateId: 'IQ-NI', programmeCode: 'FIN' },
  };
  assert.deepStrictEqual(ReportExportAuditSchema.parse(validExport), validExport);
});

test('StaffRoleAssignmentSchema validates role assignment with mandatory 10+ char rationale', () => {
  const valid = {
    staffId: '00000000-0000-0000-0000-000000000003',
    role: 'supervisor' as const,
    rationale: 'Promotion to lead field operations in Mosul district',
    isActive: true,
  };
  assert.deepStrictEqual(StaffRoleAssignmentSchema.parse(valid), valid);

  // Short rationale (< 10 chars) must fail
  assert.throws(() =>
    StaffRoleAssignmentSchema.parse({
      ...valid,
      rationale: 'Too short',
    }),
  );
});

test('StaffRoleRevocationSchema validates role revocation with mandatory 10+ char rationale', () => {
  const valid = {
    staffId: '00000000-0000-0000-0000-000000000003',
    role: 'supervisor' as const,
    rationale: 'Temporary field supervisory rotation has concluded',
  };
  assert.deepStrictEqual(StaffRoleRevocationSchema.parse(valid), valid);
});

test('StaffScopeAssignmentSchema validates geographic and programme scope changes', () => {
  const valid = {
    staffId: '00000000-0000-0000-0000-000000000003',
    governorateId: 'IQ-BG',
    programmeCode: 'FOD' as const,
    rationale: 'Emergency food distribution campaign deployment in Baghdad',
  };
  assert.deepStrictEqual(StaffScopeAssignmentSchema.parse(valid), valid);
});

test('SecurityAuditAlertSchema validates categories and payload', () => {
  const validAlert = {
    eventCategory: 'security_violation' as const,
    actionName: 'UNAUTHORIZED_ACCESS_ATTEMPT',
    entityTable: 'finance_ledger',
    entityId: 'rec-001',
    details: { reason: 'Missing checker role on disbursement' },
  };
  assert.deepStrictEqual(SecurityAuditAlertSchema.parse(validAlert), validAlert);

  assert.throws(() =>
    SecurityAuditAlertSchema.parse({
      ...validAlert,
      eventCategory: 'invalid_category' as any,
    }),
  );
});

test('SensitiveReadAuditSchema enforces 5+ character access justification', () => {
  const validRead = {
    entityTable: 'beneficiaries',
    entityId: '20000000-0000-0000-0000-000000000001',
    accessReason: 'Protection case intake assessment preparation',
  };
  assert.deepStrictEqual(SensitiveReadAuditSchema.parse(validRead), validRead);

  // Short reason (< 5 chars) must fail
  assert.throws(() =>
    SensitiveReadAuditSchema.parse({
      ...validRead,
      accessReason: 'test',
    }),
  );
});

test('APPROVED_HUMANITARIAN_TERMS defines canonical bilingual dictionary', () => {
  assert.strictEqual(APPROVED_HUMANITARIAN_TERMS.informedConsent.ar, 'الموافقة المستنيرة الصريحة');
  assert.strictEqual(APPROVED_HUMANITARIAN_TERMS.informedConsent.en, 'Explicit Informed Consent');
  assert.strictEqual(APPROVED_HUMANITARIAN_TERMS.safeguarding.ar, 'صون وحماية الفئات المستضعفة');
  assert.strictEqual(
    APPROVED_HUMANITARIAN_TERMS.safeguarding.en,
    'Safeguarding & Heightened Protection',
  );
  assert.strictEqual(
    APPROVED_HUMANITARIAN_TERMS.duplicateReview.ar,
    'تدقيق تشابه القيود والازدواجية',
  );
  assert.strictEqual(APPROVED_HUMANITARIAN_TERMS.compensatingReversal.ar, 'قيد تسوية عكسي');
  assert.strictEqual(APPROVED_HUMANITARIAN_TERMS.legalHold.ar, 'تجميد قانوني تحفظي');
  assert.strictEqual(APPROVED_HUMANITARIAN_TERMS.doNoHarm.ar, 'عدم إلحاق الضرر');
  assert.strictEqual(APPROVED_HUMANITARIAN_TERMS.dataMinimization.ar, 'الحد الأدنى لجمع البيانات');
  assert.strictEqual(
    APPROVED_HUMANITARIAN_TERMS.immutableAudit.ar,
    'سجل التدقيق غير القابل للتعديل',
  );
});
