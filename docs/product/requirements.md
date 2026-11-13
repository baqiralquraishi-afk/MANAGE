# Humanity Platform: Comprehensive Product Requirements & Casework Workflows

**Version:** 1.0.0  
**Context:** Humanitarian Beneficiary & Case Management System (Iraq)  
**Target Scale:** 10,000+ Active Beneficiaries, 100+ Concurrent Staff  
**Default Language:** Arabic (RTL) | **Secondary Language:** English (LTR)

---

## 1. System Scope & Operational Context

Humanity is an enterprise humanitarian case management system engineered for non-governmental organizations operating across Iraq. The platform enables multi-sectoral assistance delivery, caseload tracking, and strict financial accounting across central coordination offices and field offices in Iraqi governorates (e.g., Baghdad, Ninewa, Erbil, Basra, Anbar, Kirkuk).

The platform enforces **one shared self-hosted backend** serving:

1. **Administrative & Programme Management Web Console (`apps/web`):** Next.js web application for intake supervisors, programme managers, finance controllers, executive directors, and auditors.
2. **Mobile Field Application (`apps/mobile`):** Flutter tablet/phone application for field caseworkers operating in urban, camp, and remote rural settings with intermittent or absent network connectivity.

---

## 2. Core Functional Casework Workflows

### 2.1 Beneficiary Intake & Identity Registration

- **Identity Data Minimization:** Registration collects only necessary biographical details: Primary Arabic Name (الاسم الرباعي واللقب), Transliterated English Name, National Identification Number (البطاقة الوطنية الموحدة or هوية الأحوال المدنية), Civil Status Record / Family Book (شهادة الجنسية / سجل الأحوال), Ration Card Number (بطاقة التموين), UNHCR Registration Number (where applicable), Date of Birth, Gender, Current Governorate, District, Sub-district, Neighborhood, and GPS Coordinates (optional, with explicit beneficiary consent).
- **Vulnerability Classifications:** Special vulnerability indicators (e.g., Female-Headed Household, Unaccompanied Minor, Chronic Medical Condition, Severe Physical Disability, Internally Displaced Person [IDP], Returnee, Host Community).

### 2.2 Deduplication Engine & Human-in-the-Loop Review

- **Zero Silent Merging:** The system must never automatically merge or silently discard duplicate beneficiary records.
- **Match Scoring:** During intake, the system checks phonetic similarity in Arabic (e.g., handling variations of أ/إ/ا, ه/ة, ى/ي), exact National ID matching, and phone/address proximity.
- **Duplicate Review Queue:** Potential matches (>70% confidence score) generate a flag in the Supervisor Duplicate Review Queue. An authorized supervisor must review both files side-by-side and record an explicit decision:
  - _Confirmed Duplicate:_ One record is marked as primary; subsequent assessments and assistance history are linked, preserving complete historical audit entries.
  - _Distinct Beneficiary:_ Records are marked distinct with recorded justification.

### 2.3 Informed Consent & Safeguarding

- **Bilingual Consent Protocols:** Beneficiaries must provide explicit informed consent in Arabic (or English) before assessment data is processed.
- **Safeguarding Tiering:** Special protection protocols for sensitive cases:
  - Child Protection (CP) cases: Identity redacted from standard caseworker views; restricted to designated CP specialists.
  - Gender-Based Violence (GBV) cases: Restricted viewing permissions; physical location data strictly masked.
- **Consent Revocation:** Beneficiaries retain the right to withdraw consent for secondary data sharing without forfeiting essential life-saving emergency relief.

### 2.4 Household Composition & Relationship History

- **Household Structure:** Dynamic tracking of household units with designated Principal Head of Household (معيل الأسرة).
- **Temporal Membership:** Family members can join, depart, or split households over time (e.g., marriage, death, relocation) while preserving chronological history without corrupting historical assistance distribution records.

### 2.5 Case Lifecycle & State Machine

Cases transition through an auditable, deterministic finite state machine:

```text
[Draft]
  │
  ▼
[Submitted] ──► [Under Assessment] ──► [Pending Approval]
                                              │
                     ┌────────────────────────┴───────────────────────┐
                     ▼                                                ▼
                [Approved]                                       [Rejected]
                     │
                     ▼
             [Active Delivery] ──► [Completed] ──► [Closed] ──► [Reopened]
```

- **State Transition Rules:**
  - Only caseworkers can submit drafts.
  - Only designated supervisors or programme managers can approve or reject cases.
  - Financial commitments can only be created from cases in `Approved` state.
  - Soft-closure requires documented exit assessment and supervisor sign-off.
  - Reopening requires an auditable justification record.

### 2.6 Versioned Assessments & Scoring

- **Dynamic, Versioned Questionnaires:** Assessment templates are version-controlled in the database. Changing a template never alters previously submitted assessment responses.
- **Scoring & Means-Testing:** Algorithmic calculation of vulnerability scores based on household size, dependency ratio, shelter condition, and income stability.

### 2.7 Multi-Sector Programme Matrix (8 Programmes)

1. **FIN (Financial Assistance & Cash Transfers):** Multi-purpose cash assistance (MPCA), emergency one-off cash grants, livelihoods seed capital.
2. **FOD (Food Security & Nutrition):** Monthly food parcel distributions, infant nutritional supplements, dry food rations.
3. **MED (Healthcare & Specialized Medical Support):** Chronic disease medication subsidies, specialized surgeries, assistive physical devices, psychiatric/mental health referrals.
4. **HOU (Shelter & Housing Rehabilitation):** Minor home repairs, winterization kits, emergency tent insulation, water/sanitation (WASH) rehabilitation.
5. **EDU (Child Education & Academic Sponsorship):** School enrollment support, stationery kits, non-formal education catch-up classes, transport stipends.
6. **EMG (Emergency Rapid Response):** Immediate disaster relief, flood/fire response, displacement transit kits within 48 hours of crisis.
7. **EMP (Employment & Livelihood Services):** Vocational training apprenticeships, business grant incubation, job placement matching.
8. **SOC (Social Services, Legal Identity & Civil Documentation):** Legal aid for lost civil documents, birth registrations, guardianship certification, psychosocial support.

### 2.8 Financial Controls & Segregation of Duties (Maker-Checker)

- **Dual Authorization:** All financial assistance allocations require strict Maker-Checker enforcement:
  - _Maker (Caseworker / Programme Officer):_ Creates assistance entitlement plan.
  - _Checker (Finance Controller / Manager):_ Validates budget line, confirms quota, and authorizes disbursement.
  - _Self-Approval Prevention:_ The system hard-fails and blocks any user attempting to approve a financial disbursement they created.
- **Immutable Financial Ledger:** All disbursements, voucher redemptions, and adjustments are recorded in an append-only transaction ledger. Records can never be updated (`UPDATE`) or deleted (`DELETE`).
- **Correction via Reversal Entries:** Adjustments are accomplished solely by issuing auditable compensating credit/debit reversal transactions referencing the original transaction ID.

### 2.9 Assistance Delivery & Verification

- **Traceable Distribution:** Physical aid or cash vouchers are distributed against secure verification:
  - Physical token/barcode presentation.
  - Verified national identity document check.
  - Real-time or batch-reconciled recipient signature / fingerprint acknowledgement flag.
- **Stock & Inventory Reconciliation:** For in-kind aid (food parcels, hygiene kits, shelter kits), warehouse release orders are matched against delivery confirmation records.

### 2.10 Field Visits, Appointments & Casework Notes

- **Visit Logs:** Caseworkers record home visits, GPS-verified check-ins, household condition observations, and scheduled follow-up actions.
- **Appointment Scheduling:** Tracks beneficiary appointments at community centers or field clinics, with status tracking (Scheduled, Attended, Missed, Rescheduled).

### 2.11 Document Management

- **Encrypted Private Storage:** Beneficiary documentation (ID scans, medical reports, tenancy agreements) is stored in private, unexposed Supabase Storage buckets.
- **Short-Lived Signed URLs:** Documents are accessible only via time-bounded signed URLs (maximum 15-minute validity) generated server-side after verifying the requesting user's RLS permissions.

### 2.12 Reporting, Privacy Budgets & Aggregation

- **Small-Group Suppression:** Reports automatically suppress aggregate counts less than 5 to prevent re-identification of individuals in small geographic sub-districts.
- **Scoped Exports:** Data export to CSV/Excel is restricted to authorized roles and logged to the security audit trail with export parameter recording.

---

## 3. Unresolved Policy Decisions & Assigned Owners

To prevent the technical team from making organizational and legal assumptions, the following decisions are explicitly logged as unresolved and awaiting formal organizational determination:

| #          | Policy Area                    | Description of Open Policy Decision                                                                              | Assigned Owner              |
| :--------- | :----------------------------- | :--------------------------------------------------------------------------------------------------------------- | :-------------------------- |
| **POL-01** | Financial Approval Limits      | Exact IQD/USD currency ceilings separating Level 1 supervisor approval from Level 2 Executive Director approval. | **Finance Director**        |
| **POL-02** | Eligibility Scoring Thresholds | Official minimum scoring thresholds for MPCA cash grant eligibility across governorates.                         | **Programme Lead**          |
| **POL-03** | Data Retention & Purging       | Retention period for closed cases (e.g. 5 vs. 7 years) and legal hold exceptions under Iraqi regulations.        | **Legal & Privacy Officer** |
| **POL-04** | Safeguarding Disclosure Rules  | Legal obligations regarding mandatory reporting of child harm or GBV to local Iraqi authorities.                 | **Safeguarding Lead**       |
| **POL-05** | Offline Field Expiration       | Time limit (e.g. 24 hours vs. 7 days) before cached offline caseworker tokens and drafts expire.                 | **Security Admin**          |
