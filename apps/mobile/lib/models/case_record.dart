class CaseRecord {
  final String id;
  final String caseReference;
  final String beneficiaryId;
  final String beneficiaryName;
  final String programmeCode;
  final String governorateId;
  String status;
  final String assignedCaseworkerId;
  final int householdSize;
  final DateTime createdAt;

  CaseRecord({
    required this.id,
    required this.caseReference,
    required this.beneficiaryId,
    required this.beneficiaryName,
    required this.programmeCode,
    required this.governorateId,
    required this.status,
    required this.assignedCaseworkerId,
    required this.householdSize,
    required this.createdAt,
  });

  bool get canConductAssessment =>
      status == 'submitted' || status == 'under_assessment';

  bool get canClose => status != 'closed';
}
