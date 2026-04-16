import React, { useEffect, useState } from 'react';
import { RefreshCw, ArrowUp, ArrowDown, Clock, Ban, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Modal } from '../../../components/ui/Modal';
import { formatDate } from '../../../lib/utils';

interface Subscription {
  id: string;
  plan: string;
  status: string;
  startsAt: string;
  expiresAt?: string;
  organization: {
    id: string;
    name: string;
    email: string;
    modules: string[];
    phone?: string;
  };
}

const STATUS_STYLES: Record<string, string> = {
  TRIAL:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ACTIVE:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  EXPIRED:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const getAssocType = (modules: string[]) => {
  if (modules.includes('PRODUCTIVE') && modules.includes('WATER')) return 'PRODUCTIVE_WATER';
  if (modules.includes('PRODUCTIVE')) return 'PRODUCTIVE';
  if (modules.includes('WATER')) return 'WATER';
  if (modules.includes('PROJECTS')) return 'PROJECTS';
  return 'REGULAR';
};

export const SubscriptionsTab: React.FC = () => {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const sa = (k: string) => t(`sa.subs.${k}`);
  const sh = (k: string) => t(`sa.shared.${k}`);

  const [subs, setSubs] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [managing, setManaging] = useState<Subscription | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const limit = 15;
  const pages = Math.ceil(total / limit);

  const load = async () => {
    setLoading(true);
    try {
      const res = await superadminApi.getSubscriptions({ status: statusFilter || undefined, page, limit });
      setSubs(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, page]);

  const statusLabels: Record<string, { fr: string; ar: string }> = {
    '': { fr: 'Tous', ar: 'الكل' },
    TRIAL: { fr: 'Essai', ar: 'تجربة' },
    ACTIVE: { fr: 'Actif', ar: 'نشط' },
    EXPIRED: { fr: 'Expiré', ar: 'منتهي' },
    CANCELLED: { fr: 'Annulé', ar: 'ملغي' },
  };

  const doAction = async (action: string) => {
    if (!managing) return;
    setActionLoading(true);
    try {
      let data: any = {};
      if (action === 'EXTEND_TRIAL') data = { action: 'EXTEND_TRIAL', status: 'TRIAL' };
      else if (action === 'ACTIVATE') data = { status: 'ACTIVE' };
      else if (action === 'SUSPEND') data = { status: 'CANCELLED' };
      else if (action === 'EXPIRE') data = { status: 'EXPIRED' };

      await superadminApi.updateSubscription(managing.organization.id, data);
      setManaging(null);
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const btn = (label: string, action: string, color: string, icon: React.ReactNode) => (
    <button
      onClick={() => doAction(action)}
      disabled={actionLoading}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${color}`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Header + Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{sa('title')}</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(statusLabels).map(([val, labels]) => (
            <button
              key={val}
              onClick={() => { setStatusFilter(val); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === val
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {isAr ? labels.ar : labels.fr}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {[
                  isAr ? 'المنظمة' : 'Organisation',
                  isAr ? 'النوع' : 'Type',
                  isAr ? 'الحالة' : 'Statut',
                  isAr ? 'الخطة' : 'Plan',
                  isAr ? 'تنتهي في' : 'Expire le',
                  isAr ? 'الإجراءات' : 'Actions',
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">{sh('loading')}</td></tr>
              ) : subs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">{sh('noData')}</td></tr>
              ) : subs.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{sub.organization.name}</div>
                    <div className="text-xs text-gray-400">{sub.organization.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {getAssocType(sub.organization.modules)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[sub.status] || STATUS_STYLES.EXPIRED}`}>
                      {isAr
                        ? { TRIAL: 'تجريبي', ACTIVE: 'نشط', EXPIRED: 'منتهي', CANCELLED: 'ملغي' }[sub.status]
                        : { TRIAL: 'Essai', ACTIVE: 'Actif', EXPIRED: 'Expiré', CANCELLED: 'Annulé' }[sub.status]
                      }
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{sub.plan}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {sub.expiresAt ? formatDate(sub.expiresAt) : <span className="text-gray-300">{sh('never')}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setManaging(sub)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      <RefreshCw size={11} /> {isAr ? 'إدارة' : 'Gérer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500">
              {sh('page')} {page} {sh('of')} {pages} — {total} {isAr ? 'إجمالي' : 'total'}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manage Modal */}
      {managing && (
        <Modal isOpen={!!managing} onClose={() => setManaging(null)} title={isAr ? 'إدارة الاشتراك' : 'Gérer l\'abonnement'}>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
              <div className="font-semibold text-gray-900 dark:text-white">{managing.organization.name}</div>
              <div className="text-sm text-gray-500">{managing.organization.email}</div>
              <div className="mt-2 flex gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[managing.status]}`}>
                  {managing.status}
                </span>
                <span className="text-xs text-gray-400">Plan: {managing.plan}</span>
              </div>
              {managing.expiresAt && (
                <div className="text-xs text-gray-400 mt-1">
                  {isAr ? 'تنتهي' : 'Expire'}: {formatDate(managing.expiresAt)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {btn(
                isAr ? sa('extendTrial') : sa('extendTrial'),
                'EXTEND_TRIAL',
                'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40',
                <Clock size={14} />
              )}
              {btn(
                isAr ? 'تفعيل' : 'Activer',
                'ACTIVATE',
                'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
                <CheckCircle size={14} />
              )}
              {btn(
                isAr ? 'تعليق' : 'Suspendre',
                'SUSPEND',
                'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40',
                <Ban size={14} />
              )}
              {btn(
                isAr ? 'ترقية' : 'Upgrader',
                'ACTIVATE',
                'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40',
                <ArrowUp size={14} />
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
