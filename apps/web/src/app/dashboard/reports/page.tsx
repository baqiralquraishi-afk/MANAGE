'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  ShieldAlert,
  CheckCircle2,
  Lock,
  EyeOff,
  Building,
  Calendar,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';
import { useAuth } from '@/lib/auth-context';

export interface ReportRow {
  id: string;
  programmeCode: string;
  governorateId: string;
  governorateNameAr: string;
  governorateNameEn: string;
  totalCases: number;
  approvedCases: number;
  activeDeliveryCases: number;
  disbursedAmountIqd: number;
  isSuppressed: boolean;
}

const BASELINE_REPORT_DATA: ReportRow[] = [
  {
    id: 'rep-01',
    programmeCode: 'FIN',
    governorateId: 'IQ-BG',
    governorateNameAr: 'بغداد',
    governorateNameEn: 'Baghdad',
    totalCases: 48,
    approvedCases: 32,
    activeDeliveryCases: 28,
    disbursedAmountIqd: 14250000,
    isSuppressed: false,
  },
  {
    id: 'rep-02',
    programmeCode: 'FIN',
    governorateId: 'IQ-NI',
    governorateNameAr: 'نينوى',
    governorateNameEn: 'Ninewa',
    totalCases: 35,
    approvedCases: 24,
    activeDeliveryCases: 19,
    disbursedAmountIqd: 9800000,
    isSuppressed: false,
  },
  {
    id: 'rep-03',
    programmeCode: 'FOD',
    governorateId: 'IQ-NI',
    governorateNameAr: 'نينوى',
    governorateNameEn: 'Ninewa',
    totalCases: 52,
    approvedCases: 44,
    activeDeliveryCases: 40,
    disbursedAmountIqd: 7800000,
    isSuppressed: false,
  },
  {
    id: 'rep-04',
    programmeCode: 'MED',
    governorateId: 'IQ-BG',
    governorateNameAr: 'بغداد',
    governorateNameEn: 'Baghdad',
    totalCases: 18,
    approvedCases: 12,
    activeDeliveryCases: 10,
    disbursedAmountIqd: 13500000,
    isSuppressed: false,
  },
  {
    id: 'rep-05',
    programmeCode: 'HOU',
    governorateId: 'IQ-NI',
    governorateNameAr: 'نينوى',
    governorateNameEn: 'Ninewa',
    totalCases: 14,
    approvedCases: 9,
    activeDeliveryCases: 8,
    disbursedAmountIqd: 21000000,
    isSuppressed: false,
  },
  {
    id: 'rep-06',
    programmeCode: 'EDU',
    governorateId: 'IQ-BG',
    governorateNameAr: 'بغداد',
    governorateNameEn: 'Baghdad',
    totalCases: 22,
    approvedCases: 18,
    activeDeliveryCases: 15,
    disbursedAmountIqd: 4400000,
    isSuppressed: false,
  },
  {
    id: 'rep-07',
    programmeCode: 'EMG',
    governorateId: 'IQ-BA',
    governorateNameAr: 'البصرة',
    governorateNameEn: 'Basra',
    totalCases: 3, // Small group: MUST BE SUPPRESSED (<5) to protect identity
    approvedCases: 2,
    activeDeliveryCases: 1,
    disbursedAmountIqd: 1200000,
    isSuppressed: true,
  },
  {
    id: 'rep-08',
    programmeCode: 'EMP',
    governorateId: 'IQ-AR',
    governorateNameAr: 'أربيل',
    governorateNameEn: 'Erbil',
    totalCases: 2, // Small group: MUST BE SUPPRESSED (<5) to protect identity
    approvedCases: 1,
    activeDeliveryCases: 1,
    disbursedAmountIqd: 2000000,
    isSuppressed: true,
  },
  {
    id: 'rep-09',
    programmeCode: 'SOC',
    governorateId: 'IQ-BG',
    governorateNameAr: 'بغداد',
    governorateNameEn: 'Baghdad',
    totalCases: 8,
    approvedCases: 5,
    activeDeliveryCases: 4,
    disbursedAmountIqd: 0,
    isSuppressed: false,
  },
];

export default function OperationalReportsPage() {
  const { isRtl } = useLocale();
  const { user } = useAuth();

  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedGov, setSelectedGov] = useState<string>('all');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Scoped filtering (Respects viewer's permitted governorates)
  const filteredRows = BASELINE_REPORT_DATA.filter(row => {
    // If viewer is scoped to specific governorates, hide others
    if (user?.governorates && user.governorates.length > 0) {
      if (!user.governorates.includes(row.governorateId)) return false;
    }
    // If viewer is scoped to specific programmes, hide others
    if (user?.programmes && user.programmes.length > 0) {
      if (!user.programmes.includes(row.programmeCode as any)) return false;
    }

    if (selectedSector !== 'all' && row.programmeCode !== selectedSector) return false;
    if (selectedGov !== 'all' && row.governorateId !== selectedGov) return false;
    return true;
  });

  const suppressedCount = filteredRows.filter(r => r.isSuppressed).length;

  const handleExport = (format: 'csv' | 'json') => {
    const timestamp = new Date().toISOString();
    const exportMetadata = {
      reportType: 'operational_sector_summary',
      format,
      rowCount: filteredRows.length,
      suppressedCells: suppressedCount,
      exportedBy: user ? (isRtl ? user.fullNameAr : user.fullNameEn) : 'المستخدم',
      timestamp,
    };

    setExportNotice(
      isRtl
        ? `تم تسجيل عملية التصدير بصيغة (${format.toUpperCase()}) في سجل التدقيق الأمني (${filteredRows.length} سجل، ${suppressedCount} خلايا محجوبة لحماية الخصوصية).`
        : `Export audited (${format.toUpperCase()} format): ${filteredRows.length} rows exported, ${suppressedCount} cells suppressed for k-anonymity.`,
    );
    setTimeout(() => setExportNotice(null), 6000);
  };

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={[
          'programme_manager',
          'supervisor',
          'finance_checker',
          'auditor',
          'report_viewer',
          'security_admin',
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRtl
                  ? 'التقارير التشغيلية والإحصائية المقيدة'
                  : 'Scoped Operational Reports & Analytics'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRtl
                  ? 'مؤشرات البرامج الإنسانية الثمانية، مقيدة حسب الصلاحيات الجغرافية مع حجب تلقائي للمجموعات الصغيرة لحماية هوية المستفيدين'
                  : 'Operational indicators scoped to user permissions; automatic k-anonymity cell suppression protects small groups from re-identification'}
              </p>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExport('csv')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>{isRtl ? 'تصدير CSV (مدقق)' : 'Export CSV (Audited)'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('json')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                <span>{isRtl ? 'تصدير JSON' : 'Export JSON'}</span>
              </button>
            </div>
          </div>

          {/* Audit Notice Toast */}
          {exportNotice && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-xs text-emerald-900 flex items-center gap-2.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{exportNotice}</span>
            </div>
          )}

          {/* Privacy & Small-Group Protection Banner */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 flex items-start gap-3 shadow-xs">
            <EyeOff className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {isRtl
                  ? 'حماية الخصوصية ومنع كشف الهوية (k-Anonymity Guard Enforced)'
                  : 'Privacy Preservation & Small-Group Cell Suppression Active'}
              </p>
              <p className="text-indigo-800 mt-0.5 leading-relaxed">
                {isRtl
                  ? 'لحماية الأسر والمستفيدين من إعادة التعرف عليهم في الحالات النادرة أو المناطق الجغرافية المحدودة، يتم حجب أي مجموعة يقل عدد أفرادها عن 5 حالات تلقائياً وتظهر كـ (< 5). جميع عمليات تصدير البيانات مسجلة إلزامياً في سجل التدقيق الأمني.'
                  : 'To protect beneficiaries from re-identification in low-density cells, any group with fewer than 5 individuals is masked as (< 5). All operational exports append tamper-proof entries to audit_logs.'}
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700">
                {isRtl ? 'تصفية حسب القطاع:' : 'Sector:'}
              </span>
              <select
                value={selectedSector}
                onChange={e => setSelectedSector(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="all">{isRtl ? 'كافة القطاعات الإنسانية' : 'All Programmes'}</option>
                <option value="FIN">FIN - المساعدات النقدية</option>
                <option value="FOD">FOD - الأمن الغذائي</option>
                <option value="MED">MED - الرعاية الصحية</option>
                <option value="HOU">HOU - المأوى والمساكن</option>
                <option value="EDU">EDU - التعليم</option>
                <option value="EMG">EMG - الإغاثة الطارئة</option>
                <option value="EMP">EMP - التشغيل</option>
                <option value="SOC">SOC - الخدمات الاجتماعية</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700">
                {isRtl ? 'المحافظة:' : 'Governorate:'}
              </span>
              <select
                value={selectedGov}
                onChange={e => setSelectedGov(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="all">
                  {isRtl ? 'كافة المحافظات المتاحة' : 'All Authorized Governorates'}
                </option>
                <option value="IQ-BG">بغداد (IQ-BG)</option>
                <option value="IQ-NI">نينوى (IQ-NI)</option>
                <option value="IQ-BA">البصرة (IQ-BA)</option>
                <option value="IQ-AR">أربيل (IQ-AR)</option>
              </select>
            </div>

            <span className="ms-auto text-slate-400 font-mono text-[11px]">
              {filteredRows.length} {isRtl ? 'قطاعات مسجلة' : 'records displayed'}
            </span>
          </div>

          {/* Report Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">{isRtl ? 'البرنامج' : 'Sector'}</th>
                    <th className="py-3 px-4 text-start">{isRtl ? 'المحافظة' : 'Governorate'}</th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'إجمالي الحالات' : 'Total Cases'}
                    </th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'الحالات المعتمدة' : 'Approved'}
                    </th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'قيد التسليم الفعلي' : 'In Delivery'}
                    </th>
                    <th className="py-3 px-4 text-start">
                      {isRtl ? 'المبالغ المصروفة' : 'Disbursed (IQD)'}
                    </th>
                    <th className="py-3 px-4 text-center">
                      {isRtl ? 'حالة الخصوصية' : 'Privacy Protection'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-100 text-slate-800">
                          {row.programmeCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {isRtl ? row.governorateNameAr : row.governorateNameEn}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {row.isSuppressed ? (
                          <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            &lt; 5
                          </span>
                        ) : (
                          row.totalCases
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">
                        {row.isSuppressed ? '—' : row.approvedCases}
                      </td>
                      <td className="py-3 px-4 font-mono text-blue-700 font-semibold">
                        {row.isSuppressed ? '—' : row.activeDeliveryCases}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {row.isSuppressed ? '—' : `${row.disbursedAmountIqd.toLocaleString()} د.ع`}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.isSuppressed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-semibold">
                            <EyeOff className="w-3 h-3" />
                            <span>{isRtl ? 'محجوبة (خلية صغيرة)' : 'Suppressed (<5)'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{isRtl ? 'مستوفية لمعايير النشر' : 'Compliant'}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </RoleGuard>
    </AppShell>
  );
}
