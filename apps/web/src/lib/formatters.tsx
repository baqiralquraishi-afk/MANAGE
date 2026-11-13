import React from 'react';

/**
 * Wraps alphanumeric identifiers (Case Reference, UUID, National ID, Phone)
 * with Unicode First Strong Isolate (U+2066) and Pop Directional Isolate (U+2069).
 * Prevents punctuation/hyphen reversal when rendered inside an Arabic RTL paragraph.
 */
export function formatIdentifier(id: string | null | undefined): string {
  if (!id) return '';
  return `\u2066${id}\u2069`;
}

/**
 * Formats currency amounts with standardized Iraqi Dinar notation.
 * In Arabic: 'د.ع' suffix with localized number grouping.
 * In English: 'IQD' prefix with western numerals.
 */
export function formatCurrency(
  amount: number | null | undefined,
  locale: string = 'ar',
  currency: string = 'IQD',
): string {
  if (amount == null || isNaN(amount)) return '0';
  const isArabic = locale.startsWith('ar');

  const formattedNum = new Intl.NumberFormat(isArabic ? 'ar-IQ' : 'en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);

  return isArabic ? `${formattedNum} د.ع` : `${currency} ${formattedNum}`;
}

/**
 * Localized date formatter using the official Gregorian humanitarian calendar.
 */
export function formatDate(
  date: string | Date | null | undefined,
  locale: string = 'ar',
  includeTime: boolean = false,
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const isArabic = locale.startsWith('ar');
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : {}),
  };

  return new Intl.DateTimeFormat(isArabic ? 'ar-IQ' : 'en-GB', options).format(d);
}

/**
 * Formats numbers with localized thousands grouping.
 */
export function formatNumber(num: number | null | undefined, locale: string = 'ar'): string {
  if (num == null || isNaN(num)) return '0';
  const isArabic = locale.startsWith('ar');
  return new Intl.NumberFormat(isArabic ? 'ar-IQ' : 'en-US').format(num);
}

/**
 * React Component for Bidirectional Text Isolation.
 * Standardized W3C <bdi> container ensuring Latin/Alphanumeric strings
 * (case codes, serials, UUIDs, phone numbers) are never jumbled in RTL layouts.
 */
export function BidiText({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <bdi dir="ltr" className={`inline-block font-mono ${className}`}>
      {children}
    </bdi>
  );
}
