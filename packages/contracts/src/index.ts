import { z } from 'zod';

/**
 * Eight official humanitarian programmes supported by Humanity platform
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
 * Case lifecycle states
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
 * Supported UI locales
 */
export const SupportedLocaleSchema = z.enum(['ar', 'en']);
export type SupportedLocale = z.infer<typeof SupportedLocaleSchema>;

export interface GeographicScope {
  governorateCode: string;
  districtCode?: string;
  subDistrictCode?: string;
}

export interface UserContext {
  id: string;
  email: string;
  roles: SystemRole[];
  governorates: string[];
  programmes: ProgrammeCode[];
}
