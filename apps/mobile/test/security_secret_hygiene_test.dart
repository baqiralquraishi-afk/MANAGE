import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:humanity_mobile/core/config/app_config.dart';
import 'package:humanity_mobile/core/storage/secure_storage_service.dart';

void main() {
  group('Mobile Security & Secret Hygiene Tests', () {
    test('1. AppConfig strictly rejects service-role key injection', () {
      expect(
        () => AppConfig(
          supabaseUrl: 'http://localhost:54321',
          supabaseAnonKey: 'eyJhbGciOi...service_role...secret',
        ),
        throwsA(isA<SecurityException>().having(
          (e) => e.message,
          'message',
          contains('Service-role key detected'),
        )),
      );
    });

    test('2. SecureStorageService refuses to store service-role tokens', () async {
      final storage = SecureStorageService();
      expect(
        () => storage.saveAuthSession(
          accessToken: 'jwt-service_role-token-danger',
          refreshToken: 'refresh-token',
          expiresAt: DateTime.now().add(const Duration(minutes: 15)),
          userId: 'u1',
          userRole: 'caseworker',
        ),
        throwsA(isA<Exception>().having(
          (e) => e.toString(),
          'message',
          contains('Refusing to store service_role token'),
        )),
      );
    });

    test('3. Mobile source tree contains ZERO bundled service-role credentials', () {
      final libDir = Directory('lib');
      expect(libDir.existsSync(), true, reason: 'lib directory must exist');

      final forbiddenPatterns = [
        'service_role',
        'supabase_service_key',
        'service-role-key',
        'super_admin_secret',
      ];

      final dartFiles = libDir
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'));

      for (final file in dartFiles) {
        final content = file.readAsStringSync().toLowerCase();
        for (final pattern in forbiddenPatterns) {
          // Allow defensive security check lines (e.g. .contains('service_role'))
          final lines = content.split('\n');
          for (final line in lines) {
            if (line.contains(pattern)) {
              final isSecurityCheck = line.contains('security') ||
                  line.contains('exception') ||
                  line.contains('throw') ||
                  line.contains('critical') ||
                  line.contains('refusing') ||
                  line.contains('contains');
              expect(
                isSecurityCheck,
                true,
                reason: 'Disallowed secret or credential found in ${file.path}: $line',
              );
            }
          }
        }
      }
    });
  });
}
