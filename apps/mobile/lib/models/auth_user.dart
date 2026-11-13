class AuthUser {
  final String id;
  final String email;
  final String fullNameAr;
  final String fullNameEn;
  final String role; // 'caseworker', 'supervisor', 'intake'
  final List<String> governorates;
  final List<String> programmes;
  final bool isActive;

  const AuthUser({
    required this.id,
    required this.email,
    required this.fullNameAr,
    required this.fullNameEn,
    required this.role,
    this.governorates = const [],
    this.programmes = const [],
    this.isActive = true,
  });

  bool get isCaseworker => role == 'caseworker';
  bool get isSupervisor => role == 'supervisor';
  bool get isIntake => role == 'intake';

  // Demo accounts
  static const AuthUser demoCaseworker = AuthUser(
    id: '00000000-0000-0000-0000-000000000001',
    email: 'caseworker.ninewa@humanity.iq',
    fullNameAr: 'يوسف محمود عمر (باحث نينوى)',
    fullNameEn: 'Yusuf Mahmoud Omar (Caseworker Ninewa)',
    role: 'caseworker',
    governorates: ['IQ-NI'],
    programmes: ['FIN', 'FOD', 'MED', 'HOU'],
    isActive: true,
  );

  static const AuthUser demoSupervisor = AuthUser(
    id: '00000000-0000-0000-0000-000000000002',
    email: 'supervisor.baghdad@humanity.iq',
    fullNameAr: 'سارة كريم كاظم (مشرفة بغداد)',
    fullNameEn: 'Sara Karim Kadhim (Supervisor Baghdad)',
    role: 'supervisor',
    governorates: ['IQ-BG', 'IQ-NI'],
    programmes: ['FIN', 'FOD', 'MED', 'HOU', 'EDU', 'EMG', 'EMP', 'SOC'],
    isActive: true,
  );
}
