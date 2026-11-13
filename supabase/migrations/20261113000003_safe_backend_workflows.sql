-- Humanity Platform: Safe Backend Workflows & State Machine Procedures
-- Migration ID: 20261113000003_safe_backend_workflows.sql
-- Invariants: Server-side validation, idempotency, maker-checker enforcement, append-only audit.

-- 1. Workflow: Case State Machine Transition
CREATE OR REPLACE FUNCTION public.workflow_transition_case(
  p_case_id UUID,
  p_to_status case_status,
  p_justification TEXT,
  p_idempotency_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_current_status case_status;
  v_governorate_id VARCHAR(10);
  v_programme_code VARCHAR(10);
  v_assigned_worker UUID;
  v_created_by UUID;
  v_caller UUID := auth.uid();
  v_valid_transition BOOLEAN := FALSE;
BEGIN
  -- 1. Check Staff Active Status
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  -- 2. Fetch Case Details
  SELECT status, governorate_id, programme_code, assigned_caseworker_id, created_by
  INTO v_current_status, v_governorate_id, v_programme_code, v_assigned_worker, v_created_by
  FROM public.cases
  WHERE id = p_case_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_CASE_NOT_FOUND: Case ID % does not exist.', p_case_id;
  END IF;

  -- 3. Idempotency Check: if case is already in target status, return success
  IF v_current_status = p_to_status THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'idempotent', true,
      'case_id', p_case_id,
      'current_status', v_current_status
    );
  END IF;

  -- 4. Validate State Transitions
  CASE v_current_status
    WHEN 'draft' THEN
      v_valid_transition := (p_to_status = 'submitted');
    WHEN 'submitted' THEN
      v_valid_transition := (p_to_status = 'under_assessment');
    WHEN 'under_assessment' THEN
      v_valid_transition := (p_to_status IN ('pending_approval', 'draft'));
    WHEN 'pending_approval' THEN
      v_valid_transition := (p_to_status IN ('approved', 'rejected'));
    WHEN 'approved' THEN
      v_valid_transition := (p_to_status IN ('active_delivery', 'closed'));
    WHEN 'rejected' THEN
      v_valid_transition := (p_to_status IN ('reopened', 'closed'));
    WHEN 'active_delivery' THEN
      v_valid_transition := (p_to_status = 'closed');
    WHEN 'closed' THEN
      v_valid_transition := (p_to_status = 'reopened');
    WHEN 'reopened' THEN
      v_valid_transition := (p_to_status IN ('under_assessment', 'pending_approval'));
    ELSE
      v_valid_transition := FALSE;
  END CASE;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'ERR_INVALID_TRANSITION: Cannot transition case from % to %.', v_current_status, p_to_status;
  END IF;

  -- 5. Role and Authorization Enforcements
  IF p_to_status IN ('approved', 'rejected') THEN
    -- Caseworkers CANNOT approve or reject cases
    IF public.has_role(v_caller, 'caseworker') AND NOT public.has_any_role(v_caller, ARRAY['supervisor', 'programme_manager']::system_role[]) THEN
      RAISE EXCEPTION 'ERR_FORBIDDEN: Caseworkers are prohibited from approving or rejecting cases.';
    END IF;
  END IF;

  -- 6. Apply Transition
  UPDATE public.cases
  SET status = p_to_status,
      updated_at = clock_timestamp(),
      closed_at = CASE WHEN p_to_status = 'closed' THEN clock_timestamp() ELSE NULL END,
      closure_reason = CASE WHEN p_to_status = 'closed' THEN p_justification ELSE closure_reason END
  WHERE id = p_case_id;

  -- 7. Append Status History Log
  INSERT INTO public.case_status_history (
    case_id, from_status, to_status, changed_by, justification
  ) VALUES (
    p_case_id, v_current_status, p_to_status, v_caller, p_justification
  );

  -- 8. Append Security Audit Log
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    (SELECT role FROM public.staff_roles WHERE staff_id = v_caller AND is_active = true LIMIT 1)::text,
    'case_mutation',
    'CASE_STATUS_TRANSITION',
    'cases',
    p_case_id::text,
    jsonb_build_object(
      'from_status', v_current_status,
      'to_status', p_to_status,
      'idempotency_key', p_idempotency_key,
      'justification', p_justification
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'case_id', p_case_id,
    'previous_status', v_current_status,
    'current_status', p_to_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Workflow: Maker-Checker Dual-Authorization Decision
CREATE OR REPLACE FUNCTION public.workflow_maker_checker_approve(
  p_approval_id UUID,
  p_decision VARCHAR, -- 'approved' or 'rejected'
  p_comments TEXT,
  p_idempotency_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_maker_id UUID;
  v_case_id UUID;
  v_approval_type VARCHAR(32);
  v_status VARCHAR(32);
  v_caller UUID := auth.uid();
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  SELECT maker_id, case_id, approval_type, status
  INTO v_maker_id, v_case_id, v_approval_type, v_status
  FROM public.case_approvals
  WHERE id = p_approval_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_APPROVAL_NOT_FOUND: Approval record % does not exist.', p_approval_id;
  END IF;

  -- Idempotency Check
  IF v_status IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'idempotent', true,
      'approval_id', p_approval_id,
      'decision', v_status
    );
  END IF;

  -- Maker-Checker Strict Rule: Maker cannot approve own request!
  IF v_maker_id = v_caller THEN
    RAISE EXCEPTION 'ERR_SELF_APPROVAL_PROHIBITED: You cannot approve or check an item you created.';
  END IF;

  -- Role Check: Must be Supervisor or Programme Manager
  IF NOT public.has_any_role(v_caller, ARRAY['supervisor', 'programme_manager']::system_role[]) THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN: Dual-authorization requires supervisor or programme manager role.';
  END IF;

  -- Record Decision
  UPDATE public.case_approvals
  SET checker_id = v_caller,
      status = p_decision,
      comments = p_comments,
      decided_at = clock_timestamp()
  WHERE id = p_approval_id;

  -- If programme eligibility approved, advance case to 'approved'
  IF v_approval_type = 'programme_eligibility' AND p_decision = 'approved' THEN
    PERFORM public.workflow_transition_case(
      v_case_id,
      'approved'::case_status,
      'Dual-authorization approval verified by supervisor/checker: ' || p_comments,
      p_idempotency_key
    );
  END IF;

  -- Audit Log
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    'supervisor',
    'approval',
    'MAKER_CHECKER_DECISION',
    'case_approvals',
    p_approval_id::text,
    jsonb_build_object(
      'decision', p_decision,
      'maker_id', v_maker_id,
      'checker_id', v_caller,
      'case_id', v_case_id,
      'idempotency_key', p_idempotency_key
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'approval_id', p_approval_id,
    'decision', p_decision
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Workflow: Financial Disbursement Release
CREATE OR REPLACE FUNCTION public.workflow_disburse_finance(
  p_entitlement_id UUID,
  p_tx_reference VARCHAR,
  p_amount NUMERIC,
  p_currency VARCHAR,
  p_maker_id UUID,
  p_rationale TEXT,
  p_idempotency_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_authorized_amount NUMERIC(14,2);
  v_current_disbursed NUMERIC(14,2);
  v_caller UUID := auth.uid();
  v_new_tx_id UUID := gen_random_uuid();
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  -- Role Check: Caller must be Finance Checker
  IF NOT public.has_role(v_caller, 'finance_checker') THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN: Only finance_checker can authorize and release financial disbursements.';
  END IF;

  -- Maker-Checker Strict Rule
  IF p_maker_id = v_caller THEN
    RAISE EXCEPTION 'ERR_SELF_APPROVAL_PROHIBITED: Finance checker cannot disburse a transaction they prepared as maker.';
  END IF;

  -- Amount must be positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'ERR_INVALID_AMOUNT: Disbursement amount must be greater than zero.';
  END IF;

  -- Verify Entitlement Quota
  SELECT authorized_amount, disbursed_amount
  INTO v_authorized_amount, v_current_disbursed
  FROM public.assistance_entitlements
  WHERE id = p_entitlement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_ENTITLEMENT_NOT_FOUND: Entitlement % does not exist.', p_entitlement_id;
  END IF;

  IF (v_current_disbursed + p_amount) > v_authorized_amount THEN
    RAISE EXCEPTION 'ERR_QUOTA_EXCEEDED: Requested % % exceeds remaining quota of % %.',
      p_amount, p_currency, (v_authorized_amount - v_current_disbursed), p_currency;
  END IF;

  -- Insert Immutable Ledger Entry
  INSERT INTO public.finance_ledger (
    id, entitlement_id, transaction_type, transaction_reference,
    amount, currency, maker_id, checker_id, rationale, posted_at
  ) VALUES (
    v_new_tx_id, p_entitlement_id, 'disbursement', p_tx_reference,
    p_amount, p_currency, p_maker_id, v_caller, p_rationale, clock_timestamp()
  );

  -- Update Entitlement Disbursed Amount
  UPDATE public.assistance_entitlements
  SET disbursed_amount = disbursed_amount + p_amount
  WHERE id = p_entitlement_id;

  -- Audit Log
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
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
      'checker_id', v_caller,
      'idempotency_key', p_idempotency_key
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'transaction_id', v_new_tx_id,
    'disbursed_amount', p_amount,
    'remaining_quota', (v_authorized_amount - (v_current_disbursed + p_amount))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Workflow: Financial Reversal Accounting (Never UPDATE/DELETE posted records)
CREATE OR REPLACE FUNCTION public.workflow_reverse_finance(
  p_original_tx_id UUID,
  p_reversal_type VARCHAR, -- 'reversal_credit' or 'reversal_debit'
  p_rationale TEXT,
  p_idempotency_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_entitlement_id UUID;
  v_orig_amount NUMERIC(14,2);
  v_orig_currency VARCHAR(8);
  v_orig_maker UUID;
  v_caller UUID := auth.uid();
  v_reversal_tx_id UUID := gen_random_uuid();
  v_reversal_ref VARCHAR(64);
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  IF NOT public.has_role(v_caller, 'finance_checker') THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN: Only finance_checker can authorize reversal entries.';
  END IF;

  SELECT entitlement_id, amount, currency, maker_id
  INTO v_entitlement_id, v_orig_amount, v_orig_currency, v_orig_maker
  FROM public.finance_ledger
  WHERE id = p_original_tx_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_TRANSACTION_NOT_FOUND: Original transaction % does not exist.', p_original_tx_id;
  END IF;

  v_reversal_ref := 'REV-' || p_idempotency_key;

  -- Insert Compensating Reversal Entry
  INSERT INTO public.finance_ledger (
    id, entitlement_id, transaction_type, transaction_reference,
    amount, currency, maker_id, checker_id, reversal_of_transaction_id, rationale, posted_at
  ) VALUES (
    v_reversal_tx_id, v_entitlement_id, p_reversal_type, v_reversal_ref,
    v_orig_amount, v_orig_currency, v_orig_maker, v_caller, p_original_tx_id, p_rationale, clock_timestamp()
  );

  -- Adjust Entitlement balance accordingly
  IF p_reversal_type = 'reversal_credit' THEN
    UPDATE public.assistance_entitlements
    SET disbursed_amount = GREATEST(0, disbursed_amount - v_orig_amount)
    WHERE id = v_entitlement_id;
  END IF;

  -- Audit Log
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    'finance_checker',
    'financial',
    'FINANCIAL_TRANSACTION_REVERSED',
    'finance_ledger',
    v_reversal_tx_id::text,
    jsonb_build_object(
      'reversal_of_transaction_id', p_original_tx_id,
      'amount', v_orig_amount,
      'currency', v_orig_currency,
      'idempotency_key', p_idempotency_key,
      'rationale', p_rationale
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'reversal_transaction_id', v_reversal_tx_id,
    'reversed_amount', v_orig_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Workflow: Safe Offline Sync Ingest (Strictly Reject Offline Financial Approvals)
CREATE OR REPLACE FUNCTION public.workflow_ingest_sync_mutation(
  p_idempotency_key VARCHAR,
  p_device_id VARCHAR,
  p_mutation_type VARCHAR,
  p_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_existing_id UUID;
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  -- Invariant: Strictly forbid offline financial disbursements or case approvals
  IF p_mutation_type IN ('DISBURSE_FINANCE', 'APPROVE_CASE', 'APPROVE_FINANCE') THEN
    RAISE EXCEPTION 'ERR_OFFLINE_FORBIDDEN: Financial and approval actions are structurally forbidden offline.';
  END IF;

  -- Idempotency Check: if mutation already recorded, return existing status
  SELECT id INTO v_existing_id
  FROM public.sync_mutations
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'already_applied',
      'idempotent', true,
      'mutation_id', v_existing_id
    );
  END IF;

  -- Record Mutation
  INSERT INTO public.sync_mutations (
    idempotency_key, device_id, caseworker_id, mutation_type, payload, status
  ) VALUES (
    p_idempotency_key, p_device_id, v_caller, p_mutation_type, p_payload, 'applied'
  ) RETURNING id INTO v_existing_id;

  -- Audit Log
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    'caseworker',
    'case_mutation',
    'OFFLINE_SYNC_INGESTED',
    'sync_mutations',
    v_existing_id::text,
    jsonb_build_object(
      'idempotency_key', p_idempotency_key,
      'device_id', p_device_id,
      'mutation_type', p_mutation_type
    )
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'mutation_id', v_existing_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution privileges on safe workflows to authenticated users
GRANT EXECUTE ON FUNCTION public.workflow_transition_case(UUID, case_status, TEXT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_maker_checker_approve(UUID, VARCHAR, TEXT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_disburse_finance(UUID, VARCHAR, NUMERIC, VARCHAR, UUID, TEXT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_reverse_finance(UUID, VARCHAR, TEXT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_ingest_sync_mutation(VARCHAR, VARCHAR, VARCHAR, JSONB) TO authenticated;

