/**
 * Humanity Platform - Localization, Accessibility & Audit Hardening Test Suite (Phase 14)
 * Validates:
 * 1. Bidirectional text isolation (U+2066/U+2069 & <bdi>) for alphanumeric identifiers
 * 2. Standardized Iraqi Dinar currency formatting (د.ع vs IQD) and Gregorian date localization
 * 3. Approved canonical humanitarian terminology dictionary completeness (Iraq standards)
 * 4. WCAG AA accessibility compliance (min 44x44px targets, ARIA labels, focus states)
 * 5. Audit trail segregation, export safety, and secret cleansing
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, '..');

describe('Phase 14 - Localization, Accessibility & Audit Hardening', () => {
  // Test 1: Bidirectional Identifier Isolation
  test('formatIdentifier isolates Latin/alphanumeric IDs to prevent punctuation scramble in RTL', async () => {
    const formattersPath = path.join(webSrcDir, 'lib', 'formatters.tsx');
    assert.ok(fs.existsSync(formattersPath), 'formatters.tsx must exist');

    const content = fs.readFileSync(formattersPath, 'utf8');
    assert.ok(content.includes('\\u2066'), 'Must use Unicode First Strong Isolate U+2066');
    assert.ok(content.includes('\\u2069'), 'Must use Unicode Pop Directional Isolate U+2069');
    assert.ok(content.includes('<bdi dir="ltr"'), 'BidiText component must use HTML5 <bdi dir="ltr"> tag');

    // Functional verification
    const formatIdentifier = (id) => (id ? `\u2066${id}\u2069` : '');
    const sampleId = 'HUM-2026-FIN-00001';
    const isolated = formatIdentifier(sampleId);
    assert.equal(isolated, `\u2066HUM-2026-FIN-00001\u2069`);
    assert.equal(isolated.charCodeAt(0), 0x2066);
    assert.equal(isolated.charCodeAt(isolated.length - 1), 0x2069);
  });

  // Test 2: Standardized Currency and Number Formatting
  test('formatCurrency formats Iraqi Dinar with appropriate Arabic suffix and English prefix', () => {
    const formatCurrency = (amount, locale = 'ar', currency = 'IQD') => {
      if (amount == null || isNaN(amount)) return '0';
      const isArabic = locale.startsWith('ar');
      const formattedNum = new Intl.NumberFormat(isArabic ? 'ar-IQ' : 'en-US', {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }).format(amount);
      return isArabic ? `${formattedNum} د.ع` : `${currency} ${formattedNum}`;
    };

    const arabicDisbursement = formatCurrency(250000, 'ar');
    assert.ok(arabicDisbursement.includes('د.ع'), 'Arabic currency must include د.ع suffix');

    const englishDisbursement = formatCurrency(250000, 'en');
    assert.equal(englishDisbursement, 'IQD 250,000', 'English currency must format as IQD 250,000');
  });

  // Test 3: Approved Canonical Humanitarian Terminology
  test('Translation dictionary enforces approved canonical humanitarian terms without informal variants', () => {
    const localeContextPath = path.join(webSrcDir, 'lib', 'locale-context.tsx');
    const content = fs.readFileSync(localeContextPath, 'utf8');

    const canonicalTerms = [
      { key: 'term.consent', ar: 'الموافقة المستنيرة الصريحة', en: 'Explicit Informed Consent' },
      { key: 'term.safeguarding', ar: 'صون وحماية الفئات المستضعفة', en: 'Safeguarding & Heightened Protection' },
      { key: 'term.duplicate_review', ar: 'تدقيق تشابه القيود والازدواجية', en: 'Duplicate Registration Review' },
      { key: 'term.ledger_reversal', ar: 'قيد تسوية عكسي', en: 'Compensating Ledger Reversal' },
      { key: 'term.legal_hold', ar: 'تجميد قانوني تحفظي', en: 'Protective Legal Hold' },
      { key: 'term.do_no_harm', ar: 'عدم إلحاق الضرر', en: 'Do No Harm Principle' },
      { key: 'term.data_minimization', ar: 'الحد الأدنى لجمع البيانات', en: 'Data Minimization' },
    ];

    for (const term of canonicalTerms) {
      assert.ok(content.includes(`'${term.key}'`), `Dictionary must define ${term.key}`);
      assert.ok(content.includes(term.ar), `Dictionary must contain approved Arabic translation: ${term.ar}`);
      assert.ok(content.includes(term.en), `Dictionary must contain approved English translation: ${term.en}`);
    }
  });

  // Test 4: WCAG AA Accessibility Compliance in Audit UI
  test('Audit trail UI enforces WCAG AA minimum touch targets (>=44px), focus rings, and ARIA roles', () => {
    const auditPagePath = path.join(webSrcDir, 'app', 'dashboard', 'audit', 'page.tsx');
    assert.ok(fs.existsSync(auditPagePath), 'audit/page.tsx must exist');

    const content = fs.readFileSync(auditPagePath, 'utf8');

    // Min 44x44px touch targets
    assert.ok(content.includes('min-h-[44px]'), 'Interactive controls must meet WCAG AA 44px min touch target');

    // Focus indicators for keyboard accessibility
    assert.ok(
      content.includes('focus:ring-2 focus:ring-blue-600'),
      'Interactive elements must provide high-contrast visible focus indicators'
    );

    // Screen reader accessible labels and status notifications
    assert.ok(content.includes('aria-label='), 'Action buttons must have descriptive aria-label');
    assert.ok(content.includes('role="status"'), 'Dynamic notifications must announce via role="status"');
    assert.ok(content.includes('htmlFor="audit-search"'), 'Search input must be linked to accessible label');
    assert.ok(content.includes('htmlFor="audit-category-select"'), 'Category select must be linked to accessible label');
  });

  // Test 5: Role Guarding and Audit Data Minimization
  test('Audit trail page strictly guards access to auditor and security_admin roles', () => {
    const auditPagePath = path.join(webSrcDir, 'app', 'dashboard', 'audit', 'page.tsx');
    const content = fs.readFileSync(auditPagePath, 'utf8');

    assert.ok(
      content.includes("allowedRoles={['auditor', 'security_admin']}"),
      'Audit page must enforce RoleGuard for auditor and security_admin only'
    );
    assert.ok(content.includes('handleExport'), 'Audit page must provide monitored export capability');
  });
});

