'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  Search,
  Filter,
  Plus,
  Clock,
  Tag,
  CheckCircle,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  MapPin,
  User,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';
import { useAuth } from '@/lib/auth-context';
import type { ProgrammeCode, CaseStatus } from '@humanity/contracts';
import { EmptyState } from '@/components/ui/empty-state';

interface CaseItem {
  id: string;
  reference: string;
  beneficiaryNameAr: string;
  beneficiaryNameEn: string;
  programmeCode: ProgrammeCode;
  status: CaseStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  governorateId: string;
  caseworkerName: string;
  updatedAt: string;
}

const PROGRAMMES: { code: ProgrammeCode; nameAr: string; nameEn: string }[] = [
  { code: 'FIN', nameAr: 'المساعدات المالية', nameEn: 'Financial Assistance' },
  { code: 'FOD', nameAr: 'الأمن الغذائي', nameEn: 'Food Security' },
  { code: 'MED', nameAr: 'الرعاية الصحية', nameEn: 'Medical Support' },
  { code: 'HOU', nameAr: 'المأوى والسكن', nameEn: 'Housing & Shelter' },
  { code: 'EDU', nameAr: 'التعليم والطفل', nameEn: 'Child Education' },
  { code: 'EMG', nameAr: 'الاستجابة الطارئة', nameEn: 'Emergency Relief' },
  { code: 'EMP', nameAr: 'سبل العيش والعمل', nameEn: 'Livelihoods' },
  { code: 'SOC', nameAr: 'الخدمات الاجتماعية', nameEn: 'Social Services' },
];

const INITIAL_CASES: CaseItem[] = [
  {
    id: '50000000-0000-0000-0000-000000000001',
    reference: 'CASE-2026-00001',
    beneficiaryNameAr: 'فاطمة جاسم محمد',
    beneficiaryNameEn: 'Fatima Jasim Mohammed',
    programmeCode: 'FIN',
    status: 'under_assessment',
    priority: 'urgent',
    governorateId: 'IQ-BG',
    caseworkerName: 'يوسف محمود عمر',
    updatedAt: '2026-11-12',
  },
  {
    id: '50000000-0000-0000-0000-000000000002',
    reference: 'CASE-2026-00002',
    beneficiaryNameAr: 'عمر فاروق عبد الله',
    beneficiaryNameEn: 'Omar Farouk Abdullah',
    programmeCode: 'MED',
    status: 'pending_approval',
    priority: 'high',
    governorateId: 'IQ-NI',
    caseworkerName: 'سارة كريم كاظم',
    updatedAt: '2026-11-13',
  },
  {
    id: '50000000-0000-0000-0000-000000000003',
    reference: 'CASE-2026-00003',
    beneficiaryNameAr: 'حسين علي رضا',
    beneficiaryNameEn: 'Hussein Ali Ridha',
    programmeCode: 'HOU',
    status: 'active_delivery',
    priority: 'medium',
    governorateId: 'IQ-BA',
    caseworkerName: 'يوسف محمود عمر',
    updatedAt: '2026-11-10',
  },
  {
    id: '50000000-0000-0000-0000-000000000004',
    reference: 'CASE-2026-00004',
    beneficiaryNameAr: 'مريم جواد كاظم',
    beneficiaryNameEn: 'Maryam Jawad Kazim',
    programmeCode: 'FOD',
    status: 'approved',
    priority: 'high',
    governorateId: 'IQ-NI',
    caseworkerName: 'سارة كريم كاظم',
    updatedAt: '2026-11-11',
  },
];

export default function CasesPage() {
  const { isRtl, t } = useLocale();
  const { user } = useAuth();

  const [cases, setCases] = useState<CaseItem[]>(INITIAL_CASES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgramme, setSelectedProgramme] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // New Case Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCaseData, setNewCaseData] = useState({
    beneficiaryNameAr: '',
    programmeCode: 'FIN' as ProgrammeCode,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    governorateId: 'IQ-BG',
    initialNotes: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Scoped filtering
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      if (selectedProgramme !== 'ALL' && c.programmeCode !== selectedProgramme) return false;
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) return false;

      // Staff geographic scope
      if (user?.governorates && user.governorates.length > 0) {
        if (!user.governorates.includes(c.governorateId)) return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.reference.toLowerCase().includes(q) ||
        c.beneficiaryNameAr.toLowerCase().includes(q) ||
        c.beneficiaryNameEn.toLowerCase().includes(q) ||
        c.caseworkerName.toLowerCase().includes(q)
      );
    });
  }, [cases, selectedProgramme, selectedStatus, searchQuery, user]);

  const totalRecords = filteredCases.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, currentPage, pageSize]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newCaseData.beneficiaryNameAr.trim()) {
      setCreateError(isRtl ? 'يرجى تحديد المستفيد.' : 'Please specify a beneficiary.');
      return;
    }

    const nextIdNum = cases.length + 1;
    const newCase: CaseItem = {
      id: `50000000-0000-0000-0000-${String(nextIdNum).padStart(12, '0')}`,
      reference: `CASE-2026-${String(nextIdNum).padStart(5, '0')}`,
      beneficiaryNameAr: newCaseData.beneficiaryNameAr,
      beneficiaryNameEn: newCaseData.beneficiaryNameAr,
      programmeCode: newCaseData.programmeCode,
      status: 'submitted',
      priority: newCaseData.priority,
      governorateId: newCaseData.governorateId,
      caseworkerName: user ? (isRtl ? user.fullNameAr : user.fullNameEn) : 'غير معين',
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setCases(prev => [newCase, ...prev]);
    setIsCreateOpen(false);
    setNewCaseData({
      beneficiaryNameAr: '',
      programmeCode: 'FIN',
      priority: 'medium',
      governorateId: 'IQ-BG',
      initialNotes: '',
    });
  };

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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRtl ? 'ملفات الحالات الإنسانية' : 'Humanitarian Cases'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRtl
                  ? 'إدارة دورة حياة الحالات والتقييمات الميدانية عبر القطاعات الإنسانية الثمانية'
                  : 'Manage case lifecycles, assignments, and approvals across the 8 official sectors'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'فتح حالة جديدة' : 'Open New Case'}</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={
                  isRtl
                    ? 'بحث برقم الحالة، اسم المستفيد، أو الباحث المسؤول...'
                    : 'Search by case #, beneficiary name, or caseworker...'
                }
                className="w-full text-xs ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Sector Filter */}
              <select
                value={selectedProgramme}
                onChange={e => {
                  setSelectedProgramme(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium"
              >
                <option value="ALL">{isRtl ? 'كافة البرامج (8)' : 'All Sectors (8)'}</option>
                {PROGRAMMES.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.code} - {isRtl ? p.nameAr : p.nameEn}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={e => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium"
              >
                <option value="ALL">{isRtl ? 'كافة المراحل' : 'All Statuses'}</option>
                <option value="draft">{t('status.draft')}</option>
                <option value="submitted">{t('status.submitted')}</option>
                <option value="under_assessment">{t('status.under_assessment')}</option>
                <option value="pending_approval">{t('status.pending_approval')}</option>
                <option value="approved">{t('status.approved')}</option>
                <option value="active_delivery">{t('status.active_delivery')}</option>
                <option value="closed">{t('status.closed')}</option>
              </select>

              <span className="text-xs text-slate-400 font-mono">
                {totalRecords} {isRtl ? 'حالة' : 'cases'}
              </span>
            </div>
          </div>

          {/* Cases Table */}
          {paginatedCases.length === 0 ? (
            <EmptyState
              title={isRtl ? 'لم يتم العثور على حالات مطابقة' : 'No cases found'}
              description={
                isRtl
                  ? 'لا توجد حالات مسجلة تطابق معايير البحث والقطاع الإنساني المختار.'
                  : 'No cases match the selected sector and search filters.'
              }
              actionLabel={isRtl ? 'فتح حالة جديدة' : 'Open Case'}
              onAction={() => setIsCreateOpen(true)}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4 text-start">{isRtl ? 'رقم الحالة' : 'Case #'}</th>
                      <th className="py-3.5 px-4 text-start">
                        {isRtl ? 'المستفيد الرئيسي' : 'Beneficiary'}
                      </th>
                      <th className="py-3.5 px-4 text-start">{isRtl ? 'البرنامج' : 'Sector'}</th>
                      <th className="py-3.5 px-4 text-start">{isRtl ? 'المرحلة' : 'Status'}</th>
                      <th className="py-3.5 px-4 text-start">{isRtl ? 'الأولوية' : 'Priority'}</th>
                      <th className="py-3.5 px-4 text-start">{isRtl ? 'المحافظة' : 'Location'}</th>
                      <th className="py-3.5 px-4 text-start">
                        {isRtl ? 'الباحث المسؤول' : 'Caseworker'}
                      </th>
                      <th className="py-3.5 px-4 text-center">{isRtl ? 'إجراء' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedCases.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          <Link
                            href={`/dashboard/cases/${c.id}`}
                            className="hover:text-emerald-600"
                          >
                            {c.reference}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {isRtl ? c.beneficiaryNameAr : c.beneficiaryNameEn}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                            {c.programmeCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              c.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.status === 'pending_approval'
                                  ? 'bg-amber-100 text-amber-800'
                                  : c.status === 'under_assessment'
                                    ? 'bg-blue-100 text-blue-800'
                                    : c.status === 'closed'
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t(`status.${c.status}`)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-semibold ${
                              c.priority === 'urgent'
                                ? 'text-rose-600'
                                : c.priority === 'high'
                                  ? 'text-amber-600'
                                  : 'text-slate-500'
                            }`}
                          >
                            {c.priority.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{c.governorateId}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{c.caseworkerName}</td>
                        <td className="py-3.5 px-4 text-center">
                          <Link
                            href={`/dashboard/cases/${c.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isRtl ? 'عرض الحالة' : 'Details'}</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                <div>
                  {isRtl
                    ? `عرض ${(currentPage - 1) * pageSize + 1} إلى ${Math.min(
                        currentPage * pageSize,
                        totalRecords,
                      )} من أصل ${totalRecords} حالة`
                    : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                        currentPage * pageSize,
                        totalRecords,
                      )} of ${totalRecords}`}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                    aria-label="Previous Page"
                  >
                    {isRtl ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronLeft className="w-4 h-4" />
                    )}
                  </button>
                  <span className="px-2 font-mono">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                    aria-label="Next Page"
                  >
                    {isRtl ? (
                      <ChevronLeft className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New Case Creation Modal */}
          {isCreateOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-case-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
            >
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 id="create-case-title" className="text-base font-bold text-slate-900">
                    {isRtl ? 'فتح حالة إنسانية جديدة' : 'Open New Humanitarian Case'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {createError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    {createError}
                  </div>
                )}

                <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl ? 'اسم المستفيد الرئيسي *' : 'Principal Beneficiary *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newCaseData.beneficiaryNameAr}
                      onChange={e =>
                        setNewCaseData({ ...newCaseData, beneficiaryNameAr: e.target.value })
                      }
                      placeholder={isRtl ? 'فاطمة جاسم محمد' : 'Beneficiary Name'}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {isRtl ? 'برنامج المساعدة *' : 'Assistance Sector *'}
                      </label>
                      <select
                        value={newCaseData.programmeCode}
                        onChange={e =>
                          setNewCaseData({
                            ...newCaseData,
                            programmeCode: e.target.value as ProgrammeCode,
                          })
                        }
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        {PROGRAMMES.map(p => (
                          <option key={p.code} value={p.code}>
                            {p.code} - {isRtl ? p.nameAr : p.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {isRtl ? 'درجة الأولوية *' : 'Priority *'}
                      </label>
                      <select
                        value={newCaseData.priority}
                        onChange={e =>
                          setNewCaseData({
                            ...newCaseData,
                            priority: e.target.value as any,
                          })
                        }
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="low">منخفضة (Low)</option>
                        <option value="medium">متوسطة (Medium)</option>
                        <option value="high">عالية (High)</option>
                        <option value="urgent">عاجلة / حرجة (Urgent)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl ? 'المحافظة *' : 'Governorate *'}
                    </label>
                    <select
                      value={newCaseData.governorateId}
                      onChange={e =>
                        setNewCaseData({ ...newCaseData, governorateId: e.target.value })
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="IQ-BG">بغداد (Baghdad)</option>
                      <option value="IQ-NI">نينوى (Ninewa)</option>
                      <option value="IQ-BA">البصرة (Basra)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRtl ? 'ملاحظات التقييم الأولي' : 'Initial Intake Notes'}
                    </label>
                    <textarea
                      rows={2}
                      value={newCaseData.initialNotes}
                      onChange={e =>
                        setNewCaseData({ ...newCaseData, initialNotes: e.target.value })
                      }
                      placeholder={
                        isRtl
                          ? 'تسجيل أولي للحالة بناء على الزيارة الميدانية...'
                          : 'Initial intake notes...'
                      }
                      className="w-full text-xs p-2 rounded-xl border border-slate-200"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 shadow-xs"
                    >
                      {isRtl ? 'إنشاء الحالة' : 'Create Case'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </RoleGuard>
    </AppShell>
  );
}
