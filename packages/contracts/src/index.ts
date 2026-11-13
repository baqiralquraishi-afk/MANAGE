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
