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
    'overview' | 'lifecycle' | 'activities' | 'appointments'
  >('overview');

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
        </div>
      </RoleGuard>
    </AppShell>
  );
}
