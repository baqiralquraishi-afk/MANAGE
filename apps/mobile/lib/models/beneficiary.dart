class Beneficiary {
  final String id;
  final String nationalId;
  final String fullNameAr;
  final String fullNameEn;
  final String phone;
  final String governorateId;
  final String householdId;
  final bool hasInformedConsent;
  final DateTime createdAt;

  const Beneficiary({
    required this.id,
    required this.nationalId,
    required this.fullNameAr,
    required this.fullNameEn,
    required this.phone,
    required this.governorateId,
    required this.householdId,
    required this.hasInformedConsent,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'nationalId': nationalId,
        'fullNameAr': fullNameAr,
        'fullNameEn': fullNameEn,
        'phone': phone,
        'governorateId': governorateId,
        'householdId': householdId,
        'hasInformedConsent': hasInformedConsent,
        'createdAt': createdAt.toIso8601String(),
      };
}

class HouseholdMember {
  final String id;
  final String fullNameAr;
  final String relationship;
  final int age;
  final bool hasVulnerability;

  const HouseholdMember({
    required this.id,
    required this.fullNameAr,
    required this.relationship,
    required this.age,
    required this.hasVulnerability,
  });
}
