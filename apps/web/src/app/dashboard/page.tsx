'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  TrendingUp,
  Layers,
  Search,
  PlusCircle,
  Clock,
  ShieldCheck,
  Building,
  HeartHandshake,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/lib/auth-context';
import { useLocale } from '@/lib/locale-context';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

const PROGRAMMES = [
  {
    code: 'FIN',
    nameAr: 'المساعدات المالية',
    nameEn: 'Financial Assistance',
    count: '3,420',
    budget: '150,000,000 IQD',
  },
  {
    code: 'FOD',
    nameAr: 'الأمن الغذائي',
    nameEn: 'Food Security',
    count: '2,890',
    budget: '85,000,000 IQD',
  },
  {
    code: 'MED',
    nameAr: 'الرعاية الصحية',
    nameEn: 'Medical Support',
    count: '1,150',
    budget: '42,000,000 IQD',
  },
  {
    code: 'HOU',
    nameAr: 'المأوى والسكن',
    nameEn: 'Housing & Shelter',
    count: '840',
    budget: '65,000,000 IQD',
  },
  {
    code: 'EDU',
    nameAr: 'التعليم والطفل',
    nameEn: 'Child Education',
    count: '920',
    budget: '30,000,000 IQD',
  },
  {
    code: 'EMG',
    nameAr: 'الاستجابة الطارئة',
    nameEn: 'Emergency Relief',
    count: '410',
    budget: '55,000,000 IQD',
  },
  {
    code: 'EMP',
    nameAr: 'سبل العيش والعمل',
    nameEn: 'Livelihoods',
    count: '380',
    budget: '48,000,000 IQD',
  },
  {
    code: 'SOC',
    nameAr: 'الخدمات الاجتماعية',
    nameEn: 'Social Services',
    count: '670',
    budget: '25,000,000 IQD',
  },
];

export default function DashboardPage() {
  const { user, activeRole, isLoading } = useAuth();
  const { isRtl, t } = useLocale();

  const [activeTab, setActiveTab] = useState<'overview' | 'test_states'>('overview');
  const [testStateMode, setTestStateMode] = useState<'loading' | 'empty' | 'error'>('loading');

  if (isLoading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                {activeRole ? t(`role.${activeRole}`) : ''}
              </span>
              <span className="text-xs text-slate-400">
                {isRtl ? 'جلسة خادم آمنة · ضوابط RLS مفعلة' : 'Secure Session · RLS Enforced'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {isRtl
                ? `مرحباً، ${user?.fullNameAr || 'المستخدم'}`
                : `Welcome, ${user?.fullNameEn || 'Staff'}`}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isRtl
                ? 'مركز إدارة ومتابعة ملفات المستفيدين والإجراءات الرقابية والمالية'
                : 'Centralized operations, approvals, and humanitarian verification console'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isRtl ? 'لوحة المؤشرات' : 'Overview'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('test_states')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'test_states'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isRtl ? 'معاينة حالات الواجهة' : 'UI States Demo'}
            </button>
          </div>
        </div>

        {activeTab === 'test_states' ? (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTestStateMode('loading')}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  testStateMode === 'loading'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {isRtl ? 'حالة التحميل (Loading)' : 'Loading State'}
              </button>
              <button
                type="button"
                onClick={() => setTestStateMode('empty')}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  testStateMode === 'empty'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {isRtl ? 'حالة الفراغ (Empty)' : 'Empty State'}
              </button>
              <button
                type="button"
                onClick={() => setTestStateMode('error')}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  testStateMode === 'error'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {isRtl ? 'حالة الخطأ (Error)' : 'Error State'}
              </button>
            </div>

            {testStateMode === 'loading' && <LoadingState rows={4} />}
            {testStateMode === 'empty' && (
              <EmptyState
                title={isRtl ? 'لا توجد سجلات مطابقة' : 'No matching records found'}
                description={
                  isRtl
                    ? 'لم يتم العثور على أية ملفات في هذا النطاق الجغرافي حالياً.'
                    : 'No cases or beneficiary files found in this geographic scope.'
                }
                actionLabel={isRtl ? 'إضافة تسجيل جديد' : 'New Intake Registration'}
                onAction={() => alert('Demo action triggered')}
              />
            )}
            {testStateMode === 'error' && (
              <ErrorState
                title={isRtl ? 'فشل تحميل السجلات الإحصائية' : 'Failed to fetch analytics'}
                message={
                  isRtl
                    ? 'انتهت مهلة استجابة الخادم أثناء التحقق من بصمات الازدواجية.'
                    : 'Server request timed out while cross-verifying duplicate records.'
                }
                onRetry={() => alert('Retry clicked')}
              />
            )}
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    {isRtl ? 'إجمالي المستفيدين المسجلين' : 'Registered Beneficiaries'}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">10,680</h3>
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3.5 h-3.5" />{' '}
                    {isRtl ? '+140 هذا الأسبوع' : '+140 this week'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    {isRtl ? 'الحالات والملفات النشطة' : 'Active Cases'}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">4,215</h3>
                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                    <Layers className="w-3.5 h-3.5" />{' '}
                    {isRtl ? '8 برامج معتمدة' : 'Across 8 sectors'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FolderGit2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    {isRtl ? 'بانتظار الاعتماد المزدوج' : 'Pending Approvals'}
                  </p>
                  <h3 className="text-2xl font-bold text-amber-600">38</h3>
                  <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5" />{' '}
                    {isRtl ? 'تحت تدقيق المشرف/المالية' : 'Maker-Checker Queue'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    {isRtl ? 'المعاملات المالية المصروفة' : 'Disbursed (IQD)'}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">445M</h3>
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5" />{' '}
                    {isRtl ? 'سجل محاسبي غير قابل للتعديل' : 'Immutable Ledger'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FileCheck className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Eight Programmes Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isRtl
                      ? 'برامج المساعدة الإنسانية الثمانية'
                      : 'The Eight Humanitarian Assistance Sectors'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isRtl
                      ? 'توزيع المستفيدين والتمويل المعتمد حسب القطاعات'
                      : 'Beneficiary allocation and budget per sector'}
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                  {isRtl ? 'العراق 2026' : 'Iraq 2026'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PROGRAMMES.map(prog => (
                  <div
                    key={prog.code}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {prog.code}
                      </span>
                      <span className="text-xs font-bold text-emerald-700">{prog.count}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 leading-snug">
                      {isRtl ? prog.nameAr : prog.nameEn}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 font-mono">{prog.budget}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
