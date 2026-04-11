import React, { useEffect, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet, Download, Pencil, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { financeApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency, formatDate, downloadBlob } from '../../lib/utils';

const CATEGORIES = ['اشتراكات/Cotisations', 'تبرعات/Dons', 'منح/Subventions', 'لوازم/Fournitures', 'نقل/Transport', 'أخرى/Autre'];

export const FinancePage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ type: 'INCOME', amount: '', category: '', description: '', date: '', reference: '' });

  const load = async () => {
    try {
      const [tx, sum, mon] = await Promise.all([
        financeApi.getAll(typeFilter ? { type: typeFilter } : {}),
        financeApi.getSummary(),
        financeApi.getMonthly(),
      ]);
      setTransactions(tx.data);
      setSummary(sum.data);
      setMonthly(mon.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); load(); }, [typeFilter]);

  const openAdd = () => {
    setEditTx(null);
    setForm({ type: 'INCOME', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0], reference: '' });
    setShowModal(true);
  };

  const openEdit = (tx: any) => {
    setEditTx(tx);
    setForm({ type: tx.type, amount: tx.amount.toString(), category: tx.category, description: tx.description || '', date: tx.date?.split('T')[0] || '', reference: tx.reference || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.amount || !form.category) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editTx) {
        await financeApi.update(editTx.id, form);
      } else {
        await financeApi.create(form);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await financeApi.delete(deleteId);
      setDeleteId(null);
      load();
    } finally { setDeleting(false); }
  };

  const handleExport = async () => {
    try {
      const res = await financeApi.exportPDF();
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), 'rapport_financier.pdf');
    } catch {}
  };

  const months = (t('common.months') as unknown as string[]);
  const chartData = monthly.map((m, i) => ({
    name: months?.[i]?.slice(0, 3) ?? `M${i + 1}`,
    [lang === 'ar' ? 'إيرادات' : 'Recettes']: m.income,
    [lang === 'ar' ? 'مصاريف' : 'Dépenses']: m.expenses,
  }));

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h2 className="page-title">{t('finance.title')}</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary"><Download size={16} />{t('finance.export')}</button>
          <button onClick={openAdd} className="btn-primary"><Plus size={16} />{t('finance.addTransaction')}</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard title={t('finance.totalIncome')} value={summary ? formatCurrency(summary.totalIncome, lang) : '-'} icon={<TrendingUp size={20} />} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" />
        <StatCard title={t('finance.totalExpenses')} value={summary ? formatCurrency(summary.totalExpenses, lang) : '-'} icon={<TrendingDown size={20} />} iconBg="bg-red-100 dark:bg-red-900/30" iconColor="text-red-600 dark:text-red-400" />
        <StatCard title={t('finance.balance')} value={summary ? formatCurrency(summary.balance, lang) : '-'} icon={<Wallet size={20} />} iconBg={summary?.balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'} iconColor={summary?.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} />
        <StatCard title={lang === 'ar' ? 'إجمالي العمليات' : 'Total opérations'} value={(summary?.incomeCount || 0) + (summary?.expenseCount || 0)} icon={<Wallet size={20} />} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
      </div>

      {/* Monthly chart */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('finance.monthly')}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v, lang)} />
            <Bar dataKey={lang === 'ar' ? 'إيرادات' : 'Recettes'} fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey={lang === 'ar' ? 'مصاريف' : 'Dépenses'} fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Transactions table */}
      <div className="card p-4">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {[['', t('finance.filterAll')], ['INCOME', t('finance.filterIncome')], ['EXPENSE', t('finance.filterExpense')]].map(([v, label]) => (
            <button key={v} onClick={() => setTypeFilter(v)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === v ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : transactions.length === 0 ? (
          <EmptyState icon={<Wallet size={28} />} title={t('finance.noTransactions')} action={<button onClick={openAdd} className="btn-primary"><Plus size={16} />{t('finance.addTransaction')}</button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr>
                <th>{t('finance.date')}</th>
                <th>{t('finance.category')}</th>
                <th>{t('finance.description')}</th>
                <th>{t('finance.amount')}</th>
                <th>{t('common.actions')}</th>
              </tr></thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDate(tx.date, lang)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {tx.type === 'INCOME' ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                        <span>{tx.category}</span>
                      </div>
                    </td>
                    <td className="max-w-[200px] truncate">{tx.description || '-'}</td>
                    <td className={`font-semibold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, lang)}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(tx)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteId(tx.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSaveError(null); }} title={editTx ? lang === 'ar' ? 'تعديل المعاملة' : 'Modifier' : t('finance.addTransaction')}
        footer={<><button onClick={() => { setShowModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
          {saveError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {saveError}
            </div>
          )}
          <div>
            <label className="label">{lang === 'ar' ? 'النوع' : 'Type'} *</label>
            <div className="flex gap-3">
              {['INCOME', 'EXPENSE'].map((tp) => (
                <label key={tp} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" value={tp} checked={form.type === tp} onChange={() => setForm({ ...form, type: tp })} />
                  <span className={`text-sm font-medium ${tp === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {tp === 'INCOME' ? t('finance.income') : t('finance.expense')}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('finance.amount')} *</label>
              <input className="input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('finance.category')} *</label>
              <input className="input" list="categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <datalist id="categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('finance.date')}</label>
              <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('finance.reference')}</label>
              <input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{t('finance.description')}</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={lang === 'ar' ? 'حذف المعاملة' : 'Supprimer'} message={t('common.confirmDelete')} loading={deleting} />
    </div>
  );
};
