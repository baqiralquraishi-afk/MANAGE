import 'package:flutter/material.dart';
import '../../core/localization/app_translations.dart';
import '../../core/localization/locale_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  final AuthService authService;
  final LocaleState localeState;
  final VoidCallback onToggleLocale;

  const LoginScreen({
    super.key,
    required this.authService,
    required this.localeState,
    required this.onToggleLocale,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController(text: 'caseworker.ninewa@humanity.iq');
  final _passwordController = TextEditingController(text: 'Caseworker#2026!');
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSignIn([String? email, String? password]) async {
    final targetEmail = email ?? _emailController.text.trim();
    final targetPass = password ?? _passwordController.text.trim();

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await widget.authService.signIn(
        email: targetEmail,
        password: targetPass,
      );
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = widget.localeState.language;
    final isTablet = AppTheme.isTablet(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(AppTranslations.get('app_title', lang)),
        actions: [
          TextButton.icon(
            onPressed: widget.onToggleLocale,
            icon: const Icon(Icons.language),
            label: Text(widget.localeState.isArabic ? 'English' : 'عربي'),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: isTablet ? 500 : double.infinity),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.shield_outlined,
                          size: 56,
                          color: AppTheme.primaryGreen,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          AppTranslations.get('login_title', lang),
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          AppTranslations.get('login_subtitle', lang),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppTheme.textSecondary,
                              ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),

                        // Security Boundary Badge
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFBFDBFE)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.lock_outline, size: 20, color: Color(0xFF1D4ED8)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  widget.localeState.isArabic
                                      ? 'اتصال آمن بصلاحيات محدودة (RLS) · لا توجد مفاتيح امتيازية'
                                      : 'Public RLS-enforced client · Zero service-role keys',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF1E40AF)),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        if (_errorMessage != null) ...[
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF1F2),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFFECDD3)),
                            ),
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: AppTheme.alertRose, fontSize: 12),
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],

                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          decoration: InputDecoration(
                            labelText: AppTranslations.get('email_label', lang),
                            prefixIcon: const Icon(Icons.email_outlined),
                          ),
                          validator: (val) =>
                              val == null || val.isEmpty ? AppTranslations.get('required_field', lang) : null,
                        ),
                        const SizedBox(height: 16),

                        TextFormField(
                          controller: _passwordController,
                          obscureText: true,
                          decoration: InputDecoration(
                            labelText: AppTranslations.get('password_label', lang),
                            prefixIcon: const Icon(Icons.lock_outline),
                          ),
                          validator: (val) =>
                              val == null || val.isEmpty ? AppTranslations.get('required_field', lang) : null,
                        ),
                        const SizedBox(height: 20),

                        ElevatedButton(
                          onPressed: _isLoading ? null : () => _handleSignIn(),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : Text(AppTranslations.get('sign_in_button', lang)),
                        ),
                        const SizedBox(height: 16),

                        const Divider(),
                        const SizedBox(height: 8),

                        // Quick demo role buttons
                        OutlinedButton.icon(
                          onPressed: () => _handleSignIn('caseworker.ninewa@humanity.iq', 'Caseworker#2026!'),
                          icon: const Icon(Icons.badge_outlined, size: 18),
                          label: Text(
                            AppTranslations.get('quick_login_caseworker', lang),
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          onPressed: () => _handleSignIn('supervisor.baghdad@humanity.iq', 'Supervisor#2026!'),
                          icon: const Icon(Icons.admin_panel_settings_outlined, size: 18),
                          label: Text(
                            AppTranslations.get('quick_login_supervisor', lang),
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
