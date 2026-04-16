import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { formatDate, formatCurrency } from '../../../lib/utils';

interface Analytics {
  monthlySignups: { month: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  statusDistribution: Record<string, number>;
  expiringSoon: any[];
  mrrEstimate: number;
  potentialMrr: number;
  churnRate: number;
  conversionRate: number;
  paymentsThisMonth: number;
  totalCollected: number;
  recentPayments: any[];
}

const STATUS_COLORS: Record<string, string> = {
  TRIAL: '#f59e0b', ACTIVE: '#10b981', EXPIRED: '#ef4444', CANCELLED: '#6b7280',
};

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const AnalyticsTab: React.FC = () => {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const sa = (k: string) => t(`sa.analytics.${k}`);
  const kpi = (k: string) => t(`sa.kpi.${k}`);

  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi.getAnalytics()
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3" />
      {isAr ? 'جار التحميل...' : 'Chargement...'}
    </div>
  );
  if (!data) return null;

  const pieData = Object.entries(data.statusDistribution).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] || '#6b7280',
  }));

  const kpiCards = [
    {
      label: kpi('mrr'),
      value: `${data.mrrEstimate.toLocaleString()} MAD`,
      sub: `${isAr ? 'محتمل' : 'Potentiel'}: ${data.potentialMrr.toLocaleString()} MAD`,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      icon: <DollarSign size={20} className="text-indigo-500" />,
    },
    {
      label: kpi('monthlyRevenue'),
      value: `${data.paymentsThisMonth.toLocaleString()} MAD`,
      sub: `${isAr ? 'الإجمالي' : 'Total'}: ${data.totalCollected.toLocaleString()} MAD`,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      icon: <TrendingUp size={20} className="text-emerald-500" />,
    },
    {
      label: kpi('churnRate'),
      value: `${data.churnRate}%`,
      sub: isAr ? 'معدل الإلغاء والانتهاء' : 'Taux expirés + annulés',
      color: data.churnRate > 30 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
      bg: data.churnRate > 30 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/30',
      icon: <TrendingDown size={20} className={data.churnRate > 30 ? 'text-red-500' : 'text-gray-400'} />,
    },
    {
      label: kpi('conversionRate'),
      value: `${data.conversionRate}%`,
      sub: isAr ? 'التجربة → الفعّال' : 'Essai → Actif',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      icon: <TrendingUp size={20} className="text-amber-500" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{sa('title')}</h2>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <div key={i} className={`rounded-2xl p-4 ${card.bg} border border-transparent`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</span>
              {card.icon}
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-gray-400 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Growth + Revenue Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Growth */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{sa('growthChart')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.monthlySignups}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#growthGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{sa('revenueChart')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [`${v} MAD`, isAr ? 'الإيرادات' : 'Revenus']} />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Pie + Expiring */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{sa('statusChart')}</h3>
          {pieData.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">{isAr ? 'لا توجد بيانات' : 'Pas de données'}</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend formatter={(v) => {
                  const labels: Record<string, string> = isAr
                    ? { TRIAL: 'تجربة', ACTIVE: 'نشط', EXPIRED: 'منتهي', CANCELLED: 'ملغي' }
                    : { TRIAL: 'Essai', ACTIVE: 'Actif', EXPIRED: 'Expiré', CANCELLED: 'Annulé' };
                  return labels[v] || v;
                }} />
                <Tooltip formatter={(v, n) => [v, isAr ? { TRIAL: 'تجربة', ACTIVE: 'نشط', EXPIRED: 'منتهي', CANCELLED: 'ملغي' }[n as string] || n : n]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expiring Soon */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            {sa('expiringSoon')}
          </h3>
          {data.expiringSoon.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">{sa('noExpiring')}</div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {data.expiringSoon.map((org: any) => (
                <div key={org.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{org.name}</div>
                    <div className="text-xs text-gray-400">{org.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{org.daysLeft}j</div>
                    <div className="text-xs text-gray-400">{sa('daysLeft')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      {data.recentPayments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{sa('recentPayments')}</h3>
          <div className="space-y-2">
            {data.recentPayments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{p.organization?.name}</div>
                  <div className="text-xs text-gray-400">{formatDate(p.paidAt)} · {p.method}</div>
                </div>
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  +{p.amount.toLocaleString()} MAD
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
