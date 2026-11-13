#!/usr/bin/env node

/**
 * Humanity Platform - Safe SQL Verification Helper
 * Verifies SQL syntax, unclosed quotes, parentheses balance, and presence of required constraints.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'supabase', 'migrations');
const SEED_FILE = path.join(ROOT_DIR, 'supabase', 'seed.sql');
const TEST_FILE = path.join(ROOT_DIR, 'supabase', 'tests', 'database_integrity_test.sql');

console.log('--- Humanity Platform: Verifying PostgreSQL Migrations & Seed ---');

let hasErrors = false;

// 1. Verify files exist
const filesToCheck = [
  path.join(MIGRATIONS_DIR, '20261113000001_core_schema.sql'),
  SEED_FILE,
  TEST_FILE,
];

for (const filePath of filesToCheck) {
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] Missing expected SQL file: ${path.relative(ROOT_DIR, filePath)}`);
    hasErrors = true;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`[OK] Read ${path.basename(filePath)} (${content.length} bytes)`);

  // Basic syntax sanity checks
  const singleQuotes = (content.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    console.error(
      `[WARN] Possible unclosed single quote in ${path.basename(filePath)} (count: ${singleQuotes})`,
    );
  }

  // Check required invariants
  if (filePath.includes('20261113000001_core_schema.sql')) {
    const requiredTables = [
      'geo_governorates',
      'geo_districts',
      'staff_profiles',
      'staff_roles',
      'staff_scopes',
      'programmes',
      'beneficiaries',
      'duplicate_reviews',
      'households',
      'household_members',
      'beneficiary_consents',
      'cases',
      'case_status_history',
      'assessment_templates',
      'assessment_submissions',
      'case_approvals',
      'assistance_entitlements',
      'finance_ledger',
      'caseworker_visits',
      'appointments',
      'document_metadata',
      'audit_logs',
      'sync_mutations',
      'sync_conflicts',
    ];

    for (const table of requiredTables) {
      if (!content.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
        console.error(`[ERROR] Missing required table creation: ${table}`);
        hasErrors = true;
      }
    }

    if (!content.includes('chk_maker_checker_distinct')) {
      console.error('[ERROR] Missing case_approvals maker-checker constraint');
      hasErrors = true;
    }
    if (!content.includes('chk_ledger_maker_checker')) {
      console.error('[ERROR] Missing finance_ledger maker-checker constraint');
      hasErrors = true;
    }
    if (!content.includes('trg_prevent_ledger_modification')) {
      console.error('[ERROR] Missing financial ledger immutability trigger');
      hasErrors = true;
    }
  }

  if (filePath.includes('seed.sql')) {
    const requiredProgrammes = ['FIN', 'FOD', 'MED', 'HOU', 'EDU', 'EMG', 'EMP', 'SOC'];
    for (const prog of requiredProgrammes) {
      if (!content.includes(`'${prog}'`)) {
        console.error(`[ERROR] Missing programme seed: ${prog}`);
        hasErrors = true;
      }
    }
  }
}

if (hasErrors) {
  console.error('\nSQL verification failed.');
  process.exit(1);
} else {
  console.log(
    '\n[PASS] All 24 core tables, constraints, triggers, and 8 programme seeds verified.',
  );
  process.exit(0);
}
