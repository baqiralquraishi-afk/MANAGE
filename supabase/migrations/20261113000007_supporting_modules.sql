-- Migration: 20261113000007_supporting_modules.sql
-- Purpose: Supporting Modules: Authorized private document upload & temporary download,
--          appointment scheduling and lifecycle, in-app notifications, and scoped operational
--          reporting with k-anonymity small-group suppression and auditable exports.

-- 1. Enhance document_metadata Table with Security, Retention & Legal-Hold Columns
ALTER TABLE document_metadata
  ADD COLUMN IF NOT EXISTS virus_scan_status VARCHAR(32) NOT NULL DEFAULT 'clean',
  ADD COLUMN IF NOT EXISTS checksum_sha256 VARCHAR(64),
  ADD COLUMN IF NOT EXISTS is_legal_hold BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ DEFAULT (clock_timestamp() + interval '5 years');

-- Legal-Hold Protection Trigger (Interprets and blocks deletions of documents under legal hold)
CREATE OR REPLACE FUNCTION trg_protect_legal_hold_documents()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_legal_hold IS TRUE THEN
    RAISE EXCEPTION 'ERR_LEGAL_HOLD_ACTIVE: Document % is subject to an active legal hold and cannot be deleted or purged.', OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_metadata_legal_hold ON document_metadata;
CREATE TRIGGER trg_document_metadata_legal_hold
  BEFORE DELETE ON document_metadata
  FOR EACH ROW
  EXECUTE FUNCTION trg_protect_legal_hold_documents();

-- 2. Temporary Signed Download Tokens Table (TTL-Enforced Private Document Access)
CREATE TABLE IF NOT EXISTS document_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES document_metadata(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE document_access_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_tokens_select ON document_access_tokens;
CREATE POLICY pol_tokens_select ON document_access_tokens
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

-- 3. In-App Notifications Table (Strictly In-App; No External Messaging)
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  message_en TEXT NOT NULL,
  category VARCHAR(32) NOT NULL DEFAULT 'system',
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_notifications_select ON in_app_notifications;
CREATE POLICY pol_notifications_select ON in_app_notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS pol_notifications_update ON in_app_notifications;
CREATE POLICY pol_notifications_update ON in_app_notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- 4. Workflow: Register Document Metadata & Validate File Upload Constraints
CREATE OR REPLACE FUNCTION public.workflow_register_document_metadata(
  p_beneficiary_id UUID,
  p_case_id UUID,
  p_document_category VARCHAR,
  p_storage_path TEXT,
  p_file_name_original TEXT,
  p_mime_type VARCHAR,
  p_file_size_bytes BIGINT,
  p_checksum_sha256 VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_caller_role VARCHAR(50);
  v_beneficiary RECORD;
  v_case RECORD;
  v_doc_id UUID;
  v_has_scope BOOLEAN := false;
BEGIN
  -- A. Authenticated Staff Check
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  SELECT role INTO v_caller_role FROM public.staff_roles WHERE staff_id = v_caller AND is_active = true LIMIT 1;

  -- B. File Type & Size Validation (Max 10MB; Allowed: PDF, JPEG, PNG, WebP)
  IF p_mime_type NOT IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') THEN
    RAISE EXCEPTION 'ERR_INVALID_FILE_TYPE: File type % is disallowed. Only PDF, JPEG, PNG, and WebP documents are permitted.', p_mime_type;
  END IF;

  IF p_file_size_bytes <= 0 OR p_file_size_bytes > 10485760 THEN
    RAISE EXCEPTION 'ERR_FILE_TOO_LARGE: File size (% bytes) exceeds maximum permitted limit of 10MB.', p_file_size_bytes;
  END IF;

  -- C. Opaque Path Validation (Forbid directory traversal and raw path injection)
  IF p_storage_path LIKE '%..%' OR p_storage_path LIKE '%//%' OR LENGTH(p_storage_path) < 5 THEN
    RAISE EXCEPTION 'ERR_INVALID_STORAGE_PATH: Storage path must be opaque and cannot contain directory traversal sequences.';
  END IF;

  -- D. Scope & Case Authorization Check
  SELECT * INTO v_beneficiary FROM public.beneficiaries WHERE id = p_beneficiary_id;
  IF v_beneficiary.id IS NULL THEN
    RAISE EXCEPTION 'ERR_BENEFICIARY_NOT_FOUND: Beneficiary does not exist.';
  END IF;

  IF p_case_id IS NOT NULL THEN
    SELECT * INTO v_case FROM public.cases WHERE id = p_case_id;
    IF v_case.id IS NULL THEN
      RAISE EXCEPTION 'ERR_CASE_NOT_FOUND: Case does not exist.';
    END IF;

    -- Caseworker must be assigned or creator
    IF v_caller_role = 'caseworker' THEN
      v_has_scope := (v_case.assigned_caseworker_id = v_caller OR v_case.created_by = v_caller);
    ELSIF v_caller_role IN ('supervisor', 'intake', 'security_admin') THEN
      v_has_scope := public.has_governorate_access(v_caller, v_case.governorate_id);
    ELSIF v_caller_role = 'programme_manager' THEN
      v_has_scope := public.has_programme_access(v_caller, v_case.programme_code);
    ELSIF v_caller_role = 'auditor' THEN
      v_has_scope := true;
    END IF;
  ELSE
    IF v_caller_role = 'caseworker' THEN
      v_has_scope := (v_beneficiary.created_by = v_caller);
    ELSIF v_caller_role IN ('supervisor', 'intake', 'security_admin') THEN
      v_has_scope := public.has_governorate_access(v_caller, v_beneficiary.governorate_id);
    ELSE
      v_has_scope := true;
    END IF;
  END IF;

  IF NOT v_has_scope THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN_SCOPE: Staff lacks authorization to attach documents to this record.';
  END IF;

  -- E. Insert Document Metadata
  INSERT INTO public.document_metadata (
    beneficiary_id,
    case_id,
    document_category,
    storage_bucket,
    storage_path,
    file_name_original,
    mime_type,
    file_size_bytes,
    uploaded_by,
    virus_scan_status,
    checksum_sha256
  ) VALUES (
    p_beneficiary_id,
    p_case_id,
    p_document_category,
    'documents-private',
    p_storage_path,
    p_file_name_original,
    p_mime_type,
    p_file_size_bytes,
    v_caller,
    'clean',
    p_checksum_sha256
  ) RETURNING id INTO v_doc_id;

  -- F. Audit Trail (NEVER log document content; metadata only)
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    v_caller_role,
    'document',
    'DOCUMENT_METADATA_REGISTERED',
    'document_metadata',
    v_doc_id::text,
    jsonb_build_object(
      'category', p_document_category,
      'mime_type', p_mime_type,
      'file_size_bytes', p_file_size_bytes,
      'storage_path', p_storage_path,
      'checksum_sha256', p_checksum_sha256
    )
  );

  RETURN jsonb_build_object(
    'document_id', v_doc_id,
    'storage_path', p_storage_path,
    'status', 'registered'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Workflow: Request Temporary Signed Download Token (Audited & TTL-Bound)
CREATE OR REPLACE FUNCTION public.workflow_request_document_download(
  p_document_id UUID,
  p_expires_in_seconds INT DEFAULT 300
)
RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_caller_role VARCHAR(50);
  v_doc RECORD;
  v_token VARCHAR(64);
  v_expires_at TIMESTAMPTZ;
  v_ttl INT;
  v_has_access BOOLEAN := false;
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  SELECT role INTO v_caller_role FROM public.staff_roles WHERE staff_id = v_caller AND is_active = true LIMIT 1;

  SELECT dm.*, b.governorate_id AS ben_gov, c.governorate_id AS case_gov, c.programme_code AS case_prog,
         c.assigned_caseworker_id, c.created_by AS case_creator
  INTO v_doc
  FROM public.document_metadata dm
  JOIN public.beneficiaries b ON b.id = dm.beneficiary_id
  LEFT JOIN public.cases c ON c.id = dm.case_id
  WHERE dm.id = p_document_id;

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'ERR_DOCUMENT_NOT_FOUND: Document metadata % does not exist.', p_document_id;
  END IF;

  IF v_doc.virus_scan_status = 'flagged' THEN
    RAISE EXCEPTION 'ERR_DOCUMENT_QUARANTINED: Document flagged as unsafe by malware inspection tools.';
  END IF;

  -- Permission Evaluation
  IF v_caller_role = 'auditor' THEN
    v_has_access := true;
  ELSIF v_caller_role IN ('supervisor', 'intake', 'security_admin') THEN
    v_has_access := public.has_governorate_access(v_caller, COALESCE(v_doc.case_gov, v_doc.ben_gov));
  ELSIF v_caller_role = 'programme_manager' THEN
    v_has_access := (v_doc.case_prog IS NULL OR public.has_programme_access(v_caller, v_doc.case_prog));
  ELSIF v_caller_role = 'caseworker' THEN
    IF v_doc.case_id IS NOT NULL THEN
      v_has_access := (v_doc.assigned_caseworker_id = v_caller OR v_doc.case_creator = v_caller);
    ELSE
      v_has_access := (v_doc.uploaded_by = v_caller);
    END IF;
  END IF;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'ERR_DOCUMENT_FORBIDDEN: You do not have permission to download this private document.';
  END IF;

  -- Enforce TTL (Min 60s, Max 900s)
  v_ttl := GREATEST(60, LEAST(900, COALESCE(p_expires_in_seconds, 300)));
  v_expires_at := clock_timestamp() + (v_ttl || ' seconds')::interval;

  -- Generate secure random hex token
  v_token := md5(gen_random_uuid()::text || clock_timestamp()::text) || md5(v_caller::text || p_document_id::text);

  INSERT INTO public.document_access_tokens (
    document_id, requested_by, token, expires_at
  ) VALUES (
    p_document_id, v_caller, v_token, v_expires_at
  );

  -- Audit Access Request
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    v_caller_role,
    'document',
    'DOCUMENT_DOWNLOAD_TOKEN_ISSUED',
    'document_metadata',
    p_document_id::text,
    jsonb_build_object(
      'token', v_token,
      'expires_at', v_expires_at,
      'file_name', v_doc.file_name_original,
      'storage_path', v_doc.storage_path
    )
  );

  RETURN jsonb_build_object(
    'token', v_token,
    'storage_path', v_doc.storage_path,
    'expires_at', v_expires_at,
    'file_name', v_doc.file_name_original,
    'mime_type', v_doc.mime_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Workflow: Verify Download Token (Enforces Expiration)
CREATE OR REPLACE FUNCTION public.workflow_verify_download_token(
  p_token VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_token_rec RECORD;
BEGIN
  SELECT * INTO v_token_rec
  FROM public.document_access_tokens
  WHERE token = p_token;

  IF v_token_rec.id IS NULL OR v_token_rec.expires_at < clock_timestamp() THEN
    RAISE EXCEPTION 'ERR_DOWNLOAD_LINK_EXPIRED: Signed document access token has expired or is invalid.';
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'document_id', v_token_rec.document_id,
    'requested_by', v_token_rec.requested_by,
    'expires_at', v_token_rec.expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Workflow: Appointment Scheduling & Permissions
CREATE OR REPLACE FUNCTION public.workflow_schedule_appointment(
  p_case_id UUID,
  p_scheduled_time TIMESTAMPTZ,
  p_location_type VARCHAR,
  p_officer_id UUID,
  p_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_caller_role VARCHAR(50);
  v_case RECORD;
  v_appt_id UUID;
  v_has_access BOOLEAN := false;
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  SELECT role INTO v_caller_role FROM public.staff_roles WHERE staff_id = v_caller AND is_active = true LIMIT 1;

  SELECT * INTO v_case FROM public.cases WHERE id = p_case_id;
  IF v_case.id IS NULL THEN
    RAISE EXCEPTION 'ERR_CASE_NOT_FOUND: Case does not exist.';
  END IF;

  -- Scope Check
  IF v_caller_role = 'caseworker' THEN
    v_has_access := (v_case.assigned_caseworker_id = v_caller OR v_case.created_by = v_caller);
  ELSIF v_caller_role IN ('supervisor', 'intake', 'security_admin') THEN
    v_has_access := public.has_governorate_access(v_caller, v_case.governorate_id);
  ELSIF v_caller_role = 'programme_manager' THEN
    v_has_access := public.has_programme_access(v_caller, v_case.programme_code);
  END IF;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'ERR_APPOINTMENT_FORBIDDEN: Caller is not authorized to schedule appointments for this case.';
  END IF;

  -- Date Validation (Cannot schedule in the distant past)
  IF p_scheduled_time < (clock_timestamp() - interval '1 hour') THEN
    RAISE EXCEPTION 'ERR_INVALID_SCHEDULE_TIME: Appointment cannot be scheduled in the past.';
  END IF;

  INSERT INTO public.appointments (
    case_id, scheduled_time, location_type, status, officer_id, notes
  ) VALUES (
    p_case_id, p_scheduled_time, p_location_type, 'scheduled', p_officer_id, p_notes
  ) RETURNING id INTO v_appt_id;

  -- Audit Trail
  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    v_caller_role,
    'appointment',
    'APPOINTMENT_SCHEDULED',
    'appointments',
    v_appt_id::text,
    jsonb_build_object(
      'case_id', p_case_id,
      'scheduled_time', p_scheduled_time,
      'location_type', p_location_type,
      'officer_id', p_officer_id
    )
  );

  RETURN jsonb_build_object(
    'appointment_id', v_appt_id,
    'case_id', p_case_id,
    'scheduled_time', p_scheduled_time,
    'status', 'scheduled'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Workflow: Update Appointment Status
CREATE OR REPLACE FUNCTION public.workflow_update_appointment_status(
  p_appointment_id UUID,
  p_new_status VARCHAR,
  p_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_caller_role VARCHAR(50);
  v_appt RECORD;
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  SELECT role INTO v_caller_role FROM public.staff_roles WHERE staff_id = v_caller AND is_active = true LIMIT 1;

  IF p_new_status NOT IN ('completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'ERR_INVALID_STATUS: Invalid status %. Allowed: completed, cancelled, no_show.', p_new_status;
  END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id;
  IF v_appt.id IS NULL THEN
    RAISE EXCEPTION 'ERR_APPOINTMENT_NOT_FOUND: Appointment % does not exist.', p_appointment_id;
  END IF;

  UPDATE public.appointments
  SET status = p_new_status,
      notes = COALESCE(p_notes, notes)
  WHERE id = p_appointment_id;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    v_caller_role,
    'appointment',
    'APPOINTMENT_STATUS_UPDATED',
    'appointments',
    p_appointment_id::text,
    jsonb_build_object(
      'from_status', v_appt.status,
      'to_status', p_new_status,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object(
    'appointment_id', p_appointment_id,
    'status', p_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Workflow: In-App Notifications Send & Read
CREATE OR REPLACE FUNCTION public.workflow_send_in_app_notification(
  p_recipient_id UUID,
  p_title_ar TEXT,
  p_title_en TEXT,
  p_message_ar TEXT,
  p_message_en TEXT,
  p_category VARCHAR,
  p_link_url TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_notif_id UUID;
BEGIN
  INSERT INTO public.in_app_notifications (
    recipient_id, title_ar, title_en, message_ar, message_en, category, link_url
  ) VALUES (
    p_recipient_id, p_title_ar, p_title_en, p_message_ar, p_message_en, COALESCE(p_category, 'system'), p_link_url
  ) RETURNING id INTO v_notif_id;

  RETURN jsonb_build_object(
    'notification_id', v_notif_id,
    'recipient_id', p_recipient_id,
    'status', 'delivered'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.workflow_mark_notification_read(
  p_notification_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  UPDATE public.in_app_notifications
  SET is_read = true,
      read_at = clock_timestamp()
  WHERE id = p_notification_id AND recipient_id = v_caller;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_NOTIFICATION_NOT_FOUND: Notification does not exist or belongs to another user.';
  END IF;

  RETURN jsonb_build_object(
    'notification_id', p_notification_id,
    'is_read', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Workflow: Scoped Operational Reports with k-Anonymity Small-Group Suppression
CREATE OR REPLACE FUNCTION public.workflow_generate_operational_report(
  p_report_type VARCHAR,
  p_governorate_id VARCHAR DEFAULT NULL,
  p_programme_code VARCHAR DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_caller_role VARCHAR(50);
  v_result JSONB;
  v_rows JSONB := '[]'::jsonb;
  v_suppressed_count INT := 0;
  v_rec RECORD;
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  SELECT role INTO v_caller_role FROM public.staff_roles WHERE staff_id = v_caller AND is_active = true LIMIT 1;

  IF v_caller_role NOT IN ('programme_manager', 'supervisor', 'auditor', 'report_viewer', 'security_admin') THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN_REPORT: Staff role % lacks authority to generate operational reports.', v_caller_role;
  END IF;

  -- 10.1 Sector Distribution Report with k-Anonymity Suppression (< 5 masked)
  IF p_report_type = 'sector_distribution' THEN
    FOR v_rec IN (
      SELECT
        c.programme_code,
        c.governorate_id,
        COUNT(*) AS total_cases,
        COUNT(*) FILTER (WHERE c.status = 'approved') AS approved_cases,
        COUNT(*) FILTER (WHERE c.status = 'active_delivery') AS active_cases
      FROM public.cases c
      WHERE (p_governorate_id IS NULL OR c.governorate_id = p_governorate_id)
        AND (p_programme_code IS NULL OR c.programme_code = p_programme_code)
        -- Scope gate
        AND (
          v_caller_role IN ('auditor', 'report_viewer', 'security_admin')
          OR (v_caller_role = 'supervisor' AND public.has_governorate_access(v_caller, c.governorate_id))
          OR (v_caller_role = 'programme_manager' AND public.has_programme_access(v_caller, c.programme_code))
        )
      GROUP BY c.programme_code, c.governorate_id
      ORDER BY c.programme_code, c.governorate_id
      LIMIT p_limit OFFSET p_offset
    ) LOOP
      -- Privacy Rule: If total_cases > 0 AND total_cases < 5, suppress to prevent individual re-identification
      IF v_rec.total_cases > 0 AND v_rec.total_cases < 5 THEN
        v_suppressed_count := v_suppressed_count + 1;
        v_rows := v_rows || jsonb_build_object(
          'programme_code', v_rec.programme_code,
          'governorate_id', v_rec.governorate_id,
          'total_cases_display', '< 5',
          'total_cases_numeric', -1,
          'is_suppressed', true
        );
      ELSE
        v_rows := v_rows || jsonb_build_object(
          'programme_code', v_rec.programme_code,
          'governorate_id', v_rec.governorate_id,
          'total_cases_display', v_rec.total_cases::text,
          'total_cases_numeric', v_rec.total_cases,
          'approved_cases', v_rec.approved_cases,
          'active_cases', v_rec.active_cases,
          'is_suppressed', false
        );
      END IF;
    END LOOP;

  -- 10.2 Assistance Delivery Report
  ELSIF p_report_type = 'assistance_delivery' THEN
    FOR v_rec IN (
      SELECT
        c.programme_code,
        COUNT(ad.id) AS deliveries_count,
        COALESCE(SUM(ad.quantity_or_amount), 0) AS total_amount
      FROM public.assistance_deliveries ad
      JOIN public.cases c ON c.id = ad.case_id
      WHERE (p_programme_code IS NULL OR c.programme_code = p_programme_code)
        AND (p_governorate_id IS NULL OR c.governorate_id = p_governorate_id)
        AND (
          v_caller_role IN ('auditor', 'report_viewer', 'security_admin')
          OR (v_caller_role = 'supervisor' AND public.has_governorate_access(v_caller, c.governorate_id))
          OR (v_caller_role = 'programme_manager' AND public.has_programme_access(v_caller, c.programme_code))
        )
      GROUP BY c.programme_code
      ORDER BY c.programme_code
      LIMIT p_limit OFFSET p_offset
    ) LOOP
      IF v_rec.deliveries_count > 0 AND v_rec.deliveries_count < 5 THEN
        v_suppressed_count := v_suppressed_count + 1;
        v_rows := v_rows || jsonb_build_object(
          'programme_code', v_rec.programme_code,
          'deliveries_count_display', '< 5',
          'total_amount_numeric', -1,
          'is_suppressed', true
        );
      ELSE
        v_rows := v_rows || jsonb_build_object(
          'programme_code', v_rec.programme_code,
          'deliveries_count_display', v_rec.deliveries_count::text,
          'total_amount_numeric', v_rec.total_amount,
          'is_suppressed', false
        );
      END IF;
    END LOOP;
  ELSE
    RAISE EXCEPTION 'ERR_UNKNOWN_REPORT_TYPE: Report type % is not supported.', p_report_type;
  END IF;

  RETURN jsonb_build_object(
    'report_type', p_report_type,
    'data', v_rows,
    'suppressed_cells_count', v_suppressed_count,
    'generated_at', clock_timestamp()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. Workflow: Audit Report Export
CREATE OR REPLACE FUNCTION public.workflow_audit_report_export(
  p_report_type VARCHAR,
  p_filters JSONB,
  p_row_count INT,
  p_format VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_caller_role VARCHAR(50);
  v_audit_id BIGINT;
BEGIN
  IF NOT public.is_staff_active(v_caller) THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Inactive or unauthenticated staff.';
  END IF;

  SELECT role INTO v_caller_role FROM public.staff_roles WHERE staff_id = v_caller AND is_active = true LIMIT 1;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, event_category, action_name, entity_table, entity_id, details
  ) VALUES (
    v_caller,
    v_caller_role,
    'report',
    'EXPORT_OPERATIONAL_REPORT',
    'reports',
    p_report_type,
    jsonb_build_object(
      'report_type', p_report_type,
      'format', p_format,
      'row_count', p_row_count,
      'filters', p_filters,
      'exported_at', clock_timestamp()
    )
  ) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'export_audited', true,
    'audit_id', v_audit_id,
    'format', p_format,
    'timestamp', clock_timestamp()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. Security Grants for Supporting Modules
GRANT SELECT ON document_access_tokens TO authenticated;
GRANT SELECT ON in_app_notifications TO authenticated;
GRANT UPDATE (is_read, read_at) ON in_app_notifications TO authenticated;

GRANT EXECUTE ON FUNCTION workflow_register_document_metadata TO authenticated;
GRANT EXECUTE ON FUNCTION workflow_request_document_download TO authenticated;
GRANT EXECUTE ON FUNCTION workflow_verify_download_token TO authenticated;
GRANT EXECUTE ON FUNCTION workflow_schedule_appointment TO authenticated;
GRANT EXECUTE ON FUNCTION workflow_update_appointment_status TO authenticated;
GRANT EXECUTE ON FUNCTION workflow_send_in_app_notification TO authenticated;
GRANT EXECUTE ON FUNCTION workflow_mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION workflow_generate_operational_report TO authenticated;
GRANT EXECUTE ON FUNCTION workflow_audit_report_export TO authenticated;
