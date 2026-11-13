'use client';

import React, { useState } from 'react';
import {
  Receipt,
  ShieldAlert,
  CheckCircle,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  Sliders,
  DollarSign,
  Lock,
  FileSpreadsheet,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';
import { useAuth } from '@/lib/auth-context';

export interface FinanceLedgerEntry {
  id: string;
  transactionReference: string;
  caseReference: string;
  entitlementId: string;
  programmeCode: string;
  transactionType: 'disbursement' | 'reversal_credit' | 'reversal_debit';
  amount: number;
  currency: string;
  makerName: string;
  makerId: string;
  checkerName: string;
  checkerId: string;
  reversalOfTxId?: string;
  rationale: string;
  postedAt: string;
}

export interface ProgrammeLimit {
  programmeCode: string;
  nameAr: string;
  nameEn: string;
  supervisorLimit: number;
  managerLimit: number;
  currency: string;
  status: 'active' | 'fail_closed';
}

const PROGRAMME_LIMITS: ProgrammeLimit[] = [
  {
    programmeCode: 'FIN',
    nameAr: 'المساعدات النقدية متعددة الأغراض',
    nameEn: 'Multi-Purpose Cash Assistance',
    supervisorLimit: 500000,
    managerLimit: 2500000,
    currency: 'IQD',
    status: 'active',
  },
  {
    programmeCode: 'FOD',
    nameAr: 'الأمن الغذائي والطرود التموينية',
    nameEn: 'Food Security & Nutrition',
    supervisorLimit: 150000,
    managerLimit: 600000,
    currency: 'IQD',
    status: 'active',
  },
  {
    programmeCode: 'MED',
    nameAr: 'الرعاية الصحية والعلاج التخصصي',
    nameEn: 'Specialized Medical Care',
    supervisorLimit: 750000,
    managerLimit: 3000000,
    currency: 'IQD',
    status: 'active',
  },
  {
    programmeCode: 'HOU',
    nameAr: 'المأوى وإعادة تأهيل المساكن',
    nameEn: 'Shelter Rehabilitation',
    supervisorLimit: 1500000,
    managerLimit: 5000000,
    currency: 'IQD',
    status: 'active',
  },
  {
    programmeCode: 'EDU',
    nameAr: 'التعليم والعودة للمدارس',
    nameEn: 'Education & Child Support',
    supervisorLimit: 200000,
    managerLimit: 800000,
    currency: 'IQD',
    status: 'active',
  },
  {
    programmeCode: 'EMG',
    nameAr: 'الإغاثة الإنسانية العاجلة',
    nameEn: 'Rapid Emergency Response',
    supervisorLimit: 400000,
    managerLimit: 1500000,
    currency: 'IQD',
    status: 'active',
  },
  {
    programmeCode: 'EMP',
    nameAr: 'التشغيل ومنح سبل العيش',
    nameEn: 'Employment & Livelihoods',
    supervisorLimit: 1000000,
    managerLimit: 4000000,
    currency: 'IQD',
    status: 'active',
  },
  {
    programmeCode: 'SOC',
    nameAr: 'الخدمات الاجتماعية والدعم القانوني',
    nameEn: 'Social & Legal Services',
    supervisorLimit: 0,
    managerLimit: 0,
    currency: 'IQD',
    status: 'fail_closed',
  },
];

const INITIAL_LEDGER: FinanceLedgerEntry[] = [
  {
    id: 'tx-001',
    transactionReference: 'TX-FIN-2026-0001',
    caseReference: 'CASE-2026-0001',
    entitlementId: 'ent-001',
    programmeCode: 'FIN',
    transactionType: 'disbursement',
    amount: 450000,
    currency: 'IQD',
    makerName: 'زينب أحمد حسن (صانع مالي)',
    makerId: '00000000-0000-0000-0000-000000000004',
    checkerName: 'حيدر مهدي جاسم (مدقق مالي)',
    checkerId: '00000000-0000-0000-0000-000000000005',
    rationale: 'صرف منحة نقدية عاجلة للأسر الأشد فقراً بموجب موافقة المشرف',
    postedAt: '2026-11-13 10:45',
  },
  {
    id: 'tx-002',
    transactionReference: 'TX-FIN-2026-0002',
    caseReference: 'CASE-2026-0002',
    entitlementId: 'ent-002',
    programmeCode: 'FIN',
    transactionType: 'disbursement',
    amount: 300000,
    currency: 'IQD',
    makerName: 'زينب أحمد حسن (صانع مالي)',
    makerId: '00000000-0000-0000-0000-000000000004',
    checkerName: 'حيدر مهدي جاسم (مدقق مالي)',
    checkerId: '00000000-0000-0000-0000-000000000005',
    rationale: 'صرف بدل إيجار وقود التدفئة للموسم الشتوي',
    postedAt: '2026-11-13 11:20',
  },
  {
    id: 'tx-003',
    transactionReference: 'REV-TX-FIN-2026-0002',
    caseReference: 'CASE-2026-0002',
    entitlementId: 'ent-002',
    programmeCode: 'FIN',
    transactionType: 'reversal_credit',
    amount: 300000,
    currency: 'IQD',
    makerName: 'زينب أحمد حسن (صانع مالي)',
    makerId: '00000000-0000-0000-0000-000000000004',
    checkerName: 'حيدر مهدي جاسم (مدقق مالي)',
    checkerId: '00000000-0000-0000-0000-000000000005',
    reversalOfTxId: 'tx-002',
    rationale: 'قيد عكسي تعويضي: إلغاء سند الصرف رقم TX-FIN-2026-0002 لتصحيح اسم المستفيد',
    postedAt: '2026-11-13 12:15',
  },
];

export default function FinancePage() {
  const { isRtl } = useLocale();
  const { user } = useAuth();

  const [ledger, setLedger] = useState<FinanceLedgerEntry[]>(INITIAL_LEDGER);
  const [activeTab, setActiveTab] = useState<'ledger' | 'limits' | 'reconciliation'>('ledger');
  const [reversalModalTx, setReversalModalTx] = useState<FinanceLedgerEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Reconciliation Computations
  const totalDisbursed = ledger
    .filter(e => e.transactionType === 'disbursement')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalReversed = ledger
    .filter(e => e.transactionType === 'reversal_credit')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netDisbursed = totalDisbursed - totalReversed;

  const handleOpenReversal = (tx: FinanceLedgerEntry) => {
    // Only disbursements can be reversed
    if (tx.transactionType !== 'disbursement') return;

    // Check if already reversed
    const alreadyReversed = ledger.some(e => e.reversalOfTxId === tx.id);
    if (alreadyReversed) {
      setErrorMessage(
        isRtl
          ? 'تنبيه محاسبي: هذه المعاملة معكوسة بالفعل ولا يجوز تكرار القيد العكسي.'
          : 'Audit alert: This transaction has already been reversed.',
      );
      return;
    }

    setErrorMessage(null);
    setReversalModalTx(tx);
    setReversalReason('');
  };

  const handleConfirmReversal = () => {
    if (!reversalModalTx) return;

    if (!reversalReason.trim()) {
      setErrorMessage(
        isRtl
          ? 'يرجى إدخال المسوغ المحاسبي القانوني لإنشاء القيد العكسي.'
          : 'Mandatory accounting justification required for reversal entry.',
      );
      return;
    }

    // Append Compensating Reversal Entry (NEVER update or delete posted entry)
    const newReversalEntry: FinanceLedgerEntry = {
      id: `rev-${Date.now()}`,
      transactionReference: `REV-${reversalModalTx.transactionReference}`,
      caseReference: reversalModalTx.caseReference,
      entitlementId: reversalModalTx.entitlementId,
      programmeCode: reversalModalTx.programmeCode,
      transactionType: 'reversal_credit',
      amount: reversalModalTx.amount,
      currency: reversalModalTx.currency,
      makerName: reversalModalTx.makerName,
      makerId: reversalModalTx.makerId,
      checkerName: user
        ? isRtl
          ? user.fullNameAr
          : user.fullNameEn
        : 'حيدر مهدي جاسم (مدقق مالي)',
      checkerId: user?.id || '00000000-0000-0000-0000-000000000005',
      reversalOfTxId: reversalModalTx.id,
      rationale: `قيد عكسي تعويضي: ${reversalReason}`,
      postedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setLedger(prev => [newReversalEntry, ...prev]);
    setSuccessBanner(
      isRtl
        ? `تم قيد المعاملة العكسية (${newReversalEntry.transactionReference}) بنجاح دون تعديل السجل الأصلي.`
        : `Compensating reversal posted (${newReversalEntry.transactionReference}). Original row preserved immutably.`,
    );
    setReversalModalTx(null);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <AppShell>
      <RoleGuard allowedRoles={['finance_maker', 'finance_checker', 'auditor', 'security_admin']}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRtl
                  ? 'سجل العمليات والرقابة المالية'
                  : 'Financial Ledger & Disbursement Controls'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRtl
                  ? 'سجل محاسبي غير قابل للحذف أو التعديل، يعتمد الصانع والمدقق (Maker-Checker) والقيود العكسية وسقوف البرامج'
                  : 'Append-only immutable financial ledger; enforced Maker-Checker separation, programme limits, and reversal accounting'}
              </p>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'ledger'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isRtl ? 'السجل المحاسبي' : 'Ledger'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reconciliation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'reconciliation'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isRtl ? 'مطابقة الحسابات' : 'Reconciliation'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('limits')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'limits'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isRtl ? 'سقوف البرامج (Fail-Closed)' : 'Programme Limits'}
              </button>
            </div>
          </div>

          {/* Strict Safety Disclaimer Banner */}
          <div className="bg-slate-900 text-slate-100 border border-slate-700 rounded-xl p-3.5 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-400">
                  {isRtl ? 'بيئة تجريبية آمنة ومحلية' : 'Disposable Demonstration Backend'}
                </p>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  {isRtl
                    ? 'هذا النظام يعمل على بيئة محلية لأغراض التدقيق والمطابقة. لا يوجد أي ربط مع بوابات دفع خارجية أو تنفيذ تحويلات مالية حقيقية.'
                    : 'Enforces strict Maker-Checker rules and PostgreSQL RLS. No real external payment processor or live banking rails connected.'}
                </p>
              </div>
            </div>
            <span className="hidden md:inline-block px-2.5 py-1 bg-slate-800 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-mono">
              GATEWAY: DISABLED
            </span>
          </div>

          {/* Success Banner */}
          {successBanner && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2 shadow-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
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

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {isRtl ? 'إجمالي المبالغ المصروفة' : 'Gross Disbursed'}
                </span>
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-lg font-bold font-mono text-slate-900 mt-2">
                {totalDisbursed.toLocaleString()} د.ع
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {isRtl ? 'مجموع القيود المنفذة' : 'Gross posted disbursements'}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {isRtl ? 'إجمالي القيود العكسية (تسويات)' : 'Total Reversed (Compensating)'}
                </span>
                <RotateCcw className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-lg font-bold font-mono text-rose-600 mt-2">
                -{totalReversed.toLocaleString()} د.ع
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {isRtl ? 'قيود عكسية دون تعديل الأصل' : 'Compensating credit reversals'}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {isRtl ? 'صافي الصرف الفعلي' : 'Net Disbursed'}
                </span>
                <DollarSign className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-lg font-bold font-mono text-emerald-700 mt-2">
                {netDisbursed.toLocaleString()} د.ع
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {isRtl ? 'المطابقة الحسابية المستقرة' : 'Reconciled net balance'}
              </p>
            </div>
          </div>

          {/* TAB 1: LEDGER */}
          {activeTab === 'ledger' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-800">
                    {isRtl ? 'سجل العمليات المحاسبية (Immutable)' : 'Immutable Ledger Entries'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {ledger.length} {isRtl ? 'سجلات مسجلة' : 'entries'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-start">{isRtl ? 'رقم الإيصال' : 'Ref #'}</th>
                      <th className="py-3 px-4 text-start">{isRtl ? 'رقم الحالة' : 'Case #'}</th>
                      <th className="py-3 px-4 text-start">{isRtl ? 'البرنامج' : 'Sector'}</th>
                      <th className="py-3 px-4 text-start">{isRtl ? 'نوع القيد' : 'Type'}</th>
                      <th className="py-3 px-4 text-start">{isRtl ? 'المبلغ' : 'Amount'}</th>
                      <th className="py-3 px-4 text-start">{isRtl ? 'المنظم (Maker)' : 'Maker'}</th>
                      <th className="py-3 px-4 text-start">
                        {isRtl ? 'المدقق (Checker)' : 'Checker'}
                      </th>
                      <th className="py-3 px-4 text-start">{isRtl ? 'المسوغ' : 'Rationale'}</th>
                      <th className="py-3 px-4 text-center">{isRtl ? 'الإجراء' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {ledger.map(tx => {
                      const isReversal = tx.transactionType === 'reversal_credit';
                      const isReversedAlready = ledger.some(e => e.reversalOfTxId === tx.id);

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {tx.transactionReference}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">{tx.caseReference}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-[10px] text-slate-800">
                              {tx.programmeCode}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isReversal ? (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>{isRtl ? 'قيد عكسي' : 'Reversal Credit'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <ArrowDownRight className="w-3.5 h-3.5" />
                                <span>{isRtl ? 'صرف مالي' : 'Disbursement'}</span>
                              </span>
                            )}
                          </td>
                          <td
                            className={`py-3 px-4 font-mono font-bold ${
                              isReversal ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            {isReversal ? '-' : ''}
                            {tx.amount.toLocaleString()} {tx.currency}
                          </td>
                          <td className="py-3 px-4 text-slate-800 text-[11px]">{tx.makerName}</td>
                          <td className="py-3 px-4 text-slate-800 text-[11px] font-medium">
                            {tx.checkerName}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-[220px] truncate">
                            {tx.rationale}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {!isReversal && (
                              <button
                                type="button"
                                onClick={() => handleOpenReversal(tx)}
                                disabled={isReversedAlready}
                                title={
                                  isReversedAlready
                                    ? isRtl
                                      ? 'تم عكس هذا القيد مسبقاً'
                                      : 'Already reversed'
                                    : isRtl
                                      ? 'إنشاء قيد عكسي تعويضي'
                                      : 'Post Compensating Reversal'
                                }
                                className={`px-2 py-1 rounded text-[11px] font-semibold inline-flex items-center gap-1 transition-colors ${
                                  isReversedAlready
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                }`}
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>
                                  {isReversedAlready
                                    ? isRtl
                                      ? 'معكوس'
                                      : 'Reversed'
                                    : isRtl
                                      ? 'قيد عكسي'
                                      : 'Reverse'}
                                </span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: RECONCILIATION */}
          {activeTab === 'reconciliation' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {isRtl
                    ? 'تقرير مطابقة القيود المالية وحسابات البرامج'
                    : 'Financial Reconciliation & Sector Balancing'}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">
                    {isRtl ? 'ملخص تسوية القيود المحاسبية' : 'Ledger Settlement Summary'}
                  </h4>
                  <div className="text-xs space-y-2 text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span>{isRtl ? 'إجمالي القيود المقيدة:' : 'Total Ledger Transactions:'}</span>
                      <span className="font-mono font-bold">{ledger.length}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span>{isRtl ? 'سندات الصرف المعتمدة:' : 'Approved Disbursements:'}</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {totalDisbursed.toLocaleString()} IQD
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span>
                        {isRtl ? 'مجموع القيود العكسية التعويضية:' : 'Compensating Reversals:'}
                      </span>
                      <span className="font-mono font-bold text-rose-600">
                        -{totalReversed.toLocaleString()} IQD
                      </span>
                    </div>
                    <div className="flex justify-between py-1 pt-2 font-bold text-slate-900">
                      <span>
                        {isRtl ? 'الرصيد الصافي الفعلي بعد المطابقة:' : 'Reconciled Net Disbursed:'}
                      </span>
                      <span className="font-mono text-emerald-800 text-sm">
                        {netDisbursed.toLocaleString()} IQD
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">
                    {isRtl ? 'قواعد النزاهة المحاسبية' : 'Accounting Invariants Enforced'}
                  </h4>
                  <ul className="text-xs space-y-2 text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        {isRtl
                          ? 'منع التعديل أو الحذف المباشر (UPDATE / DELETE) بواسطة مشغلات PostgreSQL.'
                          : 'Zero UPDATE or DELETE mutations permitted on posted ledger records.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        {isRtl
                          ? 'الفصل الإلزامي بين الصانع والمدقق (maker_id != checker_id) في قاعدة البيانات.'
                          : 'Mandatory Maker-Checker separation (maker_id != checker_id) in workflow function.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        {isRtl
                          ? 'إلزامية القيد العكسي التعويضي لتعديل أي حركة مالية سابقة مع إبقاء القيد الأصلي.'
                          : 'Compensating reversal entries required for all accounting corrections.'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROGRAMME LIMITS */}
          {activeTab === 'limits' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-800">
                    {isRtl
                      ? 'سقوف البرامج والسياسات المالية (Fail-Closed Architecture)'
                      : 'Configurable Programme Financial Limits'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-start">{isRtl ? 'الرمز' : 'Code'}</th>
                      <th className="py-3 px-4 text-start">
                        {isRtl ? 'البرنامج الإنساني' : 'Programme Sector'}
                      </th>
                      <th className="py-3 px-4 text-start">
                        {isRtl ? 'سقف المشرف (Supervisor)' : 'Supervisor Limit'}
                      </th>
                      <th className="py-3 px-4 text-start">
                        {isRtl ? 'سقف المدير (Manager Max)' : 'Manager Max Limit'}
                      </th>
                      <th className="py-3 px-4 text-start">{isRtl ? 'العملة' : 'Currency'}</th>
                      <th className="py-3 px-4 text-start">
                        {isRtl ? 'حالة السياسة' : 'Policy Status'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {PROGRAMME_LIMITS.map(limit => (
                      <tr
                        key={limit.programmeCode}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {limit.programmeCode}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {isRtl ? limit.nameAr : limit.nameEn}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {limit.supervisorLimit > 0
                            ? `${limit.supervisorLimit.toLocaleString()} ${limit.currency}`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                          {limit.managerLimit > 0
                            ? `${limit.managerLimit.toLocaleString()} ${limit.currency}`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono">{limit.currency}</td>
                        <td className="py-3 px-4">
                          {limit.status === 'active' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                              {isRtl ? 'مفعل ومقيد' : 'Active & Enforced'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-semibold">
                              {isRtl ? 'غير مهيأ (Fail-Closed)' : 'Unconfigured (Fail-Closed)'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reversal Confirmation Modal */}
          {reversalModalTx && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-rose-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      {isRtl
                        ? 'إنشاء قيد عكسي تعويضي (Compensating Reversal)'
                        : 'Create Compensating Reversal Entry'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReversalModalTx(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                  <p className="font-bold">
                    {isRtl ? 'تنبيه النزاهة المحاسبية' : 'Accounting Integrity Guarantee'}
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    {isRtl
                      ? 'لن يتم حذف أو تعديل المعاملة الأصلية إطلاقاً. سيتم تسجيل قيد محاسبي جديد دائن يعوض المبلغ ويحفظ في سجل التدقيق غير القابل للتعديل.'
                      : 'The original disbursement row is NEVER edited or deleted. A compensating credit row is inserted and linked to preserve the audit trail.'}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {isRtl ? 'رقم الإيصال المراد عكسه:' : 'Original Transaction:'}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {reversalModalTx.transactionReference}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {isRtl ? 'رقم الحالة:' : 'Case Reference:'}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {reversalModalTx.caseReference}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {isRtl ? 'المبلغ المراد تسويته:' : 'Amount to Reverse:'}
                    </span>
                    <span className="font-mono font-bold text-rose-600">
                      {reversalModalTx.amount.toLocaleString()} {reversalModalTx.currency}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRtl
                      ? 'المسوغ القانوني / سبب القيد العكسي (إلزامي في سجل التدقيق):'
                      : 'Legal Justification / Reversal Rationale (Mandatory):'}
                  </label>
                  <textarea
                    rows={3}
                    value={reversalReason}
                    onChange={e => setReversalReason(e.target.value)}
                    placeholder={
                      isRtl
                        ? 'إلغاء سند الصرف لإعادة إصداره برقم حساب مصحح، أو تسوية مالية بموجب تقرير التدقيق...'
                        : 'Voucher cancelled and reissued due to recipient account correction, or audit findings...'
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReversalModalTx(null)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReversal}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors"
                  >
                    {isRtl ? 'تأكيد إصدار القيد العكسي' : 'Post Reversal Entry'}
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
