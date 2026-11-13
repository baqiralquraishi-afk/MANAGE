-- ============================================================================
-- Migration 09: Audit Hardening, Role Management & Security Alert Logging
-- Humanity Platform (Iraq Operations)
--
-- Implements:
-- 1. Strict append-only audit log protection and access segregation
-- 2. Audited staff role & scope modification workflows (security_admin only)
-- 3. Security alert and unauthorized access attempt audit logging
-- 4. Sensitive record read auditing with strict data minimization
-- ============================================================================

-- 1. Ensure immutability trigger is attached to audit_logs
CREATE OR REPLACE FUNCTION public.trg_prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ERR_AUDIT_IMMUTABLE: Security audit log entries cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_protect ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_protect
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prevent_audit_modification();

-- 2. Workflow: Assign Staff Role (Security Admin Only, Mandatory Rationale)
CREATE OR REPLACE FUNCTION public.workflow_assign_staff_role(
  p_target_staff_id UUID,
  p_role system_role,
  p_rationale TEXT
) RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_caller_role system_role;
BEGIN
  -- Security check: caller must be active staff
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  -- Role check: Only security_admin can modify staff roles
  IF NOT public.has_role(v_caller, 'security_admin'::system_role) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Only security administrators can assign staff roles.';
  END IF;

  -- Input validation: mandatory detailed rationale
  IF length(trim(COALESCE(p_rationale, ''))) < 10 THEN
    RAISE EXCEPTION 'ERR_INVALID_RATIONALE: Role changes require detailed justification (at least 10 characters).';
  END IF;

  -- Ensure target staff profile exists
  IF NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE id = p_target_staff_id) THEN
    RAISE EXCEPTION 'ERR_STAFF_NOT_FOUND: Target staff profile does not exist.';
  END IF;

  -- Insert or reactivate role in staff_roles
  INSERT INTO public.staff_roles (staff_id, role, is_active, assigned_by)
  VALUES (p_target_staff_id, p_role, true, v_caller)
  ON CONFLICT (staff_id, role)
  DO UPDATE SET is_active = true, assigned_by = v_caller;

  -- Append immutable audit log entry
  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    event_category,
    action_name,
    entity_table,
    entity_id,
    details
  ) VALUES (
    v_caller,
    'security_admin',
    'role_management',
    'STAFF_ROLE_ASSIGNED',
    'staff_roles',
    p_target_staff_id::text,
    jsonb_build_object(
      'target_staff_id', p_target_staff_id,
      'assigned_role', p_role,
      'rationale', p_rationale
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'action', 'STAFF_ROLE_ASSIGNED',
    'target_staff_id', p_target_staff_id,
    'role', p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Workflow: Revoke Staff Role (Security Admin Only, Mandatory Rationale)
CREATE OR REPLACE FUNCTION public.workflow_revoke_staff_role(
  p_target_staff_id UUID,
  p_role system_role,
  p_rationale TEXT
) RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  IF NOT public.has_role(v_caller, 'security_admin'::system_role) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Only security administrators can revoke staff roles.';
  END IF;

  IF length(trim(COALESCE(p_rationale, ''))) < 10 THEN
    RAISE EXCEPTION 'ERR_INVALID_RATIONALE: Role changes require detailed justification (at least 10 characters).';
  END IF;

  -- Deactivate role
  UPDATE public.staff_roles
  SET is_active = false
  WHERE staff_id = p_target_staff_id AND role = p_role;

  -- Append immutable audit log entry
  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    event_category,
    action_name,
    entity_table,
    entity_id,
    details
  ) VALUES (
    v_caller,
    'security_admin',
    'role_management',
    'STAFF_ROLE_REVOKED',
    'staff_roles',
    p_target_staff_id::text,
    jsonb_build_object(
      'target_staff_id', p_target_staff_id,
      'revoked_role', p_role,
      'rationale', p_rationale
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'action', 'STAFF_ROLE_REVOKED',
    'target_staff_id', p_target_staff_id,
    'role', p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Workflow: Assign Staff Geographic & Programme Scope
CREATE OR REPLACE FUNCTION public.workflow_assign_staff_scope(
  p_target_staff_id UUID,
  p_governorate_id VARCHAR(10),
  p_programme_code VARCHAR(10),
  p_rationale TEXT
) RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_scope_id UUID;
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  IF NOT public.has_role(v_caller, 'security_admin'::system_role) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Only security administrators can modify staff scopes.';
  END IF;

  IF length(trim(COALESCE(p_rationale, ''))) < 10 THEN
    RAISE EXCEPTION 'ERR_INVALID_RATIONALE: Scope changes require detailed justification (at least 10 characters).';
  END IF;

  IF p_governorate_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.geo_governorates WHERE id = p_governorate_id) THEN
    RAISE EXCEPTION 'ERR_INVALID_GOVERNORATE: Governorate ID is invalid.';
  END IF;

  IF p_programme_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.programmes WHERE code = p_programme_code) THEN
    RAISE EXCEPTION 'ERR_INVALID_PROGRAMME: Programme code is invalid.';
  END IF;

  INSERT INTO public.staff_scopes (
    staff_id, governorate_id, programme_code
  ) VALUES (
    p_target_staff_id, p_governorate_id, p_programme_code
  ) RETURNING id INTO v_scope_id;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    event_category,
    action_name,
    entity_table,
    entity_id,
    details
  ) VALUES (
    v_caller,
    'security_admin',
    'role_management',
    'STAFF_SCOPE_ASSIGNED',
    'staff_scopes',
    v_scope_id::text,
    jsonb_build_object(
      'target_staff_id', p_target_staff_id,
      'governorate_id', p_governorate_id,
      'programme_code', p_programme_code,
      'rationale', p_rationale
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'action', 'STAFF_SCOPE_ASSIGNED',
    'scope_id', v_scope_id,
    'target_staff_id', p_target_staff_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Workflow: Log Security Alert / Unauthorized Probing (Defensive Audit)
-- Field minimization: Strips any auth tokens, secret keys, or passwords from payload
CREATE OR REPLACE FUNCTION public.workflow_log_security_alert(
  p_event_category VARCHAR(32),
  p_action_name VARCHAR(64),
  p_entity_table VARCHAR(64),
  p_entity_id VARCHAR(128),
  p_details JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_caller_role VARCHAR(50);
  v_sanitized_details JSONB;
  v_audit_id BIGINT;
BEGIN
  IF v_caller IS NOT NULL THEN
    SELECT role::text INTO v_caller_role
    FROM public.staff_roles
    WHERE staff_id = v_caller AND is_active = true
    LIMIT 1;
  ELSE
    v_caller_role := 'anonymous';
  END IF;

  -- Data Minimization & Secret Hygiene: Strip any secret keys
  v_sanitized_details := p_details - 'token' - 'accessToken' - 'refreshToken' - 'password' - 'secretKey' - 'serviceRoleKey';

  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    event_category,
    action_name,
    entity_table,
    entity_id,
    details
  ) VALUES (
    v_caller,
    COALESCE(v_caller_role, 'unassigned'),
    COALESCE(p_event_category, 'security_violation'),
    COALESCE(p_action_name, 'ACCESS_DENIED_ALERT'),
    COALESCE(p_entity_table, 'system'),
    p_entity_id,
    v_sanitized_details
  ) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'status', 'logged',
    'audit_id', v_audit_id,
    'action_name', p_action_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Workflow: Audit Sensitive Record Read
-- Audits inspection of heightened protection (Tier 4 CP/GBV) or financial entries
CREATE OR REPLACE FUNCTION public.workflow_audit_sensitive_read(
  p_entity_table VARCHAR(64),
  p_entity_id UUID,
  p_access_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_caller_role VARCHAR(50);
  v_audit_id BIGINT;
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  SELECT role::text INTO v_caller_role
  FROM public.staff_roles
  WHERE staff_id = v_caller AND is_active = true
  LIMIT 1;

  IF length(trim(COALESCE(p_access_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'ERR_INVALID_REASON: Access reason must be at least 5 characters for sensitive reads.';
  END IF;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    event_category,
    action_name,
    entity_table,
    entity_id,
    details
  ) VALUES (
    v_caller,
    COALESCE(v_caller_role, 'staff'),
    'data_access',
    'SENSITIVE_RECORD_ACCESSED',
    p_entity_table,
    p_entity_id::text,
    jsonb_build_object(
      'access_reason', p_access_reason,
      'timestamp', clock_timestamp()
    )
  ) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'status', 'logged',
    'audit_id', v_audit_id,
    'entity_table', p_entity_table,
    'entity_id', p_entity_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.workflow_assign_staff_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_revoke_staff_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_assign_staff_scope TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_log_security_alert TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_audit_sensitive_read TO authenticated;
