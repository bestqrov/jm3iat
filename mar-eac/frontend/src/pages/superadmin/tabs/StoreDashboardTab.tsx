import React, { useEffect, useState } from 'react';
import { Package, Truck, DollarSign, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { OrgPerformanceLeaderboard } from '../../../components/superadmin/OrgPerformanceLeaderboard';

export function StoreDashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi.getStats('store').then(r => setStats(r.data)).finally(() => setLoading(false));
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
          🛒 {isAr ? 'لوحة المتجر — معرضنا' : 'Tableau de bord — Ma3ridona Store'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {isAr ? 'مبيعات المتجر، الطلبات، والمخزون في الوقت الفعلي' : 'Ventes, commandes et stock en temps réel'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isAr ? 'طلبات اليوم'      : 'Commandes auj.',    value: stats.todayOrders,                                          icon: <ShoppingCart size={20} />, bg: 'bg-purple-50 dark:bg-purple-900/20',  color: 'text-purple-600 dark:text-purple-400' },
          { label: isAr ? 'في الانتظار'      : 'En attente',        value: stats.pendingOrders,                                        icon: <Package size={20} />,      bg: 'bg-amber-50 dark:bg-amber-900/20',    color: 'text-amber-600 dark:text-amber-400' },
          { label: isAr ? 'رقم اليوم'        : "CA aujourd'hui",    value: `${(stats.todayRevenue || 0).toFixed(0)} MAD`,              icon: <DollarSign size={20} />,   bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600 dark:text-emerald-400' },
          { label: isAr ? 'طلبات الشهر'      : 'Commandes/mois',   value: stats.monthOrders,                                          icon: <TrendingUp size={20} />,   bg: 'bg-blue-50 dark:bg-blue-900/20',      color: 'text-blue-600 dark:text-blue-400' },
          { label: isAr ? 'إيرادات الشهر'    : 'Revenus du mois',   value: `${(stats.monthRevenue || 0).toFixed(0)} MAD`,              icon: <TrendingUp size={20} />,   bg: 'bg-indigo-50 dark:bg-indigo-900/20',  color: 'text-indigo-600 dark:text-indigo-400' },
          { label: isAr ? 'إجمالي الإيرادات': 'Revenus totaux',     value: `${(stats.totalRevenue || 0).toFixed(0)} MAD`,              icon: <DollarSign size={20} />,   bg: 'bg-teal-50 dark:bg-teal-900/20',      color: 'text-teal-600 dark:text-teal-400' },
          { label: isAr ? 'تم التسليم'       : 'Livrées',           value: stats.deliveredOrders,                                      icon: <Truck size={20} />,        bg: 'bg-green-50 dark:bg-green-900/20',    color: 'text-green-600 dark:text-green-400' },
          { label: isAr ? 'إجمالي المنتجات'  : 'Total produits',    value: stats.totalProducts,                                        icon: <Package size={20} />,      bg: 'bg-gray-50 dark:bg-gray-700/30',      color: 'text-gray-600 dark:text-gray-300' },
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

      {stats.pendingOrders > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                {isAr ? `${stats.pendingOrders} طلب في الانتظار` : `${stats.pendingOrders} commande(s) en attente`}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {isAr ? 'تحتاج إلى تأكيد وإرسال' : 'À confirmer et expédier'}
              </p>
            </div>
          </div>
          <button onClick={() => onNavigate('fulfillment')}
            className="flex-shrink-0 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors">
            {isAr ? 'معالجة' : 'Traiter'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: isAr ? 'الفولفيلمنت'   : 'Fulfillment',    tab: 'fulfillment',    icon: <Truck size={16} />,        color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40' },
          { label: isAr ? 'الباقات'       : 'Packs produits', tab: 'bundles',        icon: <Package size={16} />,      color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40' },
          { label: isAr ? 'إضافة منتج'   : 'Ajouter produit', tab: 'coop-orgs',     icon: <ShoppingCart size={16} />, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40' },
        ].map(action => (
          <button key={action.tab} onClick={() => onNavigate(action.tab)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${action.color}`}>
            {action.icon}{action.label}
          </button>
        ))}
      </div>

      <OrgPerformanceLeaderboard section="store" />
    </div>
  );
}
