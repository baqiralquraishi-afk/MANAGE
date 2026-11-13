/**
 * Humanity Platform - Staff Admin Workflow & Role Security Test Suite
 * Validates:
 * 1. Existence and structure of the Staff Role & Scope Administration page (/dashboard/admin/staff)
 * 2. Strict RoleGuard enforcement limiting access exclusively to security_admin
 * 3. Validation contracts for role assignment, revocation, and scope modification
 * 4. Audit trail generation under the 'role_management' category
 * 5. Accessibility attributes (dialog roles, modal tags, touch targets, and BidiText isolation)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  StaffRoleAssignmentSchema,
  StaffRoleRevocationSchema,
  StaffScopeAssignmentSchema,
  SecurityAuditAlertSchema,
  SystemRoleSchema,
  ProgrammeCodeSchema,
} from '../../../../packages/contracts/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, '..');

describe('Staff Admin Workflow - Page Structure & RoleGuard Enforcement', () => {
  const staffAdminPagePath = path.join(webSrcDir, 'app', 'dashboard', 'admin', 'staff', 'page.tsx');

  test('Staff administration page exists in Next.js app router structure', () => {
    assert.ok(fs.existsSync(staffAdminPagePath), 'Staff admin page.tsx must exist');
  });

  test('Page enforces strict security_admin RoleGuard wrapper', () => {
    const content = fs.readFileSync(staffAdminPagePath, 'utf8');

    assert.ok(
      content.includes('<RoleGuard allowedRoles={[\'security_admin\']}>'),
      'Must wrap the entire page in RoleGuard with security_admin restriction'
    );
    assert.ok(
      content.includes('<AppShell>'),
      'Must use standard AppShell layout'
    );
  });

  test('Navigation configuration in app-shell links correctly to staff admin route', () => {
    const appShellPath = path.join(webSrcDir, 'components', 'layout', 'app-shell.tsx');
    assert.ok(fs.existsSync(appShellPath), 'app-shell.tsx must exist');

    const content = fs.readFileSync(appShellPath, 'utf8');
    assert.ok(
      content.includes("href: '/dashboard/admin/staff'"),
      'app-shell must route nav.staff_admin to /dashboard/admin/staff'
    );
    assert.ok(
      content.includes("roles: ['security_admin']"),
      'nav.staff_admin must be restricted to security_admin'
    );
  });
});

describe('Staff Admin Workflow - Contract Validation & Security Rules', () => {
  const validStaffId = '00000000-0000-0000-0000-000000000003';

  test('StaffRoleAssignmentSchema accepts valid assignment and rejects short rationale (<10 chars)', () => {
    // Valid assignment
    const validPayload = {
      staffId: validStaffId,
      role: 'supervisor',
      rationale: 'Formal assignment to cover supervisor duties in Ninewa',
      isActive: true,
    };
    const validResult = StaffRoleAssignmentSchema.safeParse(validPayload);
    assert.ok(validResult.success, 'Valid role assignment must parse successfully');

    // Invalid rationale (too short)
    const invalidPayload = {
      staffId: validStaffId,
      role: 'supervisor',
      rationale: 'Too short',
    };
    const invalidResult = StaffRoleAssignmentSchema.safeParse(invalidPayload);
    assert.strictEqual(invalidResult.success, false, 'Rationale < 10 chars must be rejected');
  });

  test('StaffRoleRevocationSchema rejects missing or insufficient rationale', () => {
    // Valid revocation
    const validRevocation = {
      staffId: validStaffId,
      role: 'caseworker',
      rationale: 'End of temporary deployment to Ninewa emergency response',
    };
    const validResult = StaffRoleRevocationSchema.safeParse(validRevocation);
    assert.ok(validResult.success, 'Valid role revocation must parse successfully');

    // Invalid rationale
    const invalidRevocation = {
      staffId: validStaffId,
      role: 'caseworker',
      rationale: 'No reason',
    };
    const invalidResult = StaffRoleRevocationSchema.safeParse(invalidRevocation);
    assert.strictEqual(invalidResult.success, false, 'Revocation with short rationale must fail');
  });

  test('StaffScopeAssignmentSchema validates geographic governorate and programme code', () => {
    const validScope = {
      staffId: validStaffId,
      governorateId: 'IQ-NI',
      programmeCode: 'FIN',
      rationale: 'Assigned to Ninewa financial assistance monitoring team',
    };
    const validResult = StaffScopeAssignmentSchema.safeParse(validScope);
    assert.ok(validResult.success, 'Valid scope assignment must parse successfully');

    // Invalid programme code
    const invalidScope = {
      staffId: validStaffId,
      governorateId: 'IQ-NI',
      programmeCode: 'INVALID_PROG',
      rationale: 'Assigned to invalid programme code with long rationale',
    };
    const invalidResult = StaffScopeAssignmentSchema.safeParse(invalidScope);
    assert.strictEqual(invalidResult.success, false, 'Invalid programme code must fail contract');
  });

  test('SecurityAuditAlertSchema validates role_management event payload', () => {
    const auditPayload = {
      eventCategory: 'role_management',
      actionName: 'STAFF_ROLE_ASSIGNED',
      entityTable: 'staff_roles',
      entityId: validStaffId,
      details: {
        assignedRole: 'supervisor',
        rationale: 'Promoted to field supervisor for Ninewa operation',
        assignedBy: 'security.admin@humanity.local',
      },
    };
    const auditResult = SecurityAuditAlertSchema.safeParse(auditPayload);
    assert.ok(auditResult.success, 'Audit payload must conform to SecurityAuditAlertSchema');
  });
});

describe('Staff Admin Workflow - Accessibility & Bidirectional Text', () => {
  const staffAdminPagePath = path.join(webSrcDir, 'app', 'dashboard', 'admin', 'staff', 'page.tsx');

  test('Page implements accessible dialog attributes and directional isolation', () => {
    const content = fs.readFileSync(staffAdminPagePath, 'utf8');

    // Accessibility
    assert.ok(content.includes('role="dialog"'), 'Modals must define role="dialog"');
    assert.ok(content.includes('aria-modal="true"'), 'Modals must define aria-modal="true"');
    assert.ok(content.includes('aria-labelledby'), 'Modals must have aria-labelledby');

    // Bidi isolation
    assert.ok(content.includes('<BidiText>'), 'Emails and foreign IDs must be isolated with BidiText');
  });
});

