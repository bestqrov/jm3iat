import React, { useEffect, useState } from 'react';
import { Building2, TrendingUp, Clock, AlertTriangle, DollarSign, Plus, RefreshCw, Users, Check } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';

const ASSOC_TYPES = [
  { key: 'REGULAR',          labelFr: 'Classique',        labelAr: 'جمعية عادية',       badge: 'bg-gray-100 text-gray-700' },
  { key: 'PROJECTS',         labelFr: 'Avec projets',     labelAr: 'مع مشاريع',         badge: 'bg-blue-100 text-blue-700' },
  { key: 'WATER',            labelFr: 'Gestion eau',      labelAr: 'جمعية الماء',       badge: 'bg-cyan-100 text-cyan-700' },
  { key: 'PRODUCTIVE',       labelFr: 'Productive',       labelAr: 'جمعية إنتاجية',     badge: 'bg-emerald-100 text-emerald-700' },
  { key: 'PRODUCTIVE_WATER', labelFr: 'Productive + Eau', labelAr: 'إنتاجية + ماء',     badge: 'bg-purple-100 text-purple-700' },
];

export function AssocDashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi.getStats('assoc').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {isAr ? '🏛️ لوحة الجمعيات' : '🏛️ Tableau de bord — Associations'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {isAr ? 'نظرة شاملة على جميع الجمعيات المنتسبة للمنصة' : 'Vue complète de toutes les associations de la plateforme'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isAr ? 'إجمالي الجمعيات' : 'Total associations', value: stats.totalOrgs,       icon: <Building2 size={20} />, bg: 'bg-indigo-50 dark:bg-indigo-900/20',  color: 'text-indigo-600 dark:text-indigo-400' },
          { label: isAr ? 'اشتراكات نشطة'  : 'Abonnements actifs', value: stats.activeOrgs,       icon: <Check size={20} />,     bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600 dark:text-emerald-400' },
          { label: isAr ? 'فترات تجربة'    : 'Essais en cours',    value: stats.trialOrgs,        icon: <Clock size={20} />,     bg: 'bg-amber-50 dark:bg-amber-900/20',    color: 'text-amber-600 dark:text-amber-400' },
          { label: isAr ? 'منتهية الصلاحية': 'Expirés',            value: stats.expiredOrgs,      icon: <AlertTriangle size={20} />, bg: 'bg-red-50 dark:bg-red-900/20',   color: 'text-red-500 dark:text-red-400' },
          { label: isAr ? 'MRR (تقديري)'   : 'MRR estimé',         value: `${(stats.mrrEstimate || 0).toLocaleString()} MAD`,       icon: <TrendingUp size={20} />, bg: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-600 dark:text-purple-400' },
          { label: isAr ? 'إيرادات الشهر'  : 'Revenus du mois',    value: `${(stats.monthlyRevenue || 0).toLocaleString()} MAD`,    icon: <DollarSign size={20} />, bg: 'bg-blue-50 dark:bg-blue-900/20',    color: 'text-blue-600 dark:text-blue-400' },
          { label: isAr ? 'جمعيات جديدة'   : 'Nouvelles ce mois',  value: stats.newOrgsThisMonth, icon: <Plus size={20} />,     bg: 'bg-teal-50 dark:bg-teal-900/20',    color: 'text-teal-600 dark:text-teal-400' },
          { label: isAr ? 'المستخدمون'     : 'Utilisateurs',        value: stats.totalUsers,       icon: <Users size={20} />,    bg: 'bg-gray-50 dark:bg-gray-700/30',    color: 'text-gray-600 dark:text-gray-300' },
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
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                {isAr ? cfg.labelAr : cfg.labelFr}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isAr ? 'الجمعيات'    : 'Organisations', tab: 'assoc-orgs',          icon: <Building2 size={16} />,  color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40' },
          { label: isAr ? 'الاشتراكات' : 'Abonnements',   tab: 'assoc-subscriptions', icon: <RefreshCw size={16} />,  color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40' },
          { label: isAr ? 'المدفوعات'  : 'Paiements',     tab: 'assoc-payments',       icon: <DollarSign size={16} />, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40' },
          { label: isAr ? 'المستخدمون' : 'Utilisateurs',  tab: 'users',                icon: <Users size={16} />,      color: 'text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/30 dark:hover:bg-gray-700/50' },
        ].map(action => (
          <button key={action.tab} onClick={() => onNavigate(action.tab)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${action.color}`}>
            {action.icon}{action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
