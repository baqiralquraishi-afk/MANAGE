'use client';

import React from 'react';
import { Clock, LogIn } from 'lucide-react';
import { useLocale } from '@/lib/locale-context';
import { useRouter } from 'next/navigation';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onConfirm?: () => void;
}

export function SessionExpiredModal({ isOpen, onConfirm }: SessionExpiredModalProps) {
  const { t } = useLocale();
  const router = useRouter();

  if (!isOpen) return null;

  const handleRedirect = () => {
    if (onConfirm) onConfirm();
    router.push('/login');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-150">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6" />
        </div>
        <h3 id="session-expired-title" className="text-lg font-bold text-slate-900 mb-2">
          {t('session.expired_title', 'انتهت صلاحية الجلسة')}
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          {t(
            'session.expired_desc',
            'انتهت مهلة الجلسة لسلامة البيانات وأمن السجلات الإنسانية. يرجى إعادة تسجيل الدخول لمتابعة العمل.',
          )}
        </p>
        <button
          type="button"
          onClick={handleRedirect}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors shadow-xs"
        >
          <LogIn className="w-4 h-4" />
          <span>{t('nav.login', 'تسجيل الدخول مجدداً')}</span>
        </button>
      </div>
    </div>
  );
}
