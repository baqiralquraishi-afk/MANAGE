# ADR-001: Single Unified Backend (PostgreSQL & Supabase)

**Status:** Accepted  
**Date:** 13 November 2026

## Context

The platform requires mobile access for field staff and web access for administrators and finance teams across Iraq. Creating separate backends or bespoke API silos for web and mobile creates schema drift, inconsistent validation, duplicate security policies, and high maintenance overhead for humanitarian operations.

## Decision

We establish **one shared self-hosted Supabase/PostgreSQL backend** serving both Next.js Web Admin and Flutter Mobile.

1. PostgreSQL is the single source of truth for all schemas, business constraints, and authorization rules.
2. Both clients consume data through PostgREST and Supabase client libraries using public anonymous credentials combined with authenticated user JWTs.
3. Row-Level Security (RLS) enforces authorization universally at the database level, ensuring neither client can bypass access policies.
4. Client models and validation schemas are generated or shared via `@humanity/contracts` to guarantee consistency.

## Consequences

- **Positive:** Eliminates backend duplication; eliminates sync issues between two different APIs; security rules are written and audited once in PostgreSQL.
- **Negative:** Requires rigorous RLS testing to ensure mobile clients cannot inspect unauthorized fields or relationships.
