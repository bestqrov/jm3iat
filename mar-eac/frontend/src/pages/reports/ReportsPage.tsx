import React, { useEffect, useState } from 'react';
import { Download, FileText, BarChart2, Users, Calendar, Briefcase, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { reportsApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, downloadBlob } from '../../lib/utils';

export const ReportsPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const { organization } = useAuth();
  const [literary, setLiterary] = useState<any>(null);
  const [financial, setFinancial] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([reportsApi.getLiterary(), reportsApi.getFinancial()]).then(([lit, fin]) => {
      if (lit.status === 'fulfilled') setLiterary(lit.value.data);
      if (fin.status === 'fulfilled') setFinancial(fin.value.data);
      setLoading(false);
    });
  }, []);

  const exportLiterary = async () => {
    try {
      const res = await reportsApi.exportLiterary();
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), 'rapport_litteraire.pdf');
    } catch {}
  };

  const exportFinancial = async () => {
    try {
      const res = await reportsApi.exportFinancial();
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), 'rapport_financier.pdf');
    } catch {}
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="page-title">{t('reports.title')}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Literary Report */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{t('reports.literary')}</h3>
                <p className="text-xs text-gray-500">{t('reports.literaryDesc')}</p>
              </div>
            </div>
            <button onClick={exportLiterary} className="btn-secondary text-xs py-1.5 px-3">
              <Download size={14} />{t('reports.exportPDF')}
            </button>
          </div>

          {literary && (
            <div className="space-y-3">
              <div className="text-center py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{organization?.name}</div>
                <div className="text-xs text-gray-500">{formatDate(literary.generatedAt, lang)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1"><Users size={16} className="text-blue-600" /></div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{literary.members?.total}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">{t('members.stats.total')}</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1"><Calendar size={16} className="text-purple-600" /></div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{literary.meetings?.total}</div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">{t('meetings.stats.total')}</div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1"><Calendar size={16} className="text-emerald-600" /></div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{literary.meetings?.completed}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">{t('meetings.stats.completed')}</div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1"><Briefcase size={16} className="text-amber-600" /></div>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{literary.projects?.total || 0}</div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">{t('projects.stats.total')}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Financial Report */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <BarChart2 size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{t('reports.financial')}</h3>
                <p className="text-xs text-gray-500">{t('reports.financialDesc')}</p>
              </div>
            </div>
            <button onClick={exportFinancial} className="btn-secondary text-xs py-1.5 px-3">
              <Download size={14} />{t('reports.exportPDF')}
            </button>
          </div>

          {financial ? (
            <div className="space-y-3">
              <div className="text-center py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{organization?.name}</div>
                <div className="text-xs text-gray-500">{formatDate(financial.generatedAt, lang)}</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-600" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">{t('finance.totalIncome')}</span>
                  </div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(financial.summary?.totalIncome || 0, lang)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={16} className="text-red-600" />
                    <span className="text-sm text-red-700 dark:text-red-400 font-medium">{t('finance.totalExpenses')}</span>
                  </div>
                  <span className="font-bold text-red-700 dark:text-red-400">{formatCurrency(financial.summary?.totalExpenses || 0, lang)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-t-2 border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-blue-600" />
                    <span className="text-sm text-blue-700 dark:text-blue-400 font-bold">{t('finance.balance')}</span>
                  </div>
                  <span className={`font-bold text-lg ${financial.summary?.balance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-600'}`}>
                    {formatCurrency(financial.summary?.balance || 0, lang)}
                  </span>
                </div>
              </div>

              {/* Recent transactions */}
              {financial.recentTransactions?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-2">{lang === 'ar' ? 'آخر العمليات' : 'Dernières opérations'}</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {financial.recentTransactions.slice(0, 5).map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">{tx.category}</span>
                        <span className={tx.type === 'INCOME' ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                          {tx.type === 'INCOME' ? '+' : '-'}{tx.amount.toFixed(2)} MAD
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">{t('subscription.featureLocked')}</div>
          )}
        </div>
      </div>
    </div>
  );
};
