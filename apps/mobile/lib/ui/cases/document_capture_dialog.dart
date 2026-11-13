import 'package:flutter/material.dart';
import '../../core/localization/app_translations.dart';
import '../../core/localization/locale_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../services/casework_service.dart';

class DocumentCaptureDialog extends StatefulWidget {
  final String caseId;
  final CaseworkService caseworkService;
  final LocaleState localeState;

  const DocumentCaptureDialog({
    super.key,
    required this.caseId,
    required this.caseworkService,
    required this.localeState,
  });

  @override
  State<DocumentCaptureDialog> createState() => _DocumentCaptureDialogState();
}

class _DocumentCaptureDialogState extends State<DocumentCaptureDialog> {
  String _category = 'national_id';
  final _fileNameController = TextEditingController(text: 'scanned_id.pdf');
  String _mimeType = 'application/pdf';
  final _sizeController = TextEditingController(text: '2048576'); // 2MB
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _fileNameController.dispose();
    _sizeController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    final fileName = _fileNameController.text.trim();
    final size = int.tryParse(_sizeController.text.trim()) ?? 0;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await widget.caseworkService.captureDocument(
        caseId: widget.caseId,
        category: _category,
        fileName: fileName,
        mimeType: _mimeType,
        fileSizeBytes: size,
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
      title: Row(
        children: [
          const Icon(Icons.document_scanner_outlined, color: AppTheme.primaryGreen),
          const SizedBox(width: 8),
          Expanded(child: Text(AppTranslations.get('capture_document_title', lang), style: const TextStyle(fontSize: 16))),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: AppTheme.alertRose, fontSize: 12)),
              const SizedBox(height: 8),
            ],

            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                AppTranslations.get('doc_security_notice', lang),
                style: const TextStyle(fontSize: 11, color: Color(0xFF166534)),
              ),
            ),
            const SizedBox(height: 12),

            DropdownButtonFormField<String>(
              value: _category,
              decoration: InputDecoration(
                labelText: AppTranslations.get('doc_category_label', lang),
              ),
              items: const [
                DropdownMenuItem(value: 'national_id', child: Text('البطاقة الوطنية الموحدة (National ID)')),
                DropdownMenuItem(value: 'residency_card', child: Text('بطاقة السكن (Residency Card)')),
                DropdownMenuItem(value: 'medical_report', child: Text('تقرير طبي (Medical Report)')),
                DropdownMenuItem(value: 'household_registry', child: Text('صورة قيد أسري (Household Registry)')),
                DropdownMenuItem(value: 'other', child: Text('وثيقة ثبوتية أخرى (Other)')),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _category = val);
              },
            ),
            const SizedBox(height: 12),

            TextFormField(
              controller: _fileNameController,
              decoration: InputDecoration(
                labelText: AppTranslations.get('doc_filename_label', lang),
              ),
            ),
            const SizedBox(height: 12),

            DropdownButtonFormField<String>(
              value: _mimeType,
              decoration: InputDecoration(
                labelText: AppTranslations.get('doc_mime_label', lang),
              ),
              items: const [
                DropdownMenuItem(value: 'application/pdf', child: Text('PDF (application/pdf)')),
                DropdownMenuItem(value: 'image/jpeg', child: Text('JPEG (image/jpeg)')),
                DropdownMenuItem(value: 'image/png', child: Text('PNG (image/png)')),
                DropdownMenuItem(value: 'image/webp', child: Text('WebP (image/webp)')),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _mimeType = val);
              },
            ),
            const SizedBox(height: 12),

            TextFormField(
              controller: _sizeController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: AppTranslations.get('doc_size_label', lang),
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
          child: Text(AppTranslations.get('save_document', lang)),
        ),
      ],
    );
  }
}
