'use client';

import React, { useState, useMemo } from 'react';
import {
  UserCog,
  Shield,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Layers,
  Plus,
  Trash2,
  History,
  AlertTriangle,
  X,
  Search,
  Check,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { RoleGuard } from '@/components/auth/role-guard';
import { useLocale } from '@/lib/locale-context';
import { useAuth, DEMO_STAFF_REGISTRY, StaffUser } from '@/lib/auth-context';
import { BidiText, formatDate, formatIdentifier } from '@/lib/formatters';
import {
  SystemRoleSchema,
  type SystemRole,
  ProgrammeCodeSchema,
  type ProgrammeCode,
  StaffRoleAssignmentSchema,
  StaffRoleRevocationSchema,
  StaffScopeAssignmentSchema,
  SecurityAuditAlertSchema,
} from '@humanity/contracts';

interface StaffAuditRecord {
  id: string;
  timestamp: string;
  action: 'ASSIGN_ROLE' | 'REVOKE_ROLE' | 'UPDATE_SCOPE';
  staffEmail: string;
  roleOrScope: string;
  rationale: string;
  performedBy: string;
}

export default function StaffAdminPage() {
  const { t, isRtl, locale } = useLocale();
  const { user } = useAuth();

  // Local state initialized with synthetic registry
  const [staffList, setStaffList] = useState<StaffUser[]>(() => Object.values(DEMO_STAFF_REGISTRY));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);

  // Modals state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);

  // Form states
  const [selectedRole, setSelectedRole] = useState<SystemRole>('caseworker');
  const [roleToRevoke, setRoleToRevoke] = useState<SystemRole | null>(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('IQ-BG');
  const [selectedProgramme, setSelectedProgramme] = useState<ProgrammeCode>('FIN');
  const [rationale, setRationale] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // In-session audit trail for role management
  const [auditRecords, setAuditRecords] = useState<StaffAuditRecord[]>([
    {
      id: 'sar-001',
      timestamp: '2026-11-13T14:22:15Z',
      action: 'ASSIGN_ROLE',
      staffEmail: 'caseworker.ninewa@humanity.local',
      roleOrScope: 'supervisor',
      rationale: 'ترقية باحث ميداني إلى مشرف مؤقت لدعم مخيم السلام في نينوى',
      performedBy: 'security.admin@humanity.local',
    },
  ]);

  // Filtered staff members
  const filteredStaff = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return staffList;
    return staffList.filter(
      s =>
        s.fullNameAr.toLowerCase().includes(term) ||
        s.fullNameEn.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
    );
  }, [staffList, searchTerm]);

  // Handle Role Assignment
  const handleAssignRole = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedStaff) return;

    // Validate using @humanity/contracts schema
    const parseResult = StaffRoleAssignmentSchema.safeParse({
      staffId: selectedStaff.id,
      role: selectedRole,
      rationale,
      isActive: true,
    });

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message;
      setFormError(firstIssue || 'بيانات التعيين غير صالحة');
      return;
    }

    if (selectedStaff.roles.includes(selectedRole)) {
      setFormError(
        isRtl
          ? 'هذا الدور ممنوح بالفعل للموظف المحدد'
          : 'This role is already assigned to this staff member'
      );
      return;
    }

    // Update staff state
    const updatedStaff = {
      ...selectedStaff,
      roles: [...selectedStaff.roles, selectedRole],
    };

    setStaffList(prev => prev.map(s => (s.id === selectedStaff.id ? updatedStaff : s)));
    setSelectedStaff(updatedStaff);

    // Audit event conforming to SecurityAuditAlertSchema
    const auditPayload = {
      eventCategory: 'role_management' as const,
      actionName: 'STAFF_ROLE_ASSIGNED',
      entityTable: 'staff_roles',
      entityId: selectedStaff.id,
      details: {
        assignedRole: selectedRole,
        rationale,
        assignedBy: user?.email || 'security_admin',
      },
    };
    SecurityAuditAlertSchema.safeParse(auditPayload);

    setAuditRecords(prev => [
      {
        id: `sar-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'ASSIGN_ROLE',
        staffEmail: selectedStaff.email,
        roleOrScope: selectedRole,
        rationale,
        performedBy: user?.email || 'security_admin',
      },
      ...prev,
    ]);

    setSuccessBanner(
      isRtl
        ? `تم تعيين الدور "${t(`role.${selectedRole}`)}" للموظف بنجاح وتوثيقه بسجل الرقابة.`
        : `Role "${t(`role.${selectedRole}`)}" successfully assigned and logged in audit trail.`
    );
    setRationale('');
    setAssignModalOpen(false);
  };

  // Handle Role Revocation
  const handleRevokeRole = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedStaff || !roleToRevoke) return;

    // Validate using @humanity/contracts schema
    const parseResult = StaffRoleRevocationSchema.safeParse({
      staffId: selectedStaff.id,
      role: roleToRevoke,
      rationale,
    });

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message;
      setFormError(firstIssue || 'بيانات سحب الدور غير صالحة');
      return;
    }

    if (selectedStaff.roles.length <= 1) {
      setFormError(
        isRtl
          ? 'لا يمكن سحب الدور الأخير؛ يجب أن يمتلك الموظف دوراً وظيفياً واحداً على الأقل'
          : 'Cannot revoke last role; staff member must have at least one active role'
      );
      return;
    }

    const updatedRoles = selectedStaff.roles.filter(r => r !== roleToRevoke);
    const updatedStaff = {
      ...selectedStaff,
      roles: updatedRoles,
    };

    setStaffList(prev => prev.map(s => (s.id === selectedStaff.id ? updatedStaff : s)));
    setSelectedStaff(updatedStaff);

    // Record audit alert
    const auditPayload = {
      eventCategory: 'role_management' as const,
      actionName: 'STAFF_ROLE_REVOKED',
      entityTable: 'staff_roles',
      entityId: selectedStaff.id,
      details: {
        revokedRole: roleToRevoke,
        rationale,
        revokedBy: user?.email || 'security_admin',
      },
    };
    SecurityAuditAlertSchema.safeParse(auditPayload);

    setAuditRecords(prev => [
      {
        id: `sar-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'REVOKE_ROLE',
        staffEmail: selectedStaff.email,
        roleOrScope: roleToRevoke,
        rationale,
        performedBy: user?.email || 'security_admin',
      },
      ...prev,
    ]);

    setSuccessBanner(
      isRtl
        ? `تم سحب الدور "${t(`role.${roleToRevoke}`)}" وتوثيق القرار في سجل الرقابة.`
        : `Role "${t(`role.${roleToRevoke}`)}" revoked and logged in audit trail.`
    );
    setRationale('');
    setRevokeModalOpen(false);
    setRoleToRevoke(null);
  };

  // Handle Scope Assignment
  const handleUpdateScope = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedStaff) return;

    // Validate using @humanity/contracts schema
    const parseResult = StaffScopeAssignmentSchema.safeParse({
      staffId: selectedStaff.id,
      governorateId: selectedGovernorate,
      programmeCode: selectedProgramme,
      rationale,
    });

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message;
      setFormError(firstIssue || 'بيانات النطاق غير صالحة');
      return;
    }

    const updatedGovs = selectedStaff.governorates.includes(selectedGovernorate)
      ? selectedStaff.governorates
      : [...selectedStaff.governorates, selectedGovernorate];

    const updatedProgs = selectedStaff.programmes.includes(selectedProgramme)
      ? selectedStaff.programmes
      : [...selectedStaff.programmes, selectedProgramme];

    const updatedStaff = {
      ...selectedStaff,
      governorates: updatedGovs,
      programmes: updatedProgs,
    };

    setStaffList(prev => prev.map(s => (s.id === selectedStaff.id ? updatedStaff : s)));
    setSelectedStaff(updatedStaff);

    setAuditRecords(prev => [
      {
        id: `sar-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'UPDATE_SCOPE',
        staffEmail: selectedStaff.email,
        roleOrScope: `${selectedGovernorate} / ${selectedProgramme}`,
        rationale,
        performedBy: user?.email || 'security_admin',
      },
      ...prev,
    ]);

    setSuccessBanner(
      isRtl
        ? `تم تحديث النطاق الجغرافي والبرامجي للموظف وتوثيقه بنجاح.`
        : `Staff geographic and programme scope updated and audited.`
    );
    setRationale('');
    setScopeModalOpen(false);
  };

  return (
    <RoleGuard allowedRoles={['security_admin']}>
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg">
                  <UserCog className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-bold text-slate-900">
                  {isRtl ? 'إدارة أدوار وصلاحيات الموظفين' : 'Staff Role & Scope Administration'}
                </h1>
              </div>
              <p className="text-sm text-slate-600">
                {isRtl
                  ? 'إدارة صلاحيات موظفي المنصة الميدانية والإدارية وفق مبدأ أقل الصلاحيات والفصل بين المهام'
                  : 'Manage staff access and geographic/programme boundaries following least-privilege RBAC'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Shield className="w-3.5 h-3.5" />
                {isRtl ? 'صلاحية مسؤول أمن النظام' : 'Security Admin Authority'}
              </span>
            </div>
          </div>

          {/* Success Banner */}
          {successBanner && (
            <div
              role="alert"
              className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successBanner}</span>
              </div>
              <button
                onClick={() => setSuccessBanner(null)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute top-3 text-slate-400 rtl:right-3 ltr:left-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={
                  isRtl
                    ? 'البحث بالاسم أو البريد الإلكتروني للموظف...'
                    : 'Search by staff name or email...'
                }
                className="w-full text-sm border border-slate-300 rounded-lg py-2 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Main Grid: Staff Directory + Details / Action */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Staff List */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">
                  {isRtl ? 'سجل الموظفين المعتمدين' : 'Authorized Staff Directory'} (
                  {filteredStaff.length})
                </h2>
                <span className="text-xs text-slate-500">
                  {isRtl ? 'انقر على موظف لإدارة أدواره' : 'Click a staff member to manage roles'}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredStaff.map(staff => {
                  const isSelected = selectedStaff?.id === staff.id;
                  return (
                    <div
                      key={staff.id}
                      onClick={() => {
                        setSelectedStaff(staff);
                        setFormError(null);
                      }}
                      className={`p-4 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${isSelected ? 'bg-indigo-50/60 border-indigo-200' : 'hover:bg-slate-50'
                        }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">
                            {locale === 'ar' ? staff.fullNameAr : staff.fullNameEn}
                          </span>
                          <span className="text-xs text-slate-400">
                            (
                            <BidiText>
                              {locale === 'ar' ? staff.fullNameEn : staff.fullNameAr}
                            </BidiText>
                            )
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <BidiText>{staff.email}</BidiText>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {staff.roles.map(r => (
                            <span
                              key={r}
                              className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-medium"
                            >
                              {t(`role.${r}`)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 flex flex-col items-start md:items-end gap-1">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {staff.governorates.length > 0
                            ? staff.governorates.join(', ')
                            : isRtl
                              ? 'عام / غير مقيد'
                              : 'Nationwide'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {staff.programmes.length > 0
                            ? staff.programmes.join(', ')
                            : isRtl
                              ? 'كافة البرامج'
                              : 'All Sectors'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Staff Actions Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
              {selectedStaff ? (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      {isRtl ? 'الموظف المحدد' : 'Selected Staff Member'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {locale === 'ar' ? selectedStaff.fullNameAr : selectedStaff.fullNameEn}
                    </h3>
                    <p className="text-xs text-slate-500">
                      <BidiText>{selectedStaff.email}</BidiText>
                    </p>
                  </div>

                  {/* Active Roles */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-700">
                        {isRtl ? 'الأدوار النشطة' : 'Active Roles'}
                      </h4>
                      <button
                        onClick={() => {
                          setFormError(null);
                          setRationale('');
                          setAssignModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isRtl ? 'إسناد دور جديد' : 'Assign Role'}
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {selectedStaff.roles.map(r => (
                        <div
                          key={r}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                        >
                          <span className="font-medium text-slate-800">{t(`role.${r}`)}</span>
                          <button
                            onClick={() => {
                              setRoleToRevoke(r);
                              setFormError(null);
                              setRationale('');
                              setRevokeModalOpen(true);
                            }}
                            title={isRtl ? 'سحب الدور' : 'Revoke role'}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scope Management */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-700">
                        {isRtl ? 'نطاق الصلاحية الجغرافية والبرامجية' : 'Geographic & Sector Scopes'}
                      </h4>
                      <button
                        onClick={() => {
                          setFormError(null);
                          setRationale('');
                          setScopeModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isRtl ? 'تعديل النطاق' : 'Edit Scope'}
                      </button>
                    </div>

                    <div className="text-xs text-slate-600 p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <div>
                        <span className="font-semibold text-slate-700">
                          {isRtl ? 'المحافظات: ' : 'Governorates: '}
                        </span>
                        {selectedStaff.governorates.length > 0
                          ? selectedStaff.governorates.join(', ')
                          : isRtl
                            ? 'غير مقيد'
                            : 'Unrestricted'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">
                          {isRtl ? 'القطاعات: ' : 'Sectors: '}
                        </span>
                        {selectedStaff.programmes.length > 0
                          ? selectedStaff.programmes.join(', ')
                          : isRtl
                            ? 'كافة القطاعات'
                            : 'All Sectors'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <UserCog className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  {isRtl
                    ? 'اختر موظفاً من القائمة لعرض وإدارة أدواره وصلاحياته'
                    : 'Select a staff member from the directory to manage roles and scopes'}
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-800">
                {isRtl
                  ? 'سجل التغييرات الأمنية على أدوار الموظفين (Role Management Audit)'
                  : 'Staff Role & Scope Audit Trail'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {isRtl
                ? 'توثيق غير قابل للتعديل لكافة قرارات إسناد وسحب الصلاحيات الإدارية مع بيان المسوغ الإداري'
                : 'Append-only audit trail logging all role assignments, revocations, and scope changes with administrative rationale'}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-600 text-start">
                <thead className="bg-slate-50 text-slate-700 border-y border-slate-200 font-semibold">
                  <tr>
                    <th className="p-2.5 text-start">{isRtl ? 'الوقت' : 'Timestamp'}</th>
                    <th className="p-2.5 text-start">{isRtl ? 'العملية' : 'Action'}</th>
                    <th className="p-2.5 text-start">{isRtl ? 'الموظف' : 'Staff Member'}</th>
                    <th className="p-2.5 text-start">{isRtl ? 'الدور / النطاق' : 'Role / Scope'}</th>
                    <th className="p-2.5 text-start">{isRtl ? 'المسوغ الإداري' : 'Rationale'}</th>
                    <th className="p-2.5 text-start">{isRtl ? 'المنفذ' : 'Actor'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="p-2.5 whitespace-nowrap text-slate-500">
                        {formatDate(rec.timestamp, locale)}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${rec.action === 'ASSIGN_ROLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.action === 'REVOKE_ROLE'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                        >
                          {rec.action}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium text-slate-800">
                        <BidiText>{rec.staffEmail}</BidiText>
                      </td>
                      <td className="p-2.5 font-semibold text-slate-700">
                        {rec.roleOrScope.startsWith('IQ-') || rec.roleOrScope.includes('/')
                          ? rec.roleOrScope
                          : t(`role.${rec.roleOrScope}`, rec.roleOrScope)}
                      </td>
                      <td className="p-2.5 max-w-xs truncate text-slate-600" title={rec.rationale}>
                        {rec.rationale}
                      </td>
                      <td className="p-2.5 text-slate-500">
                        <BidiText>{rec.performedBy}</BidiText>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal: Assign Role */}
        {assignModalOpen && selectedStaff && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-modal-title"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 id="assign-modal-title" className="text-base font-bold text-slate-900">
                  {isRtl ? 'إسناد دور إداري أو ميداني' : 'Assign System Role'}
                </h3>
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAssignRole} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRtl ? 'الموظف' : 'Staff Member'}
                  </label>
                  <div className="text-xs bg-slate-100 p-2 rounded text-slate-700 font-medium">
                    {locale === 'ar' ? selectedStaff.fullNameAr : selectedStaff.fullNameEn} (
                    {selectedStaff.email})
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRtl ? 'الدور الوظيفي المطلوب إسناده' : 'Role to Assign'}
                  </label>
                  <select
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value as SystemRole)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {SystemRoleSchema.options.map(role => (
                      <option key={role} value={role}>
                        {t(`role.${role}`)} ({role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRtl
                      ? 'المسوغ الإداري للتعيين (10 أحرف كحد أدنى إلزامي للرقابة)'
                      : 'Administrative Rationale (Minimum 10 characters required for audit)'}
                  </label>
                  <textarea
                    rows={3}
                    value={rationale}
                    onChange={e => setRationale(e.target.value)}
                    placeholder={
                      isRtl
                        ? 'مثال: تكليف رسمي لتغطية أعمال التقييم الميداني في قضاء تلعفر'
                        : 'e.g., Formal assignment to cover field assessments in Tal Afar district'
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    {rationale.length}/10 {isRtl ? 'حرف' : 'chars'}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
                  >
                    {isRtl ? 'اعتماد التعيين' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Revoke Role */}
        {revokeModalOpen && selectedStaff && roleToRevoke && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-modal-title"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 id="revoke-modal-title" className="text-base font-bold text-rose-700">
                  {isRtl ? 'سحب دور وظيفي' : 'Revoke System Role'}
                </h3>
                <button
                  onClick={() => setRevokeModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleRevokeRole} className="space-y-4">
                <p className="text-xs text-slate-600">
                  {isRtl
                    ? `هل أنت متأكد من سحب دور "${t(`role.${roleToRevoke}`)}" من الموظف؟`
                    : `Are you sure you want to revoke the role "${t(`role.${roleToRevoke}`)}" from this staff member?`}
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRtl
                      ? 'سبب وسياق سحب الصلاحية (10 أحرف كحد أدنى إلزامي)'
                      : 'Revocation Context / Rationale (Minimum 10 chars mandatory)'}
                  </label>
                  <textarea
                    rows={3}
                    value={rationale}
                    onChange={e => setRationale(e.target.value)}
                    placeholder={
                      isRtl
                        ? 'مثال: انتهاء فترة التكليف المؤقتة ونقل المهام إلى المشرف الأساسي'
                        : 'e.g., End of temporary assignment and handover to permanent supervisor'
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    {rationale.length}/10 {isRtl ? 'حرف' : 'chars'}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setRevokeModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 shadow-sm"
                  >
                    {isRtl ? 'تأكيد سحب الدور' : 'Confirm Revocation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Update Scope */}
        {scopeModalOpen && selectedStaff && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="scope-modal-title"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 id="scope-modal-title" className="text-base font-bold text-slate-900">
                  {isRtl ? 'تحديث النطاق الجغرافي والبرامجي' : 'Update Staff Scope'}
                </h3>
                <button
                  onClick={() => setScopeModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateScope} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRtl ? 'المحافظة المصرح بها' : 'Authorized Governorate'}
                  </label>
                  <select
                    value={selectedGovernorate}
                    onChange={e => setSelectedGovernorate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="IQ-BG">بغداد (Baghdad - IQ-BG)</option>
                    <option value="IQ-NI">نينوى (Ninewa - IQ-NI)</option>
                    <option value="IQ-BA">البصرة (Basra - IQ-BA)</option>
                    <option value="IQ-AN">الأنبار (Anbar - IQ-AN)</option>
                    <option value="IQ-KI">كركوك (Kirkuk - IQ-KI)</option>
                    <option value="IQ-AR">أربيل (Erbil - IQ-AR)</option>
                    <option value="IQ-SU">السليمانية (Sulaymaniyah - IQ-SU)</option>
                    <option value="IQ-DA">دهوك (Duhok - IQ-DA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRtl ? 'البرنامج الإنساني' : 'Humanitarian Programme'}
                  </label>
                  <select
                    value={selectedProgramme}
                    onChange={e => setSelectedProgramme(e.target.value as ProgrammeCode)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {ProgrammeCodeSchema.options.map(prog => (
                      <option key={prog} value={prog}>
                        {prog}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRtl
                      ? 'المسوغ الإداري لتحديث النطاق (10 أحرف كحد أدنى)'
                      : 'Scope Modification Rationale (10 chars minimum)'}
                  </label>
                  <textarea
                    rows={3}
                    value={rationale}
                    onChange={e => setRationale(e.target.value)}
                    placeholder={
                      isRtl
                        ? 'مثال: تفويض إضافي لمتابعة حالات الإغاثة العاجلة في نينوى'
                        : 'e.g., Additional authorization to supervise emergency relief in Ninewa'
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    {rationale.length}/10 {isRtl ? 'حرف' : 'chars'}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setScopeModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
                  >
                    {isRtl ? 'حفظ النطاق' : 'Save Scope'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AppShell>
    </RoleGuard>
  );
}

