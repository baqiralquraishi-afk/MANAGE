import 'dart:math';

class DocumentItem {
  final String id;
  final String caseId;
  final String category; // 'national_id', 'residency_card', 'medical_report', 'household_registry', 'other'
  final String fileName;
  final String storagePath;
  final String mimeType;
  final int fileSizeBytes;
  final bool isLegalHold;
  final String? legalHoldReason;
  final DateTime uploadedAt;

  const DocumentItem({
    required this.id,
    required this.caseId,
    required this.category,
    required this.fileName,
    required this.storagePath,
    required this.mimeType,
    required this.fileSizeBytes,
    this.isLegalHold = false,
    this.legalHoldReason,
    required this.uploadedAt,
  });

  static const List<String> allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  static const int maxFileSizeBytes = 10 * 1024 * 1024; // 10MB

  static void validateMetadata({
    required String fileName,
    required String mimeType,
    required int sizeBytes,
  }) {
    if (fileName.trim().isEmpty) {
      throw ArgumentError('ERR_INVALID_FILE_NAME: File name is required.');
    }
    if (!allowedMimeTypes.contains(mimeType)) {
      throw ArgumentError(
        'ERR_INVALID_MIME_TYPE: MIME type $mimeType is disallowed. Only PDF and images are accepted.',
      );
    }
    if (sizeBytes <= 0 || sizeBytes > maxFileSizeBytes) {
      throw ArgumentError(
        'ERR_FILE_TOO_LARGE: Size $sizeBytes exceeds maximum permitted 10MB limit.',
      );
    }
  }

  static String generateOpaqueStoragePath({
    required String caseId,
    required String mimeType,
  }) {
    final ext = mimeType == 'application/pdf' ? 'pdf' : 'png';
    final randHex = Random().nextInt(0xFFFFFF).toRadixString(16).padLeft(6, '0');
    final opaqueDocId = 'doc-${DateTime.now().millisecondsSinceEpoch}-$randHex';
    return 'cases/$caseId/$opaqueDocId.$ext';
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'caseId': caseId,
        'category': category,
        'fileName': fileName,
        'storagePath': storagePath,
        'mimeType': mimeType,
        'fileSizeBytes': fileSizeBytes,
        'isLegalHold': isLegalHold,
        'legalHoldReason': legalHoldReason,
        'uploadedAt': uploadedAt.toIso8601String(),
      };
}
