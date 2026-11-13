'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { SystemRole, ProgrammeCode } from '@humanity/contracts';
import { getPublicClientEnv } from './env';

export interface StaffUser {
  id: string;
  email: string;
  fullNameAr: string;
  fullNameEn: string;
  roles: SystemRole[];
  governorates: string[];
  programmes: ProgrammeCode[];
}

interface AuthContextType {
  user: StaffUser | null;
  activeRole: SystemRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionExpired: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  switchActiveRole: (role: SystemRole) => void;
  hasRole: (role: SystemRole) => boolean;
  hasAnyRole: (roles: SystemRole[]) => boolean;
}

// Synthetic Staff Registry for development and demonstration
export const DEMO_STAFF_REGISTRY: Record<string, StaffUser> = {
  'supervisor.baghdad@humanity.local': {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'supervisor.baghdad@humanity.local',
    fullNameAr: 'سارة كريم كاظم',
    fullNameEn: 'Sara Karim Kazim',
    roles: ['supervisor'],
    governorates: ['IQ-BG'],
    programmes: ['FIN', 'FOD', 'MED', 'HOU', 'EDU', 'EMG', 'EMP', 'SOC'],
  },
  'caseworker.ninewa@humanity.local': {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'caseworker.ninewa@humanity.local',
    fullNameAr: 'يوسف محمود عمر',
    fullNameEn: 'Yousif Mahmoud Omar',
    roles: ['caseworker'],
    governorates: ['IQ-NI'],
    programmes: ['FIN'],
  },
  'finance.maker@humanity.local': {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'finance.maker@humanity.local',
    fullNameAr: 'زينب أحمد حسن',
    fullNameEn: 'Zainab Ahmed Hassan',
    roles: ['finance_maker'],
    governorates: ['IQ-BG', 'IQ-NI', 'IQ-BA'],
    programmes: ['FIN', 'EMG'],
  },
  'finance.checker@humanity.local': {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'finance.checker@humanity.local',
    fullNameAr: 'حيدر مهدي جاسم',
    fullNameEn: 'Haidar Mahdi Jasim',
    roles: ['finance_checker'],
    governorates: ['IQ-BG', 'IQ-NI', 'IQ-BA', 'IQ-AN', 'IQ-KI'],
    programmes: ['FIN', 'FOD', 'MED', 'HOU', 'EDU', 'EMG', 'EMP', 'SOC'],
  },
  'auditor@humanity.local': {
    id: '00000000-0000-0000-0000-000000000006',
    email: 'auditor@humanity.local',
    fullNameAr: 'نور هادي فؤاد',
    fullNameEn: 'Noor Hadi Fuad',
    roles: ['auditor'],
    governorates: ['IQ-BG', 'IQ-NI', 'IQ-BA', 'IQ-AN', 'IQ-KI', 'IQ-AR', 'IQ-SU', 'IQ-DA'],
    programmes: ['FIN', 'FOD', 'MED', 'HOU', 'EDU', 'EMG', 'EMP', 'SOC'],
  },
  'security.admin@humanity.local': {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'security.admin@humanity.local',
    fullNameAr: 'علي حسين عبد الله',
    fullNameEn: 'Ali Hussein Abdullah',
    roles: ['security_admin'],
    governorates: [],
    programmes: [],
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [activeRole, setActiveRole] = useState<SystemRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  useEffect(() => {
    // Validate client environment variables
    getPublicClientEnv();

    // Check stored demo session
    const storedEmail = localStorage.getItem('humanity_session_email');
    if (storedEmail && DEMO_STAFF_REGISTRY[storedEmail]) {
      const staff = DEMO_STAFF_REGISTRY[storedEmail];
      setUser(staff);
      setActiveRole(staff.roles[0] || null);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    const staff = DEMO_STAFF_REGISTRY[email.toLowerCase().trim()];
    if (staff) {
      setUser(staff);
      setActiveRole(staff.roles[0] || null);
      localStorage.setItem('humanity_session_email', staff.email);
      setIsSessionExpired(false);
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    setActiveRole(null);
    localStorage.removeItem('humanity_session_email');
    setIsSessionExpired(false);
  };

  const switchActiveRole = (role: SystemRole) => {
    if (user?.roles.includes(role)) {
      setActiveRole(role);
    }
  };

  const hasRole = (role: SystemRole): boolean => {
    if (!user) return false;
    return activeRole === role || user.roles.includes(role);
  };

  const hasAnyRole = (roles: SystemRole[]): boolean => {
    if (!user) return false;
    return roles.some(r => hasRole(r));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        isAuthenticated: !!user,
        isLoading,
        isSessionExpired,
        login,
        logout,
        switchActiveRole,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
