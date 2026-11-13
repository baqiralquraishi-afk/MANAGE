# Operational Handover Guide: Security Administrators & Role Managers

> **Target Roles**: Security Administrators, IT Operations Leads, Identity & Access Managers.  
> **Key Responsibilities**: Staff onboarding, role-based access control (RBAC), geographic and programme scoping, credential revocation, audit log investigations, and emergency containment.

---

## 1. System Role Matrix & Segregation Rules

The platform enforces strict server-side role separation. No single user can hold conflicting operational roles:

| System Role       | Scope of Authority                                           | Incompatible Roles (Conflict of Interest)                      |
| :---------------- | :----------------------------------------------------------- | :------------------------------------------------------------- |
| `caseworker`      | Scoped beneficiary registration, assessment, case visits     | `finance_maker`, `finance_checker`, `security_admin`           |
| `supervisor`      | Case assignment, duplicate review adjudication, case closure | `finance_maker`, `finance_checker`                             |
| `finance_maker`   | Assistance delivery proposal submission                      | `finance_checker`, `caseworker`, `supervisor`                  |
| `finance_checker` | Financial release authorization, ledger reconciliation       | `finance_maker`, `caseworker`, `supervisor`                    |
| `auditor`         | Read-only access to all records, audit logs, and reports     | `caseworker`, `supervisor`, `finance_maker`, `finance_checker` |
| `security_admin`  | Staff role assignment, scope assignment, session lock        | All operational caseworker & finance roles                     |

---

## 2. Staff Onboarding & Scope Assignment Procedure

### Step 2.1: Create Authentication Account

Staff accounts are provisioned via the administrative web portal or Supabase Auth API:

```bash
# Provision staff profile
docker compose -f infra/docker-compose.staging.yml exec -T supabase-db \
  psql -U postgres -d postgres -c "
    INSERT INTO staff_profiles (id, email, full_name_ar, full_name_en, phone_number, is_active)
    VALUES ('<UUID>', 'sarah.ali@humanity.iq', 'سارة علي أحمد', 'Sarah Ali Ahmed', '+9647701234567', true);"
```

### Step 2.2: Assign Role with Mandatory Audit Rationale

Under the security hardening policies, every role assignment requires a written justification of at least 10 characters:

```sql
INSERT INTO staff_roles (staff_id, role, is_active, assigned_by)
VALUES ('<STAFF_UUID>', 'caseworker', true, '<ADMIN_UUID>');

INSERT INTO audit_logs (actor_id, actor_role, event_category, action_name, entity_table, entity_id, details)
VALUES (
  '<ADMIN_UUID>', 'security_admin', 'role_management', 'staff_role_assigned', 'staff_roles', '<STAFF_UUID>',
  '{"role": "caseworker", "rationale": "Field recruitment Ninawa sub-office confirmed by HR ticket #4412"}'::jsonb
);
```

### Step 2.3: Restrict Geographic & Programme Scope

Prevent staff from accessing beneficiaries outside their operational boundaries:

```sql
-- Restrict to Ninawa governorate (IQ-NI) and Food Security (FOD) programme
INSERT INTO staff_scopes (staff_id, governorate_id, programme_code)
VALUES ('<STAFF_UUID>', 'IQ-NI', 'FOD');
```

---

## 3. Emergency Account Lock & Compromise Procedures

If a staff member reports a lost device, suspected phishing, or departs the mission:

1. **Immediate Session Termination & User Ban**:
   ```sql
   DELETE FROM auth.refresh_tokens WHERE user_id = '<STAFF_UUID>';
   UPDATE auth.users SET banned_until = 'infinity' WHERE id = '<STAFF_UUID>';
   ```
2. **Deactivate System Roles**:
   ```sql
   UPDATE staff_roles SET is_active = false WHERE staff_id = '<STAFF_UUID>';
   ```
3. **Execute Emergency Incident Runbook**:
   - For lost hardware: Follow [docs/operations/incident_response/lost_device.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/incident_response/lost_device.md).
   - For compromised credentials: Follow [docs/operations/incident_response/account_compromise.md](file:///c:/Users/MSI/Desktop/MANAGE/docs/operations/incident_response/account_compromise.md).

---

## 4. Quarterly Administrative Audit Checklist

- [ ] Review all active `security_admin` accounts; ensure count does not exceed 3 individuals.
- [ ] Confirm no staff member possesses concurrent `finance_maker` and `finance_checker` roles.
- [ ] Revoke dormant accounts inactive for $> 60$ days.
- [ ] Review high-privilege audit events in `audit_logs` for unusual weekend or off-hours activity.
