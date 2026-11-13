import 'package:flutter/material.dart';
import '../../core/localization/app_translations.dart';
import '../../core/localization/locale_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../services/casework_service.dart';

class BeneficiaryRegisterScreen extends StatefulWidget {
  final CaseworkService caseworkService;
  final LocaleState localeState;

  const BeneficiaryRegisterScreen({
    super.key,
    required this.caseworkService,
    required this.localeState,
  });

  @override
  State<BeneficiaryRegisterScreen> createState() => _BeneficiaryRegisterScreenState();
}

class _BeneficiaryRegisterScreenState extends State<BeneficiaryRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nationalIdController = TextEditingController();
  final _fullNameArController = TextEditingController();
  final _fullNameEnController = TextEditingController();
  final _phoneController = TextEditingController(text: '+964');
  String _selectedGovernorate = 'IQ-NI';
  bool _hasInformedConsent = false;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nationalIdController.dispose();
    _fullNameArController.dispose();
    _fullNameEnController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_hasInformedConsent) {
      setState(() {
        _errorMessage = AppTranslations.get('consent_error', widget.localeState.language);
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await widget.caseworkService.registerBeneficiary(
        nationalId: _nationalIdController.text.trim(),
        fullNameAr: _fullNameArController.text.trim(),
        fullNameEn: _fullNameEnController.text.trim().isNotEmpty
            ? _fullNameEnController.text.trim()
            : _fullNameArController.text.trim(),
        phone: _phoneController.text.trim(),
        governorateId: _selectedGovernorate,
        hasInformedConsent: _hasInformedConsent,
      );

      if (mounted) {
        Navigator.pop(context, true);
      }
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

    return Scaffold(
      appBar: AppBar(
        title: Text(AppTranslations.get('register_beneficiary_title', lang)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF1F2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFECDD3)),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: AppTheme.alertRose, fontSize: 12),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Informed Consent Notice Box
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.shield_outlined, color: AppTheme.primaryGreen, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          widget.localeState.isArabic
                              ? 'متطلب الامتثال الإنساني: يجب استيفاء الموافقة المستنيرة وتوثيقها قبل حفظ السجل.'
                              : 'Humanitarian Compliance: Explicit informed consent is mandatory prior to registration.',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF166534)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _nationalIdController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: AppTranslations.get('national_id_label', lang),
                    prefixIcon: const Icon(Icons.badge_outlined),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return AppTranslations.get('required_field', lang);
                    }
                    if (val.trim().length != 12) {
                      return widget.localeState.isArabic
                          ? 'يجب أن يتكون رقم البطاقة الوطنية من 12 رقماً'
                          : 'National ID must be exactly 12 digits';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _fullNameArController,
                  decoration: InputDecoration(
                    labelText: AppTranslations.get('full_name_ar_label', lang),
                    prefixIcon: const Icon(Icons.person_outline),
                  ),
                  validator: (val) =>
                      val == null || val.trim().isEmpty ? AppTranslations.get('required_field', lang) : null,
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _fullNameEnController,
                  decoration: InputDecoration(
                    labelText: widget.localeState.isArabic
                        ? 'الاسم باللغة الإنجليزية (اختياري)'
                        : 'Full Name in English (Optional)',
                    prefixIcon: const Icon(Icons.language_outlined),
                  ),
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: AppTranslations.get('phone_label', lang),
                    prefixIcon: const Icon(Icons.phone_outlined),
                  ),
                  validator: (val) =>
                      val == null || val.trim().isEmpty ? AppTranslations.get('required_field', lang) : null,
                ),
                const SizedBox(height: 16),

                DropdownButtonFormField<String>(
                  value: _selectedGovernorate,
                  decoration: InputDecoration(
                    labelText: AppTranslations.get('governorate_label', lang),
                    prefixIcon: const Icon(Icons.location_on_outlined),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'IQ-BG', child: Text('بغداد (Baghdad)')),
                    DropdownMenuItem(value: 'IQ-NI', child: Text('نينوى (Ninewa)')),
                    DropdownMenuItem(value: 'IQ-BA', child: Text('البصرة (Basra)')),
                    DropdownMenuItem(value: 'IQ-AN', child: Text('الأنبار (Anbar)')),
                    DropdownMenuItem(value: 'IQ-AR', child: Text('أربيل (Erbil)')),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedGovernorate = val);
                  },
                ),
                const SizedBox(height: 20),

                // Mandatory Informed Consent Checkbox
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _hasInformedConsent,
                  onChanged: (val) => setState(() => _hasInformedConsent = val ?? false),
                  title: Text(
                    AppTranslations.get('informed_consent_checkbox', lang),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  controlAffinity: ListTileControlAffinity.leading,
                  activeColor: AppTheme.primaryGreen,
                ),
                const SizedBox(height: 24),

                ElevatedButton(
                  onPressed: _isLoading ? null : _handleRegister,
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(AppTranslations.get('save_beneficiary', lang)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
