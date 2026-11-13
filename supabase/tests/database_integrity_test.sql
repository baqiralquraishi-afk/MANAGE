-- Humanity Platform: Database Constraint & Integrity Verification Tests
-- Test ID: database_integrity_test.sql
-- Executes via Supabase / PostgreSQL testing suite.

BEGIN;

-- 1. Verify all 8 programmes exist
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count FROM programmes WHERE code IN ('FIN', 'FOD', 'MED', 'HOU', 'EDU', 'EMG', 'EMP', 'SOC');
  IF v_count != 8 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected 8 programmes, found %', v_count;
  END IF;
  RAISE NOTICE 'TEST PASSED: All 8 official humanitarian programmes are seeded.';
END $$;

-- 2. Verify Case Approvals Maker-Checker Self-Approval Prevention
DO $$
DECLARE
  v_failed BOOLEAN := false;
BEGIN
  BEGIN
    INSERT INTO case_approvals (
      case_id, approval_type, maker_id, checker_id, status
    ) VALUES (
      '50000000-0000-0000-0000-000000000001',
      'programme_eligibility',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000002', -- Self-approval attempt!
      'approved'
    );
  EXCEPTION WHEN check_violation THEN
    v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'TEST FAILED: Maker-Checker constraint failed to prevent self-approval!';
  ELSE
    RAISE NOTICE 'TEST PASSED: Self-approval in case_approvals was strictly blocked by constraint.';
  END IF;
END $$;

-- 3. Verify Financial Ledger Immutability
DO $$
DECLARE
  v_test_entitlement_id UUID := gen_random_uuid();
  v_test_tx_id UUID := gen_random_uuid();
  v_update_blocked BOOLEAN := false;
  v_delete_blocked BOOLEAN := false;
BEGIN
  -- Insert dummy entitlement
  INSERT INTO assistance_entitlements (
    id, case_id, assistance_type, currency, authorized_amount
  ) VALUES (
    v_test_entitlement_id,
    '50000000-0000-0000-0000-000000000001',
    'cash_mpca',
    'IQD',
    480000.00
  );

  -- Insert posted ledger record
  INSERT INTO finance_ledger (
    id, entitlement_id, transaction_type, transaction_reference,
    amount, currency, maker_id, checker_id, rationale
  ) VALUES (
    v_test_tx_id,
    v_test_entitlement_id,
    'disbursement',
    'TEST-REF-' || gen_random_uuid()::text,
    480000.00,
    'IQD',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    'Monthly MPCA cash assistance'
  );

  -- Test UPDATE prevention
  BEGIN
    UPDATE finance_ledger SET amount = 999999.00 WHERE id = v_test_tx_id;
  EXCEPTION WHEN OTHERS THEN
    v_update_blocked := true;
  END;

  -- Test DELETE prevention
  BEGIN
    DELETE FROM finance_ledger WHERE id = v_test_tx_id;
  EXCEPTION WHEN OTHERS THEN
    v_delete_blocked := true;
  END;

  IF NOT (v_update_blocked AND v_delete_blocked) THEN
    RAISE EXCEPTION 'TEST FAILED: Financial ledger immutability trigger failed to block mutation!';
  ELSE
    RAISE NOTICE 'TEST PASSED: Financial ledger is strictly immutable (UPDATE and DELETE blocked).';
  END IF;
END $$;

ROLLBACK; -- Discard test transaction
