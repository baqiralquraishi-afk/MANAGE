'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useLocale } from '@/lib/locale-context';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: 'banner' | 'card' | 'inline';
}

export function ErrorState({ title, message, onRetry, variant = 'card' }: ErrorStateProps) {
  const { t } = useLocale();

  const heading = title || t('common.error', 'حدث خطأ غير متوقع');
  const details = message || 'تعذر استكمال العملية بنجاح. يرجى التحقق من اتصالك والمحاولة مجدداً.';

  if (variant === 'banner') {
    return (
      <div
        role="alert"
        className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-900"
      >
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold">{heading}</h4>
          <p className="text-xs text-rose-700 mt-0.5">{details}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-semibold px-2.5 py-1 rounded bg-rose-100 text-rose-800 hover:bg-rose-200 transition-colors"
          >
            {t('common.retry', 'إعادة المحاولة')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs"
    >
      <div className="mx-auto w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{heading}</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">{details}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-500 transition-colors shadow-xs"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('common.retry', 'إعادة المحاولة')}</span>
        </button>
      )}
    </div>
  );
}
