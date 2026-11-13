import type { Metadata } from 'next';
import './globals.css';
import { LocaleProvider } from '@/lib/locale-context';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Humanity Platform | منصة إنسانية',
  description: 'Humanitarian Beneficiary & Case Management System (Iraq)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900">
        <LocaleProvider>
          <AuthProvider>{children}</AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
