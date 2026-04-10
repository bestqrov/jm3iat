import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, Calendar, DollarSign, Briefcase, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { membersApi, meetingsApi, financeApi, projectsApi, remindersApi } from '../../lib/api';
import { StatCard } from '../../components/ui/StatCard';
import { formatCurrency, formatDate, getTrialDaysRemaining } from '../../lib/utils';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

export const DashboardPage: React.FC = () => {
  const { user, organization, isSuperAdmin } = useAuth();
  const { t, lang } = useLanguage();

  if (isSuperAdmin) return <Navigate to="/superadmin" replace />;

  const [memberStats, setMemberStats] = useState<any>(null);
  const [meetingStats, setMeetingStats] = useState<any>(null);
  const [financeSummary, setFinanceSummary] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [projectStats, setProjectStats] = useState<any>(null);
  const [recentMeetings, setRecentMeetings] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const sub = organization?.subscription;
  const trialDays = organization?.trialEndsAt ? getTrialDaysRemaining(organization.trialEndsAt) : null;

  useEffect(() => {
    const load = async () => {
      try {
        const promises = [
          membersApi.getStats(),
          meetingsApi.getStats(),
          remindersApi.getAll({ unread: true }),
          meetingsApi.getAll({ status: undefined }),
        ];
        const [ms, mts, rem, meetings] = await Promise.allSettled(promises);
        if (ms.status === 'fulfilled') setMemberStats(ms.value.data);
        if (mts.status === 'fulfilled') setMeetingStats(mts.value.data);
        if (rem.status === 'fulfilled') setReminders(rem.value.data.slice(0, 5));
        if (meetings.status === 'fulfilled') setRecentMeetings(meetings.value.data.slice(0, 5));

        // Finance (requires STANDARD+)
        if (sub && ['STANDARD', 'PREMIUM'].includes(sub.plan)) {
          const [fin, monthly, tx] = await Promise.allSettled([
            financeApi.getSummary(),
            financeApi.getMonthly(),
            financeApi.getAll(),
          ]);
          if (fin.status === 'fulfilled') setFinanceSummary(fin.value.data);
          if (monthly.status === 'fulfilled') setMonthlyData(monthly.value.data);
          if (tx.status === 'fulfilled') setRecentTransactions(tx.value.data.slice(0, 5));
        }

        // Projects (requires PREMIUM)
        if (sub?.plan === 'PREMIUM') {
          const ps = await projectsApi.getStats().catch(() => null);
          if (ps) setProjectStats(ps.data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const months = (t('common.months') as unknown as string[]);
  const chartData = monthlyData.map((m, i) => ({
    name: months?.[i] ?? `M${i + 1}`,
    [lang === 'ar' ? 'إيرادات' : 'Recettes']: m.income,
    [lang === 'ar' ? 'مصاريف' : 'Dépenses']: m.expenses,
  }));

  const projectPieData = projectStats ? [
    { name: t('projects.statuses.PLANNED'), value: projectStats.planned },
    { name: t('projects.statuses.IN_PROGRESS'), value: projectStats.inProgress },
    { name: t('projects.statuses.COMPLETED'), value: projectStats.completed },
  ].filter((d) => d.value > 0) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('dashboard.welcome')}, {user?.name?.split(' ')[0]}! 👋
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          {organization?.name}
          {sub?.status === 'TRIAL' && trialDays !== null && (
            <span className="ms-2 badge badge-blue">
              {t('dashboard.trialEnds')} {trialDays} {t('dashboard.days')}
            </span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          title={t('dashboard.totalMembers')}
          value={memberStats?.total ?? '-'}
          icon={<Users size={22} />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          subtitle={`${memberStats?.active ?? 0} ${t('members.active')}`}
        />
        <StatCard
          title={t('dashboard.totalMeetings')}
          value={meetingStats?.total ?? '-'}
          icon={<Calendar size={22} />}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          subtitle={`${meetingStats?.thisMonth ?? 0} ${lang === 'ar' ? 'هذا الشهر' : 'ce mois'}`}
        />
        <StatCard
          title={t('dashboard.balance')}
          value={financeSummary ? formatCurrency(financeSummary.balance, lang) : (lang === 'ar' ? 'غير متاح' : 'N/A')}
          icon={<DollarSign size={22} />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title={t('dashboard.activeProjects')}
          value={projectStats?.inProgress ?? (projectStats ? 0 : (lang === 'ar' ? 'غير متاح' : 'N/A'))}
          icon={<Briefcase size={22} />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Finance Chart */}
        <div className="lg:col-span-2 card p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.monthlyChart')}</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v, lang)} />
                <Bar dataKey={lang === 'ar' ? 'إيرادات' : 'Recettes'} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey={lang === 'ar' ? 'مصاريف' : 'Dépenses'} fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              {sub?.plan === 'BASIC' ? t('subscription.featureLocked') : t('common.noData')}
            </div>
          )}
        </div>

        {/* Projects Pie / Reminders */}
        <div className="card p-4">
          {projectPieData.length > 0 ? (
            <>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.projectsChart')}</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={projectPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {projectPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
                  {reminders.map((r) => (
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

      {/* Recent tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Meetings */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('dashboard.recentMeetings')}</h3>
          {recentMeetings.length > 0 ? (
            <div className="space-y-2">
              {recentMeetings.map((m) => (
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

        {/* Recent Transactions */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('dashboard.recentTransactions')}</h3>
          {recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-2">
                    {tx.type === 'INCOME'
                      ? <TrendingUp size={16} className="text-emerald-500" />
                      : <TrendingDown size={16} className="text-red-500" />
                    }
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
      </div>
    </div>
  );
};
