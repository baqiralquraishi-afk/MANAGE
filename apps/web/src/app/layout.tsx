import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="ar" dir="rtl">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
