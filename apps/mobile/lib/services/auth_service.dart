import 'package:flutter/foundation.dart';
import '../core/config/app_config.dart';
import '../core/storage/secure_storage_service.dart';
import '../models/auth_user.dart';

class AuthService extends ChangeNotifier {
  final AppConfig config;
  final SecureStorageService secureStorage;

  AuthUser? _currentUser;
  bool _isSessionExpired = false;

  AuthService({
    required this.config,
    required this.secureStorage,
  });

  AuthUser? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null && !_isSessionExpired;
  bool get isSessionExpired => _isSessionExpired;

  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    // Assert public anon configuration boundary
    if (config.supabaseAnonKey.toLowerCase().contains('service_role')) {
      throw const SecurityException('CRITICAL: Mobile client rejected service-role key injection.');
    }

    // Role-aware demo mapping
    if (email.contains('supervisor')) {
      _currentUser = AuthUser.demoSupervisor;
    } else {
      _currentUser = AuthUser.demoCaseworker;
    }

    _isSessionExpired = false;

    // Securely persist session token with 15-minute TTL
    await secureStorage.saveAuthSession(
      accessToken: 'jwt-anon-token-${_currentUser!.id}',
      refreshToken: 'jwt-refresh-token-${_currentUser!.id}',
      expiresAt: DateTime.now().add(const Duration(minutes: 15)),
      userId: _currentUser!.id,
      userRole: _currentUser!.role,
    );

    notifyListeners();
  }

  Future<void> triggerSessionExpiry() async {
    _isSessionExpired = true;
    notifyListeners();
  }

  Future<void> reAuthenticate() async {
    if (_currentUser != null) {
      _isSessionExpired = false;
      await secureStorage.saveAuthSession(
        accessToken: 'jwt-anon-token-${_currentUser!.id}',
        refreshToken: 'jwt-refresh-token-${_currentUser!.id}',
        expiresAt: DateTime.now().add(const Duration(minutes: 15)),
        userId: _currentUser!.id,
        userRole: _currentUser!.role,
      );
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    _currentUser = null;
    _isSessionExpired = false;
    await secureStorage.clearAuthSession();
    notifyListeners();
  }
}
