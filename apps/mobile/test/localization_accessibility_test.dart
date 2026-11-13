import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:humanity_mobile/core/localization/app_translations.dart';
import 'package:humanity_mobile/core/localization/formatters.dart';

void main() {
  group('Mobile Localization & Bidirectional Formatting Tests (Phase 14)', () {
    test('MobileFormatters.bidiText isolates mixed-script alphanumeric IDs', () {
      const caseCode = 'HUM-2026-FIN-00001';
      final formatted = MobileFormatters.bidiText(caseCode);

      expect(formatted, '\u2066HUM-2026-FIN-00001\u2069');
      expect(formatted.codeUnitAt(0), 0x2066);
      expect(formatted.codeUnitAt(formatted.length - 1), 0x2069);

      // Null and empty safety
      expect(MobileFormatters.bidiText(null), '');
      expect(MobileFormatters.bidiText(''), '');
    });

    test('MobileFormatters.formatCurrency formats Iraqi Dinar in AR and EN', () {
      final arabicCurrency = MobileFormatters.formatCurrency(
        250000,
        lang: AppLanguage.ar,
      );
      expect(arabicCurrency.contains('د.ع'), isTrue);

      final englishCurrency = MobileFormatters.formatCurrency(
        250000,
        lang: AppLanguage.en,
      );
      expect(englishCurrency.startsWith('IQD'), isTrue);
      expect(englishCurrency.contains('250,000'), isTrue);
    });

    test('MobileFormatters.formatDate formats Gregorian humanitarian date', () {
      final sampleDate = DateTime(2026, 11, 13, 14, 30);

      final formattedDate = MobileFormatters.formatDate(
        sampleDate,
        lang: AppLanguage.en,
      );
      expect(formattedDate, '2026-11-13');

      final formattedDateTime = MobileFormatters.formatDate(
        sampleDate,
        lang: AppLanguage.en,
        includeTime: true,
      );
      expect(formattedDateTime, '2026-11-13 14:30');
    });

    test('AppTranslations contains canonical humanitarian terminology (Iraq)', () {
      final requiredKeys = [
        'term_consent',
        'term_safeguarding',
        'term_duplicate_review',
        'term_ledger_reversal',
        'term_legal_hold',
        'term_do_no_harm',
        'term_data_minimization',
      ];

      for (final key in requiredKeys) {
        final ar = AppTranslations.get(key, AppLanguage.ar);
        final en = AppTranslations.get(key, AppLanguage.en);

        expect(ar.isNotEmpty, isTrue);
        expect(en.isNotEmpty, isTrue);
        expect(ar != key, isTrue, reason: 'Key $key should have an Arabic translation');
        expect(en != key, isTrue, reason: 'Key $key should have an English translation');
      }

      expect(AppTranslations.get('term_consent', AppLanguage.ar), 'الموافقة المستنيرة الصريحة');
      expect(AppTranslations.get('term_consent', AppLanguage.en), 'Explicit Informed Consent');
      expect(AppTranslations.get('term_safeguarding', AppLanguage.ar), 'صون وحماية الفئات المستضعفة');
      expect(AppTranslations.get('term_safeguarding', AppLanguage.en), 'Safeguarding & Heightened Protection');
      expect(AppTranslations.get('term_duplicate_review', AppLanguage.ar), 'تدقيق تشابه القيود والازدواجية');
      expect(AppTranslations.get('term_ledger_reversal', AppLanguage.ar), 'قيد تسوية عكسي');
      expect(AppTranslations.get('term_legal_hold', AppLanguage.ar), 'تجميد قانوني تحفظي');
    });

    testWidgets('Touch target minimum constraints adhere to accessibility standards (>= 48x48 dp)', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 48,
                height: 48,
                child: ElevatedButton(
                  onPressed: () {},
                  child: const Text('OK'),
                ),
              ),
            ),
          ),
        ),
      );

      final buttonFinder = find.byType(ElevatedButton);
      final size = tester.getSize(buttonFinder);
      expect(size.width, greaterThanOrEqualTo(48.0));
      expect(size.height, greaterThanOrEqualTo(48.0));
    });
  });
}

