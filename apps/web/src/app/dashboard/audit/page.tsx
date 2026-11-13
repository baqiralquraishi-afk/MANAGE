'use client';

import React from 'react';
import { ShieldCheck, Search, Filter, Lock } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';

export default function AuditPage() {
  const { isRtl } = useLocale();

  return (
    <AppShell>
      <RoleGuard allowedRoles={['auditor', 'security_admin']}>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isRtl ? 'سجل الرقابة وتتبع العمليات الحساسة' : 'Security & Compliance Audit Trail'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRtl
                ? 'سجل غير قابل للتعديل يوثق كافة الأنشطة والتغييرات الحساسة والقرارات الميدانية'
                : 'Append-only audit trail logging all sensitive state mutations and document accesses'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'الوقت والتاريخ' : 'Timestamp'}
                    </th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'المستخدم' : 'Actor'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'العملية' : 'Action'}</th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'الجدول المستهدف' : 'Target Table'}
                    </th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'معرف السجل' : 'Record ID'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-slate-500">2026-11-13 14:10:02</td>
                    <td className="py-3 px-4 font-medium text-slate-900">سارة كريم (مشرفة)</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                        APPROVE_ASSESSMENT
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">case_assessments</td>
                    <td className="py-3 px-4 font-mono text-slate-400">8c13b...a10</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-slate-500">2026-11-13 14:15:30</td>
                    <td className="py-3 px-4 font-medium text-slate-900">حيدر مهدي (مدقق مالي)</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold">
                        DISBURSE_FUNDS
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">financial_entries</td>
                    <td className="py-3 px-4 font-mono text-slate-400">d42e1...c99</td>
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
