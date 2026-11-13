import 'package:flutter/material.dart';
import '../../core/localization/app_translations.dart';
import '../../core/localization/locale_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../models/auth_user.dart';
import '../../services/auth_service.dart';
import '../../services/casework_service.dart';
import '../appointments/appointments_screen.dart';
import '../beneficiaries/beneficiary_register_screen.dart';
import '../beneficiaries/beneficiary_search_screen.dart';
import '../cases/case_detail_screen.dart';
import '../sync/offline_queue_screen.dart';
import '../../core/storage/encrypted_offline_db.dart';
import '../../core/storage/offline_sync_manager.dart';

class FieldHomeScreen extends StatefulWidget {
  final AuthService authService;
  final CaseworkService caseworkService;
  final LocaleState localeState;
  final VoidCallback onToggleLocale;
  final EncryptedOfflineDb? offlineDb;
  final OfflineSyncManager? syncManager;

  const FieldHomeScreen({
    super.key,
    required this.authService,
    required this.caseworkService,
    required this.localeState,
    required this.onToggleLocale,
    this.offlineDb,
    this.syncManager,
  });

  @override
  State<FieldHomeScreen> createState() => _FieldHomeScreenState();
}

class _FieldHomeScreenState extends State<FieldHomeScreen> {
  bool _isSyncing = false;
  String? _syncMessage;

  Future<void> _handleSync() async {
    setState(() {
      _isSyncing = true;
      _syncMessage = null;
    });

    try {
      final count = await widget.caseworkService.syncPendingMutations();
      setState(() {
        _syncMessage = widget.localeState.isArabic
            ? 'تمت مزامنة $count عملية بنجاح.'
            : '$count records synced successfully.';
      });
      Future.delayed(const Duration(seconds: 4), () {
        if (mounted) setState(() => _syncMessage = null);
      });
    } finally {
      if (mounted) setState(() => _isSyncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = widget.localeState.language;
    final user = widget.authService.currentUser ?? AuthUser.demoCaseworker;
    final isOnline = widget.caseworkService.isOnline;
    final pendingCount = widget.caseworkService.pendingSyncCount;
    final cases = widget.caseworkService.getCasesForUser(user);
    final isTablet = AppTheme.isTablet(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(AppTranslations.get('app_title', lang)),
        actions: [
          // Connectivity Status Toggle & Indicator
          IconButton(
            tooltip: isOnline ? 'Online (Click to toggle)' : 'Offline (Click to toggle)',
            icon: Icon(
              isOnline ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
              color: isOnline ? AppTheme.primaryGreen : AppTheme.alertAmber,
            ),
            onPressed: () {
              widget.caseworkService.toggleConnectivity();
              setState(() {});
            },
          ),

          // Locale switch
          TextButton(
            onPressed: widget.onToggleLocale,
            child: Text(widget.localeState.isArabic ? 'English' : 'عربي'),
          ),

          // Sign out
          IconButton(
            tooltip: AppTranslations.get('sign_out', lang),
            icon: const Icon(Icons.logout),
            onPressed: () => widget.authService.signOut(),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Connectivity & Offline Queue Bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isOnline ? const Color(0xFFF0FDF4) : const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isOnline ? const Color(0xFFBBF7D0) : const Color(0xFFFDE68A),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      isOnline ? Icons.wifi : Icons.wifi_off,
                      size: 18,
                      color: isOnline ? AppTheme.primaryGreen : AppTheme.alertAmber,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        isOnline
                            ? AppTranslations.get('status_online', lang)
                            : AppTranslations.get('status_offline', lang),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isOnline ? const Color(0xFF166534) : const Color(0xFF92400E),
                        ),
                      ),
                    ),
                    if (pendingCount > 0) ...[
                      Badge(
                        label: Text('$pendingCount'),
                        backgroundColor: AppTheme.alertAmber,
                        child: const Icon(Icons.outbox, size: 20, color: AppTheme.alertAmber),
                      ),
                      const SizedBox(width: 8),
                      TextButton(
                        onPressed: _isSyncing ? null : _handleSync,
                        child: _isSyncing
                            ? const SizedBox(
                                height: 14,
                                width: 14,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Text(
                                AppTranslations.get('sync_now', lang),
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                      ),
                    ],
                  ],
                ),
              ),

              if (_syncMessage != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _syncMessage!,
                    style: const TextStyle(fontSize: 11, color: AppTheme.primaryGreen),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
              const SizedBox(height: 16),

              // Role-Aware User Header Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 26,
                        backgroundColor: AppTheme.lightGreen,
                        child: Icon(
                          user.isSupervisor ? Icons.admin_panel_settings : Icons.badge,
                          color: AppTheme.primaryGreen,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.localeState.isArabic ? user.fullNameAr : user.fullNameEn,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${user.role.toUpperCase()} • ${user.governorates.join(", ")}',
                              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.localeState.isArabic
                                  ? 'نظام المزامنة المشفرة دون اتصال نشط'
                                  : 'Encrypted offline casework engine active',
                              style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Quick Actions Grid (Adaptive: 4 columns on tablet, 2 columns on phone)
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: isTablet ? 4 : 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: isTablet ? 1.6 : 1.3,
                children: [
                  _QuickActionButton(
                    icon: Icons.person_add_alt_1,
                    title: AppTranslations.get('register_beneficiary_title', lang),
                    onTap: () {
                      Navigator.push<void>(
                        context,
                        MaterialPageRoute<void>(
                          builder: (ctx) => BeneficiaryRegisterScreen(
                            caseworkService: widget.caseworkService,
                            localeState: widget.localeState,
                          ),
                        ),
                      );
                    },
                  ),
                  _QuickActionButton(
                    icon: Icons.search,
                    title: widget.localeState.isArabic ? 'بحث المستفيدين' : 'Search Beneficiaries',
                    onTap: () {
                      Navigator.push<void>(
                        context,
                        MaterialPageRoute<void>(
                          builder: (ctx) => BeneficiarySearchScreen(
                            caseworkService: widget.caseworkService,
                            localeState: widget.localeState,
                          ),
                        ),
                      );
                    },
                  ),
                  _QuickActionButton(
                    icon: Icons.calendar_month,
                    title: AppTranslations.get('nav_appointments', lang),
                    onTap: () {
                      Navigator.push<void>(
                        context,
                        MaterialPageRoute<void>(
                          builder: (ctx) => AppointmentsScreen(
                            caseworkService: widget.caseworkService,
                            localeState: widget.localeState,
                          ),
                        ),
                      );
                    },
                  ),
                  _QuickActionButton(
                    icon: Icons.sync,
                    title: AppTranslations.get('sync_now', lang),
                    onTap: () {
                      if (widget.offlineDb != null && widget.syncManager != null) {
                        Navigator.push<void>(
                          context,
                          MaterialPageRoute<void>(
                            builder: (ctx) => OfflineQueueScreen(
                              offlineDb: widget.offlineDb!,
                              syncManager: widget.syncManager!,
                            ),
                          ),
                        );
                      } else {
                        _handleSync();
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Active Cases Section Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.localeState.isArabic ? 'الملفات الميدانية المكلف بها' : 'Assigned Field Cases',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  Chip(
                    label: Text(
                      '${cases.length} ${widget.localeState.isArabic ? 'حالة' : 'cases'}',
                      style: const TextStyle(fontSize: 11),
                    ),
                    backgroundColor: const Color(0xFFF1F5F9),
                    side: BorderSide.none,
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Cases List
              if (cases.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Text(
                      widget.localeState.isArabic
                          ? 'لا توجد حالات مسندة في نطاق المحافظة المخصصة لك'
                          : 'No cases assigned within your permitted scope',
                      style: const TextStyle(color: AppTheme.textMuted),
                    ),
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: cases.length,
                  itemBuilder: (context, idx) {
                    final c = cases[idx];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppTheme.lightGreen,
                          child: Text(
                            c.programmeCode,
                            style: const TextStyle(
                              color: AppTheme.primaryGreen,
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                            ),
                          ),
                        ),
                        title: Text(
                          c.beneficiaryName,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          '${c.caseReference} • ${c.governorateId} • ${c.status}',
                          style: const TextStyle(fontSize: 12),
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          Navigator.push<void>(
                            context,
                            MaterialPageRoute<void>(
                              builder: (ctx) => CaseDetailScreen(
                                caseRecord: c,
                                currentUser: user,
                                caseworkService: widget.caseworkService,
                                localeState: widget.localeState,
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: AppTheme.primaryGreen, size: 28),
              const SizedBox(height: 8),
              Text(
                title,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
