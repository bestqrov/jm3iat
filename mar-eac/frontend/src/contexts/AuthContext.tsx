import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'WATER_READER';
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
  trialEndsAt?: string;
  modules?: string[];
  subscription?: {
    plan: 'BASIC' | 'STANDARD' | 'PREMIUM';
    status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    expiresAt?: string;
  };
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isWaterReader: boolean;
  hasModule: (mod: string) => boolean;
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
  hasModule: () => false,
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
    // Legacy fallback: plan-based
    const LEGACY: Record<string, string[]> = {
      WATER:      ['PREMIUM'],
      PROJECTS:   ['PREMIUM'],
      PRODUCTIVE: ['STANDARD', 'PREMIUM'],
    };
    return (LEGACY[mod] ?? []).includes(sub.plan);
  };

  return (
    <AuthContext.Provider value={{
      user,
      organization,
      isAuthenticated: !!user,
      isLoading,
      isSuperAdmin: user?.role === 'SUPER_ADMIN',
      isWaterReader: user?.role === 'WATER_READER',
      hasModule,
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
