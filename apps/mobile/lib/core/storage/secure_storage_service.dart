import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Humanity Mobile - Secure Storage Service
///
/// Encapsulates platform keystore / keychain storage via flutter_secure_storage.
/// Provides fallback for test harnesses where platform channels are not mocked.
class SecureStorageService {
  final FlutterSecureStorage _storage;
  final Map<String, String> _memoryFallback = {};
  bool _useFallback = false;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const String keyAccessToken = 'humanity_access_token';
  static const String keyRefreshToken = 'humanity_refresh_token';
  static const String keyExpiresAt = 'humanity_expires_at';
  static const String keyUserRole = 'humanity_user_role';
  static const String keyUserId = 'humanity_user_id';

  Future<void> saveAuthSession({
    required String accessToken,
    required String refreshToken,
    required DateTime expiresAt,
    required String userId,
    required String userRole,
  }) async {
    // Assert no service role token is being stored
    if (accessToken.toLowerCase().contains('service_role')) {
      throw Exception('SECURITY FAULT: Refusing to store service_role token in mobile storage.');
    }

    await _write(keyAccessToken, accessToken);
    await _write(keyRefreshToken, refreshToken);
    await _write(keyExpiresAt, expiresAt.toIso8601String());
    await _write(keyUserId, userId);
    await _write(keyUserRole, userRole);
  }

  Future<String?> getAccessToken() => _read(keyAccessToken);
  Future<String?> getRefreshToken() => _read(keyRefreshToken);
  Future<String?> getUserId() => _read(keyUserId);
  Future<String?> getUserRole() => _read(keyUserRole);

  Future<bool> isSessionExpired() async {
    final expStr = await _read(keyExpiresAt);
    if (expStr == null) return true;
    try {
      final exp = DateTime.parse(expStr);
      return DateTime.now().isAfter(exp);
    } catch (_) {
      return true;
    }
  }

  Future<void> clearAuthSession() async {
    await _delete(keyAccessToken);
    await _delete(keyRefreshToken);
    await _delete(keyExpiresAt);
    await _delete(keyUserId);
    await _delete(keyUserRole);
  }

  Future<void> writeData(String key, String value) => _write(key, value);
  Future<String?> readData(String key) => _read(key);
  Future<void> deleteData(String key) => _delete(key);

  Future<void> _write(String key, String value) async {
    if (_useFallback) {
      _memoryFallback[key] = value;
      return;
    }
    try {
      await _storage.write(key: key, value: value);
    } catch (_) {
      _useFallback = true;
      _memoryFallback[key] = value;
    }
  }

  Future<String?> _read(String key) async {
    if (_useFallback) {
      return _memoryFallback[key];
    }
    try {
      return await _storage.read(key: key);
    } catch (_) {
      _useFallback = true;
      return _memoryFallback[key];
    }
  }

  Future<void> _delete(String key) async {
    if (_useFallback) {
      _memoryFallback.remove(key);
      return;
    }
    try {
      await _storage.delete(key: key);
    } catch (_) {
      _useFallback = true;
      _memoryFallback.remove(key);
    }
  }
}
