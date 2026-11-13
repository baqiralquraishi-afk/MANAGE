import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: HumanityMobileApp(),
    ),
  );
}

class HumanityMobileApp extends StatefulWidget {
  const HumanityMobileApp({super.key});

  @override
  State<HumanityMobileApp> createState() => _HumanityMobileAppState();
}

class _HumanityMobileAppState extends State<HumanityMobileApp> {
  Locale _locale = const Locale('ar'); // Arabic RTL default

  void _toggleLocale() {
    setState(() {
      _locale = _locale.languageCode == 'ar'
          ? const Locale('en')
          : const Locale('ar');
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Humanity Mobile',
      locale: _locale,
      supportedLocales: const [
        Locale('ar'), // Arabic RTL
        Locale('en'), // English LTR
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF16A34A),
          brightness: Brightness.light,
        ),
      ),
      home: FieldHomeScreen(
        currentLocale: _locale,
        onToggleLocale: _toggleLocale,
      ),
    );
  }
}

class FieldHomeScreen extends StatelessWidget {
  final Locale currentLocale;
  final VoidCallback onToggleLocale;

  const FieldHomeScreen({
    super.key,
    required this.currentLocale,
    required this.onToggleLocale,
  });

  @override
  Widget build(BuildContext context) {
    final isArabic = currentLocale.languageCode == 'ar';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          isArabic ? 'تطبيق المسح الميداني — إنسانية' : 'Humanity Field Caseworker',
        ),
        actions: [
          TextButton.icon(
            onPressed: onToggleLocale,
            icon: const Icon(Icons.language),
            label: Text(isArabic ? 'English' : 'عربي'),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      const Icon(Icons.shield_outlined, size: 48, color: Color(0xFF16A34A)),
                      const SizedBox(height: 8),
                      Text(
                        isArabic
                            ? 'نظام إدارة الحالات الإنسانية (العراق)'
                            : 'Humanitarian Case Management (Iraq)',
                        style: Theme.of(context).textTheme.titleMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isArabic
                            ? 'المزامنة المشفرة دون اتصال بالإنترنت'
                            : 'Encrypted Offline Field Synchronization',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView(
                  children: [
                    _ProgrammeTile(
                      code: 'FIN',
                      nameAr: 'المساعدات النقدية والمالية',
                      nameEn: 'Financial Assistance',
                      icon: Icons.payments_outlined,
                      isArabic: isArabic,
                    ),
                    _ProgrammeTile(
                      code: 'FOD',
                      nameAr: 'الأمن الغذائي والتغذية',
                      nameEn: 'Food Security & Nutrition',
                      icon: Icons.restaurant_outlined,
                      isArabic: isArabic,
                    ),
                    _ProgrammeTile(
                      code: 'MED',
                      nameAr: 'الرعاية الصحية والدعم الطبي',
                      nameEn: 'Medical & Health Support',
                      icon: Icons.medical_services_outlined,
                      isArabic: isArabic,
                    ),
                    _ProgrammeTile(
                      code: 'HOU',
                      nameAr: 'المأوى وإعادة التأهيل',
                      nameEn: 'Housing & Shelter',
                      icon: Icons.home_work_outlined,
                      isArabic: isArabic,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProgrammeTile extends StatelessWidget {
  final String code;
  final String nameAr;
  final String nameEn;
  final IconData icon;
  final bool isArabic;

  const _ProgrammeTile({
    required this.code,
    required this.nameAr,
    required this.nameEn,
    required this.icon,
    required this.isArabic,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFF16A34A)),
      title: Text(isArabic ? nameAr : nameEn),
      subtitle: Text('[$code]'),
      trailing: const Icon(Icons.chevron_right),
    );
  }
}

