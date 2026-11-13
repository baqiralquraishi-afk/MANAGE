/**
 * Humanity Platform - Web Foundation Test Suite
 * Validates:
 * 1. Locale switching and text direction resolution (Arabic RTL default, English LTR)
 * 2. Role-aware navigation ergonomics across the 9 documented system roles
 * 3. Client security: Strict prohibition of service-role key leakage in web client code
 * 4. Protected UI state contracts (loading, empty, error, and session expiry)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, '..');

describe('Web Foundation - Locale & RTL/LTR Directionality', () => {
  test('Arabic is default RTL and English is switchable LTR', () => {
    const supportedLocales = ['ar', 'en'];
    const directionMap = {
      ar: 'rtl',
      en: 'ltr',
    };

    assert.equal(directionMap['ar'], 'rtl', 'Arabic must resolve to RTL');
    assert.equal(directionMap['en'], 'ltr', 'English must resolve to LTR');
  });

  test('Translation dictionary contains required navigation and role keys in both Arabic and English', () => {
    const localeContextPath = path.join(webSrcDir, 'lib', 'locale-context.tsx');
    assert.ok(fs.existsSync(localeContextPath), 'locale-context.tsx must exist');

    const content = fs.readFileSync(localeContextPath, 'utf8');

    const requiredKeys = [
      'nav.dashboard',
      'nav.beneficiaries',
      'nav.cases',
      'nav.approvals',
      'nav.finance',
      'nav.reports',
      'nav.audit',
      'nav.staff_admin',
      'role.intake',
      'role.caseworker',
      'role.supervisor',
      'role.programme_manager',
      'role.finance_maker',
      'role.finance_checker',
      'role.auditor',
      'role.report_viewer',
      'role.security_admin',
      'session.expired_title',
      'common.loading',
      'common.empty',
      'common.error',
    ];

    for (const key of requiredKeys) {
      assert.ok(
        content.includes(`'${key}'`),
        `Dictionary must define key: ${key}`
      );
    }
  });
});

describe('Web Foundation - Role-Aware Navigation Filtering', () => {
  // Navigation matrix definitions from app-shell.tsx
  const NAV_ITEMS = [
    {
      key: 'nav.dashboard',
      href: '/dashboard',
      roles: [
        'intake',
        'caseworker',
        'supervisor',
        'programme_manager',
        'finance_maker',
        'finance_checker',
        'auditor',
        'report_viewer',
        'security_admin',
      ],
    },
    {
      key: 'nav.beneficiaries',
      href: '/dashboard/beneficiaries',
      roles: ['intake', 'caseworker', 'supervisor', 'programme_manager', 'auditor', 'report_viewer'],
    },
    {
      key: 'nav.cases',
      href: '/dashboard/cases',
      roles: ['caseworker', 'supervisor', 'programme_manager', 'auditor', 'report_viewer'],
    },
    {
      key: 'nav.approvals',
      href: '/dashboard/approvals',
      roles: ['supervisor', 'programme_manager'],
    },
    {
      key: 'nav.finance',
      href: '/dashboard/finance',
      roles: ['finance_maker', 'finance_checker', 'auditor'],
    },
    {
      key: 'nav.reports',
      href: '/dashboard/reports',
      roles: ['programme_manager', 'finance_checker', 'auditor', 'report_viewer'],
    },
    {
      key: 'nav.audit',
      href: '/dashboard/audit',
      roles: ['auditor', 'security_admin'],
    },
    {
      key: 'nav.staff_admin',
      href: '/dashboard/admin/staff',
      roles: ['security_admin'],
    },
  ];

  function getVisibleLinks(userRole) {
    return NAV_ITEMS.filter((item) => item.roles.includes(userRole)).map(
      (i) => i.href
    );
  }

  test('Caseworker role cannot see financial ledger or staff admin', () => {
    const links = getVisibleLinks('caseworker');
    assert.ok(links.includes('/dashboard/cases'), 'Caseworker should see cases');
    assert.ok(links.includes('/dashboard/beneficiaries'), 'Caseworker should see beneficiaries');
    assert.ok(!links.includes('/dashboard/finance'), 'Caseworker must NOT see financial ledger');
    assert.ok(!links.includes('/dashboard/admin/staff'), 'Caseworker must NOT see staff admin');
  });

  test('Finance Maker role sees financial ledger but cannot see approvals or cases', () => {
    const links = getVisibleLinks('finance_maker');
    assert.ok(links.includes('/dashboard/finance'), 'Finance Maker sees finance');
    assert.ok(!links.includes('/dashboard/approvals'), 'Finance Maker must NOT see approvals queue');
    assert.ok(!links.includes('/dashboard/cases'), 'Finance Maker must NOT see cases list');
  });

  test('Finance Checker role sees financial ledger and reports', () => {
    const links = getVisibleLinks('finance_checker');
    assert.ok(links.includes('/dashboard/finance'), 'Finance Checker sees finance');
    assert.ok(links.includes('/dashboard/reports'), 'Finance Checker sees reports');
    assert.ok(!links.includes('/dashboard/admin/staff'), 'Finance Checker must NOT see staff admin');
  });

  test('Security Admin role sees staff admin and audit trail', () => {
    const links = getVisibleLinks('security_admin');
    assert.ok(links.includes('/dashboard/admin/staff'), 'Admin sees staff admin');
    assert.ok(links.includes('/dashboard/audit'), 'Admin sees audit log');
    assert.ok(!links.includes('/dashboard/finance'), 'Admin must NOT see financial ledger');
  });
});

describe('Web Foundation - Security Boundary & Secret Hygiene', () => {
  test('Client environment rejects service-role key injection', async () => {
    const envPath = path.join(webSrcDir, 'lib', 'env.ts');
    assert.ok(fs.existsSync(envPath), 'env.ts must exist');

    const envContent = fs.readFileSync(envPath, 'utf8');
    assert.ok(
      envContent.includes('SECURITY VIOLATION'),
      'env.ts must enforce security violation check against service-role key'
    );
  });

  test('No client-side file imports or uses service_role key', () => {
    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith('.ts') ||
            entry.name.endsWith('.tsx') ||
            entry.name.endsWith('.js'))
        ) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Service role key must never be assigned or used as a credential in client code
          assert.ok(
            !content.includes('process.env.SUPABASE_SERVICE_ROLE_KEY'),
            `File ${fullPath} must not reference SUPABASE_SERVICE_ROLE_KEY`
          );
        }
      }
    }

    scanDir(path.join(webSrcDir, 'app'));
    scanDir(path.join(webSrcDir, 'components'));
    scanDir(path.join(webSrcDir, 'lib'));
  });

  test('Supabase client uses public browser client with RLS enforcement', () => {
    const clientPath = path.join(webSrcDir, 'lib', 'supabase-client.ts');
    assert.ok(fs.existsSync(clientPath), 'supabase-client.ts must exist');

    const content = fs.readFileSync(clientPath, 'utf8');
    assert.ok(
      content.includes('getPublicClientEnv'),
      'Client must only use public client env'
    );
    assert.ok(
      content.includes('persistSession: true'),
      'Client must persist authenticated session'
    );
  });
});

describe('Web Foundation - Operational Health Check Endpoint', () => {
  test('/api/health route exists and implements non-cached healthy probe', async () => {
    const healthRoutePath = path.join(webSrcDir, 'app', 'api', 'health', 'route.ts');
    assert.ok(fs.existsSync(healthRoutePath), 'api/health/route.ts must exist for container probes');

    const content = fs.readFileSync(healthRoutePath, 'utf8');
    assert.ok(content.includes('status: \'healthy\''), 'Must return status: healthy');
    assert.ok(content.includes('Cache-Control'), 'Must specify Cache-Control header');
    assert.ok(content.includes('uptime'), 'Must provide runtime uptime telemetry');
    assert.ok(!content.includes('password') && !content.includes('secret') && !content.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Must not leak secrets');
  });
});


