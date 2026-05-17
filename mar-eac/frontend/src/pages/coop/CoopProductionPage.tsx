import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Factory, Plus, Edit2, Trash2, X, AlertCircle, Package, CheckCircle, Clock, PlayCircle, Warehouse, Send, Info, ArrowDownToLine } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { coopApi } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product { id: string; name: string; unit: string; }
interface ProductionInput {
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  product?: { name: string }
}
interface CoopProduction {
  id: string; batchNumber: string; productId?: string; productName: string;
  status: string; plannedQty: number; actualQty?: number; productionCost: number;
  startDate?: string; endDate?: string; notes?: string;
  product?: { name: string; unit: string };
  inputs: ProductionInput[];
}
interface StockMovement {
  id: string; productId: string; type: string; quantity: number; unitPrice?: number;
  reference?: string; notes?: string; date: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
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
  const [movements, setMovements]     = useState<StockMovement[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [modal, setModal]             = useState(false);
  const [storeModal, setStoreModal]   = useState<{ product: Product; currentQty: number } | null>(null);
  const [storeQty, setStoreQty]       = useState('');
  const [storeNotes, setStoreNotes]   = useState('');
  const [editItem, setEditItem]       = useState<CoopProduction | null>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  type InputRow = { description: string; productId: string; quantity: string; unit: string; unitPrice: string };

  const [form, setForm] = useState({
    productId: '', productName: '', plannedQty: '', productionCost: '',
    startDate: '', endDate: '', notes: '',
    inputs: [] as InputRow[],
  });

  // Auto-calculate production cost from inputs
  const calcInputsTotal = (inputs: InputRow[]) =>
    inputs.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);

  const inputsAutoTotal = calcInputsTotal(form.inputs);
  const costIsAuto = inputsAutoTotal > 0;

  // Sync cost when inputs change
  const updateInputs = (inputs: InputRow[]) => {
    const total = calcInputsTotal(inputs);
    setForm(f => ({ ...f, inputs, productionCost: total > 0 ? String(total.toFixed(2)) : f.productionCost }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, pr, mv] = await Promise.all([coopApi.getProducts(), coopApi.getProductions(), coopApi.getMovements()]);
      setProducts(p.data); setProductions(pr.data); setMovements(mv.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Compute stock per product from movements
  const stockByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of movements) {
      if (!map[m.productId]) map[m.productId] = 0;
      if (m.type === 'IN') map[m.productId] += m.quantity;
      else if (m.type === 'OUT') map[m.productId] -= m.quantity;
    }
    return map;
  }, [movements]);

  const openModal = (p?: CoopProduction) => {
    if (p) {
      setEditItem(p);
      setForm({
        productId: p.productId || '', productName: p.productName,
        plannedQty: String(p.plannedQty), productionCost: String(p.productionCost),
        startDate: p.startDate?.slice(0, 10) || '', endDate: p.endDate?.slice(0, 10) || '',
        notes: p.notes || '',
        inputs: p.inputs.map(i => ({
          description: i.description, productId: i.productId || '',
          quantity: String(i.quantity), unit: i.unit, unitPrice: String(i.unitPrice || 0),
        })),
      });
    } else {
      setEditItem(null);
      setForm({ productId: '', productName: '', plannedQty: '', productionCost: '', startDate: '', endDate: '', notes: '', inputs: [] });
    }
    setModal(true);
  };

  const save = async () => {
    try {
      const payload = { ...form, productionCost: costIsAuto ? String(inputsAutoTotal.toFixed(2)) : form.productionCost };
      if (editItem) await coopApi.updateProduction(editItem.id, payload);
      else await coopApi.createProduction(payload);
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

  const sendToStore = async () => {
    if (!storeModal || !storeQty || parseFloat(storeQty) <= 0) return;
    try {
      await coopApi.createMovement({
        productId: storeModal.product.id,
        type: 'OUT',
        quantity: parseFloat(storeQty),
        reference: 'STORE_SHIPMENT',
        notes: storeNotes || (ar ? 'إرسال للمتجر - MarEAC' : 'Envoi au magasin - MarEAC'),
      });
      setStoreModal(null); setStoreQty(''); setStoreNotes('');
      load();
    } catch (e: any) { setError(e.response?.data?.message || 'Erreur'); }
  };

  const filtered = filterStatus === 'ALL' ? productions : productions.filter(p => p.status === filterStatus);
  const countByStatus = (s: string) => productions.filter(p => p.status === s).length;
  const totalCost = productions.filter(p => p.status === 'COMPLETED').reduce((a, p) => a + p.productionCost, 0);
  const totalProduced = productions.filter(p => p.status === 'COMPLETED').reduce((a, p) => a + (p.actualQty ?? p.plannedQty), 0);

  // Products that have stock entries
  const stockProducts = products.filter(p => stockByProduct[p.id] !== undefined);

  const inputField = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white';
  const field = 'w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm';
  const label = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

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
          { label: ar ? 'مخططة' : 'Planifiées',        value: countByStatus('PLANNED'),     icon: <Clock size={18} />,       color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
          { label: ar ? 'جارية' : 'En cours',           value: countByStatus('IN_PROGRESS'), icon: <PlayCircle size={18} />,  color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
          { label: ar ? 'مكتملة' : 'Terminées',         value: countByStatus('COMPLETED'),   icon: <CheckCircle size={18} />, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: ar ? 'إجمالي الكلفة' : 'Coût total', value: `${fmt(totalCost)} MAD`,     icon: <Package size={18} />,     color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.color}`}>{k.icon}</div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 dark:text-gray-400">{k.label}</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white truncate">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit flex-wrap">
        {[
          { k: 'ALL', fr: 'Tout', ar: 'الكل' },
          { k: 'PLANNED', fr: 'Planifiées', ar: 'مخططة' },
          { k: 'IN_PROGRESS', fr: 'En cours', ar: 'جارية' },
          { k: 'COMPLETED', fr: 'Terminées', ar: 'مكتملة' },
          { k: 'CANCELLED', fr: 'Annulées', ar: 'ملغاة' },
        ].map(f => (
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
        <div className="text-center py-16 text-gray-400">
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
            const hasInputPrices = prod.inputs.some(i => (i.unitPrice ?? 0) > 0);
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
                      {prod.productionCost > 0 && (
                        <span className="text-gray-500">
                          {ar ? 'التكلفة:' : 'Coût:'} <strong className="text-violet-600">{fmt(prod.productionCost)} MAD</strong>
                          {hasInputPrices && <span className="ms-1 text-xs text-gray-400">({ar ? 'محسوب' : 'calculé'})</span>}
                        </span>
                      )}
                      {prod.startDate && <span className="text-gray-400">{ar ? 'من' : 'Du'} {fmtDate(prod.startDate)}{prod.endDate ? ` ${ar ? 'إلى' : 'au'} ${fmtDate(prod.endDate)}` : ''}</span>}
                    </div>

                    {prod.status !== 'CANCELLED' && (
                      <div className="space-y-1">
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${prod.status === 'COMPLETED' ? 'bg-emerald-500' : prod.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-blue-400'}`} style={{ width: `${progress}%` }} />
                        </div>
                        {prod.status === 'IN_PROGRESS' && <div className="text-xs text-gray-400">{Math.round(progress)}%</div>}
                      </div>
                    )}

                    {/* Inputs with prices */}
                    {prod.inputs.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-xs text-gray-400 font-medium">{ar ? 'المواد الأولية:' : 'Matières premières:'}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {prod.inputs.map((inp, i) => (
                            <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                              {inp.product?.name || inp.description} — {fmt(inp.quantity)} {inp.unit}
                              {(inp.unitPrice ?? 0) > 0 && <span className="text-violet-500 ms-1">× {fmt(inp.unitPrice!)} MAD</span>}
                            </span>
                          ))}
                        </div>
                        {hasInputPrices && (
                          <div className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                            = {fmt(prod.inputs.reduce((s, i) => s + i.quantity * (i.unitPrice || 0), 0))} MAD
                          </div>
                        )}
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

      {/* ── STOCK SECTION ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-white dark:from-teal-900/10 dark:to-gray-800">
          <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Warehouse size={18} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">{ar ? 'المخزون' : 'Stock'}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{ar ? 'المنتجات المتوفرة في مخزون التعاونية' : 'Produits disponibles en stock'}</p>
          </div>
        </div>

        {/* Explanatory banner */}
        <div className="mx-4 mt-4 flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
          <Info size={15} className="flex-shrink-0 mt-0.5" />
          <p>
            {ar
              ? 'يمكنك هنا إرسال منتجات التعاونية مباشرة إلى متجر منصة MarEAC. عند إتمام عملية الإنتاج تُضاف الكميات تلقائياً، وعند الإرسال تُخصم من المخزون.'
              : 'Vous pouvez envoyer les produits de la coopérative directement vers le magasin MarEAC. Les quantités sont ajoutées automatiquement à la fin de la production et déduites lors de l\'envoi au magasin.'}
          </p>
        </div>

        <div className="p-4">
          {stockProducts.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Package size={36} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">{ar ? 'لا توجد منتجات في المخزون بعد' : 'Aucun produit en stock pour l\'instant'}</p>
              <p className="text-xs mt-1 opacity-70">{ar ? 'أكمل دورة إنتاج لإضافة كميات' : 'Terminez une production pour ajouter des quantités'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {products.map(p => {
                const qty = stockByProduct[p.id] ?? 0;
                const low = qty > 0 && qty < 10;
                const empty = qty <= 0;
                return (
                  <div key={p.id} className={`rounded-xl border p-4 flex items-center gap-3 ${empty ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10' : low ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${empty ? 'bg-red-100 dark:bg-red-900/30 text-red-500' : low ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-teal-100 dark:bg-teal-900/30 text-teal-600'}`}>
                      <Package size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{p.name}</div>
                      <div className={`text-lg font-bold ${empty ? 'text-red-500' : low ? 'text-amber-600' : 'text-teal-600'}`}>
                        {fmt(qty)} <span className="text-xs font-normal text-gray-400">{p.unit}</span>
                      </div>
                      {empty && <div className="text-xs text-red-500">{ar ? 'نفد المخزون' : 'Rupture de stock'}</div>}
                      {low && !empty && <div className="text-xs text-amber-600">{ar ? 'مخزون منخفض' : 'Stock bas'}</div>}
                    </div>
                    <button
                      onClick={() => { setStoreModal({ product: p, currentQty: qty }); setStoreQty(''); setStoreNotes(''); }}
                      disabled={qty <= 0}
                      className="flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-medium transition-colors"
                      title={ar ? 'إرسال للمتجر' : 'Envoyer au magasin'}
                    >
                      <ArrowDownToLine size={15} />
                      <span className="text-[10px]">{ar ? 'متجر' : 'Magasin'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Production Modal */}
      {modal && (
        <Modal
          title={editItem ? (ar ? 'تعديل دورة الإنتاج' : 'Modifier la production') : (ar ? 'دورة إنتاج جديدة' : 'Nouvelle production')}
          onClose={() => setModal(false)}
          wide
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>{ar ? 'المنتج (من المخزون)' : 'Produit (du stock)'}</label>
                <select value={form.productId} onChange={e => { const p = products.find(x => x.id === e.target.value); setForm(f => ({ ...f, productId: e.target.value, productName: p?.name || f.productName })); }} className={field}>
                  <option value="">{ar ? '-- اختر منتجاً --' : '-- Choisir un produit --'}</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select>
              </div>
              <div>
                <label className={label}>{ar ? 'اسم المنتج *' : 'Nom du produit *'}</label>
                <input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} placeholder={ar ? 'أو اكتب اسماً جديداً' : 'ou saisir un nom libre'} className={field} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>{ar ? 'الكمية المخططة *' : 'Quantité prévue *'}</label>
                <input type="number" value={form.plannedQty} onChange={e => setForm(f => ({ ...f, plannedQty: e.target.value }))} className={field} />
              </div>
              <div>
                <label className={label}>
                  {ar ? 'تكلفة الإنتاج (MAD)' : 'Coût production (MAD)'}
                  {costIsAuto && (
                    <span className="ms-2 text-xs font-normal text-teal-600 dark:text-teal-400">
                      ✓ {ar ? 'محسوب تلقائياً' : 'calculé auto'}
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  value={costIsAuto ? inputsAutoTotal.toFixed(2) : form.productionCost}
                  onChange={e => !costIsAuto && setForm(f => ({ ...f, productionCost: e.target.value }))}
                  readOnly={costIsAuto}
                  placeholder={ar ? 'أدخل التكلفة يدوياً' : 'Saisir le coût manuellement'}
                  className={`${field} ${costIsAuto ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 cursor-not-allowed' : ''}`}
                />
                {!costIsAuto && form.inputs.length === 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{ar ? 'أضف مواد أولية لحساب التكلفة تلقائياً' : 'Ajoutez des matières pour calculer automatiquement'}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>{ar ? 'تاريخ البداية' : 'Date début'}</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={field} />
              </div>
              <div>
                <label className={label}>{ar ? 'تاريخ النهاية' : 'Date fin'}</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={field} />
              </div>
            </div>

            {/* Raw materials with prices */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
                <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                  {ar ? 'المواد الأولية المستخدمة' : 'Matières premières utilisées'}
                </span>
                <button
                  onClick={() => updateInputs([...form.inputs, { description: '', productId: '', quantity: '1', unit: 'kg', unitPrice: '' }])}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  <Plus size={12} />{ar ? 'إضافة' : 'Ajouter'}
                </button>
              </div>

              {form.inputs.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">{ar ? 'لا توجد مواد — أضف مادة لحساب التكلفة تلقائياً' : 'Aucune matière — ajoutez-en pour calculer le coût auto'}</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {/* Header row */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    <div className="col-span-4">{ar ? 'المادة / المنتج' : 'Matière / Produit'}</div>
                    <div className="col-span-2 text-center">{ar ? 'الكمية' : 'Quantité'}</div>
                    <div className="col-span-2 text-center">{ar ? 'الوحدة' : 'Unité'}</div>
                    <div className="col-span-2 text-center">{ar ? 'السعر/الوحدة' : 'Prix/unité'}</div>
                    <div className="col-span-1 text-center">{ar ? 'المجموع' : 'Total'}</div>
                    <div className="col-span-1" />
                  </div>
                  {form.inputs.map((inp, i) => {
                    const rowTotal = (parseFloat(inp.quantity) || 0) * (parseFloat(inp.unitPrice) || 0);
                    return (
                      <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center">
                        <div className="col-span-4">
                          <select
                            value={inp.productId}
                            onChange={e => {
                              const p = products.find(x => x.id === e.target.value);
                              const next = [...form.inputs];
                              next[i] = { ...next[i], productId: e.target.value, description: p?.name || next[i].description, unit: p?.unit || next[i].unit };
                              updateInputs(next);
                            }}
                            className={inputField}
                          >
                            <option value="">{ar ? 'اختر أو اكتب' : 'Choisir...'}</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <input
                            placeholder={ar ? 'أو اكتب اسم المادة' : 'ou nom libre'}
                            value={inp.description}
                            onChange={e => { const next = [...form.inputs]; next[i] = { ...next[i], description: e.target.value }; updateInputs(next); }}
                            className={`${inputField} mt-1`}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number" min="0"
                            placeholder="0"
                            value={inp.quantity}
                            onChange={e => { const next = [...form.inputs]; next[i] = { ...next[i], quantity: e.target.value }; updateInputs(next); }}
                            className={inputField}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            placeholder={ar ? 'كغ، ل...' : 'kg, l...'}
                            value={inp.unit}
                            onChange={e => { const next = [...form.inputs]; next[i] = { ...next[i], unit: e.target.value }; updateInputs(next); }}
                            className={inputField}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number" min="0"
                            placeholder="0"
                            value={inp.unitPrice}
                            onChange={e => { const next = [...form.inputs]; next[i] = { ...next[i], unitPrice: e.target.value }; updateInputs(next); }}
                            className={inputField}
                          />
                        </div>
                        <div className="col-span-1 text-center text-xs font-semibold text-violet-600 dark:text-violet-400">
                          {rowTotal > 0 ? fmt(rowTotal) : '—'}
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button onClick={() => updateInputs(form.inputs.filter((_, j) => j !== i))} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><X size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                  {/* Total footer */}
                  {costIsAuto && (
                    <div className="flex items-center justify-end gap-3 px-4 py-2.5 bg-teal-50 dark:bg-teal-900/10">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{ar ? 'إجمالي تكلفة المواد:' : 'Total matières:'}</span>
                      <span className="text-base font-bold text-teal-700 dark:text-teal-400">{fmt(inputsAutoTotal)} MAD</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className={label}>{ar ? 'ملاحظات' : 'Notes'}</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={field} />
            </div>

            <button onClick={save} className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-medium text-sm hover:bg-teal-700 transition-colors">
              {ar ? 'حفظ' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}

      {/* Send-to-Store Modal */}
      {storeModal && (
        <Modal
          title={ar ? `إرسال إلى متجر MarEAC` : `Envoyer au magasin MarEAC`}
          onClose={() => setStoreModal(null)}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                <Package size={20} />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{storeModal.product.name}</div>
                <div className="text-sm text-teal-600 dark:text-teal-400">{ar ? 'متوفر:' : 'Disponible:'} {fmt(storeModal.currentQty)} {storeModal.product.unit}</div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <Send size={13} className="flex-shrink-0 mt-0.5" />
              <span>{ar ? 'سيتم خصم الكمية من مخزون التعاونية وإضافتها إلى متجر MarEAC.' : 'La quantité sera déduite du stock de la coopérative et ajoutée au magasin MarEAC.'}</span>
            </div>

            <div>
              <label className={label}>{ar ? 'الكمية المراد إرسالها *' : 'Quantité à envoyer *'}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0.01" max={storeModal.currentQty} step="0.01"
                  value={storeQty}
                  onChange={e => setStoreQty(e.target.value)}
                  placeholder="0"
                  className={`${field} flex-1`}
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">{storeModal.product.unit}</span>
              </div>
              {parseFloat(storeQty) > storeModal.currentQty && (
                <p className="text-xs text-red-500 mt-1">{ar ? 'الكمية تتجاوز المخزون المتوفر' : 'Quantité supérieure au stock disponible'}</p>
              )}
            </div>

            <div>
              <label className={label}>{ar ? 'ملاحظات (اختياري)' : 'Notes (optionnel)'}</label>
              <textarea
                value={storeNotes}
                onChange={e => setStoreNotes(e.target.value)}
                rows={2}
                placeholder={ar ? 'مثل: دفعة رمضان، صنف ممتاز...' : 'Ex: Lot Ramadan, qualité premium...'}
                className={field}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStoreModal(null)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                {ar ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                onClick={sendToStore}
                disabled={!storeQty || parseFloat(storeQty) <= 0 || parseFloat(storeQty) > storeModal.currentQty}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={15} />{ar ? 'إرسال للمتجر' : 'Envoyer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
