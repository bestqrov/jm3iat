import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, DollarSign, FileText,
  Briefcase, Droplets, BarChart2, Bell, Shield, Settings,
  LogOut, Sun, Moon, X, Globe, UserCog, ShoppingBag,
  Building2, FolderKanban, Layers, CreditCard, Bus,
  Activity, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  plan?: string;
  module?: string;
  tab?: string; // superadmin tab matching via ?tab=
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// ─── Association theme ────────────────────────────────────────────────────────

type OrgTheme = {
  logoBg: string;         // inline gradient background
  activeClass: string;    // active nav item bg+text classes
  activeBorder: string;   // inline border-color for active indicator
  badgeBg: string;
  badgeText: string;
  stripeBg: string;       // top-of-sidebar colored stripe
  icon: React.ReactNode;
  labelFr: string;
  labelAr: string;
};

const getOrgTheme = (modules: string[]): OrgTheme => {
  const hasWater = modules.includes('WATER');
  const hasProd  = modules.includes('PRODUCTIVE');
  const hasProj  = modules.includes('PROJECTS');

  if (hasWater && hasProd) return {
    logoBg: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    activeClass: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-semibold',
    activeBorder: '#7c3aed',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/30',
    badgeText: 'text-purple-700 dark:text-purple-300',
    stripeBg: 'linear-gradient(90deg, #7c3aed, #4f46e5, #0891b2)',
    icon: <Layers size={14} />,
    labelFr: 'Productive + Eau',
    labelAr: 'إنتاجية + ماء',
  };
  if (hasWater) return {
    logoBg: 'linear-gradient(135deg, #0891b2, #2563eb)',
    activeClass: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 font-semibold',
    activeBorder: '#0891b2',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    stripeBg: 'linear-gradient(90deg, #0891b2, #2563eb)',
    icon: <Droplets size={14} />,
    labelFr: 'Association de l\'eau',
    labelAr: 'جمعية الماء',
  };
  if (hasProd) return {
    logoBg: 'linear-gradient(135deg, #059669, #0d9488)',
    activeClass: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-semibold',
    activeBorder: '#059669',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    stripeBg: 'linear-gradient(90deg, #059669, #0d9488)',
    icon: <ShoppingBag size={14} />,
    labelFr: 'Association productive',
    labelAr: 'جمعية إنتاجية',
  };
  if (hasProj) return {
    logoBg: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    activeClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold',
    activeBorder: '#2563eb',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/30',
    badgeText: 'text-blue-700 dark:text-blue-300',
    stripeBg: 'linear-gradient(90deg, #2563eb, #4f46e5)',
    icon: <FolderKanban size={14} />,
    labelFr: 'Association avec projets',
    labelAr: 'جمعية المشاريع',
  };
  return {
    logoBg: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    activeClass: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-semibold',
    activeBorder: '#4f46e5',
    badgeBg: 'bg-gray-100 dark:bg-gray-700',
    badgeText: 'text-gray-600 dark:text-gray-300',
    stripeBg: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
    icon: <Building2 size={14} />,
    labelFr: 'Association classique',
    labelAr: 'جمعية عادية',
  };
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, organization, logout, isSuperAdmin, isWaterReader, hasModule, canAccess, isFullAccess } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const sub  = organization?.subscription;
  const mods = organization?.modules ?? [];
  const orgTheme = getOrgTheme(mods);
  const isAr = lang === 'ar';

  // For superadmin: determine active tab from query param
  const currentSATab = new URLSearchParams(location.search).get('tab') || 'dashboard';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const PLAN_LEVELS: Record<string, number> = { BASIC: 1, STANDARD: 2, PREMIUM: 3 };
  const isPlanLocked = (plan?: string) => {
    if (!plan || !sub) return false;
    if (sub.status === 'TRIAL' || sub.status === 'ACTIVE') {
      return (PLAN_LEVELS[sub.plan] || 0) < (PLAN_LEVELS[plan] || 0);
    }
    return true;
  };

  // ── SuperAdmin-specific nav ────────────────────────────────────────────────
  const superAdminGroups: NavGroup[] = [
    {
      label: '',
      items: [
        { to: '/superadmin', icon: <BarChart2 size={18} />, label: isAr ? 'لوحة التحكم' : 'Tableau de bord', tab: 'dashboard' },
      ],
    },
    {
      label: isAr ? 'إدارة المنصة' : 'Gestion de la plateforme',
      items: [
        { to: '/superadmin?tab=orgs',     icon: <Building2 size={18} />,  label: isAr ? 'الجمعيات'   : 'Associations',  tab: 'orgs'     },
        { to: '/superadmin?tab=payments', icon: <CreditCard size={18} />, label: isAr ? 'المدفوعات'  : 'Paiements',     tab: 'payments' },
        { to: '/superadmin?tab=users',    icon: <Users size={18} />,      label: isAr ? 'المستخدمون' : 'Utilisateurs',  tab: 'users'    },
      ],
    },
    {
      label: '',
      items: [
        { to: '/settings', icon: <Settings size={18} />, label: t('nav.settings') },
      ],
    },
  ];

  // Water readers only see water
  const navGroups: NavGroup[] = isWaterReader ? [
    { label: '', items: [{ to: '/water', icon: <Droplets size={18} />, label: t('nav.water') }] },
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
        ...(isFullAccess            ? [{ to: '/administratifs', icon: <UserCog size={18} />,    label: t('nav.administratifs') }] : []),
        ...(isFullAccess            ? [{ to: '/members',        icon: <Users size={18} />,      label: t('nav.members') }]        : []),
        ...(canAccess('meetings')   ? [{ to: '/meetings',       icon: <Calendar size={18} />,   label: t('nav.meetings') }]       : []),
        ...(canAccess('finance')    ? [{ to: '/finance',        icon: <DollarSign size={18} />, label: t('nav.finance'), plan: 'STANDARD' }] : []),
        ...(canAccess('documents')  ? [{ to: '/documents',      icon: <FileText size={18} />,   label: t('nav.documents') }]      : []),
      ],
    },
    {
      label: t('nav.ruralProjects'),
      items: [
        ...(isFullAccess && hasModule('PROJECTS')   ? [{ to: '/projects',  icon: <Briefcase size={18} />,   label: t('nav.projects') }]  : []),
        ...(canAccess('requests')                   ? [{ to: '/requests',  icon: <FileText size={18} />,    label: t('nav.requests') }]  : []),
        ...(isFullAccess && hasModule('WATER')      ? [{ to: '/water',     icon: <Droplets size={18} />,    label: t('nav.water') }]     : []),
        ...(isFullAccess && hasModule('PRODUCTIVE') ? [{ to: '/assoc',     icon: <ShoppingBag size={18} />, label: t('nav.assoc') }]     : []),
        ...(isFullAccess && hasModule('TRANSPORT')  ? [{ to: '/transport', icon: <Bus size={18} />,         label: t('nav.transport') }] : []),
      ],
    },
    {
      label: '',
      items: [
        ...(canAccess('reports')  ? [{ to: '/reports',   icon: <BarChart2 size={18} />, label: t('nav.reports'),   plan: 'STANDARD' }] : []),
        ...(isFullAccess          ? [{ to: '/reminders', icon: <Bell size={18} />,      label: t('nav.reminders'), plan: 'PREMIUM' }]   : []),
        { to: '/calendar',  icon: <Calendar size={18} />,   label: isAr ? 'التقويم' : 'Calendrier' },
        ...(canAccess('finance')  ? [{ to: '/recurring', icon: <RefreshCw size={18} />, label: isAr ? 'الدفعات المتكررة' : 'Récurrents' }] : []),
        ...(isFullAccess          ? [{ to: '/activity',  icon: <Activity size={18} />,  label: isAr ? 'سجل النشاطات' : 'Activité' }]   : []),
        ...(isFullAccess          ? [{ to: '/settings',  icon: <Settings size={18} />,  label: t('nav.settings') }]                     : []),
      ],
    },
  ];

  // Filter out plan-locked items (hide, don't show grayed)
  const filteredGroups = (isSuperAdmin ? superAdminGroups : navGroups).map(group => ({
    ...group,
    items: group.items.filter(item => !isPlanLocked(item.plan)),
  })).filter(group => group.items.length > 0);

  const sidebarContent = (
    <div className="flex flex-col h-full">

      {/* Colored top stripe */}
      <div className="h-1 w-full" style={{ background: orgTheme.stripeBg }} />

      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {/* Themed logo */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: orgTheme.logoBg }}
          >
            <span className="font-bold text-sm text-white">MA</span>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 dark:text-white text-sm">Mar E-A.C</div>
            {organization && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{organization.name}</div>
            )}
          </div>
        </div>

        {/* Module type badge / superadmin badge */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {isSuperAdmin ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              <Shield size={11} />
              {isAr ? 'مدير النظام' : 'Super Admin'}
            </span>
          ) : user?.role === 'PRESIDENT' ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              {isAr ? 'الرئيس' : 'Président'}
            </span>
          ) : user?.role === 'TREASURER' ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              {isAr ? 'أمين المال' : 'Trésorier'}
            </span>
          ) : user?.role === 'SECRETARY' ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              {isAr ? 'الكاتب' : 'Secrétaire'}
            </span>
          ) : (
            <>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${orgTheme.badgeBg} ${orgTheme.badgeText}`}>
                {orgTheme.icon}
                {isAr ? orgTheme.labelAr : orgTheme.labelFr}
              </span>
              {sub && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  sub.status === 'TRIAL'   ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  sub.status === 'ACTIVE'  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {sub.status === 'TRIAL' ? (isAr ? 'تجريبي' : 'Essai') : sub.plan}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-2">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              // For superadmin tab items, derive active state from query param
              const tabActive = item.tab !== undefined
                ? currentSATab === item.tab
                : undefined;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.tab !== undefined}
                  onClick={onClose}
                  className={({ isActive }) => {
                    const active = tabActive !== undefined ? tabActive : isActive;
                    return `sidebar-item ${active ? orgTheme.activeClass : 'sidebar-item-inactive'}`;
                  }}
                  style={({ isActive }) => {
                    const active = tabActive !== undefined ? tabActive : isActive;
                    return active ? { borderInlineEnd: `3px solid ${orgTheme.activeBorder}` } : {};
                  }}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
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
            {theme === 'dark' ? (isAr ? 'فاتح' : 'Clair') : (isAr ? 'داكن' : 'Sombre')}
          </button>
        </div>
        {/* User info + logout */}
        <div className="flex items-center gap-2 p-2 rounded-lg">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: orgTheme.logoBg, opacity: 0.85 }}
          >
            <span className="font-semibold text-xs text-white">
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
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 bottom-0 z-50 w-64 bg-white dark:bg-gray-800 border-e border-gray-200 dark:border-gray-700
        transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : (document.documentElement.dir === 'rtl' ? 'translate-x-full' : '-translate-x-full')}
      `}
        style={{ [document.documentElement.dir === 'rtl' ? 'right' : 'left']: 0 }}
      >
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
