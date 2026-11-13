# Humanity Platform: Architecture & Trust Boundaries Overview

**Version:** 1.0.0  
**Target Backend:** Single Self-Hosted Supabase / PostgreSQL Instance  
**Clients:** Next.js Web Administration & Flutter Android/iOS Field Mobile

---

## 1. Single Shared Backend Architecture

Humanity rejects dual-backend architectures. Both the Next.js Web Administration portal and the Flutter Field Mobile application connect to **one unified, self-hosted Supabase/PostgreSQL backend**.

```mermaid
flowchart TD
    subgraph Untrusted_Clients["Untrusted Client Tier (Public Network)"]
        direction LR
        Mobile["📱 Field Mobile (Flutter)<br/>Android / iOS (Offline-Capable)"]
        Web["💻 Admin Console (Next.js 15)<br/>Bilingual RTL/LTR Dashboard"]
    end

    subgraph Perimeter["Security Perimeter (TLS Reverse Proxy & WAF)"]
        Proxy["Traefik / Nginx Reverse Proxy<br/>Rate Limiting · TLS 1.3 · IP Filtering"]
    end

    subgraph Internal_Backend["Organization-Controlled Infrastructure (Self-Hosted)"]
        Kong["Supabase API Gateway (Kong)"]
        AuthSvc["GoTrue Auth Service<br/>(JWT, Scoped Sessions)"]
        PostgREST["PostgREST Engine<br/>(Auto REST API from Schema)"]
        StorageEngine["Supabase Storage Service<br/>(Private MinIO/S3 Buckets)"]
        EdgeWorker["Privileged Edge Routines<br/>(Maker-Checker & Approvals)"]

        subgraph Core_DB["PostgreSQL 15 (Single Source of Truth)"]
            Tables["Application Tables<br/>(Beneficiaries, Cases, Finance)"]
            RLS["Row-Level Security (RLS)<br/>Deny-by-Default Authorization"]
            Audit["Append-Only Audit Trail<br/>Immutable Ledger"]
        end
    end

    Mobile -->|HTTPS / WSS (Anon Key + Bearer JWT)| Proxy
    Web -->|HTTPS / WSS (Anon Key + Bearer JWT)| Proxy
    Proxy --> Kong
    Kong --> AuthSvc
    Kong --> PostgREST
    Kong --> StorageEngine
    Kong --> EdgeWorker
    PostgREST --> RLS
    StorageEngine --> RLS
    EdgeWorker --> Core_DB
    RLS --> Tables
    RLS --> Audit
```

---

## 2. Trust Boundaries & Security Zones

### Zone 1: Client Tier (Untrusted)

- **Mobile Devices (Flutter):** Caseworker tablets and phones operating in the field. Treated as untrusted because physical devices can be lost, stolen, or compromised.
  - Local database is encrypted at rest using AES-256 (SQLCipher) with encryption keys managed by Android Keystore / iOS Keychain.
  - Only assigned caseloads are cached locally.
  - Master data exports and bulk downloading are structurally prohibited on mobile.
- **Web Browsers (Next.js):** Caseworkers and managers access via modern browsers. Client-side authentication tokens are stored in `HttpOnly`, `SameSite=Strict`, `Secure` cookies managed by `@supabase/ssr`.

### Zone 2: API Gateway & Perimeter (Demilitarized Zone)

- All external traffic terminates at a hardened reverse proxy with TLS 1.3.
- Anonymous Supabase public keys (`anon_key`) are public and grant zero baseline table access without authenticated bearer tokens.
- Service-role key (`service_role`) is **never shipped to mobile or web client bundles**. It is restricted strictly to server-side background runners and privileged functions.

### Zone 3: PostgreSQL Database Engine (Trusted Core)

- **Row-Level Security (RLS):** All data access control is evaluated inside PostgreSQL via RLS policies.
- User roles and geographic/programme scopes are loaded from trusted server-side relational tables (`user_roles`, `user_scopes`), **never trusted from client claims or JWT manipulation**.

---

## 3. Offline Synchronization Scope & Invariants

```
┌──────────────────────────────────────────────┐
│       Permitted Offline Field Work           │
├──────────────────────────────────────────────┤
│  ✓ View pre-assigned beneficiary cases       │
│  ✓ Draft new beneficiary registrations       │
│  ✓ Complete versioned assessment forms       │
│  ✓ Record field visit notes & observations   │
│  ✓ Log appointment attendance                │
└──────────────────────────────────────────────┘
                       ▲
                       │
       [STRICT ARCHITECTURAL SEPARATION]
                       │
                       ▼
┌──────────────────────────────────────────────┐
│      Strictly Forbidden Offline Actions      │
├──────────────────────────────────────────────┤
│  ✗ Financial disbursement or cash allocation │
│  ✗ Case approval or rejection decisions      │
│  ✗ Maker-checker sign-offs                   │
│  ✗ Bulk export or unassigned case queries    │
│  ✗ Direct database schema overrides          │
└──────────────────────────────────────────────┘
```

### Sync Conflict Resolution Strategy

- All client mutations generate a deterministic client-side UUID (`mutation_id`), an `idempotency_key`, and the client's current vector clock / timestamp.
- When re-establishing connectivity:
  - Non-conflicting mutations (e.g. append-only visit notes) are ingested automatically.
  - Entity updates conflicting with existing server-side edits generate a `sync_conflict` record.
  - The system **never silently overwrites** newer server data. Conflicting records enter a human-supervised conflict queue in the Admin Web Console.

---

## 4. Internationalization & Localization Architecture

### Arabic (RTL Default) & English (LTR)

- **Default Locale:** Arabic (`ar-IQ`). All database seeds, system categories, and default views are rendered RTL.
- **Directionality Isolation:** CSS and Flutter widgets use bidirectional properties:
  - In CSS / Tailwind: `start-`, `end-`, `ms-`, `me-` rather than fixed `left-` and `right-`.
  - In Flutter: `Directionality` widgets with `EdgeInsetsDirectional`.
- **Number & Currency Formatting:**
  - Currencies: Iraqi Dinar (`IQD` / `د.ع`) and US Dollar (`USD` / `$`).
  - Explicit toggle between Western Arabic numerals (`0, 1, 2, 3...`) and Eastern Arabic numerals (`٠, ١, ٢, ٣...`).
- **Name Collation:** PostgreSQL utilizes ICU collations (`ar-u-co-compat`) to ensure accurate alphabetization of Arabic names across variants of _Alif_, _Yaa_, and _Taa Marbuta_.

---

## 5. Scale & Performance Targets

- **Beneficiary Caseload:** 10,000+ registered households with multi-year assistance history.
- **Staff Base:** 100+ concurrent caseworkers, supervisors, and finance officers.
- **PostgreSQL Optimization:**
  - B-Tree composite indexes on `(programme_code, status, created_at)`.
  - Trigram indexes (`pg_trgm`) for fuzzy Arabic name searching without table scans.
  - Keyset cursor-based pagination for large listing views.
  - Maximum query budget of 100ms for caseworker dashboard endpoints.
