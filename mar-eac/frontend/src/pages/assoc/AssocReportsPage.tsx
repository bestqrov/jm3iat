import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  FileText, TrendingUp, TrendingDown, Download, Filter,
  Package, Factory, Users, CalendarDays, Trophy, Star,
  Wallet, BarChart3, RefreshCw, Lock, ChevronDown, ChevronUp,
} from 'lucide-react';
import { reportsApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { downloadBlob } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiteraryData {
  period: { from: string | null; to: string | null };
  products: { total: number; active: number; list: any[] };
  production: { batches: number; totalQuantity: number; totalCost: number; recent: any[] };
  sales: { total: number; totalRevenue: number; clientCount: number; recent: any[] };
  events: { total: number; exhibitions: number; catering: number; other: number; recent: any[] };
  generatedAt: string;
}

interface FinancialData {
  period: { from: string | null; to: string | null; year: number };
  assoc: {
    productionCost: number; salesRevenue: number; salesCount: number;
    eventRevenue: number; eventCost: number; assocProfit: number;
    totalIncome: number; totalCost: number;
  };
  general: { totalIncome: number; totalExpense: number; balance: number };
  monthly: { month: number; label: string; salesRevenue: number; productionCost: number; eventRevenue: number; eventCost: number; profit: number }[];
  categoryStats: any[];
  generatedAt: string;
}

interface AdvancedData {
  topProducts: { id: string; name: string; unit: string; price: number; totalRevenue: number; totalSold: number; salesCount: number }[];
  topClients: { id: string; name: string; phone?: string; totalSpent: number; purchaseCount: number }[];
  weeklyTrend: { week: string; revenue: number }[];
  prodEfficiency: { name: string; produced: number; cost: number; costPerUnit: number; salePrice: number; margin: number; revenue: number }[];
  eventPerformance: { name: string; type: string; date: string; revenue: number; cost: number; profit: number }[];
  generatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  sales: '#059669',
  cost: '#dc2626',
  events: '#6366f1',
  profit: '#0ea5e9',
  eventCost: '#f59e0b',
};

const CHART_COLORS = ['#059669', '#6366f1', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];

// ─── Helper Components ────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; bgColor: string;
}> = ({ label, value, sub, icon, color, bgColor }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-xl font-bold ${color}`}>{value}</div>
        <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">{label}</div>
        {sub && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  </div>
);

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; color?: string }> = ({ title, icon, color = 'text-gray-900 dark:text-white' }) => (
  <div className={`flex items-center gap-2 mb-3 ${color}`}>
    {icon}
    <h3 className="text-base font-bold">{title}</h3>
  </div>
);

const Collapsible: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-start hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        <span className="font-semibold text-gray-900 dark:text-white text-sm">{title}</span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip: React.FC<any> = ({ active, payload, label, locale }) => {
  if (!active || !payload?.length) return null;
  const fmt = (n: number) => n.toLocaleString(locale || 'fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs">
      <div className="font-semibold text-gray-900 dark:text-white mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600 dark:text-gray-400">{p.name}:</span>
          <span className="font-medium text-gray-900 dark:text-white">{fmt(p.value)} DH</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'literary' | 'financial' | 'advanced';

const AssocReportsPage: React.FC = () => {
  const { organization } = useAuth();
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const locale = isAr ? 'ar-MA' : 'fr-MA';
  const sub = organization?.subscription;
  const isPremium = sub?.plan === 'PREMIUM' && (sub?.status === 'ACTIVE' || sub?.status === 'TRIAL');

  const fmt = (n: number) => n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (n: number) => n.toLocaleString(locale);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(locale);

  const [tab, setTab] = useState<Tab>('literary');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [literary, setLiterary] = useState<LiteraryData | null>(null);
  const [financial, setFinancial] = useState<FinancialData | null>(null);
  const [advanced, setAdvanced] = useState<AdvancedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const params = { ...(from ? { from } : {}), ...(to ? { to } : {}) };

  const loadLiterary = useCallback(async () => {
    try { setLiterary((await reportsApi.getAssocLiterary(params)).data); } catch {}
  }, [from, to]);

  const loadFinancial = useCallback(async () => {
    try { setFinancial((await reportsApi.getAssocFinancial(params)).data); } catch {}
  }, [from, to]);

  const loadAdvanced = useCallback(async () => {
    if (!isPremium) return;
    try { setAdvanced((await reportsApi.getAssocAdvanced(params)).data); } catch {}
  }, [from, to, isPremium]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([loadLiterary(), loadFinancial(), loadAdvanced()]);
    setLoading(false);
  }, [loadLiterary, loadFinancial, loadAdvanced]);

  useEffect(() => { loadAll(); }, []);

  const applyFilter = () => loadAll();

  const exportPDF = async (type: 'literary' | 'financial') => {
    setExporting(true);
    try {
      const res = type === 'literary'
        ? await reportsApi.exportAssocLiterary(params)
        : await reportsApi.exportAssocFinancial(params);
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }),
        `rapport_association_${type}.pdf`);
    } catch {}
    setExporting(false);
  };

  const TABS = [
    { id: 'literary' as Tab, label: t('assoc.reports.tabs.literary'), icon: <FileText size={15} /> },
    { id: 'financial' as Tab, label: t('assoc.reports.tabs.financial'), icon: <Wallet size={15} /> },
    { id: 'advanced' as Tab, label: t('assoc.reports.tabs.advanced'), icon: <BarChart3 size={15} />, premium: true },
  ];

  return (
    <div className="space-y-5" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('assoc.reports.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('assoc.reports.subtitle')}</p>
        </div>
        <button onClick={loadAll} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {t('assoc.reports.refresh')}
        </button>
      </div>

      {/* Date filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Filter size={14} /> {t('assoc.reports.filterPeriod')}
          </div>
          <div className="flex items-center gap-2 flex-wrap" dir="ltr">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input text-sm py-1.5" />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input text-sm py-1.5" />
          </div>
          <button onClick={applyFilter} disabled={loading}
            className="px-4 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {t('assoc.reports.applyFilter')}
          </button>
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo(''); }} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline">
              {t('assoc.reports.reset')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {TABS.map(tabItem => (
          <button key={tabItem.id} onClick={() => setTab(tabItem.id)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${tab === tabItem.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            {tabItem.icon}{tabItem.label}
            {tabItem.premium && !isPremium && <Lock size={11} className="text-amber-500 absolute top-1 end-1" />}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Literary Tab ──────────────────────────────────────────────────── */}
      {!loading && tab === 'literary' && literary && (
        <div className="space-y-5">
          {/* Export button */}
          <div className="flex justify-end">
            <button onClick={() => exportPDF('literary')} disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Download size={14} /> {exporting ? t('assoc.reports.generating') : t('assoc.reports.exportPDF')}
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={t('assoc.reports.literary.productsCreated')}
              value={fmtInt(literary.products.total)}
              sub={`${literary.products.active} ${t('assoc.reports.literary.activeLabel')}`}
              icon={<Package size={18} className="text-white" />}
              color="text-blue-700 dark:text-blue-400" bgColor="bg-blue-500" />
            <StatCard
              label={t('assoc.reports.literary.productionBatches')}
              value={fmtInt(literary.production.batches)}
              sub={`${fmt(literary.production.totalQuantity)} ${t('assoc.stock.title')}`}
              icon={<Factory size={18} className="text-white" />}
              color="text-orange-700 dark:text-orange-400" bgColor="bg-orange-500" />
            <StatCard
              label={t('assoc.reports.literary.salesDone')}
              value={fmtInt(literary.sales.total)}
              sub={`${fmtInt(literary.sales.clientCount)} ${t('assoc.reports.literary.clientsLabel')}`}
              icon={<TrendingUp size={18} className="text-white" />}
              color="text-emerald-700 dark:text-emerald-400" bgColor="bg-emerald-500" />
            <StatCard
              label={t('assoc.reports.literary.participations')}
              value={fmtInt(literary.events.total)}
              sub={`${literary.events.exhibitions} ${t('assoc.reports.literary.expositions')} · ${literary.events.catering} ${t('assoc.reports.literary.catering')}`}
              icon={<CalendarDays size={18} className="text-white" />}
              color="text-purple-700 dark:text-purple-400" bgColor="bg-purple-500" />
          </div>

          {/* Achievements */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-5">
            <SectionHeader
              title={t('assoc.reports.literary.achievements')}
              icon={<Trophy size={18} className="text-emerald-600" />}
              color="text-emerald-800 dark:text-emerald-300" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{fmt(literary.sales.totalRevenue)} DH</div>
                <div className="text-sm text-emerald-600 dark:text-emerald-500">{t('assoc.reports.literary.totalRevenue')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{fmtInt(literary.products.total)}</div>
                <div className="text-sm text-blue-600 dark:text-blue-500">{t('assoc.reports.literary.productsOnMarket')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{fmtInt(literary.events.exhibitions)}</div>
                <div className="text-sm text-purple-600 dark:text-purple-500">{t('assoc.reports.literary.exhibitions')}</div>
              </div>
            </div>
          </div>

          {/* Products table (detailed) */}
          <Collapsible title={`${t('assoc.reports.literary.productDetail')} (${literary.products.list.length})`} defaultOpen={true}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-start py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.literary.colProduct')}</th>
                    <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.literary.colProduced')}</th>
                    <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.literary.colSold')}</th>
                    <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.literary.colStock')}</th>
                    <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.literary.colRevenue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {literary.products.list.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                      <td className="py-2 font-medium text-gray-900 dark:text-white">{isAr && p.nameAr ? p.nameAr : p.name}</td>
                      <td className="py-2 text-end text-gray-600 dark:text-gray-400">{fmt(p.produced)} {p.unit}</td>
                      <td className="py-2 text-end text-gray-600 dark:text-gray-400">{fmt(p.sold)} {p.unit}</td>
                      <td className={`py-2 text-end font-medium ${p.stock <= 0 ? 'text-red-600' : p.stock <= p.lowStockAlert ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {fmt(p.stock)} {p.unit}
                      </td>
                      <td className="py-2 text-end text-emerald-600 dark:text-emerald-400 font-medium">{fmt(p.revenue)} DH</td>
                    </tr>
                  ))}
                  {literary.products.list.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-gray-400">{t('assoc.reports.literary.noProducts')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Collapsible>

          {/* Events breakdown */}
          <Collapsible title={`${t('assoc.reports.literary.eventSection')} (${literary.events.total})`}>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: t('assoc.reports.literary.expositions'), count: literary.events.exhibitions, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
                { label: t('assoc.reports.literary.catering'), count: literary.events.catering, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
                { label: t('assoc.reports.literary.others'), count: literary.events.other, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
              ].map(e => (
                <div key={e.label} className={`rounded-lg p-3 text-center ${e.color}`}>
                  <div className="text-2xl font-bold">{e.count}</div>
                  <div className="text-xs font-medium">{e.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {literary.events.recent.map((ev: any) => (
                <div key={ev.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 dark:border-gray-700/50">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{ev.name}</span>
                    <span className="ms-2 text-xs text-gray-500">{fmtDate(ev.date)}</span>
                  </div>
                  <div className="text-end">
                    <span className="text-emerald-600">{fmt(ev.revenue)} DH</span>
                  </div>
                </div>
              ))}
            </div>
          </Collapsible>
        </div>
      )}

      {/* ── Financial Tab ─────────────────────────────────────────────────── */}
      {!loading && tab === 'financial' && financial && (
        <div className="space-y-5">
          {/* Export */}
          <div className="flex justify-end">
            <button onClick={() => exportPDF('financial')} disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Download size={14} /> {exporting ? t('assoc.reports.generating') : t('assoc.reports.exportPDF')}
            </button>
          </div>

          {/* P&L summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={t('assoc.reports.financial.salesLabel')}
              value={`${fmt(financial.assoc.salesRevenue)} DH`}
              sub={`${fmtInt(financial.assoc.salesCount)} ${t('assoc.tabs.sales')}`}
              icon={<TrendingUp size={18} className="text-white" />}
              color="text-emerald-700 dark:text-emerald-400" bgColor="bg-emerald-500" />
            <StatCard
              label={t('assoc.reports.financial.eventsLabel')}
              value={`${fmt(financial.assoc.eventRevenue)} DH`}
              icon={<CalendarDays size={18} className="text-white" />}
              color="text-indigo-700 dark:text-indigo-400" bgColor="bg-indigo-500" />
            <StatCard
              label={t('assoc.stats.productionCost')}
              value={`${fmt(financial.assoc.productionCost)} DH`}
              icon={<Factory size={18} className="text-white" />}
              color="text-orange-700 dark:text-orange-400" bgColor="bg-orange-500" />
            <StatCard
              label={t('assoc.stats.netProfit')}
              value={`${fmt(financial.assoc.assocProfit)} DH`}
              icon={financial.assoc.assocProfit >= 0 ? <TrendingUp size={18} className="text-white" /> : <TrendingDown size={18} className="text-white" />}
              color={financial.assoc.assocProfit >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-red-700 dark:text-red-400'}
              bgColor={financial.assoc.assocProfit >= 0 ? 'bg-teal-500' : 'bg-red-500'} />
          </div>

          {/* P&L detail block */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <SectionHeader title={t('assoc.reports.financial.plTitle')} icon={<Wallet size={18} className="text-blue-600" />} />
            <div className="space-y-2">
              {/* Income lines */}
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mt-2 mb-1">
                {t('assoc.reports.financial.incomeSection')}
              </div>
              <PLRow label={t('assoc.reports.financial.salesRevenueLine')} value={financial.assoc.salesRevenue} type="income" />
              <PLRow label={t('assoc.reports.financial.eventRevenueLine')} value={financial.assoc.eventRevenue} type="income" />
              <PLRow label={t('assoc.reports.financial.totalIncomeLine')} value={financial.assoc.totalIncome} type="income" bold />
              {/* Cost lines */}
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mt-3 mb-1">
                {t('assoc.reports.financial.expensesSection')}
              </div>
              <PLRow label={t('assoc.reports.financial.productionCostLine')} value={financial.assoc.productionCost} type="expense" />
              <PLRow label={t('assoc.reports.financial.eventCostLine')} value={financial.assoc.eventCost} type="expense" />
              <PLRow label={t('assoc.reports.financial.totalExpensesLine')} value={financial.assoc.totalCost} type="expense" bold />
              {/* Result */}
              <div className="border-t-2 border-gray-200 dark:border-gray-600 pt-2 mt-2">
                <PLRow
                  label={t('assoc.reports.financial.resultLine')}
                  value={financial.assoc.assocProfit}
                  type={financial.assoc.assocProfit >= 0 ? 'income' : 'expense'}
                  bold size="lg"
                />
              </div>
            </div>
          </div>

          {/* Monthly Revenue Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <SectionHeader
              title={`${t('assoc.reports.financial.monthlyChart')} ${financial.period.year}`}
              icon={<BarChart3 size={18} className="text-blue-600" />} />
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={financial.monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip locale={locale} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="salesRevenue" name={t('assoc.reports.financial.legendSales')} stroke={COLORS.sales} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="eventRevenue" name={t('assoc.reports.financial.legendEvents')} stroke={COLORS.events} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="productionCost" name={t('assoc.reports.financial.legendProdCost')} stroke={COLORS.cost} strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="profit" name={t('assoc.reports.financial.legendProfit')} stroke={COLORS.profit} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly stacked bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <SectionHeader title={t('assoc.reports.financial.barChart')} icon={<BarChart3 size={18} className="text-emerald-600" />} />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={financial.monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip locale={locale} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="salesRevenue" name={t('assoc.reports.financial.legendSales')} fill={COLORS.sales} stackId="income" radius={[0, 0, 0, 0]} />
                <Bar dataKey="eventRevenue" name={t('assoc.reports.financial.legendEvents')} fill={COLORS.events} stackId="income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="productionCost" name={t('assoc.reports.financial.legendProdCost')} fill={COLORS.cost} stackId="cost" radius={[0, 0, 0, 0]} />
                <Bar dataKey="eventCost" name={t('assoc.reports.financial.legendCost')} fill={COLORS.eventCost} stackId="cost" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue breakdown pie */}
          {(financial.assoc.salesRevenue > 0 || financial.assoc.eventRevenue > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <SectionHeader title={t('assoc.reports.financial.pieTitle')} icon={<TrendingUp size={18} className="text-emerald-600" />} />
              <div className="flex items-center gap-6 flex-wrap">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: t('assoc.reports.financial.salesLabel'), value: financial.assoc.salesRevenue },
                        { name: t('assoc.reports.financial.eventsLabel'), value: financial.assoc.eventRevenue },
                      ]}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      dataKey="value" paddingAngle={3}
                    >
                      <Cell fill={COLORS.sales} />
                      <Cell fill={COLORS.events} />
                    </Pie>
                    <Tooltip formatter={(v: number) => `${fmt(v)} DH`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex-1">
                  {[
                    { label: t('assoc.reports.financial.salesLabel'), value: financial.assoc.salesRevenue, color: COLORS.sales },
                    { label: t('assoc.reports.financial.eventsLabel'), value: financial.assoc.eventRevenue, color: COLORS.events },
                  ].map(item => {
                    const total = financial.assoc.totalIncome;
                    const pct = total > 0 ? (item.value / total * 100).toFixed(1) : '0.0';
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                          <span className="font-medium text-gray-900 dark:text-white">{fmt(item.value)} DH ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Advanced Tab ──────────────────────────────────────────────────── */}
      {!loading && tab === 'advanced' && (
        isPremium ? (
          advanced ? (
            <div className="space-y-5">
              {/* Top Products */}
              {advanced.topProducts.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <SectionHeader title={t('assoc.reports.advanced.topProductsTitle')} icon={<Trophy size={18} className="text-amber-500" />} />
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={advanced.topProducts.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip content={<CustomTooltip locale={locale} />} />
                      <Bar dataKey="totalRevenue" name={t('assoc.reports.advanced.legendRevenue')} radius={[0, 4, 4, 0]}>
                        {advanced.topProducts.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Top products table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-start py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colRank')}</th>
                          <th className="text-start py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colProduct')}</th>
                          <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colSold')}</th>
                          <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colRevenue')}</th>
                          <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colSalesCount')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {advanced.topProducts.map((p, i) => (
                          <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                            <td className="py-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white inline-flex ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-700' : 'bg-gray-300'}`}>{i + 1}</span>
                            </td>
                            <td className="py-2 font-medium text-gray-900 dark:text-white">{p.name}</td>
                            <td className="py-2 text-end text-gray-600 dark:text-gray-400">{fmt(p.totalSold)} {p.unit}</td>
                            <td className="py-2 text-end text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(p.totalRevenue)} DH</td>
                            <td className="py-2 text-end text-gray-600 dark:text-gray-400">{p.salesCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Best Clients */}
              {advanced.topClients.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <SectionHeader title={t('assoc.reports.advanced.bestClientsTitle')} icon={<Star size={18} className="text-purple-500" />} />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-start py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colRank')}</th>
                          <th className="text-start py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colClient')}</th>
                          <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colPurchases')}</th>
                          <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colTotalSpent')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {advanced.topClients.map((c, i) => (
                          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                            <td className="py-2.5">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white inline-flex ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-700' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}>{i + 1}</span>
                            </td>
                            <td className="py-2.5">
                              <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                              {c.phone && <div className="text-xs text-gray-500" dir="ltr">{c.phone}</div>}
                            </td>
                            <td className="py-2.5 text-end text-gray-600 dark:text-gray-400">{c.purchaseCount}</td>
                            <td className="py-2.5 text-end font-bold text-purple-600 dark:text-purple-400">{fmt(c.totalSpent)} DH</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Production Efficiency */}
              {advanced.prodEfficiency.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <SectionHeader title={t('assoc.reports.advanced.efficiencyTitle')} icon={<Factory size={18} className="text-orange-500" />} />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-start py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colProduct')}</th>
                          <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colProduced')}</th>
                          <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colCostUnit')}</th>
                          <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colSalePrice')}</th>
                          <th className="text-end py-2 text-gray-500 dark:text-gray-400 font-medium">{t('assoc.reports.advanced.colMargin')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {advanced.prodEfficiency.map((p, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                            <td className="py-2 font-medium text-gray-900 dark:text-white">{p.name}</td>
                            <td className="py-2 text-end text-gray-600 dark:text-gray-400">{fmt(p.produced)}</td>
                            <td className="py-2 text-end text-orange-600">{fmt(p.costPerUnit)} DH</td>
                            <td className="py-2 text-end text-emerald-600">{fmt(p.salePrice)} DH</td>
                            <td className="py-2 text-end">
                              <span className={`font-semibold ${p.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {p.margin.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Event Performance */}
              {advanced.eventPerformance.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <SectionHeader title={t('assoc.reports.advanced.eventPerfTitle')} icon={<CalendarDays size={18} className="text-indigo-500" />} />
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={advanced.eventPerformance.slice(0, 8)} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip locale={locale} />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="revenue" name={t('assoc.reports.advanced.legendRevenue')} fill={COLORS.sales} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cost" name={t('assoc.reports.advanced.legendCost')} fill={COLORS.cost} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name={t('assoc.reports.advanced.legendProfit')} fill={COLORS.profit} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Sales Trend */}
              {advanced.weeklyTrend.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <SectionHeader title={t('assoc.reports.advanced.trendTitle')} icon={<TrendingUp size={18} className="text-emerald-500" />} />
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={advanced.weeklyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip locale={locale} />} />
                      <Line type="monotone" dataKey="revenue" name={t('assoc.reports.advanced.legendSales')} stroke={COLORS.sales} strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {advanced.topProducts.length === 0 && advanced.topClients.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {t('assoc.reports.advanced.noData')}
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )
        ) : (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-10 text-center">
            <Lock size={40} className="text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300 mb-2">{t('assoc.reports.advanced.premiumTitle')}</h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 max-w-sm mx-auto">
              {t('assoc.reports.advanced.premiumMessage')}
            </p>
          </div>
        )
      )}
    </div>
  );
};

// ─── P&L Row helper ───────────────────────────────────────────────────────────

const PLRow: React.FC<{
  label: string; value: number; type: 'income' | 'expense';
  bold?: boolean; size?: 'sm' | 'lg';
}> = ({ label, value, type, bold, size = 'sm' }) => (
  <div className={`flex items-center justify-between py-1.5 ${bold ? 'border-t border-gray-100 dark:border-gray-700 pt-2' : ''}`}>
    <span className={`text-gray-600 dark:text-gray-400 ${size === 'lg' ? 'text-sm font-medium' : 'text-sm'}`}>{label}</span>
    <span className={`font-${bold ? 'bold' : 'semibold'} ${size === 'lg' ? 'text-lg' : 'text-sm'} ${type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {type === 'income' ? '+' : '-'}{value.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
    </span>
  </div>
);

export default AssocReportsPage;
