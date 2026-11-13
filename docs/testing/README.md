# Verification, Load & Acceptance Testing

This directory documents the comprehensive verification strategy, high-volume performance benchmarks, security resilience tests, and production readiness gates for the Humanity Platform.

## Master Documentation

- **[Master Verification & Test Plan (test_plan.md)](./test_plan.md):** The authoritative test plan covering the testing pyramid, PGlite vs production Supabase capabilities, operations-agreed performance targets (SLOs), adversarial penetration suites, open defects, and human production readiness sign-offs.

## Automated Verification Suites

| Test Suite                  | Scope                                                              | Runner / Command                                          | Status              |
| :-------------------------- | :----------------------------------------------------------------- | :-------------------------------------------------------- | :------------------ |
| **Quality & Licenses**      | Workspace hygiene, secret scanning & open-source licenses          | `pnpm verify:licenses && pnpm verify`                     | **PASS**            |
| **Contracts**               | Schema validation, state machine progression, bilingual dictionary | `pnpm --filter @humanity/contracts test`                  | **PASS (29/29)**    |
| **Web Foundation & UI**     | App shell, workflows, accessibility, WCAG AA, Bidi text            | `pnpm --filter web test && pnpm build:web`                | **PASS (40/40)**    |
| **Mobile Foundation**       | Flutter auth, casework, encrypted sync, accessibility, Bidi        | `cd apps/mobile; flutter test && flutter analyze`         | **PASS (38/38)**    |
| **Database Policies (RLS)** | Anonymous denial, scoped queries, maker-checker, immutability      | `pnpm test:rls && pnpm test:workflows && pnpm test:audit` | **PASS (76/76)**    |
| **Adversarial Security**    | Enumeration/IDOR, scope escalation, upload checks, replay attacks  | `pnpm test:adversarial`                                   | **PASS (7/7)**      |
| **Performance Benchmark**   | 10k+ beneficiaries, 100+ staff synthetic load test                 | `pnpm benchmark`                                          | **PASS (5/5 SLOs)** |

> [!IMPORTANT]
> **Production Readiness Notice:** Automated verification alone does not prove production readiness. Prior to deployment, review the formal operational sign-off requirements in [test_plan.md](./test_plan.md#7-production-readiness-gate-criteria).
