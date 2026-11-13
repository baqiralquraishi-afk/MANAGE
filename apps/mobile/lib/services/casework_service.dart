import 'package:flutter/foundation.dart';
import '../core/storage/offline_sync_queue.dart';
import '../models/auth_user.dart';
import '../models/beneficiary.dart';
import '../models/case_record.dart';
import '../models/assessment.dart';
import '../models/field_visit.dart';
import '../models/appointment.dart';
import '../models/document_item.dart';

class CaseworkService extends ChangeNotifier {
  final OfflineSyncQueue offlineQueue;
  bool _isOnline = true;

  CaseworkService({required this.offlineQueue});

  bool get isOnline => _isOnline;
  int get pendingSyncCount => offlineQueue.pendingCount;

  void toggleConnectivity() {
    _isOnline = !_isOnline;
    notifyListeners();
  }

  // Seeded mock data matching backend database fixtures
  final List<Beneficiary> _beneficiaries = [
    Beneficiary(
      id: '10000000-0000-0000-0000-000000000001',
      nationalId: '198512345678',
      fullNameAr: 'أحمد خليل إسماعيل',
      fullNameEn: 'Ahmed Khalil Ismail',
      phone: '+9647701234567',
      governorateId: 'IQ-NI',
      householdId: 'hh-1001',
      hasInformedConsent: true,
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
    ),
    Beneficiary(
      id: '10000000-0000-0000-0000-000000000002',
      nationalId: '199087654321',
      fullNameAr: 'زينب جواد كاظم',
      fullNameEn: 'Zainab Jawad Kadhim',
      phone: '+9647809876543',
      governorateId: 'IQ-BG',
      householdId: 'hh-1002',
      hasInformedConsent: true,
      createdAt: DateTime.now().subtract(const Duration(days: 20)),
    ),
  ];

  final List<CaseRecord> _cases = [
    CaseRecord(
      id: '50000000-0000-0000-0000-000000000001',
      caseReference: 'CAS-2026-FIN-0001',
      beneficiaryId: '10000000-0000-0000-0000-000000000001',
      beneficiaryName: 'أحمد خليل إسماعيل',
      programmeCode: 'FIN',
      governorateId: 'IQ-NI',
      status: 'submitted',
      assignedCaseworkerId: '00000000-0000-0000-0000-000000000001',
      householdSize: 5,
      createdAt: DateTime.now().subtract(const Duration(days: 10)),
    ),
    CaseRecord(
      id: '50000000-0000-0000-0000-000000000002',
      caseReference: 'CAS-2026-MED-0002',
      beneficiaryId: '10000000-0000-0000-0000-000000000002',
      beneficiaryName: 'زينب جواد كاظم',
      programmeCode: 'MED',
      governorateId: 'IQ-BG',
      status: 'under_assessment',
      assignedCaseworkerId: '00000000-0000-0000-0000-000000000002',
      householdSize: 3,
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
    ),
  ];

  final List<HouseholdMember> _members = const [
    HouseholdMember(
      id: 'm1',
      fullNameAr: 'أحمد خليل إسماعيل',
      relationship: 'رب الأسرة',
      age: 41,
      hasVulnerability: false,
    ),
    HouseholdMember(
      id: 'm2',
      fullNameAr: 'فاطمة حسن علي',
      relationship: 'زوجة',
      age: 38,
      hasVulnerability: true,
    ),
    HouseholdMember(
      id: 'm3',
      fullNameAr: 'ياسر أحمد خليل',
      relationship: 'ابن',
      age: 14,
      hasVulnerability: false,
    ),
  ];

  final List<Assessment> _assessments = [];
  final List<FieldVisit> _visits = [];
  final List<Appointment> _appointments = [
    Appointment(
      id: 'apt-001',
      caseId: '50000000-0000-0000-0000-000000000001',
      beneficiaryName: 'أحمد خليل إسماعيل',
      scheduledAt: DateTime.now().add(const Duration(days: 2, hours: 10)),
      locationType: 'home_visit',
      status: 'scheduled',
      notes: 'زيارة ميدانية لمطابقة الأوراق الثبوتية والاطلاع على المأوى',
    ),
    Appointment(
      id: 'apt-002',
      caseId: '50000000-0000-0000-0000-000000000002',
      beneficiaryName: 'زينب جواد كاظم',
      scheduledAt: DateTime.now().add(const Duration(days: 4, hours: 14)),
      locationType: 'office',
      status: 'scheduled',
      notes: 'جلسة تدقيق التقرير الطبي للجنة التخصصية',
    ),
  ];

  final List<DocumentItem> _documents = [
    DocumentItem(
      id: 'doc-001',
      caseId: '50000000-0000-0000-0000-000000000001',
      category: 'national_id',
      fileName: 'national_id_front.pdf',
      storagePath: 'cases/50000000-0000-0000-0000-000000000001/doc-a1b2c3d4.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 2048576,
      isLegalHold: false,
      uploadedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
  ];

  List<Beneficiary> searchBeneficiaries(String query) {
    if (query.trim().isEmpty) return _beneficiaries;
    final q = query.trim().toLowerCase();
    return _beneficiaries.where((b) {
      return b.nationalId.contains(q) ||
          b.fullNameAr.toLowerCase().contains(q) ||
          b.fullNameEn.toLowerCase().contains(q);
    }).toList();
  }

  Future<Beneficiary> registerBeneficiary({
    required String nationalId,
    required String fullNameAr,
    required String fullNameEn,
    required String phone,
    required String governorateId,
    required bool hasInformedConsent,
  }) async {
    // Strict mandatory consent verification
    if (!hasInformedConsent) {
      throw ArgumentError(
        'ERR_MISSING_INFORMED_CONSENT: Registration cannot proceed without mandatory informed consent.',
      );
    }

    final newBeneficiary = Beneficiary(
      id: 'ben-${DateTime.now().millisecondsSinceEpoch}',
      nationalId: nationalId.trim(),
      fullNameAr: fullNameAr.trim(),
      fullNameEn: fullNameEn.trim(),
      phone: phone.trim(),
      governorateId: governorateId,
      householdId: 'hh-${DateTime.now().millisecondsSinceEpoch}',
      hasInformedConsent: true,
      createdAt: DateTime.now(),
    );

    _beneficiaries.insert(0, newBeneficiary);

    if (!_isOnline) {
      offlineQueue.enqueue(
        mutationType: 'REGISTER_BENEFICIARY',
        payload: newBeneficiary.toJson(),
      );
    }

    notifyListeners();
    return newBeneficiary;
  }

  List<CaseRecord> getCasesForUser(AuthUser user) {
    if (user.governorates.isEmpty) return _cases;
    return _cases.where((c) => user.governorates.contains(c.governorateId)).toList();
  }

  CaseRecord? getCaseById(String caseId) {
    try {
      return _cases.firstWhere((c) => c.id == caseId);
    } catch (_) {
      return null;
    }
  }

  List<HouseholdMember> getHouseholdMembers(String caseId) => _members;
  List<FieldVisit> getFieldVisits(String caseId) =>
      _visits.where((v) => v.caseId == caseId).toList();
  List<DocumentItem> getDocuments(String caseId) =>
      _documents.where((d) => d.caseId == caseId).toList();
  List<Appointment> get appointments => _appointments;

  Future<Assessment> submitAssessment({
    required String caseId,
    required String programmeCode,
    required int vulnerabilityScore,
    required String caseworkerNotes,
    required String recommendation,
  }) async {
    if (vulnerabilityScore < 1 || vulnerabilityScore > 100) {
      throw ArgumentError('ERR_INVALID_SCORE: Vulnerability score must be between 1 and 100.');
    }
    if (caseworkerNotes.trim().length < 5) {
      throw ArgumentError('ERR_MIN_NOTES: Assessment justification must be at least 5 characters.');
    }

    final assessment = Assessment(
      id: 'asmt-${DateTime.now().millisecondsSinceEpoch}',
      caseId: caseId,
      programmeCode: programmeCode,
      vulnerabilityScore: vulnerabilityScore,
      caseworkerNotes: caseworkerNotes.trim(),
      recommendation: recommendation.trim(),
      assessedAt: DateTime.now(),
    );

    _assessments.add(assessment);

    // Advance case lifecycle to under_assessment
    final caseRec = getCaseById(caseId);
    if (caseRec != null && caseRec.status == 'submitted') {
      caseRec.status = 'under_assessment';
    }

    if (!_isOnline) {
      offlineQueue.enqueue(
        mutationType: 'SUBMIT_ASSESSMENT',
        payload: assessment.toJson(),
      );
    }

    notifyListeners();
    return assessment;
  }

  Future<FieldVisit> logFieldVisit({
    required String caseId,
    required String visitDate,
    required String gpsCoordinates,
    required String observations,
    required String caseworkerName,
  }) async {
    if (observations.trim().length < 5) {
      throw ArgumentError('ERR_MIN_OBSERVATIONS: Field observations must be at least 5 characters.');
    }

    final visit = FieldVisit(
      id: 'vis-${DateTime.now().millisecondsSinceEpoch}',
      caseId: caseId,
      visitDate: visitDate,
      gpsCoordinates: gpsCoordinates,
      observations: observations.trim(),
      caseworkerName: caseworkerName,
      createdAt: DateTime.now(),
    );

    _visits.insert(0, visit);

    if (!_isOnline) {
      offlineQueue.enqueue(
        mutationType: 'LOG_FIELD_VISIT',
        payload: visit.toJson(),
      );
    }

    notifyListeners();
    return visit;
  }

  Future<void> updateAppointmentStatus({
    required String appointmentId,
    required String newStatus,
  }) async {
    final appt = _appointments.firstWhere((a) => a.id == appointmentId);
    appt.status = newStatus;

    if (!_isOnline) {
      offlineQueue.enqueue(
        mutationType: 'UPDATE_APPOINTMENT_STATUS',
        payload: {'appointmentId': appointmentId, 'newStatus': newStatus},
      );
    }

    notifyListeners();
  }

  Future<DocumentItem> captureDocument({
    required String caseId,
    required String category,
    required String fileName,
    required String mimeType,
    required int fileSizeBytes,
  }) async {
    DocumentItem.validateMetadata(
      fileName: fileName,
      mimeType: mimeType,
      sizeBytes: fileSizeBytes,
    );

    final storagePath = DocumentItem.generateOpaqueStoragePath(
      caseId: caseId,
      mimeType: mimeType,
    );

    final doc = DocumentItem(
      id: 'doc-${DateTime.now().millisecondsSinceEpoch}',
      caseId: caseId,
      category: category,
      fileName: fileName.trim(),
      storagePath: storagePath,
      mimeType: mimeType,
      fileSizeBytes: fileSizeBytes,
      isLegalHold: false,
      uploadedAt: DateTime.now(),
    );

    _documents.insert(0, doc);

    if (!_isOnline) {
      offlineQueue.enqueue(
        mutationType: 'REGISTER_DOCUMENT_METADATA',
        payload: doc.toJson(),
      );
    }

    notifyListeners();
    return doc;
  }

  Future<int> syncPendingMutations() async {
    final synced = await offlineQueue.syncAll();
    notifyListeners();
    return synced;
  }
}
