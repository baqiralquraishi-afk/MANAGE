'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLocale } from '@/lib/locale-context';

interface LoadingStateProps {
  message?: string;
  variant?: 'card' | 'inline' | 'fullscreen';
  rows?: number;
}

export function LoadingState({ message, variant = 'card', rows = 3 }: LoadingStateProps) {
  const { t } = useLocale();
  const label = message || t('common.loading', 'جاري التحميل...');

  if (variant === 'inline') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 text-sm text-slate-500 py-1"
      >
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
        <span>{label}</span>
      </div>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/20 backdrop-blur-xs"
      >
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-slate-700">{label}</p>
        </div>
      </div>
    );
  }

  // Default: card with skeleton lines
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-pulse"
    >
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600 shrink-0" />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-slate-100 rounded-md"
            style={{ width: `${Math.max(45, 95 - i * 15)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
