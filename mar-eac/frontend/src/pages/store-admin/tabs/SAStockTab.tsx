import React, { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { storeManagerApi } from '../../../lib/api';

interface Movement {
  id: string; type: string; quantity: number; reference?: string; notes?: string; createdAt: string;
  product: { name: string; nameAr?: string; unit: string };
  organization: { name: string; nameAr?: string };
}

const TYPE_LABELS: Record<string, string> = { IN: '📥 وارد', OUT: '📤 صادر', ADJUST: '🔧 تعديل', RETURN: '↩️ إرجاع' };

export function SAStockTab() {
  const [movements, setMovements]     = useState<Movement[]>([]);
  const [products, setProducts]       = useState<any[]>([]);
  const [orgs, setOrgs]               = useState<any[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({ organizationId: '', productId: '', type: 'IN', quantity: '', reference: '', notes: '' });
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await storeManagerApi.getStockMovements({ page });
      setMovements(r.data.movements);
      setTotal(r.data.total);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([storeManagerApi.getProducts({ limit: 500 }), storeManagerApi.getCommerceOrgs()])
      .then(([pr, or]) => { setProducts(pr.data.products); setOrgs(or.data); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await storeManagerApi.addStockMovement(form);
      setShowForm(false);
      setForm({ organizationId: '', productId: '', type: 'IN', quantity: '', reference: '', notes: '' });
      load();
    } finally { setSaving(false); }
  };

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-gray-900 dark:text-white">المخزون</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
          <Plus size={16} /> حركة جديدة
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">التعاونية</label>
              <select value={form.organizationId} onChange={e => f('organizationId', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400">
                <option value="">اختر...</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.nameAr || o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">المنتج</label>
              <select value={form.productId} onChange={e => f('productId', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400">
                <option value="">اختر...</option>
                {products.filter(p => !form.organizationId || p.organization.id === form.organizationId)
                  .map(p => <option key={p.id} value={p.id}>{p.nameAr || p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">النوع</label>
              <select value={form.type} onChange={e => f('type', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400">
                <option value="IN">📥 وارد</option>
                <option value="OUT">📤 صادر</option>
                <option value="ADJUST">🔧 تعديل</option>
                <option value="RETURN">↩️ إرجاع</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">الكمية</label>
              <input type="number" value={form.quantity} onChange={e => f('quantity', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">المرجع</label>
              <input value={form.reference} onChange={e => f('reference', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">ملاحظات</label>
              <input value={form.notes} onChange={e => f('notes', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700">إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? '...' : 'حفظ'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({length:5}).map((_,i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
        ) : movements.map(m => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span className="text-sm flex-shrink-0">{TYPE_LABELS[m.type] || m.type}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.product.nameAr || m.product.name}</p>
              <p className="text-xs text-gray-400">{m.organization.nameAr || m.organization.name}{m.reference ? ` · ${m.reference}` : ''}</p>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0">{m.quantity} {m.product.unit}</p>
            <p className="text-xs text-gray-400 flex-shrink-0">{new Date(m.createdAt).toLocaleDateString('ar-MA')}</p>
          </div>
        ))}
        {!loading && movements.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">لا توجد حركات</p>}
      </div>

      {total > 30 && (
        <div className="flex justify-end gap-1 mt-3">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">السابق</button>
          <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">{page}</span>
          <button onClick={() => setPage(p => p+1)} disabled={page*30>=total} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">التالي</button>
        </div>
      )}
    </div>
  );
}
