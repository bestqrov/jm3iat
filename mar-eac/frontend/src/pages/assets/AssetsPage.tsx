import React, { useEffect, useState } from 'react';
import {
  Landmark, Plus, Pencil, Trash2, Search, X,
  Building2, Car, Wrench, Armchair, Package,
  CheckCircle, AlertTriangle, TrendingDown, Tag,
} from 'lucide-react';
import { assetsApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type AssetType   = 'REAL_ESTATE' | 'VEHICLE' | 'EQUIPMENT' | 'FURNITURE' | 'OTHER';
type AssetStatus = 'ACTIVE' | 'MAINTENANCE' | 'DEPRECATED' | 'SOLD';

interface Asset {
  id: string;
  name: string;
  type: AssetType;
  description?: string;
  reference?: string;
  location?: string;
  acquisitionDate?: string;
  acquisitionValue?: number;
  currentValue?: number;
  status: AssetStatus;
  notes?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  totalAcquisitionValue: number;
  totalCurrentValue: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  REAL_ESTATE: <Building2 size={16} />,
  VEHICLE:     <Car size={16} />,
  EQUIPMENT:   <Wrench size={16} />,
  FURNITURE:   <Armchair size={16} />,
  OTHER:       <Package size={16} />,
};

const TYPE_COLORS: Record<AssetType, string> = {
  REAL_ESTATE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  VEHICLE:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  EQUIPMENT:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  FURNITURE:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  OTHER:       'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const STATUS_COLORS: Record<AssetStatus, string> = {
  ACTIVE:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  MAINTENANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  DEPRECATED:  'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  SOLD:        'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_ICONS: Record<AssetStatus, React.ReactNode> = {
  ACTIVE:      <CheckCircle size={13} />,
  MAINTENANCE: <AlertTriangle size={13} />,
  DEPRECATED:  <TrendingDown size={13} />,
  SOLD:        <Tag size={13} />,
};

const EMPTY_FORM = {
  name: '', type: 'OTHER' as AssetType, description: '', reference: '',
  location: '', acquisitionDate: '', acquisitionValue: '', currentValue: '',
  status: 'ACTIVE' as AssetStatus, notes: '',
};

// ── Component ─────────────────────────────────────────────────────────────────

export const AssetsPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const dir  = isAr ? 'rtl' : 'ltr';

  const [assets, setAssets]       = useState<Asset[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterType, setFilterType]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showModal, setShowModal]     = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [form, setForm]               = useState({ ...EMPTY_FORM });
  const [saving, setSaving]           = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  const TYPES: AssetType[]   = ['REAL_ESTATE', 'VEHICLE', 'EQUIPMENT', 'FURNITURE', 'OTHER'];
  const STATUSES: AssetStatus[] = ['ACTIVE', 'MAINTENANCE', 'DEPRECATED', 'SOLD'];

  const loadAll = async () => {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([assetsApi.getAll(), assetsApi.getStats()]);
      setAssets(aRes.data);
      setStats(sRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const filtered = assets.filter(a => {
    if (filterType && a.type !== filterType) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
        !(a.reference || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (a: Asset) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      type: a.type,
      description: a.description || '',
      reference: a.reference || '',
      location: a.location || '',
      acquisitionDate: a.acquisitionDate ? a.acquisitionDate.split('T')[0] : '',
      acquisitionValue: a.acquisitionValue != null ? String(a.acquisitionValue) : '',
      currentValue: a.currentValue != null ? String(a.currentValue) : '',
      status: a.status,
      notes: a.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        acquisitionValue: form.acquisitionValue !== '' ? parseFloat(form.acquisitionValue) : null,
        currentValue:     form.currentValue     !== '' ? parseFloat(form.currentValue)     : null,
        acquisitionDate:  form.acquisitionDate  || null,
      };
      if (editingId) await assetsApi.update(editingId, payload);
      else           await assetsApi.create(payload);
      setShowModal(false);
      await loadAll();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await assetsApi.remove(deletingId);
      setDeletingId(null);
      await loadAll();
    } catch {}
  };

  const fmtCurrency = (v?: number) => v != null ? formatCurrency(v, lang) : '—';

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Landmark size={22} className="text-primary-600" />
            {t('assets.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('assets.subtitle')}</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t('assets.add')}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-primary-600">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-1">{t('assets.totalAssets')}</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-lg font-bold text-indigo-600">{fmtCurrency(stats.totalAcquisitionValue)}</div>
            <div className="text-xs text-gray-500 mt-1">{t('assets.totalAcquisitionValue')}</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-lg font-bold text-emerald-600">{fmtCurrency(stats.totalCurrentValue)}</div>
            <div className="text-xs text-gray-500 mt-1">{t('assets.totalCurrentValue')}</div>
          </div>
          <div className="card p-4 text-center">
            {stats.totalAcquisitionValue > 0 ? (
              <div className="text-lg font-bold text-red-500">
                -{fmtCurrency(stats.totalAcquisitionValue - stats.totalCurrentValue)}
              </div>
            ) : (
              <div className="text-lg font-bold text-gray-400">—</div>
            )}
            <div className="text-xs text-gray-500 mt-1">{t('assets.depreciation')}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isAr ? 'right-3' : 'left-3'}`} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('assets.searchPlaceholder')}
              className={`input w-full text-sm ${isAr ? 'pr-9 text-right' : 'pl-9'}`}
            />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input text-sm">
            <option value="">{isAr ? 'كل الأنواع' : 'Tous les types'}</option>
            {TYPES.map(tp => <option key={tp} value={tp}>{t(`assets.types.${tp}`)}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input text-sm">
            <option value="">{isAr ? 'كل الحالات' : 'Tous les statuts'}</option>
            {STATUSES.map(st => <option key={st} value={st}>{t(`assets.statuses.${st}`)}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Landmark size={36} className="mx-auto mb-3 opacity-30" />
            <p>{t('assets.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th className={`px-4 py-3 font-medium ${isAr ? 'text-right' : 'text-left'}`}>{t('assets.name')}</th>
                  <th className={`px-4 py-3 font-medium ${isAr ? 'text-right' : 'text-left'}`}>{t('assets.type')}</th>
                  <th className={`px-4 py-3 font-medium ${isAr ? 'text-right' : 'text-left'}`}>{t('assets.location')}</th>
                  <th className={`px-4 py-3 font-medium ${isAr ? 'text-right' : 'text-left'}`}>{t('assets.currentValue')}</th>
                  <th className={`px-4 py-3 font-medium ${isAr ? 'text-right' : 'text-left'}`}>{t('assets.status')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{a.name}</div>
                      {a.reference && <div className="text-xs text-gray-400">{a.reference}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[a.type]}`}>
                        {TYPE_ICONS[a.type]} {t(`assets.types.${a.type}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.location || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{fmtCurrency(a.currentValue)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                        {STATUS_ICONS[a.status]} {t(`assets.statuses.${a.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeletingId(a.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" dir={dir}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">
                {editingId ? t('assets.edit') : t('assets.add')}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assets.name')} *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={`input w-full ${isAr ? 'text-right' : ''}`} />
              </div>

              {/* Type + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assets.type')}</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AssetType }))} className="input w-full">
                    {TYPES.map(tp => <option key={tp} value={tp}>{t(`assets.types.${tp}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assets.status')}</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AssetStatus }))} className="input w-full">
                    {STATUSES.map(st => <option key={st} value={st}>{t(`assets.statuses.${st}`)}</option>)}
                  </select>
                </div>
              </div>

              {/* Reference + Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assets.reference')}</label>
                  <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                    className={`input w-full ${isAr ? 'text-right' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assets.location')}</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className={`input w-full ${isAr ? 'text-right' : ''}`} />
                </div>
              </div>

              {/* Acquisition Date + Value + Current Value */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assets.acquisitionDate')}</label>
                  <input type="date" value={form.acquisitionDate} onChange={e => setForm(f => ({ ...f, acquisitionDate: e.target.value }))}
                    className="input w-full text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assets.acquisitionValue')}</label>
                  <input type="number" min="0" value={form.acquisitionValue} onChange={e => setForm(f => ({ ...f, acquisitionValue: e.target.value }))}
                    className="input w-full text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assets.currentValue')}</label>
                  <input type="number" min="0" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))}
                    className="input w-full text-sm" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assets.description')}</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className={`input w-full resize-none ${isAr ? 'text-right' : ''}`} />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assets.notes')}</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className={`input w-full resize-none ${isAr ? 'text-right' : ''}`} />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="btn-secondary">{isAr ? 'إلغاء' : 'Annuler'}</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : (isAr ? 'حفظ' : 'Enregistrer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full text-center" dir={dir}>
            <Trash2 size={32} className="mx-auto mb-3 text-red-500" />
            <p className="text-gray-800 dark:text-white font-medium mb-4">{t('assets.confirmDelete')}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeletingId(null)} className="btn-secondary">{isAr ? 'إلغاء' : 'Annuler'}</button>
              <button onClick={handleDelete} className="btn-danger">{isAr ? 'حذف' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
