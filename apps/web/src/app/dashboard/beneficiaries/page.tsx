'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  MapPin,
  Shield,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck,
  X,
  Phone,
  Home,
  UserCheck,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';
import { useAuth } from '@/lib/auth-context';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';

interface BeneficiaryRecord {
  id: string;
  nationalIdType: string;
  nationalIdNumber: string;
  fullNameAr: string;
  fullNameEn?: string;
  motherNameAr: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phonePrimary: string;
  governorateId: string;
  districtId: string;
  addressDetails: string;
  displacementStatus: 'idp' | 'refugee' | 'returnee' | 'host_community';
  vulnerabilityFlags: string[];
  duplicateStatus: 'clean' | 'suspected_duplicate' | 'confirmed_duplicate' | 'resolved_unique';
  householdSize: number;
  createdAt: string;
}

const INITIAL_BENEFICIARIES: BeneficiaryRecord[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    nationalIdType: 'national_unified_card',
    nationalIdNumber: '198512345678',
    fullNameAr: 'فاطمة جاسم محمد',
    fullNameEn: 'Fatima Jasim Mohammed',
    motherNameAr: 'مريم علي',
    dateOfBirth: '1985-04-12',
    gender: 'female',
    phonePrimary: '+9647701234567',
    governorateId: 'IQ-BG',
    districtId: 'IQ-BG-KAR',
    addressDetails: 'بغداد · الكرخ · حي الجامعة',
    displacementStatus: 'idp',
    vulnerabilityFlags: ['female_headed_household', 'chronic_illness'],
    duplicateStatus: 'clean',
    householdSize: 5,
    createdAt: '2026-11-01',
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    nationalIdType: 'national_unified_card',
    nationalIdNumber: '199087654321',
    fullNameAr: 'عمر فاروق عبد الله',
    fullNameEn: 'Omar Farouk Abdullah',
    motherNameAr: 'خديجة حسن',
    dateOfBirth: '1990-09-20',
    gender: 'male',
    phonePrimary: '+9647709876543',
    governorateId: 'IQ-NI',
    districtId: 'IQ-NI-MOS',
    addressDetails: 'نينوى · الموصل · حي الزهور',
    displacementStatus: 'returnee',
    vulnerabilityFlags: ['unemployed'],
    duplicateStatus: 'clean',
    householdSize: 4,
    createdAt: '2026-11-02',
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    nationalIdType: 'civil_id',
    nationalIdNumber: '197823456789',
    fullNameAr: 'حسين علي رضا',
    fullNameEn: 'Hussein Ali Ridha',
    motherNameAr: 'زينب أحمد',
    dateOfBirth: '1978-02-14',
    gender: 'male',
    phonePrimary: '+9647801122334',
    governorateId: 'IQ-BA',
    districtId: 'IQ-BA-BAS',
    addressDetails: 'البصرة · المعقل · شارع الجمهورية',
    displacementStatus: 'host_community',
    vulnerabilityFlags: ['disabled_member'],
    duplicateStatus: 'clean',
    householdSize: 6,
    createdAt: '2026-11-05',
  },
  {
    id: '30000000-0000-0000-0000-000000000004',
    nationalIdType: 'civil_id',
    nationalIdNumber: '198512345678', // Matching national ID of Fatima
    fullNameAr: 'فاطمة جاسم محمد الكرخي',
    fullNameEn: 'Fatima J. Mohammed',
    motherNameAr: 'مريم علي',
    dateOfBirth: '1985-04-12',
    gender: 'female',
    phonePrimary: '+9647701234567',
    governorateId: 'IQ-BG',
    districtId: 'IQ-BG-RUS',
    addressDetails: 'بغداد · الرصافة · شارع فلسطين',
    displacementStatus: 'idp',
    vulnerabilityFlags: ['female_headed_household'],
    duplicateStatus: 'suspected_duplicate',
    householdSize: 3,
    createdAt: '2026-11-10',
  },
];

const GOVERNORATES = [
  { id: 'ALL', nameAr: 'كافة المحافظات', nameEn: 'All Governorates' },
  { id: 'IQ-BG', nameAr: 'بغداد', nameEn: 'Baghdad' },
  { id: 'IQ-NI', nameAr: 'نينوى', nameEn: 'Ninewa' },
  { id: 'IQ-BA', nameAr: 'البصرة', nameEn: 'Basra' },
  { id: 'IQ-AN', nameAr: 'الأنبار', nameEn: 'Anbar' },
  { id: 'IQ-KI', nameAr: 'كركوك', nameEn: 'Kirkuk' },
  { id: 'IQ-AR', nameAr: 'أربيل', nameEn: 'Erbil' },
  { id: 'IQ-SU', nameAr: 'السليمانية', nameEn: 'Sulaymaniyah' },
  { id: 'IQ-DA', nameAr: 'دهوك', nameEn: 'Duhok' },
];

export default function BeneficiariesPage() {
  const { isRtl, t } = useLocale();
  const { user } = useAuth();

  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRecord[]>(INITIAL_BENEFICIARIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGov, setSelectedGov] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryRecord | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nationalIdType: 'national_unified_card',
    nationalIdNumber: '',
    fullNameAr: '',
    fullNameEn: '',
    motherNameAr: '',
    dateOfBirth: '',
    gender: 'female',
    phonePrimary: '+964',
    governorateId: 'IQ-BG',
    districtId: 'IQ-BG-KAR',
    addressDetails: '',
    displacementStatus: 'idp',
    vulnerabilityFlags: [] as string[],
    hasGivenGeneralConsent: false,
    hasGivenDataSharingConsent: false,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formDuplicateNotice, setFormDuplicateNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scoped filtering with field minimization
  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter(b => {
      // Governorate scope filter
      if (selectedGov !== 'ALL' && b.governorateId !== selectedGov) return false;

      // Staff geographic scope check if user is restricted
      if (user?.governorates && user.governorates.length > 0) {
        if (!user.governorates.includes(b.governorateId)) return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        b.fullNameAr.toLowerCase().includes(q) ||
        (b.fullNameEn && b.fullNameEn.toLowerCase().includes(q)) ||
        b.nationalIdNumber.includes(q) ||
        b.phonePrimary.includes(q)
      );
    });
  }, [beneficiaries, selectedGov, searchQuery, user]);

  // Pagination
  const totalRecords = filteredBeneficiaries.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedBeneficiaries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBeneficiaries.slice(start, start + pageSize);
  }, [filteredBeneficiaries, currentPage, pageSize]);

  // Check duplicate warning during registration
  const handleIdChange = (idNum: string) => {
    setFormData(prev => ({ ...prev, nationalIdNumber: idNum }));
    if (idNum.length > 5) {
      const match = beneficiaries.find(b => b.nationalIdNumber === idNum);
      if (match) {
        setFormDuplicateNotice(
          isRtl
            ? `تنبيه: تم العثور على سجل سابق يحمل نفس رقم الهوية (${match.fullNameAr}). بموجب السياسة، لن يتم دمج السجل تلقائياً وسيحال إلى قائمة تدقيق الازدواجية البشرية.`
            : `Notice: Existing beneficiary found with matching ID (${match.fullNameEn || match.fullNameAr}). Under platform policy, records will NOT be silently merged; a human duplicate review will be queued.`,
        );
      } else {
        setFormDuplicateNotice(null);
      }
    } else {
      setFormDuplicateNotice(null);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Consent validation gate
    if (!formData.hasGivenGeneralConsent) {
      setFormError(
        isRtl
          ? 'خطأ: الموافقة المستنيرة العامة إلزامية لتسجيل المستفيد وفق معايير حماية البيانات الإنسانية.'
          : 'Error: Informed general consent is mandatory for beneficiary registration.',
      );
      return;
    }

    if (!formData.nationalIdNumber || !formData.fullNameAr || !formData.motherNameAr) {
      setFormError(
        isRtl
          ? 'يرجى تعبئة كافة الحقول الثبوتية الإلزامية (رقم الهوية، الاسم الثلاثي، اسم الأم).'
          : 'Please provide all required identification fields.',
      );
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Check duplicate status
      const isDuplicate = beneficiaries.some(
        b =>
          b.nationalIdNumber === formData.nationalIdNumber ||
          b.phonePrimary === formData.phonePrimary ||
          (b.fullNameAr === formData.fullNameAr && b.dateOfBirth === formData.dateOfBirth),
      );

      const newRecord: BeneficiaryRecord = {
        id: `30000000-0000-0000-0000-${String(beneficiaries.length + 1).padStart(12, '0')}`,
        nationalIdType: formData.nationalIdType,
        nationalIdNumber: formData.nationalIdNumber,
        fullNameAr: formData.fullNameAr,
        fullNameEn: formData.fullNameEn || undefined,
        motherNameAr: formData.motherNameAr,
        dateOfBirth: formData.dateOfBirth || '1992-01-01',
        gender: formData.gender as 'male' | 'female',
        phonePrimary: formData.phonePrimary,
        governorateId: formData.governorateId,
        districtId: formData.districtId,
        addressDetails: formData.addressDetails || 'العراق',
        displacementStatus: formData.displacementStatus as any,
        vulnerabilityFlags: formData.vulnerabilityFlags,
        duplicateStatus: isDuplicate ? 'suspected_duplicate' : 'clean',
        householdSize: 4,
        createdAt: new Date().toISOString().split('T')[0],
      };

      setBeneficiaries(prev => [newRecord, ...prev]);
      setIsSubmitting(false);
      setIsRegisterOpen(false);

      // Reset form
      setFormData({
        nationalIdType: 'national_unified_card',
        nationalIdNumber: '',
        fullNameAr: '',
        fullNameEn: '',
        motherNameAr: '',
        dateOfBirth: '',
        gender: 'female',
        phonePrimary: '+964',
        governorateId: 'IQ-BG',
        districtId: 'IQ-BG-KAR',
        addressDetails: '',
        displacementStatus: 'idp',
        vulnerabilityFlags: [],
        hasGivenGeneralConsent: false,
        hasGivenDataSharingConsent: false,
      });
      setFormDuplicateNotice(null);
    }, 300);
  };

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={[
          'intake',
          'caseworker',
          'supervisor',
          'programme_manager',
          'auditor',
          'report_viewer',
          'security_admin',
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRtl ? 'سجل المستفيدين والأسر الإنسانية' : 'Beneficiary & Household Registry'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRtl
                  ? 'بحث مفوتر ومقيد بالنطاق الجغرافي، مع توثيق الموافقة المستنيرة وضوابط حظر الدمج التلقائي'
                  : 'Scoped search, mandatory consent capture, and human-in-the-loop deduplication'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'تسجيل مستفيد جديد' : 'New Beneficiary Registration'}</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={
                  isRtl
                    ? 'بحث بالاسم الثلاثي، رقم الهوية الموحدة، أو الهاتف...'
                    : 'Search by full name, national ID, or phone...'
                }
                className="w-full text-xs ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedGov}
                  onChange={e => {
                    setSelectedGov(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-slate-700 font-medium focus:outline-hidden text-xs"
                >
                  {GOVERNORATES.map(g => (
                    <option key={g.id} value={g.id}>
                      {isRtl ? g.nameAr : g.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs text-slate-400 font-mono">
                {totalRecords} {isRtl ? 'سجل' : 'records'}
              </span>
            </div>
          </div>

          {/* Beneficiaries Table with Field Minimization */}
          {paginatedBeneficiaries.length === 0 ? (
            <EmptyState
              title={isRtl ? 'لم يتم العثور على سجلات' : 'No beneficiaries found'}
              description={
                isRtl
                  ? 'لا توجد سجلات تطابق معايير البحث المحددة ضمن نطاقك الجغرافي المصرح به.'
                  : 'No records matched your search parameters within authorized scope.'
              }
              actionLabel={isRtl ? 'تسجيل مستفيد جديد' : 'New Registration'}
              onAction={() => setIsRegisterOpen(true)}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4 text-start">
                        {isRtl ? 'اسم المستفيد' : 'Beneficiary'}
                      </th>
                      <th className="py-3.5 px-4 text-start">
                        {isRtl ? 'الهوية الوطنية' : 'National ID'}
                      </th>
                      <th className="py-3.5 px-4 text-start">
                        {isRtl ? 'المحافظة / القضاء' : 'Location'}
                      </th>
                      <th className="py-3.5 px-4 text-start">{isRtl ? 'رقم الهاتف' : 'Phone'}</th>
                      <th className="py-3.5 px-4 text-start">
                        {isRtl ? 'حالة الازدواجية' : 'Deduplication'}
                      </th>
                      <th className="py-3.5 px-4 text-center">{isRtl ? 'إجراء' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedBeneficiaries.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 leading-snug">
                            {isRtl ? b.fullNameAr : b.fullNameEn || b.fullNameAr}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {isRtl ? `اسم الأم: ${b.motherNameAr}` : `Mother: ${b.motherNameAr}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {b.nationalIdNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-700">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{b.governorateId}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600" dir="ltr">
                          {b.phonePrimary}
                        </td>
                        <td className="py-3.5 px-4">
                          {b.duplicateStatus === 'clean' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                              <CheckCircle className="w-3 h-3" />
                              <span>{isRtl ? 'نظيف وموثق' : 'Clean'}</span>
                            </span>
                          )}
                          {b.duplicateStatus === 'suspected_duplicate' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>{isRtl ? 'اشتباه ازدواجية' : 'Suspected Duplicate'}</span>
                            </span>
                          )}
                          {b.duplicateStatus === 'confirmed_duplicate' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">
                              <ShieldAlert className="w-3 h-3" />
                              <span>{isRtl ? 'ازدواجية مؤكدة' : 'Confirmed Duplicate'}</span>
                            </span>
                          )}
                          {b.duplicateStatus === 'resolved_unique' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                              <UserCheck className="w-3 h-3" />
                              <span>{isRtl ? 'فريد معتمد' : 'Verified Unique'}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedBeneficiary(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isRtl ? 'تفاصيل' : 'View'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                <div>
                  {isRtl
                    ? `عرض ${(currentPage - 1) * pageSize + 1} إلى ${Math.min(
                        currentPage * pageSize,
                        totalRecords,
                      )} من أصل ${totalRecords} سجل`
                    : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                        currentPage * pageSize,
                        totalRecords,
                      )} of ${totalRecords}`}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                    aria-label="Previous Page"
                  >
                    {isRtl ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronLeft className="w-4 h-4" />
                    )}
                  </button>
                  <span className="px-2 font-mono">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                    aria-label="Next Page"
                  >
                    {isRtl ? (
                      <ChevronLeft className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Details Modal (Field Minimization Expansion) */}
          {selectedBeneficiary && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="beneficiary-details-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
            >
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 id="beneficiary-details-title" className="text-base font-bold text-slate-900">
                    {isRtl ? 'تفاصيل السجل الإنساني' : 'Beneficiary Details'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedBeneficiary(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400">
                        {isRtl ? 'الاسم الكامل:' : 'Full Name:'}
                      </span>
                      <p className="font-semibold text-slate-800">
                        {selectedBeneficiary.fullNameAr}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        {isRtl ? 'اسم الأم:' : "Mother's Name:"}
                      </span>
                      <p className="font-semibold text-slate-800">
                        {selectedBeneficiary.motherNameAr}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        {isRtl ? 'رقم الهوية:' : 'National ID:'}
                      </span>
                      <p className="font-mono text-slate-800">
                        {selectedBeneficiary.nationalIdNumber}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        {isRtl ? 'تاريخ الولادة / الجنس:' : 'DOB / Gender:'}
                      </span>
                      <p className="text-slate-800">
                        {selectedBeneficiary.dateOfBirth} (
                        {selectedBeneficiary.gender === 'female' ? 'أنثى' : 'ذكر'})
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400">
                      {isRtl ? 'العنوان وتفاصيل السكن:' : 'Address & Shelter:'}
                    </span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {selectedBeneficiary.addressDetails}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400">
                      {isRtl ? 'مؤشرات الهشاشة والاحتياج:' : 'Vulnerability Flags:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedBeneficiary.vulnerabilityFlags.map(flag => (
                        <span
                          key={flag}
                          className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {isRtl ? 'الموافقة المستنيرة: موثقة ومؤرخة' : 'Informed Consent: Documented'}
                    </span>
                    <span className="font-mono">{selectedBeneficiary.createdAt}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBeneficiary(null)}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    {isRtl ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New Beneficiary Registration Wizard Modal */}
          {isRegisterOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="registration-modal-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
            >
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 my-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h3
                      id="registration-modal-title"
                      className="text-base font-bold text-slate-900"
                    >
                      {isRtl
                        ? 'تسجيل مستفيد جديد مع توثيق الموافقة'
                        : 'Register Beneficiary & Capture Consent'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isRtl
                        ? 'جمهورية العراق · التحقق من الأهلية والمطابقة الثبوتية'
                        : 'Civil Verification & Consent Gate'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterOpen(false);
                      setFormError(null);
                      setFormDuplicateNotice(null);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {formError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {formDuplicateNotice && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{formDuplicateNotice}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {/* Step 1: Civil Identity */}
                  <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {isRtl ? '1. البيانات المدنية والثبوتية' : '1. Civil Identity & Records'}
                      </span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {isRtl ? 'نوع الوثيقة الوطنية *' : 'National ID Type *'}
                        </label>
                        <select
                          value={formData.nationalIdType}
                          onChange={e =>
                            setFormData({ ...formData, nationalIdType: e.target.value })
                          }
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                        >
                          <option value="national_unified_card">
                            البطاقة الوطنية الموحدة (Unified Card)
                          </option>
                          <option value="civil_id">هوية الأحوال المدنية (Civil ID)</option>
                          <option value="passport">جواز السفر (Passport)</option>
                          <option value="temporary_residence">بطاقة سكن / وثيقة مؤقتة</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {isRtl ? 'رقم الوثيقة الوطنية *' : 'National ID Number *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.nationalIdNumber}
                          onChange={e => handleIdChange(e.target.value)}
                          placeholder="198512345678"
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {isRtl ? 'الاسم الثلاثي واللقب (عربي) *' : 'Full Name (Arabic) *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.fullNameAr}
                          onChange={e => setFormData({ ...formData, fullNameAr: e.target.value })}
                          placeholder="فاطمة جاسم محمد"
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {isRtl ? 'اسم الأم الثلاثي *' : "Mother's Full Name *"}
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.motherNameAr}
                          onChange={e => setFormData({ ...formData, motherNameAr: e.target.value })}
                          placeholder="مريم علي حسن"
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {isRtl ? 'تاريخ الولادة *' : 'Date of Birth *'}
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.dateOfBirth}
                          onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {isRtl ? 'الجنس *' : 'Gender *'}
                        </label>
                        <select
                          value={formData.gender}
                          onChange={e => setFormData({ ...formData, gender: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                        >
                          <option value="female">أنثى (Female)</option>
                          <option value="male">ذكر (Male)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Location & Contact */}
                  <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {isRtl ? '2. النطاق الجغرافي والاتصال' : '2. Geographic Scope & Contact'}
                      </span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {isRtl ? 'المحافظة *' : 'Governorate *'}
                        </label>
                        <select
                          value={formData.governorateId}
                          onChange={e =>
                            setFormData({ ...formData, governorateId: e.target.value })
                          }
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                        >
                          {GOVERNORATES.filter(g => g.id !== 'ALL').map(g => (
                            <option key={g.id} value={g.id}>
                              {isRtl ? g.nameAr : g.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {isRtl ? 'رقم الهاتف الأساسي *' : 'Primary Phone *'}
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phonePrimary}
                          onChange={e => setFormData({ ...formData, phonePrimary: e.target.value })}
                          placeholder="+9647701234567"
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                          dir="ltr"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {isRtl ? 'تفاصيل السكن والعنوان الدقيق *' : 'Address Details *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.addressDetails}
                          onChange={e =>
                            setFormData({ ...formData, addressDetails: e.target.value })
                          }
                          placeholder={
                            isRtl
                              ? 'القضاء · الحي · أقرب نقطة دالة'
                              : 'District, Neighborhood, Landmark'
                          }
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Informed Consent Gate (MANDATORY) */}
                  <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-700" />
                      <span>
                        {isRtl
                          ? '3. توثيق الموافقة المستنيرة (شرط أمني وإنساني)'
                          : '3. Informed Consent Gate'}
                      </span>
                    </h4>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasGivenGeneralConsent}
                        onChange={e =>
                          setFormData({ ...formData, hasGivenGeneralConsent: e.target.checked })
                        }
                        className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-700 leading-relaxed font-medium">
                        {isRtl
                          ? 'أؤكد أن المستفيد قد استمع وفهم الغرض من جمع البيانات وقد منح موافقته المستنيرة والصريحة للتسجيل وفق معايير حماية البيانات الإنسانية v1.0-2026.'
                          : 'I confirm the beneficiary was informed of the data purpose and granted explicit consent under humanitarian standard v1.0-2026.'}
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasGivenDataSharingConsent}
                        onChange={e =>
                          setFormData({ ...formData, hasGivenDataSharingConsent: e.target.checked })
                        }
                        className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-[11px] text-slate-500 leading-relaxed">
                        {isRtl
                          ? 'موافقة اختيارية على التنسيق الإنساني ومشاركة البيانات لمنع الازدواجية مع الشركاء المعتمدين.'
                          : 'Optional consent for inter-agency coordination and deduplication checking.'}
                      </span>
                    </label>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsRegisterOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !formData.hasGivenGeneralConsent}
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {isSubmitting
                        ? isRtl
                          ? 'جاري التسجيل...'
                          : 'Registering...'
                        : isRtl
                          ? 'إتمام التسجيل الآمن'
                          : 'Complete Registration'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </RoleGuard>
    </AppShell>
  );
}
