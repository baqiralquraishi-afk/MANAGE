class Appointment {
  final String id;
  final String caseId;
  final String beneficiaryName;
  final DateTime scheduledAt;
  final String locationType; // 'office', 'home_visit', 'partner_center', 'phone_call'
  String status; // 'scheduled', 'completed', 'cancelled', 'no_show'
  final String notes;

  Appointment({
    required this.id,
    required this.caseId,
    required this.beneficiaryName,
    required this.scheduledAt,
    required this.locationType,
    required this.status,
    required this.notes,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'caseId': caseId,
        'beneficiaryName': beneficiaryName,
        'scheduledAt': scheduledAt.toIso8601String(),
        'locationType': locationType,
        'status': status,
        'notes': notes,
      };
}
