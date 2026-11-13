-- ============================================================================
-- Migration 08: Encrypted Offline Sync, Bounded Caching & Conflict Resolution
-- Humanity Platform (Iraq Operations)
--
-- Implements ADR-003:
-- 1. Bounded caching limits: maximum 50 assigned cases, max 100 unsent drafts, 72h retention horizon
-- 2. Complete segregation: Structural prohibition of offline approvals and payments
-- 3. Idempotent mutation ingestion with schema versioning and server reauthorization
-- 4. Human-in-the-loop conflict resolution without silent server overwrites
-- ============================================================================

-- 1. Extend sync_mutations table with schema versioning and conflict pointers
ALTER TABLE public.sync_mutations 
  ADD COLUMN IF NOT EXISTS schema_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_server_version BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entity_table VARCHAR(64),
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Performance indexes for sync status lookups
CREATE INDEX IF NOT EXISTS idx_sync_mutations_status ON public.sync_mutations (status, caseworker_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON public.sync_conflicts (status, entity_table, entity_id);

-- 3. Update sync_conflicts policy to allow programme_manager access in addition to supervisor/security_admin
DROP POLICY IF EXISTS pol_sync_conflicts_programme_manager ON public.sync_conflicts;
CREATE POLICY pol_sync_conflicts_programme_manager ON public.sync_conflicts
  FOR ALL TO authenticated
  USING (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['supervisor', 'programme_manager', 'security_admin']::system_role[])
  )
  WITH CHECK (
    public.is_staff_active(auth.uid()) AND
    public.has_any_role(auth.uid(), ARRAY['supervisor', 'programme_manager', 'security_admin']::system_role[])
  );

-- 4. Function: workflow_ingest_sync_mutation_v2
-- Reauthorizes active caseworker, strictly denies offline financial/approval actions,
-- enforces schema versioning, detects server-side conflicts, and maintains audit trail.
CREATE OR REPLACE FUNCTION public.workflow_ingest_sync_mutation_v2(
  p_idempotency_key VARCHAR(64),
  p_device_id VARCHAR(64),
  p_mutation_type VARCHAR(64),
  p_entity_table VARCHAR(64),
  p_entity_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_base_server_version BIGINT DEFAULT 0,
  p_schema_version INT DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_existing_id UUID;
  v_existing_status VARCHAR(32);
  v_mutation_id UUID;
  v_conflict_id UUID;
  v_server_row JSONB;
  v_server_updated_at TIMESTAMPTZ;
  v_conflict_detected BOOLEAN := false;
BEGIN
  -- Security check: caller must be active staff
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  -- Structural Prohibition: Offline financial disbursements, payments, and approvals are prohibited
  IF p_mutation_type IN (
    'APPROVE_CASE',
    'REJECT_CASE',
    'APPROVE_FINANCE',
    'DISBURSE_FINANCE',
    'POST_LEDGER_ENTRY',
    'RELEASE_PAYMENT',
    'APPROVE_FINANCIAL_ENTITLEMENT'
  ) THEN
    RAISE EXCEPTION 'ERR_OFFLINE_FORBIDDEN: Financial and approval actions are structurally forbidden offline.';
  END IF;

  -- Schema version validation
  IF p_schema_version < 1 THEN
    RAISE EXCEPTION 'ERR_SCHEMA_VERSION_INVALID: Schema version must be >= 1.';
  END IF;

  -- Idempotency check: if mutation already recorded, return existing status
  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.sync_mutations
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'already_applied',
      'idempotent', true,
      'mutation_id', v_existing_id,
      'mutation_status', v_existing_status
    );
  END IF;

  -- Conflict Detection: Check whether target record has been updated since baseServerVersion
  IF p_entity_id IS NOT NULL AND p_base_server_version > 0 THEN
    IF p_entity_table = 'beneficiaries' THEN
      SELECT row_to_json(b)::jsonb, b.updated_at INTO v_server_row, v_server_updated_at
      FROM public.beneficiaries b WHERE b.id = p_entity_id;
    ELSIF p_entity_table = 'cases' THEN
      SELECT row_to_json(c)::jsonb, c.updated_at INTO v_server_row, v_server_updated_at
      FROM public.cases c WHERE c.id = p_entity_id;
    ELSIF p_entity_table = 'caseworker_visits' THEN
      SELECT row_to_json(cv)::jsonb, cv.created_at INTO v_server_row, v_server_updated_at
      FROM public.caseworker_visits cv WHERE cv.id = p_entity_id;
    ELSIF p_entity_table = 'appointments' THEN
      SELECT row_to_json(a)::jsonb, a.updated_at INTO v_server_row, v_server_updated_at
      FROM public.appointments a WHERE a.id = p_entity_id;
    END IF;

    -- If server record was updated after client snapshot, flag conflict
    IF v_server_row IS NOT NULL AND v_server_updated_at > to_timestamp(p_base_server_version / 1000.0) THEN
      v_conflict_detected := true;
    END IF;
  END IF;

  -- If conflict detected, preserve server state and create conflict record
  IF v_conflict_detected THEN
    INSERT INTO public.sync_mutations (
      idempotency_key, device_id, caseworker_id, mutation_type, payload, status,
      schema_version, base_server_version, entity_table, entity_id
    ) VALUES (
      p_idempotency_key, p_device_id, v_caller, p_mutation_type, p_payload, 'conflict',
      p_schema_version, p_base_server_version, p_entity_table, p_entity_id
    ) RETURNING id INTO v_mutation_id;

    INSERT INTO public.sync_conflicts (
      mutation_id, entity_table, entity_id, server_state, client_state, status
    ) VALUES (
      v_mutation_id, p_entity_table, p_entity_id, v_server_row, p_payload, 'unresolved'
    ) RETURNING id INTO v_conflict_id;

    INSERT INTO public.audit_logs (
      actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
    ) VALUES (
      v_caller,
      'caseworker',
      'case_mutation',
      'SYNC_CONFLICT_DETECTED',
      'sync_conflicts',
      v_conflict_id::text,
      jsonb_build_object(
        'mutation_id', v_mutation_id,
        'entity_table', p_entity_table,
        'entity_id', p_entity_id,
        'base_server_version', p_base_server_version,
        'server_updated_at', v_server_updated_at
      )
    );

    RETURN jsonb_build_object(
      'status', 'conflict',
      'mutation_id', v_mutation_id,
      'conflict_id', v_conflict_id,
      'message', 'Server record was modified after client base version. Preserved on server; routed to human resolution.'
    );
  END IF;

  -- No conflict: Apply valid offline changes according to mutation type
  IF p_mutation_type IN ('LOG_VISIT', 'LOG_CASE_NOTE') AND p_entity_id IS NOT NULL THEN
    INSERT INTO public.caseworker_visits (
      case_id, caseworker_id, visit_date, notes
    ) VALUES (
      p_entity_id,
      v_caller,
      CURRENT_DATE,
      COALESCE(p_payload->>'notesAr', p_payload->>'notes', p_payload->>'description', 'زيارة ميدانية مسجلة بدون اتصال')
    );
  ELSIF p_mutation_type = 'UPDATE_APPOINTMENT' AND p_entity_id IS NOT NULL THEN
    UPDATE public.appointments
    SET status = COALESCE(p_payload->>'status', status),
        notes = COALESCE(p_payload->>'notes', notes),
        updated_at = clock_timestamp()
    WHERE id = p_entity_id;
  END IF;

  -- Record mutation as accepted
  INSERT INTO public.sync_mutations (
    idempotency_key, device_id, caseworker_id, mutation_type, payload, status,
    schema_version, base_server_version, entity_table, entity_id
  ) VALUES (
    p_idempotency_key, p_device_id, v_caller, p_mutation_type, p_payload, 'accepted',
    p_schema_version, p_base_server_version, p_entity_table, p_entity_id
  ) RETURNING id INTO v_mutation_id;

  -- Audit log
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    'caseworker',
    'case_mutation',
    'OFFLINE_SYNC_ACCEPTED',
    'sync_mutations',
    v_mutation_id::text,
    jsonb_build_object(
      'idempotency_key', p_idempotency_key,
      'device_id', p_device_id,
      'mutation_type', p_mutation_type,
      'schema_version', p_schema_version
    )
  );

  RETURN jsonb_build_object(
    'status', 'accepted',
    'mutation_id', v_mutation_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Function: workflow_resolve_sync_conflict
-- Requires supervisor, programme_manager, or security_admin role.
-- Requires minimum 10-character resolution notes for auditability.
CREATE OR REPLACE FUNCTION public.workflow_resolve_sync_conflict(
  p_conflict_id UUID,
  p_resolution VARCHAR(32),
  p_resolution_notes TEXT,
  p_merged_payload JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_conflict RECORD;
BEGIN
  -- Security check: caller must be active staff
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  -- Segregation of Duties: caseworkers cannot resolve their own sync conflicts
  IF NOT public.has_any_role(v_caller, ARRAY['supervisor', 'programme_manager', 'security_admin']::system_role[]) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Only supervisors, programme managers, or security admins can resolve sync conflicts.';
  END IF;

  -- Audit constraint: detailed resolution justification is mandatory
  IF length(trim(COALESCE(p_resolution_notes, ''))) < 10 THEN
    RAISE EXCEPTION 'ERR_INVALID_INPUT: Resolution notes must be at least 10 characters for audit compliance.';
  END IF;

  -- Valid resolution types
  IF p_resolution NOT IN ('use_server', 'use_client', 'manual_merge') THEN
    RAISE EXCEPTION 'ERR_INVALID_RESOLUTION: Resolution must be use_server, use_client, or manual_merge.';
  END IF;

  SELECT * INTO v_conflict
  FROM public.sync_conflicts
  WHERE id = p_conflict_id AND status = 'unresolved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_NOT_FOUND: Unresolved sync conflict not found.';
  END IF;

  -- Apply chosen resolution to entity
  IF p_resolution = 'use_client' THEN
    IF v_conflict.entity_table = 'beneficiaries' THEN
      UPDATE public.beneficiaries
      SET phone_primary = COALESCE(v_conflict.client_state->>'phonePrimary', phone_primary),
          address_details = COALESCE(v_conflict.client_state->>'addressDetails', address_details),
          updated_at = clock_timestamp()
      WHERE id = v_conflict.entity_id;
    ELSIF v_conflict.entity_table = 'appointments' THEN
      UPDATE public.appointments
      SET status = COALESCE(v_conflict.client_state->>'status', status),
          notes = COALESCE(v_conflict.client_state->>'notes', notes),
          updated_at = clock_timestamp()
      WHERE id = v_conflict.entity_id;
    END IF;
  ELSIF p_resolution = 'manual_merge' AND p_merged_payload IS NOT NULL AND p_merged_payload <> '{}'::jsonb THEN
    IF v_conflict.entity_table = 'beneficiaries' THEN
      UPDATE public.beneficiaries
      SET phone_primary = COALESCE(p_merged_payload->>'phonePrimary', phone_primary),
          address_details = COALESCE(p_merged_payload->>'addressDetails', address_details),
          updated_at = clock_timestamp()
      WHERE id = v_conflict.entity_id;
    ELSIF v_conflict.entity_table = 'appointments' THEN
      UPDATE public.appointments
      SET status = COALESCE(p_merged_payload->>'status', status),
          notes = COALESCE(p_merged_payload->>'notes', notes),
          updated_at = clock_timestamp()
      WHERE id = v_conflict.entity_id;
    END IF;
  END IF;

  -- Update sync conflict record
  UPDATE public.sync_conflicts
  SET status = 'resolved_' || p_resolution,
      resolved_by = v_caller,
      resolved_at = clock_timestamp(),
      resolution_notes = p_resolution_notes
  WHERE id = p_conflict_id;

  -- Update mutation status
  UPDATE public.sync_mutations
  SET status = 'resolved'
  WHERE id = v_conflict.mutation_id;

  -- Audit trail
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    'supervisor',
    'case_mutation',
    'SYNC_CONFLICT_RESOLVED',
    'sync_conflicts',
    p_conflict_id::text,
    jsonb_build_object(
      'resolution', p_resolution,
      'entity_table', v_conflict.entity_table,
      'entity_id', v_conflict.entity_id,
      'notes', p_resolution_notes
    )
  );

  RETURN jsonb_build_object(
    'status', 'resolved',
    'conflict_id', p_conflict_id,
    'resolution', p_resolution
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Function: get_caseworker_assigned_cases_offline_batch
-- Capped at maximum 50 cases strictly assigned to the calling caseworker.
-- Enforces data minimization: bulk downloads are structurally blocked.
CREATE OR REPLACE FUNCTION public.get_caseworker_assigned_cases_offline_batch(
  p_limit INT DEFAULT 50
) RETURNS TABLE (
  case_id UUID,
  case_reference VARCHAR(32),
  programme_code VARCHAR(10),
  status case_status,
  priority VARCHAR(16),
  governorate_id VARCHAR(10),
  beneficiary_id UUID,
  beneficiary_name_ar VARCHAR(255),
  beneficiary_phone VARCHAR(32),
  last_updated TIMESTAMPTZ
) AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_capped_limit INT := LEAST(COALESCE(p_limit, 50), 50);
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  RETURN QUERY
  SELECT 
    c.id AS case_id,
    c.case_reference,
    c.programme_code,
    c.status,
    c.priority,
    c.governorate_id,
    b.id AS beneficiary_id,
    b.full_name_ar::varchar(255) AS beneficiary_name_ar,
    b.phone_primary AS beneficiary_phone,
    c.updated_at AS last_updated
  FROM public.cases c
  JOIN public.beneficiaries b ON b.id = c.beneficiary_id
  WHERE c.assigned_caseworker_id = v_caller
  ORDER BY c.updated_at DESC
  LIMIT v_capped_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Grant execution privileges to authenticated users
GRANT EXECUTE ON FUNCTION public.workflow_ingest_sync_mutation_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_resolve_sync_conflict TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_caseworker_assigned_cases_offline_batch TO authenticated;
