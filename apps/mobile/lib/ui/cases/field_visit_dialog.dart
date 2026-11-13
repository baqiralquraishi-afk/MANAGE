import 'package:flutter/material.dart';
import '../../core/localization/app_translations.dart';
import '../../core/localization/locale_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../services/casework_service.dart';

class FieldVisitDialog extends StatefulWidget {
  final String caseId;
  final String caseworkerName;
  final CaseworkService caseworkService;
  final LocaleState localeState;

  const FieldVisitDialog({
    super.key,
    required this.caseId,
    required this.caseworkerName,
    required this.caseworkService,
    required this.localeState,
  });

  @override
  State<FieldVisitDialog> createState() => _FieldVisitDialogState();
}

class _FieldVisitDialogState extends State<FieldVisitDialog> {
  final _gpsController = TextEditingController(text: '36.335000, 43.118889');
  final _observationsController = TextEditingController();
  final _dateController = TextEditingController(
    text: DateTime.now().toIso8601String().substring(0, 10),
  );
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _gpsController.dispose();
    _observationsController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    final obs = _observationsController.text.trim();
    if (obs.length < 5) {
      setState(() {
        _error = widget.localeState.isArabic
            ? 'يجب أن لا تقل ملاحظات الزيارة عن 5 أحرف'
            : 'Observations must be at least 5 characters.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await widget.caseworkService.logFieldVisit(
        caseId: widget.caseId,
        visitDate: _dateController.text.trim(),
        gpsCoordinates: _gpsController.text.trim(),
        observations: obs,
        caseworkerName: widget.caseworkerName,
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = widget.localeState.language;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text(AppTranslations.get('log_visit_title', lang)),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: AppTheme.alertRose, fontSize: 12)),
              const SizedBox(height: 8),
            ],
            TextFormField(
              controller: _dateController,
              decoration: const InputDecoration(
                labelText: 'تاريخ الزيارة (YYYY-MM-DD)',
                prefixIcon: Icon(Icons.calendar_today_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _gpsController,
              decoration: InputDecoration(
                labelText: AppTranslations.get('gps_coordinates_label', lang),
                prefixIcon: const Icon(Icons.my_location),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _observationsController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: AppTranslations.get('visit_observations_label', lang),
                hintText: widget.localeState.isArabic ? 'وصف ظروف المعيشة والمأوى...' : 'Describe living conditions...',
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(AppTranslations.get('cancel', lang)),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _handleSave,
          child: Text(AppTranslations.get('save_visit', lang)),
        ),
      ],
    );
  }
}
