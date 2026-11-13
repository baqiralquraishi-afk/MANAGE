import 'package:flutter/material.dart';
import '../../core/localization/app_translations.dart';
import '../../core/localization/locale_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../models/appointment.dart';
import '../../services/casework_service.dart';

class AppointmentsScreen extends StatefulWidget {
  final CaseworkService caseworkService;
  final LocaleState localeState;

  const AppointmentsScreen({
    super.key,
    required this.caseworkService,
    required this.localeState,
  });

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  Future<void> _updateStatus(Appointment appt, String newStatus) async {
    await widget.caseworkService.updateAppointmentStatus(
      appointmentId: appt.id,
      newStatus: newStatus,
    );
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final lang = widget.localeState.language;
    final appointments = widget.caseworkService.appointments;

    return Scaffold(
      appBar: AppBar(
        title: Text(AppTranslations.get('appointments_title', lang)),
      ),
      body: SafeArea(
        child: appointments.isEmpty
            ? Center(
                child: Text(
                  widget.localeState.isArabic ? 'لا توجد مواعيد مجدولة حالياً' : 'No appointments scheduled',
                  style: const TextStyle(color: AppTheme.textMuted),
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: appointments.length,
                itemBuilder: (context, idx) {
                  final a = appointments[idx];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                a.beneficiaryName,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                              Chip(
                                label: Text(
                                  a.status.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: a.status == 'completed'
                                        ? AppTheme.primaryGreen
                                        : a.status == 'cancelled'
                                            ? AppTheme.alertRose
                                            : AppTheme.alertAmber,
                                  ),
                                ),
                                backgroundColor: a.status == 'completed'
                                    ? AppTheme.lightGreen
                                    : a.status == 'cancelled'
                                        ? const Color(0xFFFFF1F2)
                                        : const Color(0xFFFEF3C7),
                                side: BorderSide.none,
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${a.scheduledAt.toLocal().toString().substring(0, 16)} • ${a.locationType}',
                            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                          ),
                          const SizedBox(height: 4),
                          Text(a.notes, style: const TextStyle(fontSize: 12)),
                          const SizedBox(height: 12),
                          const Divider(),
                          Wrap(
                            spacing: 8,
                            children: [
                              if (a.status == 'scheduled') ...[
                                TextButton.icon(
                                  onPressed: () => _updateStatus(a, 'completed'),
                                  icon: const Icon(Icons.check_circle_outline, size: 16, color: AppTheme.primaryGreen),
                                  label: Text(
                                    AppTranslations.get('mark_completed', lang),
                                    style: const TextStyle(fontSize: 11, color: AppTheme.primaryGreen),
                                  ),
                                ),
                                TextButton.icon(
                                  onPressed: () => _updateStatus(a, 'cancelled'),
                                  icon: const Icon(Icons.cancel_outlined, size: 16, color: AppTheme.alertRose),
                                  label: Text(
                                    AppTranslations.get('mark_cancelled', lang),
                                    style: const TextStyle(fontSize: 11, color: AppTheme.alertRose),
                                  ),
                                ),
                                TextButton.icon(
                                  onPressed: () => _updateStatus(a, 'no_show'),
                                  icon: const Icon(Icons.person_off_outlined, size: 16, color: AppTheme.alertAmber),
                                  label: Text(
                                    AppTranslations.get('mark_no_show', lang),
                                    style: const TextStyle(fontSize: 11, color: AppTheme.alertAmber),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
