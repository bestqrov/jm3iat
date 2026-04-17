import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  Users, Calendar, DollarSign, Briefcase, TrendingUp, TrendingDown,
  Bell, Droplets, ShoppingBag, Layers, Building2, FolderKanban,
  AlertCircle, CheckCircle, Wrench, Package, RefreshCw, Activity, Globe,
  Bus, MapPin, CreditCard, UserCheck,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  membersApi, meetingsApi, financeApi, projectsApi,
  remindersApi, waterApi, assocApi, transportApi,
} from '../../lib/api';
import { StatCard } from '../../components/ui/StatCard';
import { formatCurrency, formatDate, getTrialDaysRemaining } from '../../lib/utils';

// ─── Theme per association type ───────────────────────────────────────────────

type DashTheme = {
  gradient: string;
  primary: string;
  secondary: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  labelFr: string;
  labelAr: string;
};

const getDashTheme = (modules: string[]): DashTheme => {
  const hasWater = modules.includes('WATER');
  const hasProd  = modules.includes('PRODUCTIVE');
  const hasProj  = modules.includes('PROJECTS');

  if (hasWater && hasProd) return {
    gradient: 'linear-gradient(90deg, #7c3aed, #4f46e5, #0891b2)',
    primary: '#7c3aed', secondary: '#0891b2',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    icon: <Layers size={14} />,
    labelFr: 'Association Productive + Eau', labelAr: 'جمعية إنتاجية مع الماء',
  };
  if (hasWater) return {
    gradient: 'linear-gradient(90deg, #0891b2, #2563eb)',
    primary: '#0891b2', secondary: '#2563eb',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    icon: <Droplets size={14} />,
    labelFr: 'Association de l\'eau', labelAr: 'جمعية الماء',
  };
  if (hasProd) return {
    gradient: 'linear-gradient(90deg, #059669, #0d9488)',
    primary: '#059669', secondary: '#0d9488',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    icon: <ShoppingBag size={14} />,
    labelFr: 'Association Productive', labelAr: 'جمعية إنتاجية',
  };
  if (hasProj) return {
    gradient: 'linear-gradient(90deg, #2563eb, #4f46e5)',
    primary: '#2563eb', secondary: '#4f46e5',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    icon: <FolderKanban size={14} />,
    labelFr: 'Association avec Projets', labelAr: 'جمعية المشاريع',
  };
  return {
    gradient: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
    primary: '#4f46e5', secondary: '#7c3aed',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    icon: <Building2 size={14} />,
    labelFr: 'Association Classique', labelAr: 'جمعية عادية',
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const { user, organization, isSuperAdmin, hasModule } = useAuth();
  const { t, lang } = useLanguage();

  if (isSuperAdmin) return <Navigate to="/superadmin" replace />;

  const sub    = organization?.subscription;
  const mods   = organization?.modules ?? [];
  const theme  = getDashTheme(mods);
  const isAr   = lang === 'ar';

  const hasWater     = hasModule('WATER');
  const hasProd      = hasModule('PRODUCTIVE');
  const hasProj      = hasModule('PROJECTS');
  const hasTransport = hasModule('TRANSPORT');
  const hasFinance   = mods.length > 0 || (sub?.plan && sub.plan !== 'BASIC');

  const trialDays = organization?.trialEndsAt ? getTrialDaysRemaining(organization.trialEndsAt) : null;

  // ── Data state ──
  const [memberStats,        setMemberStats]        = useState<any>(null);
  const [meetingStats,       setMeetingStats]        = useState<any>(null);
  const [financeSummary,     setFinanceSummary]      = useState<any>(null);
  const [monthlyData,        setMonthlyData]         = useState<any[]>([]);
  const [projectStats,       setProjectStats]        = useState<any>(null);
  const [recentMeetings,     setRecentMeetings]      = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions]  = useState<any[]>([]);
  const [reminders,          setReminders]           = useState<any[]>([]);
  const [waterSummary,       setWaterSummary]        = useState<any>(null);
  const [assocStats,         setAssocStats]          = useState<any>(null);
  const [transportStats,     setTransportStats]      = useState<any>(null);
  const [loading,            setLoading]             = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Always load: members, meetings, reminders
        const [ms, mts, rem, meetings] = await Promise.allSettled([
          membersApi.getStats(),
          meetingsApi.getStats(),
          remindersApi.getAll({ unread: true }),
          meetingsApi.getAll({ status: undefined }),
        ]);
        if (ms.status       === 'fulfilled') setMemberStats(ms.value.data);
        if (mts.status      === 'fulfilled') setMeetingStats(mts.value.data);
        if (rem.status      === 'fulfilled') setReminders(rem.value.data.slice(0, 5));
        if (meetings.status === 'fulfilled') setRecentMeetings(meetings.value.data.slice(0, 5));

        // Finance — non-REGULAR orgs
        if (hasFinance) {
          const [fin, monthly, tx] = await Promise.allSettled([
            financeApi.getSummary(),
            financeApi.getMonthly(),
            financeApi.getAll(),
          ]);
          if (fin.status    === 'fulfilled') setFinanceSummary(fin.value.data);
          if (monthly.status === 'fulfilled') setMonthlyData(monthly.value.data);
          if (tx.status     === 'fulfilled') setRecentTransactions(tx.value.data.slice(0, 5));
        }

        // Projects module
        if (hasProj) {
          const ps = await projectsApi.getStats().catch(() => null);
          if (ps) setProjectStats(ps.data);
        }

        // Water module
        if (hasWater) {
          const ws = await waterApi.getSummary().catch(() => null);
          if (ws) setWaterSummary(ws.data);
        }

        // Productive module
        if (hasProd) {
          const as = await assocApi.getStats().catch(() => null);
          if (as) setAssocStats(as.data);
        }

        // Transport module
        if (hasTransport) {
          const ts = await transportApi.getStats().catch(() => null);
          if (ts) setTransportStats(ts.data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Chart data ──
  const months = (t('common.months') as unknown as string[]);
  const chartData = monthlyData.map((m, i) => ({
    name: months?.[i] ?? `M${i + 1}`,
    [isAr ? 'إيرادات' : 'Recettes']: m.income,
    [isAr ? 'مصاريف' : 'Dépenses']: m.expenses,
  }));

  const projectPieData = projectStats ? [
    { name: t('projects.statuses.PLANNED'),     value: projectStats.planned     },
    { name: t('projects.statuses.IN_PROGRESS'), value: projectStats.inProgress  },
    { name: t('projects.statuses.COMPLETED'),   value: projectStats.completed   },
  ].filter(d => d.value > 0) : [];

  const PIE_COLORS = [theme.primary, theme.secondary, '#f59e0b'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: theme.primary, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Themed header banner ── */}
      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="h-1.5 w-full" style={{ background: theme.gradient }} />
        <div className="p-5 bg-white dark:bg-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('dashboard.welcome')}, {user?.name?.split(' ')[0]}!
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">{organization?.name}</span>
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {theme.icon}
                {isAr ? theme.labelAr : theme.labelFr}
              </span>
              {sub?.status === 'TRIAL' && trialDays !== null && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {t('dashboard.trialEnds')} {trialDays} {t('dashboard.days')}
                </span>
              )}
            </div>
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: theme.gradient }}
          >
            <span className="font-bold text-white text-sm">MA</span>
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/calendar',  icon: <Calendar size={18} />,   label: isAr ? 'التقويم' : 'Calendrier',        color: 'indigo' },
          { to: '/recurring', icon: <RefreshCw size={18} />,  label: isAr ? 'الدفعات المتكررة' : 'Récurrents', color: 'blue' },
          { to: '/activity',  icon: <Activity size={18} />,   label: isAr ? 'سجل النشاطات' : 'Activité',    color: 'purple' },
          { to: '/settings',  icon: <Globe size={18} />,      label: isAr ? 'الصفحة العامة' : 'Page publique', color: 'emerald' },
        ].map(qa => (
          <Link key={qa.to} to={qa.to}
            className={`card p-3 flex items-center gap-2 hover:shadow-md transition-shadow group`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${qa.color}-100 dark:bg-${qa.color}-900/30 text-${qa.color}-600 dark:text-${qa.color}-400 group-hover:scale-110 transition-transform`}>
              {qa.icon}
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{qa.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Stat cards — base (all types) ── */}
      <div className="stats-grid">
        <StatCard
          title={t('dashboard.totalMembers')}
          value={memberStats?.total ?? '-'}
          icon={<Users size={22} />}
          iconBg={theme.iconBg}
          iconColor={theme.iconColor}
          subtitle={`${memberStats?.active ?? 0} ${t('members.active')}`}
        />
        <StatCard
          title={t('dashboard.totalMeetings')}
          value={meetingStats?.total ?? '-'}
          icon={<Calendar size={22} />}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          subtitle={`${meetingStats?.thisMonth ?? 0} ${isAr ? 'هذا الشهر' : 'ce mois'}`}
        />

        {/* Finance balance — non-REGULAR */}
        {hasFinance && (
          <StatCard
            title={t('dashboard.balance')}
            value={financeSummary ? formatCurrency(financeSummary.balance, lang) : '-'}
            icon={<DollarSign size={22} />}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
        )}

        {/* Projects module stat */}
        {hasProj && (
          <StatCard
            title={t('dashboard.activeProjects')}
            value={projectStats?.inProgress ?? '-'}
            icon={<Briefcase size={22} />}
            iconBg={theme.iconBg}
            iconColor={theme.iconColor}
            subtitle={`${projectStats?.completed ?? 0} ${isAr ? 'مكتمل' : 'terminés'}`}
          />
        )}

        {/* Water module stat */}
        {hasWater && (
          <StatCard
            title={isAr ? 'الفواتير غير المدفوعة' : 'Factures impayées'}
            value={waterSummary?.unpaidInvoices ?? '-'}
            icon={<AlertCircle size={22} />}
            iconBg="bg-cyan-100 dark:bg-cyan-900/30"
            iconColor="text-cyan-600 dark:text-cyan-400"
            subtitle={waterSummary ? formatCurrency(waterSummary.pendingAmount ?? 0, lang) : ''}
          />
        )}

        {/* Productive module stat */}
        {hasProd && (
          <StatCard
            title={isAr ? 'المبيعات هذا الشهر' : 'Ventes ce mois'}
            value={assocStats?.salesThisMonth ?? '-'}
            icon={<ShoppingBag size={22} />}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
            subtitle={assocStats ? formatCurrency(assocStats.revenueThisMonth ?? 0, lang) : ''}
          />
        )}

        {/* Transport module stat */}
        {hasTransport && (
          <StatCard
            title={isAr ? 'تلاميذ النقل' : 'Élèves transportés'}
            value={transportStats?.totalStudents ?? '-'}
            icon={<Bus size={22} />}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            iconColor="text-orange-600 dark:text-orange-400"
            subtitle={transportStats ? (isAr ? `${transportStats.unpaidSubs ?? 0} غير مدفوع` : `${transportStats.unpaidSubs ?? 0} impayé(s)`) : ''}
          />
        )}
      </div>

      {/* ── Module-specific sections ── */}

      {/* WATER module — summary cards */}
      {hasWater && waterSummary && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Droplets size={18} style={{ color: theme.primary }} />
            {isAr ? 'ملخص الماء' : 'Résumé eau'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: isAr ? 'المنشآت' : 'Installations', value: waterSummary.totalInstallations ?? '-', icon: <Droplets size={18} /> },
              { label: isAr ? 'الفواتير هذا الشهر' : 'Factures ce mois', value: waterSummary.invoicesThisMonth ?? '-', icon: <CheckCircle size={18} /> },
              { label: isAr ? 'الإيرادات هذا الشهر' : 'Revenus ce mois', value: formatCurrency(waterSummary.revenueThisMonth ?? 0, lang), icon: <TrendingUp size={18} /> },
              { label: isAr ? 'الأعطال المفتوحة' : 'Pannes ouvertes', value: waterSummary.openRepairs ?? '-', icon: <Wrench size={18} /> },
            ].map((card, i) => (
              <div key={i} className="card p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: `${theme.primary}18` }}>
                  <span style={{ color: theme.primary }}>{card.icon}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRODUCTIVE module — assoc summary */}
      {hasProd && assocStats && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <ShoppingBag size={18} style={{ color: theme.primary }} />
            {isAr ? 'ملخص الإنتاج' : 'Résumé production'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: isAr ? 'المنتجات' : 'Produits', value: assocStats.totalProducts ?? '-', icon: <Package size={18} /> },
              { label: isAr ? 'قيمة المخزون' : 'Valeur stock', value: formatCurrency(assocStats.stockValue ?? 0, lang), icon: <ShoppingBag size={18} /> },
              { label: isAr ? 'العملاء' : 'Clients', value: assocStats.totalClients ?? '-', icon: <Users size={18} /> },
              { label: isAr ? 'إجمالي المبيعات' : 'Total ventes', value: formatCurrency(assocStats.totalRevenue ?? 0, lang), icon: <TrendingUp size={18} /> },
            ].map((card, i) => (
              <div key={i} className="card p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: `${theme.primary}18` }}>
                  <span style={{ color: theme.primary }}>{card.icon}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Transport module section ── */}
      {hasTransport && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Bus size={18} className="text-orange-500" />
            {isAr ? 'ملخص النقل المدرسي' : 'Résumé transport scolaire'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: isAr ? 'التلاميذ' : 'Élèves',          value: transportStats?.totalStudents  ?? '-', icon: <Users size={18} />,     color: '#ea580c' },
              { label: isAr ? 'الحافلات' : 'Véhicules',        value: transportStats?.totalVehicles  ?? '-', icon: <Bus size={18} />,       color: '#ea580c' },
              { label: isAr ? 'الخطوط' : 'Itinéraires',        value: transportStats?.totalRoutes    ?? '-', icon: <MapPin size={18} />,    color: '#ea580c' },
              { label: isAr ? 'غير مدفوع' : 'Abonnements impayés', value: transportStats?.unpaidSubs ?? '-', icon: <CreditCard size={18} />, color: '#dc2626' },
            ].map((card, i) => (
              <Link key={i} to="/transport" className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                <div className="p-2 rounded-lg" style={{ background: `${card.color}18` }}>
                  <span style={{ color: card.color }}>{card.icon}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{card.value}</p>
                </div>
              </Link>
            ))}
          </div>
          {/* Revenue summary */}
          {transportStats && (transportStats.monthRevenue > 0 || transportStats.totalRevenue > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="card p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <TrendingUp size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{isAr ? 'إيرادات هذا الشهر' : 'Revenus ce mois'}</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(transportStats.monthRevenue ?? 0, lang)}</p>
                </div>
              </div>
              <div className="card p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <UserCheck size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{isAr ? 'اشتراكات مدفوعة' : 'Abonnements payés'}</p>
                  <p className="text-sm font-bold text-blue-600">{transportStats.paidSubs ?? '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Finance Chart (non-REGULAR) */}
        {hasFinance ? (
          <div className="lg:col-span-2 card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.monthlyChart')}</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, lang)} />
                  <Bar dataKey={isAr ? 'إيرادات' : 'Recettes'} fill={theme.primary}   radius={[4, 4, 0, 0]} />
                  <Bar dataKey={isAr ? 'مصاريف' : 'Dépenses'}  fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                {t('common.noData')}
              </div>
            )}
          </div>
        ) : (
          /* REGULAR: recent meetings takes 2/3 of the row */
          <div className="lg:col-span-2 card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('dashboard.recentMeetings')}</h3>
            {recentMeetings.length > 0 ? (
              <div className="space-y-2">
                {recentMeetings.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{m.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(m.date, lang)}</p>
                    </div>
                    <span className={`badge ${m.status === 'COMPLETED' ? 'badge-green' : m.status === 'SCHEDULED' ? 'badge-blue' : 'badge-gray'}`}>
                      {t(`meetings.statuses.${m.status}`)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('dashboard.noMeetings')}</p>
            )}
          </div>
        )}

        {/* Right column: Projects pie OR Reminders */}
        <div className="card p-4">
          {hasProj && projectPieData.length > 0 ? (
            <>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.projectsChart')}</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={projectPieData}
                    cx="50%" cy="50%" outerRadius={70} dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {projectPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Bell size={16} />{t('dashboard.reminders')}
              </h3>
              {reminders.length > 0 ? (
                <div className="space-y-2">
                  {reminders.map(r => (
                    <div key={r.id} className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300 truncate">{r.title}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">{t('reminders.noReminders')}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Recent tables row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Meetings (always, except for REGULAR it was shown above) */}
        {hasFinance && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('dashboard.recentMeetings')}</h3>
            {recentMeetings.length > 0 ? (
              <div className="space-y-2">
                {recentMeetings.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{m.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(m.date, lang)}</p>
                    </div>
                    <span className={`badge ${m.status === 'COMPLETED' ? 'badge-green' : m.status === 'SCHEDULED' ? 'badge-blue' : 'badge-gray'}`}>
                      {t(`meetings.statuses.${m.status}`)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('dashboard.noMeetings')}</p>
            )}
          </div>
        )}

        {/* Recent Transactions (non-REGULAR) */}
        {hasFinance && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('dashboard.recentTransactions')}</h3>
            {recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-2">
                      {tx.type === 'INCOME'
                        ? <TrendingUp size={16} className="text-emerald-500" />
                        : <TrendingDown size={16} className="text-red-500" />}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{tx.category}</p>
                        <p className="text-xs text-gray-500">{formatDate(tx.date, lang)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, lang)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('dashboard.noTransactions')}</p>
            )}
          </div>
        )}

        {/* REGULAR: only show reminders in the second column */}
        {!hasFinance && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Bell size={16} />{t('dashboard.reminders')}
            </h3>
            {reminders.length > 0 ? (
              <div className="space-y-2">
                {reminders.map(r => (
                  <div key={r.id} className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300 truncate">{r.title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('reminders.noReminders')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
