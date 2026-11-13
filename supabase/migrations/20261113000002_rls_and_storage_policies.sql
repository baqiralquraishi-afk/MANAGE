-- Humanity Platform: Authentication, Roles, RLS and Storage Security Migration
-- Migration ID: 20261113000002_rls_and_storage_policies.sql
-- Invariants: Deny-by-default, least-privilege, server-resolved roles/scopes, immutable audit/finance.

-- 1. Helper Security Functions (SECURITY DEFINER, STABLE)
-- Resolves context directly from server-side tables, never trusting client JWT claims.

-- Ensure auth schema and auth.uid() function exist for portable execution
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Ensure standard Supabase roles exist
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.is_staff_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = p_user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role system_role)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.staff_roles sr
    JOIN public.staff_profiles sp ON sp.id = sr.staff_id
    WHERE sr.staff_id = p_user_id
      AND sr.role = p_role
      AND sr.is_active = true
      AND sp.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_any_role(p_user_id UUID, p_roles system_role[])
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.staff_roles sr
    JOIN public.staff_profiles sp ON sp.id = sr.staff_id
    WHERE sr.staff_id = p_user_id
      AND sr.role = ANY(p_roles)
      AND sr.is_active = true
      AND sp.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_governorate_access(p_user_id UUID, p_governorate_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  -- If staff has a scope record with NULL governorate_id, they have nationwide access.
  -- Otherwise, must match the specific governorate_id.
  RETURN EXISTS (
    SELECT 1 FROM public.staff_scopes ss
    JOIN public.staff_profiles sp ON sp.id = ss.staff_id
    WHERE ss.staff_id = p_user_id
      AND sp.is_active = true
      AND (ss.governorate_id IS NULL OR ss.governorate_id = p_governorate_id)
  ) OR EXISTS (
    -- National leadership/auditor/admin have default nationwide scope if active
    SELECT 1 FROM public.staff_roles sr
    WHERE sr.staff_id = p_user_id
      AND sr.role IN ('auditor', 'security_admin')
      AND sr.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_programme_access(p_user_id UUID, p_programme_code VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.staff_scopes ss
    JOIN public.staff_profiles sp ON sp.id = ss.staff_id
    WHERE ss.staff_id = p_user_id
      AND sp.is_active = true
      AND (ss.programme_code IS NULL OR ss.programme_code = p_programme_code)
  ) OR EXISTS (
    SELECT 1 FROM public.staff_roles sr
    WHERE sr.staff_id = p_user_id
      AND sr.role IN ('auditor', 'security_admin', 'intake')
      AND sr.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Enable & Force Row-Level Security on All Core Tables
ALTER TABLE geo_governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_governorates FORCE ROW LEVEL SECURITY;

ALTER TABLE geo_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_districts FORCE ROW LEVEL SECURITY;

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles FORCE ROW LEVEL SECURITY;

ALTER TABLE staff_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_scopes FORCE ROW LEVEL SECURITY;

ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE programmes FORCE ROW LEVEL SECURITY;

ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries FORCE ROW LEVEL SECURITY;

ALTER TABLE duplicate_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_reviews FORCE ROW LEVEL SECURITY;

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE households FORCE ROW LEVEL SECURITY;

ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members FORCE ROW LEVEL SECURITY;

ALTER TABLE beneficiary_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiary_consents FORCE ROW LEVEL SECURITY;

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases FORCE ROW LEVEL SECURITY;

ALTER TABLE case_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_status_history FORCE ROW LEVEL SECURITY;

ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_templates FORCE ROW LEVEL SECURITY;

ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_submissions FORCE ROW LEVEL SECURITY;

ALTER TABLE case_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_approvals FORCE ROW LEVEL SECURITY;

ALTER TABLE assistance_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistance_entitlements FORCE ROW LEVEL SECURITY;

ALTER TABLE finance_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_ledger FORCE ROW LEVEL SECURITY;

ALTER TABLE caseworker_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE caseworker_visits FORCE ROW LEVEL SECURITY;

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;

ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_metadata FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE sync_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_mutations FORCE ROW LEVEL SECURITY;

ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts FORCE ROW LEVEL SECURITY;

-- Grant baseline execution privileges to standard Supabase roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 3. Reference Tables Policies (Read-only for all active staff)
CREATE POLICY pol_governorates_select ON geo_governorates
  FOR SELECT TO authenticated
  USING (public.is_staff_active(auth.uid()));

CREATE POLICY pol_districts_select ON geo_districts
  FOR SELECT TO authenticated
  USING (public.is_staff_active(auth.uid()));

CREATE POLICY pol_programmes_select ON programmes
  FOR SELECT TO authenticated
  USING (public.is_staff_active(auth.uid()));

-- 4. Staff Profiles & Roles Policies
CREATE POLICY pol_staff_profiles_select ON staff_profiles
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND (
      id = auth.uid() OR
      public.has_any_role(auth.uid(), ARRAY['supervisor', 'programme_manager', 'auditor', 'security_admin']::system_role[])
    )
  );

CREATE POLICY pol_staff_profiles_admin_all ON staff_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'security_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'security_admin'));

CREATE POLICY pol_staff_roles_select ON staff_roles
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND (
      staff_id = auth.uid() OR
      public.has_any_role(auth.uid(), ARRAY['supervisor', 'programme_manager', 'auditor', 'security_admin']::system_role[])
    )
  );

CREATE POLICY pol_staff_roles_admin_all ON staff_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'security_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'security_admin'));

CREATE POLICY pol_staff_scopes_select ON staff_scopes
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND (
      staff_id = auth.uid() OR
      public.has_any_role(auth.uid(), ARRAY['supervisor', 'programme_manager', 'auditor', 'security_admin']::system_role[])
    )
  );

-- 5. Beneficiaries Policies
-- Select: Auditors see all; Supervisors/Intake within governorate; Caseworker for assigned or created cases; PM/Finance for active cases.
CREATE POLICY pol_beneficiaries_select ON beneficiaries
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND (
      public.has_role(auth.uid(), 'auditor') OR
      (public.has_any_role(auth.uid(), ARRAY['intake', 'supervisor']::system_role[]) AND public.has_governorate_access(auth.uid(), governorate_id)) OR
      (public.has_role(auth.uid(), 'caseworker') AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM cases c
          WHERE c.beneficiary_id = beneficiaries.id
            AND c.assigned_caseworker_id = auth.uid()
        )
      )) OR
      (public.has_any_role(auth.uid(), ARRAY['programme_manager', 'finance_maker', 'finance_checker']::system_role[]) AND EXISTS (
        SELECT 1 FROM cases c
        WHERE c.beneficiary_id = beneficiaries.id
          AND public.has_programme_access(auth.uid(), c.programme_code)
          AND public.has_governorate_access(auth.uid(), c.governorate_id)
      ))
    )
  );

CREATE POLICY pol_beneficiaries_insert ON beneficiaries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    created_by = auth.uid() AND
    public.has_any_role(auth.uid(), ARRAY['intake', 'caseworker', 'supervisor']::system_role[]) AND
    public.has_governorate_access(auth.uid(), governorate_id)
  );

CREATE POLICY pol_beneficiaries_update ON beneficiaries
  FOR UPDATE TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND (
      (public.has_role(auth.uid(), 'supervisor') AND public.has_governorate_access(auth.uid(), governorate_id)) OR
      (public.has_role(auth.uid(), 'intake') AND created_by = auth.uid() AND duplicate_status = 'clean') OR
      (public.has_role(auth.uid(), 'caseworker') AND EXISTS (
        SELECT 1 FROM cases c
        WHERE c.beneficiary_id = beneficiaries.id AND c.assigned_caseworker_id = auth.uid()
      ))
    )
  )
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    public.has_governorate_access(auth.uid(), governorate_id)
  );

-- 6. Duplicate Reviews Policies
CREATE POLICY pol_duplicate_reviews_select ON duplicate_reviews
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['supervisor', 'programme_manager', 'auditor', 'security_admin']::system_role[])
  );

CREATE POLICY pol_duplicate_reviews_update ON duplicate_reviews
  FOR UPDATE TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['supervisor', 'programme_manager']::system_role[])
  )
  WITH CHECK (
    decided_by = auth.uid() AND
    status IN ('confirmed_duplicate', 'marked_distinct')
  );

-- 7. Households & Consents Policies
CREATE POLICY pol_households_select ON households
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND (
      public.has_role(auth.uid(), 'auditor') OR
      public.has_governorate_access(auth.uid(), governorate_id)
    )
  );

CREATE POLICY pol_households_insert ON households
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['intake', 'caseworker', 'supervisor']::system_role[]) AND
    public.has_governorate_access(auth.uid(), governorate_id)
  );

CREATE POLICY pol_household_members_select ON household_members
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND EXISTS (
      SELECT 1 FROM households h
      WHERE h.id = household_members.household_id
        AND (public.has_role(auth.uid(), 'auditor') OR public.has_governorate_access(auth.uid(), h.governorate_id))
    )
  );

CREATE POLICY pol_household_members_insert ON household_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['intake', 'caseworker', 'supervisor']::system_role[])
  );

CREATE POLICY pol_beneficiary_consents_select ON beneficiary_consents
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = beneficiary_consents.beneficiary_id
        AND (public.has_role(auth.uid(), 'auditor') OR public.has_governorate_access(auth.uid(), b.governorate_id))
    )
  );

CREATE POLICY pol_beneficiary_consents_insert ON beneficiary_consents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    recorded_by = auth.uid() AND
    public.has_any_role(auth.uid(), ARRAY['intake', 'caseworker', 'supervisor']::system_role[])
  );

-- 8. Cases Policies
CREATE POLICY pol_cases_select ON cases
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND (
      public.has_role(auth.uid(), 'auditor') OR
      (public.has_role(auth.uid(), 'caseworker') AND (assigned_caseworker_id = auth.uid() OR created_by = auth.uid())) OR
      (public.has_role(auth.uid(), 'supervisor') AND public.has_governorate_access(auth.uid(), governorate_id)) OR
      (public.has_role(auth.uid(), 'programme_manager') AND public.has_programme_access(auth.uid(), programme_code)) OR
      (public.has_any_role(auth.uid(), ARRAY['finance_maker', 'finance_checker']::system_role[]) AND status IN ('approved', 'active_delivery', 'closed'))
    )
  );

CREATE POLICY pol_cases_insert ON cases
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    created_by = auth.uid() AND
    public.has_any_role(auth.uid(), ARRAY['caseworker', 'supervisor']::system_role[]) AND
    public.has_governorate_access(auth.uid(), governorate_id) AND
    public.has_programme_access(auth.uid(), programme_code)
  );

CREATE POLICY pol_cases_update ON cases
  FOR UPDATE TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND (
      (public.has_role(auth.uid(), 'caseworker') AND assigned_caseworker_id = auth.uid()) OR
      (public.has_role(auth.uid(), 'supervisor') AND public.has_governorate_access(auth.uid(), governorate_id)) OR
      (public.has_role(auth.uid(), 'programme_manager') AND public.has_programme_access(auth.uid(), programme_code))
    )
  )
  WITH CHECK (
    -- Caseworkers CANNOT self-approve cases directly
    (NOT public.has_role(auth.uid(), 'caseworker') OR (status NOT IN ('approved', 'rejected')))
  );

CREATE POLICY pol_case_status_history_select ON case_status_history
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_status_history.case_id
    )
  );

CREATE POLICY pol_case_status_history_insert ON case_status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    changed_by = auth.uid()
  );

-- 9. Assessments & Approvals Policies
CREATE POLICY pol_assessment_templates_select ON assessment_templates
  FOR SELECT TO authenticated
  USING (public.is_staff_active(auth.uid()));

CREATE POLICY pol_assessment_templates_admin ON assessment_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'programme_manager') AND public.has_programme_access(auth.uid(), programme_code))
  WITH CHECK (public.has_role(auth.uid(), 'programme_manager') AND public.has_programme_access(auth.uid(), programme_code));

CREATE POLICY pol_assessment_submissions_select ON assessment_submissions
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = assessment_submissions.case_id
    )
  );

CREATE POLICY pol_assessment_submissions_insert ON assessment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    assessed_by = auth.uid() AND
    public.has_any_role(auth.uid(), ARRAY['caseworker', 'supervisor']::system_role[])
  );

CREATE POLICY pol_case_approvals_select ON case_approvals
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_approvals.case_id
    )
  );

CREATE POLICY pol_case_approvals_insert ON case_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    maker_id = auth.uid() AND
    public.has_any_role(auth.uid(), ARRAY['caseworker', 'supervisor', 'programme_manager']::system_role[])
  );

CREATE POLICY pol_case_approvals_update ON case_approvals
  FOR UPDATE TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['supervisor', 'programme_manager']::system_role[]) AND
    maker_id != auth.uid() -- Strict Maker-Checker constraint
  )
  WITH CHECK (
    checker_id = auth.uid() AND
    status IN ('approved', 'rejected')
  );

-- 10. Financial Assistance & Immutable Ledger Policies
CREATE POLICY pol_assistance_entitlements_select ON assistance_entitlements
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = assistance_entitlements.case_id
    )
  );

CREATE POLICY pol_assistance_entitlements_insert ON assistance_entitlements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['supervisor', 'programme_manager', 'finance_maker']::system_role[])
  );

CREATE POLICY pol_finance_ledger_select ON finance_ledger
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['finance_maker', 'finance_checker', 'auditor']::system_role[])
  );

CREATE POLICY pol_finance_ledger_insert ON finance_ledger
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['finance_maker', 'finance_checker']::system_role[]) AND
    maker_id != checker_id
  );

-- Direct UPDATE or DELETE on finance_ledger is completely rejected
-- (Protected by both RLS absence of policy and trigger trg_prevent_ledger_modification)

-- 11. Activities, Appointments & Private Documents Policies
CREATE POLICY pol_caseworker_visits_select ON caseworker_visits
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = caseworker_visits.case_id
    )
  );

CREATE POLICY pol_caseworker_visits_insert ON caseworker_visits
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    caseworker_id = auth.uid() AND
    public.has_any_role(auth.uid(), ARRAY['caseworker', 'supervisor']::system_role[])
  );

CREATE POLICY pol_appointments_select ON appointments
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = appointments.case_id
    )
  );

CREATE POLICY pol_appointments_all ON appointments
  FOR ALL TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['caseworker', 'supervisor', 'intake']::system_role[])
  )
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['caseworker', 'supervisor', 'intake']::system_role[])
  );

CREATE POLICY pol_document_metadata_select ON document_metadata
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND (
      public.has_role(auth.uid(), 'auditor') OR
      EXISTS (
        SELECT 1 FROM beneficiaries b
        WHERE b.id = document_metadata.beneficiary_id
          AND public.has_governorate_access(auth.uid(), b.governorate_id)
      )
    )
  );

CREATE POLICY pol_document_metadata_insert ON document_metadata
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    uploaded_by = auth.uid() AND
    public.has_any_role(auth.uid(), ARRAY['intake', 'caseworker', 'supervisor']::system_role[])
  );

-- 12. Security Audit Logs Policies
-- Read-only for Auditor and Security Admin
CREATE POLICY pol_audit_logs_select ON audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['auditor', 'security_admin']::system_role[])
  );

-- Insert permitted for authenticated events
CREATE POLICY pol_audit_logs_insert ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id IS NULL OR actor_id = auth.uid()
  );

-- 13. Sync Mutations & Conflicts Policies
CREATE POLICY pol_sync_mutations_select ON sync_mutations
  FOR SELECT TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND (
      caseworker_id = auth.uid() OR
      public.has_any_role(auth.uid(), ARRAY['supervisor', 'security_admin']::system_role[])
    )
  );

CREATE POLICY pol_sync_mutations_insert ON sync_mutations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    caseworker_id = auth.uid() AND
    public.has_role(auth.uid(), 'caseworker')
  );

CREATE POLICY pol_sync_conflicts_all ON sync_conflicts
  FOR ALL TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['supervisor', 'security_admin']::system_role[])
  )
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['supervisor', 'security_admin']::system_role[])
  );

-- 14. Private Document Storage Configuration (Supabase Storage Schema)
-- Ensures storage bucket 'documents-private' is private, and access is enforced against document_metadata
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'documents-private',
      'documents-private',
      false,
      20971520, -- 20MB
      ARRAY['application/pdf', 'image/jpeg', 'image/png']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = false,
      file_size_limit = 20971520;
  END IF;
END $$;
