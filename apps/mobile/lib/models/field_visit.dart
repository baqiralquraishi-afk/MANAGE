class FieldVisit {
  final String id;
  final String caseId;
  final String visitDate;
  final String gpsCoordinates;
  final String observations;
  final String caseworkerName;
  final DateTime createdAt;

  const FieldVisit({
    required this.id,
    required this.caseId,
    required this.visitDate,
    required this.gpsCoordinates,
    required this.observations,
    required this.caseworkerName,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'caseId': caseId,
        'visitDate': visitDate,
        'gpsCoordinates': gpsCoordinates,
        'observations': observations,
        'caseworkerName': caseworkerName,
        'createdAt': createdAt.toIso8601String(),
      };
}
