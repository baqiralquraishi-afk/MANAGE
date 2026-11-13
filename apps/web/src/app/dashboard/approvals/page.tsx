'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Check,
  Shield,
  Filter,
  UserCheck,
  Eye,
  FileCheck,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';
import { useAuth } from '@/lib/auth-context';

export interface ApprovalRequest {
  id: string;
  caseId: string;
  caseReference: string;
  beneficiaryName: string;
  beneficiaryCivilId: string;
  programmeCode: 'FIN' | 'FOD' | 'MED' | 'HOU' | 'EDU' | 'EMG' | 'EMP' | 'SOC';
  approvalType: string;
  makerId: string;
  makerName: string;
  proposedAssistance: string;
  amountOrQuantity: string;
  vulnerabilityScore: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  comments?: string;
}

const PROGRAMMES_META: Record<
  string,
  { nameAr: string; nameEn: string; color: string; badgeBg: string }
> = {
  FIN: {
    nameAr: 'المساعدات النقدية (FIN)',
    nameEn: 'Financial Assistance (FIN)',
    color: 'text-emerald-700',
    badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  },
  FOD: {
    nameAr: 'الأمن الغذائي (FOD)',
    nameEn: 'Food Security (FOD)',
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
  },
  MED: {
    nameAr: 'الرعاية الصحية (MED)',
    nameEn: 'Medical Support (MED)',
    color: 'text-rose-700',
    badgeBg: 'bg-rose-50 border-rose-200 text-rose-800',
  },
  HOU: {
    nameAr: 'المأوى والمساكن (HOU)',
    nameEn: 'Housing & Shelter (HOU)',
    color: 'text-indigo-700',
    badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  },
  EDU: {
    nameAr: 'التعليم ورعاية الطفل (EDU)',
    nameEn: 'Education Support (EDU)',
    color: 'text-blue-700',
    badgeBg: 'bg-blue-50 border-blue-200 text-blue-800',
  },
  EMG: {
    nameAr: 'الإغاثة الطارئة (EMG)',
    nameEn: 'Emergency Relief (EMG)',
    color: 'text-red-700',
    badgeBg: 'bg-red-50 border-red-200 text-red-800',
  },
  EMP: {
    nameAr: 'التشغيل وسبل العيش (EMP)',
    nameEn: 'Employment & Livelihoods (EMP)',
    color: 'text-violet-700',
    badgeBg: 'bg-violet-50 border-violet-200 text-violet-800',
  },
  SOC: {
    nameAr: 'الخدمات الاجتماعية (SOC)',
    nameEn: 'Social Services (SOC)',
    color: 'text-slate-700',
    badgeBg: 'bg-slate-100 border-slate-200 text-slate-800',
  },
};

const INITIAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'appr-001',
    caseId: '50000000-0000-0000-0000-000000000001',
    caseReference: 'CASE-2026-0001',
    beneficiaryName: 'فاطمة علي حسين الجبوري',
    beneficiaryCivilId: '198512345678',
    programmeCode: 'FIN',
    approvalType: 'programme_eligibility',
    makerId: '00000000-0000-0000-0000-000000000003', // Caseworker Ninewa
    makerName: 'يوسف محمود عمر (باحث نينوى)',
    proposedAssistance: 'منحة نقدية طارئة متعددة الأغراض',
    amountOrQuantity: '450,000 د.ع',
    vulnerabilityScore: 88.5,
    status: 'pending',
    submittedAt: '2026-11-13 10:15',
  },
  {
    id: 'appr-002',
    caseId: '50000000-0000-0000-0000-000000000002',
    caseReference: 'CASE-2026-0002',
    beneficiaryName: 'عمر خالد حسن البصري',
    beneficiaryCivilId: '197998765432',
    programmeCode: 'FOD',
    approvalType: 'programme_eligibility',
    makerId: '00000000-0000-0000-0000-000000000003',
    makerName: 'يوسف محمود عمر (باحث نينوى)',
    proposedAssistance: 'سلة غذائية عائلية شهرية كبرى',
    amountOrQuantity: '1 حصة تموينية متكاملة',
    vulnerabilityScore: 78.0,
    status: 'pending',
    submittedAt: '2026-11-13 11:30',
  },
  {
    id: 'appr-003',
    caseId: '50000000-0000-0000-0000-000000000003',
    caseReference: 'CASE-2026-0003',
    beneficiaryName: 'مريم جاسم كاظم الموسوي',
    beneficiaryCivilId: '199211223344',
    programmeCode: 'MED',
    approvalType: 'programme_eligibility',
    makerId: '00000000-0000-0000-0000-000000000001', // Admin/Intake
    makerName: 'سارة كريم المنصور (استقبال بغداد)',
    proposedAssistance: 'دعم علاج الأمراض المزمنة وجراحة تخصصية',
    amountOrQuantity: '750,000 د.ع',
    vulnerabilityScore: 92.0,
    status: 'pending',
    submittedAt: '2026-11-13 12:45',
  },
  {
    id: 'appr-004',
    caseId: '50000000-0000-0000-0000-000000000004',
    caseReference: 'CASE-2026-0004',
    beneficiaryName: 'حسين طارق عزيز الدوري',
    beneficiaryCivilId: '198155667788',
    programmeCode: 'HOU',
    approvalType: 'programme_eligibility',
    makerId: '00000000-0000-0000-0000-000000000001',
    makerName: 'سارة كريم المنصور (استقبال بغداد)',
    proposedAssistance: 'إعادة تأهيل سقف ومستلزمات عزل شتوي',
    amountOrQuantity: '1,400,000 د.ع',
    vulnerabilityScore: 84.0,
    status: 'pending',
    submittedAt: '2026-11-13 13:10',
  },
  {
    id: 'appr-005',
    caseId: '50000000-0000-0000-0000-000000000005',
    caseReference: 'CASE-2026-0005',
    beneficiaryName: 'زينب عادل كريم العبيدي',
    beneficiaryCivilId: '199588776655',
    programmeCode: 'EDU',
    approvalType: 'programme_eligibility',
    makerId: '00000000-0000-0000-0000-000000000003',
    makerName: 'يوسف محمود عمر (باحث نينوى)',
    proposedAssistance: 'منحة العودة للمدرسة وحقيبة مدرسية متكاملة لـ 3 أطفال',
    amountOrQuantity: '200,000 د.ع',
    vulnerabilityScore: 71.5,
    status: 'pending',
    submittedAt: '2026-11-13 14:00',
  },
];

export default function ApprovalsPage() {
  const { isRtl } = useLocale();
  const { user } = useAuth();

  const [requests, setRequests] = useState<ApprovalRequest[]>(INITIAL_REQUESTS);
  const [selectedProgramme, setSelectedProgramme] = useState<string>('all');
  const [modalRequest, setModalRequest] = useState<ApprovalRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approved' | 'rejected'>('approved');
  const [decisionComments, setDecisionComments] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const filteredRequests = requests.filter(r => {
    if (selectedProgramme === 'all') return true;
    return r.programmeCode === selectedProgramme;
  });

  const handleOpenDecision = (req: ApprovalRequest, action: 'approved' | 'rejected') => {
    // Client-side maker-checker check before even opening
    if (user?.id && user.id === req.makerId) {
      setErrorMessage(
        isRtl
          ? 'مخالفة رقابية: لا يجوز للباحث منظم التوصية اعتمادها ذاتياً (مبدأ الصانع والمدقق).'
          : 'Maker-Checker policy violation: Maker cannot self-approve their own recommendation.',
      );
      return;
    }
    setErrorMessage(null);
    setModalRequest(req);
    setDecisionAction(action);
    setDecisionComments('');
  };

  const handleConfirmDecision = () => {
    if (!modalRequest) return;

    if (!decisionComments.trim()) {
      setErrorMessage(
        isRtl
          ? 'يرجى إدخال التعليل أو الملاحظات الرقابية لإتمام الإجراء.'
          : 'Please provide supervisory comments or justification.',
      );
      return;
    }

    // Prohibit self-approval
    if (user?.id && user.id === modalRequest.makerId) {
      setErrorMessage(
        isRtl
          ? 'خطأ: قاعدة البيانات تمنع الاعتماد الذاتي (ERR_SELF_APPROVAL_PROHIBITED).'
          : 'Database security error: Self-approval is strictly prohibited (ERR_SELF_APPROVAL_PROHIBITED).',
      );
      return;
    }

    setRequests(prev =>
      prev.map(r =>
        r.id === modalRequest.id ? { ...r, status: decisionAction, comments: decisionComments } : r,
      ),
    );

    const actionText =
      decisionAction === 'approved'
        ? isRtl
          ? 'تم اعتماد الحالة بنجاح وتحويلها لمرحلة التجهيز والصرف'
          : 'Case approved and transitioned to delivery'
        : isRtl
          ? 'تم رفض التوصية وإعادة الملف للباحث للتعديل'
          : 'Recommendation rejected and returned to caseworker';

    setSuccessBanner(`${actionText} (${modalRequest.caseReference})`);
    setModalRequest(null);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <AppShell>
      <RoleGuard allowedRoles={['supervisor', 'programme_manager', 'security_admin']}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRtl ? 'قائمة الاعتمادات وقرارات الأهلية' : 'Approvals & Eligibility Queue'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRtl
                  ? 'مراجعة توصيات التقييم الميداني للقطاعات الإنسانية الثمانية وإصدار قرارات الاعتماد الرقابي المزدوج'
                  : 'Review assessment recommendations across the 8 humanitarian sectors under strict Maker-Checker dual authorization'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">
                {isRtl ? 'القطاع الإنساني:' : 'Sector:'}
              </span>
              <select
                value={selectedProgramme}
                onChange={e => setSelectedProgramme(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="all">{isRtl ? 'جميع القطاعات (8)' : 'All Sectors (8)'}</option>
                <option value="FIN">
                  {isRtl ? 'FIN - المساعدات النقدية' : 'FIN - Cash Assistance'}
                </option>
                <option value="FOD">{isRtl ? 'FOD - الأمن الغذائي' : 'FOD - Food Security'}</option>
                <option value="MED">
                  {isRtl ? 'MED - الرعاية الصحية' : 'MED - Medical Support'}
                </option>
                <option value="HOU">
                  {isRtl ? 'HOU - المأوى والمساكن' : 'HOU - Housing & Shelter'}
                </option>
                <option value="EDU">{isRtl ? 'EDU - التعليم' : 'EDU - Education'}</option>
                <option value="EMG">
                  {isRtl ? 'EMG - الإغاثة الطارئة' : 'EMG - Emergency Relief'}
                </option>
                <option value="EMP">
                  {isRtl ? 'EMP - التأهيل والتشغيل' : 'EMP - Livelihoods'}
                </option>
                <option value="SOC">
                  {isRtl ? 'SOC - الخدمات الاجتماعية' : 'SOC - Social Services'}
                </option>
              </select>
            </div>
          </div>

          {/* Success Banner */}
          {successBanner && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successBanner}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-xs text-rose-900 flex items-center gap-2 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* Policy Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {isRtl
                  ? 'الضوابط الرقابية للاعتماد المزدوج (Maker-Checker Enforced)'
                  : 'Maker-Checker Dual-Authorization Enforced in Backend'}
              </p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                {isRtl
                  ? 'يمنع النظام البرمجي وقاعدة البيانات (PostgreSQL RLS & Workflow) قيام الموظف منظم الطلب باعتماده ذاتياً. يتطلب الاعتماد موافقة مشرف قطاعي مصرح أو مدير البرنامج، ويتم تسجيل البصمة الرقابية والوقت في سجل التدقيق غير القابل للتعديل.'
                  : 'Database triggers and workflow functions strictly prohibit self-approval (ERR_SELF_APPROVAL_PROHIBITED). Approvals require a supervisor or programme managerChecker and append tamper-proof audit trails.'}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">{isRtl ? 'رقم الحالة' : 'Case #'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'المستفيد' : 'Beneficiary'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'القطاع' : 'Sector'}</th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'المساعدة المقترحة' : 'Proposed Assistance'}
                    </th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'الكمية / المبلغ' : 'Amount/Qty'}
                    </th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'درجة الاحتياج' : 'Score'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'المنظم (Maker)' : 'Maker'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">
                      {isRtl ? 'الإجراء الرقابي' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRequests.map(req => {
                    const isSelfMaker = user?.id && user.id === req.makerId;
                    const prog = PROGRAMMES_META[req.programmeCode] || PROGRAMMES_META.FIN;

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {req.caseReference}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{req.beneficiaryName}</p>
                          <p className="font-mono text-[10px] text-slate-500">
                            {req.beneficiaryCivilId}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${prog.badgeBg}`}
                          >
                            {req.programmeCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium max-w-[200px]">
                          {req.proposedAssistance}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {req.amountOrQuantity}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              req.vulnerabilityScore >= 80
                                ? 'text-rose-600'
                                : req.vulnerabilityScore >= 70
                                  ? 'text-amber-600'
                                  : 'text-slate-600'
                            }`}
                          >
                            {req.vulnerabilityScore} / 100
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-800 text-[11px] font-medium">{req.makerName}</p>
                          {isSelfMaker && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9px] font-bold">
                              {isRtl
                                ? 'أنت المنظم (ممنوع الاعتماد الذاتي)'
                                : 'Self (Cannot Approve)'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {req.status === 'pending' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                              {isRtl ? 'قيد المراجعة' : 'Pending'}
                            </span>
                          ) : req.status === 'approved' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                              {isRtl ? 'معتمد' : 'Approved'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-semibold">
                              {isRtl ? 'مرفوض' : 'Rejected'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {req.status === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDecision(req, 'approved')}
                                  disabled={Boolean(isSelfMaker)}
                                  title={
                                    isSelfMaker
                                      ? isRtl
                                        ? 'ممنوع الاعتماد الذاتي للمنظم'
                                        : 'Self-approval is prohibited'
                                      : isRtl
                                        ? 'اعتماد التوصية'
                                        : 'Approve Recommendation'
                                  }
                                  className={`px-2.5 py-1 rounded text-white font-medium inline-flex items-center gap-1 transition-colors ${
                                    isSelfMaker
                                      ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-xs'
                                  }`}
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{isRtl ? 'اعتماد' : 'Approve'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDecision(req, 'rejected')}
                                  disabled={Boolean(isSelfMaker)}
                                  className={`px-2.5 py-1 rounded font-medium inline-flex items-center gap-1 transition-colors ${
                                    isSelfMaker
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                  }`}
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>{isRtl ? 'رفض' : 'Reject'}</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                {isRtl ? 'تم اتخاذ القرار' : 'Decided'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Decision Modal */}
          {modalRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    {decisionAction === 'approved' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600" />
                    )}
                    <h3 className="text-base font-bold text-slate-900">
                      {decisionAction === 'approved'
                        ? isRtl
                          ? 'اعتماد توصية المساعدة الإنسانية'
                          : 'Approve Assistance Entitlement'
                        : isRtl
                          ? 'رفض توصية المساعدة'
                          : 'Reject Assistance Recommendation'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalRequest(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {isRtl ? 'رقم الحالة:' : 'Case Reference:'}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {modalRequest.caseReference}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRtl ? 'المستفيد:' : 'Beneficiary:'}</span>
                    <span className="font-semibold text-slate-900">
                      {modalRequest.beneficiaryName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRtl ? 'البرنامج:' : 'Programme:'}</span>
                    <span className="font-semibold text-slate-900">
                      {modalRequest.programmeCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {isRtl ? 'المساعدة المقترحة:' : 'Proposed:'}
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {modalRequest.proposedAssistance} ({modalRequest.amountOrQuantity})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {isRtl ? 'المنظم الأصلي (Maker):' : 'Original Maker:'}
                    </span>
                    <span className="font-medium text-slate-800">{modalRequest.makerName}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRtl
                      ? 'التعليل الرقابي / سبب القرار (إلزامي في سجل التدقيق):'
                      : 'Audit Justification / Supervisory Notes (Mandatory):'}
                  </label>
                  <textarea
                    rows={3}
                    value={decisionComments}
                    onChange={e => setDecisionComments(e.target.value)}
                    placeholder={
                      decisionAction === 'approved'
                        ? isRtl
                          ? 'استيفاء المعايير ومطابقة درجة الفقر والاحتياج مع السقف المعتمد للبرنامج...'
                          : 'Meets vulnerability threshold and verified against programme financial limit...'
                        : isRtl
                          ? 'عدم تطابق معايير الأهلية أو نقص الوثائق الثبوتية المطلوبة...'
                          : 'Incomplete documentation or does not meet sector vulnerability criteria...'
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalRequest(null)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDecision}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors ${
                      decisionAction === 'approved'
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    {decisionAction === 'approved'
                      ? isRtl
                        ? 'تأكيد الاعتماد'
                        : 'Confirm Approval'
                      : isRtl
                        ? 'تأكيد الرفض'
                        : 'Confirm Rejection'}
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
