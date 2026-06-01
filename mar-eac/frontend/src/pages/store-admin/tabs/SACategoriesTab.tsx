import React, { useEffect, useState } from 'react';
import { storeManagerApi } from '../../../lib/api';

interface CatStat { name: string; count: number }

export function SACategoriesTab() {
  const [cats, setCats] = useState<CatStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeManagerApi.getProducts({ limit: 500 }).then(r => {
      const map: Record<string, number> = {};
      for (const p of r.data.products) {
        if (p.category) map[p.category] = (map[p.category] || 0) + 1;
      }
      setCats(Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 dark:text-white mb-4">الفئات</h1>
      {loading ? (
        <div className="space-y-2">{Array.from({length: 5}).map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {cats.map(c => (
            <div key={c.name} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3">
              <span className="font-semibold text-gray-900 dark:text-white">{c.name}</span>
              <span className="text-sm text-gray-400">{c.count} منتج</span>
            </div>
          ))}
          {cats.length === 0 && <p className="text-center text-gray-400 py-8">لا توجد فئات</p>}
        </div>
      )}
    </div>
  );
}
