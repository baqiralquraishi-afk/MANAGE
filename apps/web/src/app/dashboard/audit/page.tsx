'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  AlertTriangle,
  UserCheck,
  FileText,
  DollarSign,
  Key,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';
import { BidiText, formatDate, formatIdentifier } from '@/lib/formatters';

interface MockAuditEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  category:
    | 'access_control'
    | 'security_violation'
    | 'case_mutation'
    | 'document_access'
    | 'financial_transaction'
    | 'role_management';
  actionName: string;
  targetTable: string;
  entityId: string;
  details: string;
}

const INITIAL_AUDIT_LOGS: MockAuditEntry[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    timestamp: '2026-11-13T14:10:02Z',
    actorName: 'سارة كريم / Sara Kareem',
    actorRole: 'supervisor',
    category: 'case_mutation',
    actionName: 'CASE_STATUS_CHANGED',
    targetTable: 'cases',
    entityId: 'HUM-2026-FIN-00001',
    details: 'الموافقة على خطة المساعدة المالية الطارئة بعد استيفاء تقييم الاحتياج',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    timestamp: '2026-11-13T14:15:30Z',
    actorName: 'حيدر مهدي / Haidar Mehdi',
    actorRole: 'finance_checker',
    category: 'financial_transaction',
    actionName: 'FINANCIAL_DISBURSEMENT_RELEASED',
    targetTable: 'finance_ledger',
    entityId: 'TX-2026-IQ-00912',
    details: 'صرف دفعة نقدية 250,000 د.ع للحالة المعتمدة وفق تفويض المشرف',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    timestamp: '2026-11-13T14:22:15Z',
    actorName: 'علي حسين / Ali Hussein',
    actorRole: 'security_admin',
    category: 'role_management',
    actionName: 'STAFF_ROLE_ASSIGNED',
    targetTable: 'staff_roles',
    entityId: 'STF-003',
    details: 'ترقية باحث ميداني إلى مشرف مؤقت لدعم مخيم السلام في نينوى',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000004',
    timestamp: '2026-11-13T14:35:40Z',
    actorName: 'عمر طارق / Omar Tariq',
    actorRole: 'caseworker',
    category: 'document_access',
    actionName: 'SENSITIVE_RECORD_ACCESSED',
    targetTable: 'beneficiaries',
    entityId: 'IQ-1988-76543210',
    details: 'تدقيق وثائق الثبوتية وصون وحماية الفئات المستضعفة',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000005',
    timestamp: '2026-11-13T14:48:12Z',
    actorName: 'نظام الحماية الآلي / Security Watchdog',
    actorRole: 'system',
    category: 'security_violation',
    actionName: 'UNAUTHORIZED_CROSS_SCOPE_ATTEMPT',
    targetTable: 'cases',
    entityId: 'HUM-2026-FOD-00044',
    details: 'محاولة وصول لبيانات خارج نطاق محافظة نينوى - تم حظر العملية',
  },
];

export default function AuditPage() {
  const { t, isRtl, locale } = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return INITIAL_AUDIT_LOGS.filter(log => {
      const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
      const matchesSearch =
        searchTerm.trim() === '' ||
        log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

  const handleExport = () => {
    // Generate auditable export payload
    const exportData = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExportMessage(t('audit.export_success'));
    setTimeout(() => setExportMessage(null), 4000);
  };

  const getCategoryBadge = (category: MockAuditEntry['category']) => {
    switch (category) {
      case 'security_violation':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
            <AlertTriangle className="w-3 h-3" />
            {t('audit.security_violation')}
          </span>
        );
      case 'financial_transaction':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            <DollarSign className="w-3 h-3" />
            {t('audit.financial_transaction')}
          </span>
        );
      case 'role_management':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
            <Key className="w-3 h-3" />
            {t('audit.role_management')}
          </span>
        );
      case 'document_access':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
            <FileText className="w-3 h-3" />
            {t('audit.document_access')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
            <UserCheck className="w-3 h-3" />
            {t('audit.case_mutation')}
          </span>
        );
    }
  };

  return (
    <AppShell>
      <RoleGuard allowedRoles={['auditor', 'security_admin']}>
        <div className="space-y-6">
          {/* Header & Export Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t('audit.title')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t('audit.subtitle')}</p>
            </div>
            <button
              onClick={handleExport}
              aria-label={t('audit.export')}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{t('audit.export')}</span>
            </button>
          </div>

          {/* Export Notification Banner */}
          {exportMessage && (
            <div
              role="status"
              className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportMessage}</span>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <label htmlFor="audit-search" className="sr-only">
                {t('common.search')}
              </label>
              <Search
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`}
              />
              <input
                id="audit-search"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={
                  isRtl
                    ? 'بحث في الفاعل، المعرف، نوع العملية، التفاصيل...'
                    : 'Search actor, record ID, action, details...'
                }
                className={`w-full min-h-[44px] text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:outline-hidden ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <label htmlFor="audit-category-select" className="sr-only">
                {t('audit.all_categories')}
              </label>
              <select
                id="audit-category-select"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="min-h-[44px] px-3 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:outline-hidden cursor-pointer"
              >
                <option value="all">{t('audit.all_categories')}</option>
                <option value="case_mutation">{t('audit.case_mutation')}</option>
                <option value="financial_transaction">{t('audit.financial_transaction')}</option>
                <option value="role_management">{t('audit.role_management')}</option>
                <option value="document_access">{t('audit.document_access')}</option>
                <option value="security_violation">{t('audit.security_violation')}</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th scope="col" className="py-3 px-4 text-start">
                      {isRtl ? 'الوقت والتاريخ' : 'Timestamp'}
                    </th>
                    <th scope="col" className="py-3 px-4 text-start">
                      {isRtl ? 'المستخدم والصفة' : 'Actor & Role'}
                    </th>
                    <th scope="col" className="py-3 px-4 text-start">
                      {isRtl ? 'الفئة' : 'Category'}
                    </th>
                    <th scope="col" className="py-3 px-4 text-start">
                      {isRtl ? 'العملية' : 'Action'}
                    </th>
                    <th scope="col" className="py-3 px-4 text-start">
                      {isRtl ? 'معرف السجل' : 'Record ID'}
                    </th>
                    <th scope="col" className="py-3 px-4 text-start">
                      {isRtl ? 'تفاصيل المبرر' : 'Details & Justification'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        {t('common.empty')}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          <BidiText>{formatDate(log.timestamp, locale, true)}</BidiText>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div>{log.actorName}</div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getCategoryBadge(log.category)}
                        </td>
                        <td className="py-3.5 px-4">
                          <BidiText className="text-[11px] font-semibold text-slate-800">
                            {log.actionName}
                          </BidiText>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          <BidiText className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {log.entityId}
                          </BidiText>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs text-xs">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </RoleGuard>
    </AppShell>
  );
}
