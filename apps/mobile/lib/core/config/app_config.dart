/// Humanity Mobile - Application Configuration & Security Boundary
///
/// STRICTURES:
/// 1. Only PUBLIC Supabase URL and ANON KEY may ever be configured.
/// 2. Any injection or detection of 'service_role' keys immediately throws SecurityException.
/// 3. Fictional local/demo defaults provided for development and testing.
library;

class SecurityException implements Exception {
  final String message;
  const SecurityException(this.message);

  @override
  String toString() => 'SecurityException: $message';
}

class AppConfig {
  static const String appName = 'Humanity Mobile';
  static const String appVersion = '0.1.0+1';

  // Public Supabase configuration (RLS-enforced, public anon role only)
  static const String defaultSupabaseUrl = 'http://127.0.0.1:54321';
  static const String defaultSupabaseAnonKey = 'dummy-anon-key-for-local-testing';

  final String supabaseUrl;
  final String supabaseAnonKey;
  final bool isOfflineDemoMode;

  AppConfig({
    String? supabaseUrl,
    String? supabaseAnonKey,
    this.isOfflineDemoMode = true,
  })  : supabaseUrl = supabaseUrl ?? defaultSupabaseUrl,
        supabaseAnonKey = supabaseAnonKey ?? defaultSupabaseAnonKey {
    _validateSecurity();
  }

  void _validateSecurity() {
    if (supabaseAnonKey.toLowerCase().contains('service_role')) {
      throw const SecurityException(
        'CRITICAL SECURITY VIOLATION: Service-role key detected in client mobile configuration! '
        'Mobile clients must only ever hold the public anonymous key.',
      );
    }
  }
}
