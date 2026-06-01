import React, { useEffect, useState, useCallback } from 'react';
import { superadminApi } from '../../lib/api';

interface OrgPerf {
  id: string;
  name: string;
  nameAr?: string;
  cityAr?: string;
  phone?: string;
  monthRevenue: number;
  lastMonthRevenue: number;
  advice: 'top' | 'weak' | 'zero' | 'critical_drop' | 'ok';
  adviceLabel: string;
  rank: number;
}

interface LeaderboardData {
  orgs: OrgPerf[];
  total: number;
  needsAttention: OrgPerf[];
}

const ADVICE_STYLE: Record<string, string> = {
  top:           'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  ok:            'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  weak:          'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  zero:          'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  critical_drop: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
};

function rankEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return String(rank);
}

export function OrgPerformanceLeaderboard({ section }: { section: 'assoc' | 'coop' | 'store' }) {
  const [data, setData]       = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [query, setQuery]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await superadminApi.getOrgPerformance(section, page, query);
      setData(r.data);
    } finally {
      setLoading(false);
    }
  }, [section, page, query]);

  useEffect(() => { load(); }, [load]);

  const topRevenue = data?.orgs?.[0]?.monthRevenue || 1;

  const sectionLabel =
    section === 'store' ? 'أداء التعاونيات في المتجر' :
    section === 'coop'  ? 'أداء التعاونيات' :
    'أداء الجمعيات';

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
        📊 {sectionLabel}
      </h3>

      {/* Needs attention */}
      {(data?.needsAttention?.length ?? 0) > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-3">
            ⚠️ تحتاج تدخل ({data!.needsAttention.length})
          </p>
          <div className="space-y-2">
            {data!.needsAttention.map(org => (
              <div key={org.id}
                className="flex items-center justify-between gap-2 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border border-red-100 dark:border-red-800">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{org.nameAr || org.name}</p>
                  {org.cityAr && <p className="text-xs text-gray-400">{org.cityAr}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg font-semibold flex-shrink-0 ${ADVICE_STYLE[org.advice]}`}>
                  {org.adviceLabel}
                </span>
                {org.phone && (
                  <a href={`https://wa.me/${org.phone.replace(/\D/g, '')}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex-shrink-0">
                    تواصل
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setQuery(search); setPage(1); } }}
          placeholder="ابحث بالاسم أو المدينة..."
          className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-purple-400"
        />
        <button
          onClick={() => { setQuery(search); setPage(1); }}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
          بحث
        </button>
      </div>

      {/* Ranked list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data?.orgs.map(org => (
            <div key={org.id}
              className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-3 py-2.5 hover:border-purple-200 dark:hover:border-purple-700 transition-colors">
              <div className="w-8 text-center text-sm font-bold text-gray-500 flex-shrink-0">
                {rankEmoji(org.rank)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {org.nameAr || org.name}
                </p>
                {org.cityAr && <p className="text-xs text-gray-400">{org.cityAr}</p>}
              </div>
              <div className="w-20 hidden sm:block flex-shrink-0">
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${topRevenue > 0 ? Math.round((org.monthRevenue / topRevenue) * 100) : 0}%` }} />
                </div>
              </div>
              <div className="text-sm font-extrabold text-gray-900 dark:text-white min-w-[80px] text-right flex-shrink-0">
                {org.monthRevenue.toLocaleString()} <span className="text-xs font-normal text-gray-400">د.م</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg font-semibold flex-shrink-0 ${ADVICE_STYLE[org.advice]}`}>
                {org.adviceLabel}
              </span>
            </div>
          ))}

          {data?.orgs.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">لا توجد نتائج</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
          <span>{data.total} إجمالي</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              السابق
            </button>
            <span className="px-3 py-1.5 bg-purple-600 text-white rounded-lg font-bold">{page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 20 >= data.total}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
