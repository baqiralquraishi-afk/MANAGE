# Offline Field Storage, Bounded Caching & Synchronization Policy (ADR-003)

## 1. Executive Policy Overview

In Iraqi humanitarian field operations, caseworkers routinely conduct assessments, field visits, and registrations in remote displacement camps, informal settlements, and rural areas where cellular network connectivity is intermittent or completely absent.

To safeguard vulnerable beneficiary personal data in compliance with the **Principle of Data Minimization**, **Do No Harm**, and **ADR-003**, mobile devices must strictly adhere to bounded, encrypted offline caching boundaries.

---

## 2. Strict Storage Boundaries and Limits

| Parameter                     | Limit / Policy                            | Enforcement Mechanism                                                                                                     |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Assigned Cases Caching**    | **Maximum 50 cases**                      | Scoped strictly to cases assigned to the logged-in caseworker in their authorized governorate.                            |
| **Full Database Download**    | **STRICTLY PROHIBITED**                   | Mobile API structurally prohibits bulk downloads, pagination dump requests, or non-assigned beneficiary fetches.          |
| **Unsent Draft Mutations**    | **Maximum 100 queued items**              | `EncryptedOfflineDb` rejects queuing beyond 100 items to prevent unbounded offline accumulation.                          |
| **Offline Retention Horizon** | **72 hours maximum**                      | Records cached locally expire after 72 hours; caseworkers must connect to re-authenticate and synchronize.                |
| **Database Encryption**       | **AES-256 SQLCipher / Encrypted Storage** | Local database files are encrypted at rest using a 256-bit symmetric key anchored in hardware Keystore/Keychain.          |
| **Logout Data Cleanup**       | **Mandatory complete purge**              | Calling `signOut()` immediately wipes the encryption key, clears cached assigned cases, and truncates the local database. |

---

## 3. Structural Prohibitions in Offline Mode

The following actions are **structurally prohibited** in offline mode. The mobile client refuses to queue them, and the central server immediately rejects them:

1. **Case Eligibility Determination & Final Approval** (`APPROVE_CASE`, `REJECT_CASE`)
2. **Financial Entitlement Authorization** (`APPROVE_FINANCE`, `APPROVE_FINANCIAL_ENTITLEMENT`)
3. **Cash / Voucher Payment Release** (`DISBURSE_FINANCE`, `RELEASE_PAYMENT`)
4. **Ledger Posting or Reversals** (`POST_LEDGER_ENTRY`, `REVERSE_LEDGER_ENTRY`)

_Error Code:_ `ERR_OFFLINE_FORBIDDEN` / `ERR_OFFLINE_APPROVAL_PROHIBITED`

---

## 4. Idempotency, Schema Versioning & Conflict Lifecycle

### 4.1 Mutation States

Every offline field change moves through an explicit state machine:

- `queued`: Persisted in the local encrypted database awaiting connectivity.
- `sent`: In-flight HTTP sync request transmitted to central server.
- `accepted`: Central server verified caller authorization, checked schema version, validated payload, and committed change.
- `rejected`: Central server rejected change due to permission denial, invalid data, or prohibited offline action.
- `conflict`: Target record on server was updated after client's `baseServerVersion`. **Server never silently overwrites newer data**.

```
[Local Draft] -> QUEUED -> SENT -> ACCEPTED (Committed to PostgreSQL)
                            |
                            +---> REJECTED (Validation error)
                            |
                            +---> CONFLICT (Requires human resolution)
```

### 4.2 Conflict Detection & Human Resolution

- Every queued mutation carries `baseServerVersion` and a client UUIDv4 `idempotencyKey`.
- If server detects that the target entity was modified after `baseServerVersion`:
  1. The server flags the conflict in `sync_conflicts` with `server_state` and `client_state`.
  2. The mutation status is set to `conflict`.
  3. An immutable `SYNC_CONFLICT_DETECTED` audit entry is created.
  4. The mobile app surfaces a visible conflict badge.
  5. The conflict must be reviewed and resolved by an authorized supervisor or programme manager with mandatory documented notes (`workflow_resolve_sync_conflict`).
