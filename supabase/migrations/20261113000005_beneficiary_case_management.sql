-- Migration: 20261113000005_beneficiary_case_management.sql
-- Purpose: Additive database workflows for scoped beneficiary registration,
--          human-reviewed duplicate resolution, case creation, status history,
--          activity logging, and accidental destruction safeguards.

-- 1. Sequence for deterministic case reference numbering
CREATE SEQUENCE IF NOT EXISTS seq_case_reference START WITH 1001;

-- 2. Safeguard Trigger: Prevent accidental hard deletion on beneficiaries
-- Only authorized soft-deletions (deleted_at IS NOT NULL) are permitted. Direct DELETE is blocked.
CREATE OR REPLACE FUNCTION trg_prevent_hard_delete_beneficiaries()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ERR_ACCIDENTAL_DESTRUCTION: Direct deletion of beneficiary records is strictly prohibited. Retain records or use authorized soft-deletion.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_beneficiaries_protect_delete ON beneficiaries;
CREATE TRIGGER trg_beneficiaries_protect_delete
  BEFORE DELETE ON beneficiaries
  FOR EACH ROW
  EXECUTE FUNCTION trg_prevent_hard_delete_beneficiaries();

-- 3. Safeguard Trigger: Prevent hard deletion of cases
CREATE OR REPLACE FUNCTION trg_prevent_hard_delete_cases()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ERR_ACCIDENTAL_DESTRUCTION: Direct deletion of cases is prohibited. Follow the approved lifecycle to close cases.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cases_protect_delete ON cases;
CREATE TRIGGER trg_cases_protect_delete
  BEFORE DELETE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION trg_prevent_hard_delete_cases();

-- 4. Safeguard Trigger: Case status history is immutable and append-only
CREATE OR REPLACE FUNCTION trg_prevent_modify_case_status_history()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ERR_HISTORY_IMMUTABLE: Case status history entries cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_status_history_protect ON case_status_history;
CREATE TRIGGER trg_case_status_history_protect
  BEFORE UPDATE OR DELETE ON case_status_history
  FOR EACH ROW
  EXECUTE FUNCTION trg_prevent_modify_case_status_history();

-- 5. Workflow: Scoped Beneficiary Registration with Mandatory Consent & Duplicate Flagging
CREATE OR REPLACE FUNCTION workflow_register_beneficiary(
  p_national_id_type VARCHAR,
  p_national_id_number VARCHAR,
  p_full_name_ar TEXT,
  p_full_name_en TEXT,
  p_mother_name_ar TEXT,
  p_date_of_birth DATE,
  p_gender VARCHAR,
  p_phone_primary VARCHAR,
  p_phone_secondary VARCHAR,
  p_governorate_id VARCHAR,
  p_district_id VARCHAR,
  p_address_details TEXT,
  p_displacement_status VARCHAR,
  p_vulnerability_flags TEXT[],
  p_has_given_general_consent BOOLEAN,
  p_has_given_data_sharing_consent BOOLEAN,
  p_actor_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_actor_active BOOLEAN;
  v_has_intake_role BOOLEAN;
  v_scope_count INT;
  v_beneficiary_id UUID;
  v_duplicate_count INT := 0;
  v_matched_record RECORD;
  v_duplicate_status VARCHAR(32) := 'clean';
  v_match_reasons JSONB;
  v_match_score NUMERIC(5,2);
BEGIN
  -- A. Consent Requirement Gate: Informed consent is non-negotiable
  IF p_has_given_general_consent IS NOT TRUE THEN
    RAISE EXCEPTION 'ERR_CONSENT_MANDATORY: Registration requires explicit informed general consent.';
  END IF;

  -- B. Actor Validation Gate
  SELECT is_active INTO v_actor_active
  FROM staff_profiles
  WHERE id = p_actor_id;

  IF v_actor_active IS NOT TRUE THEN
    RAISE EXCEPTION 'ERR_STAFF_INACTIVE: Actor is inactive or does not exist.';
  END IF;

  -- C. Role Check Gate: intake, caseworker, supervisor, programme_manager, or security_admin
  SELECT EXISTS (
    SELECT 1 FROM staff_roles
    WHERE staff_id = p_actor_id
      AND role IN ('intake', 'caseworker', 'supervisor', 'programme_manager', 'security_admin')
  ) INTO v_has_intake_role;

  IF NOT v_has_intake_role THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED_ROLE: Staff member does not have registration permissions.';
  END IF;

  -- D. Governorate Scope Gate: Staff must have nationwide or assigned governorate access
  SELECT COUNT(*) INTO v_scope_count
  FROM staff_scopes
  WHERE staff_id = p_actor_id AND governorate_id IS NOT NULL;

  IF v_scope_count > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM staff_scopes
      WHERE staff_id = p_actor_id AND governorate_id = p_governorate_id
    ) THEN
      RAISE EXCEPTION 'ERR_GOVERNORATE_OUT_OF_SCOPE: Staff member is not authorized for governorate %.', p_governorate_id;
    END IF;
  END IF;

  -- E. Insert Beneficiary Record
  INSERT INTO beneficiaries (
    national_id_type,
    national_id_number,
    full_name_ar,
    full_name_en,
    mother_name_ar,
    date_of_birth,
    gender,
    phone_primary,
    phone_secondary,
    governorate_id,
    district_id,
    address_details,
    displacement_status,
    vulnerability_flags,
    duplicate_status,
    created_by
  ) VALUES (
    p_national_id_type,
    p_national_id_number,
    p_full_name_ar,
    p_full_name_en,
    p_mother_name_ar,
    p_date_of_birth,
    p_gender,
    p_phone_primary,
    p_phone_secondary,
    p_governorate_id,
    p_district_id,
    p_address_details,
    p_displacement_status,
    COALESCE(p_vulnerability_flags, '{}'::TEXT[]),
    'clean',
    p_actor_id
  ) RETURNING id INTO v_beneficiary_id;

  -- F. Record Consent
  INSERT INTO beneficiary_consents (
    beneficiary_id,
    consent_version,
    language,
    has_given_general_consent,
    has_given_data_sharing_consent,
    recorded_by
  ) VALUES (
    v_beneficiary_id,
    'v1.0-2026',
    'ar',
    p_has_given_general_consent,
    COALESCE(p_has_given_data_sharing_consent, false),
    p_actor_id
  );

  -- G. Automated Duplicate Detection Check
  -- Check for existing active beneficiaries matching national ID, phone, or name + DOB
  FOR v_matched_record IN
    SELECT id, national_id_number, phone_primary, full_name_ar, date_of_birth
    FROM beneficiaries
    WHERE id != v_beneficiary_id
      AND deleted_at IS NULL
      AND (
        national_id_number = p_national_id_number
        OR phone_primary = p_phone_primary
        OR (full_name_ar = p_full_name_ar AND date_of_birth = p_date_of_birth)
      )
  LOOP
    v_duplicate_count := v_duplicate_count + 1;

    -- Calculate match characteristics
    IF v_matched_record.national_id_number = p_national_id_number THEN
      v_match_score := 100.00;
      v_match_reasons := jsonb_build_object('reason', 'identical_national_id', 'matched_id', v_matched_record.national_id_number);
    ELSIF v_matched_record.phone_primary = p_phone_primary THEN
      v_match_score := 85.00;
      v_match_reasons := jsonb_build_object('reason', 'identical_phone', 'matched_phone', v_matched_record.phone_primary);
    ELSE
      v_match_score := 90.00;
      v_match_reasons := jsonb_build_object('reason', 'identical_name_and_dob', 'matched_dob', v_matched_record.date_of_birth);
    END IF;

    -- Queue for human review -- NEVER auto-merge!
    INSERT INTO duplicate_reviews (
      target_beneficiary_id,
      matched_beneficiary_id,
      match_score,
      match_reasons,
      status
    ) VALUES (
      v_beneficiary_id,
      v_matched_record.id,
      v_match_score,
      v_match_reasons,
      'pending'
    );
  END LOOP;

  -- If duplicates flagged, mark status as suspected_duplicate
  IF v_duplicate_count > 0 THEN
    v_duplicate_status := 'suspected_duplicate';
    UPDATE beneficiaries
    SET duplicate_status = 'suspected_duplicate'
    WHERE id = v_beneficiary_id;
  END IF;

  -- H. Audit Trail
  INSERT INTO audit_logs (
    actor_id,
    actor_role,
    event_category,
    action_name,
    entity_table,
    entity_id,
    details
  ) VALUES (
    p_actor_id,
    'intake',
    'BENEFICIARY_MANAGEMENT',
    'REGISTER_BENEFICIARY',
    'beneficiaries',
    v_beneficiary_id::text,
    jsonb_build_object(
      'governorate', p_governorate_id,
      'duplicate_flagged', v_duplicate_count > 0,
      'flagged_candidate_count', v_duplicate_count
    )
  );

  RETURN jsonb_build_object(
    'beneficiary_id', v_beneficiary_id,
    'duplicate_status', v_duplicate_status,
    'duplicates_flagged_count', v_duplicate_count
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Workflow: Human-Reviewed Duplicate Decision
-- POLICY RULE: Machine detection only flags. Only authorized human decision determines outcome.
-- Merging never deletes target record; links primary_beneficiary_id while preserving full history.
CREATE OR REPLACE FUNCTION workflow_review_duplicate(
  p_duplicate_review_id UUID,
  p_decision VARCHAR,
  p_decision_notes TEXT,
  p_actor_id UUID,
  p_primary_beneficiary_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_review RECORD;
  v_has_auth_role BOOLEAN;
  v_actor_active BOOLEAN;
BEGIN
  -- A. Actor Validation
  SELECT is_active INTO v_actor_active FROM staff_profiles WHERE id = p_actor_id;
  IF v_actor_active IS NOT TRUE THEN
    RAISE EXCEPTION 'ERR_STAFF_INACTIVE: Deciding actor is inactive.';
  END IF;

  -- B. Role Check: Only supervisor, programme_manager, or security_admin can decide duplicate reviews
  SELECT EXISTS (
    SELECT 1 FROM staff_roles
    WHERE staff_id = p_actor_id
      AND role IN ('supervisor', 'programme_manager', 'security_admin')
  ) INTO v_has_auth_role;

  IF NOT v_has_auth_role THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED_ROLE: Only supervisors or managers can authorize duplicate review decisions.';
  END IF;

  -- C. Fetch Pending Duplicate Review
  SELECT * INTO v_review
  FROM duplicate_reviews
  WHERE id = p_duplicate_review_id
  FOR UPDATE;

  IF v_review.id IS NULL THEN
    RAISE EXCEPTION 'ERR_REVIEW_NOT_FOUND: Duplicate review record does not exist.';
  END IF;

  IF v_review.status != 'pending' THEN
    RAISE EXCEPTION 'ERR_ALREADY_DECIDED: Duplicate review has already been decided.';
  END IF;

  -- D. Justification Length Check
  IF length(trim(COALESCE(p_decision_notes, ''))) < 10 THEN
    RAISE EXCEPTION 'ERR_INSUFFICIENT_JUSTIFICATION: A human decision requires at least 10 characters of explanation.';
  END IF;

  -- E. Execute Decision
  IF p_decision = 'confirmed_duplicate' THEN
    IF p_primary_beneficiary_id IS NULL THEN
      RAISE EXCEPTION 'ERR_PRIMARY_BENEFICIARY_REQUIRED: Confirmed duplicate requires designating the primary profile.';
    END IF;

    -- Update review record
    UPDATE duplicate_reviews
    SET status = 'confirmed_duplicate',
        decided_by = p_actor_id,
        decided_at = clock_timestamp(),
        decision_notes = p_decision_notes
    WHERE id = p_duplicate_review_id;

    -- Link target to primary without deleting target
    UPDATE beneficiaries
    SET duplicate_status = 'confirmed_duplicate',
        primary_beneficiary_id = p_primary_beneficiary_id,
        updated_at = clock_timestamp()
    WHERE id = v_review.target_beneficiary_id;

  ELSIF p_decision = 'dismissed_false_positive' THEN
    -- Update review record
    UPDATE duplicate_reviews
    SET status = 'dismissed_false_positive',
        decided_by = p_actor_id,
        decided_at = clock_timestamp(),
        decision_notes = p_decision_notes
    WHERE id = p_duplicate_review_id;

    -- Mark target as verified unique
    UPDATE beneficiaries
    SET duplicate_status = 'resolved_unique',
        updated_at = clock_timestamp()
    WHERE id = v_review.target_beneficiary_id;

  ELSE
    RAISE EXCEPTION 'ERR_INVALID_DECISION: Decision must be confirmed_duplicate or dismissed_false_positive.';
  END IF;

  -- F. Audit Trail
  INSERT INTO audit_logs (
    actor_id,
    actor_role,
    event_category,
    action_name,
    entity_table,
    entity_id,
    details
  ) VALUES (
    p_actor_id,
    'supervisor',
    'DEDUPLICATION',
    'DECIDE_DUPLICATE_REVIEW',
    'duplicate_reviews',
    p_duplicate_review_id::text,
    jsonb_build_object(
      'decision', p_decision,
      'target_beneficiary_id', v_review.target_beneficiary_id,
      'matched_beneficiary_id', v_review.matched_beneficiary_id,
      'primary_beneficiary_id', p_primary_beneficiary_id,
      'notes', p_decision_notes
    )
  );

  RETURN jsonb_build_object(
    'review_id', p_duplicate_review_id,
    'decision', p_decision,
    'status', 'success'
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Workflow: Case Creation with Sector & Governorate Validation
CREATE OR REPLACE FUNCTION workflow_create_case(
  p_beneficiary_id UUID,
  p_household_id UUID,
  p_programme_code VARCHAR,
  p_priority VARCHAR,
  p_governorate_id VARCHAR,
  p_actor_id UUID,
  p_assigned_caseworker_id UUID DEFAULT NULL,
  p_initial_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_actor_active BOOLEAN;
  v_has_case_role BOOLEAN;
  v_scope_count INT;
  v_beneficiary_record RECORD;
  v_case_id UUID;
  v_case_ref VARCHAR(32);
BEGIN
  -- A. Actor Validation
  SELECT is_active INTO v_actor_active FROM staff_profiles WHERE id = p_actor_id;
  IF v_actor_active IS NOT TRUE THEN
    RAISE EXCEPTION 'ERR_STAFF_INACTIVE: Actor is inactive.';
  END IF;

  -- B. Role Check
  SELECT EXISTS (
    SELECT 1 FROM staff_roles
    WHERE staff_id = p_actor_id
      AND role IN ('intake', 'caseworker', 'supervisor', 'programme_manager', 'security_admin')
  ) INTO v_has_case_role;

  IF NOT v_has_case_role THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED_ROLE: Staff member lacks case creation permissions.';
  END IF;

  -- C. Beneficiary Check
  SELECT * INTO v_beneficiary_record
  FROM beneficiaries
  WHERE id = p_beneficiary_id AND deleted_at IS NULL;

  IF v_beneficiary_record.id IS NULL THEN
    RAISE EXCEPTION 'ERR_BENEFICIARY_NOT_FOUND: Beneficiary does not exist or has been deleted.';
  END IF;

  -- D. Programme Sector Check
  IF NOT EXISTS (
    SELECT 1 FROM programmes WHERE code = p_programme_code AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERR_INVALID_PROGRAMME: Programme code % is not an active sector.', p_programme_code;
  END IF;

  -- E. Governorate Scope Check
  SELECT COUNT(*) INTO v_scope_count
  FROM staff_scopes
  WHERE staff_id = p_actor_id AND governorate_id IS NOT NULL;

  IF v_scope_count > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM staff_scopes
      WHERE staff_id = p_actor_id AND governorate_id = p_governorate_id
    ) THEN
      RAISE EXCEPTION 'ERR_GOVERNORATE_OUT_OF_SCOPE: Staff is not authorized for governorate %.', p_governorate_id;
    END IF;
  END IF;

  -- F. Generate Reference & Insert Case
  v_case_ref := format('CASE-%s-%s', to_char(clock_timestamp(), 'YYYY'), lpad(nextval('seq_case_reference')::text, 5, '0'));

  INSERT INTO cases (
    case_reference,
    beneficiary_id,
    household_id,
    programme_code,
    status,
    priority,
    assigned_caseworker_id,
    governorate_id,
    created_by
  ) VALUES (
    v_case_ref,
    p_beneficiary_id,
    p_household_id,
    p_programme_code,
    'submitted',
    COALESCE(p_priority, 'medium'),
    p_assigned_caseworker_id,
    p_governorate_id,
    p_actor_id
  ) RETURNING id INTO v_case_id;

  -- G. Append Initial State History
  INSERT INTO case_status_history (
    case_id,
    from_status,
    to_status,
    changed_by,
    justification
  ) VALUES (
    v_case_id,
    'draft',
    'submitted',
    p_actor_id,
    COALESCE(p_initial_notes, 'Initial case intake registration')
  );

  -- H. Audit Trail
  INSERT INTO audit_logs (
    actor_id,
    actor_role,
    event_category,
    action_name,
    entity_table,
    entity_id,
    details
  ) VALUES (
    p_actor_id,
    'caseworker',
    'CASE_MANAGEMENT',
    'CREATE_CASE',
    'cases',
    v_case_id::text,
    jsonb_build_object(
      'case_reference', v_case_ref,
      'programme', p_programme_code,
      'governorate', p_governorate_id
    )
  );

  RETURN jsonb_build_object(
    'case_id', v_case_id,
    'case_reference', v_case_ref,
    'status', 'submitted'
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Workflow: Log Case Field Activity & Notes
CREATE OR REPLACE FUNCTION workflow_log_case_activity(
  p_case_id UUID,
  p_visit_date DATE,
  p_notes TEXT,
  p_actor_id UUID,
  p_gps_lat NUMERIC DEFAULT NULL,
  p_gps_long NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_visit_id UUID;
  v_case RECORD;
BEGIN
  SELECT * INTO v_case FROM cases WHERE id = p_case_id;
  IF v_case.id IS NULL THEN
    RAISE EXCEPTION 'ERR_CASE_NOT_FOUND: Case does not exist.';
  END IF;

  IF length(trim(COALESCE(p_notes, ''))) < 5 THEN
    RAISE EXCEPTION 'ERR_INVALID_NOTES: Field visit notes must be at least 5 characters.';
  END IF;

  INSERT INTO caseworker_visits (
    case_id,
    caseworker_id,
    visit_date,
    gps_latitude,
    gps_longitude,
    notes
  ) VALUES (
    p_case_id,
    p_actor_id,
    COALESCE(p_visit_date, CURRENT_DATE),
    p_gps_lat,
    p_gps_long,
    p_notes
  ) RETURNING id INTO v_visit_id;

  INSERT INTO audit_logs (
    actor_id,
    event_category,
    action_name,
    entity_table,
    entity_id,
    details
  ) VALUES (
    p_actor_id,
    'FIELD_OPERATIONS',
    'LOG_CASE_VISIT',
    'caseworker_visits',
    v_visit_id::text,
    jsonb_build_object('case_id', p_case_id, 'visit_date', p_visit_date)
  );

  RETURN jsonb_build_object('visit_id', v_visit_id, 'status', 'recorded');
END;
$$ LANGUAGE plpgsql;

-- 9. Workflow: Safe Case Closure with Reason & Justification
CREATE OR REPLACE FUNCTION workflow_close_case(
  p_case_id UUID,
  p_closure_reason TEXT,
  p_justification TEXT,
  p_actor_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_case RECORD;
  v_has_close_role BOOLEAN;
BEGIN
  SELECT * INTO v_case FROM cases WHERE id = p_case_id FOR UPDATE;
  IF v_case.id IS NULL THEN
    RAISE EXCEPTION 'ERR_CASE_NOT_FOUND: Case does not exist.';
  END IF;

  -- Cannot close already closed case
  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'ERR_ALREADY_CLOSED: Case is already closed.';
  END IF;

  -- Lifecycle Transition Check: Only approved, rejected, or active_delivery cases can be closed
  IF v_case.status NOT IN ('approved', 'rejected', 'active_delivery') THEN
    RAISE EXCEPTION 'ERR_INVALID_TRANSITION: Case in status % cannot be directly closed. Progress through assessment and decision first.', v_case.status;
  END IF;

  -- Role authorization check
  SELECT EXISTS (
    SELECT 1 FROM staff_roles
    WHERE staff_id = p_actor_id
      AND role IN ('supervisor', 'programme_manager', 'caseworker', 'security_admin')
  ) INTO v_has_close_role;

  IF NOT v_has_close_role THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED_ROLE: Actor lacks permission to close cases.';
  END IF;

  IF length(trim(COALESCE(p_closure_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'ERR_INSUFFICIENT_CLOSURE_REASON: Closure reason must be at least 10 characters.';
  END IF;

  -- Update case status to closed
  UPDATE cases
  SET status = 'closed',
      closed_at = clock_timestamp(),
      closure_reason = p_closure_reason,
      updated_at = clock_timestamp()
  WHERE id = p_case_id;

  -- Record state history
  INSERT INTO case_status_history (
    case_id,
    from_status,
    to_status,
    changed_by,
    justification
  ) VALUES (
    p_case_id,
    v_case.status,
    'closed',
    p_actor_id,
    format('Case closed: %s. Justification: %s', p_closure_reason, COALESCE(p_justification, 'N/A'))
  );

  -- Audit trail
  INSERT INTO audit_logs (
    actor_id,
    event_category,
    action_name,
    entity_table,
    entity_id,
    details
  ) VALUES (
    p_actor_id,
    'CASE_MANAGEMENT',
    'CLOSE_CASE',
    'cases',
    p_case_id::text,
    jsonb_build_object(
      'from_status', v_case.status,
      'closure_reason', p_closure_reason
    )
  );

  RETURN jsonb_build_object('case_id', p_case_id, 'status', 'closed');
END;
$$ LANGUAGE plpgsql;

