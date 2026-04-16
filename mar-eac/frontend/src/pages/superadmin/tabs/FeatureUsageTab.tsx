import React, { useEffect, useState } from 'react';
import { Droplets, ShoppingBag, FolderKanban, Users, MessageSquare, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';

interface UsageData {
  moduleUsage: { module: string; count: number; label: string; labelAr: string }[];
  totals: { meetings: number; waterInstallations: number; productions: number; avgMeetingsPerOrg: number };
  topOrgs: {
    id: string; name: string; modules: string[];
    subscriptionStatus?: string;
    meetingCount: number; memberCount: number; waterCount: number; productionCount: number;
  }[];
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  WATER: <Droplets size={18} className="text-cyan-500" />,
  PRODUCTIVE: <ShoppingBag size={18} className="text-emerald-500" />,
  PROJECTS: <FolderKanban size={18} className="text-blue-500" />,
};

const MODULE_COLORS: Record<string, string> = {
  WATER: '#06b6d4',
  PRODUCTIVE: '#10b981',
  PROJECTS: '#3b82f6',
};

const STATUS_DOT: Record<string, string> = {
  TRIAL: 'bg-amber-400',
  ACTIVE: 'bg-emerald-400',
  EXPIRED: 'bg-red-400',
  CANCELLED: 'bg-gray-400',
};

export const FeatureUsageTab: React.FC = () => {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const us = (k: string) => t(`sa.usage.${k}`);

  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi.getFeatureUsage()
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 me-3" />
      {isAr ? 'جار التحميل...' : 'Chargement...'}
    </div>
  );
  if (!data) return null;

  const kpis = [
    { label: us('totalMeetings'), value: data.totals.meetings, icon: <MessageSquare size={20} className="text-indigo-500" />, bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: us('waterInstallations'), value: data.totals.waterInstallations, icon: <Droplets size={20} className="text-cyan-500" />, bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: us('productions'), value: data.totals.productions, icon: <ShoppingBag size={20} className="text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: us('avgMeetings'), value: data.totals.avgMeetingsPerOrg, icon: <BarChart3 size={20} className="text-purple-500" />, bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  const moduleChartData = data.moduleUsage.map(m => ({
    name: isAr ? m.labelAr : m.label,
    count: m.count,
    color: MODULE_COLORS[m.module] || '#6366f1',
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{us('title')}</h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={`rounded-2xl p-4 ${kpi.bg} border border-transparent`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{kpi.label}</span>
              {kpi.icon}
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{kpi.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Module Usage Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{us('moduleUsage')}</h3>
          {moduleChartData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">{isAr ? 'لا توجد بيانات' : 'Pas de données'}</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={moduleChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [v, isAr ? 'منظمات' : 'organisations']} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {moduleChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Module cards */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {data.moduleUsage.map(m => (
              <div key={m.module} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <div className="flex justify-center mb-1">{MODULE_ICONS[m.module]}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{m.count}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{isAr ? m.labelAr : m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Active Orgs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{us('topOrgs')}</h3>
          {data.topOrgs.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">{isAr ? 'لا توجد بيانات' : 'Pas de données'}</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {data.topOrgs.map((org, i) => (
                <div key={org.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{org.name}</span>
                      {org.subscriptionStatus && (
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[org.subscriptionStatus] || 'bg-gray-400'}`} />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {[
                        { icon: <Users size={10} />, val: org.memberCount, label: isAr ? 'أعضاء' : 'Membres' },
                        { icon: <MessageSquare size={10} />, val: org.meetingCount, label: isAr ? 'اجتماعات' : 'Réunions' },
                        ...(org.waterCount > 0 ? [{ icon: <Droplets size={10} />, val: org.waterCount, label: isAr ? 'ماء' : 'Eau' }] : []),
                        ...(org.productionCount > 0 ? [{ icon: <ShoppingBag size={10} />, val: org.productionCount, label: isAr ? 'إنتاج' : 'Prod.' }] : []),
                      ].map((stat, j) => (
                        <span key={j} className="flex items-center gap-0.5 text-xs text-gray-400">
                          {stat.icon} {stat.val}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
