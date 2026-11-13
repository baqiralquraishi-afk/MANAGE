/// Humanity Mobile - Comprehensive Localization Dictionary
/// Arabic (RTL Default) & English (LTR)
library;

enum AppLanguage { ar, en }

class AppTranslations {
  static const Map<String, Map<AppLanguage, String>> _strings = {
    // App branding
    'app_title': {
      AppLanguage.ar: 'تطبيق المسح الميداني — إنسانية',
      AppLanguage.en: 'Humanity Field Caseworker',
    },
    'app_subtitle': {
      AppLanguage.ar: 'نظام إدارة الحالات الإنسانية (العراق)',
      AppLanguage.en: 'Humanitarian Case Management (Iraq)',
    },
    'offline_banner': {
      AppLanguage.ar: 'المزامنة المشفرة دون اتصال بالإنترنت (ADR-003)',
      AppLanguage.en: 'Encrypted Offline Field Synchronization (ADR-003)',
    },

    // Auth
    'login_title': {
      AppLanguage.ar: 'تسجيل دخول الكادر الميداني',
      AppLanguage.en: 'Field Staff Sign In',
    },
    'login_subtitle': {
      AppLanguage.ar: 'يرجى إدخال بيانات الاعتماد المصرح بها للمتابعة الميدانية',
      AppLanguage.en: 'Enter your authorized credentials for casework operations',
    },
    'email_label': {
      AppLanguage.ar: 'البريد الإلكتروني المهني *',
      AppLanguage.en: 'Official Email *',
    },
    'password_label': {
      AppLanguage.ar: 'كلمة المرور *',
      AppLanguage.en: 'Password *',
    },
    'sign_in_button': {
      AppLanguage.ar: 'تسجيل الدخول الآمن',
      AppLanguage.en: 'Sign In Securely',
    },
    'sign_out': {
      AppLanguage.ar: 'تسجيل الخروج',
      AppLanguage.en: 'Sign Out',
    },
    'quick_login_caseworker': {
      AppLanguage.ar: 'دخول سريع: باحث نينوى (يوسف)',
      AppLanguage.en: 'Demo: Caseworker Ninewa (Yusuf)',
    },
    'quick_login_supervisor': {
      AppLanguage.ar: 'دخول سريع: مشرفة بغداد (سارة)',
      AppLanguage.en: 'Demo: Supervisor Baghdad (Sara)',
    },
    'session_expired_title': {
      AppLanguage.ar: 'انتهت صلاحية جلسة العمل',
      AppLanguage.en: 'Session Expired',
    },
    'session_expired_message': {
      AppLanguage.ar: 'انتهت فترة أمان الجلسة. يرجى إعادة تسجيل الدخول لمواصلة العمل دون فقدان البيانات المعلقة.',
      AppLanguage.en: 'Your security session has expired. Please re-authenticate to preserve pending queue items.',
    },
    're_authenticate': {
      AppLanguage.ar: 'إعادة تسجيل الدخول',
      AppLanguage.en: 'Re-Authenticate',
    },

    // Connectivity & Sync
    'status_online': {
      AppLanguage.ar: 'متصل بالخادم المركزي',
      AppLanguage.en: 'Online & Connected',
    },
    'status_offline': {
      AppLanguage.ar: 'وضع عدم الاتصال — الحفظ المحلي المشفر نشط',
      AppLanguage.en: 'Offline Mode — Secure Local Storage Active',
    },
    'sync_pending_count': {
      AppLanguage.ar: 'عمليات معلقة بالمزامنة:',
      AppLanguage.en: 'Pending Offline Queue:',
    },
    'sync_now': {
      AppLanguage.ar: 'مزامنة السجلات الآن',
      AppLanguage.en: 'Sync Now',
    },
    'sync_success': {
      AppLanguage.ar: 'تمت مزامنة العمليات بنجاح إلى الخادم.',
      AppLanguage.en: 'All offline records synchronized successfully.',
    },

    // Navigation & Tabs
    'nav_home': {
      AppLanguage.ar: 'الرئيسية',
      AppLanguage.en: 'Home',
    },
    'nav_beneficiaries': {
      AppLanguage.ar: 'المستفيدون',
      AppLanguage.en: 'Beneficiaries',
    },
    'nav_cases': {
      AppLanguage.ar: 'الحالات',
      AppLanguage.en: 'Cases',
    },
    'nav_appointments': {
      AppLanguage.ar: 'المواعيد',
      AppLanguage.en: 'Appointments',
    },

    // Beneficiary Registration & Search
    'search_beneficiary_hint': {
      AppLanguage.ar: 'بحث برقم البطاقة الوطنية الموحدة أو الاسم...',
      AppLanguage.en: 'Search by National ID or Name...',
    },
    'register_beneficiary_title': {
      AppLanguage.ar: 'تسجيل مستفيد ميداني جديد',
      AppLanguage.en: 'Register New Beneficiary',
    },
    'full_name_ar_label': {
      AppLanguage.ar: 'الاسم الكامل باللغة العربية (رباعي) *',
      AppLanguage.en: 'Full Legal Name in Arabic *',
    },
    'national_id_label': {
      AppLanguage.ar: 'رقم البطاقة الوطنية الموحدة (12 رقماً) *',
      AppLanguage.en: 'Unified National ID (12 digits) *',
    },
    'phone_label': {
      AppLanguage.ar: 'رقم الهاتف العراقي *',
      AppLanguage.en: 'Iraqi Phone Number *',
    },
    'governorate_label': {
      AppLanguage.ar: 'المحافظة *',
      AppLanguage.en: 'Governorate *',
    },
    'informed_consent_checkbox': {
      AppLanguage.ar: 'أقر بالحصول على الموافقة المستنيرة الصريحة من المستفيد لمعالجة البيانات الإنسانية (إلزامي) *',
      AppLanguage.en: 'I certify obtaining explicit informed consent from the beneficiary for humanitarian processing (Mandatory) *',
    },
    'consent_error': {
      AppLanguage.ar: 'خطأ: لا يمكن استكمال التسجيل بدون توثيق الموافقة المستنيرة.',
      AppLanguage.en: 'Error: Cannot proceed without verified informed consent.',
    },
    'save_beneficiary': {
      AppLanguage.ar: 'حفظ وتثبيت القيد',
      AppLanguage.en: 'Save & Register',
    },

    // Cases & Assessments
    'case_details_title': {
      AppLanguage.ar: 'تفاصيل ملف الحالة',
      AppLanguage.en: 'Case File Details',
    },
    'status_label': {
      AppLanguage.ar: 'حالة الملف:',
      AppLanguage.en: 'Case Status:',
    },
    'household_members': {
      AppLanguage.ar: 'أفراد الأسرة المسجلون',
      AppLanguage.en: 'Registered Household Members',
    },
    'conduct_assessment': {
      AppLanguage.ar: 'إجراء تقييم الاحتياج الميداني',
      AppLanguage.en: 'Conduct Sector Assessment',
    },
    'assessment_score_label': {
      AppLanguage.ar: 'درجة شدة الاحتياج (1 - 100) *',
      AppLanguage.en: 'Vulnerability Severity Score (1 - 100) *',
    },
    'assessment_notes_label': {
      AppLanguage.ar: 'مبررات التقييم وملاحظات الباحث *',
      AppLanguage.en: 'Caseworker Assessment Findings *',
    },
    'submit_assessment': {
      AppLanguage.ar: 'اعتماد وإرسال التقييم',
      AppLanguage.en: 'Submit Assessment',
    },

    // Field Visits
    'log_visit_title': {
      AppLanguage.ar: 'تسجيل زيارة ميدانية جديدة',
      AppLanguage.en: 'Log Field Visit',
    },
    'gps_coordinates_label': {
      AppLanguage.ar: 'إحداثيات الموقع الجغرافي (GPS) *',
      AppLanguage.en: 'GPS Coordinates *',
    },
    'visit_observations_label': {
      AppLanguage.ar: 'ملاحظات المعاينة الميدانية وظروف المأوى *',
      AppLanguage.en: 'Field Observations & Shelter Condition *',
    },
    'save_visit': {
      AppLanguage.ar: 'حفظ الزيارة الميدانية',
      AppLanguage.en: 'Save Field Visit',
    },

    // Appointments
    'appointments_title': {
      AppLanguage.ar: 'جدول المواعيد والمتابعة الميدانية',
      AppLanguage.en: 'Field Appointments Schedule',
    },
    'mark_completed': {
      AppLanguage.ar: 'تم الحضور والإنهاء',
      AppLanguage.en: 'Mark Completed',
    },
    'mark_cancelled': {
      AppLanguage.ar: 'إلغاء الموعد',
      AppLanguage.en: 'Cancel Appointment',
    },
    'mark_no_show': {
      AppLanguage.ar: 'لم يحضر المستفيد',
      AppLanguage.en: 'Mark No-Show',
    },

    // Document Capture
    'capture_document_title': {
      AppLanguage.ar: 'التقاط وتوثيق وثيقة ثبوتية خاصة',
      AppLanguage.en: 'Capture Private Document',
    },
    'doc_category_label': {
      AppLanguage.ar: 'نوع الوثيقة *',
      AppLanguage.en: 'Document Type *',
    },
    'doc_filename_label': {
      AppLanguage.ar: 'اسم الملف *',
      AppLanguage.en: 'File Name *',
    },
    'doc_mime_label': {
      AppLanguage.ar: 'نوع الوسائط (MIME) *',
      AppLanguage.en: 'MIME Type *',
    },
    'doc_size_label': {
      AppLanguage.ar: 'حجم الملف (حد أقصى 10MB) *',
      AppLanguage.en: 'File Size (Max 10MB) *',
    },
    'doc_security_notice': {
      AppLanguage.ar: 'تخزين خاص ومشفر: يتم تعمية المسارات (Opaque UUID) ولا يتم رفع أي ملفات للعامة.',
      AppLanguage.en: 'Private & Opaque Storage: Stored under opaque UUID paths. No public URLs.',
    },
    'save_document': {
      AppLanguage.ar: 'حفظ وتشفير الوثيقة',
      AppLanguage.en: 'Save & Secure Document',
    },

    // General
    'cancel': {
      AppLanguage.ar: 'إلغاء',
      AppLanguage.en: 'Cancel',
    },
    'close': {
      AppLanguage.ar: 'إغلاق',
      AppLanguage.en: 'Close',
    },
    'required_field': {
      AppLanguage.ar: 'هذا الحقل إلزامي',
      AppLanguage.en: 'This field is required',
    },

    // Humanitarian Terms (Approved Iraq Standard)
    'term_consent': {
      AppLanguage.ar: 'الموافقة المستنيرة الصريحة',
      AppLanguage.en: 'Explicit Informed Consent',
    },
    'term_safeguarding': {
      AppLanguage.ar: 'صون وحماية الفئات المستضعفة',
      AppLanguage.en: 'Safeguarding & Heightened Protection',
    },
    'term_duplicate_review': {
      AppLanguage.ar: 'تدقيق تشابه القيود والازدواجية',
      AppLanguage.en: 'Duplicate Registration Review',
    },
    'term_ledger_reversal': {
      AppLanguage.ar: 'قيد تسوية عكسي',
      AppLanguage.en: 'Compensating Ledger Reversal',
    },
    'term_legal_hold': {
      AppLanguage.ar: 'تجميد قانوني تحفظي',
      AppLanguage.en: 'Protective Legal Hold',
    },
    'term_do_no_harm': {
      AppLanguage.ar: 'عدم إلحاق الضرر',
      AppLanguage.en: 'Do No Harm Principle',
    },
    'term_data_minimization': {
      AppLanguage.ar: 'الحد الأدنى لجمع البيانات',
      AppLanguage.en: 'Data Minimization',
    },
  };

  static String get(String key, AppLanguage lang) {
    final entry = _strings[key];
    if (entry == null) return key;
    return entry[lang] ?? entry[AppLanguage.ar] ?? key;
  }
}
