import 'package:flutter_test/flutter_test.dart';
import 'package:humanity_mobile/core/storage/offline_sync_queue.dart';
import 'package:humanity_mobile/models/auth_user.dart';
import 'package:humanity_mobile/services/casework_service.dart';

void main() {
  group('Field Casework Workflows Suite', () {
    late OfflineSyncQueue offlineQueue;
    late CaseworkService service;

    setUp(() {
      offlineQueue = OfflineSyncQueue();
      service = CaseworkService(offlineQueue: offlineQueue);
    });

    test('1. Scoped Beneficiary Search filters by national ID and name', () {
      final all = service.searchBeneficiaries('');
      expect(all.length, greaterThanOrEqualTo(2));

      final byId = service.searchBeneficiaries('198512345678');
      expect(byId.length, 1);
      expect(byId.first.fullNameAr, contains('أحمد خليل'));

      final byName = service.searchBeneficiaries('زينب');
      expect(byName.length, 1);
      expect(byName.first.nationalId, '199087654321');
    });

    test(
        '2. Beneficiary Registration strictly requires mandatory informed consent',
        () async {
      // Must throw if informed consent is false
      expect(
        () => service.registerBeneficiary(
          nationalId: '199211223344',
          fullNameAr: 'سامر قاسم مهدي',
          fullNameEn: 'Samer Qasim Mahdi',
          phone: '+9647709988776',
          governorateId: 'IQ-NI',
          hasInformedConsent: false,
        ),
        throwsA(isA<ArgumentError>().having(
          (e) => e.message,
          'message',
          contains('ERR_MISSING_INFORMED_CONSENT'),
        )),
      );

      // Registration succeeds when consent is granted
      final registered = await service.registerBeneficiary(
        nationalId: '199211223344',
        fullNameAr: 'سامر قاسم مهدي',
        fullNameEn: 'Samer Qasim Mahdi',
        phone: '+9647709988776',
        governorateId: 'IQ-NI',
        hasInformedConsent: true,
      );

      expect(registered.nationalId, '199211223344');
      expect(registered.hasInformedConsent, true);

      // Search finds the new beneficiary
      final results = service.searchBeneficiaries('199211223344');
      expect(results.length, 1);
    });

    test('3. Scoped Cases are filtered to caseworker assigned governorate', () {
      const caseworkerNinewa = AuthUser.demoCaseworker; // IQ-NI
      final casesNinewa = service.getCasesForUser(caseworkerNinewa);
      for (final c in casesNinewa) {
        expect(c.governorateId, 'IQ-NI');
      }

      const supervisorBaghdad = AuthUser.demoSupervisor; // IQ-BG, IQ-NI
      final casesSupervisor = service.getCasesForUser(supervisorBaghdad);
      expect(casesSupervisor.length, greaterThanOrEqualTo(2));
    });

    test(
        '4. Assessment submission validates score bounds and advances case state',
        () async {
      const caseId = '50000000-0000-0000-0000-000000000001';

      // Invalid score (>100) rejected
      expect(
        () => service.submitAssessment(
          caseId: caseId,
          programmeCode: 'FIN',
          vulnerabilityScore: 120,
          caseworkerNotes: 'High vulnerability shelter',
          recommendation: 'Emergency MPCA cash',
        ),
        throwsA(isA<ArgumentError>().having(
          (e) => e.message,
          'message',
          contains('ERR_INVALID_SCORE'),
        )),
      );

      // Valid assessment advances case to under_assessment
      final asmt = await service.submitAssessment(
        caseId: caseId,
        programmeCode: 'FIN',
        vulnerabilityScore: 85,
        caseworkerNotes: 'Severe income shortfall with three dependents',
        recommendation: 'Immediate cash assistance',
      );

      expect(asmt.vulnerabilityScore, 85);
      final updatedCase = service.getCaseById(caseId);
      expect(updatedCase!.status, 'under_assessment');
    });

    test('5. Field visit logging records GPS coordinates and observations',
        () async {
      const caseId = '50000000-0000-0000-0000-000000000001';

      final visit = await service.logFieldVisit(
        caseId: caseId,
        visitDate: '2026-11-13',
        gpsCoordinates: '36.335000, 43.118889',
        observations: 'Shelter is damaged; family lacks basic winterization.',
        caseworkerName: 'يوسف محمود عمر',
      );

      expect(visit.caseId, caseId);
      expect(visit.gpsCoordinates, '36.335000, 43.118889');

      final visits = service.getFieldVisits(caseId);
      expect(visits.length, 1);
      expect(visits.first.observations, contains('winterization'));
    });

    test('6. Appointment status updates correctly', () async {
      final appt = service.appointments.first;
      expect(appt.status, 'scheduled');

      await service.updateAppointmentStatus(
        appointmentId: appt.id,
        newStatus: 'completed',
      );

      expect(appt.status, 'completed');
    });

    test(
        '7. Document capture enforces MIME restrictions, size ceiling, and opaque paths',
        () async {
      const caseId = '50000000-0000-0000-0000-000000000001';

      // Rejects executable / script MIME types
      expect(
        () => service.captureDocument(
          caseId: caseId,
          category: 'national_id',
          fileName: 'malicious.exe',
          mimeType: 'application/x-msdownload',
          fileSizeBytes: 5000,
        ),
        throwsA(isA<ArgumentError>().having(
          (e) => e.message,
          'message',
          contains('ERR_INVALID_MIME_TYPE'),
        )),
      );

      // Rejects oversized files (> 10MB = 10,485,760 bytes)
      expect(
        () => service.captureDocument(
          caseId: caseId,
          category: 'national_id',
          fileName: 'large.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 10485761,
        ),
        throwsA(isA<ArgumentError>().having(
          (e) => e.message,
          'message',
          contains('ERR_FILE_TOO_LARGE'),
        )),
      );

      // Valid document registered with opaque storage path
      final doc = await service.captureDocument(
        caseId: caseId,
        category: 'national_id',
        fileName: 'national_id_card.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048576,
      );

      expect(doc.storagePath, startsWith('cases/$caseId/doc-'));
      expect(doc.storagePath.contains('..'), false,
          reason: 'Must not contain directory traversal');
      expect(doc.storagePath.endsWith('.pdf'), true);
    });

    test(
        '8. Offline mutation queue handles offline actions and enforces ADR-003 safety',
        () async {
      service.toggleConnectivity(); // Go offline
      expect(service.isOnline, false);
      expect(service.pendingSyncCount, 0);

      // Register beneficiary while offline
      await service.registerBeneficiary(
        nationalId: '199555667788',
        fullNameAr: 'هدى كريم حسين',
        fullNameEn: 'Huda Karim Hussein',
        phone: '+9647701122334',
        governorateId: 'IQ-NI',
        hasInformedConsent: true,
      );

      expect(service.pendingSyncCount, 1);

      // ADR-003 boundary: Dual-authorized financial approvals strictly forbidden offline
      expect(
        () => offlineQueue.enqueue(
          mutationType: 'FINANCIAL_DISBURSEMENT',
          payload: {'amount': 500000},
        ),
        throwsA(isA<Exception>().having(
          (e) => e.toString(),
          'message',
          contains('ERR_OFFLINE_FINANCIAL_ACTION_FORBIDDEN'),
        )),
      );

      // Sync offline records
      final syncedCount = await service.syncPendingMutations();
      expect(syncedCount, 1);
      expect(service.pendingSyncCount, 0);
    });
  });
}
