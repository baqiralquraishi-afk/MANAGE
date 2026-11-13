import 'package:flutter/material.dart';
import '../../core/localization/app_translations.dart';
import '../../core/localization/locale_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../models/auth_user.dart';
import '../../models/case_record.dart';
import '../../services/casework_service.dart';
import 'assessment_form_screen.dart';
import 'document_capture_dialog.dart';
import 'field_visit_dialog.dart';

class CaseDetailScreen extends StatefulWidget {
  final CaseRecord caseRecord;
  final AuthUser currentUser;
  final CaseworkService caseworkService;
  final LocaleState localeState;

  const CaseDetailScreen({
    super.key,
    required this.caseRecord,
    required this.currentUser,
    required this.caseworkService,
    required this.localeState,
  });

  @override
  State<CaseDetailScreen> createState() => _CaseDetailScreenState();
}

class _CaseDetailScreenState extends State<CaseDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lang = widget.localeState.language;
    final c = widget.caseRecord;
    final household = widget.caseworkService.getHouseholdMembers(c.id);
    final visits = widget.caseworkService.getFieldVisits(c.id);
    final documents = widget.caseworkService.getDocuments(c.id);

    return Scaffold(
      appBar: AppBar(
        title: Text(c.caseReference),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryGreen,
          indicatorColor: AppTheme.primaryGreen,
          isScrollable: true,
          tabs: [
            Tab(text: AppTranslations.get('household_members', lang)),
            Tab(text: widget.localeState.isArabic ? 'الزيارات الميدانية' : 'Field Visits'),
            Tab(text: widget.localeState.isArabic ? 'التقييمات' : 'Assessments'),
            Tab(text: widget.localeState.isArabic ? 'الوثائق الخاصة' : 'Documents'),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Case Overview Banner
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        c.beneficiaryName,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Chip(
                        label: Text(
                          c.status.toUpperCase(),
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        backgroundColor: AppTheme.lightGreen,
                        side: BorderSide.none,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${c.programmeCode} • ${c.governorateId} • ${widget.localeState.isArabic ? 'أفراد الأسرة:' : 'Household Size:'} ${c.householdSize}',
                    style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Tab 1: Household Members
                  ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: household.length,
                    itemBuilder: (context, idx) {
                      final m = household[idx];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: const CircleAvatar(
                            backgroundColor: Color(0xFFF1F5F9),
                            child: Icon(Icons.person, color: AppTheme.textSecondary),
                          ),
                          title: Text(m.fullNameAr, style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('${m.relationship} • ${m.age} سنة'),
                          trailing: m.hasVulnerability
                              ? Chip(
                                  label: Text(
                                    widget.localeState.isArabic ? 'حالة ضعف' : 'Vulnerable',
                                    style: const TextStyle(fontSize: 10, color: AppTheme.alertRose),
                                  ),
                                  backgroundColor: const Color(0xFFFFF1F2),
                                  side: BorderSide.none,
                                )
                              : null,
                        ),
                      );
                    },
                  ),

                  // Tab 2: Field Visits
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ElevatedButton.icon(
                          onPressed: () async {
                            final added = await showDialog<bool>(
                              context: context,
                              builder: (ctx) => FieldVisitDialog(
                                caseId: c.id,
                                caseworkerName: widget.currentUser.fullNameAr,
                                caseworkService: widget.caseworkService,
                                localeState: widget.localeState,
                              ),
                            );
                            if (added == true) setState(() {});
                          },
                          icon: const Icon(Icons.add_location_alt_outlined),
                          label: Text(AppTranslations.get('log_visit_title', lang)),
                        ),
                        const SizedBox(height: 12),
                        Expanded(
                          child: visits.isEmpty
                              ? Center(
                                  child: Text(
                                    widget.localeState.isArabic
                                        ? 'لا توجد زيارات مسجلة لهذه الحالة بعد'
                                        : 'No visits logged for this case',
                                    style: const TextStyle(color: AppTheme.textMuted),
                                  ),
                                )
                              : ListView.builder(
                                  itemCount: visits.length,
                                  itemBuilder: (context, idx) {
                                    final v = visits[idx];
                                    return Card(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      child: Padding(
                                        padding: const EdgeInsets.all(12),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Text(v.visitDate, style: const TextStyle(fontWeight: FontWeight.bold)),
                                                Text(v.gpsCoordinates,
                                                    style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                              ],
                                            ),
                                            const SizedBox(height: 6),
                                            Text(v.observations, style: const TextStyle(fontSize: 13)),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ],
                    ),
                  ),

                  // Tab 3: Assessments
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ElevatedButton.icon(
                          onPressed: () async {
                            final submitted = await Navigator.push<bool>(
                              context,
                              MaterialPageRoute(
                                builder: (ctx) => AssessmentFormScreen(
                                  caseId: c.id,
                                  initialProgramme: c.programmeCode,
                                  caseworkService: widget.caseworkService,
                                  localeState: widget.localeState,
                                ),
                              ),
                            );
                            if (submitted == true) setState(() {});
                          },
                          icon: const Icon(Icons.assignment_turned_in_outlined),
                          label: Text(AppTranslations.get('conduct_assessment', lang)),
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.localeState.isArabic ? 'حالة التقييمات:' : 'Assessment Status:',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                widget.localeState.isArabic
                                    ? 'تم تسجيل استمارة التقييم المعيشي والاحتياج الميداني برقم معتمد.'
                                    : 'Field vulnerability assessment is active and tracked.',
                                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Tab 4: Private Documents
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ElevatedButton.icon(
                          onPressed: () async {
                            final uploaded = await showDialog<bool>(
                              context: context,
                              builder: (ctx) => DocumentCaptureDialog(
                                caseId: c.id,
                                caseworkService: widget.caseworkService,
                                localeState: widget.localeState,
                              ),
                            );
                            if (uploaded == true) setState(() {});
                          },
                          icon: const Icon(Icons.upload_file),
                          label: Text(AppTranslations.get('capture_document_title', lang)),
                        ),
                        const SizedBox(height: 12),
                        Expanded(
                          child: documents.isEmpty
                              ? Center(
                                  child: Text(
                                    widget.localeState.isArabic ? 'لا توجد وثائق مرفوعة' : 'No documents attached',
                                    style: const TextStyle(color: AppTheme.textMuted),
                                  ),
                                )
                              : ListView.builder(
                                  itemCount: documents.length,
                                  itemBuilder: (context, idx) {
                                    final doc = documents[idx];
                                    return Card(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      child: ListTile(
                                        leading: const Icon(Icons.picture_as_pdf, color: AppTheme.primaryGreen),
                                        title: Text(doc.fileName, style: const TextStyle(fontWeight: FontWeight.bold)),
                                        subtitle: Text(
                                          '${doc.storagePath}\n${(doc.fileSizeBytes / 1024).toStringAsFixed(1)} KB',
                                          style: const TextStyle(fontSize: 11),
                                        ),
                                        trailing: doc.isLegalHold
                                            ? const Icon(Icons.lock, color: AppTheme.alertAmber, size: 20)
                                            : null,
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
