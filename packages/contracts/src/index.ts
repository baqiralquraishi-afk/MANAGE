import { z } from 'zod';

/**
 * Eight official humanitarian programmes supported by Humanity platform (Iraq)
 */
export const ProgrammeCodeSchema = z.enum([
  'FIN', // Financial Assistance
  'FOD', // Food Security & Nutrition
  'MED', // Medical & Health Support
  'HOU', // Housing & Shelter
  'EDU', // Education & Child Support
  'EMG', // Emergency Assistance
  'EMP', // Employment & Livelihoods
  'SOC', // Social & Legal Services
]);
export type ProgrammeCode = z.infer<typeof ProgrammeCodeSchema>;

/**
 * System roles enforcing segregation of duties and least-privilege RBAC
 */
export const SystemRoleSchema = z.enum([
  'intake',
  'caseworker',
  'supervisor',
  'programme_manager',
  'finance_maker',
  'finance_checker',
  'auditor',
  'report_viewer',
  'security_admin',
]);
export type SystemRole = z.infer<typeof SystemRoleSchema>;

/**
 * Deterministic Case Lifecycle States
 */
export const CaseStatusSchema = z.enum([
  'draft',
  'submitted',
  'under_assessment',
  'pending_approval',
  'approved',
  'rejected',
  'active_delivery',
  'closed',
  'reopened',
]);
export type CaseStatus = z.infer<typeof CaseStatusSchema>;

/**
 * Allowed transitions mapping in the Finite State Machine
 */
export const VALID_CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  draft: ['submitted'],
  submitted: ['under_assessment'],
  under_assessment: ['pending_approval', 'draft'],
  pending_approval: ['approved', 'rejected'],
  approved: ['active_delivery', 'closed'],
  rejected: ['reopened', 'closed'],
  active_delivery: ['closed'],
  closed: ['reopened'],
  reopened: ['under_assessment', 'pending_approval'],
};

/**
 * Supported UI Locales
 */
export const SupportedLocaleSchema = z.enum(['ar', 'en']);
export type SupportedLocale = z.infer<typeof SupportedLocaleSchema>;

/**
 * Case Status Transition Contract
 */
export const CaseTransitionContractSchema = z.object({
  caseId: z.string().uuid(),
  toStatus: CaseStatusSchema,
  justification: z.string().min(5, 'Justification must be at least 5 characters'),
  idempotencyKey: z.string().min(16).max(64),
});
export type CaseTransitionContract = z.infer<typeof CaseTransitionContractSchema>;

/**
 * Maker-Checker Dual Authorization Contract
 */
export const MakerCheckerApprovalContractSchema = z.object({
  caseId: z.string().uuid(),
  approvalType: z.enum(['programme_eligibility', 'financial_disbursement', 'special_exception']),
  makerId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().min(3, 'Comments are required for audit trail'),
  idempotencyKey: z.string().min(16).max(64),
});
export type MakerCheckerApprovalContract = z.infer<typeof MakerCheckerApprovalContractSchema>;

/**
 * Financial Disbursement Contract
 */
export const FinancialDisbursementContractSchema = z.object({
  entitlementId: z.string().uuid(),
  transactionReference: z.string().min(4).max(64),
  amount: z.number().positive('Disbursement amount must be greater than zero'),
  currency: z.enum(['IQD', 'USD']).default('IQD'),
  makerId: z.string().uuid(),
  rationale: z.string().min(5, 'Disbursement rationale is mandatory'),
  idempotencyKey: z.string().min(16).max(64),
});
export type FinancialDisbursementContract = z.infer<typeof FinancialDisbursementContractSchema>;

/**
 * Financial Reversal Contract
 */
export const FinancialReversalContractSchema = z.object({
  originalTransactionId: z.string().uuid(),
  reversalType: z.enum(['reversal_credit', 'reversal_debit']),
  rationale: z.string().min(10, 'Reversal requires detailed audit justification'),
  idempotencyKey: z.string().min(16).max(64),
});
export type FinancialReversalContract = z.infer<typeof FinancialReversalContractSchema>;

/**
 * Offline Sync Mutation Contract
 */
export const SyncMutationContractSchema = z.object({
  idempotencyKey: z.string().min(16).max(64),
  deviceId: z.string().min(8).max(64),
  mutationType: z.enum(['CREATE_DRAFT', 'SUBMIT_ASSESSMENT', 'LOG_VISIT', 'UPDATE_APPOINTMENT']),
  clientTimestamp: z.string().datetime(),
  payload: z.record(z.any()),
});
export type SyncMutationContract = z.infer<typeof SyncMutationContractSchema>;

/**
 * Deterministic Sync Mutation States
 */
export const SyncMutationStateSchema = z.enum([
  'queued',
  'sent',
  'accepted',
  'rejected',
  'conflict',
]);
export type SyncMutationState = z.infer<typeof SyncMutationStateSchema>;

/**
 * Offline Permitted vs Prohibited Mutation Types
 */
export const PermittedOfflineMutationTypeSchema = z.enum([
  'CREATE_DRAFT',
  'SUBMIT_ASSESSMENT',
  'LOG_VISIT',
  'UPDATE_APPOINTMENT',
  'REGISTER_BENEFICIARY',
  'LOG_CASE_NOTE',
  'RECORD_CONSENT',
]);
export type PermittedOfflineMutationType = z.infer<typeof PermittedOfflineMutationTypeSchema>;

export const ProhibitedOfflineMutationTypeSchema = z.enum([
  'APPROVE_CASE',
  'REJECT_CASE',
  'APPROVE_FINANCE',
  'DISBURSE_FINANCE',
  'POST_LEDGER_ENTRY',
  'RELEASE_PAYMENT',
]);
export type ProhibitedOfflineMutationType = z.infer<typeof ProhibitedOfflineMutationTypeSchema>;

/**
 * Offline Storage Bounded Configuration (ADR-003)
 */
export const OFFLINE_BOUNDS = {
  MAX_ASSIGNED_CASES: 50,
  MAX_QUEUED_DRAFTS: 100,
  RETENTION_HORIZON_HOURS: 72,
  PROHIBITED_OFFLINE_MUTATIONS: [
    'APPROVE_CASE',
    'REJECT_CASE',
    'APPROVE_FINANCE',
    'DISBURSE_FINANCE',
    'POST_LEDGER_ENTRY',
    'RELEASE_PAYMENT',
  ] as const,
} as const;

/**
 * Versioned Offline Draft Mutation Schema
 */
export const OfflineDraftMutationSchema = z.object({
  idempotencyKey: z.string().min(16).max(64),
  schemaVersion: z.number().int().min(1).default(1),
  deviceId: z.string().min(8).max(64),
  caseworkerId: z.string().uuid(),
  mutationType: PermittedOfflineMutationTypeSchema,
  entityTable: z.string().min(1).max(64),
  entityId: z.string().uuid().optional(),
  payload: z.record(z.any()),
  baseServerVersion: z.number().int().nonnegative().default(0),
  state: SyncMutationStateSchema.default('queued'),
  errorMessage: z.string().optional(),
  createdAt: z.string().datetime().optional(),
});
export type OfflineDraftMutation = z.infer<typeof OfflineDraftMutationSchema>;

/**
 * Sync Conflict Status & Schemas
 */
export const SyncConflictStatusSchema = z.enum([
  'unresolved',
  'resolved_server',
  'resolved_client',
  'resolved_merged',
]);
export type SyncConflictStatus = z.infer<typeof SyncConflictStatusSchema>;

export const SyncConflictRecordSchema = z.object({
  conflictId: z.string().uuid(),
  mutationId: z.string().uuid().optional(),
  entityTable: z.string().min(1).max(64),
  entityId: z.string().uuid(),
  serverState: z.record(z.any()),
  clientState: z.record(z.any()),
  status: SyncConflictStatusSchema.default('unresolved'),
  detectedAt: z.string().datetime().optional(),
  resolvedBy: z.string().uuid().optional(),
  resolvedAt: z.string().datetime().optional(),
  resolutionNotes: z.string().optional(),
});
export type SyncConflictRecord = z.infer<typeof SyncConflictRecordSchema>;

export const SyncConflictResolutionRequestSchema = z.object({
  conflictId: z.string().uuid(),
  resolution: z.enum(['use_server', 'use_client', 'manual_merge']),
  mergedPayload: z.record(z.any()).optional(),
  resolutionNotes: z
    .string()
    .min(10, 'Resolution notes must be at least 10 characters for audit compliance'),
});
export type SyncConflictResolutionRequest = z.infer<typeof SyncConflictResolutionRequestSchema>;

/**
 * Beneficiary Consent Capture Schema
 */
export const ConsentCaptureSchema = z.object({
  hasGivenGeneralConsent: z.literal(true, {
    errorMap: () => ({
      message: 'Informed general consent is strictly mandatory for beneficiary registration',
    }),
  }),
  hasGivenDataSharingConsent: z.boolean().default(false),
  consentVersion: z.string().default('v1.0-2026'),
  language: SupportedLocaleSchema.default('ar'),
});
export type ConsentCapture = z.infer<typeof ConsentCaptureSchema>;

/**
 * Beneficiary Registration Schema
 */
export const BeneficiaryRegistrationSchema = z.object({
  nationalIdType: z.enum(['national_unified_card', 'civil_id', 'passport', 'temporary_residence']),
  nationalIdNumber: z.string().min(5).max(64),
  fullNameAr: z.string().min(3, 'Full name in Arabic is required'),
  fullNameEn: z.string().optional().nullable(),
  motherNameAr: z.string().min(2, "Mother's name is required for identity verification"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  gender: z.enum(['male', 'female']),
  phonePrimary: z.string().min(8).max(32),
  phoneSecondary: z.string().max(32).optional().nullable(),
  governorateId: z.string().min(2).max(10),
  districtId: z.string().min(2).max(20),
  addressDetails: z.string().min(5),
  displacementStatus: z.enum(['idp', 'refugee', 'returnee', 'host_community']),
  vulnerabilityFlags: z.array(z.string()).default([]),
  consent: ConsentCaptureSchema,
});
export type BeneficiaryRegistration = z.infer<typeof BeneficiaryRegistrationSchema>;

/**
 * Household Creation & Membership Schema
 */
export const HouseholdCreationSchema = z.object({
  headBeneficiaryId: z.string().uuid(),
  governorateId: z.string().min(2).max(10),
  districtId: z.string().min(2).max(20),
  shelterType: z.enum([
    'owned_house',
    'rented_house',
    'informal_settlement',
    'camp_tent',
    'host_family',
  ]),
  members: z
    .array(
      z.object({
        beneficiaryId: z.string().uuid(),
        relationshipToHead: z.enum([
          'head',
          'spouse',
          'son',
          'daughter',
          'parent',
          'sibling',
          'other_relative',
        ]),
      }),
    )
    .default([]),
});
export type HouseholdCreation = z.infer<typeof HouseholdCreationSchema>;

/**
 * Human Duplicate Review Decision Schema
 * Note: Automated merging is strictly prohibited by policy. Human review required.
 */
export const DuplicateReviewDecisionSchema = z.object({
  duplicateReviewId: z.string().uuid(),
  decision: z.enum(['confirmed_duplicate', 'dismissed_false_positive']),
  decisionNotes: z.string().min(10, 'Decision justification must be at least 10 characters'),
  primaryBeneficiaryId: z.string().uuid().optional(),
});
export type DuplicateReviewDecision = z.infer<typeof DuplicateReviewDecisionSchema>;

/**
 * Case Creation Schema
 */
export const CaseCreationSchema = z.object({
  beneficiaryId: z.string().uuid(),
  householdId: z.string().uuid(),
  programmeCode: ProgrammeCodeSchema,
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  governorateId: z.string().min(2).max(10),
  assignedCaseworkerId: z.string().uuid().optional().nullable(),
  initialNotes: z.string().optional().nullable(),
});
export type CaseCreation = z.infer<typeof CaseCreationSchema>;

/**
 * Case Activity Logging Schema
 */
export const CaseActivityLogSchema = z.object({
  caseId: z.string().uuid(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Visit date must be YYYY-MM-DD'),
  gpsLatitude: z.number().min(-90).max(90).optional().nullable(),
  gpsLongitude: z.number().min(-180).max(180).optional().nullable(),
  notes: z.string().min(5, 'Visit notes must be at least 5 characters'),
});
export type CaseActivityLog = z.infer<typeof CaseActivityLogSchema>;

/**
 * Case Closure Schema
 */
export const CaseClosureSchema = z.object({
  caseId: z.string().uuid(),
  closureReason: z.string().min(10, 'Closure reason must be at least 10 characters'),
  justification: z.string().min(5, 'Closure justification must be at least 5 characters'),
});
export type CaseClosure = z.infer<typeof CaseClosureSchema>;

/**
 * Programme Assessment Submission Schema
 */
export const ProgrammeAssessmentSubmissionSchema = z.object({
  caseId: z.string().uuid(),
  templateId: z.string().uuid(),
  programmeCode: ProgrammeCodeSchema,
  responses: z.record(z.any()),
  computedScore: z.number().min(0).max(100),
  assessedBy: z.string().uuid(),
  recommendedAssistanceType: z.string().min(2),
  recommendedAmount: z.number().nonnegative(),
});
export type ProgrammeAssessmentSubmission = z.infer<typeof ProgrammeAssessmentSubmissionSchema>;

/**
 * Assistance Delivery Confirmation Schema
 */
export const AssistanceDeliveryConfirmationSchema = z.object({
  entitlementId: z.string().uuid(),
  caseId: z.string().uuid(),
  deliveryReference: z.string().min(6).max(64),
  recipientNationalId: z.string().min(5).max(64),
  quantityOrAmount: z.number().positive('Delivered quantity or amount must be positive'),
  deliveredBy: z.string().uuid(),
  verifiedByRecipient: z.boolean().default(true),
  verificationMethod: z.enum([
    'national_id_check',
    'biometric_token',
    'sms_otp_voucher',
    'signed_manifest',
  ]),
  deliveryNotes: z.string().optional(),
});
export type AssistanceDeliveryConfirmation = z.infer<typeof AssistanceDeliveryConfirmationSchema>;

/**
 * Programme Financial Policy Limits Schema
 */
export const ProgrammeFinancialLimitSchema = z.object({
  programmeCode: ProgrammeCodeSchema,
  currency: z.enum(['IQD', 'USD']).default('IQD'),
  supervisorMaxLimit: z.number().positive(),
  managerMaxLimit: z.number().positive(),
  isActive: z.boolean().default(true),
});
export type ProgrammeFinancialLimit = z.infer<typeof ProgrammeFinancialLimitSchema>;

/**
 * Supporting Modules Contracts (Phase 11)
 */

export const DocumentMetadataRegistrationSchema = z.object({
  beneficiaryId: z.string().uuid(),
  caseId: z.string().uuid().optional().nullable(),
  documentCategory: z.enum([
    'national_id',
    'residence_card',
    'medical_report',
    'socioeconomic_proof',
    'legal_power_of_attorney',
    'other',
  ]),
  storagePath: z
    .string()
    .min(5)
    .regex(/^[a-zA-Z0-9_\-\.\/]+$/, 'Must be an opaque storage path without directory traversal')
    .refine(p => !p.includes('..'), 'Directory traversal is strictly forbidden'),
  fileNameOriginal: z.string().min(1).max(255),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .max(10485760, 'Maximum allowed file size is 10MB (10,485,760 bytes)'),
  checksumSha256: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'Must be a 64-character SHA-256 hex string')
    .optional(),
});
export type DocumentMetadataRegistration = z.infer<typeof DocumentMetadataRegistrationSchema>;

export const DocumentDownloadRequestSchema = z.object({
  documentId: z.string().uuid(),
  expiresInSeconds: z.number().int().min(60).max(900).default(300),
});
export type DocumentDownloadRequest = z.infer<typeof DocumentDownloadRequestSchema>;

export const AppointmentScheduleSchema = z.object({
  caseId: z.string().uuid(),
  scheduledTime: z.string().datetime(),
  locationType: z.enum([
    'coordination_center',
    'field_office',
    'household_visit',
    'partner_facility',
    'mobile_clinic',
  ]),
  officerId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
});
export type AppointmentSchedule = z.infer<typeof AppointmentScheduleSchema>;

export const AppointmentStatusUpdateSchema = z.object({
  appointmentId: z.string().uuid(),
  status: z.enum(['completed', 'cancelled', 'no_show']),
  notes: z.string().max(1000).optional(),
});
export type AppointmentStatusUpdate = z.infer<typeof AppointmentStatusUpdateSchema>;

export const InAppNotificationSchema = z.object({
  recipientId: z.string().uuid(),
  titleAr: z.string().min(1),
  titleEn: z.string().min(1),
  messageAr: z.string().min(1),
  messageEn: z.string().min(1),
  category: z
    .enum([
      'system',
      'approval_required',
      'case_assigned',
      'document_access',
      'appointment',
      'finance',
    ])
    .default('system'),
  linkUrl: z.string().optional(),
});
export type InAppNotification = z.infer<typeof InAppNotificationSchema>;

export const OperationalReportFilterSchema = z.object({
  reportType: z.enum([
    'sector_distribution',
    'casework_velocity',
    'assistance_delivery',
    'vulnerability_summary',
  ]),
  governorateId: z.string().optional(),
  programmeCode: ProgrammeCodeSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  suppressionThreshold: z.number().int().default(5),
});
export type OperationalReportFilter = z.infer<typeof OperationalReportFilterSchema>;

export const ReportExportAuditSchema = z.object({
  reportType: z.string().min(1),
  format: z.enum(['csv', 'json', 'pdf']),
  rowCount: z.number().int().nonnegative(),
  filters: z.record(z.any()).optional(),
});
export type ReportExportAudit = z.infer<typeof ReportExportAuditSchema>;


/**
 * Phase 14: Staff Role & Scope Management Contracts (Audited & Segregated)
 */
export const StaffRoleAssignmentSchema = z.object({
  staffId: z.string().uuid(),
  role: SystemRoleSchema,
  rationale: z.string().min(10, 'Rationale must be at least 10 characters'),
  isActive: z.boolean().default(true),
});
export type StaffRoleAssignment = z.infer<typeof StaffRoleAssignmentSchema>;

export const StaffRoleRevocationSchema = z.object({
  staffId: z.string().uuid(),
  role: SystemRoleSchema,
  rationale: z.string().min(10, 'Rationale must be at least 10 characters'),
});
export type StaffRoleRevocation = z.infer<typeof StaffRoleRevocationSchema>;

export const StaffScopeAssignmentSchema = z.object({
  staffId: z.string().uuid(),
  governorateId: z.string().optional().nullable(),
  programmeCode: ProgrammeCodeSchema.optional().nullable(),
  rationale: z.string().min(10, 'Rationale must be at least 10 characters'),
});
export type StaffScopeAssignment = z.infer<typeof StaffScopeAssignmentSchema>;

export const SecurityAuditCategorySchema = z.enum([
  'access_control',
  'security_violation',
  'case_mutation',
  'document_access',
  'financial_transaction',
  'role_management',
]);
export type SecurityAuditCategory = z.infer<typeof SecurityAuditCategorySchema>;

export const SecurityAuditAlertSchema = z.object({
  eventCategory: SecurityAuditCategorySchema,
  actionName: z.string().min(3),
  entityTable: z.string().min(1),
  entityId: z.string().min(1),
  details: z.record(z.any()),
});
export type SecurityAuditAlert = z.infer<typeof SecurityAuditAlertSchema>;

export const SensitiveReadAuditSchema = z.object({
  entityTable: z.string().min(1),
  entityId: z.string().min(1),
  accessReason: z.string().min(5, 'Access reason must be at least 5 characters'),
});
export type SensitiveReadAudit = z.infer<typeof SensitiveReadAuditSchema>;

/**
 * Phase 14: Approved Canonical Humanitarian Terminology (Iraq Operations)
 * Standardized bilingual dictionary adhering to UN/IASC humanitarian coordination standards.
 * Do not invent informal translations for protection, consent, or financial controls.
 */
export const APPROVED_HUMANITARIAN_TERMS = {
  informedConsent: {
    ar: 'الموافقة المستنيرة الصريحة',
    en: 'Explicit Informed Consent',
    description:
      'Freely given, informed, and unambiguous agreement by the beneficiary or legal guardian',
  },
  safeguarding: {
    ar: 'صون وحماية الفئات المستضعفة',
    en: 'Safeguarding & Heightened Protection',
    description:
      'Protection of vulnerable persons, survivors of violence, children, and at-risk groups',
  },
  duplicateReview: {
    ar: 'تدقيق تشابه القيود والازدواجية',
    en: 'Duplicate Registration Review',
    description: 'Human-adjudicated review of potential duplicate registrations; never auto-merged',
  },
  compensatingReversal: {
    ar: 'قيد تسوية عكسي',
    en: 'Compensating Ledger Reversal',
    description:
      'Immutable corrective double-entry transaction without altering posted historical ledgers',
  },
  legalHold: {
    ar: 'تجميد قانوني تحفظي',
    en: 'Protective Legal Hold',
    description:
      'Suspension of record disposal or alteration due to active legal or compliance investigation',
  },
  doNoHarm: {
    ar: 'عدم إلحاق الضرر',
    en: 'Do No Harm Principle',
    description:
      'Humanitarian imperative preventing data exposure or action that could compromise recipient safety',
  },
  dataMinimization: {
    ar: 'الحد الأدنى لجمع البيانات',
    en: 'Data Minimization',
    description:
      'Restricting collection and retention to what is strictly necessary for assistance delivery',
  },
  makerChecker: {
    ar: 'إجراء التحضير والتدقيق الثنائي',
    en: 'Maker-Checker Approval',
    description:
      'Dual authorization control separating proposal creation from final release authorization',
  },
  immutableAudit: {
    ar: 'سجل التدقيق غير القابل للتعديل',
    en: 'Immutable Audit Trail',
    description:
      'Cryptographically protected, append-only historical log of critical system operations',
  },
} as const;



/**
 * Geographic Scope
 */
export interface GeographicScope {
  governorateCode: string;
  districtCode?: string;
  subDistrictCode?: string;
}

/**
 * Authenticated Staff User Context
 */
export interface UserContext {
  id: string;
  email: string;
  roles: SystemRole[];
  governorates: string[];
  programmes: ProgrammeCode[];
}

/**
 * Generated Database Types
 */
export * from './database.types.js';
