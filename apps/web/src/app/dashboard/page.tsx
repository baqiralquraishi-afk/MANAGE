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
  LogOut,
  Layers,
  Search,
  PlusCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

const PROGRAMMES = [
  { code: 'FIN', nameAr: 'المساعدات المالية', nameEn: 'Financial Assistance', count: '3,420' },
  { code: 'FOD', nameAr: 'الأمن الغذائي', nameEn: 'Food Security', count: '2,890' },
  { code: 'MED', nameAr: 'الرعاية الصحية', nameEn: 'Medical Support', count: '1,150' },
  { code: 'HOU', nameAr: 'المأوى والسكن', nameEn: 'Housing & Shelter', count: '840' },
  { code: 'EDU', nameAr: 'التعليم والطفل', nameEn: 'Child Education', count: '920' },
  { code: 'EMG', nameAr: 'الاستجابة الطارئة', nameEn: 'Emergency Relief', count: '410' },
  { code: 'EMP', nameAr: 'سبل العيش والعمل', nameEn: 'Livelihoods', count: '380' },
  { code: 'SOC', nameAr: 'الخدمات الاجتماعية', nameEn: 'Social Services', count: '670' },
];

export default function DashboardPage() {
  const [locale, setLocale] = useState<'ar' | 'en'>('ar');
  const isAr = locale === 'ar';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">
              إ
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {isAr ? 'منصة إنسانية — لوحة التحكم' : 'Humanity Platform — Admin Console'}
              </h1>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'جمهورية العراق · مكتب التنسيق' : 'Republic of Iraq · Coordination Office'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocale(isAr ? 'en' : 'ar')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
            >
              {isAr ? 'English (LTR)' : 'عربي (RTL)'}
            </button>

            <div className="hidden sm:flex items-center gap-2 border-s border-slate-200 ps-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                علي
              </div>
              <div className="text-start">
                <p className="text-xs font-semibold text-slate-800">
                  {isAr ? 'سارة كريم (مشرفة بغداد)' : 'Sara Karim (Supervisor)'}
                </p>
                <span className="inline-block text-[10px] text-emerald-700 font-medium">
                  Baghdad HQ · Level 1
                </span>
              </div>
            </div>

            <Link
              href="/login"
              className="text-xs font-medium text-slate-500 hover:text-rose-600 flex items-center gap-1 ps-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? 'خروج' : 'Logout'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                {isAr ? 'إجمالي المستفيدين المسجلين' : 'Total Registered Beneficiaries'}
              </p>
              <h3 className="text-2xl font-bold text-slate-900">10,680</h3>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> +140 هذا الأسبوع
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                {isAr ? 'الحالات النشطة والمفتوحة' : 'Active Open Cases'}
              </p>
              <h3 className="text-2xl font-bold text-slate-900">1,248</h3>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5" /> 82 قيد التقييم الميداني
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <FolderGit2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                {isAr ? 'تدقيق التشابه والازدواجية' : 'Pending Duplicate Reviews'}
              </p>
              <h3 className="text-2xl font-bold text-amber-600">14</h3>
              <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> بحاجة لقرار إشرافي
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                {isAr ? 'اعتمادات الصرف المالي (Maker-Checker)' : 'Financial Approvals Queue'}
              </p>
              <h3 className="text-2xl font-bold text-emerald-700">6</h3>
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3.5 h-3.5" /> تدقيق ثنائي إلزامي
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder={
                isAr
                  ? 'بحث بالاسم الرباعي، رقم البطاقة الوطنية، أو رقم الهاتف...'
                  : 'Search by Arabic name, National ID, or Phone...'
              }
              className="block w-full ps-9 pe-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm transition-colors">
              <PlusCircle className="w-4 h-4" />
              <span>{isAr ? 'تسجيل مستفيد جديد' : 'New Beneficiary Intake'}</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors">
              <Layers className="w-4 h-4" />
              <span>{isAr ? 'تصدير التقارير' : 'Scoped Reports'}</span>
            </button>
          </div>
        </div>

        {/* Programmes Breakdown */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            {isAr
              ? 'البرامج الإنسانية الثمانية النشطة (8 Active Programmes)'
              : 'Eight Active Humanitarian Sectors'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PROGRAMMES.map(p => (
              <div
                key={p.code}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800">
                    {p.code}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">{p.count} حالة</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{isAr ? p.nameAr : p.nameEn}</h4>
                <p className="text-[11px] text-slate-400 mt-1">{isAr ? p.nameEn : p.nameAr}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
