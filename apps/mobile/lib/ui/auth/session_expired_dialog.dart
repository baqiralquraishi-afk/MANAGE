import 'package:flutter/material.dart';
import '../../core/localization/app_translations.dart';
import '../../core/theme/app_theme.dart';

class SessionExpiredDialog extends StatelessWidget {
  final AppLanguage language;
  final VoidCallback onReAuthenticate;

  const SessionExpiredDialog({
    super.key,
    required this.language,
    required this.onReAuthenticate,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          const Icon(Icons.timer_off_outlined, color: AppTheme.alertAmber),
          const SizedBox(width: 8),
          Text(AppTranslations.get('session_expired_title', language)),
        ],
      ),
      content: Text(
        AppTranslations.get('session_expired_message', language),
        style: const TextStyle(fontSize: 13, height: 1.5),
      ),
      actions: [
        ElevatedButton(
          onPressed: onReAuthenticate,
          child: Text(AppTranslations.get('re_authenticate', language)),
        ),
      ],
    );
  }
}
