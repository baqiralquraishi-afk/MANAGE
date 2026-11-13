'use client';

import React from 'react';
import { FolderGit2, Search, Filter, Plus, Clock, Tag } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';

export default function CasesPage() {
  const { isRtl, t } = useLocale();

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={['caseworker', 'supervisor', 'programme_manager', 'auditor', 'report_viewer']}
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRtl ? 'ملفات الحالات الإنسانية' : 'Humanitarian Cases'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRtl
                  ? 'متابعة مسار الحالات والتقييمات الميدانية عبر البرامج الثمانية'
                  : 'Track case lifecycles and field assessments across the eight sectors'}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'فتح حالة جديدة' : 'Open New Case'}</span>
            </button>
          </div>

          {/* Cases Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">{isRtl ? 'رقم الحالة' : 'Case Number'}</th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'المستفيد الرئيسي' : 'Beneficiary'}
                    </th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'البرنامج' : 'Programme'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'المرحلة' : 'Stage'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'المحافظة' : 'Governorate'}</th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'الباحث المسؤول' : 'Caseworker'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      CASE-2026-0001
                    </td>
                    <td className="py-3 px-4">
                      {isRtl ? 'فاطمة جاسم محمد' : 'Fatima Jasim Mohammed'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                        FIN
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">
                        {t('status.under_assessment')}
                      </span>
                    </td>
                    <td className="py-3 px-4">{isRtl ? 'بغداد' : 'Baghdad'}</td>
                    <td className="py-3 px-4">{isRtl ? 'يوسف محمود' : 'Yousif Mahmoud'}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      CASE-2026-0002
                    </td>
                    <td className="py-3 px-4">
                      {isRtl ? 'عمر فاروق عبد الله' : 'Omar Farouk Abdullah'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold text-[10px]">
                        MED
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">
                        {t('status.pending_approval')}
                      </span>
                    </td>
                    <td className="py-3 px-4">{isRtl ? 'نينوى' : 'Ninewa'}</td>
                    <td className="py-3 px-4">{isRtl ? 'سارة كريم' : 'Sara Karim'}</td>
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
