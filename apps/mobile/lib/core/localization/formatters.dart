import 'app_translations.dart';

/// Formatter utilities for mixed-script Bidirectional text, currencies, and dates.
class MobileFormatters {
  /// Isolates Latin alphanumeric identifiers (case codes, serial numbers, national IDs)
  /// using Unicode First Strong Isolate (U+2066) and Pop Directional Isolate (U+2069).
  /// Prevents hyphens and numbers from scrambling when rendered in Arabic RTL layouts.
  static String bidiText(String? id) {
    if (id == null || id.isEmpty) return '';
    return '\u2066$id\u2069';
  }

  /// Formats Iraqi Dinar currency with official humanitarian notation (د.ع in AR, IQD in EN).
  static String formatCurrency(
    num? amount, {
    AppLanguage lang = AppLanguage.ar,
    String currency = 'IQD',
  }) {
    if (amount == null) return '0';
    final isArabic = lang == AppLanguage.ar;
    final parts = amount.round().toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
    return isArabic ? '$parts د.ع' : '$currency $parts';
  }

  /// Formats date/time using the official Gregorian humanitarian calendar (YYYY-MM-DD [HH:MM]).
  static String formatDate(
    DateTime? date, {
    AppLanguage lang = AppLanguage.ar,
    bool includeTime = false,
  }) {
    if (date == null) return '';
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    if (!includeTime) {
      return '$y-$m-$d';
    }
    final hh = date.hour.toString().padLeft(2, '0');
    final mm = date.minute.toString().padLeft(2, '0');
    return '$y-$m-$d $hh:$mm';
  }

  /// Localized integer and decimal number grouping.
  static String formatNumber(
    num? value, {
    AppLanguage lang = AppLanguage.ar,
  }) {
    if (value == null) return '0';
    return value.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
  }
}
