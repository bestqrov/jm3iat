import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { bundleApi, storeApi } from '../../../lib/api';

interface BundleProduct {
  id: string; name: string; nameAr?: string; sellingPrice: number;
  organization: { nameAr?: string; name: string };
}
interface BundleItem {
  productId: string; quantity: number;
  product: { name: string; nameAr?: string; sellingPrice: number };
}
interface Bundle {
  id: string; name: string; nameAr?: string; bundlePrice: number;
  isActive: boolean; items: BundleItem[];
}

const emptyForm = () => ({
  name: '', nameAr: '', bundlePrice: '', isActive: true,
  items: [] as { productId: string; quantity: number }[],
});

export function BundlesTab() {
  const [bundles, setBundles]             = useState<Bundle[]>([]);
  const [products, setProducts]           = useState<BundleProduct[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [editing, setEditing]             = useState<Bundle | null>(null);
  const [form, setForm]                   = useState(emptyForm());
  const [saving, setSaving]               = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [b, p] = await Promise.all([
      bundleApi.list(),
      storeApi.getProducts(),
    ]);
    setBundles(b.data);
    setProducts(p.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setProductSearch(''); setShowModal(true); };
  const openEdit = (b: Bundle) => {
    setEditing(b);
    setForm({
      name: b.name, nameAr: b.nameAr || '',
      bundlePrice: String(b.bundlePrice),
      isActive: b.isActive,
      items: b.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
    });
    setProductSearch('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.nameAr && !form.name) return;
    if (!form.bundlePrice || !form.items.length) return;
    setSaving(true);
    try {
      const payload = { ...form, name: form.name || form.nameAr };
      if (editing) await bundleApi.update(editing.id, payload);
      else await bundleApi.create(payload);
      await load();
      setShowModal(false);
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('حذف هذه الباقة؟')) return;
    await bundleApi.remove(id);
    await load();
  };

  const toggleItem = (productId: string) => {
    setForm(f => {
      const exists = f.items.find(i => i.productId === productId);
      return {
        ...f,
        items: exists
          ? f.items.filter(i => i.productId !== productId)
          : [...f.items, { productId, quantity: 1 }],
      };
    });
  };

  const filteredProducts = products.filter(p =>
    !productSearch || (p.nameAr || p.name).toLowerCase().includes(productSearch.toLowerCase())
  );

  const formTotal = form.items.reduce((s, i) => {
    const p = products.find(pr => pr.id === i.productId);
    return s + (p ? p.sellingPrice * i.quantity : 0);
  }, 0);

  if (loading) return <div className="text-center py-12 text-gray-400">جاري التحميل...</div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900">🎁 باقات المنتجات</h2>
          <p className="text-xs text-gray-400 mt-0.5">الباقات تظهر في المتجر وتسمح للعملاء بشراء مجموعة منتجات بسعر خاص</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={16} />إضافة باقة
        </button>
      </div>

      {bundles.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <span className="text-5xl block mb-3">🎁</span>
          <p className="font-medium">لا توجد باقات بعد</p>
          <p className="text-sm mt-1">أضف باقتك الأولى لتظهر في المتجر</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map(b => {
            const originalTotal = b.items.reduce((s, i) => s + i.product.sellingPrice * i.quantity, 0);
            const discount = originalTotal > 0 ? Math.round((1 - b.bundlePrice / originalTotal) * 100) : 0;
            return (
              <div key={b.id} className={`bg-white border-2 rounded-2xl p-4 ${b.isActive ? 'border-purple-200' : 'border-gray-200 opacity-60'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-black text-gray-900">{b.nameAr || b.name}</p>
                    <p className="text-xs text-gray-400">{b.items.length} منتجات</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => remove(b.id)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-3 leading-relaxed">
                  {b.items.map(i => i.product.nameAr || i.product.name).join(' · ')}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-purple-700 text-lg">{b.bundlePrice}</span>
                    <span className="text-xs text-gray-500 mr-0.5">د.م</span>
                    {discount > 0 && <span className="mr-2 text-xs text-emerald-600 font-medium">وفّر {discount}%</span>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                    {b.isActive ? 'نشط' : 'معطّل'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-black text-gray-900">{editing ? 'تعديل الباقة' : 'إضافة باقة جديدة'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">الاسم (عربي) *</label>
                  <input value={form.nameAr}
                    onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
                    placeholder="باقة الطبيعة المغربية"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">الاسم (فرنسي)</label>
                  <input value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Pack Nature Marocaine"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">سعر الباقة (د.م) *</label>
                <input type="number" value={form.bundlePrice}
                  onChange={e => setForm(f => ({ ...f, bundlePrice: e.target.value }))}
                  placeholder="280"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
                {formTotal > 0 && Number(form.bundlePrice) > 0 && (
                  <p className="text-xs text-emerald-600 mt-1">
                    مجموع المنتجات: {formTotal} د.م — خصم {Math.round((1 - Number(form.bundlePrice) / formTotal) * 100)}%
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-2">المنتجات * ({form.items.length} محدد)</label>
                <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  placeholder="ابحث عن منتج..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400 mb-2" />
                <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2">
                  {filteredProducts.map(p => {
                    const isSelected = form.items.some(i => i.productId === p.id);
                    return (
                      <div key={p.id} onClick={() => toggleItem(p.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50'}`}>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.nameAr || p.name}</p>
                          <p className="text-xs text-gray-400">{p.organization.nameAr || p.organization.name} · {p.sellingPrice} د.م</p>
                        </div>
                        {isSelected && <Check size={16} className="text-purple-600 flex-shrink-0" />}
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">لا توجد منتجات</p>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="rounded" />
                <span className="text-sm text-gray-700">نشط (يظهر في المتجر)</span>
              </label>
            </div>
            <div className="p-4 border-t">
              <button onClick={save}
                disabled={saving || (!form.nameAr && !form.name) || !form.bundlePrice || !form.items.length}
                className="w-full py-3 text-white font-bold rounded-xl text-sm disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
                {saving ? '...' : editing ? 'حفظ التعديلات' : 'إنشاء الباقة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
