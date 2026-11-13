'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';

const SYNTHETIC_STAFF_ACCOUNTS = [
  {
    role: 'مشرف بغداد (Supervisor)',
    email: 'supervisor.baghdad@humanity.local',
    badge: 'supervisor',
  },
  {
    role: 'باحث نينوى (Caseworker)',
    email: 'caseworker.ninewa@humanity.local',
    badge: 'caseworker',
  },
  {
    role: 'منظم المعاملات (Finance Maker)',
    email: 'finance.maker@humanity.local',
    badge: 'finance_maker',
  },
  {
    role: 'المدقق المالي (Finance Checker)',
    email: 'finance.checker@humanity.local',
    badge: 'finance_checker',
  },
  {
    role: 'مدقق الالتزام (Auditor)',
    email: 'auditor@humanity.local',
    badge: 'auditor',
  },
  {
    role: 'مسؤول أمن النظام (Admin)',
    email: 'security.admin@humanity.local',
    badge: 'security_admin',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locale, setLocale] = useState<'ar' | 'en'>('ar');

  const isAr = locale === 'ar';

  const handleQuickSelect = (staffEmail: string) => {
    setEmail(staffEmail);
    setPassword('DemoPassword2026!');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Demonstration session sign-in
    setTimeout(() => {
      router.push('/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
            <Shield className="w-9 h-9" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          {isAr ? 'منصة إنسانية — بوابة الموظفين' : 'Humanity Platform — Staff Portal'}
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          {isAr
            ? 'نظام إدارة الحالات الإنسانية الموحد (جمهورية العراق)'
            : 'Unified Humanitarian Case Management System (Iraq)'}
        </p>

        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setLocale(isAr ? 'en' : 'ar')}
            className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 hover:bg-emerald-100"
          >
            {isAr ? 'Switch to English (LTR)' : 'التحويل إلى العربية (RTL)'}
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 sm:px-10">
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                {isAr ? 'البريد الإلكتروني الوظيفي' : 'Official Staff Email'}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="staff@humanity.local"
                  className="block w-full ps-10 pe-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                {isAr ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full ps-10 pe-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {isSubmitting
                ? isAr
                  ? 'جاري التحقق...'
                  : 'Authenticating...'
                : isAr
                  ? 'تسجيل الدخول'
                  : 'Sign In'}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              {isAr ? 'حسابات الاختبار التجريبية (Demo Roles)' : 'Synthetic Test Accounts'}
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {SYNTHETIC_STAFF_ACCOUNTS.map(staff => (
                <button
                  key={staff.email}
                  type="button"
                  onClick={() => handleQuickSelect(staff.email)}
                  className="text-start px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 transition-colors flex justify-between items-center"
                >
                  <span className="font-medium text-slate-800">{staff.role}</span>
                  <span className="text-slate-400 font-mono text-[10px]">{staff.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
            >
              {isAr ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
