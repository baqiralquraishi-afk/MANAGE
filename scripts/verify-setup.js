#!/usr/bin/env node

/**
 * Humanity Platform - Safe Workspace Verification Helper
 * Verifies repository layout, absence of exposed secrets, and key environment conventions.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const REQUIRED_PATHS = [
  'apps/web',
  'apps/mobile',
  'packages/contracts',
  'supabase/config.toml',
  'supabase/migrations',
  'supabase/seed.sql',
  'docs',
  'infra',
  'scripts',
  '.github/workflows',
  '.env.example',
  'README.md',
];

console.log('--- Humanity Platform: Verifying Workspace Foundation ---');

let hasErrors = false;

// 1. Verify directory layout
for (const relPath of REQUIRED_PATHS) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[ERROR] Missing required path: ${relPath}`);
    hasErrors = true;
  } else {
    console.log(`[OK] Found ${relPath}`);
  }
}

// 2. Secret leakage check
const SECRET_PATTERNS = [
  /-----BEGIN (RSA|EC|PGP|OPENSSH) PRIVATE KEY-----/,
  /eyJhbGciOi[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
];

function scanForPotentialSecrets(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === '.next' ||
      entry.name === 'dist'
    ) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanForPotentialSecrets(fullPath);
    } else if (entry.isFile()) {
      // Exclude template example files
      if (entry.name === '.env.example') continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(content)) {
          console.error(
            `[SECURITY ALERT] Potential secret pattern detected in: ${path.relative(ROOT_DIR, fullPath)}`,
          );
          hasErrors = true;
        }
      }
    }
  }
}

try {
  scanForPotentialSecrets(ROOT_DIR);
} catch (err) {
  console.error(`[ERROR] Secret scanner encountered an issue: ${err.message}`);
  hasErrors = true;
}

if (hasErrors) {
  console.error('\nVerification failed with errors.');
  process.exit(1);
} else {
  console.log('\n[PASS] Workspace foundation verified successfully. No secret leakage detected.');
  process.exit(0);
}
