import test from 'node:test';
import assert from 'node:assert';
import { ProgrammeCodeSchema, SystemRoleSchema, CaseStatusSchema } from './index.js';

test('ProgrammeCodeSchema validates all 8 official humanitarian programmes', () => {
  const programmes = ['FIN', 'FOD', 'MED', 'HOU', 'EDU', 'EMG', 'EMP', 'SOC'];
  for (const prog of programmes) {
    assert.strictEqual(ProgrammeCodeSchema.parse(prog), prog);
  }
  assert.throws(() => ProgrammeCodeSchema.parse('INVALID_PROG'));
});

test('SystemRoleSchema validates system roles', () => {
  const roles = [
    'intake',
    'caseworker',
    'supervisor',
    'programme_manager',
    'finance_maker',
    'finance_checker',
    'auditor',
    'report_viewer',
    'security_admin',
  ];
  for (const role of roles) {
    assert.strictEqual(SystemRoleSchema.parse(role), role);
  }
  assert.throws(() => SystemRoleSchema.parse('super_admin'));
});

test('CaseStatusSchema validates state lifecycle', () => {
  assert.strictEqual(CaseStatusSchema.parse('draft'), 'draft');
  assert.strictEqual(CaseStatusSchema.parse('approved'), 'approved');
  assert.throws(() => CaseStatusSchema.parse('deleted'));
});
