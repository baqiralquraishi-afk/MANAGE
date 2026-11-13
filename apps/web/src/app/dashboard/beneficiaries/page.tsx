'use client';

import React from 'react';
import { Users, Search, Plus, Filter, MapPin } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';

export default function BeneficiariesPage() {
  const { isRtl } = useLocale();

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={[
          'intake',
          'caseworker',
          'supervisor',
          'programme_manager',
          'auditor',
          'report_viewer',
        ]}
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRtl ? 'سجل المستفيدين والأسر' : 'Beneficiary & Household Registry'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRtl
                  ? 'إدارة السجلات المدنية والأسر المستفيدة في نطاق المحافظات المعتمدة'
                  : 'Manage civil records and beneficiary households within authorized governorate scope'}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'تسجيل مستفيد جديد' : 'New Registration'}</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-slate-400" />
              <input
                type="text"
                placeholder={
                  isRtl
                    ? 'بحث بالاسم الثلاثي، رقم الهوية الوطنية، أو رقم الهاتف...'
                    : 'Search by name, national ID, or phone...'
                }
                className="w-full text-xs ps-9 pe-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{isRtl ? 'المحافظة' : 'Governorate'}</span>
              </button>
            </div>
          </div>

          {/* Synthetic Demo Beneficiary Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">{isRtl ? 'المستفيد' : 'Beneficiary'}</th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'الهوية الوطنية' : 'National ID'}
                    </th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'المحافظة / القضاء' : 'Location'}
                    </th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'عدد أفراد الأسرة' : 'Family Size'}
                    </th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {isRtl ? 'فاطمة جاسم محمد' : 'Fatima Jasim Mohammed'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">198512345678</td>
                    <td className="py-3 px-4 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{isRtl ? 'بغداد · الكرخ' : 'Baghdad · Karkh'}</span>
                    </td>
                    <td className="py-3 px-4">5</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {isRtl ? 'نشط' : 'Active'}
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {isRtl ? 'عمر فاروق عبد الله' : 'Omar Farouk Abdullah'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">199087654321</td>
                    <td className="py-3 px-4 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{isRtl ? 'نينوى · الموصل' : 'Ninewa · Mosul'}</span>
                    </td>
                    <td className="py-3 px-4">4</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {isRtl ? 'نشط' : 'Active'}
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {isRtl ? 'حسين علي رضا' : 'Hussein Ali Ridha'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">197823456789</td>
                    <td className="py-3 px-4 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{isRtl ? 'البصرة · المعقل' : 'Basra · Maqal'}</span>
                    </td>
                    <td className="py-3 px-4">6</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {isRtl ? 'نشط' : 'Active'}
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
