import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield, Building2, Users, Pencil, Trash2, ToggleLeft, ToggleRight,
  KeyRound, Copy, Check, Droplets, ShoppingBag, FolderKanban, Layers,
  TrendingUp, DollarSign, AlertTriangle, Search, Filter, Plus,
  BarChart2, CreditCard, Calendar, RefreshCw, X, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { superadminApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
import { formatDate, formatCurrency } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type AssocTypeKey = 'REGULAR' | 'PROJECTS' | 'WATER' | 'PRODUCTIVE' | 'PRODUCTIVE_WATER';
type ActiveTab    = 'dashboard' | 'orgs' | 'payments' | 'users';

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
];

const getAssocType = (modules: string[] = []): AssocTypeKey => {
  const hasProd  = modules.includes('PRODUCTIVE');
  const hasWater = modules.includes('WATER');
  const hasProj  = modules.includes('PROJECTS');
  if (hasProd && hasWater) return 'PRODUCTIVE_WATER';
  if (hasProd)  return 'PRODUCTIVE';
  if (hasWater) return 'WATER';
  if (hasProj)  return 'PROJECTS';
  return 'REGULAR';
};

const AssocTypeBadge: React.FC<{ modules: string[]; isAr: boolean }> = ({ modules, isAr }) => {
  const key = getAssocType(modules);
  const cfg = ASSOC_TYPES.find(t => t.key === key)!;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
      {cfg.icon}
      {isAr ? cfg.labelAr : cfg.labelFr}
    </span>
  );
};

const SubStatusBadge: React.FC<{ status?: string; isAr: boolean }> = ({ status, isAr }) => {
  const cfg: Record<string, { cls: string; fr: string; ar: string }> = {
    TRIAL:     { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', fr: 'Essai', ar: 'تجريبي' },
    ACTIVE:    { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', fr: 'Actif', ar: 'نشط' },
    EXPIRED:   { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', fr: 'Expiré', ar: 'منتهي' },
    CANCELLED: { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', fr: 'Annulé', ar: 'ملغي' },
  };
  const s = cfg[status || ''] || cfg['EXPIRED'];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{isAr ? s.ar : s.fr}</span>;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const SuperAdminPage: React.FC = () => {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // ── Data ──
  const [stats,     setStats]     = useState<any>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [orgs,      setOrgs]      = useState<any[]>([]);
  const [users,     setUsers]     = useState<any[]>([]);
  const [payments,  setPayments]  = useState<any[]>([]);

  // ── Loading ──
  const [loadingStats,    setLoadingStats]    = useState(true);
  const [loadingAnalytics,setLoadingAnalytics]= useState(true);
  const [loadingOrgs,     setLoadingOrgs]     = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingUsers,    setLoadingUsers]    = useState(true);

  // ── Org filters ──
  const [orgSearch, setOrgSearch]   = useState('');
  const [orgType,   setOrgType]     = useState('');
  const [orgStatus, setOrgStatus]   = useState('');

  // ── User search ──
  const [userSearch, setUserSearch] = useState('');

  // ── Modals ──
  const [showSubModal,     setShowSubModal]     = useState(false);
  const [selectedOrg,      setSelectedOrg]      = useState<any>(null);
  const [deleteOrgId,      setDeleteOrgId]      = useState<string | null>(null);
  const [deletePaymentId,  setDeletePaymentId]  = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [resetResult,      setResetResult]      = useState<any>(null);
  const [resetCopied,      setResetCopied]      = useState(false);

  // ── Form state ──
  const [subForm, setSubForm] = useState<{ assocType: AssocTypeKey; status: string; expiresAt: string }>({
    assocType: 'REGULAR', status: 'ACTIVE', expiresAt: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    organizationId: '', amount: '', method: 'CASH', reference: '', note: '', paidAt: '',
  });

  // ── Operation state ──
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError,setSaveError]= useState<string | null>(null);

  // ─── Loaders ────────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await superadminApi.getStats();
      setStats(res.data);
    } finally { setLoadingStats(false); }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoadingAnalytics(true);
      const res = await superadminApi.getAnalytics();
      setAnalytics(res.data);
    } finally { setLoadingAnalytics(false); }
  }, []);

  const loadOrgs = useCallback(async () => {
    try {
      setLoadingOrgs(true);
      const params: any = {};
      if (orgSearch) params.search = orgSearch;
      if (orgType)   params.type   = orgType;
      if (orgStatus) params.status = orgStatus;
      const res = await superadminApi.getOrganizations(params);
      setOrgs(res.data.data || res.data);
    } finally { setLoadingOrgs(false); }
  }, [orgSearch, orgType, orgStatus]);

  const loadPayments = useCallback(async () => {
    try {
      setLoadingPayments(true);
      const res = await superadminApi.getPayments();
      setPayments(res.data.data || res.data);
    } finally { setLoadingPayments(false); }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await superadminApi.getUsers(userSearch ? { search: userSearch } : {});
      setUsers(res.data.data || res.data);
    } finally { setLoadingUsers(false); }
  }, [userSearch]);

  useEffect(() => { loadStats(); loadAnalytics(); }, []);
  useEffect(() => { if (activeTab === 'orgs')     loadOrgs();     }, [activeTab, orgSearch, orgType, orgStatus]);
  useEffect(() => { if (activeTab === 'payments') loadPayments(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'users')    loadUsers();    }, [activeTab, userSearch]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const openSubModal = (org: any) => {
    setSelectedOrg(org);
    setSubForm({
      assocType: getAssocType(org.modules || []),
      status:    org.subscription?.status    || 'ACTIVE',
      expiresAt: org.subscription?.expiresAt?.split('T')[0] || '',
    });
    setSaveError(null);
    setShowSubModal(true);
  };

  const handleSubUpdate = async () => {
    if (!selectedOrg) return;
    setSaving(true); setSaveError(null);
    try {
      await superadminApi.updateSubscription(selectedOrg.id, subForm);
      setShowSubModal(false);
      loadOrgs(); loadStats(); loadAnalytics();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || (isAr ? 'خطأ في الحفظ' : 'Erreur lors de la sauvegarde'));
    } finally { setSaving(false); }
  };

  const handleDeleteOrg = async () => {
    if (!deleteOrgId) return;
    setDeleting(true);
    try { await superadminApi.deleteOrganization(deleteOrgId); setDeleteOrgId(null); loadOrgs(); loadStats(); loadAnalytics(); }
    finally { setDeleting(false); }
  };

  const handleToggleUser = async (userId: string) => {
    try { await superadminApi.toggleUser(userId); loadUsers(); } catch {}
  };

  const handleResetPassword = async (userId: string) => {
    try { const res = await superadminApi.resetUserPassword(userId); setResetResult(res.data); } catch {}
  };

  const handleCreatePayment = async () => {
    if (!paymentForm.organizationId || !paymentForm.amount) return;
    setSaving(true);
    try {
      await superadminApi.createPayment({
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
      });
      setShowPaymentModal(false);
      setPaymentForm({ organizationId: '', amount: '', method: 'CASH', reference: '', note: '', paidAt: '' });
      loadPayments(); loadAnalytics();
    } finally { setSaving(false); }
  };

  const handleDeletePayment = async () => {
    if (!deletePaymentId) return;
    setDeleting(true);
    try { await superadminApi.deletePayment(deletePaymentId); setDeletePaymentId(null); loadPayments(); loadAnalytics(); }
    finally { setDeleting(false); }
  };

  const copyPassword = () => {
    if (resetResult) {
      navigator.clipboard.writeText(resetResult.tempPassword);
      setResetCopied(true);
      setTimeout(() => setResetCopied(false), 2000);
    }
  };

  // ─── Derived chart data ───────────────────────────────────────────────────

  const typeDistribution: Record<string, number> = stats.typeDistribution || {};
  const totalOrgs = stats.totalOrgs || 0;

  const FRENCH_MONTHS: Record<string, string> = {
    '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aoû',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
  };
  const ARABIC_MONTHS: Record<string, string> = {
    '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
    '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
    '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
  };

  const signupChartData = (analytics?.monthlySignups || []).map((m: any) => {
    const mm = m.month.split('-')[1];
    return { name: isAr ? ARABIC_MONTHS[mm] : FRENCH_MONTHS[mm], count: m.count };
  });

  const typePieData = ASSOC_TYPES.map(t => ({
    name: isAr ? t.labelAr : t.labelFr,
    value: typeDistribution[t.key] || 0,
    color: t.dot,
  })).filter(d => d.value > 0);

  const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'CHECK'];
  const METHOD_LABEL: Record<string, { fr: string; ar: string }> = {
    CASH:     { fr: 'Espèces',  ar: 'نقداً' },
    TRANSFER: { fr: 'Virement', ar: 'تحويل' },
    CHECK:    { fr: 'Chèque',   ar: 'شيك' },
  };

  // ─── Tabs config ──────────────────────────────────────────────────────────

  const TABS: { key: ActiveTab; labelFr: string; labelAr: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', labelFr: 'Tableau de bord', labelAr: 'لوحة التحكم', icon: <BarChart2 size={15} /> },
    { key: 'orgs',      labelFr: 'Associations',    labelAr: 'الجمعيات',    icon: <Building2 size={15} /> },
    { key: 'payments',  labelFr: 'Paiements',        labelAr: 'المدفوعات',   icon: <CreditCard size={15} /> },
    { key: 'users',     labelFr: 'Utilisateurs',     labelAr: 'المستخدمون',  icon: <Users size={15} /> },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e40af, #7c3aed)' }}>
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isAr ? 'لوحة الإدارة العليا' : 'SuperAdmin Panel'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isAr ? 'إدارة شاملة للمنصة' : 'Gestion complète de la plateforme'}
            </p>
          </div>
        </div>
        <button onClick={() => { loadStats(); loadAnalytics(); }}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title={isAr ? 'تحديث' : 'Actualiser'}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ── Top KPI Cards (always visible) ── */}
      <div className="stats-grid">
        <StatCard title={isAr ? 'إجمالي الجمعيات' : 'Total associations'}
          value={stats.totalOrgs ?? 0} icon={<Building2 size={20} />}
          iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard title={isAr ? 'الاشتراكات النشطة' : 'Abonnements actifs'}
          value={stats.activeOrgs ?? 0} icon={<Check size={20} />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" />
        <StatCard title={isAr ? 'في فترة التجربة' : 'En période d\'essai'}
          value={stats.trialOrgs ?? 0} icon={<Clock size={20} />}
          iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400" />
        <StatCard title={isAr ? 'الإيرادات المتوقعة/شهر' : 'Revenus estimés/mois'}
          value={analytics ? `${analytics.mrrEstimate} MAD` : '…'}
          icon={<TrendingUp size={20} />}
          iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {tab.icon}
            {isAr ? tab.labelAr : tab.labelFr}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* DASHBOARD TAB                                                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">

          {/* Revenue cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign size={22} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{isAr ? 'إجمالي المدفوعات' : 'Total encaissé'}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {analytics ? `${analytics.totalCollected.toFixed(0)} MAD` : '…'}
                </p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <CreditCard size={22} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{isAr ? 'مدفوعات هذا الشهر' : 'Paiements ce mois'}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {analytics ? `${analytics.paymentsThisMonth.toFixed(0)} MAD` : '…'}
                </p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp size={22} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{isAr ? 'إمكانية التحويل' : 'Potentiel à convertir'}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {analytics ? `${analytics.potentialMrr} MAD` : '…'}
                </p>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Monthly signups bar chart */}
            <div className="lg:col-span-2 card p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">
                {isAr ? 'انضمامات الجمعيات (آخر 6 أشهر)' : 'Nouvelles associations (6 derniers mois)'}
              </h3>
              {loadingAnalytics ? (
                <div className="h-[200px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : signupChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={signupChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name={isAr ? 'جمعيات جديدة' : 'Nouvelles'} radius={[4,4,0,0]}>
                      {signupChartData.map((_: any, i: number) => (
                        <Cell key={i} fill={`hsl(${220 + i * 15}, 70%, ${55 + i * 3}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                  {isAr ? 'لا توجد بيانات' : 'Aucune donnée'}
                </div>
              )}
            </div>

            {/* Type distribution pie */}
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">
                {isAr ? 'توزيع الأنواع' : 'Répartition des types'}
              </h3>
              {typePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={typePieData} cx="50%" cy="45%" outerRadius={65} dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {typePieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                  {isAr ? 'لا توجد بيانات' : 'Aucune donnée'}
                </div>
              )}
              {/* Legend */}
              <div className="mt-2 space-y-1">
                {ASSOC_TYPES.map(t => {
                  const count = typeDistribution[t.key] || 0;
                  const pct   = totalOrgs > 0 ? Math.round((count / totalOrgs) * 100) : 0;
                  return (
                    <div key={t.key} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.dot }} />
                        {isAr ? t.labelAr : t.labelFr}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom row: expiring soon + recent payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Expiring soon */}
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                {isAr ? 'اشتراكات تنتهي قريباً (30 يوم)' : 'Abonnements expirant bientôt (30j)'}
              </h3>
              {loadingAnalytics ? (
                <div className="flex justify-center py-6"><div className="w-6 h-6 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>
              ) : (analytics?.expiringSoon || []).length > 0 ? (
                <div className="space-y-2">
                  {(analytics.expiringSoon as any[]).map((org: any) => (
                    <div key={org.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{org.name}</p>
                        <p className="text-xs text-gray-500">{org.email}</p>
                      </div>
                      <div className="text-end">
                        <AssocTypeBadge modules={org.modules || []} isAr={isAr} />
                        <p className={`text-xs mt-1 font-medium ${org.daysLeft <= 7 ? 'text-red-500' : 'text-amber-500'}`}>
                          {org.daysLeft} {isAr ? 'يوم' : 'j'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-gray-400">
                  {isAr ? 'لا توجد اشتراكات تنتهي قريباً' : 'Aucun abonnement expirant bientôt'}
                </div>
              )}
            </div>

            {/* Recent payments */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                  <CreditCard size={15} className="text-emerald-500" />
                  {isAr ? 'آخر المدفوعات' : 'Derniers paiements'}
                </h3>
                <button onClick={() => setActiveTab('payments')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  {isAr ? 'عرض الكل' : 'Voir tout'}
                </button>
              </div>
              {loadingAnalytics ? (
                <div className="flex justify-center py-6"><div className="w-6 h-6 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" /></div>
              ) : (analytics?.recentPayments || []).length > 0 ? (
                <div className="space-y-2">
                  {(analytics.recentPayments as any[]).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.organization?.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(p.paidAt, lang)} · {isAr ? METHOD_LABEL[p.method]?.ar : METHOD_LABEL[p.method]?.fr}
                          {p.reference && <span className="font-mono ms-1">#{p.reference}</span>}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        +{p.amount.toFixed(0)} MAD
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-gray-400">
                  {isAr ? 'لا توجد مدفوعات بعد' : 'Aucun paiement enregistré'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ORGANIZATIONS TAB                                                    */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'orgs' && (
        <div className="space-y-4">

          {/* Filters bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input ps-9 text-sm h-9"
                placeholder={isAr ? 'بحث باسم أو بريد أو مدينة…' : 'Rechercher par nom, email, ville…'}
                value={orgSearch}
                onChange={e => setOrgSearch(e.target.value)}
              />
              {orgSearch && (
                <button onClick={() => setOrgSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-gray-400" />
              <select className="input text-sm h-9 py-0" value={orgType} onChange={e => setOrgType(e.target.value)}>
                <option value="">{isAr ? 'كل الأنواع' : 'Tous les types'}</option>
                {ASSOC_TYPES.map(t => <option key={t.key} value={t.key}>{isAr ? t.labelAr : t.labelFr}</option>)}
              </select>
              <select className="input text-sm h-9 py-0" value={orgStatus} onChange={e => setOrgStatus(e.target.value)}>
                <option value="">{isAr ? 'كل الحالات' : 'Tous les statuts'}</option>
                {['TRIAL','ACTIVE','EXPIRED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            {loadingOrgs ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr>
                    <th>{isAr ? 'الجمعية' : 'Association'}</th>
                    <th>{isAr ? 'المدينة' : 'Ville'}</th>
                    <th>{isAr ? 'النوع' : 'Type'}</th>
                    <th>{isAr ? 'الاشتراك' : 'Abonnement'}</th>
                    <th>{isAr ? 'تاريخ الانتهاء' : 'Expiration'}</th>
                    <th>{isAr ? 'الأعضاء' : 'Membres'}</th>
                    <th>{isAr ? 'تاريخ الإنشاء' : 'Créé le'}</th>
                    <th>{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr></thead>
                  <tbody>
                    {orgs.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">{isAr ? 'لا توجد نتائج' : 'Aucun résultat'}</td></tr>
                    ) : orgs.map(org => (
                      <tr key={org.id}>
                        <td>
                          <div className="font-medium text-gray-900 dark:text-white">{org.name}</div>
                          <div className="text-xs text-gray-500">{org.email}</div>
                        </td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{org.city || '-'}</td>
                        <td><AssocTypeBadge modules={org.modules || []} isAr={isAr} /></td>
                        <td><SubStatusBadge status={org.subscription?.status} isAr={isAr} /></td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">
                          {org.subscription?.expiresAt ? formatDate(org.subscription.expiresAt, lang) : '-'}
                        </td>
                        <td className="text-sm text-center">{org._count?.members ?? 0}</td>
                        <td className="text-sm text-gray-500">{formatDate(org.createdAt, lang)}</td>
                        <td>
                          <div className="flex gap-1">
                            <button onClick={() => openSubModal(org)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                              title={isAr ? 'تعديل' : 'Modifier'}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeleteOrgId(org.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title={isAr ? 'حذف' : 'Supprimer'}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* PAYMENTS TAB                                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'payments' && (
        <div className="space-y-4">

          {/* Summary + add button */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-4 flex-1 flex-wrap">
              <div className="card p-3 flex items-center gap-3 min-w-40">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <DollarSign size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{isAr ? 'الإجمالي' : 'Total encaissé'}</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    {analytics ? `${analytics.totalCollected.toFixed(0)} MAD` : '…'}
                  </p>
                </div>
              </div>
              <div className="card p-3 flex items-center gap-3 min-w-40">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{isAr ? 'هذا الشهر' : 'Ce mois'}</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    {analytics ? `${analytics.paymentsThisMonth.toFixed(0)} MAD` : '…'}
                  </p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowPaymentModal(true)}
              className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} />
              {isAr ? 'تسجيل دفع' : 'Enregistrer un paiement'}
            </button>
          </div>

          {/* Payments table */}
          <div className="card">
            {loadingPayments ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr>
                    <th>{isAr ? 'الجمعية' : 'Association'}</th>
                    <th>{isAr ? 'المبلغ' : 'Montant'}</th>
                    <th>{isAr ? 'طريقة الدفع' : 'Mode'}</th>
                    <th>{isAr ? 'التاريخ' : 'Date'}</th>
                    <th>{isAr ? 'ملاحظة' : 'Note'}</th>
                    <th>{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr></thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                        {isAr ? 'لا توجد مدفوعات بعد' : 'Aucun paiement enregistré'}
                      </td></tr>
                    ) : payments.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="font-medium text-gray-900 dark:text-white">{p.organization?.name}</div>
                        </td>
                        <td>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {p.amount.toFixed(2)} MAD
                          </span>
                        </td>
                        <td>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {isAr ? METHOD_LABEL[p.method]?.ar : METHOD_LABEL[p.method]?.fr}
                          </span>
                          {p.reference && (
                            <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{p.reference}</p>
                          )}
                        </td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{formatDate(p.paidAt, lang)}</td>
                        <td className="text-sm text-gray-500 max-w-40 truncate">{p.note || '-'}</td>
                        <td>
                          <button onClick={() => setDeletePaymentId(p.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* USERS TAB                                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative max-w-xs">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input ps-9 text-sm h-9"
              placeholder={isAr ? 'بحث باسم أو بريد…' : 'Rechercher par nom ou email…'}
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
          </div>

          <div className="card">
            {loadingUsers ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr>
                    <th>{isAr ? 'المستخدم' : 'Utilisateur'}</th>
                    <th>{isAr ? 'الجمعية' : 'Association'}</th>
                    <th>{isAr ? 'الدور' : 'Rôle'}</th>
                    <th>{isAr ? 'الحالة' : 'Statut'}</th>
                    <th>{isAr ? 'تاريخ الإنشاء' : 'Créé le'}</th>
                    <th>{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr></thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">{isAr ? 'لا توجد نتائج' : 'Aucun résultat'}</td></tr>
                    ) : users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{user.organization?.name || '-'}</td>
                        <td><span className="badge badge-blue text-xs">{user.role}</span></td>
                        <td>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {user.isActive ? (isAr ? 'نشط' : 'Actif') : (isAr ? 'معطل' : 'Désactivé')}
                          </span>
                        </td>
                        <td className="text-sm text-gray-500">{formatDate(user.createdAt, lang)}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleToggleUser(user.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.isActive
                                  ? 'text-emerald-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                  : 'text-red-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                              }`}
                              title={user.isActive ? (isAr ? 'تعطيل' : 'Désactiver') : (isAr ? 'تفعيل' : 'Activer')}>
                              {user.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            </button>
                            <button onClick={() => handleResetPassword(user.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                              title={isAr ? 'إعادة تعيين كلمة المرور' : 'Réinitialiser le mot de passe'}>
                              <KeyRound size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                               */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* Edit subscription modal */}
      <Modal
        isOpen={showSubModal}
        onClose={() => { setShowSubModal(false); setSaveError(null); }}
        title={isAr ? 'تعديل النوع والاشتراك' : 'Modifier le type et l\'abonnement'}
        footer={
          <>
            <button onClick={() => { setShowSubModal(false); setSaveError(null); }} className="btn-secondary">{isAr ? 'إلغاء' : 'Annuler'}</button>
            <button onClick={handleSubUpdate} disabled={saving} className="btn-primary">{saving ? '…' : (isAr ? 'حفظ' : 'Enregistrer')}</button>
          </>
        }
      >
        <div className="space-y-5">
          {saveError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
          {selectedOrg && <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">{selectedOrg.name}</div>}

          <div>
            <label className="label mb-2 block">{isAr ? 'نوع الجمعية' : 'Type d\'association'}</label>
            <div className="space-y-2">
              {ASSOC_TYPES.map(({ key, labelFr, labelAr, icon, badge, dot, price }) => (
                <button key={key} type="button"
                  onClick={() => setSubForm(f => ({ ...f, assocType: key }))}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-start transition-all ${
                    subForm.assocType === key
                      ? 'border-current ring-1 ring-current ' + badge
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-white dark:bg-gray-800'
                  }`}
                  style={subForm.assocType === key ? { borderColor: dot } : {}}>
                  <span style={{ color: dot }}>{icon}</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{isAr ? labelAr : labelFr}</span>
                  <span className="text-xs text-gray-400">{price} MAD/mois</span>
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: subForm.assocType === key ? dot : '#d1d5db', backgroundColor: subForm.assocType === key ? dot : 'transparent' }}>
                    {subForm.assocType === key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">{isAr ? 'حالة الاشتراك' : 'Statut'}</label>
            <select className="input" value={subForm.status} onChange={e => setSubForm({ ...subForm, status: e.target.value })}>
              {['TRIAL','ACTIVE','EXPIRED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="label">{isAr ? 'تاريخ الانتهاء' : 'Date d\'expiration'}</label>
            <input className="input" type="date" value={subForm.expiresAt} onChange={e => setSubForm({ ...subForm, expiresAt: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Record payment modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={isAr ? 'تسجيل دفعة جديدة' : 'Enregistrer un paiement'}
        footer={
          <>
            <button onClick={() => setShowPaymentModal(false)} className="btn-secondary">{isAr ? 'إلغاء' : 'Annuler'}</button>
            <button onClick={handleCreatePayment} disabled={saving || !paymentForm.organizationId || !paymentForm.amount} className="btn-primary">
              {saving ? '…' : (isAr ? 'تسجيل' : 'Enregistrer')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">{isAr ? 'الجمعية' : 'Association'}</label>
            <select className="input" value={paymentForm.organizationId} onChange={e => setPaymentForm({ ...paymentForm, organizationId: e.target.value })}>
              <option value="">{isAr ? '-- اختر جمعية --' : '-- Choisir une association --'}</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{isAr ? 'المبلغ (MAD)' : 'Montant (MAD)'}</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">{isAr ? 'طريقة الدفع' : 'Mode de paiement'}</label>
              <select className="input" value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value, reference: '' })}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{isAr ? METHOD_LABEL[m]?.ar : METHOD_LABEL[m]?.fr}</option>)}
              </select>
            </div>
          </div>

          {/* Reference — shown only for CHECK or TRANSFER */}
          {(paymentForm.method === 'CHECK' || paymentForm.method === 'TRANSFER') && (
            <div>
              <label className="label">
                {paymentForm.method === 'CHECK'
                  ? (isAr ? 'رقم الشيك' : 'Numéro de chèque')
                  : (isAr ? 'مرجع التحويل' : 'Référence du virement')}
              </label>
              <input
                className="input font-mono"
                placeholder={paymentForm.method === 'CHECK'
                  ? (isAr ? 'مثال: 0012345' : 'ex: 0012345')
                  : (isAr ? 'مثال: VIR-2024-001' : 'ex: VIR-2024-001')}
                value={paymentForm.reference}
                onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="label">{isAr ? 'تاريخ الدفع' : 'Date du paiement'}</label>
            <input className="input" type="date" value={paymentForm.paidAt} onChange={e => setPaymentForm({ ...paymentForm, paidAt: e.target.value })} />
          </div>
          <div>
            <label className="label">{isAr ? 'ملاحظة (اختياري)' : 'Note (optionnel)'}</label>
            <input className="input" placeholder={isAr ? 'دفعة شهر أبريل…' : 'Paiement mois d\'avril…'}
              value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Confirm delete org */}
      <ConfirmDialog
        isOpen={!!deleteOrgId} onClose={() => setDeleteOrgId(null)} onConfirm={handleDeleteOrg}
        title={isAr ? 'حذف الجمعية' : 'Supprimer l\'association'}
        message={isAr ? 'سيتم حذف الجمعية وجميع بياناتها نهائياً. هل أنت متأكد؟' : 'Cette association et toutes ses données seront supprimées définitivement. Confirmer ?'}
        loading={deleting}
      />

      {/* Confirm delete payment */}
      <ConfirmDialog
        isOpen={!!deletePaymentId} onClose={() => setDeletePaymentId(null)} onConfirm={handleDeletePayment}
        title={isAr ? 'حذف الدفعة' : 'Supprimer le paiement'}
        message={isAr ? 'هل تريد حذف هذه الدفعة؟' : 'Voulez-vous supprimer ce paiement ?'}
        loading={deleting}
      />

      {/* Reset password result */}
      <Modal
        isOpen={!!resetResult}
        onClose={() => { setResetResult(null); setResetCopied(false); }}
        title={isAr ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}
        footer={<button onClick={() => { setResetResult(null); setResetCopied(false); }} className="btn-primary">{isAr ? 'تم' : 'Fermer'}</button>}
      >
        {resetResult && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isAr ? `تم إعادة تعيين كلمة مرور ${resetResult.name}` : `Mot de passe de ${resetResult.name} réinitialisé`}
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-2">
                {isAr ? 'كلمة المرور المؤقتة' : 'Mot de passe temporaire'}
              </p>
              <div className="flex items-center gap-3">
                <span className="flex-1 font-mono text-xl font-bold tracking-widest text-gray-900 dark:text-white">
                  {resetResult.tempPassword}
                </span>
                <button onClick={copyPassword}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50">
                  {resetCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {resetCopied ? (isAr ? 'تم' : 'Copié') : (isAr ? 'نسخ' : 'Copier')}
                </button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                {isAr ? '⚠️ شارك هذه الكلمة مع المستخدم وأخبره بتغييرها فوراً' : '⚠️ Communiquez ce mot de passe à l\'utilisateur et demandez-lui de le changer'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
