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
