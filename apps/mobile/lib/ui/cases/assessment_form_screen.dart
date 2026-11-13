import 'package:flutter/material.dart';
import '../../core/localization/app_translations.dart';
import '../../core/localization/locale_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../services/casework_service.dart';

class AssessmentFormScreen extends StatefulWidget {
  final String caseId;
  final String initialProgramme;
  final CaseworkService caseworkService;
  final LocaleState localeState;

  const AssessmentFormScreen({
    super.key,
    required this.caseId,
    required this.initialProgramme,
    required this.caseworkService,
    required this.localeState,
  });

  @override
  State<AssessmentFormScreen> createState() => _AssessmentFormScreenState();
}

class _AssessmentFormScreenState extends State<AssessmentFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late String _programmeCode;
  double _score = 75;
  final _notesController = TextEditingController();
  final _recommendationController = TextEditingController(text: 'يوصى بصرف المساعدة النقدية العاجلة');
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _programmeCode = widget.initialProgramme;
  }

  @override
  void dispose() {
    _notesController.dispose();
    _recommendationController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await widget.caseworkService.submitAssessment(
        caseId: widget.caseId,
        programmeCode: _programmeCode,
        vulnerabilityScore: _score.toInt(),
        caseworkerNotes: _notesController.text.trim(),
        recommendation: _recommendationController.text.trim(),
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

    return Scaffold(
      appBar: AppBar(
        title: Text(AppTranslations.get('conduct_assessment', lang)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF1F2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFECDD3)),
                    ),
                    child: Text(_error!, style: const TextStyle(color: AppTheme.alertRose, fontSize: 12)),
                  ),
                  const SizedBox(height: 16),
                ],

                DropdownButtonFormField<String>(
                  value: _programmeCode,
                  decoration: const InputDecoration(labelText: 'قطاع المساعدة الإنسانية (Sector)'),
                  items: const [
                    DropdownMenuItem(value: 'FIN', child: Text('FIN — المساعدات النقدية (Financial)')),
                    DropdownMenuItem(value: 'FOD', child: Text('FOD — الأمن الغذائي (Food Security)')),
                    DropdownMenuItem(value: 'MED', child: Text('MED — الرعاية الصحية (Medical)')),
                    DropdownMenuItem(value: 'HOU', child: Text('HOU — المأوى والسكن (Housing)')),
                    DropdownMenuItem(value: 'EDU', child: Text('EDU — التعليم ورعاية الطفل (Education)')),
                    DropdownMenuItem(value: 'EMG', child: Text('EMG — الإغاثة الطارئة (Emergency)')),
                    DropdownMenuItem(value: 'EMP', child: Text('EMP — التأهيل والتشغيل (Employment)')),
                    DropdownMenuItem(value: 'SOC', child: Text('SOC — الخدمات الاجتماعية (Social)')),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _programmeCode = val);
                  },
                ),
                const SizedBox(height: 20),

                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              AppTranslations.get('assessment_score_label', lang),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            Text(
                              '${_score.toInt()} / 100',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryGreen,
                              ),
                            ),
                          ],
                        ),
                        Slider(
                          value: _score,
                          min: 1,
                          max: 100,
                          divisions: 99,
                          activeColor: AppTheme.primaryGreen,
                          onChanged: (val) => setState(() => _score = val),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _notesController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    labelText: AppTranslations.get('assessment_notes_label', lang),
                    hintText: widget.localeState.isArabic
                        ? 'تفاصيل التقييم الميداني ونتائج مقابلة الأسرة...'
                        : 'Enter detailed assessment findings...',
                  ),
                  validator: (val) {
                    if (val == null || val.trim().length < 5) {
                      return widget.localeState.isArabic
                          ? 'يجب أن لا تقل ملاحظات التقييم عن 5 أحرف'
                          : 'Notes must be at least 5 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _recommendationController,
                  decoration: const InputDecoration(
                    labelText: 'التوصية الفنية المرفوعة للمشرف *',
                  ),
                  validator: (val) =>
                      val == null || val.trim().isEmpty ? AppTranslations.get('required_field', lang) : null,
                ),
                const SizedBox(height: 24),

                ElevatedButton(
                  onPressed: _isLoading ? null : _handleSubmit,
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(AppTranslations.get('submit_assessment', lang)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
