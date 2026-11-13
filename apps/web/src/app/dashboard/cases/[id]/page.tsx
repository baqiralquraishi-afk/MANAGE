'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FolderGit2,
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  ArrowRight,
  ArrowLeft,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  Activity,
  CalendarDays,
  Lock,
  X,
  ChevronRight,
  XCircle,
  Archive,
  Compass,
  PackageCheck,
  Upload,
  Download,
  Key,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';
import { useAuth } from '@/lib/auth-context';
import { VALID_CASE_TRANSITIONS, CaseStatus } from '@humanity/contracts';

interface StatusHistoryItem {
  id: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  justification: string;
  timestamp: string;
}

interface VisitItem {
  id: string;
  visitDate: string;
  caseworkerName: string;
  notes: string;
  gpsCoordinates?: string;
  createdAt: string;
}

interface AppointmentItem {
  id: string;
  scheduledTime: string;
  locationType: string;
  officerName: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
}

export default function CaseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isRtl, t } = useLocale();
  const { user, hasAnyRole } = useAuth();

  const caseId = (params?.id as string) || '50000000-0000-0000-0000-000000000001';

  // Case detail synthetic state
  const [caseStatus, setCaseStatus] = useState<CaseStatus>('under_assessment');
  const [closureReason, setClosureReason] = useState('');
  const [closureJustification, setClosureJustification] = useState('');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  // Status transition state
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<CaseStatus>('pending_approval');
  const [transitionJustification, setTransitionJustification] = useState('');
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'lifecycle' | 'activities' | 'appointments' | 'assistance' | 'documents'
  >('overview');

  // Private Documents State (Phase 11)
  const [documents, setDocuments] = useState<
    {
      id: string;
      category: string;
      fileName: string;
      storagePath: string;
      mimeType: string;
      fileSizeBytes: number;
      uploadedBy: string;
      uploadedAt: string;
      virusScanStatus: 'clean' | 'flagged';
      isLegalHold: boolean;
      legalHoldReason?: string;
    }[]
  >([
    {
      id: 'doc-001',
      category: 'national_id',
      fileName: 'civil_id_scan.pdf',
      storagePath: 'cases/50000000-0000-0000-0000-000000000001/doc-f47ac10b.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 2048576,
      uploadedBy: 'يوسف محمود عمر (باحث نينوى)',
      uploadedAt: '2026-11-12 10:30',
      virusScanStatus: 'clean',
      isLegalHold: false,
    },
    {
      id: 'doc-002',
      category: 'medical_report',
      fileName: 'specialist_medical_diagnosis.pdf',
      storagePath: 'cases/50000000-0000-0000-0000-000000000001/doc-a1b2c3d4.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 3145728,
      uploadedBy: 'يوسف محمود عمر (باحث نينوى)',
      uploadedAt: '2026-11-12 11:15',
      virusScanStatus: 'clean',
      isLegalHold: true,
      legalHoldReason: 'طلب استيضاح قضائي حول الوصاية القانونية',
    },
  ]);

  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [newDocCategory, setNewDocCategory] = useState('national_id');
  const [newDocFileName, setNewDocFileName] = useState('');
  const [newDocMimeType, setNewDocMimeType] = useState('application/pdf');
  const [newDocSize, setNewDocSize] = useState('2048576');
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [downloadModalDoc, setDownloadModalDoc] = useState<any | null>(null);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);

  // Entitlements and Deliveries (Phase 10)
  const [entitlements, setEntitlements] = useState<
    {
      id: string;
      assistanceType: string;
      currency: string;
      authorizedAmount: number;
      disbursedAmount: number;
      status: 'authorized' | 'in_delivery' | 'completed' | 'cancelled';
    }[]
  >([
    {
      id: 'ent-5001',
      assistanceType: 'emergency_mpca_cash',
      currency: 'IQD',
      authorizedAmount: 450000,
      disbursedAmount: 0,
      status: 'authorized',
    },
  ]);

  const [deliveries, setDeliveries] = useState<
    {
      id: string;
      deliveryReference: string;
      recipientNationalId: string;
      quantityOrAmount: number;
      deliveredBy: string;
      verifiedByRecipient: boolean;
      verificationMethod: string;
      deliveryNotes: string;
      deliveredAt: string;
    }[]
  >([]);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryRecipientId, setDeliveryRecipientId] = useState('198512345678');
  const [deliveryAmount, setDeliveryAmount] = useState('450000');
  const [deliveryMethod, setDeliveryMethod] = useState('national_id_check');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliverySuccess, setDeliverySuccess] = useState<string | null>(null);

  // Status History
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([
    {
      id: '1',
      fromStatus: 'draft',
      toStatus: 'submitted',
      changedBy: 'يوسف محمود عمر (باحث نينوى)',
      justification: 'استيفاء بيانات التسجيل والموافقة المستنيرة للأسر النازحة',
      timestamp: '2026-11-12 09:30',
    },
    {
      id: '2',
      fromStatus: 'submitted',
      toStatus: 'under_assessment',
      changedBy: 'سارة كريم كاظم (مشرفة)',
      justification: 'تكليف الباحث بإجراء الزيارة الميدانية وتطبيق استمارة التقييم المعيشي',
      timestamp: '2026-11-12 11:15',
    },
  ]);

  // Visits
  const [visits, setVisits] = useState<VisitItem[]>([
    {
      id: 'v1',
      visitDate: '2026-11-12',
      caseworkerName: 'يوسف محمود عمر',
      notes:
        'تمت زيارة المأوى في حي الزهور؛ الأسرة تعيش في منزل مستأجر بدون تدفئة مركزية مع وجود حالتين مرضيتين.',
      gpsCoordinates: '36.335000, 43.118889',
      createdAt: '2026-11-12 14:00',
    },
  ]);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [newVisitNotes, setNewVisitNotes] = useState('');
  const [newVisitDate, setNewVisitDate] = useState('2026-11-13');

  // Appointments
  const [appointments, setAppointments] = useState<AppointmentItem[]>([
    {
      id: 'a1',
      scheduledTime: '2026-11-15 10:00',
      locationType: 'مركز التنسيق الإنساني - الموصل',
      officerName: 'سارة كريم كاظم',
      status: 'scheduled',
      notes: 'جلسة تدقيق وتثبيت الوثائق المفقودة للزوجين',
    },
  ]);

  const allowedTransitions = VALID_CASE_TRANSITIONS[caseStatus] || [];

  const handleAdvanceStatus = () => {
    if (transitionJustification.trim().length < 5) {
      setTransitionError(
        isRtl ? 'يجب إدخال مبرر لا يقل عن 5 أحرف.' : 'Justification must be at least 5 characters.',
      );
      return;
    }

    const newHistoryItem: StatusHistoryItem = {
      id: String(statusHistory.length + 1),
      fromStatus: caseStatus,
      toStatus: targetStatus,
      changedBy: user ? (isRtl ? user.fullNameAr : user.fullNameEn) : 'المستخدم',
      justification: transitionJustification,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setStatusHistory(prev => [newHistoryItem, ...prev]);
    setCaseStatus(targetStatus);
    setIsTransitionModalOpen(false);
    setTransitionJustification('');
    setTransitionError(null);
  };

  const handleCloseCase = () => {
    if (closureReason.trim().length < 10) {
      setCloseError(
        isRtl
          ? 'سبب الإغلاق إلزامي ويجب ألا يقل عن 10 أحرف لسلامة السجلات الرقابية.'
          : 'Closure reason is mandatory and must be at least 10 characters long.',
      );
      return;
    }

    const newHistoryItem: StatusHistoryItem = {
      id: String(statusHistory.length + 1),
      fromStatus: caseStatus,
      toStatus: 'closed',
      changedBy: user ? (isRtl ? user.fullNameAr : user.fullNameEn) : 'المستخدم',
      justification: `إغلاق الحالة: ${closureReason}. ${closureJustification}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setStatusHistory(prev => [newHistoryItem, ...prev]);
    setCaseStatus('closed');
    setIsCloseModalOpen(false);
    setClosureReason('');
    setClosureJustification('');
    setCloseError(null);
  };

  const handleAddVisit = () => {
    if (newVisitNotes.trim().length < 5) return;

    const newVisit: VisitItem = {
      id: `v${visits.length + 1}`,
      visitDate: newVisitDate,
      caseworkerName: user ? (isRtl ? user.fullNameAr : user.fullNameEn) : 'الباحث الميداني',
      notes: newVisitNotes,
      gpsCoordinates: '36.335120, 43.119040',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setVisits(prev => [newVisit, ...prev]);
    setIsVisitModalOpen(false);
    setNewVisitNotes('');
  };

  const handleConfirmDelivery = () => {
    setDeliveryError(null);
    const ent = entitlements[0];
    if (!ent) return;

    if (ent.status === 'completed' || ent.disbursedAmount >= ent.authorizedAmount) {
      setDeliveryError(
        isRtl
          ? 'خطأ أمني: تم استيفاء كامل الاستحقاق المخصص للحالة مسبقاً. التكرار محظور (ERR_REPEATED_DELIVERY).'
          : 'Database security error: Entitlement has already been fulfilled in full (ERR_REPEATED_DELIVERY).',
      );
      return;
    }

    const amt = parseFloat(deliveryAmount);
    if (isNaN(amt) || amt <= 0) {
      setDeliveryError(isRtl ? 'يرجى إدخال مبلغ صحيح للتسليم.' : 'Invalid delivery amount.');
      return;
    }

    if (ent.disbursedAmount + amt > ent.authorizedAmount) {
      setDeliveryError(
        isRtl
          ? `المبلغ المطلوب (${amt.toLocaleString()} د.ع) يتجاوز الرصيد المتبقي (${(ent.authorizedAmount - ent.disbursedAmount).toLocaleString()} د.ع).`
          : 'Delivery amount exceeds remaining authorized entitlement ceiling.',
      );
      return;
    }

    if (!deliveryRecipientId.trim() || deliveryRecipientId.trim() !== '198512345678') {
      setDeliveryError(
        isRtl
          ? 'عدم تطابق الهوية: يجب التحقق من هوية المستفيد الأصلي المقيد في الملف (198512345678).'
          : 'National ID verification failure: Does not match registered beneficiary.',
      );
      return;
    }

    const newDisbursed = ent.disbursedAmount + amt;
    const newStatus = newDisbursed >= ent.authorizedAmount ? 'completed' : 'in_delivery';

    const newDelivery = {
      id: `deliv-${Date.now()}`,
      deliveryReference: `DELIV-2026-FIN-000${deliveries.length + 1}`,
      recipientNationalId: deliveryRecipientId,
      quantityOrAmount: amt,
      deliveredBy: user ? (isRtl ? user.fullNameAr : user.fullNameEn) : 'يوسف محمود عمر',
      verifiedByRecipient: true,
      verificationMethod: deliveryMethod,
      deliveryNotes:
        deliveryNotes || 'تم التسليم والتحقق من الهوية الوطنية للمستفيد واستلام التوقيع/البصمة.',
      deliveredAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setDeliveries(prev => [newDelivery, ...prev]);
    setEntitlements(prev => [
      {
        ...prev[0],
        disbursedAmount: newDisbursed,
        status: newStatus,
      },
    ]);
    if (caseStatus === 'approved') {
      setCaseStatus('active_delivery');
    }
    setDeliverySuccess(
      isRtl
        ? `تم تسجيل سند التسليم (${newDelivery.deliveryReference}) بنجاح. القيد محمي وغير قابل للتعديل.`
        : `Delivery confirmed (${newDelivery.deliveryReference}). Immutable record created.`,
    );
    setIsDeliveryModalOpen(false);
    setTimeout(() => setDeliverySuccess(null), 5000);
  };

  const handleUploadDocument = () => {
    setDocUploadError(null);
    if (!newDocFileName.trim()) {
      setDocUploadError(isRtl ? 'اسم الملف الأصلي إلزامي.' : 'Original file name is required.');
      return;
    }

    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(newDocMimeType)) {
      setDocUploadError(
        isRtl
          ? 'نوع الملف غير مسموح. يسمح فقط بملفات PDF والصور (JPEG, PNG, WebP).'
          : 'Invalid file type. Only PDF and images (JPEG, PNG, WebP) are allowed.',
      );
      return;
    }

    const size = parseInt(newDocSize, 10);
    if (isNaN(size) || size <= 0 || size > 10485760) {
      setDocUploadError(
        isRtl
          ? 'حجم الملف غير صالح أو يتجاوز الحد الأقصى المسموح (10 ميجابايت).'
          : 'File size exceeds maximum permitted limit of 10MB.',
      );
      return;
    }

    // Generate opaque UUID-based storage path (never expose beneficiary PII or raw paths)
    const opaqueId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const ext = newDocMimeType === 'application/pdf' ? 'pdf' : 'png';
    const opaquePath = `cases/${caseId}/${opaqueId}.${ext}`;

    const newDoc = {
      id: `doc-${Date.now()}`,
      category: newDocCategory,
      fileName: newDocFileName.trim(),
      storagePath: opaquePath,
      mimeType: newDocMimeType,
      fileSizeBytes: size,
      uploadedBy: user ? (isRtl ? user.fullNameAr : user.fullNameEn) : 'المستخدم',
      uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      virusScanStatus: 'clean' as const,
      isLegalHold: false,
    };

    setDocuments(prev => [newDoc, ...prev]);
    setIsUploadDocModalOpen(false);
    setNewDocFileName('');
  };

  const handleRequestDownloadToken = (doc: any) => {
    const token = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    setDownloadToken(token);
    setDownloadModalDoc(doc);
  };

  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={[
          'caseworker',
          'supervisor',
          'programme_manager',
          'auditor',
          'report_viewer',
          'security_admin',
        ]}
      >
        <div className="space-y-6">
          {/* Breadcrumbs & Back Link */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link
              href="/dashboard/cases"
              className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors"
            >
              <BackIcon className="w-3.5 h-3.5" />
              <span>{isRtl ? 'العودة لقائمة الحالات' : 'Back to Cases'}</span>
            </Link>
            <span>/</span>
            <span className="font-mono font-semibold text-slate-700">CASE-2026-00001</span>
          </div>

          {/* Case Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  CASE-2026-00001
                </span>
                <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800">
                  FIN المساعدات المالية
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    caseStatus === 'closed'
                      ? 'bg-slate-100 text-slate-700'
                      : caseStatus === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : caseStatus === 'pending_approval'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {t(`status.${caseStatus}`)}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded text-rose-700 bg-rose-50">
                  أولوية حرجة (Urgent)
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900">
                {isRtl ? 'ملف حالة: فاطمة جاسم محمد' : 'Case File: Fatima Jasim Mohammed'}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>بغداد · الكرخ</span>
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isRtl ? 'الباحث: يوسف محمود عمر' : 'Caseworker: Yousif Mahmoud'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isRtl ? 'تاريخ الفتح: 2026-11-12' : 'Opened: 2026-11-12'}</span>
                </span>
              </div>
            </div>

            {/* Actions: Advance Status & Close */}
            <div className="flex flex-wrap items-center gap-2">
              {caseStatus !== 'closed' && allowedTransitions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTargetStatus(allowedTransitions[0]);
                    setIsTransitionModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  <History className="w-4 h-4" />
                  <span>{isRtl ? 'تحديث المرحلة' : 'Transition State'}</span>
                </button>
              )}

              {caseStatus !== 'closed' && (
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-slate-700 hover:text-rose-700 text-xs font-semibold transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  <span>{isRtl ? 'إغلاق الملف' : 'Close Case'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-4 border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {isRtl ? 'بيانات الحالة والأسرة' : 'Overview & Household'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lifecycle')}
              className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'lifecycle'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{isRtl ? 'سجل المراحل والقرارات' : 'Status History'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activities')}
              className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'activities'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isRtl ? 'الزيارات الميدانية' : 'Field Visits'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'appointments'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{isRtl ? 'المواعيد والمتابعة' : 'Appointments'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assistance')}
              className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'assistance'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>{isRtl ? 'المساعدات والتسليم' : 'Assistance & Deliveries'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'documents'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isRtl ? 'الوثائق الثبوتية الخاصة' : 'Private Documents'}</span>
            </button>
          </div>

          {/* TAB 1: Overview & Household */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                  {isRtl ? 'بيانات المستفيد الرئيسي والأسرة' : 'Beneficiary & Household Profile'}
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">
                      {isRtl ? 'الاسم الثلاثي:' : 'Full Name:'}
                    </span>
                    <span className="font-semibold text-slate-800">فاطمة جاسم محمد</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">
                      {isRtl ? 'الهوية الوطنية:' : 'National ID:'}
                    </span>
                    <span className="font-mono text-slate-800">198512345678</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">{isRtl ? 'اسم الأم:' : "Mother's Name:"}</span>
                    <span className="text-slate-800">مريم علي</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">
                      {isRtl ? 'حالة النزوح:' : 'Displacement Status:'}
                    </span>
                    <span className="font-semibold text-emerald-700">نازحة (IDP)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">
                      {isRtl ? 'نوع المأوى:' : 'Shelter Type:'}
                    </span>
                    <span className="text-slate-800">منزل مستأجر (Rented House)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">
                      {isRtl ? 'عدد أفراد الأسرة:' : 'Household Size:'}
                    </span>
                    <span className="font-bold text-slate-800">5 أفراد</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                  {isRtl ? 'تقييم الاحتياج والمساعدة المقترحة' : 'Assessment & Proposed Assistance'}
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {isRtl ? 'منحة نقدية طارئة' : 'Emergency MPCA'}
                      </span>
                      <span className="font-mono font-bold text-emerald-700">250,000 د.ع</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {isRtl
                        ? 'مساعدة مالية لتغطية بدل الإيجار ونفقات العلاج المزمن للأم.'
                        : 'Subsidized rent and medical support.'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400">
                      {isRtl ? 'مؤشرات الهشاشة المسجلة:' : 'Vulnerability Flags:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold">
                        أسرة تعيلها امرأة (Female-Headed)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-semibold">
                        أمراض مزمنة (Chronic Illness)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Confirmation Modal (Phase 10) */}
          {isDeliveryModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delivery-modal-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
            >
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <PackageCheck className="w-5 h-5" />
                    <h3 id="delivery-modal-title" className="text-base font-bold text-slate-900">
                      {isRtl ? 'تسجيل سند تسليم مساعدة إنسانية' : 'Confirm Assistance Delivery'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeliveryModalOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {deliveryError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    {deliveryError}
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                  <p className="font-bold">
                    {isRtl ? 'الضوابط الرقابية للتسليم الميداني' : 'Delivery Security Controls'}
                  </p>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    {isRtl
                      ? 'يجب التحقق المباشر من الرقم الوطني للمستفيد ومطابقته. يمنع النظام تقنياً تكرار التسليم عند استنفاد المخصص (ERR_REPEATED_DELIVERY).'
                      : 'Requires verification against registered civil ID. Repeated deliveries beyond authorized quotas are strictly rejected by the database.'}
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl
                        ? 'الرقم الوطني للمستلم (للتحقق) *'
                        : 'Recipient Civil / National ID *'}
                    </label>
                    <input
                      type="text"
                      value={deliveryRecipientId}
                      onChange={e => setDeliveryRecipientId(e.target.value)}
                      placeholder="198512345678"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {isRtl ? 'المبلغ المسلم (د.ع) *' : 'Delivery Amount (IQD) *'}
                      </label>
                      <input
                        type="number"
                        value={deliveryAmount}
                        onChange={e => setDeliveryAmount(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {isRtl ? 'طريقة التحقق من الهوية' : 'Verification Method'}
                      </label>
                      <select
                        value={deliveryMethod}
                        onChange={e => setDeliveryMethod(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-medium"
                      >
                        <option value="national_id_check">
                          {isRtl ? 'مطابقة البطاقة الوطنية' : 'National ID Card'}
                        </option>
                        <option value="biometric_confirmation">
                          {isRtl ? 'التحقق البصري / البايومتري' : 'Biometric / Visual'}
                        </option>
                        <option value="guardian_proxy">
                          {isRtl ? 'وكيل قانوني معتمد' : 'Authorized Legal Proxy'}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl
                        ? 'ملاحظات التسليم والتثبيت الميداني'
                        : 'Delivery Notes & Confirmation Details'}
                    </label>
                    <textarea
                      rows={2}
                      value={deliveryNotes}
                      onChange={e => setDeliveryNotes(e.target.value)}
                      placeholder={
                        isRtl
                          ? 'تم تسليم المنحة النقدية باليد للمستفيد بعد توقيع سند الاستلام وتدقيق البطاقة الوطنية...'
                          : 'Handed over cash grant against signed voucher and original ID verification...'
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsDeliveryModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelivery}
                    className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 shadow-xs"
                  >
                    {isRtl ? 'تأكيد التسليم وتوليد السند' : 'Confirm & Post Delivery'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Status History & State Transitions */}
          {activeTab === 'lifecycle' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isRtl
                      ? 'سجل تتبع الحالات (Case Status History)'
                      : 'Status Progression Timeline'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isRtl
                      ? 'سجل غير قابل للحذف أو التعديل يوثق كافة المراحل والمبررات'
                      : 'Immutable audit trail of all status transitions'}
                  </p>
                </div>
              </div>

              <div className="relative border-s-2 border-slate-200 ms-3 space-y-6 py-2">
                {statusHistory.map((item, idx) => (
                  <div key={item.id} className="relative ps-6">
                    <div className="absolute -start-1.5 top-1.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white ring-2 ring-emerald-100" />
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {t(`status.${item.fromStatus}`)} ➔ {t(`status.${item.toStatus}`)}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {item.timestamp}
                        </span>
                      </div>
                      <p className="text-slate-600">{item.justification}</p>
                      <p className="text-[10px] text-slate-400 pt-1">
                        {isRtl ? `بواسطة: ${item.changedBy}` : `Changed by: ${item.changedBy}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Field Activities & Visits */}
          {activeTab === 'activities' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isRtl ? 'سجل الزيارات والتقييم الميداني' : 'Caseworker Field Visits'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isRtl
                      ? 'توثيق الزيارات المنزلية وملاحظات المعاينة الميدانية'
                      : 'Documented field assessments and home visits'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVisitModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تسجيل زيارة ميدانية' : 'Log Field Visit'}</span>
                </button>
              </div>

              <div className="space-y-3">
                {visits.map(v => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold text-slate-800">{v.visitDate}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600">{v.caseworkerName}</span>
                      </div>
                      {v.gpsCoordinates && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          <Compass className="w-3 h-3 text-emerald-600" />
                          <span>{v.gpsCoordinates}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 leading-relaxed">{v.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Appointments */}
          {activeTab === 'appointments' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isRtl ? 'المواعيد المقررة للمستفيد' : 'Scheduled Appointments'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isRtl
                      ? 'مواعيد المراجعة في مراكز التنسيق وتسليم المساعدات'
                      : 'Upcoming case consultations and assistance disbursement meetings'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {appointments.map(a => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-mono font-bold text-slate-800">
                          {a.scheduledTime}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                          {isRtl ? 'موعد مؤكد' : a.status}
                        </span>
                      </div>
                      <p className="text-slate-600">{a.locationType}</p>
                      <p className="text-slate-500 text-[11px]">{a.notes}</p>
                    </div>
                    <span className="text-slate-400 text-[11px]">{a.officerName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Assistance & Deliveries (Phase 10) */}
          {activeTab === 'assistance' && (
            <div className="space-y-6">
              {/* Notification Banner */}
              {deliverySuccess && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{deliverySuccess}</span>
                </div>
              )}

              {/* Active Entitlements */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isRtl
                        ? 'المخصصات والاستحقاقات المعتمدة للحالة'
                        : 'Authorized Assistance Entitlements'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isRtl
                        ? 'مخصصات المساعدة المعتمدة من المشرف والمقيدة ضمن السقف المالي للبرنامج'
                        : 'Approved entitlements constrained by programme financial policy limits'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryError(null);
                      setIsDeliveryModalOpen(true);
                    }}
                    disabled={
                      entitlements[0]?.status === 'completed' ||
                      caseStatus === 'draft' ||
                      caseStatus === 'closed'
                    }
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs ${
                      entitlements[0]?.status === 'completed' ||
                      caseStatus === 'draft' ||
                      caseStatus === 'closed'
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>
                      {entitlements[0]?.status === 'completed'
                        ? isRtl
                          ? 'اكتمل التسليم بالكامل'
                          : 'Fully Delivered'
                        : isRtl
                          ? 'تسجيل تسليم مساعدة'
                          : 'Confirm Delivery'}
                    </span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 text-start">
                          {isRtl ? 'نوع المساعدة' : 'Assistance Type'}
                        </th>
                        <th className="py-2.5 px-3 text-start">
                          {isRtl ? 'المبلغ المعتمد' : 'Authorized Amount'}
                        </th>
                        <th className="py-2.5 px-3 text-start">
                          {isRtl ? 'المسلم فعلياً' : 'Disbursed / Delivered'}
                        </th>
                        <th className="py-2.5 px-3 text-start">
                          {isRtl ? 'المتبقي' : 'Remaining'}
                        </th>
                        <th className="py-2.5 px-3 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {entitlements.map(ent => {
                        const remaining = Math.max(0, ent.authorizedAmount - ent.disbursedAmount);
                        return (
                          <tr key={ent.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              {ent.assistanceType === 'emergency_mpca_cash'
                                ? isRtl
                                  ? 'منحة نقدية طارئة متعددة الأغراض (FIN)'
                                  : 'Multi-Purpose Cash Assistance (FIN)'
                                : ent.assistanceType}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              {ent.authorizedAmount.toLocaleString()} {ent.currency}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                              {ent.disbursedAmount.toLocaleString()} {ent.currency}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-700">
                              {remaining.toLocaleString()} {ent.currency}
                            </td>
                            <td className="py-3 px-3">
                              {ent.status === 'completed' ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                  {isRtl ? 'مكتمل بالكامل' : 'Completed'}
                                </span>
                              ) : ent.status === 'in_delivery' ? (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold">
                                  {isRtl ? 'قيد التسليم الجزئي' : 'In Delivery'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                  {isRtl ? 'معتمد للتسليم' : 'Authorized'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Traceable Delivery Records */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isRtl
                        ? 'سجل تسليم المساعدات الميدانية (غير قابل للتعديل)'
                        : 'Immutable Field Delivery Records'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isRtl
                        ? 'سجلات التسليم موثقة بالهوية الوطنية والوقت، وتمنع مشغلات قاعدة البيانات أي تعديل أو حذف لاحق.'
                        : 'Field delivery logs verified by civil ID and timestamp; protected from mutations by triggers.'}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                    {deliveries.length} {isRtl ? 'سندات تسليم' : 'deliveries'}
                  </span>
                </div>

                {deliveries.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <PackageCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      {isRtl
                        ? 'لا توجد سندات تسليم مسجلة بعد'
                        : 'No field deliveries confirmed yet'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isRtl
                        ? 'انقر على "تسجيل تسليم مساعدة" لتسجيل سند التسليم والتحقق من الرقم الوطني للمستفيد.'
                        : 'Click "Confirm Delivery" to verify recipient civil ID and post an immutable delivery voucher.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 text-start">
                            {isRtl ? 'رقم السند' : 'Delivery Ref'}
                          </th>
                          <th className="py-2.5 px-3 text-start">
                            {isRtl ? 'الرقم الوطني للمستلم' : 'Recipient ID'}
                          </th>
                          <th className="py-2.5 px-3 text-start">
                            {isRtl ? 'المبلغ / الكمية' : 'Amount'}
                          </th>
                          <th className="py-2.5 px-3 text-start">
                            {isRtl ? 'طريقة التحقق' : 'Verification'}
                          </th>
                          <th className="py-2.5 px-3 text-start">{isRtl ? 'المسلم' : 'Officer'}</th>
                          <th className="py-2.5 px-3 text-start">
                            {isRtl ? 'وقت التسليم' : 'Delivered At'}
                          </th>
                          <th className="py-2.5 px-3 text-start">
                            {isRtl ? 'الملاحظات' : 'Notes'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {deliveries.map(del => (
                          <tr key={del.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              {del.deliveryReference}
                            </td>
                            <td className="py-3 px-3 font-mono text-emerald-800 font-semibold">
                              {del.recipientNationalId}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              {del.quantityOrAmount.toLocaleString()} IQD
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700">
                                {del.verificationMethod}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-800">{del.deliveredBy}</td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                              {del.deliveredAt}
                            </td>
                            <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate">
                              {del.deliveryNotes}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Private Documents (Phase 11) */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isRtl
                        ? 'الوثائق الثبوتية والتقارير المرفقة (مشفرة وخاصة)'
                        : 'Private Document Attachments'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isRtl
                        ? 'مرفقات سرية ومحمية بمسارات غير مكشوفة وروابط مؤقتة؛ يمنع النظام تقنياً الوصول العام'
                        : 'Private attachments with opaque paths and audited TTL-bound download links; no public sharing'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDocUploadError(null);
                      setIsUploadDocModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isRtl ? 'رفع وثيقة جديدة' : 'Upload Document'}</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 text-start">{isRtl ? 'التصنيف' : 'Category'}</th>
                        <th className="py-2.5 px-3 text-start">
                          {isRtl ? 'اسم الملف الأصلي' : 'Original Filename'}
                        </th>
                        <th className="py-2.5 px-3 text-start">
                          {isRtl ? 'المسار الداخلي المشفر' : 'Opaque Storage Path'}
                        </th>
                        <th className="py-2.5 px-3 text-start">{isRtl ? 'الحجم' : 'Size'}</th>
                        <th className="py-2.5 px-3 text-start">
                          {isRtl ? 'فحص الأمان' : 'Security Scan'}
                        </th>
                        <th className="py-2.5 px-3 text-start">
                          {isRtl ? 'الوضع القانوني' : 'Legal Status'}
                        </th>
                        <th className="py-2.5 px-3 text-start">
                          {isRtl ? 'الرافع' : 'Uploaded By'}
                        </th>
                        <th className="py-2.5 px-3 text-center">{isRtl ? 'الإجراء' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {documents.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                              {doc.category === 'national_id'
                                ? isRtl
                                  ? 'البطاقة الوطنية الموحدة'
                                  : 'National ID'
                                : doc.category === 'medical_report'
                                  ? isRtl
                                    ? 'تقرير طبي تخصصي'
                                    : 'Medical Report'
                                  : doc.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">{doc.fileName}</td>
                          <td className="py-3 px-3 font-mono text-[10px] text-slate-500 max-w-[200px] truncate">
                            {doc.storagePath}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                            {(doc.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{isRtl ? 'خالٍ من البرمجيات الضارة' : 'Clean'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {doc.isLegalHold ? (
                              <span
                                title={doc.legalHoldReason}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300"
                              >
                                <Lock className="w-3 h-3 text-amber-700" />
                                <span>{isRtl ? 'حظر قانوني (Legal Hold)' : 'Legal Hold'}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">
                                {isRtl ? 'عادي (متاح للأرشفة)' : 'Standard'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-600">
                            <p>{doc.uploadedBy}</p>
                            <p className="font-mono text-[9px] text-slate-400">{doc.uploadedAt}</p>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRequestDownloadToken(doc)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                              <Download className="w-3 h-3 text-slate-500" />
                              <span>{isRtl ? 'رابط مؤقت' : 'Download Link'}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Transition Modal */}
          {isTransitionModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="transition-modal-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
            >
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 id="transition-modal-title" className="text-base font-bold text-slate-900">
                    {isRtl ? 'تحديث مرحلة الحالة الإنسانية' : 'Advance Case Status'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsTransitionModalOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {transitionError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    {transitionError}
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl
                        ? 'المرحلة القادمة المتاحة بموجب قواعد النظام:'
                        : 'Permitted Next Status:'}
                    </label>
                    <select
                      value={targetStatus}
                      onChange={e => setTargetStatus(e.target.value as CaseStatus)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      {allowedTransitions.map(st => (
                        <option key={st} value={st}>
                          {t(`status.${st}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl ? 'مبرر الانتقال (إلزامي للرقابة) *' : 'Transition Justification *'}
                    </label>
                    <textarea
                      rows={3}
                      value={transitionJustification}
                      onChange={e => setTransitionJustification(e.target.value)}
                      placeholder={
                        isRtl
                          ? 'اكتب سبب الانتقال ونتائج التقييم...'
                          : 'Provide transition rationale...'
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsTransitionModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAdvanceStatus}
                    className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 shadow-xs"
                  >
                    {isRtl ? 'تأكيد التحديث' : 'Confirm Transition'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Close Case Modal (Accidental Destruction Safeguard) */}
          {isCloseModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="close-modal-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
            >
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-rose-700">
                    <Archive className="w-5 h-5" />
                    <h3 id="close-modal-title" className="text-base font-bold text-slate-900">
                      {isRtl ? 'إغلاق وأرشفة ملف الحالة' : 'Close & Archive Case File'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCloseModalOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {closeError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    {closeError}
                  </div>
                )}

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-semibold text-slate-800">
                      {isRtl ? 'تنبيه الأمان والامتثال الرقابي:' : 'Regulatory Compliance Notice:'}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {isRtl
                        ? 'إغلاق الملف لا يعني حذفه من قاعدة البيانات. تبقى كافة السجلات والقيود المالية والزيارات محفوظة بشكل دائم للتدقيق.'
                        : 'Closing archives the file; database triggers prevent hard deletion. All ledger and visit entries remain permanently audited.'}
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl
                        ? 'سبب إغلاق الحالة (10 أحرف كحد أدنى) *'
                        : 'Closure Reason (Min 10 characters) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={closureReason}
                      onChange={e => setClosureReason(e.target.value)}
                      placeholder={
                        isRtl
                          ? 'اكتمال تسليم المساعدات وتحقق الاكتفاء'
                          : 'Full assistance delivered and verified'
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl
                        ? 'ملاحظات إضافية وتوصيات المتابعة'
                        : 'Additional Notes / Follow-up Recommendations'}
                    </label>
                    <textarea
                      rows={2}
                      value={closureJustification}
                      onChange={e => setClosureJustification(e.target.value)}
                      placeholder={
                        isRtl
                          ? 'لا توجد متطلبات متابعة إضافية حالياً...'
                          : 'No further actions required...'
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCloseModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    disabled={closureReason.trim().length < 10}
                    onClick={handleCloseCase}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {isRtl ? 'تأكيد إغلاق الحالة' : 'Confirm Case Closure'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Field Visit Modal */}
          {isVisitModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="visit-modal-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
            >
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 id="visit-modal-title" className="text-base font-bold text-slate-900">
                    {isRtl ? 'تسجيل زيارة ميدانية جديدة' : 'Log Field Visit'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsVisitModalOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl ? 'تاريخ الزيارة *' : 'Visit Date *'}
                    </label>
                    <input
                      type="date"
                      value={newVisitDate}
                      onChange={e => setNewVisitDate(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl ? 'ملاحظات المعاينة الميدانية *' : 'Field Visit Observations *'}
                    </label>
                    <textarea
                      rows={3}
                      value={newVisitNotes}
                      onChange={e => setNewVisitNotes(e.target.value)}
                      placeholder={
                        isRtl
                          ? 'أدخل ملاحظات الزيارة الميدانية وظروف الأسرة...'
                          : 'Enter visit observations...'
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsVisitModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    disabled={newVisitNotes.trim().length < 5}
                    onClick={handleAddVisit}
                    className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 shadow-xs"
                  >
                    {isRtl ? 'حفظ الزيارة' : 'Save Visit'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Private Document Modal */}
          {isUploadDocModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="upload-doc-modal-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
            >
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <Upload className="w-5 h-5" />
                    <h3 id="upload-doc-modal-title" className="text-base font-bold text-slate-900">
                      {isRtl
                        ? 'تسجيل ورفع وثيقة ثبوتية خاصة'
                        : 'Register & Upload Private Document'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadDocModalOpen(false);
                      setDocUploadError(null);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {docUploadError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    {docUploadError}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isRtl ? 'أمن المستودع والخصوصية:' : 'Storage Security & Privacy:'}</span>
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {isRtl
                      ? 'يتم تخزين الملفات بمسارات معماة (Opaque UUID) ولا يتم نشر أي روابط عامة. لا تسجل محتويات الملفات في سجلات التدقيق.'
                      : 'Files are placed under opaque server-generated UUID paths. Zero public URLs or body content logging. Max size 10MB.'}
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl ? 'تصنيف الوثيقة *' : 'Document Category *'}
                    </label>
                    <select
                      value={newDocCategory}
                      onChange={e => setNewDocCategory(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="national_id">
                        {isRtl ? 'البطاقة الوطنية الموحدة' : 'National Unified ID'}
                      </option>
                      <option value="residency_card">
                        {isRtl ? 'بطاقة السكن الرسمية' : 'Residency Card'}
                      </option>
                      <option value="medical_report">
                        {isRtl ? 'تقرير طبي صادر من لجنة رسمية' : 'Specialist Medical Report'}
                      </option>
                      <option value="household_registry">
                        {isRtl ? 'بيان القيد الأسري / صورة قيد' : 'Family Registration Extract'}
                      </option>
                      <option value="other">
                        {isRtl ? 'وثيقة ثبوتية مساندة أخرى' : 'Other Supporting Evidence'}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl ? 'اسم الملف الأصلي *' : 'Original File Name *'}
                    </label>
                    <input
                      type="text"
                      value={newDocFileName}
                      onChange={e => setNewDocFileName(e.target.value)}
                      placeholder="e.g. national_id_scanned.pdf"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {isRtl ? 'نوع الوسائط (MIME) *' : 'MIME Type *'}
                      </label>
                      <select
                        value={newDocMimeType}
                        onChange={e => setNewDocMimeType(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                      >
                        <option value="application/pdf">application/pdf</option>
                        <option value="image/jpeg">image/jpeg</option>
                        <option value="image/png">image/png</option>
                        <option value="image/webp">image/webp</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {isRtl ? 'الحجم بالبايت (حد أقصى 10MB) *' : 'Size (Bytes, max 10MB) *'}
                      </label>
                      <input
                        type="number"
                        value={newDocSize}
                        onChange={e => setNewDocSize(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadDocModalOpen(false);
                      setDocUploadError(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadDocument}
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 shadow-xs"
                  >
                    {isRtl ? 'تسجيل وحفظ الوثيقة' : 'Register Document'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Download Token Modal */}
          {downloadModalDoc && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="download-modal-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
            >
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <Key className="w-5 h-5" />
                    <h3 id="download-modal-title" className="text-base font-bold text-slate-900">
                      {isRtl ? 'رمز تصريح التحميل الموقوت' : 'Time-Bound Download Token'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadModalDoc(null);
                      setDownloadToken(null);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>{isRtl ? 'الملف المطلوب:' : 'Target Document:'}</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {downloadModalDoc.fileName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>{isRtl ? 'المسار المعمى في المستودع:' : 'Opaque Storage Path:'}</span>
                      <span className="font-mono text-[10px] text-slate-700 truncate max-w-[200px]">
                        {downloadModalDoc.storagePath}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>{isRtl ? 'فترة الصلاحية:' : 'Token Expiry:'}</span>
                      <span className="text-amber-700 font-semibold">
                        {isRtl ? '300 ثانية (5 دقائق)' : '300 seconds (5 min)'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl
                        ? 'رمز التفويض المشفر (مخصص لك ومسجل بالتدقيق)'
                        : 'Audited Authorization Token'}
                    </label>
                    <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 font-mono text-xs text-indigo-900 break-all select-all">
                      {downloadToken}
                    </div>
                  </div>

                  {downloadModalDoc.isLegalHold && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isRtl
                          ? 'تنبيه: الوثيقة خاضعة للحجز القانوني والتحفظ الرقابي.'
                          : 'Notice: Document is under active legal hold. Deletion blocked.'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadModalDoc(null);
                      setDownloadToken(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-xs"
                  >
                    {isRtl ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </RoleGuard>
    </AppShell>
  );
}
