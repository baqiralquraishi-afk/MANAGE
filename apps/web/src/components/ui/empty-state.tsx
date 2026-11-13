'use client';

import React from 'react';
import { Inbox, Plus } from 'lucide-react';
import { useLocale } from '@/lib/locale-context';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const { t } = useLocale();

  return (
    <div
      role="region"
      aria-label={title || t('common.empty', 'لا توجد بيانات متاحة حالياً')}
      className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center"
    >
      <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">
        {title || t('common.empty', 'لا توجد بيانات متاحة حالياً')}
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
        {description || 'لا توجد سجلات مطابقة لمعايير البحث المحددة أو لم يتم إدخال بيانات بعد.'}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
