import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import {
  Shield, Building2, Users, Pencil, Trash2, ToggleLeft, ToggleRight,
  KeyRound, Copy, Check, Droplets, ShoppingBag, FolderKanban, Layers,
  TrendingUp, DollarSign, AlertTriangle, Search, Plus,
  BarChart2, CreditCard, RefreshCw, Clock,
  ExternalLink, FileText,
  Package, Tag, Mail, Zap, Brain, Settings, Activity,
  ChevronLeft, ChevronRight,
  LogOut, Globe, Sun, Moon, X, Bus,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  AreaChart, Area,
} from 'recharts';
import { superadminApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDate } from '../../lib/utils';

// ── New Tab Components ────────────────────────────────────────────────────────
import { PacksTab }        from './tabs/PacksTab';
import { SubscriptionsTab } from './tabs/SubscriptionsTab';
import { AnalyticsTab }    from './tabs/AnalyticsTab';
import { FeatureUsageTab } from './tabs/FeatureUsageTab';
import { MarketingTab }    from './tabs/MarketingTab';
import { AutomationTab }   from './tabs/AutomationTab';
import { PromoCodesTab }   from './tabs/PromoCodesTab';
import { AIInsightsTab }   from './tabs/AIInsightsTab';
import { SettingsTab }     from './tabs/SettingsTab';

// ─── Types ────────────────────────────────────────────────────────────────────

type AssocTypeKey = 'REGULAR' | 'PROJECTS' | 'WATER' | 'PRODUCTIVE' | 'PRODUCTIVE_WATER' | 'TRANSPORT';
type ActiveTab =
  | 'dashboard' | 'orgs' | 'subscriptions' | 'payments' | 'users'
  | 'packs' | 'analytics' | 'usage' | 'marketing' | 'automation'
  | 'promos' | 'insights' | 'settings';

// ─── Association type config ──────────────────────────────────────────────────

const ASSOC_TYPES: {
  key: AssocTypeKey; labelFr: string; labelAr: string; price: number;
  icon: React.ReactNode; badge: string; dot: string;
}[] = [
  { key: 'REGULAR',          price: 99,  labelFr: 'Association classique',    labelAr: 'جمعية عادية',       icon: <Building2 size={13} />,   badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',            dot: '#6b7280' },
  { key: 'PROJECTS',         price: 149, labelFr: 'Avec projets',             labelAr: 'مع مشاريع',         icon: <FolderKanban size={13} />, badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',          dot: '#2563eb' },
  { key: 'WATER',            price: 199, labelFr: 'Gestion de l\'eau',        labelAr: 'جمعية الماء',       icon: <Droplets size={13} />,    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',           dot: '#0891b2' },
  { key: 'PRODUCTIVE',       price: 199, labelFr: 'Association productive',   labelAr: 'جمعية إنتاجية',     icon: <ShoppingBag size={13} />, badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: '#059669' },
  { key: 'PRODUCTIVE_WATER', price: 299, labelFr: 'Productive + Eau',         labelAr: 'إنتاجية + ماء',     icon: <Layers size={13} />,      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',   dot: '#7c3aed' },
  { key: 'TRANSPORT',        price: 179, labelFr: 'Transport scolaire',        labelAr: 'النقل المدرسي',     icon: <Bus size={13} />,         badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',   dot: '#ea580c' },
];

const getAssocType = (modules: string[] = []): AssocTypeKey => {
  const hasProd      = modules.includes('PRODUCTIVE');
  const hasWater     = modules.includes('WATER');
  const hasProj      = modules.includes('PROJECTS');
  const hasTransport = modules.includes('TRANSPORT');
  if (hasProd && hasWater) return 'PRODUCTIVE_WATER';
  if (hasProd)      return 'PRODUCTIVE';
  if (hasWater)     return 'WATER';
  if (hasProj)      return 'PROJECTS';
  if (hasTransport) return 'TRANSPORT';
  return 'REGULAR';
};

const AssocTypeBadge: React.FC<{ modules: string[]; isAr: boolean }> = ({ modules, isAr }) => {
  const key = getAssocType(modules);
  const cfg = ASSOC_TYPES.find(t => t.key === key)!;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
      {cfg.icon} {isAr ? cfg.labelAr : cfg.labelFr}
    </span>
  );
};

const SubStatusBadge: React.FC<{ status?: string; isAr: boolean }> = ({ status, isAr }) => {
  const cfg: Record<string, { cls: string; fr: string; ar: string }> = {
    TRIAL:     { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',     fr: 'Essai',   ar: 'تجريبي' },
    ACTIVE:    { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', fr: 'Actif',   ar: 'نشط' },
    EXPIRED:   { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             fr: 'Expiré',  ar: 'منتهي' },
    CANCELLED: { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',             fr: 'Annulé',  ar: 'ملغي' },
  };
  const s = cfg[status || ''] || cfg['EXPIRED'];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{isAr ? s.ar : s.fr}</span>;
};

// ─── Tab navigation config ────────────────────────────────────────────────────

const TAB_GROUPS = [
  {
    labelFr: 'Vue d\'ensemble',
    labelAr: 'نظرة عامة',
    tabs: [
      { key: 'dashboard',     iconEl: <BarChart2 size={15} />,     labelFr: 'Tableau de bord',   labelAr: 'لوحة التحكم' },
      { key: 'analytics',     iconEl: <TrendingUp size={15} />,    labelFr: 'Analytics',         labelAr: 'التحليلات' },
      { key: 'insights',      iconEl: <Brain size={15} />,         labelFr: 'IA Insights',       labelAr: 'رؤى الذكاء الاصطناعي' },
      { key: 'usage',         iconEl: <Activity size={15} />,      labelFr: 'Utilisation',       labelAr: 'الاستخدام' },
    ],
  },
  {
    labelFr: 'Gestion',
    labelAr: 'الإدارة',
    tabs: [
      { key: 'orgs',          iconEl: <Building2 size={15} />,     labelFr: 'Organisations',     labelAr: 'المنظمات' },
      { key: 'subscriptions', iconEl: <RefreshCw size={15} />,     labelFr: 'Abonnements',       labelAr: 'الاشتراكات' },
      { key: 'payments',      iconEl: <CreditCard size={15} />,    labelFr: 'Paiements',         labelAr: 'المدفوعات' },
      { key: 'users',         iconEl: <Users size={15} />,         labelFr: 'Utilisateurs',      labelAr: 'المستخدمون' },
    ],
  },
  {
    labelFr: 'Offres & Marketing',
    labelAr: 'الباقات والتسويق',
    tabs: [
      { key: 'packs',         iconEl: <Package size={15} />,       labelFr: 'Offres & Tarifs',   labelAr: 'الباقات والأسعار' },
      { key: 'promos',        iconEl: <Tag size={15} />,           labelFr: 'Codes Promo',       labelAr: 'أكواد الخصم' },
      { key: 'marketing',     iconEl: <Mail size={15} />,          labelFr: 'Marketing',         labelAr: 'التسويق' },
      { key: 'automation',    iconEl: <Zap size={15} />,           labelFr: 'Automatisation',    labelAr: 'الأتمتة' },
    ],
  },
  {
    labelFr: 'Configuration',
    labelAr: 'الإعدادات',
    tabs: [
      { key: 'settings',      iconEl: <Settings size={15} />,      labelFr: 'Paramètres',        labelAr: 'الإعدادات' },
    ],
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const SuperAdminPage: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated, isSuperAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const isAr = lang === 'ar';

  // Auth guard — redirect to login if not authenticated
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isSuperAdmin)    return <Navigate to="/dashboard" replace />;

  const handleLogout = () => { logout(); navigate('/login'); };

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = useMemo<ActiveTab>(() => {
    const t = searchParams.get('tab') as ActiveTab;
    const valid: ActiveTab[] = ['dashboard','orgs','subscriptions','payments','users','packs','analytics','usage','marketing','automation','promos','insights','settings'];
    return valid.includes(t) ? t : 'dashboard';
  }, [searchParams]);

  const setTab = (tab: ActiveTab) => setSearchParams({ tab });

  // ─── States ────────────────────────────────────────────────────────────────
  const [downgradeCount, setDowngradeCount] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Orgs state
  const [orgs, setOrgs] = useState<any[]>([]);
  const [orgsTotal, setOrgsTotal] = useState(0);
  const [orgsPage, setOrgsPage] = useState(1);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgTypeFilter, setOrgTypeFilter] = useState('');
  const [orgStatusFilter, setOrgStatusFilter] = useState('');
  const [viewingOrg, setViewingOrg] = useState<any>(null);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [editForm, setEditForm] = useState({ assocType: '', status: '', expiresAt: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Payments state
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ organizationId: '', amount: '', method: 'CASH', reference: '', note: '', paidAt: '' });
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [resetResult, setResetResult] = useState<{ tempPassword: string; name: string; email: string } | null>(null);
  const [copiedPw, setCopiedPw] = useState(false);

  const ORGS_LIMIT = 15;
  const PAYMENTS_LIMIT = 20;
  const USERS_LIMIT = 20;

  // ─── Loaders ───────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try { const r = await superadminApi.getStats(); setStats(r.data); }
    finally { setStatsLoading(false); }
  }, []);

  const loadOrgs = useCallback(async () => {
    setOrgsLoading(true);
    try {
      const r = await superadminApi.getOrganizations({
        page: orgsPage, limit: ORGS_LIMIT,
        search: orgSearch || undefined,
        type: orgTypeFilter || undefined,
        status: orgStatusFilter || undefined,
      });
      setOrgs(r.data.data);
      setOrgsTotal(r.data.total);
    } finally { setOrgsLoading(false); }
  }, [orgsPage, orgSearch, orgTypeFilter, orgStatusFilter]);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const r = await superadminApi.getPayments({ page: paymentsPage, limit: PAYMENTS_LIMIT });
      setPayments(r.data.data);
      setPaymentsTotal(r.data.total);
    } finally { setPaymentsLoading(false); }
  }, [paymentsPage]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const r = await superadminApi.getUsers({ search: userSearch || undefined, limit: USERS_LIMIT });
      setUsers(r.data.data);
      setUsersTotal(r.data.total);
    } finally { setUsersLoading(false); }
  }, [userSearch]);

  const loadDowngradeCount = useCallback(async () => {
    try {
      const r = await superadminApi.getDowngradeRequests();
      setDowngradeCount(r.data.length);
    } catch {}
  }, []);

  useEffect(() => { loadStats(); loadDowngradeCount(); }, []);
  useEffect(() => { if (activeTab === 'orgs') loadOrgs(); }, [activeTab, loadOrgs]);
  useEffect(() => { if (activeTab === 'payments') loadPayments(); }, [activeTab, loadPayments]);
  useEffect(() => { if (activeTab === 'users') loadUsers(); }, [activeTab, loadUsers]);

  // ─── Org actions ───────────────────────────────────────────────────────────
  const openViewOrg = async (id: string) => {
    const r = await superadminApi.getOrganization(id);
    setViewingOrg(r.data);
  };

  const openEditOrg = (org: any) => {
    setEditingOrg(org);
    setEditForm({
      assocType: getAssocType(org.modules),
      status: org.subscription?.status || 'TRIAL',
      expiresAt: org.subscription?.expiresAt ? org.subscription.expiresAt.slice(0, 10) : '',
    });
  };

  const saveEditOrg = async () => {
    if (!editingOrg) return;
    setEditSaving(true);
    try {
      await superadminApi.updateSubscription(editingOrg.id, editForm);
      setEditingOrg(null);
      await loadOrgs();
      await loadStats();
    } finally { setEditSaving(false); }
  };

  const deleteOrg = async () => {
    if (!deletingOrgId) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await superadminApi.deleteOrganization(deletingOrgId);
      setDeletingOrgId(null);
      await loadOrgs();
      await loadStats();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Payment actions ───────────────────────────────────────────────────────
  const submitPayment = async () => {
    setPaymentSaving(true);
    try {
      const fd = new FormData();
      Object.entries(paymentForm).forEach(([k, v]) => v && fd.append(k, v));
      if (paymentFile) fd.append('receipt', paymentFile);
      await superadminApi.createPayment(fd);
      setShowPaymentForm(false);
      setPaymentForm({ organizationId: '', amount: '', method: 'CASH', reference: '', note: '', paidAt: '' });
      setPaymentFile(null);
      await loadPayments();
    } finally { setPaymentSaving(false); }
  };

  const deletePayment = async () => {
    if (!deletingPaymentId) return;
    await superadminApi.deletePayment(deletingPaymentId);
    setDeletingPaymentId(null);
    await loadPayments();
  };

  // ─── User actions ──────────────────────────────────────────────────────────
  const toggleUserActive = async (userId: string) => {
    await superadminApi.toggleUser(userId);
    await loadUsers();
  };

  const resetPassword = async (userId: string) => {
    const r = await superadminApi.resetUserPassword(userId);
    setResetResult(r.data);
    setCopiedPw(false);
  };

  const copyPw = () => {
    if (resetResult) {
      navigator.clipboard.writeText(resetResult.tempPassword);
      setCopiedPw(true);
      setTimeout(() => setCopiedPw(false), 2000);
    }
  };

  // ─── Shared helpers ────────────────────────────────────────────────────────
  const inp = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none';
  const lbl = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';
  const orgPages = Math.ceil(orgsTotal / ORGS_LIMIT);
  const payPages = Math.ceil(paymentsTotal / PAYMENTS_LIMIT);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 ${isAr ? 'rtl' : 'ltr'}`}>

      {/* ════════════ SINGLE SIDEBAR ════════════ */}
      <aside className={`
        w-60 flex-shrink-0 flex flex-col h-full overflow-hidden
        bg-white dark:bg-gray-800
        border-gray-200 dark:border-gray-700
        ${isAr ? 'border-s' : 'border-e'}
      `}>
        {/* Colored top stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-400 flex-shrink-0" />

        {/* Logo + Title */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <Shield size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 dark:text-white text-sm leading-tight">Mar E-A.C</div>
            <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">
              {isAr ? 'مدير النظام' : 'Super Admin'}
            </div>
          </div>
        </div>

        {/* Stats quick pills */}
        {!statsLoading && stats && (
          <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Building2 size={11} /> {isAr ? 'منظمة' : 'Orgs'}
              </span>
              <span className="font-bold text-gray-900 dark:text-white">{stats.totalOrgs}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={11} /> MRR
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {(stats.mrrEstimate || 0).toLocaleString()} MAD
              </span>
            </div>
          </div>
        )}

        {/* Navigation — scrollable */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {TAB_GROUPS.map(group => (
            <div key={group.labelFr}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 mb-1">
                {isAr ? group.labelAr : group.labelFr}
              </p>
              <div className="space-y-0.5">
                {group.tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setTab(tab.key as ActiveTab)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-start ${
                      activeTab === tab.key
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                    style={activeTab === tab.key
                      ? { borderInlineEnd: '3px solid #4f46e5' }
                      : {}}
                  >
                    <span className={activeTab === tab.key ? 'text-indigo-500' : 'text-gray-400'}>
                      {tab.iconEl}
                    </span>
                    {isAr ? tab.labelAr : tab.labelFr}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer controls — language, theme, user, logout */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-2 flex-shrink-0">
          {/* Lang + Theme toggles */}
          <div className="flex gap-2">
            <button
              onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Globe size={13} />
              {lang === 'ar' ? 'FR' : 'عر'}
            </button>
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              {theme === 'dark' ? (isAr ? 'فاتح' : 'Clair') : (isAr ? 'داكن' : 'Sombre')}
            </button>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user?.name}</div>
              <div className="text-xs text-gray-400 truncate">{user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
              title={isAr ? 'تسجيل الخروج' : 'Déconnexion'}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════ MAIN CONTENT AREA ════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
              {TAB_GROUPS.flatMap(g => g.tabs).find(t => t.key === activeTab)?.[isAr ? 'labelAr' : 'labelFr'] ?? ''}
            </h1>
            <p className="text-xs text-gray-400">Mar E-A.C · SaaS Management Platform</p>
          </div>
          {downgradeCount > 0 && (
            <button
              onClick={() => setTab('subscriptions')}
              className="relative flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-xl transition-colors text-sm font-medium"
              title={isAr ? 'طلبات تخفيض الباقة' : 'Demandes de rétrogradation'}
            >
              <Mail size={16} />
              {isAr ? `${downgradeCount} طلب تخفيض` : `${downgradeCount} demande${downgradeCount > 1 ? 's' : ''} de rétrogradation`}
              <span className="absolute -top-1.5 -end-1.5 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {downgradeCount}
              </span>
            </button>
          )}
        </div>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* ════════════ DASHBOARD TAB ════════════ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isAr ? 'لوحة التحكم' : 'Tableau de bord'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {isAr ? 'مرحباً — نظرة شاملة على المنصة' : 'Bienvenue — Vue d\'ensemble de la plateforme'}
                </p>
              </div>

              {/* KPI Grid */}
              {statsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : stats && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: isAr ? 'إجمالي المنظمات' : 'Total organisations', value: stats.totalOrgs, icon: <Building2 size={20} />, bg: 'bg-indigo-50 dark:bg-indigo-900/20', color: 'text-indigo-600 dark:text-indigo-400' },
                      { label: isAr ? 'اشتراكات نشطة' : 'Abonnements actifs', value: stats.activeOrgs, icon: <Check size={20} />, bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600 dark:text-emerald-400' },
                      { label: isAr ? 'فترات تجربة' : 'Essais en cours', value: stats.trialOrgs, icon: <Clock size={20} />, bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600 dark:text-amber-400' },
                      { label: isAr ? 'منتهية الصلاحية' : 'Abonnements expirés', value: stats.expiredOrgs, icon: <AlertTriangle size={20} />, bg: 'bg-red-50 dark:bg-red-900/20', color: 'text-red-600 dark:text-red-400' },
                      { label: isAr ? 'الإيراد الشهري (MRR)' : 'MRR estimé', value: `${(stats.mrrEstimate || 0).toLocaleString()} MAD`, icon: <TrendingUp size={20} />, bg: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-600 dark:text-purple-400' },
                      { label: isAr ? 'إيرادات الشهر' : 'Revenus du mois', value: `${(stats.monthlyRevenue || 0).toLocaleString()} MAD`, icon: <DollarSign size={20} />, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400' },
                      { label: isAr ? 'منظمات جديدة (هذا الشهر)' : 'Nouvelles orgs (mois)', value: stats.newOrgsThisMonth, icon: <Plus size={20} />, bg: 'bg-teal-50 dark:bg-teal-900/20', color: 'text-teal-600 dark:text-teal-400' },
                      { label: isAr ? 'المستخدمون' : 'Utilisateurs', value: stats.totalUsers, icon: <Users size={20} />, bg: 'bg-gray-50 dark:bg-gray-700/30', color: 'text-gray-600 dark:text-gray-300' },
                    ].map((kpi, i) => (
                      <div key={i} className={`rounded-2xl p-4 ${kpi.bg}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{kpi.label}</span>
                          <span className={kpi.color}>{kpi.icon}</span>
                        </div>
                        <div className={`text-2xl font-extrabold ${kpi.color}`}>{kpi.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Type Distribution */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      {isAr ? 'توزيع أنواع الجمعيات' : 'Distribution des types d\'associations'}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {ASSOC_TYPES.map(cfg => (
                        <div key={cfg.key} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                            {stats.typeDistribution?.[cfg.key] || 0}
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                            {cfg.icon} {isAr ? cfg.labelAr : cfg.labelFr}
                          </span>
                          <div className="text-xs text-gray-400 mt-1">{cfg.price} MAD/m</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: isAr ? 'عرض المنظمات' : 'Voir les organisations', tab: 'orgs', icon: <Building2 size={16} />, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40' },
                      { label: isAr ? 'إدارة الاشتراكات' : 'Gérer abonnements', tab: 'subscriptions', icon: <RefreshCw size={16} />, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40' },
                      { label: isAr ? 'رؤى الذكاء الاصطناعي' : 'IA Insights', tab: 'insights', icon: <Brain size={16} />, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40' },
                      { label: isAr ? 'إرسال حملة' : 'Lancer campagne', tab: 'marketing', icon: <Mail size={16} />, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40' },
                    ].map(action => (
                      <button
                        key={action.tab}
                        onClick={() => setTab(action.tab as ActiveTab)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${action.color}`}
                      >
                        {action.icon} {action.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════════ ORGS TAB ════════════ */}
          {activeTab === 'orgs' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isAr ? 'المنظمات' : 'Organisations'} <span className="text-sm font-normal text-gray-400">({orgsTotal})</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={orgSearch}
                      onChange={e => { setOrgSearch(e.target.value); setOrgsPage(1); }}
                      placeholder={isAr ? 'بحث...' : 'Rechercher...'}
                      className="ps-8 pe-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-48 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  {/* Type filter */}
                  <select
                    value={orgTypeFilter}
                    onChange={e => { setOrgTypeFilter(e.target.value); setOrgsPage(1); }}
                    className="py-2 ps-3 pe-8 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">{isAr ? 'جميع الأنواع' : 'Tous les types'}</option>
                    {ASSOC_TYPES.map(t => <option key={t.key} value={t.key}>{isAr ? t.labelAr : t.labelFr}</option>)}
                  </select>
                  {/* Status filter */}
                  <select
                    value={orgStatusFilter}
                    onChange={e => { setOrgStatusFilter(e.target.value); setOrgsPage(1); }}
                    className="py-2 ps-3 pe-8 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">{isAr ? 'جميع الحالات' : 'Tous les statuts'}</option>
                    {['TRIAL','ACTIVE','EXPIRED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        {[
                          isAr ? 'المنظمة' : 'Organisation',
                          isAr ? 'النوع' : 'Type',
                          isAr ? 'الحالة' : 'Statut',
                          isAr ? 'الأعضاء' : 'Membres',
                          isAr ? 'الاشتراك' : 'Abonnement',
                          isAr ? 'الإجراءات' : 'Actions',
                        ].map(h => (
                          <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {orgsLoading ? (
                        <tr><td colSpan={6} className="text-center py-10 text-gray-400">{isAr ? 'جار التحميل...' : 'Chargement...'}</td></tr>
                      ) : orgs.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-10 text-gray-400">{isAr ? 'لا توجد منظمات' : 'Aucune organisation'}</td></tr>
                      ) : orgs.map(org => (
                        <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">{org.name}</div>
                            <div className="text-xs text-gray-400">{org.email}</div>
                          </td>
                          <td className="px-4 py-3"><AssocTypeBadge modules={org.modules} isAr={isAr} /></td>
                          <td className="px-4 py-3"><SubStatusBadge status={org.subscription?.status} isAr={isAr} /></td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{org._count?.members ?? '—'}</td>
                          <td className="px-4 py-3">
                            {org.subscription?.expiresAt
                              ? <span className="text-xs text-gray-400">{formatDate(org.subscription.expiresAt)}</span>
                              : <span className="text-xs text-gray-300">{isAr ? 'لا شيء' : 'Aucun'}</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => openViewOrg(org.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600 transition-colors" title={isAr ? 'عرض' : 'Voir'}>
                                <ExternalLink size={14} />
                              </button>
                              <button onClick={() => openEditOrg(org)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-emerald-600 transition-colors" title={isAr ? 'تعديل' : 'Modifier'}>
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setDeletingOrgId(org.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors" title={isAr ? 'حذف' : 'Supprimer'}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {orgPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500">{isAr ? 'صفحة' : 'Page'} {orgsPage} {isAr ? 'من' : 'sur'} {orgPages}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setOrgsPage(p => Math.max(1, p - 1))} disabled={orgsPage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                        {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                      </button>
                      <button onClick={() => setOrgsPage(p => Math.min(orgPages, p + 1))} disabled={orgsPage === orgPages} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                        {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════ SUBSCRIPTIONS TAB ════════════ */}
          {activeTab === 'subscriptions' && <SubscriptionsTab />}

          {/* ════════════ PAYMENTS TAB ════════════ */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isAr ? 'المدفوعات' : 'Paiements'} <span className="text-sm font-normal text-gray-400">({paymentsTotal})</span>
                </h2>
                <button onClick={() => setShowPaymentForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                  <Plus size={15} /> {isAr ? 'تسجيل دفعة' : 'Enregistrer un paiement'}
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        {[isAr?'المنظمة':'Organisation', isAr?'المبلغ':'Montant', isAr?'طريقة الدفع':'Méthode', isAr?'المرجع':'Référence', isAr?'التاريخ':'Date', isAr?'الوصل':'Reçu', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {paymentsLoading ? (
                        <tr><td colSpan={7} className="text-center py-10 text-gray-400">{isAr ? 'جار التحميل...' : 'Chargement...'}</td></tr>
                      ) : payments.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-10 text-gray-400">{isAr ? 'لا توجد مدفوعات' : 'Aucun paiement'}</td></tr>
                      ) : payments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.organization?.name}</td>
                          <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">+{p.amount.toLocaleString()} MAD</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.method}</td>
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.reference || '—'}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(p.paidAt)}</td>
                          <td className="px-4 py-3">
                            {p.receiptUrl
                              ? <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"><FileText size={12} /> {isAr ? 'عرض' : 'Voir'}</a>
                              : <span className="text-xs text-gray-300">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => setDeletingPaymentId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {payPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500">{isAr ? 'صفحة' : 'Page'} {paymentsPage} {isAr ? 'من' : 'sur'} {payPages}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setPaymentsPage(p => Math.max(1, p - 1))} disabled={paymentsPage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                        {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                      </button>
                      <button onClick={() => setPaymentsPage(p => Math.min(payPages, p + 1))} disabled={paymentsPage === payPages} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                        {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════ USERS TAB ════════════ */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isAr ? 'المستخدمون' : 'Utilisateurs'} <span className="text-sm font-normal text-gray-400">({usersTotal})</span></h2>
                <div className="relative">
                  <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder={isAr ? 'بحث...' : 'Rechercher...'} className="ps-8 pe-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-48 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        {[isAr?'المستخدم':'Utilisateur', isAr?'المنظمة':'Organisation', isAr?'الدور':'Rôle', isAr?'الحالة':'Statut', isAr?'الإجراءات':'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {usersLoading ? (
                        <tr><td colSpan={5} className="text-center py-10 text-gray-400">{isAr ? 'جار التحميل...' : 'Chargement...'}</td></tr>
                      ) : users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                            <div className="text-xs text-gray-400">{user.email}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">{user.organization?.name || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">{user.role}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                              {user.isActive ? (isAr ? 'نشط' : 'Actif') : (isAr ? 'غير نشط' : 'Inactif')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => toggleUserActive(user.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-emerald-600 transition-colors">
                                {user.isActive ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                              </button>
                              <button onClick={() => resetPassword(user.id)} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-400 hover:text-amber-600 transition-colors">
                                <KeyRound size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════════════ NEW FEATURE TABS ════════════ */}
          {activeTab === 'packs'        && <PacksTab />}
          {activeTab === 'analytics'    && <AnalyticsTab />}
          {activeTab === 'usage'        && <FeatureUsageTab />}
          {activeTab === 'marketing'    && <MarketingTab />}
          {activeTab === 'automation'   && <AutomationTab />}
          {activeTab === 'promos'       && <PromoCodesTab />}
          {activeTab === 'insights'     && <AIInsightsTab />}
          {activeTab === 'settings'     && <SettingsTab />}

        </main>
      </div>

      {/* ════════════ MODALS ════════════ */}

      {/* View Org Modal */}
      {viewingOrg && (
        <Modal isOpen={!!viewingOrg} onClose={() => setViewingOrg(null)} title={viewingOrg.name} size="lg">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-gray-400">{isAr ? 'البريد' : 'Email'}</span><p className="font-medium text-gray-900 dark:text-white mt-0.5">{viewingOrg.email}</p></div>
              <div><span className="text-gray-400">{isAr ? 'الهاتف' : 'Tél.'}</span><p className="font-medium text-gray-900 dark:text-white mt-0.5">{viewingOrg.phone || '—'}</p></div>
              <div><span className="text-gray-400">{isAr ? 'المدينة' : 'Ville'}</span><p className="font-medium text-gray-900 dark:text-white mt-0.5">{viewingOrg.city || '—'}</p></div>
              <div><span className="text-gray-400">{isAr ? 'الجهة' : 'Région'}</span><p className="font-medium text-gray-900 dark:text-white mt-0.5">{viewingOrg.region || '—'}</p></div>
              <div><span className="text-gray-400">{isAr ? 'النوع' : 'Type'}</span><div className="mt-0.5"><AssocTypeBadge modules={viewingOrg.modules} isAr={isAr} /></div></div>
              <div><span className="text-gray-400">{isAr ? 'الاشتراك' : 'Abonnement'}</span><div className="mt-0.5"><SubStatusBadge status={viewingOrg.subscription?.status} isAr={isAr} /></div></div>
            </div>
            <div className="grid grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              {[
                { label: isAr ? 'أعضاء' : 'Membres', val: viewingOrg._count?.members },
                { label: isAr ? 'اجتماعات' : 'Réunions', val: viewingOrg._count?.meetings },
                { label: isAr ? 'مشاريع' : 'Projets', val: viewingOrg._count?.projects },
                { label: isAr ? 'معاملات' : 'Transactions', val: viewingOrg._count?.transactions },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{s.val ?? 0}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
            {viewingOrg.payments?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{isAr ? 'آخر المدفوعات' : 'Derniers paiements'}</p>
                <div className="space-y-1">
                  {viewingOrg.payments.slice(0, 3).map((p: any) => (
                    <div key={p.id} className="flex justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">{formatDate(p.paidAt)}</span>
                      <span className="font-semibold text-emerald-600">+{p.amount} MAD</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Subscription Modal */}
      {editingOrg && (
        <Modal isOpen={!!editingOrg} onClose={() => setEditingOrg(null)} title={isAr ? `تعديل اشتراك: ${editingOrg.name}` : `Modifier abonnement : ${editingOrg.name}`}>
          <div className="space-y-4">
            <div>
              <label className={lbl}>{isAr ? 'نوع الجمعية' : 'Type d\'association'}</label>
              <select className={inp} value={editForm.assocType} onChange={e => setEditForm(f => ({ ...f, assocType: e.target.value }))}>
                {ASSOC_TYPES.map(t => <option key={t.key} value={t.key}>{isAr ? t.labelAr : t.labelFr}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>{isAr ? 'الحالة' : 'Statut'}</label>
              <select className={inp} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                {['TRIAL','ACTIVE','EXPIRED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>{isAr ? 'تاريخ الانتهاء' : 'Date d\'expiration'}</label>
              <input type="date" className={inp} value={editForm.expiresAt} onChange={e => setEditForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setEditingOrg(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">{isAr ? 'إلغاء' : 'Annuler'}</button>
            <button onClick={saveEditOrg} disabled={editSaving} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {editSaving ? (isAr ? 'جار الحفظ...' : 'Enregistrement...') : (isAr ? 'حفظ' : 'Enregistrer')}
            </button>
          </div>
        </Modal>
      )}

      {/* Create Payment Modal */}
      <Modal isOpen={showPaymentForm} onClose={() => setShowPaymentForm(false)} title={isAr ? 'تسجيل دفعة' : 'Enregistrer un paiement'}>
        <div className="space-y-4">
          <div>
            <label className={lbl}>{isAr ? 'المنظمة (ID)' : 'Organisation (ID)'} *</label>
            <input className={inp} value={paymentForm.organizationId} onChange={e => setPaymentForm(f => ({ ...f, organizationId: e.target.value }))} placeholder="..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>{isAr ? 'المبلغ (MAD)' : 'Montant (MAD)'} *</label>
              <input type="number" className={inp} value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>{isAr ? 'الطريقة' : 'Méthode'}</label>
              <select className={inp} value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))}>
                {['CASH','BANK_TRANSFER','CHEQUE','CARD'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>{isAr ? 'المرجع' : 'Référence'}</label>
            <input className={inp} value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{isAr ? 'ملاحظة' : 'Note'}</label>
            <input className={inp} value={paymentForm.note} onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{isAr ? 'التاريخ' : 'Date'}</label>
            <input type="date" className={inp} value={paymentForm.paidAt} onChange={e => setPaymentForm(f => ({ ...f, paidAt: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{isAr ? 'الوصل (اختياري)' : 'Reçu (optionnel)'}</label>
            <input type="file" accept="image/*,application/pdf" onChange={e => setPaymentFile(e.target.files?.[0] || null)} className="text-sm text-gray-600 dark:text-gray-300" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowPaymentForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">{isAr ? 'إلغاء' : 'Annuler'}</button>
          <button onClick={submitPayment} disabled={paymentSaving || !paymentForm.organizationId || !paymentForm.amount} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {paymentSaving ? '...' : (isAr ? 'تسجيل' : 'Enregistrer')}
          </button>
        </div>
      </Modal>

      {/* Reset Password Result */}
      {resetResult && (
        <Modal isOpen={!!resetResult} onClose={() => setResetResult(null)} title={isAr ? 'كلمة المرور المؤقتة' : 'Mot de passe temporaire'}>
          <div className="space-y-3 text-center">
            <p className="text-sm text-gray-500">{resetResult.name} — {resetResult.email}</p>
            <div className="flex items-center justify-center gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl px-6 py-4">
              <span className="font-mono text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-widest">{resetResult.tempPassword}</span>
              <button onClick={copyPw} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                {copiedPw ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-gray-400" />}
              </button>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">{isAr ? 'احتفظ بهذه الكلمة. لن تظهر مرة أخرى.' : 'Conservez ce mot de passe. Il ne sera plus affiché.'}</p>
          </div>
        </Modal>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={!!deletingOrgId}
        onClose={() => { setDeletingOrgId(null); setDeleteError(''); }}
        onConfirm={deleteOrg}
        title={isAr ? 'حذف المنظمة؟' : 'Supprimer l\'organisation ?'}
        message={deleteError || (isAr ? 'ستُحذف جميع البيانات المرتبطة. هذا الإجراء لا يمكن التراجع عنه.' : 'Toutes les données associées seront supprimées. Cette action est irréversible.')}
        variant="danger"
        loading={deleteLoading}
      />
      <ConfirmDialog isOpen={!!deletingPaymentId} onClose={() => setDeletingPaymentId(null)} onConfirm={deletePayment} title={isAr ? 'حذف هذه الدفعة؟' : 'Supprimer ce paiement ?'} message={isAr ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'Cette action est irréversible.'} variant="danger" />
    </div>
  );
};
