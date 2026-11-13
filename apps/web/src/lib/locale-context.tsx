'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { SupportedLocale } from '@humanity/contracts';

interface LocaleContextType {
  locale: SupportedLocale;
  direction: 'rtl' | 'ltr';
  isRtl: boolean;
  setLocale: (locale: SupportedLocale) => void;
  toggleLocale: () => void;
  t: (key: string, fallback?: string) => string;
}

const DICTIONARY: Record<SupportedLocale, Record<string, string>> = {
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.beneficiaries': 'المستفيدون',
    'nav.cases': 'الحالات والملفات',
    'nav.duplicates': 'تدقيق الازدواجية',
    'nav.approvals': 'قائمة الاعتمادات',
    'nav.finance': 'المعاملات المالية',
    'nav.reports': 'التقارير الإحصائية',
    'nav.audit': 'سجل الرقابة والتتبع',
    'nav.staff_admin': 'إدارة الموظفين',
    'nav.logout': 'تسجيل الخروج',

    // App header
    'app.title': 'منصة إنسانية',
    'app.subtitle': 'نظام إدارة المستفيدين والحالات (العراق)',
    'app.org_tag': 'جمهورية العراق · مكتب التنسيق المركزي',

    // Roles
    'role.intake': 'موظف تسجيل أولي',
    'role.caseworker': 'باحث ميداني',
    'role.supervisor': 'مشرف حالات',
    'role.programme_manager': 'مدير برنامج',
    'role.finance_maker': 'منظم معاملات مالية',
    'role.finance_checker': 'مدقق مالي معتمد',
    'role.auditor': 'مدقق التزام ورقابة',
    'role.report_viewer': 'محلل تقارير',
    'role.security_admin': 'مسؤول أمن النظام',

    // Statuses
    'status.draft': 'مسودة',
    'status.submitted': 'مرفوع',
    'status.under_assessment': 'قيد التقييم',
    'status.pending_approval': 'بانتظار الاعتماد',
    'status.approved': 'معتمد',
    'status.rejected': 'مرفوض',
    'status.active_delivery': 'قيد التسليم',
    'status.closed': 'مغلق',
    'status.reopened': 'معاد فتحه',

    // Session and Common
    'session.expired_title': 'انتهت صلاحية الجلسة',
    'session.expired_desc': 'انتهت مهلة الجلسة لسلامة البيانات. يرجى تسجيل الدخول مجدداً.',
    'session.active': 'جلسة آمنة نشطة',
    'common.loading': 'جاري التحميل...',
    'common.empty': 'لا توجد بيانات متاحة حالياً',
    'common.error': 'حدث خطأ غير متوقع',
    'common.retry': 'إعادة المحاولة',
    'common.search': 'بحث...',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.back': 'رجوع',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.beneficiaries': 'Beneficiaries',
    'nav.cases': 'Cases & Files',
    'nav.duplicates': 'Duplicate Review',
    'nav.approvals': 'Approvals Queue',
    'nav.finance': 'Financial Ledger',
    'nav.reports': 'Reports & Analytics',
    'nav.audit': 'Security Audit Trail',
    'nav.staff_admin': 'Staff Management',
    'nav.logout': 'Sign Out',

    // App header
    'app.title': 'Humanity Platform',
    'app.subtitle': 'Beneficiary & Case Management (Iraq)',
    'app.org_tag': 'Republic of Iraq · Central Coordination Office',

    // Roles
    'role.intake': 'Intake Registrar',
    'role.caseworker': 'Field Caseworker',
    'role.supervisor': 'Casework Supervisor',
    'role.programme_manager': 'Programme Manager',
    'role.finance_maker': 'Finance Maker',
    'role.finance_checker': 'Finance Checker',
    'role.auditor': 'Compliance Auditor',
    'role.report_viewer': 'Reporting Analyst',
    'role.security_admin': 'Security Admin',

    // Statuses
    'status.draft': 'Draft',
    'status.submitted': 'Submitted',
    'status.under_assessment': 'Under Assessment',
    'status.pending_approval': 'Pending Approval',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',
    'status.active_delivery': 'Active Delivery',
    'status.closed': 'Closed',
    'status.reopened': 'Reopened',

    // Session and Common
    'session.expired_title': 'Session Expired',
    'session.expired_desc': 'Your secure session has timed out. Please sign in again.',
    'session.active': 'Active Secure Session',
    'common.loading': 'Loading...',
    'common.empty': 'No records found',
    'common.error': 'An unexpected error occurred',
    'common.retry': 'Retry',
    'common.search': 'Search...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.back': 'Back',
  },
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('ar');

  useEffect(() => {
    // Check saved preference or default to Arabic
    const saved = localStorage.getItem('humanity_locale') as SupportedLocale;
    if (saved === 'ar' || saved === 'en') {
      setLocaleState(saved);
    }
  }, []);

  useEffect(() => {
    const isRtl = locale === 'ar';
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    localStorage.setItem('humanity_locale', locale);
  }, [locale]);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
  };

  const toggleLocale = () => {
    setLocaleState(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = (key: string, fallback?: string): string => {
    return DICTIONARY[locale]?.[key] || fallback || key;
  };

  const isRtl = locale === 'ar';
  const direction = isRtl ? 'rtl' : 'ltr';

  return (
    <LocaleContext.Provider
      value={{
        locale,
        direction,
        isRtl,
        setLocale,
        toggleLocale,
        t,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
