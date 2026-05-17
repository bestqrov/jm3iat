import React, { useState, useEffect, useCallback } from 'react';
import { Factory, Plus, Edit2, Trash2, X, AlertCircle, Package, CheckCircle, Clock, PlayCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { coopApi } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product { id: string; name: string; unit: string; }
interface ProductionInput { productId?: string; description: string; quantity: number; unit: string; product?: { name: string } }
interface CoopProduction {
  id: string; batchNumber: string; productId?: string; productName: string;
  status: string; plannedQty: number; actualQty?: number; productionCost: number;
  startDate?: string; endDate?: string; notes?: string;
  product?: { name: string; unit: string };
  inputs: ProductionInput[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><X size={18} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: string; ar: boolean }> = ({ status, ar }) => {
  const map: Record<string, { label: string; labelAr: string; cls: string }> = {
    PLANNED:     { label: 'Planifiée',  labelAr: 'مخططة',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    IN_PROGRESS: { label: 'En cours',   labelAr: 'جارية',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    COMPLETED:   { label: 'Terminée',   labelAr: 'مكتملة',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    CANCELLED:   { label: 'Annulée',    labelAr: 'ملغاة',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  };
  const s = map[status] || map.PLANNED;
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.cls}`}>{ar ? s.labelAr : s.label}</span>;
};

// ── Main Component ────────────────────────────────────────────────────────────

export const CoopProductionPage: React.FC = () => {
  const { lang } = useLanguage();
  const { organization } = useAuth();
  const ar = lang === 'ar';

  const fmt = (n: number) => new Intl.NumberFormat(ar ? 'ar-MA' : 'fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString(ar ? 'ar-MA' : 'fr-FR') : '—';

  const [productions, setProductions] = useState<CoopProduction[]>([]);
  const [products, setProducts]       = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [modal, setModal]             = useState(false);
  const [editItem, setEditItem]       = useState<CoopProduction | null>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [form, setForm] = useState({
    productId: '', productName: '', plannedQty: '', productionCost: '0',
    startDate: '', endDate: '', notes: '',
    inputs: [] as { description: string; productId: string; quantity: string; unit: string }[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, pr] = await Promise.all([coopApi.getProducts(), coopApi.getProductions()]);
      setProducts(p.data); setProductions(pr.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (p?: CoopProduction) => {
    if (p) {
      setEditItem(p);
      setForm({ productId: p.productId || '', productName: p.productName, plannedQty: String(p.plannedQty), productionCost: String(p.productionCost), startDate: p.startDate?.slice(0,10) || '', endDate: p.endDate?.slice(0,10) || '', notes: p.notes || '', inputs: p.inputs.map(i => ({ description: i.description, productId: i.productId || '', quantity: String(i.quantity), unit: i.unit })) });
    } else {
      setEditItem(null);
      setForm({ productId: '', productName: '', plannedQty: '', productionCost: '0', startDate: '', endDate: '', notes: '', inputs: [] });
    }
    setModal(true);
  };

  const save = async () => {
    try {
      if (editItem) await coopApi.updateProduction(editItem.id, form);
      else await coopApi.createProduction(form);
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Erreur'); }
  };

  const updateStatus = async (id: string, status: string, actualQty?: string) => {
    try { await coopApi.updateProduction(id, { status, ...(actualQty ? { actualQty } : {}) }); load(); }
    catch (e: any) { setError(e.response?.data?.message || 'Erreur'); }
  };

  const remove = async (id: string) => {
    if (!confirm(ar ? 'حذف دورة الإنتاج؟' : 'Supprimer cette production ?')) return;
    await coopApi.deleteProduction(id); load();
  };

  const filtered = filterStatus === 'ALL' ? productions : productions.filter(p => p.status === filterStatus);

  const statuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  const countByStatus = (s: string) => productions.filter(p => p.status === s).length;
  const totalCost = productions.filter(p => p.status === 'COMPLETED').reduce((a, p) => a + p.productionCost, 0);
  const totalProduced = productions.filter(p => p.status === 'COMPLETED').reduce((a, p) => a + (p.actualQty ?? p.plannedQty), 0);

  return (
    <div className="p-4 space-y-5" dir={ar ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)' }}>
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Factory size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">{ar ? 'إدارة الإنتاج' : 'Gestion de Production'}</h1>
          <p className="text-sm text-teal-100 mt-0.5">{organization?.name}</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0">
          <Plus size={16} />{ar ? 'دورة جديدة' : 'Nouvelle'}
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ar ? 'مخططة' : 'Planifiées',   value: countByStatus('PLANNED'),     icon: <Clock size={18} />,       color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
          { label: ar ? 'جارية' : 'En cours',       value: countByStatus('IN_PROGRESS'), icon: <PlayCircle size={18} />,  color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
          { label: ar ? 'مكتملة' : 'Terminées',    value: countByStatus('COMPLETED'),   icon: <CheckCircle size={18} />, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: ar ? 'إجمالي الكلفة' : 'Coût total', value: `${fmt(totalCost)} MAD`, icon: <Package size={18} />,     color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color}`}>{k.icon}</div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{k.label}</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit flex-wrap">
        {[{ k: 'ALL', fr: 'Tout', ar: 'الكل' }, { k: 'PLANNED', fr: 'Planifiées', ar: 'مخططة' }, { k: 'IN_PROGRESS', fr: 'En cours', ar: 'جارية' }, { k: 'COMPLETED', fr: 'Terminées', ar: 'مكتملة' }, { k: 'CANCELLED', fr: 'Annulées', ar: 'ملغاة' }].map(f => (
          <button key={f.k} onClick={() => setFilterStatus(f.k)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === f.k ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {ar ? f.ar : f.fr} {f.k !== 'ALL' && `(${countByStatus(f.k)})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} />{error}
          <button onClick={() => setError('')} className="ms-auto"><X size={14} /></button>
        </div>
      )}

      {/* Production list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">{ar ? 'جاري التحميل...' : 'Chargement...'}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Factory size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium">{ar ? 'لا توجد دورات إنتاج' : 'Aucune production'}</p>
          <button onClick={() => openModal()} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700">
            {ar ? '+ إضافة أول دورة' : '+ Créer la première'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(prod => {
            const progress = prod.actualQty != null && prod.plannedQty > 0 ? Math.min(100, (prod.actualQty / prod.plannedQty) * 100) : prod.status === 'IN_PROGRESS' ? 50 : prod.status === 'COMPLETED' ? 100 : 0;
            return (
              <div key={prod.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 dark:text-white">{prod.productName}</span>
                      <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{prod.batchNumber}</span>
                      <StatusBadge status={prod.status} ar={ar} />
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-gray-500">{ar ? 'مخطط:' : 'Prévu:'} <strong className="text-gray-800 dark:text-gray-200">{fmt(prod.plannedQty)} {prod.product?.unit || ''}</strong></span>
                      {prod.actualQty != null && <span className="text-gray-500">{ar ? 'فعلي:' : 'Réel:'} <strong className="text-emerald-600">{fmt(prod.actualQty)} {prod.product?.unit || ''}</strong></span>}
                      {prod.productionCost > 0 && <span className="text-gray-500">{ar ? 'التكلفة:' : 'Coût:'} <strong className="text-violet-600">{fmt(prod.productionCost)} MAD</strong></span>}
                      {prod.startDate && <span className="text-gray-400">{ar ? 'من' : 'Du'} {fmtDate(prod.startDate)}{prod.endDate ? ` ${ar ? 'إلى' : 'au'} ${fmtDate(prod.endDate)}` : ''}</span>}
                    </div>

                    {/* Progress bar */}
                    {prod.status !== 'CANCELLED' && (
                      <div className="space-y-1">
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${prod.status === 'COMPLETED' ? 'bg-emerald-500' : prod.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-blue-400'}`} style={{ width: `${progress}%` }} />
                        </div>
                        {prod.status === 'IN_PROGRESS' && <div className="text-xs text-gray-400">{Math.round(progress)}%</div>}
                      </div>
                    )}

                    {/* Inputs */}
                    {prod.inputs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-xs text-gray-400">{ar ? 'المواد:' : 'Matières:'}</span>
                        {prod.inputs.map((inp, i) => (
                          <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                            {inp.product?.name || inp.description} — {fmt(inp.quantity)} {inp.unit}
                          </span>
                        ))}
                      </div>
                    )}

                    {prod.notes && <p className="text-xs text-gray-400 italic">{prod.notes}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="flex gap-1">
                      <button onClick={() => openModal(prod)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title={ar ? 'تعديل' : 'Modifier'}><Edit2 size={15} /></button>
                      <button onClick={() => remove(prod.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500" title={ar ? 'حذف' : 'Supprimer'}><Trash2 size={15} /></button>
                    </div>
                    {prod.status === 'PLANNED' && (
                      <button onClick={() => updateStatus(prod.id, 'IN_PROGRESS')} className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">
                        {ar ? '▶ بدء' : '▶ Démarrer'}
                      </button>
                    )}
                    {prod.status === 'IN_PROGRESS' && (
                      <button onClick={() => { const q = prompt(ar ? 'الكمية الفعلية المنتجة:' : 'Quantité réelle produite:', String(prod.plannedQty)); if (q) updateStatus(prod.id, 'COMPLETED', q); }} className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium">
                        {ar ? '✓ إنهاء' : '✓ Terminer'}
                      </button>
                    )}
                    {prod.status === 'PLANNED' && (
                      <button onClick={() => updateStatus(prod.id, 'CANCELLED')} className="px-3 py-1.5 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium">
                        {ar ? '✕ إلغاء' : '✕ Annuler'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary bar */}
      {productions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap gap-6">
          <div><div className="text-xs text-gray-400 mb-0.5">{ar ? 'إجمالي الدورات' : 'Total productions'}</div><div className="font-bold text-gray-900 dark:text-white">{productions.length}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">{ar ? 'الكمية المنتجة' : 'Quantité produite'}</div><div className="font-bold text-emerald-600">{fmt(totalProduced)}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">{ar ? 'إجمالي التكاليف' : 'Coût total'}</div><div className="font-bold text-violet-600">{fmt(totalCost)} MAD</div></div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal title={editItem ? (ar ? 'تعديل دورة الإنتاج' : 'Modifier la production') : (ar ? 'دورة إنتاج جديدة' : 'Nouvelle production')} onClose={() => setModal(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'المنتج (من المخزون)' : 'Produit (du stock)'}</label>
                <select value={form.productId} onChange={e => { const p = products.find(x => x.id === e.target.value); setForm(f => ({ ...f, productId: e.target.value, productName: p?.name || f.productName })); }} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="">{ar ? '-- اختر منتجاً --' : '-- Choisir un produit --'}</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'اسم المنتج *' : 'Nom du produit *'}</label>
                <input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} placeholder={ar ? 'أو اكتب اسماً جديداً' : 'ou saisir un nom libre'} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'الكمية المخططة *' : 'Quantité prévue *'}</label>
                <input type="number" value={form.plannedQty} onChange={e => setForm(f => ({ ...f, plannedQty: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'تكلفة الإنتاج (MAD)' : 'Coût production (MAD)'}</label>
                <input type="number" value={form.productionCost} onChange={e => setForm(f => ({ ...f, productionCost: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'تاريخ البداية' : 'Date début'}</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'تاريخ النهاية' : 'Date fin'}</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>

            {/* Raw material inputs */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{ar ? 'المواد الأولية المستخدمة' : 'Matières premières utilisées'}</span>
                <button onClick={() => setForm(f => ({ ...f, inputs: [...f.inputs, { description: '', productId: '', quantity: '1', unit: 'kg' }] }))} className="flex items-center gap-1 px-2 py-1 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                  <Plus size={12} />{ar ? 'إضافة' : 'Ajouter'}
                </button>
              </div>
              {form.inputs.length === 0 && <p className="text-xs text-gray-400 text-center py-2">{ar ? 'لا توجد مواد مضافة بعد' : 'Aucune matière ajoutée'}</p>}
              {form.inputs.map((inp, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select value={inp.productId} onChange={e => { const p = products.find(x => x.id === e.target.value); const ins = [...form.inputs]; ins[i] = { ...ins[i], productId: e.target.value, description: p?.name || ins[i].description, unit: p?.unit || ins[i].unit }; setForm(f => ({ ...f, inputs: ins })); }} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="">{ar ? 'اختر أو اكتب' : 'Choisir ou saisir'}</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input placeholder={ar ? 'اسم المادة' : 'Matière'} value={inp.description} onChange={e => { const ins = [...form.inputs]; ins[i] = { ...ins[i], description: e.target.value }; setForm(f => ({ ...f, inputs: ins })); }} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" placeholder={ar ? 'كمية' : 'Qté'} value={inp.quantity} onChange={e => { const ins = [...form.inputs]; ins[i] = { ...ins[i], quantity: e.target.value }; setForm(f => ({ ...f, inputs: ins })); }} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div className="col-span-1">
                    <input placeholder={ar ? 'وحدة' : 'Unité'} value={inp.unit} onChange={e => { const ins = [...form.inputs]; ins[i] = { ...ins[i], unit: e.target.value }; setForm(f => ({ ...f, inputs: ins })); }} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => setForm(f => ({ ...f, inputs: f.inputs.filter((_, j) => j !== i) }))} className="p-1 text-red-500 hover:bg-red-50 rounded-lg"><X size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'ملاحظات' : 'Notes'}</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <button onClick={save} className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-medium text-sm hover:bg-teal-700 transition-colors">
              {ar ? 'حفظ' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
