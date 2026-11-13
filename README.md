# Humanity Platform (منصة إنسانية)

> A unified, Iraqi-governed humanitarian beneficiary and case-management system.

Designed for an Iraq-based organization supporting 10,000+ beneficiaries and 100+ field and administrative staff across eight essential programmes:

- **FIN:** Financial Assistance & Cash Transfers
- **FOD:** Food Security & Nutrition Parcels
- **MED:** Healthcare, Medical Referrals & Specialized Treatments
- **HOU:** Shelter Rehabilitation & Housing Assistance
- **EDU:** Child Education & Academic Sponsorship
- **EMG:** Emergency Rapid Response & Disaster Relief
- **EMP:** Livelihoods, Vocational Training & Employment
- **SOC:** Social Services, Legal Identity & Protection

---

## 1. Architectural Highlights

- **Client Applications:**
  - **Web Administration (`apps/web`):** Next.js 15, TypeScript, Tailwind CSS. Arabic RTL default, switchable to English LTR. Role-aware dashboards, human-in-the-loop duplicate review, dual-approval finance queues, and aggregate reporting.
  - **Field Mobile (`apps/mobile`):** Flutter & Dart application for Android and iOS. Offline-first encrypted storage (SQLCipher/SQLite), local draft validation, and idempotent sync.
- **Unified Backend (`supabase`):** Single self-hosted PostgreSQL database powering both clients with strict Row-Level Security (RLS), immutable audit trails, and server-side RBAC scoping.
- **Shared Contracts (`packages/contracts`):** Typed Zod validation schemas and shared domain interfaces ensuring zero logic divergence between web and mobile.

---

## 2. Repository Layout

```text
humanity/
├── apps/
│   ├── web/                    # Next.js 15 admin console (Arabic RTL / English LTR)
│   └── mobile/                 # Flutter mobile field application (Android / iOS)
├── packages/
│   └── contracts/              # Shared schemas, domain types, and validation
├── supabase/
│   ├── config.toml             # Local Supabase configuration
│   ├── migrations/             # Ordered additive SQL migrations
│   ├── seed.sql                # Synthetic baseline data (zero personal data)
│   ├── tests/                  # pgTAP and RLS authorization tests
│   └── functions/              # Narrowly scoped privileged backend routines
├── docs/
│   ├── reconnaissance.md       # Baseline inventory and feasibility report
│   ├── product/                # Requirements, roles, and casework workflows
│   ├── architecture/           # System design, ERDs, and Architecture Decision Records (ADRs)
│   ├── security/               # Threat models, permissions matrix, and incident response
│   ├── operations/             # Self-hosted Iraq infrastructure, backups, and DR
│   └── testing/                # Verification evidence and synthetic load testing
├── infra/                      # Deployment manifests (Docker Compose, reverse proxy)
├── scripts/                    # Safe development and verification helpers
├── .github/workflows/          # Continuous integration pipelines
├── .env.example                # Dummy environment template
└── README.md                   # System documentation
```

---

## 3. Quick Start & Developer Commands

### Prerequisites

- Git
- Node.js LTS (v22+)
- pnpm (`npm install -g pnpm`)
- Flutter SDK (v3.24+)
- Docker (for local Supabase instance)
- Supabase CLI

### Setup

```bash
# Clone private repository
git clone <repository-url> humanity
cd humanity

# Verify repository foundation and absence of exposed credentials
node scripts/verify-setup.js

# Install dependencies
pnpm install

# Run linting, typechecking, and tests
pnpm lint
pnpm typecheck
pnpm test
pnpm format
```

### Running Applications

```bash
# Web Admin Console (Next.js)
pnpm --filter web dev

# Shared Contracts
pnpm --filter @humanity/contracts build

# Mobile Application (Flutter)
cd apps/mobile
flutter pub get
flutter run
```

---

## 4. Safety & Governance Rules

1. **Zero Real Data in Repository:** Only synthetic, fictional test beneficiaries and staff records may be used in development.
2. **Never Disable RLS:** All tables containing beneficiary, household, financial, or case data must enforce deny-by-default Row-Level Security.
3. **No Offline Financial Releases:** Financial transactions and approvals require online server verification with maker-checker controls.
4. **Data Sovereignty:** Production deployments are designated strictly for organization-controlled infrastructure within Iraq.
