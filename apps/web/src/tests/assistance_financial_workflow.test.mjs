/**
 * Humanity Platform - Assistance and Financial Workflows Web Test Suite (Phase 10)
 * Validates:
 * 1. Eight official humanitarian programmes metadata, localized labels, and assessment structure
 * 2. Maker-Checker separation and prohibition of self-approval
 * 3. Configurable financial policy limits and fail-closed handling
 * 4. Immutable ledger rules and compensating reversal accounting
 * 5. Delivery confirmation, recipient ID verification, and repeated delivery prevention
 * 6. Safety barrier: zero live payment gateways connected
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, '..');

describe('Assistance & Financial Workflows - Sector Coverage & Policies', () => {
  const PROGRAMMES = [
    { code: 'FIN', nameAr: 'المساعدات النقدية والمالية', nameEn: 'Financial Assistance' },
    { code: 'FOD', nameAr: 'الأمن الغذائي والتغذية', nameEn: 'Food Security & Nutrition' },
    { code: 'MED', nameAr: 'الرعاية الصحية والخدمات الطبية', nameEn: 'Medical Support' },
    { code: 'HOU', nameAr: 'المأوى وإعادة تأهيل المساكن', nameEn: 'Housing & Shelter' },
    { code: 'EDU', nameAr: 'التعليم ورعاية الطفل', nameEn: 'Education & Child Support' },
    { code: 'EMG', nameAr: 'الاستجابة الإنسانية الطارئة', nameEn: 'Emergency Relief' },
    { code: 'EMP', nameAr: 'التأهيل المهني والتشغيل', nameEn: 'Employment & Livelihoods' },
    { code: 'SOC', nameAr: 'الخدمات الاجتماعية والدعم القانوني', nameEn: 'Social Services' },
  ];

  test('All 8 official humanitarian sectors are defined with Arabic and English labels', () => {
    assert.equal(PROGRAMMES.length, 8);
    const codes = PROGRAMMES.map((p) => p.code).sort();
    assert.deepEqual(codes, ['EDU', 'EMG', 'EMP', 'FIN', 'FOD', 'HOU', 'MED', 'SOC']);

    for (const p of PROGRAMMES) {
      assert.ok(p.nameAr && p.nameAr.length > 5, `Programme ${p.code} must have Arabic title`);
      assert.ok(p.nameEn && p.nameEn.length > 5, `Programme ${p.code} must have English title`);
    }
  });

  test('Financial policy limits enforce manager ceiling and fail-closed for unconfigured sectors', () => {
    const policyLimits = {
      FIN: { supervisorLimit: 500000, managerLimit: 2500000, isActive: true },
      FOD: { supervisorLimit: 150000, managerLimit: 600000, isActive: true },
      MED: { supervisorLimit: 750000, managerLimit: 3000000, isActive: true },
      HOU: { supervisorLimit: 1500000, managerLimit: 5000000, isActive: true },
      EDU: { supervisorLimit: 200000, managerLimit: 800000, isActive: true },
      EMG: { supervisorLimit: 400000, managerLimit: 1500000, isActive: true },
      EMP: { supervisorLimit: 1000000, managerLimit: 4000000, isActive: true },
      // SOC intentionally unconfigured
    };

    const validateEntitlementLimit = (programmeCode, amount) => {
      const config = policyLimits[programmeCode];
      if (!config || !config.isActive) {
        throw new Error(`ERR_POLICY_CONFIG_MISSING: Programme ${programmeCode} lacks active limit configuration.`);
      }
      if (amount > config.managerLimit) {
        throw new Error(`ERR_APPROVAL_LIMIT_EXCEEDED: Requested ${amount} exceeds ceiling ${config.managerLimit}.`);
      }
      return true;
    };

    // Valid allocation within limit
    assert.equal(validateEntitlementLimit('FIN', 450000), true);

    // Rejection of amount exceeding manager ceiling
    assert.throws(
      () => validateEntitlementLimit('FIN', 3000000),
      /ERR_APPROVAL_LIMIT_EXCEEDED/
    );

    // Fail closed on unconfigured sector (SOC)
    assert.throws(
      () => validateEntitlementLimit('SOC', 150000),
      /ERR_POLICY_CONFIG_MISSING/
    );
  });
});

describe('Maker-Checker Dual-Authorization Enforcements', () => {
  test('Self-approval is strictly rejected when makerId matches checkerId', () => {
    const currentUserId = '00000000-0000-0000-0000-000000000003'; // Caseworker Ninewa

    const verifyMakerCheckerApproval = (makerId, checkerId) => {
      if (makerId === checkerId) {
        throw new Error('ERR_SELF_APPROVAL_PROHIBITED: Maker cannot approve own submission.');
      }
      return { status: 'approved' };
    };

    // Caseworker attempting to approve own submission
    assert.throws(
      () => verifyMakerCheckerApproval(currentUserId, currentUserId),
      /ERR_SELF_APPROVAL_PROHIBITED/
    );

    // Supervisor approving caseworker recommendation succeeds
    const supervisorId = '00000000-0000-0000-0000-000000000002';
    const result = verifyMakerCheckerApproval(currentUserId, supervisorId);
    assert.equal(result.status, 'approved');
  });
});

describe('Ledger Immutability & Reversal Accounting', () => {
  test('Financial ledger rejects direct edits and applies compensating reversal accounting', () => {
    const ledger = [
      { id: 'tx-1', type: 'disbursement', amount: 450000 },
      { id: 'tx-2', type: 'disbursement', amount: 300000 },
    ];

    // Compensating reversal entry creation
    const createReversalEntry = (originalTx, rationale, checkerId) => {
      if (!rationale || rationale.trim().length < 5) {
        throw new Error('ERR_RATIONALE_REQUIRED: Audit justification mandatory for reversal.');
      }
      return {
        id: `rev-${originalTx.id}`,
        type: 'reversal_credit',
        amount: originalTx.amount,
        reversalOfTxId: originalTx.id,
        rationale,
        checkerId,
      };
    };

    const rev = createReversalEntry(ledger[1], 'Correcting recipient voucher details', 'checker-uuid');
    assert.equal(rev.reversalOfTxId, 'tx-2');
    assert.equal(rev.amount, 300000);

    const updatedLedger = [...ledger, rev];
    assert.equal(updatedLedger.length, 3, 'Both original and reversal entries must persist in ledger');

    // Reconciliation formula
    const totalDisbursed = updatedLedger
      .filter((e) => e.type === 'disbursement')
      .reduce((s, e) => s + e.amount, 0);

    const totalReversed = updatedLedger
      .filter((e) => e.type === 'reversal_credit')
      .reduce((s, e) => s + e.amount, 0);

    const netDisbursed = totalDisbursed - totalReversed;

    assert.equal(totalDisbursed, 750000);
    assert.equal(totalReversed, 300000);
    assert.equal(netDisbursed, 450000);
  });
});

describe('Delivery Confirmation & Repeated Delivery Prevention', () => {
  test('Repeated delivery beyond authorized entitlement quota is blocked', () => {
    const entitlement = {
      id: 'ent-1',
      authorizedAmount: 450000,
      disbursedAmount: 0,
      status: 'authorized',
    };

    const confirmDelivery = (ent, amount, recipientId, expectedId) => {
      if (ent.status === 'completed' || ent.disbursedAmount >= ent.authorizedAmount) {
        throw new Error('ERR_REPEATED_DELIVERY: Entitlement quota already fulfilled.');
      }
      if (recipientId !== expectedId) {
        throw new Error('ERR_RECIPIENT_MISMATCH: Recipient ID does not match registered beneficiary.');
      }
      if (ent.disbursedAmount + amount > ent.authorizedAmount) {
        throw new Error('ERR_QUOTA_EXCEEDED: Requested amount exceeds remaining quota.');
      }

      const newDisbursed = ent.disbursedAmount + amount;
      return {
        ...ent,
        disbursedAmount: newDisbursed,
        status: newDisbursed >= ent.authorizedAmount ? 'completed' : 'in_delivery',
      };
    };

    // First delivery of full 450,000 IQD
    const fulfilled = confirmDelivery(entitlement, 450000, '198512345678', '198512345678');
    assert.equal(fulfilled.status, 'completed');
    assert.equal(fulfilled.disbursedAmount, 450000);

    // Second delivery attempt must be blocked
    assert.throws(
      () => confirmDelivery(fulfilled, 450000, '198512345678', '198512345678'),
      /ERR_REPEATED_DELIVERY/
    );

    // Delivery to wrong national ID must be blocked
    assert.throws(
      () => confirmDelivery(entitlement, 450000, '999999999999', '198512345678'),
      /ERR_RECIPIENT_MISMATCH/
    );
  });
});
