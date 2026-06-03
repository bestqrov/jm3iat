import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Check, X, Camera, Loader2 } from 'lucide-react';
import { storeManagerApi } from '../../../lib/api';

interface CatData { categories: string[]; predefined: string[]; images: Record<string, string> }

const CATEGORY_EMOJI: Record<string, string> = {
  'زيت أركان': '🫒', 'العسل': '🍯', 'الزعفران': '🌸',
  'المنسوجات والسجاد': '🪡', 'الفخار والخزف': '🏺',
  'منتجات التجميل الطبيعية': '💄', 'التمر': '🌴', 'منتجات الجلد': '👜',
  'زيت الزيتون': '🫙',
};

export function SACategoriesTab() {
  const [data, setData]           = useState<CatData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [input, setInput]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [addError, setAddError]   = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue]   = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState<string | null>(null); // cat name being uploaded
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [pendingImgCat, setPendingImgCat] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    storeManagerApi.getCategories()
      .then(r => setData({ ...r.data, images: r.data.images || {} }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const name = input.trim();
    if (!name) return;
    setAddError(''); setSaving(true);
    try {
      await storeManagerApi.addCategory(name);
      setInput(''); load();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'خطأ');
    } finally { setSaving(false); }
  };

  const startEdit = (cat: string) => { setEditingCat(cat); setEditValue(cat); };
  const cancelEdit = () => { setEditingCat(null); setEditValue(''); };

  const handleRename = async (oldName: string) => {
    const newName = editValue.trim();
    if (!newName) return;
    setEditSaving(true);
    try {
      await storeManagerApi.renameCategory(oldName, newName);
      setEditingCat(null); load();
    } catch { } finally { setEditSaving(false); }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`حذف فئة "${name}"؟`)) return;
    try { await storeManagerApi.deleteCategory(name); load(); } catch { }
  };

  const openImgPicker = (catName: string) => {
    setPendingImgCat(catName);
    imgInputRef.current?.click();
  };

  const handleImgSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingImgCat) return;
    e.target.value = '';

    setUploadingImg(pendingImgCat);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await storeManagerApi.updateCategoryImage(pendingImgCat, base64);
      load();
    } catch { } finally {
      setUploadingImg(null);
      setPendingImgCat(null);
    }
  };

  const isPredefined = (name: string) => data?.predefined.includes(name);

  return (
    <div>
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImgSelected}
      />

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
            onChange={e => { setInput(e.target.value); setAddError(''); }}
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
        {addError && <p className="mt-2 text-xs text-red-500">{addError}</p>}
      </div>

      {/* Category list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data?.categories.map(cat => {
            const img = data.images?.[cat];
            const emoji = CATEGORY_EMOJI[cat] || '🏷️';
            const isUploading = uploadingImg === cat;

            return (
              <div key={cat}
                className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3">

                {/* Category image / emoji + camera button */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => openImgPicker(cat)}
                    disabled={isUploading}
                    className="w-10 h-10 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-indigo-400 transition-colors relative group"
                    title="تغيير الصورة"
                  >
                    {isUploading ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                        <Loader2 size={16} className="animate-spin text-indigo-500" />
                      </div>
                    ) : img ? (
                      <>
                        <img src={img} alt={cat} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera size={12} className="text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg bg-gray-50 dark:bg-gray-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                        {emoji}
                      </div>
                    )}
                  </button>
                </div>

                {editingCat === cat ? (
                  <>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(cat);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="flex-1 border border-indigo-300 dark:border-indigo-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button onClick={() => handleRename(cat)} disabled={editSaving || !editValue.trim()}
                      className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                      <Check size={14} />
                    </button>
                    <button onClick={cancelEdit}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-semibold text-gray-900 dark:text-white text-sm">{cat}</span>
                    {!isPredefined(cat) && (
                      <span className="text-xs text-gray-300 dark:text-gray-600">من المنتجات</span>
                    )}
                    <button onClick={() => startEdit(cat)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                      <Pencil size={14} />
                    </button>
                    {isPredefined(cat) && (
                      <button onClick={() => handleDelete(cat)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
          {data?.categories.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">لا توجد فئات — أضف أول فئة</p>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        📷 اضغط على صورة الفئة لتغييرها · ✏️ التعديل يبدل الاسم في جميع المنتجات تلقائياً
      </p>
    </div>
  );
}
