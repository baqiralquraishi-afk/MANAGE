'use client';

import React, { useState } from 'react';
import {
  CopyCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Shield,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  MapPin,
  Phone,
  FileText,
  X,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';
import { useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/ui/empty-state';

interface DuplicateCandidate {
  id: string;
  targetBeneficiaryId: string;
  targetNameAr: string;
  targetNationalId: string;
  targetMotherName: string;
  targetDob: string;
  targetPhone: string;
  targetGovernorate: string;

  matchedBeneficiaryId: string;
  matchedNameAr: string;
  matchedNationalId: string;
  matchedMotherName: string;
  matchedDob: string;
  matchedPhone: string;
  matchedGovernorate: string;

  matchScore: number;
  matchReasonKey: 'identical_national_id' | 'identical_phone' | 'identical_name_and_dob';
  flaggedAt: string;
  status: 'pending' | 'confirmed_duplicate' | 'dismissed_false_positive';
}

const INITIAL_DUPLICATES: DuplicateCandidate[] = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    targetBeneficiaryId: '30000000-0000-0000-0000-000000000004',
    targetNameAr: 'فاطمة جاسم محمد الكرخي',
    targetNationalId: '198512345678',
    targetMotherName: 'مريم علي',
    targetDob: '1985-04-12',
    targetPhone: '+9647701234567',
    targetGovernorate: 'بغداد (الرصافة)',

    matchedBeneficiaryId: '30000000-0000-0000-0000-000000000001',
    matchedNameAr: 'فاطمة جاسم محمد',
    matchedNationalId: '198512345678',
    matchedMotherName: 'مريم علي',
    matchedDob: '1985-04-12',
    matchedPhone: '+9647701234567',
    matchedGovernorate: 'بغداد (الكرخ)',

    matchScore: 100.0,
    matchReasonKey: 'identical_national_id',
    flaggedAt: '2026-11-10 11:24',
    status: 'pending',
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    targetBeneficiaryId: '30000000-0000-0000-0000-000000000005',
    targetNameAr: 'عمر فاروق عبد الله الجبوري',
    targetNationalId: '199087654399',
    targetMotherName: 'خديجة حسن',
    targetDob: '1990-09-20',
    targetPhone: '+9647709876543', // Matching phone with Omar
    targetGovernorate: 'نينوى (تلعفر)',

    matchedBeneficiaryId: '30000000-0000-0000-0000-000000000002',
    matchedNameAr: 'عمر فاروق عبد الله',
    matchedNationalId: '199087654321',
    matchedMotherName: 'خديجة حسن',
    matchedDob: '1990-09-20',
    matchedPhone: '+9647709876543',
    matchedGovernorate: 'نينوى (الموصل)',

    matchScore: 85.0,
    matchReasonKey: 'identical_phone',
    flaggedAt: '2026-11-12 15:40',
    status: 'pending',
  },
];

export default function DuplicatesPage() {
  const { isRtl, t } = useLocale();
  const { user } = useAuth();

  const [candidates, setCandidates] = useState<DuplicateCandidate[]>(INITIAL_DUPLICATES);
  const [selectedCandidate, setSelectedCandidate] = useState<DuplicateCandidate | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionType, setDecisionType] = useState<
    'confirmed_duplicate' | 'dismissed_false_positive' | null
  >(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingCount = candidates.filter(c => c.status === 'pending').length;

  const handleOpenDecisionModal = (
    candidate: DuplicateCandidate,
    type: 'confirmed_duplicate' | 'dismissed_false_positive',
  ) => {
    setSelectedCandidate(candidate);
    setDecisionType(type);
    setDecisionNotes('');
    setDecisionError(null);
  };

  const handleConfirmDecision = () => {
    if (!selectedCandidate || !decisionType) return;

    if (decisionNotes.trim().length < 10) {
      setDecisionError(
        isRtl
          ? 'يجب إدخال مبرر تدقيق رقابي لا يقل عن 10 أحرف لتوثيق القرار البشري.'
          : 'Decision justification must be at least 10 characters long for audit logging.',
      );
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setCandidates(prev =>
        prev.map(c => (c.id === selectedCandidate.id ? { ...c, status: decisionType } : c)),
      );
      setIsProcessing(false);
      setSelectedCandidate(null);
      setDecisionType(null);
      setDecisionNotes('');
    }, 300);
  };

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={['supervisor', 'programme_manager', 'auditor', 'security_admin', 'intake']}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                  {pendingCount} {isRtl ? 'حالات بانتظار القرار البشري' : 'Pending Human Decisions'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRtl
                  ? 'قائمة تدقيق الازدواجية والمطابقة الثبوتية'
                  : 'Human Duplicate Review Queue'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRtl
                  ? 'حظر قطعي للدمج التلقائي للمستفيدين · تتطلب كل حالة قراراً بشرياً موثقاً من المشرف'
                  : 'Zero silent automated merging. Every duplicate match requires authorized human adjudication.'}
              </p>
            </div>
          </div>

          {/* Mandatory Policy Banner */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xs flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-white">
                {isRtl
                  ? 'مبدأ السياسة الصارمة: منع الدمج أو الحذف التلقائي'
                  : 'Core Platform Policy: Prohibition of Silent Automated Merging'}
              </p>
              <p className="text-slate-300 leading-relaxed">
                {isRtl
                  ? 'تقوم الخوارزميات بالاشتباه والتأشير فقط، ولا يحق للنظام دمج أو حذف أي سجل بصورة آلية. عند تأكيد الازدواجية، يتم ربط الملف بالسجل الرئيسي مع الاحتفاظ الكامل بكلا السجلين ومسارهما الرقابي.'
                  : 'Algorithms only flag duplicate candidates. Upon confirmation, the duplicate profile is linked to the primary profile while both records remain fully preserved and audited.'}
              </p>
            </div>
          </div>

          {/* Duplicates List */}
          {candidates.length === 0 ? (
            <EmptyState
              title={isRtl ? 'لا توجد حالات اشتباه معلقة' : 'No pending duplicate reviews'}
              description={
                isRtl
                  ? 'تم تدقيق كافة ملفات المستفيدين ولم تسجل أية مطابقة ثبوتية معلقة حالياً.'
                  : 'All candidate records have been adjudicated. No pending duplicates.'
              }
            />
          ) : (
            <div className="space-y-4">
              {candidates.map(cand => (
                <div
                  key={cand.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                    cand.status === 'pending'
                      ? 'border-amber-200 hover:border-amber-300'
                      : cand.status === 'confirmed_duplicate'
                        ? 'border-rose-200 bg-rose-50/10'
                        : 'border-emerald-200 bg-emerald-50/10'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {cand.id.slice(0, 8)}...
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">{cand.flaggedAt}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          cand.matchScore >= 90
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isRtl
                          ? `درجة التطابق: ${cand.matchScore}%`
                          : `Match Score: ${cand.matchScore}%`}
                      </span>

                      {cand.status === 'pending' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                          {isRtl ? 'قيد المراجعة' : 'Pending Decision'}
                        </span>
                      )}
                      {cand.status === 'confirmed_duplicate' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                          {isRtl ? 'ازدواجية مؤكدة' : 'Confirmed Duplicate'}
                        </span>
                      )}
                      {cand.status === 'dismissed_false_positive' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {isRtl ? 'شخص مستقل (تم الاستبعاد)' : 'Verified Unique'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Side-by-Side Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Target Record (Newly Registered) */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {isRtl ? 'السجل الجديد (المشتبه به)' : 'Target Profile (New)'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {cand.targetBeneficiaryId.slice(0, 8)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{cand.targetNameAr}</p>
                        <p className="text-slate-500 font-mono">
                          {isRtl ? 'الهوية:' : 'ID:'} {cand.targetNationalId}
                        </p>
                        <p className="text-slate-500">
                          {isRtl ? 'اسم الأم:' : 'Mother:'} {cand.targetMotherName}
                        </p>
                        <p className="text-slate-500">
                          {isRtl ? 'المحافظة:' : 'Location:'} {cand.targetGovernorate}
                        </p>
                        <p className="text-slate-500 font-mono" dir="ltr">
                          {cand.targetPhone}
                        </p>
                      </div>
                    </div>

                    {/* Matched Record (Existing in System) */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {isRtl ? 'السجل السابق في قاعدة البيانات' : 'Matched Existing Profile'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {cand.matchedBeneficiaryId.slice(0, 8)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{cand.matchedNameAr}</p>
                        <p className="text-slate-500 font-mono">
                          {isRtl ? 'الهوية:' : 'ID:'} {cand.matchedNationalId}
                        </p>
                        <p className="text-slate-500">
                          {isRtl ? 'اسم الأم:' : 'Mother:'} {cand.matchedMotherName}
                        </p>
                        <p className="text-slate-500">
                          {isRtl ? 'المحافظة:' : 'Location:'} {cand.matchedGovernorate}
                        </p>
                        <p className="text-slate-500 font-mono" dir="ltr">
                          {cand.matchedPhone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Human Decision Buttons */}
                  {cand.status === 'pending' && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDecisionModal(cand, 'dismissed_false_positive')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span>
                          {isRtl ? 'استبعاد (شخص مستقل فريد)' : 'Dismiss (Unique Person)'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDecisionModal(cand, 'confirmed_duplicate')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-500 text-xs font-semibold transition-colors shadow-xs"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                          {isRtl ? 'تأكيد الازدواجية وربط السجل' : 'Confirm Duplicate & Link'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Decision Modal */}
          {selectedCandidate && decisionType && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="decision-modal-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
            >
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 id="decision-modal-title" className="text-base font-bold text-slate-900">
                    {decisionType === 'confirmed_duplicate'
                      ? isRtl
                        ? 'تأكيد الازدواجية وربط السجلين'
                        : 'Confirm Duplicate & Link Record'
                      : isRtl
                        ? 'استبعاد الازدواجية (اعتماد كشخص فريد)'
                        : 'Dismiss as Verified Unique Person'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {decisionError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{decisionError}</span>
                  </div>
                )}

                <div className="text-xs text-slate-600 space-y-2">
                  <p>
                    {decisionType === 'confirmed_duplicate'
                      ? isRtl
                        ? `سيتم ربط السجل المشتبه به بالسجل الأساسي (${selectedCandidate.matchedNameAr}) مع الحفاظ التام على كلا السجلين وتوثيق التدقيق الرقابي.`
                        : `The candidate record will be linked to primary profile (${selectedCandidate.matchedNameAr}). Neither record is deleted.`
                      : isRtl
                        ? `سيتم وسم السجل المشتبه به كشخص فريد مستقل بعد التحقق البشري.`
                        : `The candidate will be marked unique after authorized human review.`}
                  </p>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {isRtl
                        ? 'مبرر القرار والتحقق الرقابي (10 أحرف كحد أدنى) *'
                        : 'Decision Justification (Min 10 characters) *'}
                    </label>
                    <textarea
                      rows={3}
                      value={decisionNotes}
                      onChange={e => setDecisionNotes(e.target.value)}
                      placeholder={
                        isRtl
                          ? 'أدخل تفاصيل المطابقة، نتيجة التواصل الميداني، ورأي المشرف المعتمد...'
                          : 'Enter verification notes, civil cross-check results, and supervisor rationale...'
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing || decisionNotes.trim().length < 10}
                    onClick={handleConfirmDecision}
                    className={`px-5 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs ${
                      decisionType === 'confirmed_duplicate'
                        ? 'bg-rose-600 hover:bg-rose-500'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    {isProcessing
                      ? isRtl
                        ? 'جاري الحفظ...'
                        : 'Processing...'
                      : isRtl
                        ? 'توثيق القرار الرقابي'
                        : 'Authorize Human Decision'}
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
