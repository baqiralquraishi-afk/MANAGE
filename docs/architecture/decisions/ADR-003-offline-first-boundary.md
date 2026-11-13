# ADR-003: Encrypted Offline Field Scope & Sync Boundaries

**Status:** Accepted  
**Date:** 13 November 2026

## Context

Field caseworkers in Iraqi governorates frequently work in remote rural communities or displacement camps where 3G/4G connectivity is unavailable or erratic. However, caching sensitive beneficiary personal data on mobile devices presents a major data breach risk if devices are lost, seized, or stolen.

## Decision

1. **Bounded Scope:** Mobile devices can only download and cache cases explicitly assigned to the authenticated caseworker. Bulk downloading or global beneficiary searches are disabled offline.
2. **Encrypted Storage:** Local databases on mobile must use AES-256 database encryption (e.g., SQLCipher/encrypted SQLite) with keys anchored in hardware-backed Android Keystore or iOS Keychain.
3. **No Offline Financial Decisions:** Eligibility determination, case approval/rejection, and financial disbursements are structurally prohibited offline. Caseworkers can only capture draft intakes, assessments, and visit logs offline.
4. **Idempotent Mutations & Human Conflict Resolution:** All offline actions are queued as idempotent mutations. In case of conflicting edits, the server flags the conflict for human review in the web console; no silent overwriting is permitted.
5. **Session Expiry & Data Purging:** Cached offline records expire after an administratively configured duration (e.g. 72 hours) and are securely wiped upon user sign-out.

## Consequences

- **Positive:** Minimizes data loss in the field while preventing massive data leakage in the event of device compromise.
- **Negative:** Caseworkers cannot execute financial authorizations while offline.
