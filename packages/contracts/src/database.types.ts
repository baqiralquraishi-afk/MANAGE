/**
 * Humanity Platform - Generated Supabase Database Types
 * Generated from PostgreSQL 15 schema migrations (source of truth).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SystemRole =
  | 'intake'
  | 'caseworker'
  | 'supervisor'
  | 'programme_manager'
  | 'finance_maker'
  | 'finance_checker'
  | 'auditor'
  | 'report_viewer'
  | 'security_admin';

export type CaseStatus =
  | 'draft'
  | 'submitted'
  | 'under_assessment'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'active_delivery'
  | 'closed'
  | 'reopened';

export interface Database {
  public: {
    Tables: {
      geo_governorates: {
        Row: {
          id: string;
          name_ar: string;
          name_en: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name_ar: string;
          name_en: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name_ar?: string;
          name_en?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      geo_districts: {
        Row: {
          id: string;
          governorate_id: string;
          name_ar: string;
          name_en: string;
          created_at: string;
        };
        Insert: {
          id: string;
          governorate_id: string;
          name_ar: string;
          name_en: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          governorate_id?: string;
          name_ar?: string;
          name_en?: string;
          created_at?: string;
        };
      };
      staff_profiles: {
        Row: {
          id: string;
          email: string;
          full_name_ar: string;
          full_name_en: string;
          phone_number: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name_ar: string;
          full_name_en: string;
          phone_number?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name_ar?: string;
          full_name_en?: string;
          phone_number?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      staff_roles: {
        Row: {
          id: string;
          staff_id: string;
          role: SystemRole;
          is_active: boolean;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          role: SystemRole;
          is_active?: boolean;
          assigned_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          role?: SystemRole;
          is_active?: boolean;
          assigned_by?: string | null;
          created_at?: string;
        };
      };
      staff_scopes: {
        Row: {
          id: string;
          staff_id: string;
          governorate_id: string | null;
          programme_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          governorate_id?: string | null;
          programme_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          governorate_id?: string | null;
          programme_code?: string | null;
          created_at?: string;
        };
      };
      programmes: {
        Row: {
          code: string;
          name_ar: string;
          name_en: string;
          description_ar: string;
          description_en: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          code: string;
          name_ar: string;
          name_en: string;
          description_ar: string;
          description_en: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          code?: string;
          name_ar?: string;
          name_en?: string;
          description_ar?: string;
          description_en?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      beneficiaries: {
        Row: {
          id: string;
          national_id_type: string;
          national_id_number: string;
          full_name_ar: string;
          full_name_en: string | null;
          mother_name_ar: string | null;
          date_of_birth: string;
          gender: string;
          phone_primary: string;
          phone_secondary: string | null;
          governorate_id: string;
          district_id: string;
          address_details: string;
          displacement_status: string;
          vulnerability_flags: string[];
          is_safeguarded: boolean;
          duplicate_status: string;
          primary_beneficiary_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          national_id_type: string;
          national_id_number: string;
          full_name_ar: string;
          full_name_en?: string | null;
          mother_name_ar?: string | null;
          date_of_birth: string;
          gender: string;
          phone_primary: string;
          phone_secondary?: string | null;
          governorate_id: string;
          district_id: string;
          address_details: string;
          displacement_status?: string;
          vulnerability_flags?: string[];
          is_safeguarded?: boolean;
          duplicate_status?: string;
          primary_beneficiary_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: {
          id?: string;
          national_id_type?: string;
          national_id_number?: string;
          full_name_ar?: string;
          full_name_en?: string | null;
          mother_name_ar?: string | null;
          date_of_birth?: string;
          gender?: string;
          phone_primary?: string;
          phone_secondary?: string | null;
          governorate_id?: string;
          district_id?: string;
          address_details?: string;
          displacement_status?: string;
          vulnerability_flags?: string[];
          is_safeguarded?: boolean;
          duplicate_status?: string;
          primary_beneficiary_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
      };
      cases: {
        Row: {
          id: string;
          case_reference: string;
          beneficiary_id: string;
          household_id: string;
          programme_code: string;
          status: CaseStatus;
          priority: string;
          assigned_caseworker_id: string | null;
          governorate_id: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          closed_at: string | null;
          closure_reason: string | null;
        };
        Insert: {
          id?: string;
          case_reference: string;
          beneficiary_id: string;
          household_id: string;
          programme_code: string;
          status?: CaseStatus;
          priority?: string;
          assigned_caseworker_id?: string | null;
          governorate_id: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          closed_at?: string | null;
          closure_reason?: string | null;
        };
        Update: {
          id?: string;
          case_reference?: string;
          beneficiary_id?: string;
          household_id?: string;
          programme_code?: string;
          status?: CaseStatus;
          priority?: string;
          assigned_caseworker_id?: string | null;
          governorate_id?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          closed_at?: string | null;
          closure_reason?: string | null;
        };
      };
      finance_ledger: {
        Row: {
          id: string;
          entitlement_id: string;
          transaction_type: string;
          transaction_reference: string;
          amount: number;
          currency: string;
          maker_id: string;
          checker_id: string;
          reversal_of_transaction_id: string | null;
          rationale: string;
          posted_at: string;
        };
        Insert: {
          id?: string;
          entitlement_id: string;
          transaction_type: string;
          transaction_reference: string;
          amount: number;
          currency?: string;
          maker_id: string;
          checker_id: string;
          reversal_of_transaction_id?: string | null;
          rationale: string;
          posted_at?: string;
        };
        Update: never; // Immutable!
      };
      audit_logs: {
        Row: {
          id: number;
          event_uuid: string;
          actor_id: string | null;
          actor_role: string | null;
          event_category: string;
          action_name: string;
          entity_table: string;
          entity_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          details: Json;
          occurred_at: string;
        };
        Insert: {
          event_uuid?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          event_category: string;
          action_name: string;
          entity_table: string;
          entity_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          details?: Json;
          occurred_at?: string;
        };
        Update: never; // Immutable!
      };
    };
    Functions: {
      workflow_transition_case: {
        Args: {
          p_case_id: string;
          p_to_status: CaseStatus;
          p_justification: string;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      workflow_maker_checker_approve: {
        Args: {
          p_approval_id: string;
          p_decision: string;
          p_comments: string;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      workflow_disburse_finance: {
        Args: {
          p_entitlement_id: string;
          p_tx_reference: string;
          p_amount: number;
          p_currency: string;
          p_maker_id: string;
          p_rationale: string;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      workflow_reverse_finance: {
        Args: {
          p_original_tx_id: string;
          p_reversal_type: string;
          p_rationale: string;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      workflow_ingest_sync_mutation: {
        Args: {
          p_idempotency_key: string;
          p_device_id: string;
          p_mutation_type: string;
          p_payload: Json;
        };
        Returns: Json;
      };
    };
  };
}
