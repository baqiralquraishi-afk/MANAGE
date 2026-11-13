'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Check } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';

export default function ApprovalsPage() {
  const { isRtl } = useLocale();

  return (
    <AppShell>
      <RoleGuard allowedRoles={['supervisor', 'programme_manager']}>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isRtl ? 'قائمة الاعتمادات وقرارات الأهلية' : 'Approvals & Eligibility Queue'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRtl
                ? 'مراجعة توصيات التقييم الميداني وإصدار قرارات الاعتماد أو الرفض أو طلب معلومات إضافية'
                : 'Review caseworker recommendations to approve, reject, or request reassessment'}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {isRtl ? 'قيد التدقيق الرقابي المزدوج' : 'Dual-Authorization Policy'}
              </p>
              <p className="text-amber-800 mt-0.5">
                {isRtl
                  ? 'يمنع النظام تقنياً وبموجب قاعدة البيانات قيام الباحث باعتماد التوصية الصادرة منه بصورة ذاتية.'
                  : 'Database rules prohibit self-approval (the caseworker proposing an assessment cannot approve it).'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">{isRtl ? 'رقم الحالة' : 'Case #'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'البرنامج' : 'Sector'}</th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'المساعدة المقترحة' : 'Proposed Assistance'}
                    </th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'درجة الاحتياج' : 'Score'}</th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'الباحث المقدم' : 'Maker Caseworker'}
                    </th>
                    <th className="py-3 px-4 text-center">{isRtl ? 'الإجراء' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      CASE-2026-0002
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                        FIN
                      </span>
                    </td>
                    <td className="py-3 px-4">منحة طارئة (250,000 د.ع)</td>
                    <td className="py-3 px-4 font-semibold text-rose-600">85 / 100 (حرج)</td>
                    <td className="py-3 px-4">يوسف محمود عمر</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-500 inline-flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>{isRtl ? 'اعتماد' : 'Approve'}</span>
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>{isRtl ? 'رفض' : 'Reject'}</span>
                        </button>
                      </div>
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
