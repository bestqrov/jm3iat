import React, { useEffect, useState } from 'react';
import { Plus, Copy, Check, Trash2, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { formatDate } from '../../../lib/utils';

interface PromoCode {
  id: string;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
  applicableTo: string[];
  createdAt: string;
}

const ASSOC_TYPES = ['REGULAR', 'PROJECTS', 'WATER', 'PRODUCTIVE', 'PRODUCTIVE_WATER'];

export const PromoCodesTab: React.FC = () => {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const pr = (k: string) => t(`sa.promos.${k}`);
  const sh = (k: string) => t(`sa.shared.${k}`);

  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    code: '', description: '',
    discountType: 'PERCENTAGE', discountValue: 10,
    maxUses: '', expiresAt: '', applicableTo: [] as string[],
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const res = await superadminApi.getPromoCodes();
      setCodes(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await superadminApi.createPromoCode({
        ...form,
        discountValue: Number(form.discountValue),
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        expiresAt: form.expiresAt || undefined,
      });
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (code: PromoCode) => {
    await superadminApi.updatePromoCode(code.id, { isActive: !code.isActive });
    await load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await superadminApi.deletePromoCode(deleteId);
    setDeleteId(null);
    await load();
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleApplicable = (type: string) => {
    setForm(f => ({
      ...f,
      applicableTo: f.applicableTo.includes(type)
        ? f.applicableTo.filter(t => t !== type)
        : [...f.applicableTo, type],
    }));
  };

  const inp = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none';
  const lbl = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  // Generate a random code
  const genCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm(f => ({ ...f, code }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{pr('title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isAr ? 'إنشاء وإدارة أكواد الخصم للمنظمات' : 'Créez et gérez des codes de réduction pour les organisations'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} /> {pr('createCode')}
        </button>
      </div>

      {/* Codes list */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">{sh('loading')}</div>
      ) : codes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Tag size={48} className="mx-auto mb-3 opacity-30" />
          <p>{pr('noCodes')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {codes.map(code => {
            const isExpired = code.expiresAt && new Date(code.expiresAt) < new Date();
            const isExhausted = code.maxUses != null && code.usedCount >= code.maxUses;
            const isEffective = code.isActive && !isExpired && !isExhausted;

            return (
              <div
                key={code.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl border ${isEffective ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'} p-4 shadow-sm flex flex-col gap-3`}
              >
                {/* Code */}
                <div className="flex items-center justify-between">
                  <div className="font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400 tracking-widest">
                    {code.code}
                  </div>
                  <button
                    onClick={() => copyCode(code.code, code.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {copiedId === code.id ? <><Check size={11} className="text-emerald-500" /> {pr('copied')}</> : <><Copy size={11} /> {pr('copyCode')}</>}
                  </button>
                </div>

                {/* Description */}
                {code.description && <p className="text-sm text-gray-500 dark:text-gray-400">{code.description}</p>}

                {/* Discount */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-sm font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    -{code.discountValue}{code.discountType === 'PERCENTAGE' ? '%' : ' MAD'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {code.discountType === 'PERCENTAGE' ? pr('percentage') : pr('fixed')}
                  </span>
                </div>

                {/* Usage */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{pr('usedCount')}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {code.usedCount}{code.maxUses ? ` / ${code.maxUses}` : ''}
                    </span>
                  </div>
                  {code.maxUses && (
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (code.usedCount / code.maxUses) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Expiry */}
                <div className="text-xs text-gray-400">
                  {code.expiresAt
                    ? <span className={isExpired ? 'text-red-500' : ''}>{pr('expiresAt')}: {formatDate(code.expiresAt)}</span>
                    : pr('noExpiry')
                  }
                </div>

                {/* Applicable to */}
                {code.applicableTo.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {code.applicableTo.map(type => (
                      <span key={type} className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full">{type}</span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button onClick={() => handleToggle(code)} className={`flex items-center gap-1 text-xs transition-colors ${code.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                    {code.isActive ? <><ToggleRight size={15} /> {sh('active')}</> : <><ToggleLeft size={15} /> {sh('inactive')}</>}
                  </button>
                  <button onClick={() => setDeleteId(code.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={pr('createCode')}>
        <div className="space-y-4">
          <div>
            <label className={lbl}>{pr('code')} *</label>
            <div className="flex gap-2">
              <input
                className={inp}
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="EX: SUMMER25"
              />
              <button onClick={genCode} className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap">
                {isAr ? 'توليد' : 'Générer'}
              </button>
            </div>
          </div>

          <div>
            <label className={lbl}>{pr('description')}</label>
            <input className={inp} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>{pr('discountType')}</label>
              <select className={inp} value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}>
                <option value="PERCENTAGE">{pr('percentage')}</option>
                <option value="FIXED">{pr('fixed')}</option>
              </select>
            </div>
            <div>
              <label className={lbl}>{pr('discountValue')} *</label>
              <input type="number" min="0" className={inp} value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>{pr('maxUses')} ({isAr ? 'اختياري' : 'optionnel'})</label>
              <input type="number" className={inp} value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>{pr('expiresAt')} ({isAr ? 'اختياري' : 'optionnel'})</label>
              <input type="date" className={inp} value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className={lbl}>{pr('applicableTo')} ({isAr ? 'فارغ = الكل' : 'vide = tous'})</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ASSOC_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleApplicable(type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    form.applicableTo.includes(type)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            {sh('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.code || !form.discountValue}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? sh('loading') : sh('create')}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={pr('confirmDelete')}
        message={isAr ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'Cette action est irréversible.'}
        variant="danger"
      />
    </div>
  );
};
