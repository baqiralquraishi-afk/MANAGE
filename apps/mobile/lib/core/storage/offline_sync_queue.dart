/// Humanity Mobile - Offline Mutation Queue (ADR-003 Compliant)
///
/// Handles offline queuing of field casework records.
/// Strictly blocks financial actions in offline mode per ADR-003.
library;

class OfflineMutation {
  final String id;
  final String mutationType;
  final Map<String, dynamic> payload;
  final DateTime queuedAt;
  bool isSynced;

  OfflineMutation({
    required this.id,
    required this.mutationType,
    required this.payload,
    required this.queuedAt,
    this.isSynced = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'mutationType': mutationType,
        'payload': payload,
        'queuedAt': queuedAt.toIso8601String(),
        'isSynced': isSynced,
      };

  factory OfflineMutation.fromJson(Map<String, dynamic> json) => OfflineMutation(
        id: json['id'] as String,
        mutationType: json['mutationType'] as String,
        payload: Map<String, dynamic>.from(json['payload'] as Map),
        queuedAt: DateTime.parse(json['queuedAt'] as String),
        isSynced: json['isSynced'] as bool? ?? false,
      );
}

class OfflineSyncQueue {
  final List<OfflineMutation> _queue = [];

  // ADR-003 Safety boundary: Financial actions strictly forbidden offline
  static const Set<String> forbiddenOfflineMutations = {
    'FINANCIAL_DISBURSEMENT',
    'APPROVE_FINANCIAL_ENTITLEMENT',
    'POST_LEDGER_ENTRY',
    'REVERSE_LEDGER_ENTRY',
  };

  void enqueue({
    required String mutationType,
    required Map<String, dynamic> payload,
  }) {
    if (forbiddenOfflineMutations.contains(mutationType.toUpperCase())) {
      throw Exception(
        'ERR_OFFLINE_FINANCIAL_ACTION_FORBIDDEN: Dual-authorized financial operations '
        'cannot be queued offline under ADR-003.',
      );
    }

    final mutation = OfflineMutation(
      id: 'mut-${DateTime.now().millisecondsSinceEpoch}-${_queue.length + 1}',
      mutationType: mutationType,
      payload: payload,
      queuedAt: DateTime.now(),
    );
    _queue.add(mutation);
  }

  List<OfflineMutation> get pendingMutations =>
      _queue.where((m) => !m.isSynced).toList();

  int get pendingCount => pendingMutations.length;

  Future<int> syncAll() async {
    final pending = pendingMutations;
    for (final mut in pending) {
      // Mark as synced after server roundtrip simulation
      mut.isSynced = true;
    }
    return pending.length;
  }

  void clear() {
    _queue.clear();
  }
}
