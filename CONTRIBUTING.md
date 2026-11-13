# Contributing to Humanity Platform

## Principles and Guidelines

1. **Preserve Reversibility:** Make small, bounded, and atomic commits.
2. **Never Commit Secrets:** Any commit containing API keys, private keys, or passwords will fail CI verification and be rejected.
3. **Data Protection & Ethics:** Real beneficiary or staff names, phone numbers, Iraqi national IDs, or addresses are prohibited. Always use synthetic Arabic/English dummy data.
4. **PostgreSQL as Source of Truth:** Do not invent standalone business models in frontend code. Changes to database entities must originate as ordered, additive migrations under `supabase/migrations/`.
5. **No Client Bypass of Security:** Authorization rules live in PostgreSQL Row-Level Security policies and server functions. Frontend route guards and button-hiding are for usability only.

## Pull Request Checklist

- [ ] `node scripts/verify-setup.js` passes.
- [ ] `pnpm typecheck` passes with 0 errors.
- [ ] `pnpm lint` and `pnpm format` pass.
- [ ] No `.env` files or credentials are staged.
- [ ] New database tables include additive migration, indexes, RLS policies, and SQL deny tests.
