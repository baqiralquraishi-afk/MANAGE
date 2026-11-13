import 'package:flutter_test/flutter_test.dart';
import 'package:humanity_mobile/core/config/app_config.dart';
import 'package:humanity_mobile/core/storage/encrypted_offline_db.dart';
import 'package:humanity_mobile/core/storage/offline_sync_manager.dart';
import 'package:humanity_mobile/core/storage/secure_storage_service.dart';
import 'package:humanity_mobile/services/auth_service.dart';

void main() {
  group('Encrypted Offline Sync & Bounded Storage Engine (ADR-003)', () {
    late SecureStorageService secureStorage;
    late EncryptedOfflineDb offlineDb;
    late AuthService authService;
    late OfflineSyncManager syncManager;

    setUp(() async {
      secureStorage = SecureStorageService();
      offlineDb = EncryptedOfflineDb(secureStorage: secureStorage);
      await offlineDb.initialize();

      authService = AuthService(
        config: AppConfig(supabaseAnonKey: 'dummy-anon-key-local-test'),
        secureStorage: secureStorage,
        offlineDb: offlineDb,
      );

      syncManager = OfflineSyncManager(
        db: offlineDb,
        authService: authService,
      );

      // Authenticate active caseworker
      await authService.signIn(email: 'caseworker@humanity.iq', password: 'dummy-password');
    });

    test('1. Bounded assigned cases strictly caps at 50 max (bulk download prohibited)', () async {
      // Create 75 mock assigned cases
      final cases = List.generate(
        75,
        (i) => {
          'case_id': 'case-id-$i',
          'case_reference': 'CAS-2026-FIN-00$i',
          'programme_code': 'FIN',
          'status': 'under_assessment',
          'priority': 'medium',
          'governorate_id': 'IQ-NI',
          'beneficiary_id': 'ben-id-$i',
          'beneficiary_name_ar': 'المستفيد رقم $i',
          'beneficiary_phone': '+96477000000$i',
          'last_updated': DateTime.now().toIso8601String(),
        },
      );

      await offlineDb.cacheAssignedCases(cases);

      final cached = offlineDb.getAssignedCases();
      expect(cached.length, lessThanOrEqualTo(EncryptedOfflineDb.maxAssignedCases));
      expect(cached.length, equals(50));
    });

    test('2. Unsent drafts limit: maximum 100 queued drafts enforced', () async {
      for (int i = 0; i < EncryptedOfflineDb.maxDrafts; i++) {
        await offlineDb.enqueueDraftMutation(
          idempotencyKey: 'idem-key-draft-$i-uuid-test',
          deviceId: 'device-samsung-tab-a9',
          caseworkerId: '00000000-0000-0000-0000-000000000003',
          mutationType: 'LOG_FIELD_VISIT',
          entityTable: 'caseworker_visits',
          payload: {'notes': 'ملاحظات الزيارة رقم $i'},
        );
      }

      expect(offlineDb.queuedDraftCount, equals(100));

      // 101st draft must be rejected
      expect(
        () => offlineDb.enqueueDraftMutation(
          idempotencyKey: 'idem-key-draft-101-exceeded',
          deviceId: 'device-samsung-tab-a9',
          caseworkerId: '00000000-0000-0000-0000-000000000003',
          mutationType: 'LOG_FIELD_VISIT',
          entityTable: 'caseworker_visits',
          payload: {'notes': 'محاولة تجاوز الحد الأقصى'},
        ),
        throwsA(predicate((e) => e.toString().contains('ERR_OFFLINE_STORAGE_LIMIT'))),
      );
    });

    test('3. Structural Prohibition: Offline approvals and financial releases fail closed', () async {
      expect(
        () => offlineDb.enqueueDraftMutation(
          idempotencyKey: 'idem-prohibited-approve-case',
          deviceId: 'device-samsung-tab-a9',
          caseworkerId: '00000000-0000-0000-0000-000000000003',
          mutationType: 'APPROVE_CASE',
          entityTable: 'cases',
          payload: {'status': 'approved'},
        ),
        throwsA(predicate((e) => e.toString().contains('ERR_OFFLINE_APPROVAL_PROHIBITED'))),
      );

      expect(
        () => offlineDb.enqueueDraftMutation(
          idempotencyKey: 'idem-prohibited-disburse-finance',
          deviceId: 'device-samsung-tab-a9',
          caseworkerId: '00000000-0000-0000-0000-000000000003',
          mutationType: 'DISBURSE_FINANCE',
          entityTable: 'assistance_entitlements',
          payload: {'amount': 500000},
        ),
        throwsA(predicate((e) => e.toString().contains('ERR_OFFLINE_APPROVAL_PROHIBITED'))),
      );
    });

    test('4. Idempotency & duplicate retry safety: repeated enqueue returns existing draft', () async {
      const idempotencyKey = 'idem-key-duplicate-retry-check-001';

      final first = await offlineDb.enqueueDraftMutation(
        idempotencyKey: idempotencyKey,
        deviceId: 'device-samsung-tab-a9',
        caseworkerId: '00000000-0000-0000-0000-000000000003',
        mutationType: 'LOG_FIELD_VISIT',
        entityTable: 'caseworker_visits',
        payload: {'notes': 'زيارة تفقدية أولية'},
      );

      final second = await offlineDb.enqueueDraftMutation(
        idempotencyKey: idempotencyKey,
        deviceId: 'device-samsung-tab-a9',
        caseworkerId: '00000000-0000-0000-0000-000000000003',
        mutationType: 'LOG_FIELD_VISIT',
        entityTable: 'caseworker_visits',
        payload: {'notes': 'زيارة تفقدية أولية (محاولة مكررة)'},
      );

      expect(second.idempotencyKey, equals(first.idempotencyKey));
      expect(offlineDb.queuedDraftCount, equals(1));
    });

    test('5. State Machine: Queued -> Sent -> Accepted', () async {
      await offlineDb.enqueueDraftMutation(
        idempotencyKey: 'idem-key-state-machine-001',
        deviceId: 'device-samsung-tab-a9',
        caseworkerId: '00000000-0000-0000-0000-000000000003',
        mutationType: 'SUBMIT_ASSESSMENT',
        entityTable: 'programme_assessments',
        payload: {'vulnerabilityScore': 75},
      );

      final result = await syncManager.syncPendingMutations();

      expect(result.acceptedCount, equals(1));
      expect(result.conflictCount, equals(0));
      expect(result.rejectedCount, equals(0));

      final allMutations = offlineDb.getAllMutations();
      expect(allMutations.first.state, equals(SyncMutationState.accepted));
    });

    test('6. Conflict Detection flags conflict state without silently overwriting server data', () async {
      await offlineDb.enqueueDraftMutation(
        idempotencyKey: 'idem-key-conflict-test-001',
        deviceId: 'device-samsung-tab-a9',
        caseworkerId: '00000000-0000-0000-0000-000000000003',
        mutationType: 'UPDATE_BENEFICIARY_PHONE',
        entityTable: 'beneficiaries',
        entityId: '20000000-0000-0000-0000-000000000001',
        payload: {'phonePrimary': '+9647701112233'},
        baseServerVersion: 1731499200000,
      );

      final result = await syncManager.syncPendingMutations(simulateConflict: true);

      expect(result.conflictCount, equals(1));
      expect(result.acceptedCount, equals(0));

      final mutation = offlineDb.getAllMutations().first;
      expect(mutation.state, equals(SyncMutationState.conflict));
      expect(mutation.conflictDetails, isNotNull);
      expect(mutation.conflictDetails!['serverState'], isNotNull);
      expect(mutation.conflictDetails!['clientState'], isNotNull);
      expect(offlineDb.conflictCount, equals(1));
    });

    test('7. Partial sync: conflict on one mutation does not block subsequent independent drafts', () async {
      // First draft will conflict
      await offlineDb.enqueueDraftMutation(
        idempotencyKey: 'idem-key-partial-conflict-001',
        deviceId: 'device-samsung-tab-a9',
        caseworkerId: '00000000-0000-0000-0000-000000000003',
        mutationType: 'UPDATE_BENEFICIARY_PHONE',
        entityTable: 'beneficiaries',
        entityId: '20000000-0000-0000-0000-000000000001',
        payload: {'phonePrimary': '+9647701112233'},
      );

      // Second draft without entityId will be accepted
      await offlineDb.enqueueDraftMutation(
        idempotencyKey: 'idem-key-partial-accept-002',
        deviceId: 'device-samsung-tab-a9',
        caseworkerId: '00000000-0000-0000-0000-000000000003',
        mutationType: 'LOG_FIELD_VISIT',
        entityTable: 'caseworker_visits',
        payload: {'notes': 'زيارة ميدانية مستقلة مقبولة'},
      );

      final result = await syncManager.syncPendingMutations(simulateConflict: true);

      expect(result.conflictCount, equals(1));
      expect(result.acceptedCount, equals(1));
      expect(result.totalProcessed, equals(2));
    });

    test('8. Session Expiry halts sync and prevents unauthenticated transmissions', () async {
      await offlineDb.enqueueDraftMutation(
        idempotencyKey: 'idem-key-expiry-check-001',
        deviceId: 'device-samsung-tab-a9',
        caseworkerId: '00000000-0000-0000-0000-000000000003',
        mutationType: 'LOG_FIELD_VISIT',
        entityTable: 'caseworker_visits',
        payload: {'notes': 'زيارة ميدانية'},
      );

      // Trigger session expiry
      await authService.triggerSessionExpiry();

      expect(
        () => syncManager.syncPendingMutations(),
        throwsA(predicate((e) => e.toString().contains('ERR_SESSION_EXPIRED'))),
      );

      // Draft must remain safely in queued state
      final mutation = offlineDb.getAllMutations().first;
      expect(mutation.state, equals(SyncMutationState.queued));
    });

    test('9. Connectivity loss mid-sync preserves remaining drafts in queued state', () async {
      await offlineDb.enqueueDraftMutation(
        idempotencyKey: 'idem-key-net-loss-001',
        deviceId: 'device-samsung-tab-a9',
        caseworkerId: '00000000-0000-0000-0000-000000000003',
        mutationType: 'LOG_FIELD_VISIT',
        entityTable: 'caseworker_visits',
        payload: {'notes': 'زيارة 1'},
      );

      await offlineDb.enqueueDraftMutation(
        idempotencyKey: 'idem-key-net-loss-002',
        deviceId: 'device-samsung-tab-a9',
        caseworkerId: '00000000-0000-0000-0000-000000000003',
        mutationType: 'LOG_FIELD_VISIT',
        entityTable: 'caseworker_visits',
        payload: {'notes': 'زيارة 2'},
      );

      final result = await syncManager.syncPendingMutations(simulateNetworkFailure: true);

      expect(result.acceptedCount, equals(1));
      expect(result.hasFailures, isTrue);

      final mutations = offlineDb.getAllMutations();
      expect(mutations[0].state, equals(SyncMutationState.accepted));
      expect(mutations[1].state, equals(SyncMutationState.queued));
    });

    test('10. App restart recovers pending drafts from encrypted storage', () async {
      await offlineDb.enqueueDraftMutation(
        idempotencyKey: 'idem-key-restart-recovery-001',
        deviceId: 'device-samsung-tab-a9',
        caseworkerId: '00000000-0000-0000-0000-000000000003',
        mutationType: 'REGISTER_BENEFICIARY',
        entityTable: 'beneficiaries',
        payload: {'fullNameAr': 'ياسين محمود حسن'},
      );

      // Simulate new app instance reading from same secure storage
      final newDbInstance = EncryptedOfflineDb(secureStorage: secureStorage);
      await newDbInstance.initialize();

      expect(newDbInstance.queuedDraftCount, equals(1));
      final recovered = newDbInstance.getAllMutations().first;
      expect(recovered.idempotencyKey, equals('idem-key-restart-recovery-001'));
      expect(recovered.payload['fullNameAr'], equals('ياسين محمود حسن'));
      expect(recovered.state, equals(SyncMutationState.queued));
    });

    test('11. Logout cleanup completely wipes local encrypted storage and encryption key', () async {
      await offlineDb.enqueueDraftMutation(
        idempotencyKey: 'idem-key-logout-cleanup-001',
        deviceId: 'device-samsung-tab-a9',
        caseworkerId: '00000000-0000-0000-0000-000000000003',
        mutationType: 'LOG_FIELD_VISIT',
        entityTable: 'caseworker_visits',
        payload: {'notes': 'بيانات حساسة يجب مسحها بالكامل'},
      );

      await offlineDb.cacheAssignedCases([
        {
          'case_id': 'c-001',
          'case_reference': 'REF-001',
          'programme_code': 'FIN',
          'status': 'submitted',
          'beneficiary_id': 'b-001',
          'beneficiary_name_ar': 'أحمد',
          'beneficiary_phone': '+9647700000000',
        }
      ]);

      expect(offlineDb.queuedDraftCount, equals(1));
      expect(offlineDb.cachedCaseCount, equals(1));

      // Sign out triggers mandatory ADR-003 complete wipe
      await authService.signOut();

      expect(offlineDb.queuedDraftCount, equals(0));
      expect(offlineDb.cachedCaseCount, equals(0));
      expect(offlineDb.getAllMutations().isEmpty, isTrue);
      expect(offlineDb.getAssignedCases().isEmpty, isTrue);
    });
  });
}
