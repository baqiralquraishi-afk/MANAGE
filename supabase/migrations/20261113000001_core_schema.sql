-- Humanity Platform: Core PostgreSQL Schema Migration
-- Migration ID: 20261113000001_core_schema.sql
-- Invariants: Single unified backend, 3NF, additive, strict constraints, UTC timestamptz.

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Custom Enumerated Types
DO $$ BEGIN
  CREATE TYPE system_role AS ENUM (
    'intake',
    'caseworker',
    'supervisor',
    'programme_manager',
    'finance_maker',
    'finance_checker',
    'auditor',
    'report_viewer',
    'security_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE case_status AS ENUM (
    'draft',
    'submitted',
    'under_assessment',
    'pending_approval',
    'approved',
    'rejected',
    'active_delivery',
    'closed',
    'reopened'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Geographic Administrative Divisions (Iraq)
CREATE TABLE IF NOT EXISTS geo_governorates (
  id VARCHAR(10) PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS geo_districts (
  id VARCHAR(20) PRIMARY KEY,
  governorate_id VARCHAR(10) NOT NULL REFERENCES geo_governorates(id) ON DELETE RESTRICT,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. Staff Identity, Roles & Scopes
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name_ar TEXT NOT NULL,
  full_name_en TEXT NOT NULL,
  phone_number VARCHAR(32),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  role system_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_by UUID REFERENCES staff_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_staff_role UNIQUE (staff_id, role)
);

CREATE TABLE IF NOT EXISTS staff_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  governorate_id VARCHAR(10) REFERENCES geo_governorates(id) ON DELETE RESTRICT,
  programme_code VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 5. Programmes (8 Official Humanitarian Sectors)
CREATE TABLE IF NOT EXISTS programmes (
  code VARCHAR(10) PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 6. Beneficiaries & Deduplication Review
CREATE TABLE IF NOT EXISTS beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  national_id_type VARCHAR(32) NOT NULL,
  national_id_number VARCHAR(64) NOT NULL,
  full_name_ar TEXT NOT NULL,
  full_name_en TEXT,
  mother_name_ar TEXT,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(16) NOT NULL,
  phone_primary VARCHAR(32) NOT NULL,
  phone_secondary VARCHAR(32),
  governorate_id VARCHAR(10) NOT NULL REFERENCES geo_governorates(id) ON DELETE RESTRICT,
  district_id VARCHAR(20) NOT NULL REFERENCES geo_districts(id) ON DELETE RESTRICT,
  address_details TEXT NOT NULL,
  displacement_status VARCHAR(32) NOT NULL DEFAULT 'idp',
  vulnerability_flags TEXT[] NOT NULL DEFAULT '{}',
  is_safeguarded BOOLEAN NOT NULL DEFAULT false,
  duplicate_status VARCHAR(32) NOT NULL DEFAULT 'clean',
  primary_beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES staff_profiles(id)
);

CREATE TABLE IF NOT EXISTS duplicate_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT,
  matched_beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT,
  match_score NUMERIC(5,2) NOT NULL,
  match_reasons JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  decision_notes TEXT,
  decided_by UUID REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT chk_distinct_targets CHECK (target_beneficiary_id != matched_beneficiary_id)
);

-- 7. Households & Consents
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT,
  governorate_id VARCHAR(10) NOT NULL REFERENCES geo_governorates(id) ON DELETE RESTRICT,
  district_id VARCHAR(20) NOT NULL REFERENCES geo_districts(id) ON DELETE RESTRICT,
  shelter_type VARCHAR(50) NOT NULL DEFAULT 'rented_house',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT,
  relationship_to_head VARCHAR(32) NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  left_at TIMESTAMPTZ,
  CONSTRAINT uq_household_beneficiary_active UNIQUE (household_id, beneficiary_id)
);

CREATE TABLE IF NOT EXISTS beneficiary_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT,
  consent_version VARCHAR(16) NOT NULL DEFAULT 'v1.0-2026',
  language VARCHAR(8) NOT NULL DEFAULT 'ar',
  has_given_general_consent BOOLEAN NOT NULL,
  has_given_data_sharing_consent BOOLEAN NOT NULL DEFAULT false,
  recorded_by UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 8. Cases & Workflow Lifecycle
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_reference VARCHAR(32) NOT NULL UNIQUE,
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
  programme_code VARCHAR(10) NOT NULL REFERENCES programmes(code) ON DELETE RESTRICT,
  status case_status NOT NULL DEFAULT 'draft',
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  assigned_caseworker_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  governorate_id VARCHAR(10) NOT NULL REFERENCES geo_governorates(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  closed_at TIMESTAMPTZ,
  closure_reason TEXT
);

CREATE TABLE IF NOT EXISTS case_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  from_status case_status NOT NULL,
  to_status case_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 9. Assessments & Approvals
CREATE TABLE IF NOT EXISTS assessment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_code VARCHAR(10) NOT NULL REFERENCES programmes(code) ON DELETE RESTRICT,
  version INT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  schema_definition JSONB NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_programme_template_version UNIQUE (programme_code, version)
);

CREATE TABLE IF NOT EXISTS assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES assessment_templates(id) ON DELETE RESTRICT,
  responses JSONB NOT NULL,
  computed_score NUMERIC(6,2),
  assessed_by UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS case_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  approval_type VARCHAR(32) NOT NULL,
  maker_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  checker_id UUID REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  decided_at TIMESTAMPTZ,
  CONSTRAINT chk_maker_checker_distinct CHECK (checker_id IS NULL OR maker_id != checker_id)
);

-- 10. Assistance Entitlements & Immutable Financial Ledger
CREATE TABLE IF NOT EXISTS assistance_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  assistance_type VARCHAR(32) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'IQD',
  authorized_amount NUMERIC(14,2) NOT NULL CHECK (authorized_amount >= 0),
  disbursed_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (disbursed_amount >= 0),
  status VARCHAR(32) NOT NULL DEFAULT 'authorized',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS finance_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id UUID NOT NULL REFERENCES assistance_entitlements(id) ON DELETE RESTRICT,
  transaction_type VARCHAR(32) NOT NULL,
  transaction_reference VARCHAR(64) NOT NULL UNIQUE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'IQD',
  maker_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  checker_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  reversal_of_transaction_id UUID REFERENCES finance_ledger(id) ON DELETE RESTRICT,
  rationale TEXT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT chk_ledger_maker_checker CHECK (maker_id != checker_id)
);

-- Ledger Immutability Trigger: Prohibit direct UPDATE or DELETE on posted ledger records
CREATE OR REPLACE FUNCTION trg_prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ERR_LEDGER_IMMUTABLE: Posted financial transactions cannot be updated or deleted. Issue a reversal entry.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_finance_ledger_protect ON finance_ledger;
CREATE TRIGGER trg_finance_ledger_protect
  BEFORE UPDATE OR DELETE ON finance_ledger
  FOR EACH ROW
  EXECUTE FUNCTION trg_prevent_ledger_modification();

-- 11. Field Activities, Appointments & Private Documents
CREATE TABLE IF NOT EXISTS caseworker_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  caseworker_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  visit_date DATE NOT NULL,
  gps_latitude NUMERIC(9,6),
  gps_longitude NUMERIC(9,6),
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  scheduled_time TIMESTAMPTZ NOT NULL,
  location_type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
  officer_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS document_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  document_category VARCHAR(32) NOT NULL,
  storage_bucket VARCHAR(64) NOT NULL DEFAULT 'documents-private',
  storage_path TEXT NOT NULL UNIQUE,
  file_name_original TEXT NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes <= 20971520),
  uploaded_by UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 12. Security Audit Trail (Append-Only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  actor_role VARCHAR(50),
  event_category VARCHAR(32) NOT NULL,
  action_name VARCHAR(64) NOT NULL,
  entity_table VARCHAR(64) NOT NULL,
  entity_id TEXT,
  ip_address INET,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Audit Log Immutability Trigger: Prohibit UPDATE or DELETE on audit logs
CREATE OR REPLACE FUNCTION trg_prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ERR_AUDIT_IMMUTABLE: Security audit log entries cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_protect ON audit_logs;
CREATE TRIGGER trg_audit_logs_protect
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION trg_prevent_audit_modification();

-- 13. Offline Sync Ingest & Conflict Tracking
CREATE TABLE IF NOT EXISTS sync_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(64) NOT NULL UNIQUE,
  device_id VARCHAR(64) NOT NULL,
  caseworker_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  mutation_type VARCHAR(32) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  server_received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mutation_id UUID NOT NULL REFERENCES sync_mutations(id) ON DELETE CASCADE,
  entity_table VARCHAR(64) NOT NULL,
  entity_id UUID NOT NULL,
  server_state JSONB NOT NULL,
  client_state JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'unresolved',
  resolved_by UUID REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 14. Performance Indexes (Designed for 10k+ Beneficiaries & 100+ Staff)
CREATE INDEX IF NOT EXISTS idx_beneficiaries_name_ar_trgm ON beneficiaries USING gin (full_name_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_national_id ON beneficiaries (national_id_number);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_phone_primary ON beneficiaries (phone_primary);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_governorate ON beneficiaries (governorate_id, district_id);

CREATE INDEX IF NOT EXISTS idx_cases_scoped ON cases (governorate_id, programme_code, status);
CREATE INDEX IF NOT EXISTS idx_cases_worker ON cases (assigned_caseworker_id, status) WHERE assigned_caseworker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_beneficiary ON cases (beneficiary_id);

CREATE INDEX IF NOT EXISTS idx_household_members_active ON household_members (household_id, beneficiary_id) WHERE left_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_finance_ledger_entitlement ON finance_ledger (entitlement_id);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_ref ON finance_ledger (transaction_reference);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_posted_at ON finance_ledger (posted_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_date ON audit_logs (actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs (event_category, occurred_at DESC);
