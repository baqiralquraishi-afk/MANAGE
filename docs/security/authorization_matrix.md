# Humanity Platform: Authorization Matrix & Role-Based Access Control (RBAC)

**Version:** 1.0.0  
**Model:** Multi-Dimensional RBAC + Attribute Scoping (Geography & Programme)  
**Database Enforcement:** PostgreSQL Row-Level Security (RLS) Deny-by-Default

---

## 1. System Role Definitions

| Role Identifier     | Role Title (Arabic / English)                     | Primary Purpose & Responsibilities                                                             | Scope Enforcement                                                                         |
| :------------------ | :------------------------------------------------ | :--------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| `intake`            | موظف التسجيل الأولي<br/>_Intake Registrar_        | Registers initial beneficiary profiles and records household members.                          | Geographic (Assigned Governorates/Districts).                                             |
| `caseworker`        | الباحث / الأخصائي الميداني<br/>_Field Caseworker_ | Conducts field visits, completes versioned assessments, and drafts assistance requests.        | Scoped to explicitly assigned cases within designated governorate.                        |
| `supervisor`        | مشرف الحالات الميدانية<br/>_Casework Supervisor_  | Reviews duplicate alerts, assigns cases to caseworkers, and approves initial case transitions. | Geographic & Programme scope.                                                             |
| `programme_manager` | مدير البرنامج التخصصي<br/>_Programme Manager_     | Oversees programme quotas, manages assessment templates, and authorizes programme eligibility. | Programme-specific scope across all or assigned governorates.                             |
| `finance_maker`     | منظم المعاملات المالية<br/>_Finance Maker_        | Creates financial disbursement batches and prepares voucher/cash transfer orders.              | Financial scope; strictly prohibited from approving own batches.                          |
| `finance_checker`   | المدقق المالي المعتمد<br/>_Finance Checker_       | Verifies budgets, checks supporting documents, and gives dual-authorization to release funds.  | Organization-wide finance scope; strictly prohibited from releasing self-created batches. |
| `auditor`           | مدقق الالتزام والرقابة<br/>_Compliance Auditor_   | Read-only inspection of all cases, transactions, and immutable audit logs.                     | Read-only organization-wide; zero create, edit, or delete permissions.                    |
| `report_viewer`     | محلل البيانات والتقارير<br/>_Reporting Analyst_   | Accesses aggregate metrics, statistical dashboards, and anonymized reporting views.            | Aggregate analytics with small-group suppression (<5 records hidden).                     |
| `security_admin`    | مسؤول أمن النظام<br/>_Security Administrator_     | Manages user accounts, assigns roles, revokes lost devices, and investigates audit alerts.     | System management; prohibited from editing beneficiary casework or financial ledgers.     |

---

## 2. Granular Permissions & Role-Action Matrix

| Entity / Action                        | `intake`  | `caseworker` | `supervisor` | `programme_manager` | `finance_maker` | `finance_checker` | `auditor` | `report_viewer` | `security_admin` |
| :------------------------------------- | :-------: | :----------: | :----------: | :-----------------: | :-------------: | :---------------: | :-------: | :-------------: | :--------------: |
| **Beneficiary Profile (Create)**       | **ALLOW** |  **ALLOW**   |  **ALLOW**   |        DENY         |      DENY       |       DENY        |   DENY    |      DENY       |       DENY       |
| **Beneficiary Profile (Read)**         |  Scoped   |   Assigned   |    Scoped    |      Programme      |     Scoped      |      Scoped       | **ALLOW** |    Aggregate    |       DENY       |
| **Beneficiary Profile (Update)**       |  Drafts   |   Assigned   |    Scoped    |        DENY         |      DENY       |       DENY        |   DENY    |      DENY       |       DENY       |
| **Duplicate Review Queue (Decide)**    |   DENY    |     DENY     |  **ALLOW**   |      **ALLOW**      |      DENY       |       DENY        |   DENY    |      DENY       |       DENY       |
| **Case (Create/Draft)**                |   DENY    |  **ALLOW**   |  **ALLOW**   |        DENY         |      DENY       |       DENY        |   DENY    |      DENY       |       DENY       |
| **Case Assessment (Submit)**           |   DENY    |  **ALLOW**   |  **ALLOW**   |        DENY         |      DENY       |       DENY        |   DENY    |      DENY       |       DENY       |
| **Case Eligibility (Approve/Reject)**  |   DENY    |     DENY     |  **ALLOW**   |      **ALLOW**      |      DENY       |       DENY        |   DENY    |      DENY       |       DENY       |
| **Assistance Allocation (Create)**     |   DENY    |  **ALLOW**   |  **ALLOW**   |      **ALLOW**      |    **ALLOW**    |       DENY        |   DENY    |      DENY       |       DENY       |
| **Assistance Allocation (Authorize)**  |   DENY    |     DENY     |     DENY     |        DENY         |      DENY       |     **ALLOW**     |   DENY    |      DENY       |       DENY       |
| **Financial Ledger (Direct Edit/Del)** | **DENY**  |   **DENY**   |   **DENY**   |      **DENY**       |    **DENY**     |     **DENY**      | **DENY**  |    **DENY**     |     **DENY**     |
| **Financial Ledger (Reversal Entry)**  |   DENY    |     DENY     |     DENY     |        DENY         |    **ALLOW**    |     **ALLOW**     |   DENY    |      DENY       |       DENY       |
| **Private Documents (Upload)**         |  Scoped   |   Assigned   |    Scoped    |       Scoped        |      DENY       |       DENY        |   DENY    |      DENY       |       DENY       |
| **Private Documents (Download)**       |  Scoped   |   Assigned   |    Scoped    |       Scoped        |     Scoped      |      Scoped       | **ALLOW** |      DENY       |       DENY       |
| **Audit Logs (Read)**                  |   DENY    |     DENY     |     DENY     |        DENY         |      DENY       |       DENY        | **ALLOW** |      DENY       |    **ALLOW**     |
| **System Roles & Users (Manage)**      |   DENY    |     DENY     |     DENY     |        DENY         |      DENY       |       DENY        |   DENY    |      DENY       |    **ALLOW**     |

---

## 3. Row-Level Security (RLS) Implementation Rules

1. **Deny-by-Default:** Every PostgreSQL table must execute `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` and have zero implicit grants for `public` or `anon`.
2. **Server-Side Context Resolution:**
   ```sql
   -- Context helper resolved via relational join, never untrusted JWT claims
   CREATE OR REPLACE FUNCTION auth.get_user_roles()
   RETURNS SETOF system_role AS $$
     SELECT role FROM public.staff_roles WHERE user_id = auth.uid() AND is_active = true;
   $$ LANGUAGE sql STABLE SECURITY DEFINER;
   ```
3. **No Service-Role Key in Clients:** The Supabase `service_role` secret must never be exposed to Next.js browser client code or Flutter mobile bundles. Any operation requiring elevated permissions must execute via protected server routines with strict input validation.
4. **Prohibition of Shared Accounts:** Every individual caseworker, supervisor, and administrator must possess a unique, named user account tied to their organizational email. Generic or shared accounts (e.g. `caseworker1@ngo.org`) are prohibited by organizational policy and monitored via simultaneous IP session alerts.

---

## 4. Mandatory Negative Security Test Scenarios (Deny Tests)

The test suite must verify that the following unauthorized actions are blocked by PostgreSQL RLS with `permission denied` or empty result sets:

- **DENY-01 (Anonymous Access):** Unauthenticated requests querying `beneficiaries`, `cases`, or `finance_ledger` receive zero rows or `401 Unauthorized`.
- **DENY-02 (Cross-Governorate Caseworker):** A caseworker assigned exclusively to _Ninewa_ attempting to query or update a beneficiary registered in _Basra_ receives an empty set.
- **DENY-03 (Caseworker Unauthorized Approval):** A `caseworker` attempting to issue an `UPDATE` changing a case status from `pending_approval` to `approved` is rejected by RLS with `permission denied`.
- **DENY-04 (Self-Approval in Finance):** A `finance_checker` attempting to authorize a financial disbursement batch where `created_by == auth.uid()` is rejected by a database constraint check.
- **DENY-05 (Immutable Ledger Tamper):** Any user attempting an `UPDATE` or `DELETE` on the `finance_ledger` table is rejected by the immutability trigger with an error `ERR_LEDGER_IMMUTABLE`.
- **DENY-06 (Unauthorized File Access):** A user attempting to download a private document belonging to an unassigned case in another programme receives a `403 Forbidden` response from Supabase Storage.
- **DENY-07 (Deactivated Staff Query):** A staff member whose profile is marked `is_active = false` receives zero rows on all tables even if their JWT has not yet expired.
