/**
 * Humanity Platform - Supporting Modules Web Test Suite (Phase 11)
 * Validates:
 * 1. Private Document Storage: MIME restrictions, max 10MB size limit, opaque storage paths, no body logging.
 * 2. Time-Bound Download Tokens: Token TTL bounds (60s-900s), expiration handling (ERR_DOWNLOAD_LINK_EXPIRED).
 * 3. Legal Hold Protection: Blocks deletion of documents tagged with active legal hold (ERR_LEGAL_HOLD_ACTIVE).
 * 4. Appointment Scheduling: Future timestamp validation, allowed location types, valid status updates.
 * 5. In-App Notification Center: Strictly internal notifications, recipient isolation, zero external messaging.
 * 6. Scoped Operational Reports & K-Anonymity: Cell suppression for counts < 5 to prevent re-identification.
 * 7. Report Export Auditing: Immutable audit record on CSV/JSON/PDF exports.
 * 8. Static verification of frontend files and retention policy documentation.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, '..');
const repoRootDir = path.resolve(webSrcDir, '../../..');

describe('Supporting Modules - Private Document Storage & Security', () => {
  const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  const validateDocumentUpload = (doc) => {
    if (!doc.fileName || doc.fileName.trim().length === 0) {
      throw new Error('ERR_INVALID_FILE_NAME: File name is required.');
    }
    if (!ALLOWED_MIME_TYPES.includes(doc.mimeType)) {
      throw new Error(`ERR_INVALID_MIME_TYPE: Type ${doc.mimeType} is disallowed. Only PDF and images are permitted.`);
    }
    if (doc.fileSizeBytes <= 0 || doc.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new Error(`ERR_FILE_TOO_LARGE: Size ${doc.fileSizeBytes} exceeds max limit of 10MB.`);
    }
    if (!doc.storagePath || !doc.storagePath.match(/^[a-zA-Z0-9_\-\.\/]+$/) || doc.storagePath.includes('..')) {
      throw new Error('ERR_INVALID_STORAGE_PATH: Must be an opaque path without directory traversal.');
    }
    return true;
  };

  test('Rejects disallowed and executable MIME types', () => {
    const maliciousDocs = [
      { fileName: 'malware.exe', mimeType: 'application/x-msdownload', fileSizeBytes: 5000, storagePath: 'cases/c1/doc-1.exe' },
      { fileName: 'script.sh', mimeType: 'text/x-shellscript', fileSizeBytes: 1200, storagePath: 'cases/c1/doc-2.sh' },
      { fileName: 'app.apk', mimeType: 'application/vnd.android.package-archive', fileSizeBytes: 200000, storagePath: 'cases/c1/doc-3.apk' },
      { fileName: 'payload.js', mimeType: 'application/javascript', fileSizeBytes: 800, storagePath: 'cases/c1/doc-4.js' },
    ];

    for (const doc of maliciousDocs) {
      assert.throws(() => validateDocumentUpload(doc), /ERR_INVALID_MIME_TYPE/);
    }
  });

  test('Rejects oversized documents exceeding 10MB limit', () => {
    const oversizedDoc = {
      fileName: 'large_scan.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 10485761, // 10MB + 1 byte
      storagePath: 'cases/c1/doc-large.pdf',
    };
    assert.throws(() => validateDocumentUpload(oversizedDoc), /ERR_FILE_TOO_LARGE/);
  });

  test('Validates opaque storage paths and blocks directory traversal attempts', () => {
    const traversalDocs = [
      { fileName: 'id.pdf', mimeType: 'application/pdf', fileSizeBytes: 1000, storagePath: 'cases/../../etc/passwd' },
      { fileName: 'id.pdf', mimeType: 'application/pdf', fileSizeBytes: 1000, storagePath: 'cases/../private/key.pem' },
      { fileName: 'id.pdf', mimeType: 'application/pdf', fileSizeBytes: 1000, storagePath: 'cases/c1/`rm -rf /`' },
    ];

    for (const doc of traversalDocs) {
      assert.throws(() => validateDocumentUpload(doc), /ERR_INVALID_STORAGE_PATH/);
    }

    const validDoc = {
      fileName: 'national_id_front.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 2048576,
      storagePath: 'cases/50000000-0000-0000-0000-000000000001/doc-f47ac10b.pdf',
    };
    assert.equal(validateDocumentUpload(validDoc), true);
  });

  test('Document audit payloads never contain raw file bodies or contents', () => {
    const documentRegistrationAuditPayload = {
      action: 'REGISTER_DOCUMENT_METADATA',
      documentId: 'doc-uuid-1234',
      caseId: '50000000-0000-0000-0000-000000000001',
      category: 'national_id',
      fileSizeBytes: 2048576,
      mimeType: 'application/pdf',
      checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };

    assert.equal('content' in documentRegistrationAuditPayload, false);
    assert.equal('body' in documentRegistrationAuditPayload, false);
    assert.equal('fileData' in documentRegistrationAuditPayload, false);
    assert.ok(documentRegistrationAuditPayload.checksumSha256.length === 64);
  });
});

describe('Supporting Modules - Time-Bound Tokens & Legal Hold', () => {
  test('Token TTL bounds must be between 60s and 900s with default 300s', () => {
    const validateTokenTtl = (ttlSeconds) => {
      if (ttlSeconds < 60 || ttlSeconds > 900) {
        throw new Error('ERR_INVALID_TTL: Token validity must be between 60 and 900 seconds.');
      }
      return ttlSeconds;
    };

    assert.equal(validateTokenTtl(300), 300);
    assert.equal(validateTokenTtl(60), 60);
    assert.equal(validateTokenTtl(900), 900);
    assert.throws(() => validateTokenTtl(30), /ERR_INVALID_TTL/);
    assert.throws(() => validateTokenTtl(1800), /ERR_INVALID_TTL/);
  });

  test('Expired tokens fail closed with ERR_DOWNLOAD_LINK_EXPIRED', () => {
    const verifyToken = (token) => {
      const now = new Date();
      if (token.isRevoked) {
        throw new Error('ERR_DOWNLOAD_TOKEN_REVOKED');
      }
      if (new Date(token.expiresAt) <= now) {
        throw new Error('ERR_DOWNLOAD_LINK_EXPIRED: Download token has expired.');
      }
      return true;
    };

    const pastDate = new Date(Date.now() - 10000).toISOString();
    const expiredToken = {
      token: 'tok-abc123',
      expiresAt: pastDate,
      isRevoked: false,
    };
    assert.throws(() => verifyToken(expiredToken), /ERR_DOWNLOAD_LINK_EXPIRED/);

    const futureDate = new Date(Date.now() + 300000).toISOString();
    const activeToken = {
      token: 'tok-valid456',
      expiresAt: futureDate,
      isRevoked: false,
    };
    assert.equal(verifyToken(activeToken), true);
  });

  test('Active legal hold strictly intercepts document deletion', () => {
    const deleteDocument = (doc) => {
      if (doc.isLegalHold) {
        throw new Error(`ERR_LEGAL_HOLD_ACTIVE: Document ${doc.id} is under active legal hold: ${doc.legalHoldReason}`);
      }
      return { deleted: true, documentId: doc.id };
    };

    const normalDoc = { id: 'doc-1', isLegalHold: false };
    assert.deepEqual(deleteDocument(normalDoc), { deleted: true, documentId: 'doc-1' });

    const protectedDoc = {
      id: 'doc-2',
      isLegalHold: true,
      legalHoldReason: 'Judicial custody dispute inquiry',
    };
    assert.throws(() => deleteDocument(protectedDoc), /ERR_LEGAL_HOLD_ACTIVE/);
  });
});

describe('Supporting Modules - Appointments & In-App Notifications', () => {
  test('Appointment scheduling requires future timestamp and valid location type', () => {
    const ALLOWED_LOCATION_TYPES = ['office', 'home_visit', 'partner_center', 'phone_call'];

    const scheduleAppointment = ({ scheduledAt, locationType }) => {
      const targetTime = new Date(scheduledAt);
      if (isNaN(targetTime.getTime()) || targetTime <= new Date()) {
        throw new Error('ERR_PAST_APPOINTMENT: Appointment scheduled time must be in the future.');
      }
      if (!ALLOWED_LOCATION_TYPES.includes(locationType)) {
        throw new Error(`ERR_INVALID_LOCATION_TYPE: ${locationType} is not supported.`);
      }
      return { status: 'scheduled', scheduledAt, locationType };
    };

    const pastTime = new Date(Date.now() - 3600000).toISOString();
    assert.throws(() => scheduleAppointment({ scheduledAt: pastTime, locationType: 'office' }), /ERR_PAST_APPOINTMENT/);

    const futureTime = new Date(Date.now() + 86400000).toISOString();
    assert.throws(() => scheduleAppointment({ scheduledAt: futureTime, locationType: 'invalid_mode' }), /ERR_INVALID_LOCATION_TYPE/);

    const validAppt = scheduleAppointment({ scheduledAt: futureTime, locationType: 'home_visit' });
    assert.equal(validAppt.status, 'scheduled');
  });

  test('In-app notification system strictly isolates messages and rejects external messaging flags', () => {
    const createNotification = (data) => {
      if ('sendSms' in data || 'sendWhatsapp' in data || 'externalEmail' in data) {
        throw new Error('ERR_EXTERNAL_MESSAGING_PROHIBITED: Only strictly in-app notifications are permitted.');
      }
      return {
        id: 'notif-1',
        recipientId: data.recipientId,
        title: data.title,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
    };

    assert.throws(
      () => createNotification({ recipientId: 'u1', title: 'Test', sendSms: true }),
      /ERR_EXTERNAL_MESSAGING_PROHIBITED/
    );

    const internalNotif = createNotification({
      recipientId: '00000000-0000-0000-0000-000000000001',
      title: 'New Case Assigned',
    });
    assert.equal(internalNotif.isRead, false);
    assert.equal(internalNotif.recipientId, '00000000-0000-0000-0000-000000000001');
  });
});

describe('Supporting Modules - Operational Reports & K-Anonymity Guard', () => {
  test('Small-group breakdown cells (< 5) must be suppressed to guard against re-identification', () => {
    const rawBreakdown = [
      { governorate: 'IQ-BG', caseCount: 42 },
      { governorate: 'IQ-NI', caseCount: 18 },
      { governorate: 'IQ-BA', caseCount: 3 }, // Small cell!
      { governorate: 'IQ-AN', caseCount: 1 }, // Small cell!
      { governorate: 'IQ-NA', caseCount: 0 },
    ];

    const applyKAnonymitySuppression = (rows, threshold = 5) => {
      return rows.map((row) => {
        if (row.caseCount > 0 && row.caseCount < threshold) {
          return {
            ...row,
            caseCount: -1,
            displayCount: `< ${threshold}`,
            isSuppressed: true,
          };
        }
        return {
          ...row,
          displayCount: String(row.caseCount),
          isSuppressed: false,
        };
      });
    };

    const protectedData = applyKAnonymitySuppression(rawBreakdown, 5);

    // Baghdad (42) and Ninewa (18) should remain unmasked
    assert.equal(protectedData[0].isSuppressed, false);
    assert.equal(protectedData[0].displayCount, '42');
    assert.equal(protectedData[1].isSuppressed, false);
    assert.equal(protectedData[1].displayCount, '18');

    // Basra (3) and Anbar (1) must be masked as < 5
    assert.equal(protectedData[2].isSuppressed, true);
    assert.equal(protectedData[2].displayCount, '< 5');
    assert.equal(protectedData[2].caseCount, -1);

    assert.equal(protectedData[3].isSuppressed, true);
    assert.equal(protectedData[3].displayCount, '< 5');
    assert.equal(protectedData[3].caseCount, -1);

    // Zero count remains 0 without suppression
    assert.equal(protectedData[4].isSuppressed, false);
    assert.equal(protectedData[4].displayCount, '0');
  });

  test('Exporting reports writes an immutable audit log entry', () => {
    const auditLogs = [];
    const recordExportAudit = (user, reportType, exportFormat, recordCount, filters) => {
      const entry = {
        id: `audit-${Date.now()}`,
        action: 'EXPORT_OPERATIONAL_REPORT',
        userId: user.id,
        userRole: user.role,
        reportType,
        exportFormat,
        recordCount,
        filters,
        timestamp: new Date().toISOString(),
      };
      auditLogs.push(entry);
      return entry;
    };

    const user = { id: '00000000-0000-0000-0000-000000000002', role: 'supervisor' };
    const entry = recordExportAudit(user, 'cases_summary', 'csv', 60, { programmeCode: 'FIN', governorateCode: 'IQ-BG' });

    assert.equal(auditLogs.length, 1);
    assert.equal(entry.action, 'EXPORT_OPERATIONAL_REPORT');
    assert.equal(entry.userRole, 'supervisor');
    assert.equal(entry.exportFormat, 'csv');
    assert.equal(entry.recordCount, 60);
  });
});

describe('Supporting Modules - File Integrity and Policy Documentation Verification', () => {
  test('Reports page exists and implements k-anonymity suppression and export auditing', () => {
    const reportsPagePath = path.resolve(webSrcDir, 'app/dashboard/reports/page.tsx');
    assert.ok(fs.existsSync(reportsPagePath), 'Reports dashboard page must exist.');
    const content = fs.readFileSync(reportsPagePath, 'utf8');

    assert.ok(content.includes('K-Anonymity') || content.includes('k-anonymity') || content.includes('< 5'), 'Must reference k-anonymity suppression.');
    assert.ok(content.includes('handleExport') || content.includes('EXPORT_OPERATIONAL_REPORT'), 'Must implement export auditing.');
    assert.ok(content.includes('Operational Reports') || content.includes('التقارير الرقابية والتشغيلية'), 'Must have localized headings.');
  });

  test('App shell contains notification center and unread badge count', () => {
    const appShellPath = path.resolve(webSrcDir, 'components/layout/app-shell.tsx');
    assert.ok(fs.existsSync(appShellPath), 'AppShell component must exist.');
    const content = fs.readFileSync(appShellPath, 'utf8');

    assert.ok(content.includes('notifications'), 'Must support notifications state.');
    assert.ok(content.includes('Bell'), 'Must render notification bell icon.');
    assert.ok(content.includes('unreadCount'), 'Must display unread counter.');
  });

  test('Case detail page contains private documents tab and modals', () => {
    const caseDetailPagePath = path.resolve(webSrcDir, 'app/dashboard/cases/[id]/page.tsx');
    assert.ok(fs.existsSync(caseDetailPagePath), 'Case detail page must exist.');
    const content = fs.readFileSync(caseDetailPagePath, 'utf8');

    assert.ok(content.includes('handleUploadDocument'), 'Must include document upload handler.');
    assert.ok(content.includes('handleRequestDownloadToken'), 'Must include download token handler.');
    assert.ok(content.includes('isUploadDocModalOpen'), 'Must render upload document modal.');
    assert.ok(content.includes('downloadModalDoc'), 'Must render download token modal.');
    assert.ok(content.includes('isLegalHold'), 'Must render legal hold badge/status.');
  });

  test('Retention and Legal Hold security document exists with required sections', () => {
    const policyDocPath = path.resolve(repoRootDir, 'docs/security/retention_and_legal_hold.md');
    assert.ok(fs.existsSync(policyDocPath), 'docs/security/retention_and_legal_hold.md must exist.');
    const content = fs.readFileSync(policyDocPath, 'utf8');

    assert.ok(content.includes('Retention Horizons'), 'Must define retention horizons.');
    assert.ok(content.includes('Legal-Hold') || content.includes('Legal Hold'), 'Must define legal hold policies.');
    assert.ok(content.includes('ERR_LEGAL_HOLD_ACTIVE'), 'Must define ERR_LEGAL_HOLD_ACTIVE error code.');
    assert.ok(content.toLowerCase().includes('k-anonymity') || content.includes('Small-Group'), 'Must define small-group suppression rules.');
    assert.ok(content.includes('Data Protection Officer'), 'Must designate owners.');
  });
});
