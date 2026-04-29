import React, { useEffect, useRef, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet, Download, Pencil, Trash2, Paperclip, ExternalLink, FileSpreadsheet, FileText, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { financeApi, exportApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Toast } from '../../components/ui/Toast';
import { formatCurrency, formatDate, downloadBlob } from '../../lib/utils';

const CATEGORIES = {
  INCOME: {
    fr: ['Subventions', 'Cotisations', 'Dons', 'Autres'],
    ar: ['منح', 'اشتراكات', 'تبرعات', 'أخرى'],
  },
  EXPENSE: {
    fr: ['Fournitures de bureau', 'Factures', 'Transport', 'Salaires', 'Loyer', 'Communication', 'Formation', 'Autres'],
    ar: ['لوازم مكتبية', 'فواتير', 'نقل', 'رواتب', 'إيجار', 'تواصل', 'تكوين', 'أخرى'],
  },
};

const PAYMENT_METHODS = {
  fr: [
    { value: 'especes',  label: 'Espèces' },
    { value: 'virement', label: 'Virement bancaire' },
    { value: 'cheque',   label: 'Chèque' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'poste',    label: 'Poste Maroc' },
    { value: 'autre',    label: 'Autre' },
  ],
  ar: [
    { value: 'especes',  label: 'نقداً' },
    { value: 'virement', label: 'تحويل بنكي' },
    { value: 'cheque',   label: 'شيك' },
    { value: 'transfer', label: 'إرسالية' },
    { value: 'poste',    label: 'بريد المغرب' },
    { value: 'autre',    label: 'أخرى' },
  ],
};

const BANKS = ['Chaabi', 'Attijariwafa', 'CIH', 'BMCE', 'Poste Maroc', 'Autre'];
const TRANSFER_SERVICES = ['CashPlus', 'Wafacash', 'Lana Cash', 'Autre'];

function buildReference(paymentMethod: string, bankName: string): string {
  if (paymentMethod === 'virement') return bankName ? `Virement - ${bankName}` : 'Virement bancaire';
  if (paymentMethod === 'cheque')   return bankName ? `Chèque - ${bankName}` : 'Chèque';
  if (paymentMethod === 'transfer') return bankName ? `Transfer - ${bankName}` : 'Transfer';
  if (paymentMethod === 'poste')    return 'Poste Maroc';
  if (paymentMethod === 'especes')  return 'Espèces';
  return 'Autre';
}

function parsePaymentMethod(ref: string): { paymentMethod: string; bankName: string } {
  if (!ref) return { paymentMethod: 'especes', bankName: '' };
  const r = ref.toLowerCase();
  const bankMatch = BANKS.find((b) => r.includes(b.toLowerCase()));
  const transferMatch = TRANSFER_SERVICES.find((s) => r.includes(s.toLowerCase()));
  if (r.includes('virement') || r.includes('تحويل بنكي')) return { paymentMethod: 'virement', bankName: bankMatch || '' };
  if (r.includes('cheque') || r.includes('chèque') || r.includes('شيك')) return { paymentMethod: 'cheque', bankName: bankMatch || '' };
  if (r.includes('transfer') || r.includes('إرسالية') || r.includes('ارسالية')) return { paymentMethod: 'transfer', bankName: transferMatch || '' };
  if (r.includes('poste maroc') || r.includes('بريد')) return { paymentMethod: 'poste', bankName: '' };
  if (r.includes('espece') || r.includes('caisse') || r.includes('نقد')) return { paymentMethod: 'especes', bankName: '' };
  return { paymentMethod: 'autre', bankName: '' };
}

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ type: 'INCOME', amount: '', category: '', description: '', date: '', paymentMethod: 'especes', bankName: '', docRef: '' });
  const [savedTxId, setSavedTxId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const emptyForm = { type: 'INCOME', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'especes', bankName: '', docRef: '' };

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

  const resetReceiptState = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setSavedTxId(null);
  };

  const openAdd = () => {
    setEditTx(null);
    setSaveError(null);
    setForm(emptyForm);
    resetReceiptState();
    setShowModal(true);
  };

  const openEdit = (tx: any) => {
    setEditTx(tx);
    setSaveError(null);
    const { paymentMethod, bankName } = parsePaymentMethod(tx.reference || '');
    setForm({ type: tx.type, amount: tx.amount.toString(), category: tx.category, description: tx.description || '', date: tx.date?.split('T')[0] || '', paymentMethod, bankName, docRef: tx.docRef || '' });
    setReceiptFile(null);
    setReceiptPreview(tx.receiptUrl || null);
    setSavedTxId(tx.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.amount || !form.category) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = { ...form, reference: buildReference(form.paymentMethod, form.bankName) };
      let txId: string;
      if (editTx) {
        await financeApi.update(editTx.id, payload);
        txId = editTx.id;
      } else {
        const res = await financeApi.create(payload);
        txId = res.data.id;
      }
      // Upload receipt file if selected
      if (receiptFile) {
        setUploadingReceipt(true);
        try { await financeApi.uploadReceipt(txId, receiptFile); } catch {}
        setUploadingReceipt(false);
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditTx(null);
      resetReceiptState();
      load();
      setToast({ message: lang === 'ar' ? 'تم الحفظ بنجاح ✓' : 'Enregistré avec succès ✓', type: 'success' });
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
      const res = await financeApi.exportPDF(exportYear, lang);
      const filename = lang === 'ar' ? `التقرير_المالي_${exportYear}.pdf` : `rapport_financier_${exportYear}.pdf`;
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), filename);
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
      <div className="rounded-2xl bg-gradient-to-br from-green-700 via-emerald-600 to-teal-600 p-5 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow">
            <DollarSign size={24} className="text-emerald-200" />
            {t('finance.title')}
          </h2>
          <div className="flex gap-2 flex-wrap">
            <select
              value={exportYear}
              onChange={(e) => setExportYear(Number(e.target.value))}
              className="px-3 py-2 rounded-xl bg-white/20 border border-white/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y} className="text-gray-900 bg-white">{y}</option>
              ))}
            </select>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors backdrop-blur-sm border border-white/30"><Download size={15} />{t('finance.export')}</button>
            <button onClick={() => exportApi.finance()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors backdrop-blur-sm border border-white/30"><FileSpreadsheet size={15} />Excel</button>
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-green-700 hover:bg-green-50 text-sm font-semibold transition-colors shadow"><Plus size={15} />{t('finance.addTransaction')}</button>
          </div>
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
                      <div className="flex gap-1 items-center">
                        {tx.receiptUrl && (
                          <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title={lang === 'ar' ? 'عرض الوثيقة' : 'Voir la pièce'}>
                            <Paperclip size={14} />
                          </a>
                        )}
                        <button onClick={() => exportApi.invoice(tx.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" title={lang === 'ar' ? 'تحميل الوصل' : 'Télécharger le reçu'}><FileText size={14} /></button>
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
                  <input type="radio" name="type" value={tp} checked={form.type === tp} onChange={() => setForm({ ...form, type: tp, category: '' })} />
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
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <option value="">{lang === 'ar' ? '— اختر —' : '— Choisir —'}</option>
                {CATEGORIES[form.type as 'INCOME' | 'EXPENSE'][lang].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('finance.date')}</label>
              <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'طريقة الأداء' : 'Mode de paiement'}</label>
              <select
                className="input"
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value, bankName: '' })}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              >
                {PAYMENT_METHODS[lang].map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {(form.paymentMethod === 'virement' || form.paymentMethod === 'cheque') && (
            <div>
              <label className="label">{lang === 'ar' ? 'اسم البنك' : 'Nom de la banque'}</label>
              <div className="flex flex-wrap gap-2">
                {BANKS.map((bank) => (
                  <button key={bank} type="button" onClick={() => setForm({ ...form, bankName: bank })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${form.bankName === bank ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-400'}`}>
                    {bank}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.paymentMethod === 'transfer' && (
            <div>
              <label className="label">{lang === 'ar' ? 'خدمة الإرسالية' : 'Service de transfer'}</label>
              <div className="flex flex-wrap gap-2">
                {TRANSFER_SERVICES.map((svc) => (
                  <button key={svc} type="button" onClick={() => setForm({ ...form, bankName: svc })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${form.bankName === svc ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-400'}`}>
                    {svc}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* N° référence + description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{lang === 'ar' ? 'رقم الوثيقة / الشيك' : 'N° Chèque / Reçu'}</label>
              <input
                className="input"
                placeholder={lang === 'ar' ? 'مثال: CHQ-001' : 'Ex : CHQ-001'}
                value={form.docRef}
                onChange={(e) => setForm({ ...form, docRef: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('finance.description')}</label>
              <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          {/* Receipt upload */}
          <div>
            <label className="label">{lang === 'ar' ? 'صورة الوثيقة / الشيك / الوصل' : 'Pièce justificative (photo / scan)'}</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                <Paperclip size={15} />
                {receiptPreview
                  ? (lang === 'ar' ? 'تغيير الوثيقة' : 'Changer la pièce')
                  : (lang === 'ar' ? 'إرفاق وثيقة' : 'Joindre une pièce')}
              </button>
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setReceiptFile(file);
                  setReceiptPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : 'pdf');
                }}
              />
              {receiptPreview && receiptPreview !== 'pdf' && (
                <img src={receiptPreview} alt="receipt" className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
              )}
              {receiptPreview === 'pdf' && (
                <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-1 rounded-lg border border-red-200 dark:border-red-800">PDF</span>
              )}
              {receiptPreview && savedTxId && !receiptFile && (
                <a
                  href={receiptPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
                >
                  <ExternalLink size={12} />{lang === 'ar' ? 'فتح' : 'Ouvrir'}
                </a>
              )}
              {uploadingReceipt && <span className="text-xs text-gray-400 animate-pulse">{lang === 'ar' ? 'جاري الرفع...' : 'Envoi...'}</span>}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={lang === 'ar' ? 'حذف المعاملة' : 'Supprimer'} message={t('common.confirmDelete')} loading={deleting} />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
