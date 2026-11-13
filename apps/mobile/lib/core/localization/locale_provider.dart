import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app_translations.dart';

class LocaleState {
  final Locale locale;
  final AppLanguage language;
  final TextDirection textDirection;

  const LocaleState({
    required this.locale,
    required this.language,
    required this.textDirection,
  });

  bool get isArabic => language == AppLanguage.ar;

  LocaleState copyWith({Locale? locale}) {
    final nextLocale = locale ?? this.locale;
    final isAr = nextLocale.languageCode == 'ar';
    return LocaleState(
      locale: nextLocale,
      language: isAr ? AppLanguage.ar : AppLanguage.en,
      textDirection: isAr ? TextDirection.rtl : TextDirection.ltr,
    );
  }

  static LocaleState get arabicDefault => const LocaleState(
        locale: Locale('ar'),
        language: AppLanguage.ar,
        textDirection: TextDirection.rtl,
      );

  static LocaleState get english => const LocaleState(
        locale: Locale('en'),
        language: AppLanguage.en,
        textDirection: TextDirection.ltr,
      );
}

class LocaleNotifier extends StateNotifier<LocaleState> {
  LocaleNotifier() : super(LocaleState.arabicDefault);

  void toggleLocale() {
    if (state.isArabic) {
      state = LocaleState.english;
    } else {
      state = LocaleState.arabicDefault;
    }
  }

  void setLocale(Locale newLocale) {
    if (newLocale.languageCode == 'en') {
      state = LocaleState.english;
    } else {
      state = LocaleState.arabicDefault;
    }
  }
}

final localeProvider = StateNotifierProvider<LocaleNotifier, LocaleState>((ref) {
  return LocaleNotifier();
});
