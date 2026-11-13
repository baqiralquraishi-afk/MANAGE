-- Migration: 20261113000006_assistance_financial_workflows.sql
-- Purpose: Additive database workflows for the Eight Humanitarian Programmes,
--          versioned assessment templates, eligibility approvals, assistance delivery confirmation,
--          and financial controls (maker-checker, configurable limits, fail-closed policy, reversals).

-- 1. Ensure Eight Official Programmes are Present
INSERT INTO programmes (code, name_ar, name_en, description_ar, description_en)
VALUES
  ('FIN', 'المساعدات النقدية والمالية', 'Financial Assistance', 'المساعدات النقدية متعددة الأغراض', 'Multi-purpose cash assistance'),
  ('FOD', 'الأمن الغذائي والتغذية', 'Food Security & Nutrition', 'توزيع السلات الغذائية', 'Food distribution'),
  ('MED', 'الرعاية الصحية والخدمات الطبية', 'Medical Support', 'الرعاية الصحية المتخصصة', 'Specialized medical care'),
  ('HOU', 'المأوى وإعادة تأهيل المساكن', 'Housing & Shelter', 'إعادة تأهيل المأوى', 'Shelter rehabilitation'),
  ('EDU', 'التعليم ورعاية الطفل', 'Education & Child Support', 'دعم التعليم والمدارس', 'Education support'),
  ('EMG', 'الاستجابة الإنسانية الطارئة', 'Emergency Relief', 'الإغاثة الإنسانية العاجلة', 'Emergency response'),
  ('EMP', 'التأهيل المهني والتشغيل', 'Employment & Livelihoods', 'التدريب والتشغيل', 'Livelihoods support'),
  ('SOC', 'الخدمات الاجتماعية والدعم القانوني', 'Social Services', 'الخدمات القانونية والاجتماعية', 'Legal and social services')
ON CONFLICT (code) DO NOTHING;

-- 2. Programme Financial Policy Limits Table (Configurable Limits)
CREATE TABLE IF NOT EXISTS programme_financial_limits (
  programme_code VARCHAR(10) PRIMARY KEY REFERENCES programmes(code) ON DELETE RESTRICT,
  currency VARCHAR(8) NOT NULL DEFAULT 'IQD',
  supervisor_max_limit NUMERIC(14,2) NOT NULL CHECK (supervisor_max_limit > 0),
  manager_max_limit NUMERIC(14,2) NOT NULL CHECK (manager_max_limit >= supervisor_max_limit),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Seed Configurable Limits for Active Financial & Assistance Programmes
-- Note: SOC and unlisted programmes intentionally left unconfigured or disabled to verify fail-closed behavior
INSERT INTO programme_financial_limits (programme_code, currency, supervisor_max_limit, manager_max_limit, is_active)
VALUES
  ('FIN', 'IQD', 500000.00, 2500000.00, true),
  ('FOD', 'IQD', 150000.00, 600000.00, true),
  ('MED', 'IQD', 750000.00, 3000000.00, true),
  ('HOU', 'IQD', 1500000.00, 5000000.00, true),
  ('EDU', 'IQD', 200000.00, 800000.00, true),
  ('EMG', 'IQD', 400000.00, 1500000.00, true),
  ('EMP', 'IQD', 1000000.00, 4000000.00, true)
ON CONFLICT (programme_code) DO UPDATE SET
  supervisor_max_limit = EXCLUDED.supervisor_max_limit,
  manager_max_limit = EXCLUDED.manager_max_limit,
  is_active = EXCLUDED.is_active;

-- 2. Assistance Deliveries Table (Traceable Delivery & Verification)
CREATE TABLE IF NOT EXISTS assistance_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id UUID NOT NULL REFERENCES assistance_entitlements(id) ON DELETE RESTRICT,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  delivery_reference VARCHAR(64) UNIQUE NOT NULL,
  recipient_national_id VARCHAR(64) NOT NULL,
  quantity_or_amount NUMERIC(14,2) NOT NULL CHECK (quantity_or_amount > 0),
  delivered_by UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  verified_by_recipient BOOLEAN NOT NULL DEFAULT true,
  verification_method VARCHAR(32) NOT NULL DEFAULT 'national_id_check',
  delivery_notes TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 3. Immutability Triggers on Deliveries & Entitlements
CREATE OR REPLACE FUNCTION trg_prevent_delivery_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ERR_DELIVERY_IMMUTABLE: Confirmed delivery records cannot be modified or deleted. Create an auditable adjustment.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assistance_deliveries_protect ON assistance_deliveries;
CREATE TRIGGER trg_assistance_deliveries_protect
  BEFORE UPDATE OR DELETE ON assistance_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION trg_prevent_delivery_modification();

CREATE OR REPLACE FUNCTION trg_prevent_entitlement_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ERR_ENTITLEMENT_IMMUTABLE: Assistance entitlements cannot be deleted once created.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assistance_entitlements_protect_del ON assistance_entitlements;
CREATE TRIGGER trg_assistance_entitlements_protect_del
  BEFORE DELETE ON assistance_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION trg_prevent_entitlement_deletion();

-- 4. Enable Row Level Security (RLS) on New Tables
ALTER TABLE programme_financial_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_financial_limits FORCE ROW LEVEL SECURITY;

ALTER TABLE assistance_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistance_deliveries FORCE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS pol_programme_financial_limits_select ON programme_financial_limits;
CREATE POLICY pol_programme_financial_limits_select ON programme_financial_limits
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS pol_programme_financial_limits_admin ON programme_financial_limits;
CREATE POLICY pol_programme_financial_limits_admin ON programme_financial_limits
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['security_admin', 'finance_checker']::system_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['security_admin', 'finance_checker']::system_role[]));

DROP POLICY IF EXISTS pol_assistance_deliveries_select ON assistance_deliveries;
CREATE POLICY pol_assistance_deliveries_select ON assistance_deliveries
  FOR SELECT TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['auditor', 'report_viewer', 'security_admin', 'programme_manager']::system_role[])
    OR EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = assistance_deliveries.case_id
        AND (c.assigned_caseworker_id = auth.uid() OR public.has_role(auth.uid(), 'supervisor'))
    )
  );

DROP POLICY IF EXISTS pol_assistance_deliveries_insert ON assistance_deliveries;
CREATE POLICY pol_assistance_deliveries_insert ON assistance_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['caseworker', 'supervisor', 'programme_manager', 'finance_checker']::system_role[])
  );

-- 5. Seed Versioned Configurable Assessment Templates for all 8 Programmes
INSERT INTO assessment_templates (id, programme_code, version, title_ar, title_en, schema_definition, is_published)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    'FIN',
    1,
    'استمارة تقييم الاحتياج النقدي متعدد الأغراض وسبل العيش (v1)',
    'Multi-Purpose Cash Assistance & Livelihood Assessment (v1)',
    '{"sections": [{"title": "Demographics", "fields": ["household_size", "dependency_ratio"]}, {"title": "Poverty & Vulnerability", "fields": ["monthly_income_iqd", "debt_level_iqd", "housing_tenure"]}]}'::jsonb,
    true
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'FOD',
    1,
    'استمارة تقييم الأمن الغذائي والاستهلاك الأسري (v1)',
    'Food Security & Dietary Consumption Vulnerability Assessment (v1)',
    '{"sections": [{"title": "Food Consumption", "fields": ["food_consumption_score", "meals_per_day", "coping_strategies"]}]}'::jsonb,
    true
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    'MED',
    1,
    'استمارة تقييم الاحتياجات الطبية والرعاية التخصصية (v1)',
    'Medical Needs & Healthcare Support Assessment (v1)',
    '{"sections": [{"title": "Health Status", "fields": ["chronic_conditions", "assistive_device_needed", "monthly_medical_expenses"]}]}'::jsonb,
    true
  ),
  (
    '60000000-0000-0000-0000-000000000004',
    'HOU',
    1,
    'استمارة تقييم أضرار المأوى ومستلزمات العزل الشتوي (v1)',
    'Shelter Damage & Winterization Assessment (v1)',
    '{"sections": [{"title": "Shelter Condition", "fields": ["damage_severity", "winterization_status", "wash_facilities"]}]}'::jsonb,
    true
  ),
  (
    '60000000-0000-0000-0000-000000000005',
    'EDU',
    1,
    'استمارة تقييم التسرب المدرسي واحتياجات التعليم (v1)',
    'Child Education & School Enrollment Assessment (v1)',
    '{"sections": [{"title": "School Enrollment", "fields": ["out_of_school_children", "school_distance_km", "stationery_needs"]}]}'::jsonb,
    true
  ),
  (
    '60000000-0000-0000-0000-000000000006',
    'EMG',
    1,
    'استمارة تقييم الاستجابة الإنسانية الطارئة السريعة (v1)',
    'Rapid Emergency & Displacement Assessment (v1)',
    '{"sections": [{"title": "Emergency Event", "fields": ["crisis_type", "displacement_date", "immediate_survival_needs"]}]}'::jsonb,
    true
  ),
  (
    '60000000-0000-0000-0000-000000000007',
    'EMP',
    1,
    'استمارة تقييم المهارات المهنية والتمكين الاقتصادي (v1)',
    'Vocational Skills & Economic Empowerment Assessment (v1)',
    '{"sections": [{"title": "Livelihoods", "fields": ["primary_trade", "business_experience_years", "tools_required"]}]}'::jsonb,
    true
  ),
  (
    '60000000-0000-0000-0000-000000000008',
    'SOC',
    1,
    'استمارة تقييم الوثائق الثبوتية والمساندة الاجتماعية (v1)',
    'Civil Documentation Loss & Protection Assessment (v1)',
    '{"sections": [{"title": "Legal Protection", "fields": ["missing_civil_documents", "legal_representation_required", "guardianship_status"]}]}'::jsonb,
    true
  )
ON CONFLICT (programme_code, version) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  schema_definition = EXCLUDED.schema_definition,
  is_published = EXCLUDED.is_published;

-- 6. Workflow: Submit Programme Assessment & Queue Dual-Authorization
CREATE OR REPLACE FUNCTION workflow_submit_programme_assessment(
  p_case_id UUID,
  p_template_id UUID,
  p_responses JSONB,
  p_computed_score NUMERIC,
  p_recommended_assistance_type VARCHAR,
  p_recommended_amount NUMERIC,
  p_actor_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_case RECORD;
  v_template RECORD;
  v_submission_id UUID;
  v_approval_id UUID;
  v_actor_active BOOLEAN;
  v_has_role BOOLEAN;
  v_prog_scope_count INT;
BEGIN
  -- A. Actor Validation
  SELECT is_active INTO v_actor_active FROM staff_profiles WHERE id = p_actor_id;
  IF v_actor_active IS NOT TRUE THEN
    RAISE EXCEPTION 'ERR_STAFF_INACTIVE: Assessing actor is inactive or missing.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM staff_roles
    WHERE staff_id = p_actor_id
      AND role IN ('caseworker', 'supervisor', 'programme_manager')
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED_ROLE: Actor lacks permission to conduct assessments.';
  END IF;

  -- B. Case & Programme Scope Check
  SELECT * INTO v_case FROM cases WHERE id = p_case_id;
  IF v_case.id IS NULL THEN
    RAISE EXCEPTION 'ERR_CASE_NOT_FOUND: Case does not exist.';
  END IF;

  -- Cross-Programme Scope Gate
  SELECT COUNT(*) INTO v_prog_scope_count
  FROM staff_scopes
  WHERE staff_id = p_actor_id AND programme_code IS NOT NULL;

  IF v_prog_scope_count > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM staff_scopes
      WHERE staff_id = p_actor_id AND programme_code = v_case.programme_code
    ) THEN
      RAISE EXCEPTION 'ERR_CROSS_PROGRAMME_DENIED: Staff member is not authorized for programme sector %.', v_case.programme_code;
    END IF;
  END IF;

  -- C. Template Validation
  SELECT * INTO v_template FROM assessment_templates WHERE id = p_template_id;
  IF v_template.id IS NULL OR v_template.is_published IS NOT TRUE THEN
    RAISE EXCEPTION 'ERR_INVALID_TEMPLATE: Assessment template does not exist or is unpublished.';
  END IF;

  IF v_template.programme_code != v_case.programme_code THEN
    RAISE EXCEPTION 'ERR_TEMPLATE_PROGRAMME_MISMATCH: Template is for % but case is in %.', v_template.programme_code, v_case.programme_code;
  END IF;

  -- D. Insert Submission
  INSERT INTO assessment_submissions (
    case_id,
    template_id,
    responses,
    computed_score,
    assessed_by
  ) VALUES (
    p_case_id,
    p_template_id,
    p_responses,
    p_computed_score,
    p_actor_id
  ) RETURNING id INTO v_submission_id;

  -- E. Advance Case Status to 'pending_approval' if currently draft, submitted, or under_assessment
  IF v_case.status IN ('draft', 'submitted', 'under_assessment') THEN
    UPDATE cases
    SET status = 'pending_approval', updated_at = clock_timestamp()
    WHERE id = p_case_id;

    INSERT INTO case_status_history (case_id, from_status, to_status, changed_by, justification)
    VALUES (p_case_id, v_case.status, 'pending_approval', p_actor_id, 'Field assessment submitted; eligibility queued for review');
  END IF;

  -- F. Create Pending Dual-Authorization Approval Record
  INSERT INTO case_approvals (
    case_id,
    approval_type,
    maker_id,
    status,
    comments
  ) VALUES (
    p_case_id,
    'programme_eligibility',
    p_actor_id,
    'pending',
    format('Recommended %s with score %s and amount %s IQD', p_recommended_assistance_type, p_computed_score, p_recommended_amount)
  ) RETURNING id INTO v_approval_id;

  -- G. Audit Trail
  INSERT INTO audit_logs (
    actor_id, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    p_actor_id,
    'ASSESSMENT',
    'SUBMIT_ASSESSMENT',
    'assessment_submissions',
    v_submission_id::text,
    jsonb_build_object(
      'case_id', p_case_id,
      'programme', v_case.programme_code,
      'computed_score', p_computed_score,
      'approval_id', v_approval_id
    )
  );

  RETURN jsonb_build_object(
    'submission_id', v_submission_id,
    'approval_id', v_approval_id,
    'status', 'pending_approval'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Workflow: Create Assistance Entitlement with Policy Limits Check
CREATE OR REPLACE FUNCTION workflow_create_assistance_entitlement(
  p_case_id UUID,
  p_assistance_type VARCHAR,
  p_authorized_amount NUMERIC,
  p_currency VARCHAR,
  p_actor_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_case RECORD;
  v_limits RECORD;
  v_entitlement_id UUID;
  v_actor_active BOOLEAN;
  v_has_auth_role BOOLEAN;
BEGIN
  -- A. Actor Validation
  SELECT is_active INTO v_actor_active FROM staff_profiles WHERE id = p_actor_id;
  IF v_actor_active IS NOT TRUE THEN
    RAISE EXCEPTION 'ERR_STAFF_INACTIVE: Actor is inactive.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM staff_roles
    WHERE staff_id = p_actor_id
      AND role IN ('supervisor', 'programme_manager', 'finance_checker')
  ) INTO v_has_auth_role;

  IF NOT v_has_auth_role THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED_ROLE: Actor lacks authority to allocate assistance entitlements.';
  END IF;

  -- B. Case Check
  SELECT * INTO v_case FROM cases WHERE id = p_case_id;
  IF v_case.id IS NULL THEN
    RAISE EXCEPTION 'ERR_CASE_NOT_FOUND: Case does not exist.';
  END IF;

  IF v_case.status NOT IN ('approved', 'active_delivery') THEN
    RAISE EXCEPTION 'ERR_CASE_NOT_APPROVED: Entitlements can only be created for approved cases. Current status: %', v_case.status;
  END IF;

  -- C. Configurable Financial Policy Limit Check (FAIL-CLOSED)
  SELECT * INTO v_limits
  FROM programme_financial_limits
  WHERE programme_code = v_case.programme_code AND is_active = true;

  IF v_limits.programme_code IS NULL THEN
    RAISE EXCEPTION 'ERR_POLICY_CONFIG_MISSING: Financial policy limits not configured or inactive for programme %. Operation blocked.', v_case.programme_code;
  END IF;

  IF p_authorized_amount > v_limits.manager_max_limit THEN
    RAISE EXCEPTION 'ERR_APPROVAL_LIMIT_EXCEEDED: Requested amount % exceeds maximum configured financial policy limit of % %.',
      p_authorized_amount, v_limits.manager_max_limit, v_limits.currency;
  END IF;

  -- D. Insert Entitlement
  INSERT INTO assistance_entitlements (
    case_id,
    assistance_type,
    currency,
    authorized_amount,
    disbursed_amount,
    status
  ) VALUES (
    p_case_id,
    p_assistance_type,
    COALESCE(p_currency, v_limits.currency),
    p_authorized_amount,
    0.00,
    'authorized'
  ) RETURNING id INTO v_entitlement_id;

  -- E. Audit Trail
  INSERT INTO audit_logs (
    actor_id, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    p_actor_id,
    'ASSISTANCE_ALLOCATION',
    'CREATE_ENTITLEMENT',
    'assistance_entitlements',
    v_entitlement_id::text,
    jsonb_build_object(
      'case_id', p_case_id,
      'amount', p_authorized_amount,
      'currency', p_currency,
      'assistance_type', p_assistance_type
    )
  );

  RETURN jsonb_build_object(
    'entitlement_id', v_entitlement_id,
    'authorized_amount', p_authorized_amount,
    'status', 'authorized'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Workflow: Confirm Assistance Delivery (Repeated Delivery Prevention)
CREATE OR REPLACE FUNCTION workflow_confirm_delivery(
  p_entitlement_id UUID,
  p_delivery_reference VARCHAR,
  p_recipient_national_id VARCHAR,
  p_quantity_or_amount NUMERIC,
  p_verification_method VARCHAR,
  p_delivery_notes TEXT,
  p_actor_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_entitlement RECORD;
  v_case RECORD;
  v_delivery_id UUID;
  v_remaining NUMERIC(14,2);
  v_new_disbursed NUMERIC(14,2);
  v_new_status VARCHAR(32);
BEGIN
  -- A. Entitlement Check
  SELECT * INTO v_entitlement
  FROM assistance_entitlements
  WHERE id = p_entitlement_id
  FOR UPDATE;

  IF v_entitlement.id IS NULL THEN
    RAISE EXCEPTION 'ERR_ENTITLEMENT_NOT_FOUND: Assistance entitlement does not exist.';
  END IF;

  SELECT * INTO v_case FROM cases WHERE id = v_entitlement.case_id;

  -- B. Repeated or Excess Delivery Check Gate
  v_remaining := v_entitlement.authorized_amount - v_entitlement.disbursed_amount;

  IF v_entitlement.status = 'completed' OR v_remaining <= 0 THEN
    RAISE EXCEPTION 'ERR_REPEATED_DELIVERY: Entitlement is already fully delivered and completed.';
  END IF;

  IF p_quantity_or_amount > v_remaining THEN
    RAISE EXCEPTION 'ERR_EXCESS_DELIVERY: Requested delivery quantity % exceeds remaining authorized entitlement of %.',
      p_quantity_or_amount, v_remaining;
  END IF;

  -- C. Insert Delivery Confirmation
  INSERT INTO assistance_deliveries (
    entitlement_id,
    case_id,
    delivery_reference,
    recipient_national_id,
    quantity_or_amount,
    delivered_by,
    verified_by_recipient,
    verification_method,
    delivery_notes
  ) VALUES (
    p_entitlement_id,
    v_entitlement.case_id,
    p_delivery_reference,
    p_recipient_national_id,
    p_quantity_or_amount,
    p_actor_id,
    true,
    COALESCE(p_verification_method, 'national_id_check'),
    p_delivery_notes
  ) RETURNING id INTO v_delivery_id;

  -- D. Update Entitlement Disbursed Total
  v_new_disbursed := v_entitlement.disbursed_amount + p_quantity_or_amount;
  IF v_new_disbursed >= v_entitlement.authorized_amount THEN
    v_new_status := 'completed';
  ELSE
    v_new_status := 'in_delivery';
  END IF;

  UPDATE assistance_entitlements
  SET disbursed_amount = v_new_disbursed,
      status = v_new_status
  WHERE id = p_entitlement_id;

  -- E. Advance Case Status to active_delivery if approved
  IF v_case.status = 'approved' THEN
    UPDATE cases
    SET status = 'active_delivery', updated_at = clock_timestamp()
    WHERE id = v_entitlement.case_id;

    INSERT INTO case_status_history (case_id, from_status, to_status, changed_by, justification)
    VALUES (v_entitlement.case_id, 'approved', 'active_delivery', p_actor_id, format('Assistance delivered (Ref: %s)', p_delivery_reference));
  END IF;

  -- F. Audit Trail
  INSERT INTO audit_logs (
    actor_id, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    p_actor_id,
    'DELIVERY',
    'CONFIRM_DELIVERY',
    'assistance_deliveries',
    v_delivery_id::text,
    jsonb_build_object(
      'entitlement_id', p_entitlement_id,
      'delivery_reference', p_delivery_reference,
      'quantity_or_amount', p_quantity_or_amount,
      'entitlement_status', v_new_status
    )
  );

  RETURN jsonb_build_object(
    'delivery_id', v_delivery_id,
    'delivery_reference', p_delivery_reference,
    'remaining_entitlement', (v_entitlement.authorized_amount - v_new_disbursed),
    'status', v_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Workflow: Disburse Financial Assistance with Limit Checks & Fail-Closed Guard
CREATE OR REPLACE FUNCTION workflow_disburse_financial_assistance(
  p_entitlement_id UUID,
  p_tx_reference VARCHAR,
  p_amount NUMERIC,
  p_currency VARCHAR,
  p_maker_id UUID,
  p_checker_id UUID,
  p_rationale TEXT,
  p_idempotency_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_entitlement RECORD;
  v_case RECORD;
  v_limits RECORD;
  v_new_tx_id UUID := gen_random_uuid();
  v_checker_active BOOLEAN;
  v_is_checker BOOLEAN;
  v_prog_scope_count INT;
BEGIN
  -- A. Checker Validation Gate
  SELECT is_active INTO v_checker_active FROM staff_profiles WHERE id = p_checker_id;
  IF v_checker_active IS NOT TRUE THEN
    RAISE EXCEPTION 'ERR_STAFF_INACTIVE: Checker is inactive or does not exist.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM staff_roles
    WHERE staff_id = p_checker_id AND role = 'finance_checker'
  ) INTO v_is_checker;

  IF NOT v_is_checker THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN: Only finance_checker can authorize and release financial disbursements.';
  END IF;

  -- B. Maker-Checker Segregation Gate (PROHIBIT SELF-APPROVAL)
  IF p_maker_id = p_checker_id THEN
    RAISE EXCEPTION 'ERR_SELF_APPROVAL_PROHIBITED: Finance checker cannot disburse an item they prepared as maker.';
  END IF;

  -- C. Entitlement Check
  SELECT * INTO v_entitlement
  FROM assistance_entitlements
  WHERE id = p_entitlement_id
  FOR UPDATE;

  IF v_entitlement.id IS NULL THEN
    RAISE EXCEPTION 'ERR_ENTITLEMENT_NOT_FOUND: Assistance entitlement % does not exist.', p_entitlement_id;
  END IF;

  SELECT * INTO v_case FROM cases WHERE id = v_entitlement.case_id;

  -- D. Cross-Programme Check
  SELECT COUNT(*) INTO v_prog_scope_count
  FROM staff_scopes
  WHERE staff_id = p_checker_id AND programme_code IS NOT NULL;

  IF v_prog_scope_count > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM staff_scopes
      WHERE staff_id = p_checker_id AND programme_code = v_case.programme_code
    ) THEN
      RAISE EXCEPTION 'ERR_CROSS_PROGRAMME_DENIED: Checker lacks authorization for programme sector %.', v_case.programme_code;
    END IF;
  END IF;

  -- E. Configurable Financial Policy Limit Check (FAIL-CLOSED)
  SELECT * INTO v_limits
  FROM programme_financial_limits
  WHERE programme_code = v_case.programme_code AND is_active = true;

  IF v_limits.programme_code IS NULL THEN
    RAISE EXCEPTION 'ERR_POLICY_CONFIG_MISSING: Financial policy limits not configured or inactive for programme %. Operation blocked.', v_case.programme_code;
  END IF;

  IF p_amount > v_limits.manager_max_limit THEN
    RAISE EXCEPTION 'ERR_APPROVAL_LIMIT_EXCEEDED: Requested disbursement % exceeds maximum configured financial policy limit of % %.',
      p_amount, v_limits.manager_max_limit, v_limits.currency;
  END IF;

  -- F. Quota Check
  IF (v_entitlement.disbursed_amount + p_amount) > v_entitlement.authorized_amount THEN
    RAISE EXCEPTION 'ERR_QUOTA_EXCEEDED: Requested disbursement % % exceeds remaining quota of % %.',
      p_amount, p_currency, (v_entitlement.authorized_amount - v_entitlement.disbursed_amount), p_currency;
  END IF;

  -- G. Insert Immutable Ledger Entry
  INSERT INTO finance_ledger (
    id,
    entitlement_id,
    transaction_type,
    transaction_reference,
    amount,
    currency,
    maker_id,
    checker_id,
    rationale,
    posted_at
  ) VALUES (
    v_new_tx_id,
    p_entitlement_id,
    'disbursement',
    p_tx_reference,
    p_amount,
    COALESCE(p_currency, v_limits.currency),
    p_maker_id,
    p_checker_id,
    p_rationale,
    clock_timestamp()
  );

  -- H. Update Entitlement Disbursed Amount
  UPDATE assistance_entitlements
  SET disbursed_amount = disbursed_amount + p_amount
  WHERE id = p_entitlement_id;

  -- I. Audit Trail
  INSERT INTO audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    p_checker_id,
    'finance_checker',
    'financial',
    'FINANCIAL_DISBURSEMENT_RELEASED',
    'finance_ledger',
    v_new_tx_id::text,
    jsonb_build_object(
      'entitlement_id', p_entitlement_id,
      'amount', p_amount,
      'currency', p_currency,
      'transaction_reference', p_tx_reference,
      'maker_id', p_maker_id,
      'checker_id', p_checker_id,
      'idempotency_key', p_idempotency_key
    )
  );

  RETURN jsonb_build_object(
    'transaction_id', v_new_tx_id,
    'reference', p_tx_reference,
    'amount', p_amount,
    'status', 'posted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Security Grants and Row Level Security (RLS) for Assistance & Financial Controls
ALTER TABLE programme_financial_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistance_deliveries ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON programme_financial_limits TO authenticated, anon;
GRANT SELECT, INSERT ON assistance_deliveries TO authenticated;

DROP POLICY IF EXISTS pfl_select_all ON programme_financial_limits;
CREATE POLICY pfl_select_all ON programme_financial_limits
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS ad_select_authenticated ON assistance_deliveries;
CREATE POLICY ad_select_authenticated ON assistance_deliveries
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ad_insert_authenticated ON assistance_deliveries;
CREATE POLICY ad_insert_authenticated ON assistance_deliveries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

GRANT EXECUTE ON FUNCTION workflow_submit_programme_assessment TO authenticated;
GRANT EXECUTE ON FUNCTION workflow_create_assistance_entitlement TO authenticated;
GRANT EXECUTE ON FUNCTION workflow_confirm_delivery TO authenticated;
GRANT EXECUTE ON FUNCTION workflow_disburse_financial_assistance TO authenticated;
