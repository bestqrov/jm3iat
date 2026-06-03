import React, { useEffect, useState } from 'react';
import { storeManagerApi } from '../../../lib/api';
import { Package, ShoppingCart, TrendingUp, Clock, CheckCircle, XCircle, Truck, BarChart2 } from 'lucide-react';

const STATUS_LABELS: Record<string, { ar: string; color: string; icon: React.ReactNode }> = {
  PENDING:    { ar: 'قيد الانتظار', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',  icon: <Clock size={14} /> },
  PROCESSING: { ar: 'قيد المعالجة', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',    icon: <ShoppingCart size={14} /> },
  SHIPPED:    { ar: 'تم الشحن',     color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20', icon: <Truck size={14} /> },
  DELIVERED:  { ar: 'تم التسليم',   color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', icon: <CheckCircle size={14} /> },
  CANCELLED:  { ar: 'ملغى',        color: 'text-red-600 bg-red-50 dark:bg-red-900/20',          icon: <XCircle size={14} /> },
};

export function SAReportsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeManagerApi.getStoreStats().then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({length:4}).map((_,i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />
      <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />
    </div>
  );

  if (!stats) return null;

  const kpis = [
    { label: 'طلبات اليوم',   value: stats.todayOrders,                              color: 'text-indigo-600',  bg: 'bg-indigo-50 dark:bg-indigo-900/20',   icon: <ShoppingCart size={18} /> },
    { label: 'في الانتظار',   value: stats.pendingOrders,                             color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20',     icon: <Clock size={18} /> },
    { label: 'رقم اليوم',     value: `${(stats.todayRevenue||0).toFixed(0)} د.م`,    color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: <TrendingUp size={18} /> },
    { label: 'إيرادات الشهر', value: `${(stats.monthRevenue||0).toFixed(0)} د.م`,   color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20',       icon: <BarChart2 size={18} /> },
  ];

  // Daily revenue chart
  const dailyRevenue: { date: string; revenue: number; orders: number }[] = stats.dailyRevenue || [];
  const maxRev = Math.max(...dailyRevenue.map(d => d.revenue), 1);

  // Status counts
  const statusCounts = stats.statusCounts || {};

  // Top products
  const topProducts: { name: string; qty: number; revenue: number }[] = stats.topProducts || [];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-gray-900 dark:text-white">التقارير والإحصاءات</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className={`rounded-2xl p-4 ${k.bg}`}>
            <div className={`${k.color} mb-2`}>{k.icon}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{k.label}</p>
            <p className={`text-2xl font-extrabold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* 7-day Revenue Chart */}
      {dailyRevenue.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <BarChart2 size={15} className="text-indigo-500" /> إيرادات آخر 7 أيام
          </h3>
          <div className="flex items-end gap-2 h-32">
            {dailyRevenue.map((d, i) => {
              const height = maxRev > 0 ? Math.max((d.revenue / maxRev) * 100, d.revenue > 0 ? 8 : 2) : 2;
              const dayName = new Date(d.date).toLocaleDateString('ar-MA', { weekday: 'short' });
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-400 font-mono">
                    {d.revenue > 0 ? `${d.revenue.toFixed(0)}` : ''}
                  </span>
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t-lg transition-all ${d.revenue > 0 ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                      style={{ height: `${height}%` }}
                      title={`${d.date}: ${d.revenue.toFixed(0)} د.م (${d.orders} طلب)`}
                    />
                  </div>
                  <span className="text-[9px] text-gray-400">{dayName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Orders by Status */}
      {Object.keys(statusCounts).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
            <ShoppingCart size={15} className="text-emerald-500" /> الطلبات حسب الحالة
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(statusCounts).map(([status, count]) => {
              const cfg = STATUS_LABELS[status];
              if (!cfg) return null;
              return (
                <div key={status} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${cfg.color}`}>
                  {cfg.icon}
                  <span className="text-xs font-medium flex-1">{cfg.ar}</span>
                  <span className="text-sm font-extrabold">{String(count)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
            <Package size={15} className="text-amber-500" /> أكثر المنتجات مبيعاً
          </h3>
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <span className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-xs font-extrabold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 font-medium truncate">{p.name}</span>
                <span className="text-xs text-gray-400">{p.qty} وحدة</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                  {p.revenue.toFixed(0)} د.م
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary totals */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'إجمالي الطلبات هذا الشهر', value: stats.monthOrders || 0 },
          { label: 'إجمالي الطلبات المسلمة',    value: stats.deliveredOrders || 0 },
          { label: 'إجمالي المنتجات النشطة',   value: stats.totalProducts || 0 },
        ].map((s, i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
            <p className="text-xl font-extrabold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
