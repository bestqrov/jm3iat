import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../lib/api';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PRESIDENT' | 'TREASURER' | 'SECRETARY' | 'MANAGER' | 'WATER_READER';

// Modules each restricted role can access
const ROLE_ACCESS: Record<string, string[]> = {
  TREASURER: ['finance', 'reports'],
  SECRETARY: ['documents', 'reports', 'requests', 'meetings'],
};

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
}

interface Organization {
  id: string;
  name: string;
  nameAr?: string;
  email: string;
  phone?: string;
  logo?: string;
  address?: string;
  addressAr?: string;
  city?: string;
  cityAr?: string;
  region?: string;
  regionAr?: string;
  description?: string;
  descriptionAr?: string;
  foundingDate?: string;
  activities?: string;
  activitiesAr?: string;
  evolutionInstance?: string | null;
  // Social media
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  // Bank
  bankName?: string;
  bankAccount?: string;
  bankRib?: string;
  assocType?: string;
  trialEndsAt?: string;
  modules?: string[];
  subscription?: {
    plan: 'BASIC' | 'STANDARD' | 'PREMIUM';
    status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    expiresAt?: string;
    pendingPlan?: string | null;
  };
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isWaterReader: boolean;
  isAdmin: boolean;
  isPresident: boolean;
  isTreasurer: boolean;
  isSecretary: boolean;
  isFullAccess: boolean;
  hasModule: (mod: string) => boolean;
  canAccess: (module: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  orgName: string;
  orgEmail: string;
  orgPhone?: string;
  orgCity?: string;
  orgRegion?: string;
  adminName: string;
  adminEmail: string;
  password: string;
  modules?: string[];
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  organization: null,
  isAuthenticated: false,
  isLoading: true,
  isSuperAdmin: false,
  isWaterReader: false,
  isAdmin: false,
  isPresident: false,
  isTreasurer: false,
  isSecretary: false,
  isFullAccess: false,
  hasModule: () => false,
  canAccess: () => false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAuthData = (data: any) => {
    setUser(data.user);
    setOrganization(data.organization || null);
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await authApi.getMe();
      setUser(res.data);
      setOrganization(res.data.organization || null);
    } catch {
      logout();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.getMe()
        .then((res) => {
          setUser(res.data);
          setOrganization(res.data.organization || null);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { token, ...rest } = res.data;
    localStorage.setItem('token', token);
    setAuthData(rest);
  };

  const register = async (data: RegisterData) => {
    const res = await authApi.register(data);
    const { token, ...rest } = res.data;
    localStorage.setItem('token', token);
    setAuthData(rest);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setOrganization(null);
  };

  // hasModule: new orgs check modules array; legacy orgs (empty) fall back to plan
  const hasModule = (mod: string): boolean => {
    const sub = organization?.subscription;
    const modules = organization?.modules ?? [];
    if (!sub || sub.status === 'EXPIRED' || sub.status === 'CANCELLED') return false;
    if (modules.length > 0) return modules.includes(mod);
    // Legacy fallback: plan-based (matches actual pack catalogue)
    const LEGACY: Record<string, string[]> = {
      WATER:      ['PREMIUM'],
      PROJECTS:   ['STANDARD', 'PREMIUM'],
      PRODUCTIVE: ['PREMIUM'],
      TRANSPORT:  ['STANDARD', 'PREMIUM'],
      SPORTS:     ['STANDARD', 'PREMIUM'],
    };
    return (LEGACY[mod] ?? []).includes(sub.plan);
  };

  // canAccess: SUPER_ADMIN/ADMIN/PRESIDENT bypass all; restricted roles checked against ROLE_ACCESS
  const canAccess = (module: string): boolean => {
    const role = user?.role;
    if (!role) return false;
    if (['SUPER_ADMIN', 'ADMIN', 'PRESIDENT'].includes(role)) return true;
    return (ROLE_ACCESS[role] ?? []).includes(module);
  };

  const role = user?.role;

  return (
    <AuthContext.Provider value={{
      user,
      organization,
      isAuthenticated: !!user,
      isLoading,
      isSuperAdmin:  role === 'SUPER_ADMIN',
      isWaterReader: role === 'WATER_READER',
      isAdmin:       role === 'ADMIN',
      isPresident:   role === 'PRESIDENT',
      isTreasurer:   role === 'TREASURER',
      isSecretary:   role === 'SECRETARY',
      isFullAccess:  ['SUPER_ADMIN', 'ADMIN', 'PRESIDENT'].includes(role ?? ''),
      hasModule,
      canAccess,
      login,
      register,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
