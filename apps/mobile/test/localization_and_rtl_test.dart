import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:humanity_mobile/core/localization/app_translations.dart';
import 'package:humanity_mobile/core/localization/locale_provider.dart';

void main() {
  group('Localization & RTL/LTR Tests', () {
    test('Arabic is default locale with TextDirection.rtl', () {
      final state = LocaleState.arabicDefault;
      expect(state.locale.languageCode, 'ar');
      expect(state.isArabic, true);
      expect(state.textDirection, TextDirection.rtl);
    });

    test('English switch sets TextDirection.ltr', () {
      final notifier = LocaleNotifier();
      expect(notifier.state.locale.languageCode, 'ar');
      expect(notifier.state.textDirection, TextDirection.rtl);

      notifier.toggleLocale();
      expect(notifier.state.locale.languageCode, 'en');
      expect(notifier.state.isArabic, false);
      expect(notifier.state.textDirection, TextDirection.ltr);

      notifier.toggleLocale();
      expect(notifier.state.locale.languageCode, 'ar');
      expect(notifier.state.textDirection, TextDirection.rtl);
    });

    test('AppTranslations contains all essential keys in both Arabic and English', () {
      const requiredKeys = [
        'app_title',
        'login_title',
        'email_label',
        'password_label',
        'sign_in_button',
        'session_expired_title',
        'status_online',
        'status_offline',
        'sync_now',
        'nav_beneficiaries',
        'nav_cases',
        'nav_appointments',
        'register_beneficiary_title',
        'informed_consent_checkbox',
        'consent_error',
        'case_details_title',
        'conduct_assessment',
        'log_visit_title',
        'capture_document_title',
        'doc_security_notice',
      ];

      for (final key in requiredKeys) {
        final arText = AppTranslations.get(key, AppLanguage.ar);
        final enText = AppTranslations.get(key, AppLanguage.en);

        expect(arText, isNotEmpty, reason: 'Key $key must have Arabic translation');
        expect(enText, isNotEmpty, reason: 'Key $key must have English translation');
        expect(arText, isNot(equals(key)), reason: 'Key $key should not return fallback key in Arabic');
        expect(enText, isNot(equals(key)), reason: 'Key $key should not return fallback key in English');
      }
    });
  });
}
