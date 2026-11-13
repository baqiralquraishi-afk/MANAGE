'use client';

import React from 'react';
import type { SystemRole } from '@humanity/contracts';
import { useAuth } from '@/lib/auth-context';
import { useLocale } from '@/lib/locale-context';
import { ShieldAlert } from 'lucide-react';
import { LoadingState } from '../ui/loading-state';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: SystemRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user, activeRole, isLoading, isAuthenticated } = useAuth();
  const { t, isRtl } = useLocale();

  if (isLoading) {
    return <LoadingState />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-amber-900 mb-1">
          {isRtl ? 'تسجيل الدخول مطلوب' : 'Authentication Required'}
        </h4>
        <p className="text-xs text-amber-700">
          {isRtl
            ? 'يرجى تسجيل الدخول للوصول إلى هذه الواجهة.'
            : 'Please sign in to access this interface.'}
        </p>
      </div>
    );
  }

  const hasAccess =
    (activeRole && allowedRoles.includes(activeRole)) ||
    user.roles.some(r => allowedRoles.includes(r));

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;

    return (
      <div
        role="alert"
        className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs"
      >
        <div className="mx-auto w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-2">
          {isRtl ? 'صلاحية غير كافية' : 'Access Restricted'}
        </h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-4">
          {isRtl
            ? 'لا يمتلك دورك الوظيفي الحالي صلاحية استعراض هذه البيانات.'
            : 'Your current role does not have authorization to view this section.'}
        </p>
        <div className="inline-block bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500">
          <p className="font-semibold text-slate-700 mb-0.5">
            {isRtl ? 'مبدأ الأمان الإلزامي:' : 'Security Policy:'}
          </p>
          <p>
            {isRtl
              ? 'تعتمد المنصة ضوابط الوصول على مستوى الصفوف (RLS) في قاعدة بيانات PostgreSQL كمرجع قطعي غير قابل للتجاوز من واجهة المستخدم.'
              : 'Row-Level Security (RLS) in PostgreSQL is the authoritative access enforcement layer; client-side route guards are ergonomic only.'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
