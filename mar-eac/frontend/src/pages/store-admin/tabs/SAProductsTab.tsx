import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { storeManagerApi } from '../../../lib/api';

interface SAProduct {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  category?: string;
  sku?: string;
  costPrice: number;
  sellingPrice: number;
  commission: number;
  unit: string;
  imageUrl?: string;
  isActive: boolean;
  stock: number;
  organization: { id: string; name: string; nameAr?: string };
}

interface Org { id: string; name: string; nameAr?: string }

const CATEGORY_EMOJI: Record<string, string> = {
  'زيت أركان': '🫒', 'العسل': '🍯', 'الزعفران': '🌸',
  'المنسوجات والسجاد': '🪡', 'الفخار والخزف': '🏺',
  'منتجات التجميل الطبيعية': '💄', 'التمر': '🌴', 'منتجات الجلد': '👜',
};

const emptyForm = {
  organizationId: '', name: '', nameAr: '', description: '', category: '',
  sku: '', costPrice: '', sellingPrice: '', commission: '', unit: 'pièce',
  imageUrl: '', isActive: true, initialStock: '',
};

export function SAProductsTab() {
  const [products, setProducts]   = useState<SAProduct[]>([]);
  const [orgs, setOrgs]           = useState<Org[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrg, setFilterOrg] = useState('');

  const [panelOpen, setPanelOpen]   = useState(false);
  const [editing, setEditing]       = useState<SAProduct | null>(null);
  const [form, setForm]             = useState({ ...emptyForm });
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await storeManagerApi.getProducts({
        search: searchQuery, category: filterCat, status: filterStatus,
        orgId: filterOrg, page, limit: 20,
      });
      setProducts(r.data.products);
      setTotal(r.data.total);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCat, filterStatus, filterOrg, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    storeManagerApi.getCommerceOrgs().then(r => setOrgs(r.data));
  }, []);

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setPanelOpen(true);
  };

  const openEdit = (p: SAProduct) => {
    setEditing(p);
    setForm({
      organizationId: p.organization.id,
      name: p.name, nameAr: p.nameAr || '', description: p.description || '',
      category: p.category || '', sku: p.sku || '',
      costPrice: String(p.costPrice), sellingPrice: String(p.sellingPrice),
      commission: String(p.commission), unit: p.unit,
      imageUrl: p.imageUrl || '', isActive: p.isActive, initialStock: '',
    });
    setPanelOpen(true);
  };

  const handleToggle = async (p: SAProduct) => {
    await storeManagerApi.toggleProduct(p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('تأكيد الحذف؟')) return;
    await storeManagerApi.deleteProduct(id);
    load();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await storeManagerApi.updateProduct(editing.id, form);
      } else {
        await storeManagerApi.createProduct(form);
      }
      setPanelOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const f = (key: keyof typeof form, val: any) => setForm(prev => ({ ...prev, [key]: val }));
  const margin = form.sellingPrice && form.costPrice
    ? (parseFloat(form.sellingPrice) - parseFloat(form.costPrice)).toFixed(2)
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">المنتجات</h1>
          <p className="text-xs text-gray-500 mt-0.5">{total} منتج إجمالاً</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> إضافة منتج
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1 flex-1 min-w-[200px]">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearchQuery(search); setPage(1); } }}
            placeholder="بحث..."
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
          <button onClick={() => { setSearchQuery(search); setPage(1); }}
            className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
            🔍
          </button>
        </div>
        <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">كل الفئات</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">مخفي</option>
        </select>
        <select value={filterOrg} onChange={e => { setFilterOrg(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">كل التعاونيات</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.nameAr || o.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="hidden md:grid grid-cols-[40px_48px_1fr_100px_90px_80px_70px_60px] gap-0 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          {['', 'صورة', 'المنتج', 'الفئة', 'السعر', 'المخزون', 'الحالة', ''].map((h, i) => (
            <div key={i} className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">لا توجد منتجات</div>
        ) : (
          products.map(p => {
            const emoji = (p.category && CATEGORY_EMOJI[p.category]) || '📦';
            const stockBadge = p.stock <= 0
              ? { cls: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400', label: '✗ نفد' }
              : p.stock <= 5
              ? { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400', label: `⚠ ${p.stock}` }
              : { cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', label: `✓ ${p.stock}` };

            return (
              <div key={p.id}
                className={`grid grid-cols-[40px_48px_1fr] md:grid-cols-[40px_48px_1fr_100px_90px_80px_70px_60px] gap-0 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0 items-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!p.isActive ? 'opacity-60' : ''}`}>
                <div><input type="checkbox" className="w-3.5 h-3.5 accent-indigo-600" /></div>
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0">
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : emoji}
                </div>
                <div className="px-2 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.nameAr || p.name}</p>
                  <p className="text-xs text-gray-400 truncate">{p.name}</p>
                  {p.sku && <span className="inline-block text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded text-[10px] mt-0.5">{p.sku}</span>}
                </div>
                <div className="hidden md:block">
                  {p.category && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg">{p.category}</span>}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white">{p.sellingPrice} <span className="text-xs font-normal text-gray-400">د.م</span></p>
                  <p className="text-xs text-gray-400">تكلفة: {p.costPrice}</p>
                </div>
                <div className="hidden md:block">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${stockBadge.cls}`}>{stockBadge.label}</span>
                </div>
                <div className="hidden md:block">
                  <label className="relative inline-block w-9 h-5 cursor-pointer">
                    <input type="checkbox" className="sr-only" checked={p.isActive} onChange={() => handleToggle(p)} />
                    <span className={`block w-full h-full rounded-full transition-colors ${p.isActive ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </span>
                  </label>
                </div>
                <div className="flex gap-1 justify-end">
                  <button onClick={() => openEdit(p)}
                    className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
          <span>عرض {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} من {total}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
              السابق
            </button>
            <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold">{page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
              التالي
            </button>
          </div>
        </div>
      )}

      {/* Edit / Add panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/40" onClick={e => { if (e.target === e.currentTarget) setPanelOpen(false); }}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 h-full overflow-y-auto shadow-2xl flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <h2 className="font-black text-gray-900 dark:text-white">
                {editing ? '✏️ تعديل المنتج' : '+ إضافة منتج'}
              </h2>
              <button onClick={() => setPanelOpen(false)} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 p-5 space-y-5">
              {/* Image */}
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">🖼️ صورة المنتج</p>
                <div className="w-full h-28 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700 mb-2 overflow-hidden">
                  {form.imageUrl
                    ? <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="text-4xl opacity-40">📦</span>}
                </div>
                <input value={form.imageUrl} onChange={e => f('imageUrl', e.target.value)}
                  placeholder="رابط الصورة https://..."
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
              </div>

              {/* Identity */}
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">📝 المعلومات الأساسية</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">الاسم بالعربية</label>
                    <input value={form.nameAr} onChange={e => f('nameAr', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Nom en français</label>
                    <input value={form.name} onChange={e => f('name', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">الوصف</label>
                    <textarea value={form.description} onChange={e => f('description', e.target.value)}
                      rows={3}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">الفئة</label>
                      <input value={form.category} onChange={e => f('category', e.target.value)}
                        list="categories-list"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                      <datalist id="categories-list">
                        {categories.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">التعاونية</label>
                      <select value={form.organizationId} onChange={e => f('organizationId', e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400">
                        <option value="">اختر...</option>
                        {orgs.map(o => <option key={o.id} value={o.id}>{o.nameAr || o.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">SKU</label>
                    <input value={form.sku} onChange={e => f('sku', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                  </div>
                </div>
              </div>

              {/* Prix */}
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">💰 الأسعار</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">سعر البيع (د.م)</label>
                    <input type="number" value={form.sellingPrice} onChange={e => f('sellingPrice', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">سعر الشراء (د.م)</label>
                    <input type="number" value={form.costPrice} onChange={e => f('costPrice', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                  </div>
                </div>
                {margin !== null && (
                  <div className="mt-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    ✓ هامش الربح: {margin} د.م
                  </div>
                )}
              </div>

              {/* Stock / unit */}
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">📦 المخزون</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">الوحدة</label>
                    <input value={form.unit} onChange={e => f('unit', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                  </div>
                  {!editing && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">مخزون أولي</label>
                      <input type="number" value={form.initialStock} onChange={e => f('initialStock', e.target.value)}
                        placeholder="0"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Statut */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">منتج نشط</p>
                  <p className="text-xs text-gray-400">يظهر في المتجر للزوار</p>
                </div>
                <label className="relative inline-block w-11 h-6 cursor-pointer">
                  <input type="checkbox" className="sr-only" checked={form.isActive} onChange={e => f('isActive', e.target.checked)} />
                  <span className={`block w-full h-full rounded-full transition-colors ${form.isActive ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button onClick={() => setPanelOpen(false)}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700">
                إلغاء
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'جاري الحفظ...' : '💾 حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
