import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, Package, ToggleLeft, ToggleRight, Sparkles, Droplets, ShoppingBag, FolderKanban, Building2, Layers, Users, HardDrive } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

interface Pack {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  price: number;
  currency: string;
  billingCycle: string;
  assocType: string;
  size: string;
  features: string[];
  featuresAr: string[];
  limits: any;
  isActive: boolean;
  trialDays: number;
}

const ASSOC_TYPES = ['REGULAR', 'PROJECTS', 'WATER', 'PRODUCTIVE', 'PRODUCTIVE_WATER'];
const SIZES = ['SMALL', 'MEDIUM', 'LARGE'];

const TYPE_COLORS: Record<string, string> = {
  REGULAR:          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  PROJECTS:         'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  WATER:            'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  PRODUCTIVE:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  PRODUCTIVE_WATER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const TYPE_GRADIENT: Record<string, string> = {
  REGULAR:          'from-gray-500 to-gray-600',
  PROJECTS:         'from-blue-500 to-blue-600',
  WATER:            'from-cyan-500 to-cyan-600',
  PRODUCTIVE:       'from-emerald-500 to-emerald-600',
  PRODUCTIVE_WATER: 'from-purple-500 to-indigo-600',
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  REGULAR:          <Building2 size={16} />,
  PROJECTS:         <FolderKanban size={16} />,
  WATER:            <Droplets size={16} />,
  PRODUCTIVE:       <ShoppingBag size={16} />,
  PRODUCTIVE_WATER: <Layers size={16} />,
};

const SIZE_LABEL: Record<string, { fr: string; ar: string }> = {
  SMALL:  { fr: 'Starter', ar: 'مبتدئ' },
  MEDIUM: { fr: 'Pro',     ar: 'برو' },
  LARGE:  { fr: 'Business', ar: 'أعمال' },
};

export const PacksTab: React.FC = () => {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const sa = (k: string) => t(`sa.packs.${k}`);
  const sh = (k: string) => t(`sa.shared.${k}`);

  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Pack | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('ALL');

  const emptyForm = {
    name: '', nameAr: '', description: '', descriptionAr: '',
    price: 99, currency: 'MAD', billingCycle: 'MONTHLY',
    assocType: 'REGULAR', size: 'MEDIUM',
    features: '', featuresAr: '', trialDays: 15, isActive: true,
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      setLoading(true);
      const res = await superadminApi.getPacks();
      setPacks(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (pack: Pack) => {
    setEditing(pack);
    setForm({
      name: pack.name,
      nameAr: pack.nameAr || '',
      description: pack.description || '',
      descriptionAr: pack.descriptionAr || '',
      price: pack.price,
      currency: pack.currency,
      billingCycle: pack.billingCycle,
      assocType: pack.assocType,
      size: pack.size,
      features: pack.features.join('\n'),
      featuresAr: pack.featuresAr.join('\n'),
      trialDays: pack.trialDays,
      isActive: pack.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...form,
        price: Number(form.price),
        trialDays: Number(form.trialDays),
        features: form.features.split('\n').map(s => s.trim()).filter(Boolean),
        featuresAr: form.featuresAr.split('\n').map(s => s.trim()).filter(Boolean),
      };
      if (editing) {
        await superadminApi.updatePack(editing.id, data);
      } else {
        await superadminApi.createPack(data);
      }
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (pack: Pack) => {
    await superadminApi.updatePack(pack.id, { isActive: !pack.isActive });
    await load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await superadminApi.deletePack(deleteId);
    setDeleteId(null);
    await load();
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      await superadminApi.seedDefaultPacks();
      await load();
    } catch (err: any) {
      setSeedError(err?.response?.data?.message || (isAr ? 'حدث خطأ' : 'Erreur'));
    } finally {
      setSeeding(false);
    }
  };

  const inp = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none';
  const lbl = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{sa('title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isAr ? 'إدارة الباقات والأسعار المتاحة للجمعيات' : 'Gérez les offres et tarifs disponibles pour les associations'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> {sa('createPack')}
        </button>
      </div>

      {/* Packs grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">{sh('loading')}</div>
      ) : packs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <Package size={32} className="text-indigo-400" />
          </div>
          <div className="text-center">
            <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
              {isAr ? 'لا توجد باقات بعد' : 'Aucune offre disponible'}
            </p>
            <p className="text-sm text-gray-400 mt-1 max-w-sm">
              {isAr
                ? 'أضف الباقات الافتراضية دفعةً واحدة، أو أنشئ باقة مخصصة.'
                : 'Ajoutez les offres par défaut en un clic, ou créez une offre personnalisée.'}
            </p>
          </div>
          {seedError && (
            <p className="text-sm text-red-600 dark:text-red-400">{seedError}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Sparkles size={15} />
              {seeding
                ? (isAr ? 'جار الإضافة...' : 'Ajout en cours...')
                : (isAr ? 'إضافة الباقات الافتراضية (8 باقات)' : 'Ajouter les offres par défaut (8 offres)')}
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={15} /> {isAr ? 'باقة مخصصة' : 'Offre personnalisée'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2">
            {['ALL', ...ASSOC_TYPES].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  filterType === type
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {type !== 'ALL' && <span className="opacity-70">{TYPE_ICON[type]}</span>}
                {type === 'ALL'
                  ? (isAr ? 'الكل' : 'Toutes')
                  : (isAr
                    ? { REGULAR: 'عادية', PROJECTS: 'مشاريع', WATER: 'ماء', PRODUCTIVE: 'إنتاجية', PRODUCTIVE_WATER: 'إنتاجية + ماء' }[type]
                    : { REGULAR: 'Classique', PROJECTS: 'Projets', WATER: 'Eau', PRODUCTIVE: 'Productive', PRODUCTIVE_WATER: 'Prod + Eau' }[type]
                  )}
                <span className="opacity-60">
                  ({type === 'ALL' ? packs.length : packs.filter(p => p.assocType === type).length})
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {packs.filter(p => filterType === 'ALL' || p.assocType === filterType).map(pack => (
              <div
                key={pack.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden flex flex-col shadow-sm transition-opacity ${
                  pack.isActive
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-dashed border-gray-300 dark:border-gray-600 opacity-55'
                }`}
              >
                {/* Colored header */}
                <div className={`bg-gradient-to-r ${TYPE_GRADIENT[pack.assocType] || TYPE_GRADIENT.REGULAR} px-5 pt-5 pb-4 text-white`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        {TYPE_ICON[pack.assocType]}
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide opacity-90">
                        {isAr
                          ? { REGULAR: 'عادية', PROJECTS: 'مشاريع', WATER: 'ماء', PRODUCTIVE: 'إنتاجية', PRODUCTIVE_WATER: 'إنتاجية + ماء' }[pack.assocType] || pack.assocType
                          : { REGULAR: 'Classique', PROJECTS: 'Projets', WATER: 'Eau', PRODUCTIVE: 'Productive', PRODUCTIVE_WATER: 'Prod + Eau' }[pack.assocType] || pack.assocType
                        }
                      </span>
                    </div>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      {SIZE_LABEL[pack.size]?.[isAr ? 'ar' : 'fr'] || pack.size}
                    </span>
                  </div>
                  <h3 className="font-bold text-base leading-snug">
                    {isAr && pack.nameAr ? pack.nameAr : pack.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-extrabold">{pack.price}</span>
                    <span className="text-sm opacity-80">{pack.currency}</span>
                    <span className="text-xs opacity-70">/{pack.billingCycle === 'MONTHLY' ? (isAr ? 'شهر' : 'mois') : (isAr ? 'سنة' : 'an')}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-4 flex-1">
                  {pack.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {isAr && pack.descriptionAr ? pack.descriptionAr : pack.description}
                    </p>
                  )}

                  {/* Features */}
                  {pack.features.length > 0 && (
                    <ul className="space-y-1.5 flex-1">
                      {(isAr && pack.featuresAr.length > 0 ? pack.featuresAr : pack.features).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Check size={13} className="text-emerald-500 flex-shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Limits row */}
                  {pack.limits && (
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Users size={11} />
                        {pack.limits.members === -1 ? '∞' : pack.limits.members}
                      </span>
                      {pack.limits.storage && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <HardDrive size={11} /> {pack.limits.storage} Go
                        </span>
                      )}
                      <span className="ms-auto text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-full px-2 py-0.5">
                        {pack.trialDays}j essai
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleToggle(pack)}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${pack.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}
                    >
                      {pack.isActive ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                      {pack.isActive ? sh('active') : sh('inactive')}
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(pack)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(pack.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? sa('editPack') : sa('createPack')}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>{sa('packName')} *</label>
            <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{sa('packNameAr')}</label>
            <input className={inp} dir="rtl" value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{sa('description')}</label>
            <input className={inp} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{sa('descriptionAr')}</label>
            <input className={inp} dir="rtl" value={form.descriptionAr} onChange={e => setForm(f => ({ ...f, descriptionAr: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{sa('price')} ({form.currency}) *</label>
            <input type="number" className={inp} value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
          </div>
          <div>
            <label className={lbl}>{sa('billingCycle')}</label>
            <select className={inp} value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}>
              <option value="MONTHLY">{sa('monthly')}</option>
              <option value="YEARLY">{sa('yearly')}</option>
            </select>
          </div>
          <div>
            <label className={lbl}>{sa('assocType')} *</label>
            <select className={inp} value={form.assocType} onChange={e => setForm(f => ({ ...f, assocType: e.target.value }))}>
              {ASSOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>{sa('size')}</label>
            <select className={inp} value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}>
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>{sa('trialDays')}</label>
            <input type="number" className={inp} value={form.trialDays} onChange={e => setForm(f => ({ ...f, trialDays: Number(e.target.value) }))} />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <input type="checkbox" id="packActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
            <label htmlFor="packActive" className="text-sm text-gray-700 dark:text-gray-300">{sa('isActive')}</label>
          </div>
          <div className="md:col-span-2">
            <label className={lbl}>{sa('features')} (FR)</label>
            <textarea rows={4} className={inp} value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className={lbl}>{sa('features')} (AR)</label>
            <textarea rows={4} dir="rtl" className={inp} value={form.featuresAr} onChange={e => setForm(f => ({ ...f, featuresAr: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            {sh('cancel')}
          </button>
          <button onClick={handleSave} disabled={saving || !form.name} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {saving ? sh('loading') : sh('save')}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={sa('deletePack')}
        message={sa('confirmDelete')}
        variant="danger"
      />
    </div>
  );
};
