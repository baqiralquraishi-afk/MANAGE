class Assessment {
  final String id;
  final String caseId;
  final String programmeCode;
  final int vulnerabilityScore;
  final String caseworkerNotes;
  final String recommendation;
  final DateTime assessedAt;

  const Assessment({
    required this.id,
    required this.caseId,
    required this.programmeCode,
    required this.vulnerabilityScore,
    required this.caseworkerNotes,
    required this.recommendation,
    required this.assessedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'caseId': caseId,
        'programmeCode': programmeCode,
        'vulnerabilityScore': vulnerabilityScore,
        'caseworkerNotes': caseworkerNotes,
        'recommendation': recommendation,
        'assessedAt': assessedAt.toIso8601String(),
      };
}
