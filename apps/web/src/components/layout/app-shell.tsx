'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FolderGit2,
  CopyCheck,
  CheckCircle2,
  Receipt,
  BarChart3,
  ShieldCheck,
  UserCog,
  LogOut,
  Globe,
  Menu,
  X,
  ChevronDown,
  Shield,
  Layers,
  MapPin,
  Briefcase,
} from 'lucide-react';
import type { SystemRole } from '@humanity/contracts';
import { useLocale } from '@/lib/locale-context';
import { useAuth } from '@/lib/auth-context';
import { SessionExpiredModal } from '../ui/session-expired-modal';

interface NavItem {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: SystemRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'nav.dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: [
      'intake',
      'caseworker',
      'supervisor',
      'programme_manager',
      'finance_maker',
      'finance_checker',
      'auditor',
      'report_viewer',
      'security_admin',
    ],
  },
  {
    key: 'nav.beneficiaries',
    href: '/dashboard/beneficiaries',
    icon: Users,
    roles: ['intake', 'caseworker', 'supervisor', 'programme_manager', 'auditor', 'report_viewer'],
  },
  {
    key: 'nav.cases',
    href: '/dashboard/cases',
    icon: FolderGit2,
    roles: ['caseworker', 'supervisor', 'programme_manager', 'auditor', 'report_viewer'],
  },
  {
    key: 'nav.duplicates',
    href: '/dashboard/duplicates',
    icon: CopyCheck,
    roles: ['intake', 'supervisor', 'programme_manager', 'auditor'],
  },
  {
    key: 'nav.approvals',
    href: '/dashboard/approvals',
    icon: CheckCircle2,
    roles: ['supervisor', 'programme_manager'],
  },
  {
    key: 'nav.finance',
    href: '/dashboard/finance',
    icon: Receipt,
    roles: ['finance_maker', 'finance_checker', 'auditor'],
  },
  {
    key: 'nav.reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['programme_manager', 'finance_checker', 'auditor', 'report_viewer'],
  },
  {
    key: 'nav.audit',
    href: '/dashboard/audit',
    icon: ShieldCheck,
    roles: ['auditor', 'security_admin'],
  },
  {
    key: 'nav.staff_admin',
    href: '/dashboard/admin/staff',
    icon: UserCog,
    roles: ['security_admin'],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { locale, direction, isRtl, toggleLocale, t } = useLocale();
  const { user, activeRole, switchActiveRole, logout, isSessionExpired } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // Filter navigation items by active role or all user roles
  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (!user) return false;
    if (activeRole) {
      return item.roles.includes(activeRole);
    }
    return item.roles.some(r => user.roles.includes(r));
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir={direction} lang={locale}>
      {/* Skip to Main Content Link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-md focus:shadow-md"
      >
        {isRtl ? 'الانتقال إلى المحتوى الرئيسي' : 'Skip to main content'}
      </a>

      {/* Global Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              aria-label={isRtl ? 'فتح القائمة الرئيسية' : 'Open main menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Brand Emblem & Titles */}
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 group-hover:bg-emerald-500 transition-colors flex items-center justify-center text-white font-bold text-lg shadow-xs">
                إ
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  {t('app.title', 'منصة إنسانية')}
                </h1>
                <p className="text-[11px] text-slate-400">
                  {t('app.org_tag', 'جمهورية العراق · مكتب التنسيق المركزي')}
                </p>
              </div>
            </Link>
          </div>

          {/* Header Controls: Locale Switcher, Active Role Switcher, User Info, Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Toggle Button */}
            <button
              type="button"
              onClick={toggleLocale}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors focus:ring-2 focus:ring-emerald-500"
              aria-label={isRtl ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic'}
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{isRtl ? 'English' : 'عربي'}</span>
            </button>

            {/* Active User and Role Switcher */}
            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-start"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {user.fullNameAr.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 leading-none">
                      {isRtl ? user.fullNameAr : user.fullNameEn}
                    </p>
                    <span className="text-[10px] text-emerald-700 font-medium leading-none">
                      {activeRole ? t(`role.${activeRole}`) : ''}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Role Switcher Popover */}
                {roleDropdownOpen && (
                  <div className="absolute end-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-40">
                    <p className="text-[11px] font-semibold text-slate-400 px-2 py-1">
                      {isRtl ? 'الأدوار الوظيفية المخصصة:' : 'Assigned Staff Roles:'}
                    </p>
                    <div className="space-y-1">
                      {user.roles.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            switchActiveRole(r);
                            setRoleDropdownOpen(false);
                          }}
                          className={`w-full text-start px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                            activeRole === r
                              ? 'bg-emerald-50 text-emerald-800 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{t(`role.${r}`)}</span>
                          {activeRole === r && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Geographic & Programme Scopes Summary */}
                    <div className="border-t border-slate-100 mt-2 pt-2 px-2 text-[10px] text-slate-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>
                          {user.governorates.length > 0
                            ? user.governorates.join(', ')
                            : isRtl
                              ? 'جميع المحافظات'
                              : 'All Governorates'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span>
                          {user.programmes.length > 0
                            ? user.programmes.join(', ')
                            : isRtl
                              ? 'كافة البرامج'
                              : 'All Programmes'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Logout Action */}
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-medium text-slate-500 hover:text-rose-600 p-2 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1.5"
              title={t('nav.logout', 'تسجيل الخروج')}
              aria-label={t('nav.logout', 'تسجيل الخروج')}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">{t('nav.logout', 'خروج')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* Navigation Sidebar (Desktop) */}
        <aside
          aria-label={isRtl ? 'التنقل الرئيسي' : 'Main Navigation'}
          className="hidden lg:block w-64 shrink-0"
        >
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs sticky top-22">
            <nav className="space-y-1" aria-label="Sidebar Menu">
              {visibleNavItems.map(item => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
                    />
                    <span>{t(item.key)}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Security Architecture Principle Note */}
            <div className="mt-6 pt-4 border-t border-slate-100 px-2 text-[11px] text-slate-400 leading-relaxed">
              <div className="flex items-center gap-1 font-semibold text-slate-600 mb-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isRtl ? 'أمان السجلات الإنسانية' : 'Data Integrity & RLS'}</span>
              </div>
              <p>
                {isRtl
                  ? 'قواعد RLS في PostgreSQL هي المعيار القطعي للتحقق والتفويض، وحجب الواجهات هنا هو لتنظيم العمل وتيسيره فقط.'
                  : 'PostgreSQL RLS is the authoritative security boundary. UI visibility is purely ergonomic.'}
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative max-w-xs w-full bg-white h-full shadow-xl flex flex-col p-4 z-50">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-sm">{t('app.title')}</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1 flex-1 overflow-y-auto">
                {visibleNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                        isActive
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{t(item.key)}</span>
                    </Link>
                  );
                })}
              </nav>

              {user && (
                <div className="pt-4 border-t border-slate-100 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">
                    {isRtl ? user.fullNameAr : user.fullNameEn}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    {activeRole ? t(`role.${activeRole}`) : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 w-full focus:outline-hidden">
          {children}
        </main>
      </div>

      {/* Session Expired Handler Modal */}
      <SessionExpiredModal isOpen={isSessionExpired} />

      {/* Standard Government Footer */}
      <footer
        role="contentinfo"
        className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400"
      >
        <p>
          {isRtl
            ? 'منصة إنسانية الموحدة · نظام وطني لإدارة الحالات الإنسانية وشبكات الأمان الاجتماعي (العراق)'
            : 'Humanity Platform · National Humanitarian & Social Safety Net Case Management (Iraq)'}
        </p>
      </footer>
    </div>
  );
}
