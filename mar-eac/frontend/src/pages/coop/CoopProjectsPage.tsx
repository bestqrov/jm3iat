import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Plus, Eye, Trash2, X, MapPin, User, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { coopApi } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CoopProject {
  id: string;
  title: string;
  type: string;
  status: string;
  code?: string;
  description?: string;
  location?: string;
  manager?: string;
  generalGoal?: string;
  specificGoals?: string;
  beneficiaries?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat('fr-MA').format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_LIST = ['', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED'];

const statusMap = (ar: boolean): Record<string, { label: string; cls: string }> => ({
  PLANNED:     { label: ar ? 'مخطط'  : 'Planifié',  cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  IN_PROGRESS: { label: ar ? 'جاري'  : 'En cours',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  COMPLETED:   { label: ar ? 'منجز'  : 'Terminé',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  SUSPENDED:   { label: ar ? 'موقوف' : 'Suspendu',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
});

const typeLabel = (type: string, ar: boolean) => {
  if (type === 'PARTENARIAT') return ar ? 'شراكة'         : 'Partenariat';
  if (type === 'FINANCEMENT') return ar ? 'تمويل'          : 'Financement';
  return ar ? 'مشروع داخلي' : 'Projet interne';
};

const typeIcon = (type: string) =>
  type === 'PARTENARIAT' ? '🤝' : type === 'FINANCEMENT' ? '💰' : '🏗️';

// ── Modal ────────────────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><X size={18} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const emptyForm = () => ({
  title: '', type: 'INTERNE', status: 'PLANNED',
  code: '', location: '', manager: '',
  generalGoal: '', specificGoals: '', beneficiaries: '',
  description: '', budget: '',
  startDate: '', endDate: '',
});

export const CoopProjectsPage: React.FC = () => {
  const { lang } = useLanguage();
  const { organization } = useAuth();
  const ar = lang === 'ar';

  const [projects, setProjects]   = useState<CoopProject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal]         = useState(false);
  const [editProject, setEditProject] = useState<CoopProject | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [form, setForm]           = useState(emptyForm());

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await coopApi.getCoopProjects(statusFilter ? { status: statusFilter } : undefined);
      setProjects(r.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openModal = (p?: CoopProject) => {
    if (p) {
      setForm({
        title: p.title, type: p.type, status: p.status,
        code: p.code || '', location: p.location || '', manager: p.manager || '',
        generalGoal: p.generalGoal || '', specificGoals: p.specificGoals || '',
        beneficiaries: p.beneficiaries || '', description: p.description || '',
        budget: p.budget?.toString() || '', startDate: p.startDate?.slice(0, 10) || '',
        endDate: p.endDate?.slice(0, 10) || '',
      });
      setEditProject(p);
    } else {
      setForm(emptyForm());
      setEditProject(null);
    }
    setModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, budget: form.budget ? parseFloat(form.budget) : undefined };
      if (editProject) await coopApi.updateCoopProject(editProject.id, payload);
      else await coopApi.createCoopProject(payload);
      setModal(false);
      load();
    } catch (e: any) { setError(e.response?.data?.message || 'Erreur'); }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await coopApi.deleteCoopProject(deleteId);
    setDeleteId(null);
    load();
  };

  const sMap = statusMap(ar);
  const allProjects = projects; // already filtered by server
  const stats = [
    { label: ar ? 'إجمالي المشاريع' : 'Total projets', value: allProjects.length, color: 'from-teal-500 to-teal-600' },
    { label: ar ? 'شراكات' : 'Partenariats',            value: allProjects.filter(p => p.type === 'PARTENARIAT').length, color: 'from-indigo-500 to-indigo-600' },
    { label: ar ? 'قيد التنفيذ' : 'En cours',           value: allProjects.filter(p => p.status === 'IN_PROGRESS').length, color: 'from-amber-500 to-amber-600' },
    { label: ar ? 'منجزة' : 'Terminés',                  value: allProjects.filter(p => p.status === 'COMPLETED').length, color: 'from-emerald-500 to-emerald-600' },
  ];

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir={ar ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="rounded-2xl m-4 p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg,#0f766e 0%,#0d9488 60%,#14b8a6 100%)' }}>
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Briefcase size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">{ar ? 'المشاريع والشراكات' : 'Projets & Partenariats'}</h1>
          <p className="text-sm text-teal-100 mt-0.5">{organization?.name}</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0">
          <Plus size={16} />{ar ? 'مشروع جديد' : 'Nouveau projet'}
        </button>
      </div>

      <div className="px-4 pb-8 space-y-5">

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-4 shadow-sm`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-white/80 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-wrap">
          {STATUS_LIST.map(s => {
            const labels: Record<string, { ar: string; fr: string }> = {
              '':          { ar: 'الكل',   fr: 'Tout' },
              PLANNED:     { ar: 'مخطط',   fr: 'Planifié' },
              IN_PROGRESS: { ar: 'جاري',   fr: 'En cours' },
              COMPLETED:   { ar: 'منجز',   fr: 'Terminé' },
              SUSPENDED:   { ar: 'موقوف',  fr: 'Suspendu' },
            };
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${active ? 'bg-teal-600 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-teal-400'}`}
              >
                {ar ? labels[s].ar : labels[s].fr}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} />{error}
            <button onClick={() => setError('')} className="ms-auto"><X size={14} /></button>
          </div>
        )}

        {/* Projects grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Briefcase size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">{ar ? 'لا توجد مشاريع مسجلة' : 'Aucun projet enregistré'}</p>
            <p className="text-xs mt-1 opacity-70">{ar ? 'ابدأ بإضافة مشروع جديد' : 'Commencez par ajouter un projet'}</p>
            <button onClick={() => openModal()} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700">
              {ar ? '+ إضافة مشروع' : '+ Créer un projet'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(proj => {
              const st = sMap[proj.status] || sMap.PLANNED;
              return (
                <div key={proj.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                      <span className="text-xl flex-shrink-0">{typeIcon(proj.type)}</span>
                      <span className="font-semibold text-gray-900 dark:text-white leading-tight truncate">{proj.title}</span>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${st.cls}`}>{st.label}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-xs px-2.5 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-full font-medium">
                      {typeLabel(proj.type, ar)}
                    </span>
                    {proj.code && (
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full font-mono">{proj.code}</span>
                    )}
                  </div>

                  {proj.location && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                      <MapPin size={12} />{proj.location}
                    </div>
                  )}
                  {proj.manager && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                      <User size={12} />{proj.manager}
                    </div>
                  )}

                  {proj.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{proj.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
                    {proj.budget != null && (
                      <span className="flex items-center gap-1"><DollarSign size={12} />{fmt(proj.budget)} MAD</span>
                    )}
                    {proj.startDate && (
                      <span className="flex items-center gap-1"><Calendar size={12} />{fmtDate(proj.startDate)}</span>
                    )}
                    {proj.endDate && <span>→ {fmtDate(proj.endDate)}</span>}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex gap-1">
                      <Link
                        to={`/coop/projects/${proj.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/40 font-medium transition-colors"
                      >
                        <Eye size={13} />{ar ? 'عرض' : 'Voir'}
                      </Link>
                      <button
                        onClick={() => openModal(proj)}
                        className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                      >
                        {ar ? 'تعديل' : 'Modifier'}
                      </button>
                    </div>
                    <button
                      onClick={() => setDeleteId(proj.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <Modal
          title={editProject ? (ar ? 'تعديل المشروع' : 'Modifier le projet') : (ar ? 'مشروع جديد' : 'Nouveau projet')}
          onClose={() => setModal(false)}
        >
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{ar ? 'نوع المشروع' : 'Type de projet'}</label>
                <select className={inputCls} value={form.type} onChange={f('type')}>
                  <option value="INTERNE">{ar ? 'مشروع داخلي' : 'Projet interne'}</option>
                  <option value="PARTENARIAT">{ar ? 'اتفاقية شراكة' : 'Partenariat'}</option>
                  <option value="FINANCEMENT">{ar ? 'طلب تمويل' : 'Financement'}</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{ar ? 'الحالة' : 'Statut'}</label>
                <select className={inputCls} value={form.status} onChange={f('status')}>
                  <option value="PLANNED">{ar ? 'مخطط' : 'Planifié'}</option>
                  <option value="IN_PROGRESS">{ar ? 'جاري' : 'En cours'}</option>
                  <option value="COMPLETED">{ar ? 'منجز' : 'Terminé'}</option>
                  <option value="SUSPENDED">{ar ? 'موقوف' : 'Suspendu'}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{ar ? 'عنوان المشروع *' : 'Titre du projet *'}</label>
                <input className={inputCls} value={form.title} onChange={f('title')} placeholder={ar ? 'عنوان المشروع...' : 'Titre du projet...'} />
              </div>
              <div>
                <label className={labelCls}>{ar ? 'كود المشروع' : 'Code projet'}</label>
                <input className={inputCls} value={form.code} onChange={f('code')} placeholder="PRJ-2024-001" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{ar ? 'الموقع / المنطقة' : 'Lieu / Région'}</label>
                <input className={inputCls} value={form.location} onChange={f('location')} placeholder={ar ? 'المدينة، الإقليم...' : 'Ville, province...'} />
              </div>
              <div>
                <label className={labelCls}>{ar ? 'المسؤول' : 'Responsable'}</label>
                <input className={inputCls} value={form.manager} onChange={f('manager')} placeholder={ar ? 'اسم المسؤول...' : 'Nom du responsable...'} />
              </div>
            </div>

            <div>
              <label className={labelCls}>{ar ? 'الهدف العام' : 'Objectif général'}</label>
              <textarea className={inputCls + ' resize-none'} rows={2} value={form.generalGoal} onChange={f('generalGoal')} placeholder={ar ? 'الهدف الرئيسي من المشروع...' : 'But principal du projet...'} />
            </div>

            <div>
              <label className={labelCls}>{ar ? 'الأهداف الخاصة' : 'Objectifs spécifiques'}</label>
              <textarea className={inputCls + ' resize-none'} rows={2} value={form.specificGoals} onChange={f('specificGoals')} placeholder={ar ? 'الأهداف التفصيلية...' : 'Objectifs détaillés...'} />
            </div>

            <div>
              <label className={labelCls}>{ar ? 'المستفيدون' : 'Bénéficiaires'}</label>
              <textarea className={inputCls + ' resize-none'} rows={2} value={form.beneficiaries} onChange={f('beneficiaries')} placeholder={ar ? 'الفئات المستهدفة...' : 'Groupes cibles...'} />
            </div>

            <div>
              <label className={labelCls}>{ar ? 'وصف المشروع' : 'Description'}</label>
              <textarea className={inputCls + ' resize-none'} rows={2} value={form.description} onChange={f('description')} placeholder={ar ? 'وصف مختصر...' : 'Description...'} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>{ar ? 'الميزانية (MAD)' : 'Budget (MAD)'}</label>
                <input type="number" min="0" className={inputCls} value={form.budget} onChange={f('budget')} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>{ar ? 'تاريخ البداية' : 'Date début'}</label>
                <input type="date" className={inputCls} value={form.startDate} onChange={f('startDate')} />
              </div>
              <div>
                <label className={labelCls}>{ar ? 'تاريخ النهاية' : 'Date fin'}</label>
                <input type="date" className={inputCls} value={form.endDate} onChange={f('endDate')} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                {ar ? 'إلغاء' : 'Annuler'}
              </button>
              <button onClick={save} disabled={saving || !form.title.trim()} className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? (ar ? 'جاري الحفظ...' : 'Enregistrement...') : (ar ? 'حفظ' : 'Enregistrer')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">{ar ? 'حذف المشروع؟' : 'Supprimer ce projet ?'}</p>
            <p className="text-sm text-gray-500">{ar ? 'لا يمكن التراجع عن هذا الإجراء.' : 'Cette action est irréversible.'}</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                {ar ? 'إلغاء' : 'Annuler'}
              </button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                {ar ? 'حذف' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
