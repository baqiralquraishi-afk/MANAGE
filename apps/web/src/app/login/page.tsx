'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { useAuth, DEMO_STAFF_REGISTRY } from '@/lib/auth-context';
import { useLocale } from '@/lib/locale-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const { locale, isRtl, toggleLocale, t } = useLocale();

  const [email, setEmail] = useState('supervisor.baghdad@humanity.local');
  const [password, setPassword] = useState('DemoPassword2026!');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleQuickSelect = (staffEmail: string) => {
    setEmail(staffEmail);
    setPassword('DemoPassword2026!');
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const success = await login(email);
      if (success) {
        router.push('/dashboard');
      } else {
        setError(
          isRtl
            ? 'البريد الإلكتروني غير مسجل ضمن سجل الكادر المصرح له. يرجى اختيار حساب من القائمة أدناه.'
            : 'Unrecognized staff email. Please select a valid staff account from the list below.',
        );
      }
    } catch {
      setError(
        isRtl ? 'تعذر التحقق من بيانات الدخول حالياً.' : 'Authentication failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={locale}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
            <Shield className="w-9 h-9" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          {t('app.title', 'منصة إنسانية')} — {t('nav.staff_admin', 'بوابة الموظفين')}
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          {t('app.subtitle', 'نظام إدارة المستفيدين والحالات (العراق)')}
        </p>

        {/* Locale toggle on login screen */}
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={toggleLocale}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isRtl ? 'Switch to English (LTR)' : 'التحويل إلى العربية (RTL)'}</span>
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 sm:px-10">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="staff-email"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                {isRtl ? 'البريد الإلكتروني الوظيفي' : 'Official Staff Email'}
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="staff-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="user@humanity.local"
                  className="block w-full rounded-lg border border-slate-300 ps-9 pe-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="staff-password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                {isRtl ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="staff-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 ps-9 pe-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
            >
              <span>
                {isSubmitting ? t('common.loading') : isRtl ? 'دخول آمن' : 'Secure Sign In'}
              </span>
              <ArrowIcon className="w-4 h-4" />
            </button>
          </form>

          {/* Quick-picker for synthetic demonstration accounts */}
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {isRtl
                  ? 'حسابات التجربة السريعة (بيانات تجريبية):'
                  : 'Demo Test Accounts (Synthetic):'}
              </span>
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pe-1">
              {Object.values(DEMO_STAFF_REGISTRY).map(staff => (
                <button
                  key={staff.email}
                  type="button"
                  onClick={() => handleQuickSelect(staff.email)}
                  className={`w-full text-start p-2 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                    email === staff.email
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <p className="leading-snug">{isRtl ? staff.fullNameAr : staff.fullNameEn}</p>
                    <span className="text-[10px] text-slate-400">{staff.email}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {staff.roles[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          {isRtl
            ? 'نظام داخلي محمي — وصول مصرح به فقط وفق ضوابط الأمن وحماية البيانات'
            : 'Protected internal system — Authorized personnel only under strict RLS'}
        </p>
      </div>
    </div>
  );
}
