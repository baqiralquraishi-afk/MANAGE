-- Humanity Platform: Case Assignment, Document Access Auditing & Financial Reconciliation Workflows
-- Migration ID: 20261113000004_case_assignment_and_reconciliation.sql
-- Invariants: Server-side validation, least-privilege scoping, audit trails.

-- 1. Workflow: Case Assignment by Supervisor
CREATE OR REPLACE FUNCTION public.workflow_assign_case(
  p_case_id UUID,
  p_caseworker_id UUID,
  p_notes TEXT,
  p_idempotency_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_case_gov VARCHAR(10);
  v_caller UUID := auth.uid();
  v_worker_active BOOLEAN;
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  -- Role Check: Caller must be Supervisor or Programme Manager
  IF NOT public.has_any_role(v_caller, ARRAY['supervisor', 'programme_manager']::system_role[]) THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN: Only supervisors and programme managers can assign cases.';
  END IF;

  -- Fetch Case Details
  SELECT governorate_id INTO v_case_gov
  FROM public.cases
  WHERE id = p_case_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_CASE_NOT_FOUND: Case % does not exist.', p_case_id;
  END IF;

  -- Geographic Scope Check for Supervisor
  IF NOT public.has_governorate_access(v_caller, v_case_gov) THEN
    RAISE EXCEPTION 'ERR_SCOPE_DENIED: Supervisor does not have authority over governorate %.', v_case_gov;
  END IF;

  -- Validate Target Caseworker
  IF NOT public.has_role(p_caseworker_id, 'caseworker') THEN
    RAISE EXCEPTION 'ERR_INVALID_ASSIGNEE: Target staff member does not have active caseworker role.';
  END IF;

  IF NOT public.has_governorate_access(p_caseworker_id, v_case_gov) THEN
    RAISE EXCEPTION 'ERR_ASSIGNEE_OUT_OF_SCOPE: Caseworker is not assigned to governorate %.', v_case_gov;
  END IF;

  -- Update Case Assignment
  UPDATE public.cases
  SET assigned_caseworker_id = p_caseworker_id,
      updated_at = clock_timestamp()
  WHERE id = p_case_id;

  -- Append Audit Log
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    'supervisor',
    'case_mutation',
    'CASE_ASSIGNMENT',
    'cases',
    p_case_id::text,
    jsonb_build_object(
      'assigned_caseworker_id', p_caseworker_id,
      'governorate_id', v_case_gov,
      'notes', p_notes,
      'idempotency_key', p_idempotency_key
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'case_id', p_case_id,
    'assigned_caseworker_id', p_caseworker_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Workflow: Audited Document Access Request
CREATE OR REPLACE FUNCTION public.workflow_request_document_access(
  p_document_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_beneficiary_id UUID;
  v_case_id UUID;
  v_storage_path TEXT;
  v_gov_id VARCHAR(10);
  v_caller UUID := auth.uid();
  v_has_access BOOLEAN := FALSE;
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  SELECT dm.beneficiary_id, dm.case_id, dm.storage_path, b.governorate_id
  INTO v_beneficiary_id, v_case_id, v_storage_path, v_gov_id
  FROM public.document_metadata dm
  JOIN public.beneficiaries b ON b.id = dm.beneficiary_id
  WHERE dm.id = p_document_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_DOCUMENT_NOT_FOUND: Document metadata % does not exist.', p_document_id;
  END IF;

  -- Evaluate Permission
  IF public.has_role(v_caller, 'auditor') THEN
    v_has_access := TRUE;
  ELSIF public.has_any_role(v_caller, ARRAY['supervisor', 'intake', 'programme_manager']::system_role[]) AND public.has_governorate_access(v_caller, v_gov_id) THEN
    v_has_access := TRUE;
  ELSIF public.has_role(v_caller, 'caseworker') THEN
    IF v_case_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.cases
        WHERE id = v_case_id AND (assigned_caseworker_id = v_caller OR created_by = v_caller)
      ) INTO v_has_access;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM public.beneficiaries
        WHERE id = v_beneficiary_id AND created_by = v_caller
      ) INTO v_has_access;
    END IF;
  END IF;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'ERR_DOCUMENT_FORBIDDEN: You do not have permission to access this private document.';
  END IF;

  -- Append Audit Log for Document Access
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    (SELECT role FROM public.staff_roles WHERE staff_id = v_caller AND is_active = true LIMIT 1)::text,
    'document',
    'DOCUMENT_ACCESS_REQUESTED',
    'document_metadata',
    p_document_id::text,
    jsonb_build_object(
      'beneficiary_id', v_beneficiary_id,
      'case_id', v_case_id,
      'storage_path', v_storage_path
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'access_granted', true,
    'storage_path', v_storage_path,
    'expires_in_seconds', 900
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Workflow: Financial Batch Reconciliation
CREATE OR REPLACE FUNCTION public.workflow_reconcile_finance_batch(
  p_entitlement_id UUID,
  p_external_bank_ref VARCHAR,
  p_reconciliation_notes TEXT,
  p_idempotency_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_disbursed NUMERIC(14,2);
  v_currency VARCHAR(8);
  v_reconciled_tx_id UUID := gen_random_uuid();
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  IF NOT public.has_role(v_caller, 'finance_checker') THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN: Only finance_checker can reconcile financial batches.';
  END IF;

  SELECT disbursed_amount, currency
  INTO v_disbursed, v_currency
  FROM public.assistance_entitlements
  WHERE id = p_entitlement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_ENTITLEMENT_NOT_FOUND: Entitlement % does not exist.', p_entitlement_id;
  END IF;

  -- Insert Reconciliation Audit Record
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    'finance_checker',
    'financial',
    'FINANCE_BATCH_RECONCILED',
    'assistance_entitlements',
    p_entitlement_id::text,
    jsonb_build_object(
      'external_bank_ref', p_external_bank_ref,
      'reconciled_amount', v_disbursed,
      'currency', v_currency,
      'notes', p_reconciliation_notes,
      'idempotency_key', p_idempotency_key
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'entitlement_id', p_entitlement_id,
    'reconciled_amount', v_disbursed,
    'external_bank_ref', p_external_bank_ref
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grants
GRANT EXECUTE ON FUNCTION public.workflow_assign_case(UUID, UUID, TEXT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_request_document_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_reconcile_finance_batch(UUID, VARCHAR, TEXT, VARCHAR) TO authenticated;

