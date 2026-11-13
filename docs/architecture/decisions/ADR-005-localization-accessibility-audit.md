# ADR-005: Localization, Accessibility & Audit Hardening Standards

**Status:** Accepted  
**Date:** 13 November 2026

## Context

Humanitarian operations across Iraq involve diverse field actors (caseworkers, supervisors, financial checkers, auditors, and security administrators) operating in high-tempo, austere field environments. The platform manages sensitive protection cases, cash assistance distributions, and biometric identification records.

Previous humanitarian software deployments encountered recurring operational failures:

1. **Bidirectional Text Scrambling:** In Arabic RTL interfaces, mixed Latin/alphanumeric strings (case references like `HUM-2026-FIN-00001`, Iraqi National IDs, phone numbers `+964...`, and UUIDs) frequently suffered punctuation reversal, transposing prefixes, hyphens, and numeric order.
2. **Audit Tampering & Secret Leakage:** Unprotected audit tables allowed malicious actors or corrupted scripts to rewrite historical logs, while poorly sanitized logger payloads leaked bearer tokens, passwords, and sensitive beneficiary PII into compliance exports.
3. **Informal Humanitarian Terminology:** Decentralized translation efforts resulted in inconsistent or legally invalid terms for critical protection concepts like informed consent, duplicate adjudication, and safeguarding.
4. **Field Usability Barriers:** Caseworkers using low-cost smartphones or ruggedized tablets in bright sunlight struggled with low-contrast UI and undersized touch targets.

## Decisions

### 1. Append-Only Immutable Audit Trail & Access Segregation

- **Database Trigger Protection:** The `audit_logs` table is strictly append-only. PostgreSQL trigger `trg_audit_logs_protect` intercepts and rejects any `UPDATE` or `DELETE` statement with error code `ERR_AUDIT_IMMUTABLE`.
- **Role Segregation:** Access to read audit logs via RLS is strictly confined to `auditor` and `security_admin` roles. Caseworkers, intake clerks, and supervisors have zero read access to prevent surveillance or retaliatory obstruction of compliance investigations.
- **Audited Privilege Changes:** Any assignment or revocation of staff roles or geographic/programme scopes requires the `security_admin` role and a mandatory, audited justification rationale of at least 10 characters (`workflow_assign_staff_role`, `workflow_revoke_staff_role`, `workflow_assign_staff_scope`).
- **Defensive Secret Cleansing:** The audit logging workflow `workflow_log_security_alert` automatically scrubs authentication tokens, raw passwords, service-role keys, and secret credentials from JSON payloads prior to database insertion.

### 2. Bidirectional (Bidi) Text Handling Standards

- **Unicode Isolation:** All mixed Latin/alphanumeric strings (Case Reference IDs, UUIDs, National IDs, phone numbers) must be wrapped with Unicode First Strong Isolate (`\u2066` / U+2066) and Pop Directional Isolate (`\u2069` / U+2069) on mobile, and HTML5 `<bdi dir="ltr">` elements on web.
- **Currency & Numerals:** Iraqi Dinar is formatted as `د.ع` suffix in Arabic with localized numeral grouping, and `IQD` prefix in English (`formatCurrency`). Gregorian dates are formatted uniformly as `YYYY-MM-DD` (`formatDate`).

### 3. Canonical Humanitarian Lexicon (Iraq Operations)

The system adopts a canonical, standardized bilingual vocabulary defined in `@humanity/contracts` (`APPROVED_HUMANITARIAN_TERMS`), `locale-context.tsx`, and `app_translations.dart`. Informal variants are strictly prohibited:

| Concept               | Approved Arabic (العربية المعتمدة) | Approved English                     | Purpose & Context                                             |
| :-------------------- | :--------------------------------- | :----------------------------------- | :------------------------------------------------------------ |
| **Informed Consent**  | الموافقة المستنيرة الصريحة         | Explicit Informed Consent            | Unambiguous agreement prior to data capture                   |
| **Safeguarding**      | صون وحماية الفئات المستضعفة        | Safeguarding & Heightened Protection | Specialized care for children, GBV survivors, at-risk persons |
| **Duplicate Review**  | تدقيق تشابه القيود والازدواجية     | Duplicate Registration Review        | Human-adjudicated duplicate resolution; never auto-merged     |
| **Ledger Reversal**   | قيد تسوية عكسي                     | Compensating Ledger Reversal         | Corrective double-entry without editing posted entries        |
| **Legal Hold**        | تجميد قانوني تحفظي                 | Protective Legal Hold                | Freezing records during active investigations                 |
| **Do No Harm**        | عدم إلحاق الضرر                    | Do No Harm Principle                 | Humanitarian imperative guarding beneficiary safety           |
| **Data Minimization** | الحد الأدنى لجمع البيانات          | Data Minimization                    | Restricting data capture to strictly necessary fields         |
| **Maker-Checker**     | إجراء التحضير والتدقيق الثنائي     | Maker-Checker Dual Approval          | Segregation of duties between proposal and release            |
| **Immutable Audit**   | سجل التدقيق غير القابل للتعديل     | Immutable Audit Trail                | Tamper-proof event logs for donor and legal verification      |

### 4. WCAG AA Accessibility Standards

- **Touch Target Sizing:** All interactive controls (buttons, inputs, selects, tab triggers) adhere to minimum touch target constraints: $\ge 44 \times 44$ px on Web and $\ge 48 \times 48$ dp on Mobile.
- **Focus Rings:** Interactive elements feature high-contrast visible focus rings (`focus:ring-2 focus:ring-blue-600`) for keyboard navigation.
- **Assistive Technology:** Dynamic status messages and export confirmations utilize `role="status"` and explicit `aria-label` attributes.
- **Contrast Ratios:** Text and essential icons maintain a minimum contrast ratio of $4.5:1$ against backgrounds to ensure readability under direct sunlight in field distribution centers.

## Open Policy Decisions & Backlog Items

The following items are documented as deliberate future scope additions or external policy dependencies:

1. **Kurdish Language Support:** Expansion to include Sorani Kurdish (`ckb-IQ`) and Badini Kurdish (`kmr-IQ`) for operations in Erbil, Sulaymaniyah, and Duhok governorates.
2. **Alternative Consent Capture:** Policy workflows for illiterate or hearing-impaired beneficiaries currently rely on attested guardian signatures; future versions will evaluate encrypted voice-recorded consent under IASC digital identity guidelines.
3. **Automated Donor Reporting (IATI):** Integration with International Aid Transparency Initiative (IATI) XML standards for automated donor ledger publishing.

## Consequences

- **Positive:** Guaranteed audit integrity under forensic examination; complete elimination of reversed alphanumeric strings in Arabic; standardized humanitarian legal terminology; accessible operation on mobile and web across challenging field conditions.
- **Negative:** Strict immutability requires formal compensating procedures for mistaken role assignments or audit entries; developers must consistently apply Bidi wrappers to all mixed-script strings.
