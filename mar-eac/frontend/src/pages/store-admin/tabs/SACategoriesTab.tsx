import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { storeManagerApi } from '../../../lib/api';

interface CatData { categories: string[]; predefined: string[] }

const CATEGORY_EMOJI: Record<string, string> = {
  'زيت أركان': '🫒', 'العسل': '🍯', 'الزعفران': '🌸',
  'المنسوجات والسجاد': '🪡', 'الفخار والخزف': '🏺',
  'منتجات التجميل الطبيعية': '💄', 'التمر': '🌴', 'منتجات الجلد': '👜',
  'زيت الزيتون': '🫙',
};

export function SACategoriesTab() {
  const [data, setData]       = useState<CatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    storeManagerApi.getCategories()
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const name = input.trim();
    if (!name) return;
    setError('');
    setSaving(true);
    try {
      await storeManagerApi.addCategory(name);
      setInput('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`حذف فئة "${name}"؟`)) return;
    try {
      await storeManagerApi.deleteCategory(name);
      load();
    } catch {
      // silent
    }
  };

  const isPredefined = (name: string) => data?.predefined.includes(name);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-gray-900 dark:text-white">الفئات</h1>
        <span className="text-xs text-gray-400">{data?.categories.length ?? 0} فئة</span>
      </div>

      {/* Add form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">+ إضافة فئة جديدة</p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="مثال: زيت أركان، العسل، الزعفران..."
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !input.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            <Plus size={15} /> {saving ? '...' : 'إضافة'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>

      {/* Category list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data?.categories.map(cat => (
            <div key={cat}
              className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3">
              <span className="text-xl flex-shrink-0">{CATEGORY_EMOJI[cat] || '🏷️'}</span>
              <span className="flex-1 font-semibold text-gray-900 dark:text-white">{cat}</span>
              {isPredefined(cat) ? (
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={14} />
                </button>
              ) : (
                <span className="text-xs text-gray-300 dark:text-gray-600">من المنتجات</span>
              )}
            </div>
          ))}
          {data?.categories.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">لا توجد فئات — أضف أول فئة</p>
          )}
        </div>
      )}
    </div>
  );
}
