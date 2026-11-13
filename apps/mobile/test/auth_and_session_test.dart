import 'package:flutter_test/flutter_test.dart';
import 'package:humanity_mobile/core/config/app_config.dart';
import 'package:humanity_mobile/core/storage/secure_storage_service.dart';
import 'package:humanity_mobile/models/auth_user.dart';
import 'package:humanity_mobile/services/auth_service.dart';

void main() {
  group('Auth & Session Security Tests', () {
    late AppConfig config;
    late SecureStorageService secureStorage;
    late AuthService authService;

    setUp(() {
      config = AppConfig();
      secureStorage = SecureStorageService();
      authService = AuthService(config: config, secureStorage: secureStorage);
    });

    test('Initial state is unauthenticated', () {
      expect(authService.isAuthenticated, false);
      expect(authService.currentUser, isNull);
      expect(authService.isSessionExpired, false);
    });

    test('Caseworker sign-in saves tokens to secure storage', () async {
      await authService.signIn(
        email: 'caseworker.ninewa@humanity.iq',
        password: 'Caseworker#2026!',
      );

      expect(authService.isAuthenticated, true);
      expect(authService.currentUser, isNotNull);
      expect(authService.currentUser!.role, 'caseworker');
      expect(authService.currentUser!.governorates, contains('IQ-NI'));

      final token = await secureStorage.getAccessToken();
      expect(token, isNotNull);
      expect(token!.contains('service_role'), false, reason: 'Zero service_role tokens permitted');

      final role = await secureStorage.getUserRole();
      expect(role, 'caseworker');
    });

    test('Supervisor sign-in assigns supervisor role and multi-governorate scope', () async {
      await authService.signIn(
        email: 'supervisor.baghdad@humanity.iq',
        password: 'Supervisor#2026!',
      );

      expect(authService.currentUser!.isSupervisor, true);
      expect(authService.currentUser!.governorates, containsAll(['IQ-BG', 'IQ-NI']));
    });

    test('Sign-out clears auth session from secure storage', () async {
      await authService.signIn(
        email: 'caseworker.ninewa@humanity.iq',
        password: 'Caseworker#2026!',
      );
      expect(authService.isAuthenticated, true);

      await authService.signOut();
      expect(authService.isAuthenticated, false);
      expect(authService.currentUser, isNull);

      final token = await secureStorage.getAccessToken();
      expect(token, isNull);
    });

    test('Session expiry triggers expired state and re-authentication restores session', () async {
      await authService.signIn(
        email: 'caseworker.ninewa@humanity.iq',
        password: 'Caseworker#2026!',
      );
      expect(authService.isAuthenticated, true);

      // Trigger session expiry
      await authService.triggerSessionExpiry();
      expect(authService.isSessionExpired, true);
      expect(authService.isAuthenticated, false);

      // Re-authenticate
      await authService.reAuthenticate();
      expect(authService.isSessionExpired, false);
      expect(authService.isAuthenticated, true);
      expect(authService.currentUser!.id, AuthUser.demoCaseworker.id);
    });
  });
}
