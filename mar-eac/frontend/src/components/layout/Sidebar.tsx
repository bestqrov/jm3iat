import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, DollarSign, FileText,
  Briefcase, Droplets, BarChart2, Bell, Shield, Settings,
  LogOut, Sun, Moon, X, Globe, UserCog,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  plan?: string;
  superAdminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, organization, logout, isSuperAdmin, isWaterReader } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['main', 'management', 'rural']);

  const sub = organization?.subscription;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Water readers only see water management (no settings, no other pages)
  const navGroups: NavGroup[] = isWaterReader ? [
    {
      label: '',
      items: [
        { to: '/water', icon: <Droplets size={18} />, label: t('nav.water') },
      ],
    },
  ] : [
    {
      label: '',
      items: [
        { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: t('nav.dashboard') },
      ],
    },
    {
      label: t('nav.management'),
      items: [
        { to: '/administratifs', icon: <UserCog size={18} />, label: t('nav.administratifs') },
        { to: '/members', icon: <Users size={18} />, label: t('nav.members') },
        { to: '/meetings', icon: <Calendar size={18} />, label: t('nav.meetings') },
        { to: '/finance', icon: <DollarSign size={18} />, label: t('nav.finance'), plan: 'STANDARD' },
        { to: '/documents', icon: <FileText size={18} />, label: t('nav.documents') },
      ],
    },
    {
      label: t('nav.ruralProjects'),
      items: [
        { to: '/projects', icon: <Briefcase size={18} />, label: t('nav.projects'), plan: 'PREMIUM' },
        { to: '/requests', icon: <FileText size={18} />, label: t('nav.requests') },
        { to: '/water', icon: <Droplets size={18} />, label: t('nav.water'), plan: 'PREMIUM' },
      ],
    },
    {
      label: '',
      items: [
        { to: '/reports', icon: <BarChart2 size={18} />, label: t('nav.reports'), plan: 'STANDARD' },
        { to: '/reminders', icon: <Bell size={18} />, label: t('nav.reminders'), plan: 'PREMIUM' },
        { to: '/settings', icon: <Settings size={18} />, label: t('nav.settings') },
        ...(isSuperAdmin ? [{ to: '/superadmin', icon: <Shield size={18} />, label: t('nav.superadmin') }] : []),
      ],
    },
  ];

  const PLAN_LEVELS: Record<string, number> = { BASIC: 1, STANDARD: 2, PREMIUM: 3 };
  const isLocked = (plan?: string) => {
    if (!plan || !sub) return false;
    if (sub.status === 'TRIAL' || sub.status === 'ACTIVE') {
      return (PLAN_LEVELS[sub.plan] || 0) < (PLAN_LEVELS[plan] || 0);
    }
    return true;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">MA</span>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 dark:text-white text-sm">Mar E-A.C</div>
            {organization && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{organization.name}</div>
            )}
          </div>
        </div>
        {sub && (
          <div className="mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              sub.status === 'TRIAL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {sub.status === 'TRIAL' ? `${t('subscription.trial')} • ` : ''}{sub.plan}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-2">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const locked = isLocked(item.plan);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'} ${locked ? 'opacity-50' : ''}`
                  }
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {locked && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                      {item.plan}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {/* Language & Theme */}
        <div className="flex gap-2">
          <button
            onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Globe size={14} />
            {lang === 'ar' ? 'FR' : 'عر'}
          </button>
          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? (lang === 'ar' ? 'فاتح' : 'Clair') : (lang === 'ar' ? 'داكن' : 'Sombre')}
          </button>
        </div>
        {/* User info + logout */}
        <div className="flex items-center gap-2 p-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 dark:text-primary-400 font-semibold text-xs">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{user?.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title={t('nav.logout')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Desktop sidebar */}
      <aside className={`
        fixed top-0 bottom-0 z-50 w-64 bg-white dark:bg-gray-800 border-e border-gray-200 dark:border-gray-700
        transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : (document.documentElement.dir === 'rtl' ? 'translate-x-full' : '-translate-x-full')}
      `}
        style={{ [document.documentElement.dir === 'rtl' ? 'right' : 'left']: 0 }}
      >
        {/* Mobile close btn */}
        <button
          onClick={onClose}
          className="absolute top-3 start-3 lg:hidden p-1 rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
};
