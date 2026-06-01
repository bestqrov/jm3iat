import React, { useEffect, useState } from 'react';
import { storeManagerApi } from '../../../lib/api';

export function SAReportsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeManagerApi.getStoreStats().then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({length:4}).map((_,i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
    </div>
  );

  if (!stats) return null;

  const kpis = [
    { label: 'طلبات اليوم',   value: stats.todayOrders,                            color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'في الانتظار',   value: stats.pendingOrders,                           color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'رقم اليوم',     value: `${(stats.todayRevenue || 0).toFixed(0)} د.م`, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'إيرادات الشهر', value: `${(stats.monthRevenue || 0).toFixed(0)} د.م`, color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 dark:text-white mb-4">التقارير</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className={`rounded-2xl p-4 ${k.bg}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{k.label}</p>
            <p className={`text-2xl font-extrabold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
