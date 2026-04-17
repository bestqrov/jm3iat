import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight, X, Loader2 } from 'lucide-react';
import { recurringApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface RecurringPayment {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: string;
  frequency: string;
  nextDueDate: string;
  isActive: boolean;
  autoCreate: boolean;
}

const FREQ_LABEL: Record<string, string> = { MONTHLY: 'Mensuel', QUARTERLY: 'Trimestriel', YEARLY: 'Annuel' };
const FREQ_LABEL_AR: Record<string, string> = { MONTHLY: 'شهري', QUARTERLY: 'ربع سنوي', YEARLY: 'سنوي' };

export const RecurringPage: React.FC = () => {
  const { lang } = useLanguage();
  const [items, setItems]   = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [form, setForm]     = useState({ description: '', amount: '', category: '', type: 'INCOME', frequency: 'MONTHLY', startDate: new Date().toISOString().split('T')[0], autoCreate: true, notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await recurringApi.getAll(); setItems(r.data); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.description || !form.amount || !form.category) { setError(lang === 'ar' ? 'جميع الحقول مطلوبة' : 'Tous les champs sont requis'); return; }
    setSaving(true); setError('');
    try {
      await recurringApi.create(form);
      setModal(false); load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Erreur'); } finally { setSaving(false); }
  };

  const toggle = async (item: RecurringPayment) => {
    await recurringApi.update(item.id, { isActive: !item.isActive });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذا الدفع المتكرر؟' : 'Supprimer ce paiement récurrent ?')) return;
    await recurringApi.remove(id);
    load();
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA');
  const freqLabel = (f: string) => lang === 'ar' ? FREQ_LABEL_AR[f] : FREQ_LABEL[f];

  const income = items.filter(i => i.type === 'INCOME' && i.isActive).reduce((s, i) => s + i.amount, 0);
  const expense = items.filter(i => i.type === 'EXPENSE' && i.isActive).reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <RefreshCw size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{lang === 'ar' ? 'الدفعات المتكررة' : 'Paiements récurrents'}</h2>
            <p className="text-xs text-gray-500">{lang === 'ar' ? 'تُنشأ تلقائياً حسب الجدول' : 'Créés automatiquement selon le calendrier'}</p>
          </div>
        </div>
        <button onClick={() => { setForm({ description: '', amount: '', category: '', type: 'INCOME', frequency: 'MONTHLY', startDate: new Date().toISOString().split('T')[0], autoCreate: true, notes: '' }); setError(''); setModal(true); }} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={15} />{lang === 'ar' ? 'إضافة' : 'Ajouter'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-500">{lang === 'ar' ? 'دخل متكرر/شهر' : 'Revenus récurrents/mois'}</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{income.toLocaleString('fr-MA')} MAD</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">{lang === 'ar' ? 'مصاريف متكررة/شهر' : 'Dépenses récurrentes/mois'}</p>
          <p className="text-xl font-bold text-red-600 mt-1">{expense.toLocaleString('fr-MA')} MAD</p>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loading && <div className="py-8 text-center text-gray-400 text-sm">{lang === 'ar' ? 'جارٍ التحميل...' : 'Chargement...'}</div>}
        {!loading && items.length === 0 && (
          <div className="py-12 text-center">
            <RefreshCw size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">{lang === 'ar' ? 'لا توجد دفعات متكررة' : 'Aucun paiement récurrent'}</p>
          </div>
        )}
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map(item => (
            <div key={item.id} className={`flex items-center gap-4 px-4 py-3 ${!item.isActive ? 'opacity-50' : ''}`}>
              <div className={`w-2 h-10 rounded-full flex-shrink-0 ${item.type === 'INCOME' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 dark:text-white">{item.description}</span>
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">{freqLabel(item.frequency)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{item.category} • {lang === 'ar' ? 'التالي:' : 'Prochain:'} {fmtDate(item.nextDueDate)}</div>
              </div>
              <span className={`font-bold text-sm ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                {item.type === 'EXPENSE' ? '-' : '+'}{item.amount.toLocaleString('fr-MA')} MAD
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => toggle(item)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600">
                  {item.isActive ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                </button>
                <button onClick={() => remove(item.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">{lang === 'ar' ? 'إضافة دفعة متكررة' : 'Nouveau paiement récurrent'}</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="label">{lang === 'ar' ? 'الوصف *' : 'Description *'}</label><input className="input" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">{lang === 'ar' ? 'المبلغ *' : 'Montant *'}</label><input className="input" type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} /></div>
                <div><label className="label">{lang === 'ar' ? 'الفئة *' : 'Catégorie *'}</label><input className="input" value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">{lang === 'ar' ? 'النوع' : 'Type'}</label>
                  <select className="input" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                    <option value="INCOME">{lang === 'ar' ? 'دخل' : 'Revenu'}</option>
                    <option value="EXPENSE">{lang === 'ar' ? 'مصروف' : 'Dépense'}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{lang === 'ar' ? 'التكرار' : 'Fréquence'}</label>
                  <select className="input" value={form.frequency} onChange={e => setForm(p => ({...p, frequency: e.target.value}))}>
                    <option value="MONTHLY">{lang === 'ar' ? 'شهري' : 'Mensuel'}</option>
                    <option value="QUARTERLY">{lang === 'ar' ? 'ربع سنوي' : 'Trimestriel'}</option>
                    <option value="YEARLY">{lang === 'ar' ? 'سنوي' : 'Annuel'}</option>
                  </select>
                </div>
                <div><label className="label">{lang === 'ar' ? 'تاريخ البداية' : 'Date début'}</label><input className="input" type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} /></div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.autoCreate} onChange={e => setForm(p => ({...p, autoCreate: e.target.checked}))} className="rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'إنشاء تلقائي في المالية' : 'Créer automatiquement dans la finance'}</span>
              </label>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 size={15} className="animate-spin" /> : (lang === 'ar' ? 'حفظ' : 'Enregistrer')}</button>
                <button onClick={() => setModal(false)} className="btn-secondary flex-1">{lang === 'ar' ? 'إلغاء' : 'Annuler'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
