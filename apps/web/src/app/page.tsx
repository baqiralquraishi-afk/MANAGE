import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-700">
          <span className="text-2xl font-bold">إ</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">منصة إنسانية (Humanity Platform)</h1>
        <p className="text-slate-600 mb-6">
          نظام إدارة المستفيدين والحالات الإنسانية — جمهورية العراق
          <br />
          <span className="text-xs text-slate-400">Humanitarian Case Management System</span>
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8 text-xs text-slate-700 font-medium">
          <div className="p-2 bg-slate-50 rounded border">FIN المساعدات المالية</div>
          <div className="p-2 bg-slate-50 rounded border">FOD الأمن الغذائي</div>
          <div className="p-2 bg-slate-50 rounded border">MED الرعاية الصحية</div>
          <div className="p-2 bg-slate-50 rounded border">HOU المأوى والسكن</div>
          <div className="p-2 bg-slate-50 rounded border">EDU التعليم والطفل</div>
          <div className="p-2 bg-slate-50 rounded border">EMG الاستجابة الطارئة</div>
          <div className="p-2 bg-slate-50 rounded border">EMP سبل العيش والعمل</div>
          <div className="p-2 bg-slate-50 rounded border">SOC الخدمات الاجتماعية</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
          >
            تسجيل الدخول للنظام (Staff Portal)
          </Link>
          <span className="inline-flex items-center justify-center text-xs text-slate-400">
            Arabic RTL Default · English LTR Switchable
          </span>
        </div>
      </div>
    </main>
  );
}
