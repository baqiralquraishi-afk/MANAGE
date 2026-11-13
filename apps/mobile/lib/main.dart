import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/config/app_config.dart';
import 'core/localization/locale_provider.dart';
import 'core/storage/encrypted_offline_db.dart';
import 'core/storage/offline_sync_manager.dart';
import 'core/storage/offline_sync_queue.dart';
import 'core/storage/secure_storage_service.dart';
import 'core/theme/app_theme.dart';
import 'services/auth_service.dart';
import 'services/casework_service.dart';
import 'ui/auth/login_screen.dart';
import 'ui/auth/session_expired_dialog.dart';
import 'ui/home/field_home_screen.dart';

// Dependency injection providers
final appConfigProvider = Provider<AppConfig>((ref) {
  return AppConfig();
});

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final encryptedOfflineDbProvider = Provider<EncryptedOfflineDb>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return EncryptedOfflineDb(secureStorage: storage);
});

final offlineSyncQueueProvider = Provider<OfflineSyncQueue>((ref) {
  return OfflineSyncQueue();
});

final authServiceProvider = ChangeNotifierProvider<AuthService>((ref) {
  final config = ref.watch(appConfigProvider);
  final storage = ref.watch(secureStorageProvider);
  final db = ref.watch(encryptedOfflineDbProvider);
  return AuthService(config: config, secureStorage: storage, offlineDb: db);
});

final offlineSyncManagerProvider = ChangeNotifierProvider<OfflineSyncManager>((ref) {
  final db = ref.watch(encryptedOfflineDbProvider);
  final auth = ref.watch(authServiceProvider);
  return OfflineSyncManager(db: db, authService: auth);
});

final caseworkServiceProvider = ChangeNotifierProvider<CaseworkService>((ref) {
  final queue = ref.watch(offlineSyncQueueProvider);
  final db = ref.watch(encryptedOfflineDbProvider);
  return CaseworkService(offlineQueue: queue, encryptedDb: db);
});

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: HumanityMobileApp(),
    ),
  );
}

class HumanityMobileApp extends ConsumerWidget {
  const HumanityMobileApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final localeState = ref.watch(localeProvider);
    final authService = ref.watch(authServiceProvider);
    final caseworkService = ref.watch(caseworkServiceProvider);

    return MaterialApp(
      title: 'Humanity Mobile',
      debugShowCheckedModeBanner: false,
      locale: localeState.locale,
      supportedLocales: const [
        Locale('ar'), // Arabic RTL default
        Locale('en'), // English LTR
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: AppTheme.lightTheme,
      home: Builder(
        builder: (context) {
          // Listen for session expiry and show dialog
          if (authService.isSessionExpired) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              showDialog<void>(
                context: context,
                barrierDismissible: false,
                builder: (ctx) => SessionExpiredDialog(
                  language: localeState.language,
                  onReAuthenticate: () {
                    Navigator.pop(ctx);
                    authService.reAuthenticate();
                  },
                ),
              );
            });
          }

          if (authService.isAuthenticated) {
            final offlineDb = ref.watch(encryptedOfflineDbProvider);
            final syncManager = ref.watch(offlineSyncManagerProvider);
            return FieldHomeScreen(
              authService: authService,
              caseworkService: caseworkService,
              localeState: localeState,
              onToggleLocale: () => ref.read(localeProvider.notifier).toggleLocale(),
              offlineDb: offlineDb,
              syncManager: syncManager,
            );
          }

          return LoginScreen(
            authService: authService,
            localeState: localeState,
            onToggleLocale: () => ref.read(localeProvider.notifier).toggleLocale(),
          );
        },
      ),
    );
  }
}
