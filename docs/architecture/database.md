# Humanity Platform: Comprehensive Database Architecture & Data Dictionary

**Document:** `docs/architecture/database.md`  
**Version:** 1.0.0  
**Target RDBMS:** PostgreSQL 15+ (Single Shared Instance via Supabase)  
**Schema Model:** Relational 3NF with JSONB for dynamic versioned assessment responses  
**Character Encoding:** `UTF8` with ICU Arabic Collation (`ar-u-co-compat`)

---

## 1. Schema Conventions & Data Classifications

### 1.1 Temporal & Key Invariants

- **Primary Keys:** `UUIDv4` (`gen_random_uuid()`) for all application entities.
- **Timestamps:** Every table contains `created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()`. Timezones are always UTC in the database.
- **Soft-Deletion:** Sensitive operational tables implement `deleted_at TIMESTAMPTZ` with `deleted_by UUID REFERENCES staff_profiles(id)`. Direct `DELETE` is prohibited.
- **Forward-Fix Migrations:** All production migrations are ordered and additive. Destructive changes (column drops, table drops) are prohibited without multi-phase deprecation and data preservation backups.

### 1.2 Data Classification Tiers

1. **Tier 1 (Public / Reference):** Administrative geographies, programmes, system roles.
2. **Tier 2 (Operational Internal):** Case workflows, assessment templates, appointment slots.
3. **Tier 3 (Confidential Beneficiary PII):** Beneficiary full names, contact numbers, national identity card numbers, household compositions.
4. **Tier 4 (High-Risk Sensitive / Safeguarding):** Child protection flags, GBV indicator notes, exact shelter GPS coordinates, medical diagnostic notes.
5. **Tier 5 (Immutable Financial & Audit):** Append-only financial ledger entries and security audit logs.

---

## 2. Comprehensive Data Dictionary

### 2.1 Geographic Hierarchy

#### `geo_governorates`

| Column      | Type          | Constraints             | Description                                           |
| :---------- | :------------ | :---------------------- | :---------------------------------------------------- |
| `id`        | `VARCHAR(10)` | `PRIMARY KEY`           | Governorate ISO/postal code (e.g., `IQ-BG`, `IQ-NI`). |
| `name_ar`   | `TEXT`        | `NOT NULL`              | Arabic name (e.g. بغداد, نينوى, أربيل, البصرة).       |
| `name_en`   | `TEXT`        | `NOT NULL`              | English name (e.g. Baghdad, Ninewa, Erbil, Basra).    |
| `is_active` | `BOOLEAN`     | `NOT NULL DEFAULT true` | Active operations flag.                               |

#### `geo_districts`

| Column           | Type          | Constraints                                | Description                               |
| :--------------- | :------------ | :----------------------------------------- | :---------------------------------------- |
| `id`             | `VARCHAR(20)` | `PRIMARY KEY`                              | District unique code (e.g., `IQ-BG-KAD`). |
| `governorate_id` | `VARCHAR(10)` | `NOT NULL REFERENCES geo_governorates(id)` | Parent governorate.                       |
| `name_ar`        | `TEXT`        | `NOT NULL`                                 | Arabic district name.                     |
| `name_en`        | `TEXT`        | `NOT NULL`                                 | English district name.                    |

---

### 2.2 Staff Identity, Roles & Scopes

#### `staff_profiles`

| Column         | Type           | Constraints                                                | Description               |
| :------------- | :------------- | :--------------------------------------------------------- | :------------------------ |
| `id`           | `UUID`         | `PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT` | Supabase Auth user link.  |
| `email`        | `VARCHAR(255)` | `NOT NULL UNIQUE`                                          | Official staff email.     |
| `full_name_ar` | `TEXT`         | `NOT NULL`                                                 | Full name in Arabic.      |
| `full_name_en` | `TEXT`         | `NOT NULL`                                                 | Full name in English.     |
| `phone_number` | `VARCHAR(32)`  | `NULL`                                                     | Contact phone.            |
| `is_active`    | `BOOLEAN`      | `NOT NULL DEFAULT true`                                    | Active employment status. |
| `created_at`   | `TIMESTAMPTZ`  | `NOT NULL DEFAULT clock_timestamp()`                       | Registration timestamp.   |
| `updated_at`   | `TIMESTAMPTZ`  | `NOT NULL DEFAULT clock_timestamp()`                       | Update timestamp.         |

#### `staff_roles`

| Column        | Type          | Constraints                                                | Description                                                                                                                                        |
| :------------ | :------------ | :--------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`                    | Role grant UUID.                                                                                                                                   |
| `staff_id`    | `UUID`        | `NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE` | Staff member.                                                                                                                                      |
| `role`        | `VARCHAR(50)` | `NOT NULL`                                                 | Enum: `intake`, `caseworker`, `supervisor`, `programme_manager`, `finance_maker`, `finance_checker`, `auditor`, `report_viewer`, `security_admin`. |
| `is_active`   | `BOOLEAN`     | `NOT NULL DEFAULT true`                                    | Role status.                                                                                                                                       |
| `assigned_by` | `UUID`        | `NOT NULL REFERENCES staff_profiles(id)`                   | Granting administrator.                                                                                                                            |
| `created_at`  | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`                       | Grant timestamp.                                                                                                                                   |

- **Constraint:** `UNIQUE (staff_id, role)`.

#### `staff_scopes`

| Column           | Type          | Constraints                                                | Description                                  |
| :--------------- | :------------ | :--------------------------------------------------------- | :------------------------------------------- |
| `id`             | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`                    | Scope grant UUID.                            |
| `staff_id`       | `UUID`        | `NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE` | Staff member.                                |
| `governorate_id` | `VARCHAR(10)` | `NULL REFERENCES geo_governorates(id)`                     | Assigned governorate (NULL = national).      |
| `programme_code` | `VARCHAR(10)` | `NULL REFERENCES programmes(code)`                         | Assigned programme (NULL = multi-programme). |
| `created_at`     | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`                       | Scope grant timestamp.                       |

---

### 2.3 Beneficiaries & Deduplication

#### `beneficiaries`

| Column                   | Type          | Constraints                                | Description                                                       |
| :----------------------- | :------------ | :----------------------------------------- | :---------------------------------------------------------------- |
| `id`                     | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`    | Beneficiary unique ID.                                            |
| `national_id_type`       | `VARCHAR(32)` | `NOT NULL`                                 | `national_card`, `civil_status_id`, `residency_card`, `unhcr_id`. |
| `national_id_number`     | `VARCHAR(64)` | `NOT NULL`                                 | National identity number.                                         |
| `full_name_ar`           | `TEXT`        | `NOT NULL`                                 | Beneficiary Arabic quadruple name + title.                        |
| `full_name_en`           | `TEXT`        | `NULL`                                     | Beneficiary transliterated English name.                          |
| `mother_name_ar`         | `TEXT`        | `NULL`                                     | Mother's name in Arabic (crucial Iraqi legal identifier).         |
| `date_of_birth`          | `DATE`        | `NOT NULL`                                 | Date of birth.                                                    |
| `gender`                 | `VARCHAR(16)` | `NOT NULL`                                 | `male`, `female`, `other`.                                        |
| `phone_primary`          | `VARCHAR(32)` | `NOT NULL`                                 | Primary mobile number.                                            |
| `phone_secondary`        | `VARCHAR(32)` | `NULL`                                     | Alternative contact.                                              |
| `governorate_id`         | `VARCHAR(10)` | `NOT NULL REFERENCES geo_governorates(id)` | Current governorate.                                              |
| `district_id`            | `VARCHAR(20)` | `NOT NULL REFERENCES geo_districts(id)`    | Current district.                                                 |
| `address_details`        | `TEXT`        | `NOT NULL`                                 | Neighborhood and street info.                                     |
| `displacement_status`    | `VARCHAR(32)` | `NOT NULL`                                 | `idp`, `returnee`, `refugee`, `host_community`.                   |
| `vulnerability_flags`    | `TEXT[]`      | `NOT NULL DEFAULT '{}'`                    | Array of vulnerability codes.                                     |
| `is_safeguarded`         | `BOOLEAN`     | `NOT NULL DEFAULT false`                   | Heightened protection flag (CP/GBV).                              |
| `duplicate_status`       | `VARCHAR(32)` | `NOT NULL DEFAULT 'clean'`                 | `clean`, `flagged_review`, `confirmed_duplicate`.                 |
| `primary_beneficiary_id` | `UUID`        | `NULL REFERENCES beneficiaries(id)`        | Link if marked as duplicate of primary.                           |
| `created_by`             | `UUID`        | `NOT NULL REFERENCES staff_profiles(id)`   | Creator staff.                                                    |
| `created_at`             | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`       | Registration timestamp.                                           |
| `updated_at`             | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`       | Modification timestamp.                                           |
| `deleted_at`             | `TIMESTAMPTZ` | `NULL`                                     | Soft-delete marker.                                               |

#### `duplicate_reviews`

| Column                   | Type           | Constraints                             | Description                                          |
| :----------------------- | :------------- | :-------------------------------------- | :--------------------------------------------------- |
| `id`                     | `UUID`         | `PRIMARY KEY DEFAULT gen_random_uuid()` | Review record ID.                                    |
| `target_beneficiary_id`  | `UUID`         | `NOT NULL REFERENCES beneficiaries(id)` | Beneficiary undergoing review.                       |
| `matched_beneficiary_id` | `UUID`         | `NOT NULL REFERENCES beneficiaries(id)` | Existing candidate match.                            |
| `match_score`            | `NUMERIC(5,2)` | `NOT NULL`                              | Confidence score (0.00 to 100.00).                   |
| `match_reasons`          | `JSONB`        | `NOT NULL`                              | Specific match factors (ID, name, phone).            |
| `status`                 | `VARCHAR(32)`  | `NOT NULL DEFAULT 'pending'`            | `pending`, `confirmed_duplicate`, `marked_distinct`. |
| `decision_notes`         | `TEXT`         | `NULL`                                  | Justification note from supervisor.                  |
| `decided_by`             | `UUID`         | `NULL REFERENCES staff_profiles(id)`    | Deciding supervisor.                                 |
| `decided_at`             | `TIMESTAMPTZ`  | `NULL`                                  | Decision timestamp.                                  |

---

### 2.4 Households & Consents

#### `households`

| Column                | Type          | Constraints                                | Description                                                                             |
| :-------------------- | :------------ | :----------------------------------------- | :-------------------------------------------------------------------------------------- |
| `id`                  | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`    | Household unique ID.                                                                    |
| `head_beneficiary_id` | `UUID`        | `NOT NULL REFERENCES beneficiaries(id)`    | Primary head of household.                                                              |
| `governorate_id`      | `VARCHAR(10)` | `NOT NULL REFERENCES geo_governorates(id)` | Location governorate.                                                                   |
| `district_id`         | `VARCHAR(20)` | `NOT NULL REFERENCES geo_districts(id)`    | Location district.                                                                      |
| `shelter_type`        | `VARCHAR(50)` | `NOT NULL`                                 | `owned_house`, `rented_house`, `informal_settlement`, `camp_tent`, `damaged_structure`. |
| `created_at`          | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`       | Creation timestamp.                                                                     |

#### `household_members`

| Column                 | Type          | Constraints                                                | Description                                                          |
| :--------------------- | :------------ | :--------------------------------------------------------- | :------------------------------------------------------------------- |
| `id`                   | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`                    | Household link ID.                                                   |
| `household_id`         | `UUID`        | `NOT NULL REFERENCES households(id) ON DELETE RESTRICT`    | Household unit.                                                      |
| `beneficiary_id`       | `UUID`        | `NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT` | Member beneficiary.                                                  |
| `relationship_to_head` | `VARCHAR(32)` | `NOT NULL`                                                 | `head`, `spouse`, `child`, `parent`, `sibling`, `extended_relative`. |
| `joined_at`            | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`                       | Date joined household.                                               |
| `left_at`              | `TIMESTAMPTZ` | `NULL`                                                     | Date departed household (if moved/deceased).                         |

#### `beneficiary_consents`

| Column                           | Type          | Constraints                              | Description                                 |
| :------------------------------- | :------------ | :--------------------------------------- | :------------------------------------------ |
| `id`                             | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`  | Consent record ID.                          |
| `beneficiary_id`                 | `UUID`        | `NOT NULL REFERENCES beneficiaries(id)`  | Consenting beneficiary.                     |
| `consent_version`                | `VARCHAR(16)` | `NOT NULL`                               | Policy version (e.g. `v1.0-2026`).          |
| `language`                       | `VARCHAR(8)`  | `NOT NULL DEFAULT 'ar'`                  | Language of consent (`ar`, `en`).           |
| `has_given_general_consent`      | `BOOLEAN`     | `NOT NULL`                               | Mandatory consent for case management.      |
| `has_given_data_sharing_consent` | `BOOLEAN`     | `NOT NULL DEFAULT false`                 | Optional consent for inter-agency referral. |
| `recorded_by`                    | `UUID`        | `NOT NULL REFERENCES staff_profiles(id)` | Witness caseworker.                         |
| `recorded_at`                    | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`     | Signature/mark timestamp.                   |

---

### 2.5 Programmes & Cases

#### `programmes`

| Column           | Type          | Constraints             | Description                                                   |
| :--------------- | :------------ | :---------------------- | :------------------------------------------------------------ |
| `code`           | `VARCHAR(10)` | `PRIMARY KEY`           | Enum: `FIN`, `FOD`, `MED`, `HOU`, `EDU`, `EMG`, `EMP`, `SOC`. |
| `name_ar`        | `TEXT`        | `NOT NULL`              | Arabic title.                                                 |
| `name_en`        | `TEXT`        | `NOT NULL`              | English title.                                                |
| `description_ar` | `TEXT`        | `NOT NULL`              | Arabic description.                                           |
| `description_en` | `TEXT`        | `NOT NULL`              | English description.                                          |
| `is_active`      | `BOOLEAN`     | `NOT NULL DEFAULT true` | Active status.                                                |

#### `cases`

| Column                   | Type          | Constraints                                | Description                                                                                                                    |
| :----------------------- | :------------ | :----------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`    | Case ID.                                                                                                                       |
| `case_reference`         | `VARCHAR(32)` | `NOT NULL UNIQUE`                          | Human-readable ref (e.g. `HUM-2026-FIN-00123`).                                                                                |
| `beneficiary_id`         | `UUID`        | `NOT NULL REFERENCES beneficiaries(id)`    | Primary client.                                                                                                                |
| `household_id`           | `UUID`        | `NOT NULL REFERENCES households(id)`       | Associated household.                                                                                                          |
| `programme_code`         | `VARCHAR(10)` | `NOT NULL REFERENCES programmes(code)`     | Humanitarian sector programme.                                                                                                 |
| `status`                 | `VARCHAR(32)` | `NOT NULL DEFAULT 'draft'`                 | `draft`, `submitted`, `under_assessment`, `pending_approval`, `approved`, `rejected`, `active_delivery`, `closed`, `reopened`. |
| `priority`               | `VARCHAR(16)` | `NOT NULL DEFAULT 'medium'`                | `low`, `medium`, `high`, `critical_emergency`.                                                                                 |
| `assigned_caseworker_id` | `UUID`        | `NULL REFERENCES staff_profiles(id)`       | Responsible caseworker.                                                                                                        |
| `governorate_id`         | `VARCHAR(10)` | `NOT NULL REFERENCES geo_governorates(id)` | Operational governorate.                                                                                                       |
| `created_by`             | `UUID`        | `NOT NULL REFERENCES staff_profiles(id)`   | Creator.                                                                                                                       |
| `created_at`             | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`       | Creation timestamp.                                                                                                            |
| `updated_at`             | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`       | Update timestamp.                                                                                                              |
| `closed_at`              | `TIMESTAMPTZ` | `NULL`                                     | Closure timestamp.                                                                                                             |
| `closure_reason`         | `TEXT`        | `NULL`                                     | Documented reason for closure.                                                                                                 |

#### `case_status_history`

| Column          | Type          | Constraints                                       | Description           |
| :-------------- | :------------ | :------------------------------------------------ | :-------------------- |
| `id`            | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`           | History log ID.       |
| `case_id`       | `UUID`        | `NOT NULL REFERENCES cases(id) ON DELETE CASCADE` | Target case.          |
| `from_status`   | `VARCHAR(32)` | `NOT NULL`                                        | Previous status.      |
| `to_status`     | `VARCHAR(32)` | `NOT NULL`                                        | New status.           |
| `changed_by`    | `UUID`        | `NOT NULL REFERENCES staff_profiles(id)`          | Acting staff.         |
| `justification` | `TEXT`        | `NULL`                                            | Reason / remarks.     |
| `created_at`    | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`              | Transition timestamp. |

---

### 2.6 Assessments & Approvals

#### `assessment_templates`

| Column              | Type          | Constraints                             | Description                               |
| :------------------ | :------------ | :-------------------------------------- | :---------------------------------------- |
| `id`                | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()` | Template ID.                              |
| `programme_code`    | `VARCHAR(10)` | `NOT NULL REFERENCES programmes(code)`  | Programme association.                    |
| `version`           | `INT`         | `NOT NULL`                              | Incremental integer version.              |
| `title_ar`          | `TEXT`        | `NOT NULL`                              | Arabic title.                             |
| `title_en`          | `TEXT`        | `NOT NULL`                              | English title.                            |
| `schema_definition` | `JSONB`       | `NOT NULL`                              | Question definitions, types, validations. |
| `is_published`      | `BOOLEAN`     | `NOT NULL DEFAULT false`                | Live status.                              |
| `created_at`        | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`    | Publication date.                         |

- **Constraint:** `UNIQUE (programme_code, version)`.

#### `assessment_submissions`

| Column           | Type           | Constraints                                       | Description                      |
| :--------------- | :------------- | :------------------------------------------------ | :------------------------------- |
| `id`             | `UUID`         | `PRIMARY KEY DEFAULT gen_random_uuid()`           | Submission ID.                   |
| `case_id`        | `UUID`         | `NOT NULL REFERENCES cases(id) ON DELETE CASCADE` | Associated case.                 |
| `template_id`    | `UUID`         | `NOT NULL REFERENCES assessment_templates(id)`    | Frozen template version.         |
| `responses`      | `JSONB`        | `NOT NULL`                                        | Actual answers submitted.        |
| `computed_score` | `NUMERIC(6,2)` | `NULL`                                            | Algorithmic vulnerability score. |
| `assessed_by`    | `UUID`         | `NOT NULL REFERENCES staff_profiles(id)`          | Caseworker.                      |
| `submitted_at`   | `TIMESTAMPTZ`  | `NOT NULL DEFAULT clock_timestamp()`              | Submission timestamp.            |

#### `case_approvals`

| Column          | Type          | Constraints                              | Description                                                             |
| :-------------- | :------------ | :--------------------------------------- | :---------------------------------------------------------------------- |
| `id`            | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`  | Approval record ID.                                                     |
| `case_id`       | `UUID`        | `NOT NULL REFERENCES cases(id)`          | Associated case.                                                        |
| `approval_type` | `VARCHAR(32)` | `NOT NULL`                               | `programme_eligibility`, `financial_disbursement`, `special_exception`. |
| `maker_id`      | `UUID`        | `NOT NULL REFERENCES staff_profiles(id)` | Maker (submitting officer).                                             |
| `checker_id`    | `UUID`        | `NULL REFERENCES staff_profiles(id)`     | Checker (authorizing supervisor/manager).                               |
| `status`        | `VARCHAR(32)` | `NOT NULL DEFAULT 'pending'`             | `pending`, `approved`, `rejected`.                                      |
| `comments`      | `TEXT`        | `NULL`                                   | Approval remarks.                                                       |
| `created_at`    | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`     | Creation timestamp.                                                     |
| `decided_at`    | `TIMESTAMPTZ` | `NULL`                                   | Decision timestamp.                                                     |

- **Maker-Checker Constraint:** `CHECK (maker_id != checker_id)`.

---

### 2.7 Assistance & Immutable Financial Ledger

#### `assistance_entitlements`

| Column              | Type            | Constraints                             | Description                                                                                |
| :------------------ | :-------------- | :-------------------------------------- | :----------------------------------------------------------------------------------------- |
| `id`                | `UUID`          | `PRIMARY KEY DEFAULT gen_random_uuid()` | Entitlement ID.                                                                            |
| `case_id`           | `UUID`          | `NOT NULL REFERENCES cases(id)`         | Case link.                                                                                 |
| `assistance_type`   | `VARCHAR(32)`   | `NOT NULL`                              | `cash_mpca`, `in_kind_food`, `medical_stipend`, `shelter_repair_voucher`, `education_kit`. |
| `currency`          | `VARCHAR(8)`    | `NOT NULL DEFAULT 'IQD'`                | `IQD` or `USD`.                                                                            |
| `authorized_amount` | `NUMERIC(14,2)` | `NOT NULL`                              | Quantitative amount or cash value.                                                         |
| `disbursed_amount`  | `NUMERIC(14,2)` | `NOT NULL DEFAULT 0.00`                 | Reconciled disbursed amount.                                                               |
| `status`            | `VARCHAR(32)`   | `NOT NULL DEFAULT 'authorized'`         | `authorized`, `in_progress`, `completed`, `canceled`.                                      |
| `created_at`        | `TIMESTAMPTZ`   | `NOT NULL DEFAULT clock_timestamp()`    | Creation timestamp.                                                                        |

#### `finance_ledger` (IMMUTABLE APPEND-ONLY)

| Column                       | Type            | Constraints                                       | Description                                                                       |
| :--------------------------- | :-------------- | :------------------------------------------------ | :-------------------------------------------------------------------------------- |
| `id`                         | `UUID`          | `PRIMARY KEY DEFAULT gen_random_uuid()`           | Transaction ledger ID.                                                            |
| `entitlement_id`             | `UUID`          | `NOT NULL REFERENCES assistance_entitlements(id)` | Associated entitlement.                                                           |
| `transaction_type`           | `VARCHAR(32)`   | `NOT NULL`                                        | `disbursement`, `reversal_credit`, `reversal_debit`, `reconciliation_adjustment`. |
| `transaction_reference`      | `VARCHAR(64)`   | `NOT NULL UNIQUE`                                 | Bank/receipt reference code.                                                      |
| `amount`                     | `NUMERIC(14,2)` | `NOT NULL CHECK (amount > 0)`                     | Absolute transaction value.                                                       |
| `currency`                   | `VARCHAR(8)`    | `NOT NULL DEFAULT 'IQD'`                          | `IQD` or `USD`.                                                                   |
| `maker_id`                   | `UUID`          | `NOT NULL REFERENCES staff_profiles(id)`          | Staff creating entry.                                                             |
| `checker_id`                 | `UUID`          | `NOT NULL REFERENCES staff_profiles(id)`          | Staff verifying entry.                                                            |
| `reversal_of_transaction_id` | `UUID`          | `NULL REFERENCES finance_ledger(id)`              | Links to original transaction if reversal.                                        |
| `rationale`                  | `TEXT`          | `NOT NULL`                                        | Justification note.                                                               |
| `posted_at`                  | `TIMESTAMPTZ`   | `NOT NULL DEFAULT clock_timestamp()`              | Ledger write timestamp.                                                           |

- **Constraints & Triggers:**
  - Immutability trigger raises exception on any `UPDATE` or `DELETE`.
  - `CHECK (maker_id != checker_id)`.

---

### 2.8 Field Activities, Appointments & Private Documents

#### `caseworker_visits`

| Column          | Type           | Constraints                              | Description                        |
| :-------------- | :------------- | :--------------------------------------- | :--------------------------------- |
| `id`            | `UUID`         | `PRIMARY KEY DEFAULT gen_random_uuid()`  | Visit ID.                          |
| `case_id`       | `UUID`         | `NOT NULL REFERENCES cases(id)`          | Visited case.                      |
| `caseworker_id` | `UUID`         | `NOT NULL REFERENCES staff_profiles(id)` | Attending caseworker.              |
| `visit_date`    | `DATE`         | `NOT NULL`                               | Date of visit.                     |
| `gps_latitude`  | `NUMERIC(9,6)` | `NULL`                                   | Optional latitude (if consented).  |
| `gps_longitude` | `NUMERIC(9,6)` | `NULL`                                   | Optional longitude (if consented). |
| `notes`         | `TEXT`         | `NOT NULL`                               | Field observations.                |
| `created_at`    | `TIMESTAMPTZ`  | `NOT NULL DEFAULT clock_timestamp()`     | Creation timestamp.                |

#### `appointments`

| Column           | Type          | Constraints                              | Description                                                        |
| :--------------- | :------------ | :--------------------------------------- | :----------------------------------------------------------------- |
| `id`             | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`  | Appointment ID.                                                    |
| `case_id`        | `UUID`        | `NOT NULL REFERENCES cases(id)`          | Beneficiary case.                                                  |
| `scheduled_time` | `TIMESTAMPTZ` | `NOT NULL`                               | Appointment start time.                                            |
| `location_type`  | `VARCHAR(32)` | `NOT NULL`                               | `community_center`, `field_office`, `home_visit`, `mobile_clinic`. |
| `status`         | `VARCHAR(32)` | `NOT NULL DEFAULT 'scheduled'`           | `scheduled`, `attended`, `no_show`, `rescheduled`, `canceled`.     |
| `officer_id`     | `UUID`        | `NOT NULL REFERENCES staff_profiles(id)` | Assigned officer.                                                  |
| `notes`          | `TEXT`        | `NULL`                                   | Outcome notes.                                                     |

#### `document_metadata`

| Column               | Type          | Constraints                                    | Description                                                                           |
| :------------------- | :------------ | :--------------------------------------------- | :------------------------------------------------------------------------------------ |
| `id`                 | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`        | Document ID.                                                                          |
| `beneficiary_id`     | `UUID`        | `NOT NULL REFERENCES beneficiaries(id)`        | Subject beneficiary.                                                                  |
| `case_id`            | `UUID`        | `NULL REFERENCES cases(id)`                    | Associated case (optional).                                                           |
| `document_category`  | `VARCHAR(32)` | `NOT NULL`                                     | `national_id_scan`, `medical_report`, `shelter_photo`, `tenancy_contract`, `receipt`. |
| `storage_bucket`     | `VARCHAR(64)` | `NOT NULL DEFAULT 'documents-private'`         | Strictly private Supabase bucket.                                                     |
| `storage_path`       | `TEXT`        | `NOT NULL UNIQUE`                              | Opaque object path (`<case_uuid>/<doc_uuid>.<ext>`).                                  |
| `file_name_original` | `TEXT`        | `NOT NULL`                                     | Original uploaded file name.                                                          |
| `mime_type`          | `VARCHAR(64)` | `NOT NULL`                                     | Validated MIME (e.g. `application/pdf`, `image/jpeg`).                                |
| `file_size_bytes`    | `BIGINT`      | `NOT NULL CHECK (file_size_bytes <= 20971520)` | Max 20MB per file.                                                                    |
| `uploaded_by`        | `UUID`        | `NOT NULL REFERENCES staff_profiles(id)`       | Uploader.                                                                             |
| `created_at`         | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`           | Upload timestamp.                                                                     |

---

### 2.9 Audit Trail & Offline Sync Metadata

#### `audit_logs` (IMMUTABLE)

| Column           | Type                                  | Constraints                          | Description                                                                  |
| :--------------- | :------------------------------------ | :----------------------------------- | :--------------------------------------------------------------------------- |
| `id`             | `BIGINT GENERATED ALWAYS AS IDENTITY` | `PRIMARY KEY`                        | Sequential audit event ID.                                                   |
| `event_uuid`     | `UUID`                                | `NOT NULL DEFAULT gen_random_uuid()` | Unique event identifier.                                                     |
| `actor_id`       | `UUID`                                | `NULL REFERENCES staff_profiles(id)` | Acting user (NULL if anonymous/auth failure).                                |
| `actor_role`     | `VARCHAR(50)`                         | `NULL`                               | Active role at moment of action.                                             |
| `event_category` | `VARCHAR(32)`                         | `NOT NULL`                           | `auth`, `case_mutation`, `approval`, `financial`, `export`, `access_denied`. |
| `action_name`    | `VARCHAR(64)`                         | `NOT NULL`                           | Specific action (e.g., `CASE_APPROVED`, `EXPORT_BENEFICIARIES`).             |
| `entity_table`   | `VARCHAR(64)`                         | `NOT NULL`                           | Target table.                                                                |
| `entity_id`      | `TEXT`                                | `NULL`                               | Target record identifier.                                                    |
| `ip_address`     | `INET`                                | `NULL`                               | Client IP address.                                                           |
| `user_agent`     | `TEXT`                                | `NULL`                               | Client device user-agent string.                                             |
| `details`        | `JSONB`                               | `NOT NULL DEFAULT '{}'`              | Structured context (parameters, deltas without raw PII).                     |
| `occurred_at`    | `TIMESTAMPTZ`                         | `NOT NULL DEFAULT clock_timestamp()` | Event timestamp.                                                             |

#### `sync_mutations` & `sync_conflicts`

| Column               | Type          | Constraints                              | Description                                       |
| :------------------- | :------------ | :--------------------------------------- | :------------------------------------------------ |
| `id`                 | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`  | Sync record ID.                                   |
| `idempotency_key`    | `VARCHAR(64)` | `NOT NULL UNIQUE`                        | Client-generated mutation idempotency key.        |
| `device_id`          | `VARCHAR(64)` | `NOT NULL`                               | Client device hardware identifier.                |
| `caseworker_id`      | `UUID`        | `NOT NULL REFERENCES staff_profiles(id)` | Authenticated caseworker.                         |
| `mutation_type`      | `VARCHAR(32)` | `NOT NULL`                               | `CREATE_DRAFT`, `SUBMIT_ASSESSMENT`, `LOG_VISIT`. |
| `status`             | `VARCHAR(32)` | `NOT NULL DEFAULT 'pending'`             | `pending`, `applied`, `rejected`, `conflict`.     |
| `server_received_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT clock_timestamp()`     | Ingest timestamp.                                 |

---

## 3. Indexing Strategy for 10k+ Beneficiaries & 100+ Staff

To achieve sub-100ms response times for caseworkers and supervisors across Iraq:

```sql
-- 1. Trigram fuzzy indexing for Arabic names
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_beneficiaries_name_ar_trgm ON beneficiaries USING gin (full_name_ar gin_trgm_ops);
CREATE INDEX idx_beneficiaries_national_id ON beneficiaries (national_id_number);
CREATE INDEX idx_beneficiaries_phone_primary ON beneficiaries (phone_primary);

-- 2. Scoped casework queries (Caseworker & Supervisor dashboards)
CREATE INDEX idx_cases_scoped_status ON cases (governorate_id, programme_code, status);
CREATE INDEX idx_cases_assigned_worker ON cases (assigned_caseworker_id, status) WHERE assigned_caseworker_id IS NOT NULL;
CREATE INDEX idx_cases_beneficiary_id ON cases (beneficiary_id);

-- 3. Household membership temporal lookups
CREATE INDEX idx_household_members_lookup ON household_members (household_id, beneficiary_id) WHERE left_at IS NULL;

-- 4. Financial ledger reconciliation & immutability checks
CREATE INDEX idx_finance_ledger_entitlement ON finance_ledger (entitlement_id);
CREATE INDEX idx_finance_ledger_posted_at ON finance_ledger (posted_at DESC);
CREATE INDEX idx_finance_ledger_ref ON finance_ledger (transaction_reference);

-- 5. Audit logs chronologically ordered
CREATE INDEX idx_audit_logs_actor_date ON audit_logs (actor_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_category_date ON audit_logs (event_category, occurred_at DESC);
```

---

## 4. Additive Migration Strategy (Forward-Fix Only)

All database evolution adheres to strict forward-fix principles:

1. Every migration is placed in `supabase/migrations/<YYYYMMDDHHMMSS>_<descriptive_name>.sql`.
2. Migrations are strictly additive:
   - Adding columns requires `DEFAULT` or `NULL` to avoid table locking on high row counts.
   - Modifying columns requires adding a new column, backfilling, and switching views.
   - `DROP TABLE` and `DROP COLUMN` are prohibited on live databases.
3. Every schema change is verified against automated pgTAP / SQL tests before being accepted into `main`.
