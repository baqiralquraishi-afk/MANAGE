'use client';

import React from 'react';
import { Receipt, ShieldAlert, CheckCircle, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';

export default function FinancePage() {
  const { isRtl } = useLocale();

  return (
    <AppShell>
      <RoleGuard allowedRoles={['finance_maker', 'finance_checker', 'auditor']}>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isRtl ? 'سجل العمليات والقيود المالية' : 'Financial Ledger & Disbursements'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRtl
                ? 'سجل محاسبي غير قابل للحذف أو التعديل، يعتمد القيد العكسي للتصحيحات والاعتماد المزدوج'
                : 'Append-only immutable financial ledger; corrections enforced via compensating reversal entries'}
            </p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {isRtl ? 'ضمانات النزاهة المحاسبية' : 'Ledger Integrity Guarantees'}
              </p>
              <p className="text-emerald-800 mt-0.5">
                {isRtl
                  ? 'جميع القيود المالية محمية بواسطة مشغلات قاعدة البيانات (Database Triggers) لمنع عمليات UPDATE و DELETE نهائياً.'
                  : 'All posted ledger rows are immutable at the database level. Direct UPDATE and DELETE queries are blocked.'}
              </p>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">{isRtl ? 'رقم الإيصال' : 'Entry #'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الحالة' : 'Case #'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'النوع' : 'Type'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'المبلغ' : 'Amount (IQD)'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'المنظم (Maker)' : 'Maker'}</th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'المدقق (Checker)' : 'Checker'}
                    </th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-semibold">DISB-2026-0001</td>
                    <td className="py-3 px-4 font-mono">CASE-2026-0001</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <ArrowDownRight className="w-3 h-3" />
                        <span>{isRtl ? 'صرف نقدي' : 'Disbursement'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">250,000 د.ع</td>
                    <td className="py-3 px-4">زينب أحمد حسن</td>
                    <td className="py-3 px-4">حيدر مهدي جاسم</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                        {isRtl ? 'مصروف ومكتمل' : 'Disbursed'}
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-semibold">REV-2026-0001</td>
                    <td className="py-3 px-4 font-mono">CASE-2026-0001</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{isRtl ? 'قيد عكسي تعويضي' : 'Reversal'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-600 font-mono">-250,000 د.ع</td>
                    <td className="py-3 px-4">حيدر مهدي جاسم</td>
                    <td className="py-3 px-4">نور هادي فؤاد (تدقيق)</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-semibold">
                        {isRtl ? 'قيد تصحيحي' : 'Reversed'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </RoleGuard>
    </AppShell>
  );
}
