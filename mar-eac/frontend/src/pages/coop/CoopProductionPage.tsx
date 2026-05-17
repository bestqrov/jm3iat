import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Factory, Plus, Edit2, Trash2, X, AlertCircle, Package, CheckCircle, Clock, PlayCircle, Warehouse, Send, Info, ArrowDownToLine, Search } from 'lucide-react';
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
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [storeModal, setStoreModal]     = useState<{ product: Product; currentQty: number } | null>(null);
  const [storeQty, setStoreQty]         = useState('');
  const [storeNotes, setStoreNotes]     = useState('');
  const [movModal, setMovModal]         = useState(false);
  const [movForm, setMovForm]           = useState({ productId: '', type: 'IN', quantity: '', unitPrice: '', reference: '', notes: '' });
  const [movFilter, setMovFilter]       = useState('');
  const [editItem, setEditItem]         = useState<CoopProduction | null>(null);
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
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

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

  const addMovement = async () => {
    if (!movForm.productId || !movForm.quantity || parseFloat(movForm.quantity) <= 0) return;
    try {
      await coopApi.createMovement({
        productId: movForm.productId,
        type: movForm.type,
        quantity: parseFloat(movForm.quantity),
        unitPrice: movForm.unitPrice ? parseFloat(movForm.unitPrice) : undefined,
        reference: movForm.reference || undefined,
        notes: movForm.notes || undefined,
      });
      setMovModal(false);
      setMovForm({ productId: '', type: 'IN', quantity: '', unitPrice: '', reference: '', notes: '' });
      load();
    } catch (e: any) { setError(e.response?.data?.message || 'Erreur'); }
  };

  const filtered = filterStatus === 'ALL' ? productions : productions.filter(p => p.status === filterStatus);
  const countByStatus = (s: string) => productions.filter(p => p.status === s).length;
  const totalCost = productions.filter(p => p.status === 'COMPLETED').reduce((a, p) => a + p.productionCost, 0);
  const totalProduced = productions.filter(p => p.status === 'COMPLETED').reduce((a, p) => a + (p.actualQty ?? p.plannedQty), 0);

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

      {/* ── STOCK & TRANSACTIONS ──────────────────────────────────────────── */}
      <div className="space-y-4">

        {/* ── Stock header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Warehouse size={18} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">{ar ? 'المخزون' : 'Stock'}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {ar ? 'الكميات المتوفرة من كل منتج في التعاونية' : 'Quantités disponibles par produit'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setMovForm({ productId: '', type: 'IN', quantity: '', unitPrice: '', reference: '', notes: '' }); setMovModal(true); }}
            className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700"
          >
            <Plus size={15} />{ar ? 'إضافة حركة' : 'Ajouter mouvement'}
          </button>
        </div>

        {/* Explanatory note */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            {ar
              ? 'عند إكمال دورة إنتاج مرتبطة بمنتج محدد، تُضاف كميته تلقائياً إلى المخزون. يمكنك أيضاً إضافة حركات يدوية أو إرسال المنتجات إلى متجر MarEAC.'
              : 'Quand une production liée à un produit est terminée, sa quantité est ajoutée automatiquement. Vous pouvez aussi créer des mouvements manuels ou envoyer des produits au magasin MarEAC.'}
          </span>
        </div>

        {/* ── Stock analytics ── */}
        {movements.length > 0 && (() => {
          const totalIn    = movements.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity, 0);
          const totalOut   = movements.filter(m => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0);
          const netStock   = totalIn - totalOut;
          const valueIn    = movements.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity * (m.unitPrice || 0), 0);
          const valueOut   = movements.filter(m => m.type === 'OUT').reduce((s, m) => s + m.quantity * (m.unitPrice || 0), 0);
          const storeShips = movements.filter(m => m.reference === 'STORE_SHIPMENT').reduce((s, m) => s + m.quantity, 0);

          // Bar chart data: per product
          const chartData = products.map(p => ({
            name: p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name,
            inQty:  movements.filter(m => m.productId === p.id && m.type === 'IN').reduce((s, m) => s + m.quantity, 0),
            outQty: movements.filter(m => m.productId === p.id && m.type === 'OUT').reduce((s, m) => s + m.quantity, 0),
          })).filter(d => d.inQty > 0 || d.outQty > 0);
          const maxVal = Math.max(...chartData.map(d => Math.max(d.inQty, d.outQty)), 1);

          return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {ar ? 'تحليلات المخزون' : 'Analytiques du stock'}
              </h3>

              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: ar ? 'إجمالي الدخول' : 'Total entrées',  value: fmt(totalIn),    sub: `${fmt(valueIn)} MAD`,   color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800' },
                  { label: ar ? 'إجمالي الخروج' : 'Total sorties',  value: fmt(totalOut),   sub: `${fmt(valueOut)} MAD`,   color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/10',         border: 'border-red-200 dark:border-red-800' },
                  { label: ar ? 'الرصيد الحالي' : 'Solde actuel',   value: fmt(netStock),   sub: netStock >= 0 ? (ar ? 'مخزون موجب' : 'Stock positif') : (ar ? 'عجز!' : 'Déficit!'), color: netStock >= 0 ? 'text-teal-600' : 'text-red-600', bg: 'bg-teal-50 dark:bg-teal-900/10', border: 'border-teal-200 dark:border-teal-800' },
                  { label: ar ? 'مُرسَل للمتجر' : 'Envoyé magasin', value: fmt(storeShips), sub: ar ? 'إجمالي الإرساليات' : 'Total expéditions', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/10', border: 'border-violet-200 dark:border-violet-800' },
                ].map(k => (
                  <div key={k.label} className={`rounded-xl border p-3 ${k.bg} ${k.border}`}>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{k.label}</div>
                    <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Bar chart: IN vs OUT per product */}
              {chartData.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                    {ar ? 'دخول / خروج لكل منتج' : 'Entrées / Sorties par produit'}
                  </div>
                  <div className="flex items-end gap-2 h-28 overflow-x-auto pb-1">
                    {chartData.map((d, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 min-w-[48px] flex-1">
                        <div className="flex items-end gap-0.5 h-20 w-full justify-center">
                          {/* IN bar */}
                          <div className="flex flex-col items-center justify-end w-5">
                            <div
                              className="w-full rounded-t-sm bg-emerald-400 dark:bg-emerald-500 transition-all"
                              style={{ height: `${(d.inQty / maxVal) * 76}px`, minHeight: d.inQty > 0 ? '3px' : '0' }}
                              title={`IN: ${fmt(d.inQty)}`}
                            />
                          </div>
                          {/* OUT bar */}
                          <div className="flex flex-col items-center justify-end w-5">
                            <div
                              className="w-full rounded-t-sm bg-red-400 dark:bg-red-500 transition-all"
                              style={{ height: `${(d.outQty / maxVal) * 76}px`, minHeight: d.outQty > 0 ? '3px' : '0' }}
                              title={`OUT: ${fmt(d.outQty)}`}
                            />
                          </div>
                        </div>
                        <div className="text-[9px] text-gray-400 text-center leading-tight w-full truncate">{d.name}</div>
                      </div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />
                      {ar ? 'دخول' : 'Entrées'}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
                      {ar ? 'خروج' : 'Sorties'}
                    </span>
                  </div>
                </div>
              )}

              {/* Efficiency ratio */}
              {totalIn > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{ar ? 'نسبة استخدام المخزون' : 'Taux d\'utilisation du stock'}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round((totalOut / totalIn) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600"
                      style={{ width: `${Math.min(100, (totalOut / totalIn) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {ar ? `${fmt(totalOut)} وحدة تم تصريفها من أصل ${fmt(totalIn)} دخلت` : `${fmt(totalOut)} unités écoulées sur ${fmt(totalIn)} entrées`}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Product stock cards ── */}
        {products.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center py-12 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">{ar ? 'لا توجد منتجات في الكتالوج بعد' : 'Aucun produit dans le catalogue'}</p>
            <p className="text-xs mt-1 opacity-70">{ar ? 'أضف منتجات من لوحة التعاونية أولاً' : 'Ajoutez des produits depuis le tableau coopérative'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {products.map(p => {
              const qty = stockByProduct[p.id] ?? 0;
              const low = qty > 0 && qty < 10;
              const empty = qty <= 0;
              return (
                <div key={p.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 flex items-center gap-3 transition-shadow hover:shadow-sm ${empty ? 'border-gray-200 dark:border-gray-700' : low ? 'border-amber-300 dark:border-amber-700' : 'border-teal-200 dark:border-teal-700'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${empty ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : low ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-teal-100 dark:bg-teal-900/30 text-teal-600'}`}>
                    <Package size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">{p.name}</div>
                    <div className={`text-xl font-bold leading-tight ${empty ? 'text-gray-400' : low ? 'text-amber-600' : 'text-teal-600'}`}>
                      {fmt(qty)} <span className="text-xs font-normal text-gray-400">{p.unit}</span>
                    </div>
                    {empty && <div className="text-xs text-gray-400 mt-0.5">{ar ? 'لا يوجد مخزون' : 'Aucun stock'}</div>}
                    {low && !empty && <div className="text-xs text-amber-500 mt-0.5">{ar ? 'مخزون منخفض' : 'Stock bas'}</div>}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setStoreModal({ product: p, currentQty: qty }); setStoreQty(''); setStoreNotes(''); }}
                      disabled={qty <= 0}
                      className="flex flex-col items-center gap-0.5 px-2 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-medium transition-colors"
                    >
                      <ArrowDownToLine size={13} />
                      {ar ? 'متجر' : 'Magasin'}
                    </button>
                    <button
                      onClick={() => { setMovForm({ productId: p.id, type: 'IN', quantity: '', unitPrice: '', reference: '', notes: '' }); setMovModal(true); }}
                      className="flex flex-col items-center gap-0.5 px-2 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-medium transition-colors"
                    >
                      <Plus size={13} />
                      {ar ? 'إضافة' : 'Ajouter'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Transactions / Movements ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {ar ? 'سجل حركات المخزون' : 'Historique des mouvements'}
            </h3>
            {products.length > 0 && (
              <select
                value={movFilter}
                onChange={e => setMovFilter(e.target.value)}
                className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="">{ar ? 'كل المنتجات' : 'Tous les produits'}</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>

          {movements.filter(m => !movFilter || m.productId === movFilter).length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              {ar ? 'لا توجد حركات مخزون بعد' : 'Aucun mouvement de stock'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-start px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{ar ? 'التاريخ' : 'Date'}</th>
                    <th className="text-start px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{ar ? 'المنتج' : 'Produit'}</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{ar ? 'النوع' : 'Type'}</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{ar ? 'الكمية' : 'Quantité'}</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{ar ? 'س. الوحدة' : 'P. Unit.'}</th>
                    <th className="text-start px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{ar ? 'المرجع / ملاحظة' : 'Réf / Note'}</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {movements.filter(m => !movFilter || m.productId === movFilter).map(m => {
                    const typeMap: Record<string, { label: string; labelAr: string; cls: string }> = {
                      IN:     { label: 'Entrée',   labelAr: 'دخول',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
                      OUT:    { label: 'Sortie',   labelAr: 'خروج',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                      ADJUST: { label: 'Ajust.',   labelAr: 'تسوية',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                    };
                    const t = typeMap[m.type] || typeMap.IN;
                    const isStoreShipment = m.reference === 'STORE_SHIPMENT';
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                        <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(m.date).toLocaleDateString(ar ? 'ar-MA' : 'fr-FR')}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-gray-900 dark:text-white text-xs">
                            {(m as any).product?.name || products.find(p => p.id === m.productId)?.name || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.cls}`}>
                            {ar ? t.labelAr : t.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-semibold text-sm">
                          <span className={m.type === 'IN' ? 'text-emerald-600' : m.type === 'OUT' ? 'text-red-500' : 'text-blue-600'}>
                            {m.type === 'IN' ? '+' : m.type === 'OUT' ? '−' : ''}{fmt(m.quantity)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400">
                          {m.unitPrice ? `${fmt(m.unitPrice)} MAD` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 max-w-[160px] truncate">
                          {isStoreShipment
                            ? <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400"><ArrowDownToLine size={11} />{ar ? 'إرسال للمتجر' : 'Envoi magasin'}</span>
                            : (m.reference || m.notes || '—')}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={async () => { if (confirm(ar ? 'حذف هذه الحركة؟' : 'Supprimer ce mouvement ?')) { await coopApi.deleteMovement(m.id); load(); } }}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals footer */}
          {movements.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-6 text-xs">
              <div>
                <span className="text-gray-400">{ar ? 'إجمالي الدخول:' : 'Total entrées:'}</span>
                <span className="font-bold text-emerald-600 ms-1">
                  +{fmt(movements.filter(m => m.type === 'IN' && (!movFilter || m.productId === movFilter)).reduce((s, m) => s + m.quantity, 0))}
                </span>
              </div>
              <div>
                <span className="text-gray-400">{ar ? 'إجمالي الخروج:' : 'Total sorties:'}</span>
                <span className="font-bold text-red-500 ms-1">
                  −{fmt(movements.filter(m => m.type === 'OUT' && (!movFilter || m.productId === movFilter)).reduce((s, m) => s + m.quantity, 0))}
                </span>
              </div>
              <div>
                <span className="text-gray-400">{ar ? 'عدد الحركات:' : 'Nb mouvements:'}</span>
                <span className="font-bold text-gray-700 dark:text-gray-300 ms-1">
                  {movements.filter(m => !movFilter || m.productId === movFilter).length}
                </span>
              </div>
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
                  onClick={() => { setPickerSearch(''); setPickerOpen(true); }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  <Plus size={12} />{ar ? 'إضافة منتج' : 'Ajouter produit'}
                </button>
              </div>

              {form.inputs.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">{ar ? 'لا توجد مواد — أضف مادة لحساب التكلفة تلقائياً' : 'Aucune matière — ajoutez-en pour calculer le coût auto'}</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {form.inputs.map((inp, i) => {
                    const rowTotal = (parseFloat(inp.quantity) || 0) * (parseFloat(inp.unitPrice) || 0);
                    return (
                      <div key={i} className="px-4 py-3 space-y-2">
                        {/* Row 1: product name + delete */}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                            <Package size={12} className="text-teal-600 dark:text-teal-400" />
                          </div>
                          {inp.productId ? (
                            <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{inp.description}</span>
                          ) : (
                            <input
                              placeholder={ar ? 'اسم المادة الأولية' : 'Nom de la matière'}
                              value={inp.description}
                              onChange={e => { const next = [...form.inputs]; next[i] = { ...next[i], description: e.target.value }; updateInputs(next); }}
                              className={`${inputField} flex-1`}
                            />
                          )}
                          <button onClick={() => updateInputs(form.inputs.filter((_, j) => j !== i))} className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex-shrink-0"><X size={14} /></button>
                        </div>
                        {/* Row 2: qty + unit + price + total */}
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-gray-400 uppercase">{ar ? 'الكمية' : 'Quantité'}</div>
                            <input
                              type="number" min="0" placeholder="0"
                              value={inp.quantity}
                              onChange={e => { const next = [...form.inputs]; next[i] = { ...next[i], quantity: e.target.value }; updateInputs(next); }}
                              className={inputField}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-gray-400 uppercase">{ar ? 'الوحدة' : 'Unité'}</div>
                            <input
                              placeholder={ar ? 'كغ، ل...' : 'kg, l...'}
                              value={inp.unit}
                              onChange={e => { const next = [...form.inputs]; next[i] = { ...next[i], unit: e.target.value }; updateInputs(next); }}
                              className={inputField}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-amber-500 uppercase">{ar ? 'السعر (MAD)' : 'Prix (MAD)'}</div>
                            <div className="relative">
                              <input
                                type="number" min="0" placeholder="0.00"
                                value={inp.unitPrice}
                                onChange={e => { const next = [...form.inputs]; next[i] = { ...next[i], unitPrice: e.target.value }; updateInputs(next); }}
                                className={`${inputField} border-amber-300 dark:border-amber-700 focus:border-amber-500 focus:ring-amber-500 bg-amber-50 dark:bg-amber-900/10`}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-gray-400 uppercase">{ar ? 'المجموع' : 'Total'}</div>
                            <div className={`px-2 py-1.5 rounded-lg text-xs font-bold text-center ${rowTotal > 0 ? 'bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                              {rowTotal > 0 ? `${fmt(rowTotal)} MAD` : '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Total footer */}
                  <div className={`flex items-center justify-end gap-3 px-4 py-3 ${costIsAuto ? 'bg-teal-50 dark:bg-teal-900/10' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{ar ? 'إجمالي تكلفة المواد:' : 'Total matières:'}</span>
                    <span className={`text-base font-bold ${costIsAuto ? 'text-teal-700 dark:text-teal-400' : 'text-gray-400'}`}>
                      {costIsAuto ? `${fmt(inputsAutoTotal)} MAD` : (ar ? 'أدخل الأسعار' : 'Saisir les prix')}
                    </span>
                  </div>
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

      {/* Manual Movement Modal */}
      {movModal && (
        <Modal title={ar ? 'إضافة حركة مخزون' : 'Ajouter un mouvement de stock'} onClose={() => setMovModal(false)}>
          <div className="space-y-3">
            <div>
              <label className={label}>{ar ? 'المنتج *' : 'Produit *'}</label>
              <select value={movForm.productId} onChange={e => setMovForm(f => ({ ...f, productId: e.target.value }))} className={field}>
                <option value="">{ar ? '-- اختر منتجاً --' : '-- Choisir un produit --'}</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>{ar ? 'نوع الحركة *' : 'Type *'}</label>
                <select value={movForm.type} onChange={e => setMovForm(f => ({ ...f, type: e.target.value }))} className={field}>
                  <option value="IN">{ar ? 'دخول (إضافة)' : 'Entrée (ajout)'}</option>
                  <option value="OUT">{ar ? 'خروج (سحب)' : 'Sortie (retrait)'}</option>
                  <option value="ADJUST">{ar ? 'تسوية' : 'Ajustement'}</option>
                </select>
              </div>
              <div>
                <label className={label}>{ar ? 'الكمية *' : 'Quantité *'}</label>
                <input type="number" min="0" placeholder="0" value={movForm.quantity} onChange={e => setMovForm(f => ({ ...f, quantity: e.target.value }))} className={field} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>{ar ? 'سعر الوحدة (MAD)' : 'Prix unitaire (MAD)'}</label>
                <input type="number" min="0" placeholder="0" value={movForm.unitPrice} onChange={e => setMovForm(f => ({ ...f, unitPrice: e.target.value }))} className={field} />
              </div>
              <div>
                <label className={label}>{ar ? 'المرجع' : 'Référence'}</label>
                <input placeholder={ar ? 'رقم طلب، فاتورة...' : 'N° bon, facture...'} value={movForm.reference} onChange={e => setMovForm(f => ({ ...f, reference: e.target.value }))} className={field} />
              </div>
            </div>
            <div>
              <label className={label}>{ar ? 'ملاحظات' : 'Notes'}</label>
              <textarea rows={2} value={movForm.notes} onChange={e => setMovForm(f => ({ ...f, notes: e.target.value }))} className={field} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMovModal(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                {ar ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                onClick={addMovement}
                disabled={!movForm.productId || !movForm.quantity || parseFloat(movForm.quantity) <= 0}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {ar ? 'حفظ الحركة' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Product Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                {ar ? 'اختر منتجاً موجوداً' : 'Sélectionner un produit existant'}
              </h3>
              <button onClick={() => setPickerOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><X size={18} /></button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder={ar ? 'ابحث عن منتج...' : 'Rechercher un produit...'}
                  className="w-full ps-9 pe-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {products.filter(p => !pickerSearch || p.name.toLowerCase().includes(pickerSearch.toLowerCase())).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">{ar ? 'لا توجد نتائج' : 'Aucun résultat'}</div>
              ) : (
                products
                  .filter(p => !pickerSearch || p.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map(p => {
                    const alreadyAdded = form.inputs.some(i => i.productId === p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (!alreadyAdded) {
                            updateInputs([...form.inputs, { description: p.name, productId: p.id, quantity: '1', unit: p.unit, unitPrice: '' }]);
                          }
                          setPickerOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-start transition-colors ${alreadyAdded ? 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/20 opacity-60 cursor-default' : 'border-gray-200 dark:border-gray-700 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/10'}`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                          <Package size={16} className="text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.unit}</div>
                        </div>
                        {alreadyAdded ? (
                          <span className="text-xs text-teal-600 dark:text-teal-400 flex-shrink-0">{ar ? 'مضاف' : 'Ajouté'}</span>
                        ) : (
                          <Plus size={16} className="text-teal-500 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })
              )}
            </div>

            {/* Add custom material (free text) */}
            <div className="p-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => {
                  updateInputs([...form.inputs, { description: pickerSearch, productId: '', quantity: '1', unit: 'kg', unitPrice: '' }]);
                  setPickerOpen(false);
                }}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-teal-400 hover:text-teal-600 text-sm transition-colors"
              >
                <Plus size={15} />
                {pickerSearch
                  ? (ar ? `إضافة "${pickerSearch}" كمادة مخصصة` : `Ajouter "${pickerSearch}" comme matière libre`)
                  : (ar ? 'إضافة مادة مخصصة (بدون منتج)' : 'Ajouter une matière libre')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
