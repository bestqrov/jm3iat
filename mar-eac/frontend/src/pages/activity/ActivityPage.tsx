import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { activityApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface ActivityLog {
  id: string;
  userName?: string;
  userRole?: string;
  action: string;
  entity: string;
  description: string;
  createdAt: string;
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LOGIN:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  EXPORT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  OTHER:  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export const ActivityPage: React.FC = () => {
  const { lang } = useLanguage();
  const [logs, setLogs]     = useState<ActivityLog[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [pages, setPages]   = useState(1);
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await activityApi.getLogs({ page, limit: 30, entity: entity || undefined });
      setLogs(r.data.logs || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
    } catch {} finally { setLoading(false); }
  }, [page, entity]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? logs.filter(l => l.description.toLowerCase().includes(search.toLowerCase()) || l.userName?.toLowerCase().includes(search.toLowerCase()))
    : logs;

  const fmtDate = (d: string) => new Date(d).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const ENTITIES = ['member', 'meeting', 'transaction', 'document', 'request', 'recurring', 'export'];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
          <Activity size={18} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{lang === 'ar' ? 'سجل النشاطات' : 'Journal d\'activité'}</h2>
          <p className="text-xs text-gray-500">{lang === 'ar' ? `${total} نشاط مسجل` : `${total} activités enregistrées`}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input ps-8 text-sm py-1.5"
            placeholder={lang === 'ar' ? 'بحث...' : 'Rechercher...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input text-sm py-1.5 w-auto" value={entity} onChange={e => { setEntity(e.target.value); setPage(1); }}>
          <option value="">{lang === 'ar' ? 'كل الأنواع' : 'Tous les types'}</option>
          {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 uppercase">
                <th className="px-4 py-2.5 text-start">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="px-4 py-2.5 text-start">{lang === 'ar' ? 'المستخدم' : 'Utilisateur'}</th>
                <th className="px-4 py-2.5 text-start">{lang === 'ar' ? 'الإجراء' : 'Action'}</th>
                <th className="px-4 py-2.5 text-start">{lang === 'ar' ? 'الوصف' : 'Description'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">{lang === 'ar' ? 'جارٍ التحميل...' : 'Chargement...'}</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">{lang === 'ar' ? 'لا يوجد سجل' : 'Aucune activité'}</td></tr>
              )}
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900 dark:text-white text-xs">{log.userName || '—'}</div>
                    {log.userRole && <div className="text-[10px] text-gray-400">{log.userRole}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${ACTION_COLOR[log.action] || ACTION_COLOR.OTHER}`}>
                      {log.action}
                    </span>
                    <span className="ms-1.5 text-[10px] text-gray-400">{log.entity}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 max-w-xs truncate">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-500">{lang === 'ar' ? `صفحة ${page} من ${pages}` : `Page ${page} / ${pages}`}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
