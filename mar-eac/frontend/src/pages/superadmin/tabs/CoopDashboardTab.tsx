import React, { useEffect, useState } from 'react';
import { Building2, TrendingUp, Clock, DollarSign, GitMerge, Check, RefreshCw } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';

export function CoopDashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi.getStats('coop').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {isAr ? '🤝 لوحة التعاونيات' : '🤝 Tableau de bord — Coopératives'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {isAr ? 'إدارة شاملة للتعاونيات المنتسبة للمنصة' : 'Gestion complète des coopératives de la plateforme'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: isAr ? 'إجمالي التعاونيات'   : 'Total coopératives',          value: stats.totalCoops,          icon: <Building2 size={20} />,  bg: 'bg-teal-50 dark:bg-teal-900/20',    color: 'text-teal-600 dark:text-teal-400' },
          { label: isAr ? 'اشتراكات نشطة'       : 'Abonnements actifs',          value: stats.activeCoops,         icon: <Check size={20} />,      bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600 dark:text-emerald-400' },
          { label: isAr ? 'فترات تجربة'         : 'Essais en cours',             value: stats.trialCoops,          icon: <Clock size={20} />,      bg: 'bg-amber-50 dark:bg-amber-900/20',  color: 'text-amber-600 dark:text-amber-400' },
          { label: isAr ? 'طلبات التحويل'       : 'Demandes de conversion',       value: stats.conversionRequests,  icon: <GitMerge size={20} />,   bg: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-600 dark:text-purple-400' },
          { label: isAr ? 'إيرادات الشهر'       : 'Revenus du mois',             value: `${(stats.monthlyRevenue || 0).toLocaleString()} MAD`, icon: <DollarSign size={20} />, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400' },
          { label: isAr ? 'إجمالي الإيرادات'   : 'Revenus totaux',              value: `${(stats.totalRevenue || 0).toLocaleString()} MAD`,   icon: <TrendingUp size={20} />, bg: 'bg-indigo-50 dark:bg-indigo-900/20', color: 'text-indigo-600 dark:text-indigo-400' },
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

      {stats.conversionRequests > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-purple-800 dark:text-purple-200">
              {isAr ? `${stats.conversionRequests} طلب تحويل في الانتظار` : `${stats.conversionRequests} demande(s) de conversion en attente`}
            </p>
            <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">
              {isAr ? 'جمعيات تطلب التحويل إلى تعاونية' : 'Associations demandant à devenir coopératives'}
            </p>
          </div>
          <button onClick={() => onNavigate('coop-orgs')}
            className="flex-shrink-0 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
            {isAr ? 'مراجعة' : 'Traiter'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: isAr ? 'التعاونيات'  : 'Coopératives',  tab: 'coop-orgs',          icon: <Building2 size={16} />,  color: 'text-teal-600 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 dark:hover:bg-teal-900/40' },
          { label: isAr ? 'الاشتراكات' : 'Abonnements',   tab: 'coop-subscriptions', icon: <RefreshCw size={16} />,  color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40' },
          { label: isAr ? 'المدفوعات'  : 'Paiements',     tab: 'coop-payments',       icon: <DollarSign size={16} />, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40' },
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
