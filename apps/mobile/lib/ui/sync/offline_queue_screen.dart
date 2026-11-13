import 'package:flutter/material.dart';
import '../../core/storage/encrypted_offline_db.dart';
import '../../core/storage/offline_sync_manager.dart';

/// Screen displaying bounded offline queue status, draft mutations, and conflict warnings
class OfflineQueueScreen extends StatefulWidget {
  final EncryptedOfflineDb offlineDb;
  final OfflineSyncManager syncManager;

  const OfflineQueueScreen({
    super.key,
    required this.offlineDb,
    required this.syncManager,
  });

  @override
  State<OfflineQueueScreen> createState() => _OfflineQueueScreenState();
}

class _OfflineQueueScreenState extends State<OfflineQueueScreen> {
  bool _isProcessing = false;
  String? _syncMessage;

  Future<void> _handleSync() async {
    setState(() {
      _isProcessing = true;
      _syncMessage = null;
    });

    try {
      final res = await widget.syncManager.syncPendingMutations();
      setState(() {
        _syncMessage = 'تمت المزامنة بنجاح: ${res.acceptedCount} مقبول، ${res.conflictCount} تعارض.';
      });
    } catch (e) {
      setState(() {
        _syncMessage = 'فشلت المزامنة: $e';
      });
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final mutations = widget.offlineDb.getAllMutations();
    final conflictCount = widget.offlineDb.conflictCount;

    return Scaffold(
      appBar: AppBar(
        title: const Text('طابور المزامنة دون اتصال (ADR-003)'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => setState(() {}),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Bounded Caching Limits Card
          Card(
            color: const Color(0xFFEFF6FF),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFFBFDBFE)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.shield, color: Color(0xFF1D4ED8), size: 24),
                      const SizedBox(width: 8),
                      Text(
                        'حدود التخزين الميداني الآمن',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF1E3A8A),
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text('• الحد الأقصى للحالات المعينة: 50 حالة (ممنوع التنزيل الشامل).'),
                  const Text('• الحد الأقصى للمسودات: 100 مسودة.'),
                  const Text('• أفق الاحتفاظ دون اتصال: 72 ساعة كحد أقصى.'),
                  const Text('• التشفير في وضع السكون: AES-256 مشفر بمفتاح المنصة.'),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFFECACA)),
                    ),
                    child: const Text(
                      'تنبيه: الموافقات النهائية والصرف المالي محظورة تماماً دون اتصال.',
                      style: TextStyle(color: Color(0xFFB91C1C), fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Conflict Alert Banner if any
          if (conflictCount > 0)
            Card(
              color: const Color(0xFFFFFBEB),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Color(0xFFFDE68A)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706), size: 28),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'تم رصد تعارض في البيانات ($conflictCount)',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'تم تحديث السجلات المركزية أثناء عملك دون اتصال. لم يتم استبدال البيانات، ومطلوب تدقيق المشرف.',
                            style: TextStyle(fontSize: 12, color: Color(0xFF78350F)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

          if (_syncMessage != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(_syncMessage!, style: const TextStyle(fontSize: 13)),
            ),
          ],

          const SizedBox(height: 16),

          // Action Button
          ElevatedButton.icon(
            key: const Key('btn-sync-offline-queue'),
            icon: _isProcessing
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.sync),
            label: Text(_isProcessing ? 'جارٍ المزامنة...' : 'مزامنة المسودات المعلقة'),
            onPressed: _isProcessing ? null : _handleSync,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
            ),
          ),

          const SizedBox(height: 24),
          Text(
            'سجل المسودات والعمليات (${mutations.length})',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),

          if (mutations.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(
                child: Text('لا توجد مسودات معلقة في الذاكرة المشفرة.'),
              ),
            )
          else
            ...mutations.map((m) => _buildMutationTile(m)),
        ],
      ),
    );
  }

  Widget _buildMutationTile(OfflineMutationRecord mutation) {
    Color badgeColor;
    Color textColor;
    String badgeText;

    switch (mutation.state) {
      case SyncMutationState.queued:
        badgeColor = const Color(0xFFE5E7EB);
        textColor = const Color(0xFF374151);
        badgeText = 'قيد الانتظار (Queued)';
        break;
      case SyncMutationState.sent:
        badgeColor = const Color(0xFFDBEAFE);
        textColor = const Color(0xFF1E40AF);
        badgeText = 'قيد الإرسال (Sent)';
        break;
      case SyncMutationState.accepted:
        badgeColor = const Color(0xFFDCFCE7);
        textColor = const Color(0xFF166534);
        badgeText = 'مقبول (Accepted)';
        break;
      case SyncMutationState.conflict:
        badgeColor = const Color(0xFFFEF3C7);
        textColor = const Color(0xFF92400E);
        badgeText = 'تعارض (Conflict)';
        break;
      case SyncMutationState.rejected:
        badgeColor = const Color(0xFFFEE2E2);
        textColor = const Color(0xFF991B1B);
        badgeText = 'مرفوض (Rejected)';
        break;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Row(
          children: [
            Text(
              mutation.mutationType,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: badgeColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                badgeText,
                style: TextStyle(color: textColor, fontSize: 11, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              'الجدول: ${mutation.entityTable} | المعرف: ${mutation.idempotencyKey.substring(0, 8)}...',
              style: const TextStyle(fontSize: 12),
            ),
            if (mutation.errorMessage != null) ...[
              const SizedBox(height: 2),
              Text(
                'الخطأ: ${mutation.errorMessage}',
                style: const TextStyle(fontSize: 12, color: Colors.red),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
