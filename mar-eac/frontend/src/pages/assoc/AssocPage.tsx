import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Trash2, Pencil, Package, Factory, ShoppingBag,
  TrendingUp, AlertTriangle, CheckCircle, BarChart2,
  Banknote, Archive, ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react';
import { assocApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

type Tab = 'dashboard' | 'products' | 'production' | 'sales' | 'stock';

const CATEGORIES_FR = ['Alimentaire', 'Artisanat', 'Agriculture', 'Textile', 'Cosmétique', 'Autre'];
const CATEGORIES_AR = ['غذائي', 'صناعة تقليدية', 'فلاحي', 'نسيج', 'تجميل', 'أخرى'];

const fmtCurrency = (n: number) => `${(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-MA');
const fmtQty = (n: number, unit: string) => `${n % 1 === 0 ? n : n.toFixed(2)} ${unit}`;

const StockBadge = ({ level, stock, unit }: { level: string; stock: number; unit: string }) => {
  const cfg: Record<string, { cls: string; label: string }> = {
    empty:  { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',   label: 'Épuisé / نفذ' },
    low:    { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',     label: 'Faible / منخفض' },
    normal: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Normal / عادي' },
    high:   { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Élevé / مرتفع' },
  };
  const { cls, label } = cfg[level] || cfg.normal;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {stock % 1 === 0 ? stock : stock.toFixed(2)} {unit} — {label}
    </span>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="card p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

export default function AssocPage() {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<Tab>('dashboard');

  // Data
  const [stats, setStats]         = useState<any>(null);
  const [products, setProducts]   = useState<any[]>([]);
  const [productions, setProductions] = useState<any[]>([]);
  const [sales, setSales]         = useState<any[]>([]);
  const [stock, setStock]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  // Modals
  const [showProductModal, setShowProductModal]   = useState(false);
  const [showProdModal, setShowProdModal]         = useState(false);
  const [showSaleModal, setShowSaleModal]         = useState(false);
  const [editingProduct, setEditingProduct]       = useState<any>(null);
  const [deleteTarget, setDeleteTarget]           = useState<{ type: string; id: string } | null>(null);
  const [deleting, setDeleting]                   = useState(false);

  // Forms
  const emptyProduct = { name: '', nameAr: '', category: '', unit: 'kg', price: '', lowStockAlert: '10', description: '' };
  const emptyProd    = { productId: '', quantityProduced: '', productionCost: '', date: '', notes: '' };
  const emptySale    = { productId: '', quantity: '', unitPrice: '', date: '', customer: '', notes: '' };
  const [productForm, setProductForm] = useState(emptyProduct);
  const [prodForm, setProdForm]       = useState(emptyProd);
  const [saleForm, setSaleForm]       = useState(emptySale);

  const load = useCallback(async () => {
    try {
      const [s, p, st] = await Promise.all([assocApi.getStats(), assocApi.getProducts(), assocApi.getStock()]);
      setStats(s.data); setProducts(p.data); setStock(st.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'production') assocApi.getProductions().then(r => setProductions(r.data)); }, [tab]);
  useEffect(() => { if (tab === 'sales') assocApi.getSales().then(r => setSales(r.data)); }, [tab]);
  useEffect(() => { if (tab === 'stock') assocApi.getStock().then(r => setStock(r.data)); }, [tab]);

  // ── Product handlers ───────────────────────────────────────────────────────
  const openProductModal = (p?: any) => {
    setEditingProduct(p || null);
    setProductForm(p ? { name: p.name, nameAr: p.nameAr || '', category: p.category || '', unit: p.unit, price: String(p.price), lowStockAlert: String(p.lowStockAlert), description: p.description || '' } : emptyProduct);
    setShowProductModal(true);
  };
  const saveProduct = async () => {
    if (!productForm.name.trim()) return alert(lang === 'ar' ? 'الاسم مطلوب' : 'Nom requis');
    setSaving(true);
    try {
      if (editingProduct) {
        const res = await assocApi.updateProduct(editingProduct.id, productForm);
        setProducts(p => p.map(x => x.id === editingProduct.id ? { ...res.data, stock: x.stock } : x));
      } else {
        const res = await assocApi.createProduct(productForm);
        setProducts(p => [...p, res.data]);
        setStats((s: any) => s ? { ...s, productCount: s.productCount + 1 } : s);
      }
      setShowProductModal(false);
      assocApi.getStock().then(r => setStock(r.data));
    } catch { alert(lang === 'ar' ? 'حدث خطأ' : 'Erreur'); }
    finally { setSaving(false); }
  };

  // ── Production handlers ────────────────────────────────────────────────────
  const saveProd = async () => {
    if (!prodForm.productId || !prodForm.quantityProduced) return alert(lang === 'ar' ? 'الحقول المطلوبة ناقصة' : 'Champs requis manquants');
    setSaving(true);
    try {
      const res = await assocApi.createProduction(prodForm);
      setProductions(p => [res.data, ...p]);
      setProducts(prev => prev.map(p => p.id === prodForm.productId ? { ...p, stock: (p.stock || 0) + parseFloat(prodForm.quantityProduced) } : p));
      assocApi.getStats().then(r => setStats(r.data));
      assocApi.getStock().then(r => setStock(r.data));
      setShowProdModal(false); setProdForm(emptyProd);
    } catch { alert(lang === 'ar' ? 'حدث خطأ' : 'Erreur'); }
    finally { setSaving(false); }
  };

  // ── Sale handlers ──────────────────────────────────────────────────────────
  const saveSale = async () => {
    if (!saleForm.productId || !saleForm.quantity || !saleForm.unitPrice) return alert(lang === 'ar' ? 'الحقول المطلوبة ناقصة' : 'Champs requis manquants');
    setSaving(true);
    try {
      const res = await assocApi.createSale(saleForm);
      setSales(s => [res.data, ...s]);
      setProducts(prev => prev.map(p => p.id === saleForm.productId ? { ...p, stock: (p.stock || 0) - parseFloat(saleForm.quantity) } : p));
      assocApi.getStats().then(r => setStats(r.data));
      assocApi.getStock().then(r => setStock(r.data));
      setShowSaleModal(false); setSaleForm(emptySale);
    } catch (e: any) { alert(e?.response?.data?.message || (lang === 'ar' ? 'حدث خطأ' : 'Erreur')); }
    finally { setSaving(false); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'product') { await assocApi.deleteProduct(deleteTarget.id); setProducts(p => p.filter(x => x.id !== deleteTarget.id)); }
      if (deleteTarget.type === 'production') { await assocApi.deleteProduction(deleteTarget.id); setProductions(p => p.filter(x => x.id !== deleteTarget.id)); }
      if (deleteTarget.type === 'sale') { await assocApi.deleteSale(deleteTarget.id); setSales(s => s.filter(x => x.id !== deleteTarget.id)); }
      assocApi.getStock().then(r => setStock(r.data));
      assocApi.getStats().then(r => setStats(r.data));
    } catch { alert(lang === 'ar' ? 'حدث خطأ' : 'Erreur'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const categories = lang === 'ar' ? CATEGORIES_AR : CATEGORIES_FR;
  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard',  label: lang === 'ar' ? 'لوحة القيادة' : 'Tableau de bord', icon: <BarChart2 size={14} /> },
    { key: 'products',   label: lang === 'ar' ? 'المنتجات' : 'Produits',           icon: <Package size={14} /> },
    { key: 'production', label: lang === 'ar' ? 'الإنتاج' : 'Production',          icon: <Factory size={14} /> },
    { key: 'sales',      label: lang === 'ar' ? 'المبيعات' : 'Ventes',             icon: <ShoppingBag size={14} /> },
    { key: 'stock',      label: lang === 'ar' ? 'المخزون' : 'Stock',               icon: <Archive size={14} /> },
  ];

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="page-title flex items-center gap-2">
          <ShoppingBag size={22} className="text-emerald-600 dark:text-emerald-400" />
          {lang === 'ar' ? 'الإنتاج والمبيعات' : 'Production & Ventes'}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowProdModal(true)} className="btn-secondary text-sm flex items-center gap-1.5">
            <Factory size={15} />{lang === 'ar' ? 'تسجيل إنتاج' : 'Enregistrer production'}
          </button>
          <button onClick={() => setShowSaleModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <ShoppingBag size={15} />{lang === 'ar' ? 'تسجيل بيع' : 'Enregistrer vente'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title={lang === 'ar' ? 'المنتجات النشطة' : 'Produits actifs'} value={stats?.productCount ?? 0} icon={<Package size={18} />} color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
        <StatCard title={lang === 'ar' ? 'تكلفة الإنتاج' : 'Coût de production'} value={fmtCurrency(stats?.totalProductionCost ?? 0)} icon={<Factory size={18} />} color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
        <StatCard title={lang === 'ar' ? 'رقم المعاملات' : 'Chiffre d\'affaires'} value={fmtCurrency(stats?.totalRevenue ?? 0)} icon={<Banknote size={18} />} color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
        <StatCard title={lang === 'ar' ? 'الربح الصافي' : 'Bénéfice net'} value={fmtCurrency((stats?.totalRevenue ?? 0) - (stats?.totalProductionCost ?? 0))} icon={<TrendingUp size={18} />} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === t.key ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock alerts */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              {lang === 'ar' ? 'تنبيهات المخزون' : 'Alertes de stock'}
            </h3>
            {stock.filter(s => s.level === 'empty' || s.level === 'low').length === 0 ? (
              <p className="text-sm text-gray-400 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" />{lang === 'ar' ? 'المخزون بخير' : 'Stock en bon état'}</p>
            ) : stock.filter(s => s.level === 'empty' || s.level === 'low').map(s => (
              <div key={s.id} className={`flex items-center justify-between py-2 border-b last:border-0 border-gray-100 dark:border-gray-700`}>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.name}</span>
                <StockBadge level={s.level} stock={s.currentStock} unit={s.unit} />
              </div>
            ))}
          </div>

          {/* Top products by revenue */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              {lang === 'ar' ? 'أفضل المنتجات مبيعاً' : 'Meilleures ventes'}
            </h3>
            {stock.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-100 dark:border-gray-700">
                <div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{fmtQty(s.totalSold, s.unit)}</span>
                </div>
                <span className="text-sm font-bold text-emerald-600">{fmtCurrency(s.totalRevenue)}</span>
              </div>
            ))}
            {stock.length === 0 && <p className="text-sm text-gray-400">{lang === 'ar' ? 'لا توجد بيانات' : 'Aucune donnée'}</p>}
          </div>
        </div>
      )}

      {/* ── PRODUCTS ──────────────────────────────────────────────────────── */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openProductModal()} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus size={15} />{lang === 'ar' ? 'منتج جديد' : 'Nouveau produit'}
            </button>
          </div>
          {products.length === 0 ? (
            <div className="card p-12 text-center">
              <Package size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">{lang === 'ar' ? 'لا توجد منتجات بعد' : 'Aucun produit pour l\'instant'}</p>
              <button onClick={() => openProductModal()} className="btn-primary mt-4 mx-auto"><Plus size={16} />{lang === 'ar' ? 'إضافة منتج' : 'Ajouter un produit'}</button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {[lang === 'ar' ? 'المنتج' : 'Produit', lang === 'ar' ? 'الفئة' : 'Catégorie', lang === 'ar' ? 'الوحدة' : 'Unité', lang === 'ar' ? 'السعر' : 'Prix', lang === 'ar' ? 'المخزون الحالي' : 'Stock actuel', ''].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {products.map(p => {
                    const s = stock.find(s => s.id === p.id);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                          {p.nameAr && <div className="text-xs text-gray-400">{p.nameAr}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.category || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.unit}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{fmtCurrency(p.price)}</td>
                        <td className="px-4 py-3">
                          {s ? <StockBadge level={s.level} stock={s.currentStock} unit={s.unit} /> : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openProductModal(p)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteTarget({ type: 'product', id: p.id })} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCTION ────────────────────────────────────────────────────── */}
      {tab === 'production' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowProdModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus size={15} />{lang === 'ar' ? 'تسجيل إنتاج' : 'Enregistrer production'}
            </button>
          </div>
          {productions.length === 0 ? (
            <div className="card p-12 text-center">
              <Factory size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">{lang === 'ar' ? 'لا توجد عمليات إنتاج بعد' : 'Aucune production enregistrée'}</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {[lang === 'ar' ? 'المنتج' : 'Produit', lang === 'ar' ? 'الكمية المنتجة' : 'Quantité produite', lang === 'ar' ? 'تكلفة الإنتاج' : 'Coût de production', lang === 'ar' ? 'التاريخ' : 'Date', lang === 'ar' ? 'ملاحظات' : 'Notes', ''].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {productions.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.product?.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <ArrowUpCircle size={14} />{fmtQty(p.quantityProduced, p.product?.unit)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtCurrency(p.productionCost)}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(p.date)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{p.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDeleteTarget({ type: 'production', id: p.id })} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SALES ─────────────────────────────────────────────────────────── */}
      {tab === 'sales' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowSaleModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus size={15} />{lang === 'ar' ? 'تسجيل بيع' : 'Enregistrer vente'}
            </button>
          </div>
          {sales.length === 0 ? (
            <div className="card p-12 text-center">
              <ShoppingBag size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">{lang === 'ar' ? 'لا توجد مبيعات بعد' : 'Aucune vente enregistrée'}</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {[lang === 'ar' ? 'المنتج' : 'Produit', lang === 'ar' ? 'الكمية' : 'Quantité', lang === 'ar' ? 'سعر الوحدة' : 'Prix unitaire', lang === 'ar' ? 'المجموع' : 'Total', lang === 'ar' ? 'الزبون' : 'Client', lang === 'ar' ? 'التاريخ' : 'Date', ''].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {sales.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.product?.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                          <ArrowDownCircle size={14} />{fmtQty(s.quantity, s.product?.unit)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtCurrency(s.unitPrice)}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(s.totalAmount)}</td>
                      <td className="px-4 py-3 text-gray-500">{s.customer || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(s.date)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDeleteTarget({ type: 'sale', id: s.id })} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STOCK ─────────────────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { level: 'empty',  label: lang === 'ar' ? 'نفذ' : 'Épuisé',  cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
              { level: 'low',    label: lang === 'ar' ? 'منخفض' : 'Faible', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
              { level: 'normal', label: lang === 'ar' ? 'عادي' : 'Normal',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
              { level: 'high',   label: lang === 'ar' ? 'مرتفع' : 'Élevé',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
            ].map(l => (
              <span key={l.level} className={`text-xs font-semibold px-3 py-1 rounded-full ${l.cls}`}>
                {stock.filter(s => s.level === l.level).length} {l.label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stock.map(s => {
              const pct = s.totalProduced > 0 ? Math.min(100, (s.currentStock / s.totalProduced) * 100) : 0;
              const barColor = { empty: 'bg-gray-300', low: 'bg-red-500', normal: 'bg-amber-400', high: 'bg-emerald-500' }[s.level as string] || 'bg-emerald-500';
              return (
                <div key={s.id} className="card p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{s.name}</h4>
                      {s.category && <span className="text-xs text-gray-400">{s.category}</span>}
                    </div>
                    <StockBadge level={s.level} stock={s.currentStock} unit={s.unit} />
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{lang === 'ar' ? 'المخزون الحالي' : 'Stock actuel'}</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100 dark:border-gray-700 text-center">
                    <div>
                      <p className="text-xs text-gray-400">{lang === 'ar' ? 'منتَج' : 'Produit'}</p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{s.totalProduced % 1 === 0 ? s.totalProduced : s.totalProduced.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{lang === 'ar' ? 'مباع' : 'Vendu'}</p>
                      <p className="text-sm font-bold text-red-500">{s.totalSold % 1 === 0 ? s.totalSold : s.totalSold.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{lang === 'ar' ? 'الإيراد' : 'CA'}</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{(s.totalRevenue / 1000).toFixed(1)}K</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {stock.length === 0 && (
            <div className="card p-12 text-center">
              <Archive size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">{lang === 'ar' ? 'أضف منتجات أولاً' : 'Ajoutez des produits d\'abord'}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS ─────────────────────────────────────────────────────────── */}

      {/* Product Modal */}
      <Modal isOpen={showProductModal} onClose={() => setShowProductModal(false)}
        title={editingProduct ? (lang === 'ar' ? 'تعديل المنتج' : 'Modifier le produit') : (lang === 'ar' ? 'منتج جديد' : 'Nouveau produit')}
        footer={<><button onClick={() => setShowProductModal(false)} className="btn-secondary">{lang === 'ar' ? 'إلغاء' : 'Annuler'}</button><button onClick={saveProduct} disabled={saving} className="btn-primary">{saving ? '...' : (lang === 'ar' ? 'حفظ' : 'Enregistrer')}</button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{lang === 'ar' ? 'الاسم (فرنسية) *' : 'Nom (FR) *'}</label>
              <input className="input" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Couscous fin" />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'الاسم (عربية)' : 'Nom (AR)'}</label>
              <input className="input" dir="rtl" value={productForm.nameAr} onChange={e => setProductForm(f => ({ ...f, nameAr: e.target.value }))} placeholder="مثال: كسكس ناعم" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{lang === 'ar' ? 'الفئة' : 'Catégorie'}</label>
              <select className="input" value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">{lang === 'ar' ? '— اختر فئة —' : '— Choisir —'}</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'وحدة القياس' : 'Unité de mesure'}</label>
              <select className="input" value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))}>
                {['kg', 'g', 'L', 'unité', 'boîte', 'sac', 'paquet'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{lang === 'ar' ? 'سعر البيع (MAD)' : 'Prix de vente (MAD)'}</label>
              <input className="input" type="number" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'تنبيه مخزون منخفض' : 'Seuil d\'alerte stock bas'}</label>
              <input className="input" type="number" min="0" step="0.1" value={productForm.lowStockAlert} onChange={e => setProductForm(f => ({ ...f, lowStockAlert: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'الوصف' : 'Description'}</label>
            <textarea className="input" rows={2} value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Production Modal */}
      <Modal isOpen={showProdModal} onClose={() => setShowProdModal(false)}
        title={lang === 'ar' ? 'تسجيل عملية إنتاج' : 'Enregistrer une production'}
        footer={<><button onClick={() => setShowProdModal(false)} className="btn-secondary">{lang === 'ar' ? 'إلغاء' : 'Annuler'}</button><button onClick={saveProd} disabled={saving} className="btn-primary">{saving ? '...' : (lang === 'ar' ? 'حفظ' : 'Enregistrer')}</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">{lang === 'ar' ? 'المنتج *' : 'Produit *'}</label>
            <select className="input" value={prodForm.productId} onChange={e => setProdForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">{lang === 'ar' ? '— اختر منتجاً —' : '— Choisir un produit —'}</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{lang === 'ar' ? 'الكمية المنتجة *' : 'Quantité produite *'}</label>
              <input className="input" type="number" min="0" step="0.1" value={prodForm.quantityProduced} onChange={e => setProdForm(f => ({ ...f, quantityProduced: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'تكلفة الإنتاج (MAD)' : 'Coût de production (MAD)'}</label>
              <input className="input" type="number" min="0" step="0.01" value={prodForm.productionCost} onChange={e => setProdForm(f => ({ ...f, productionCost: e.target.value }))} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
            <input className="input" type="date" value={prodForm.date} onChange={e => setProdForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
            <input className="input" value={prodForm.notes} onChange={e => setProdForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Sale Modal */}
      <Modal isOpen={showSaleModal} onClose={() => setShowSaleModal(false)}
        title={lang === 'ar' ? 'تسجيل عملية بيع' : 'Enregistrer une vente'}
        footer={<><button onClick={() => setShowSaleModal(false)} className="btn-secondary">{lang === 'ar' ? 'إلغاء' : 'Annuler'}</button><button onClick={saveSale} disabled={saving} className="btn-primary">{saving ? '...' : (lang === 'ar' ? 'حفظ' : 'Enregistrer')}</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">{lang === 'ar' ? 'المنتج *' : 'Produit *'}</label>
            <select className="input" value={saleForm.productId} onChange={e => {
              const p = products.find(x => x.id === e.target.value);
              setSaleForm(f => ({ ...f, productId: e.target.value, unitPrice: p ? String(p.price) : f.unitPrice }));
            }}>
              <option value="">{lang === 'ar' ? '— اختر منتجاً —' : '— Choisir un produit —'}</option>
              {products.map(p => {
                const s = stock.find(s => s.id === p.id);
                return <option key={p.id} value={p.id}>{p.name} — {lang === 'ar' ? 'المخزون' : 'Stock'}: {s ? s.currentStock.toFixed(1) : 0} {p.unit}</option>;
              })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{lang === 'ar' ? 'الكمية *' : 'Quantité *'}</label>
              <input className="input" type="number" min="0" step="0.1" value={saleForm.quantity} onChange={e => setSaleForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'سعر الوحدة (MAD) *' : 'Prix unitaire (MAD) *'}</label>
              <input className="input" type="number" min="0" step="0.01" value={saleForm.unitPrice} onChange={e => setSaleForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="0.00" />
            </div>
          </div>
          {saleForm.quantity && saleForm.unitPrice && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-emerald-700 dark:text-emerald-300">{lang === 'ar' ? 'المجموع' : 'Total'}</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-lg">{fmtCurrency(parseFloat(saleForm.quantity || '0') * parseFloat(saleForm.unitPrice || '0'))}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{lang === 'ar' ? 'الزبون' : 'Client'}</label>
              <input className="input" value={saleForm.customer} onChange={e => setSaleForm(f => ({ ...f, customer: e.target.value }))} placeholder={lang === 'ar' ? 'اسم الزبون' : 'Nom du client'} />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
              <input className="input" type="date" value={saleForm.date} onChange={e => setSaleForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
            <input className="input" value={saleForm.notes} onChange={e => setSaleForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={lang === 'ar' ? 'تأكيد الحذف' : 'Confirmer la suppression'}
        message={lang === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Confirmer la suppression ?'}
        loading={deleting}
      />
    </div>
  );
}
