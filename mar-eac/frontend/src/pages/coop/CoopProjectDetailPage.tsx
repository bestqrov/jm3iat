import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Briefcase, ArrowRight, ArrowLeft, Edit2, Trash2, MapPin, User, Calendar, DollarSign, Target, Users, FileText, X, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { coopApi } from '../../lib/api';

interface CoopProject {
  id: string; title: string; type: string; status: string;
  code?: string; description?: string; location?: string; manager?: string;
  generalGoal?: string; specificGoals?: string; beneficiaries?: string;
  budget?: number; startDate?: string; endDate?: string;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-MA').format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

const statusMap = (ar: boolean): Record<string, { label: string; cls: string }> => ({
  PLANNED:     { label: ar ? 'مخطط'  : 'Planifié',  cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  IN_PROGRESS: { label: ar ? 'جاري'  : 'En cours',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  COMPLETED:   { label: ar ? 'منجز'  : 'Terminé',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  SUSPENDED:   { label: ar ? 'موقوف' : 'Suspendu',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
});

const typeLabel = (type: string, ar: boolean) => {
  if (type === 'PARTENARIAT') return ar ? 'شراكة' : 'Partenariat';
  if (type === 'FINANCEMENT') return ar ? 'تمويل' : 'Financement';
  return ar ? 'مشروع داخلي' : 'Projet interne';
};

const typeIcon = (type: string) =>
  type === 'PARTENARIAT' ? '🤝' : type === 'FINANCEMENT' ? '💰' : '🏗️';

export const CoopProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const ar = lang === 'ar';

  const [project, setProject] = useState<CoopProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [editModal, setEditModal]   = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = async () => {
    if (!id) return;
    try {
      const r = await coopApi.getCoopProject(id);
      setProject(r.data);
    } catch { setError('Not found'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const openEdit = () => {
    if (!project) return;
    setForm({
      title: project.title, type: project.type, status: project.status,
      code: project.code || '', location: project.location || '', manager: project.manager || '',
      generalGoal: project.generalGoal || '', specificGoals: project.specificGoals || '',
      beneficiaries: project.beneficiaries || '', description: project.description || '',
      budget: project.budget?.toString() || '', startDate: project.startDate?.slice(0, 10) || '',
      endDate: project.endDate?.slice(0, 10) || '',
    });
    setEditModal(true);
  };

  const save = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const payload = { ...form, budget: form.budget ? parseFloat(form.budget) : undefined };
      await coopApi.updateCoopProject(project.id, payload);
      setEditModal(false);
      load();
    } catch (e: any) { setError(e.response?.data?.message || 'Erreur'); }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!project) return;
    await coopApi.deleteCoopProject(project.id);
    navigate('/coop/projects');
  };

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p: any) => ({ ...p, [key]: e.target.value }));

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  if (loading) return <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!project) return <div className="text-center py-24 text-gray-400"><AlertCircle size={48} className="mx-auto mb-3 opacity-30" /><p>{ar ? 'لم يُعثر على المشروع' : 'Projet introuvable'}</p></div>;

  const sMap = statusMap(ar);
  const st = sMap[project.status] || sMap.PLANNED;

  return (
    <div className="p-4 space-y-5 max-w-4xl mx-auto" dir={ar ? 'rtl' : 'ltr'}>

      {/* Back + actions bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/coop/projects" className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors">
          {ar ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          {ar ? 'العودة إلى المشاريع' : 'Retour aux projets'}
        </Link>
        <div className="flex gap-2">
          <button onClick={openEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <Edit2 size={14} />{ar ? 'تعديل' : 'Modifier'}
          </button>
          <button onClick={() => setDeleteModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
            <Trash2 size={14} />{ar ? 'حذف' : 'Supprimer'}
          </button>
        </div>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#0f766e 0%,#0d9488 60%,#14b8a6 100%)' }}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl flex-shrink-0">
            {typeIcon(project.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.cls}`}>{st.label}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 text-white font-medium">{typeLabel(project.type, ar)}</span>
              {project.code && <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-teal-100 font-mono">{project.code}</span>}
            </div>
            <h1 className="text-xl font-bold text-white">{project.title}</h1>
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {project.location && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-2">
            <MapPin size={16} className="text-teal-500 flex-shrink-0" />
            <div className="min-w-0"><div className="text-xs text-gray-400">{ar ? 'الموقع' : 'Lieu'}</div><div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{project.location}</div></div>
          </div>
        )}
        {project.manager && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-2">
            <User size={16} className="text-indigo-500 flex-shrink-0" />
            <div className="min-w-0"><div className="text-xs text-gray-400">{ar ? 'المسؤول' : 'Responsable'}</div><div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{project.manager}</div></div>
          </div>
        )}
        {project.budget != null && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-2">
            <DollarSign size={16} className="text-amber-500 flex-shrink-0" />
            <div className="min-w-0"><div className="text-xs text-gray-400">{ar ? 'الميزانية' : 'Budget'}</div><div className="text-sm font-bold text-amber-600">{fmt(project.budget)} MAD</div></div>
          </div>
        )}
        {(project.startDate || project.endDate) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-2">
            <Calendar size={16} className="text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-gray-400">{ar ? 'الفترة' : 'Période'}</div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {project.startDate ? fmtDate(project.startDate) : '—'}
                {project.endDate && <><br />→ {fmtDate(project.endDate)}</>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info sections */}
      {[
        { icon: <Target size={16} />, title: ar ? 'الهدف العام' : 'Objectif général', content: project.generalGoal, color: 'text-teal-500' },
        { icon: <Target size={16} />, title: ar ? 'الأهداف الخاصة' : 'Objectifs spécifiques', content: project.specificGoals, color: 'text-indigo-500' },
        { icon: <Users size={16} />, title: ar ? 'المستفيدون' : 'Bénéficiaires', content: project.beneficiaries, color: 'text-amber-500' },
        { icon: <FileText size={16} />, title: ar ? 'الوصف' : 'Description', content: project.description, color: 'text-blue-500' },
      ].filter(s => s.content).map((s, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className={s.color}>{s.icon}</span>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{s.title}</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{s.content}</p>
        </div>
      ))}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{ar ? 'تعديل المشروع' : 'Modifier le projet'}</h2>
              <button onClick={() => setEditModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>{ar ? 'نوع المشروع' : 'Type'}</label>
                  <select className={inputCls} value={form.type} onChange={f('type')}>
                    <option value="INTERNE">{ar ? 'مشروع داخلي' : 'Projet interne'}</option>
                    <option value="PARTENARIAT">{ar ? 'اتفاقية شراكة' : 'Partenariat'}</option>
                    <option value="FINANCEMENT">{ar ? 'طلب تمويل' : 'Financement'}</option>
                  </select>
                </div>
                <div><label className={labelCls}>{ar ? 'الحالة' : 'Statut'}</label>
                  <select className={inputCls} value={form.status} onChange={f('status')}>
                    <option value="PLANNED">{ar ? 'مخطط' : 'Planifié'}</option>
                    <option value="IN_PROGRESS">{ar ? 'جاري' : 'En cours'}</option>
                    <option value="COMPLETED">{ar ? 'منجز' : 'Terminé'}</option>
                    <option value="SUSPENDED">{ar ? 'موقوف' : 'Suspendu'}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>{ar ? 'عنوان المشروع *' : 'Titre *'}</label><input className={inputCls} value={form.title} onChange={f('title')} /></div>
                <div><label className={labelCls}>{ar ? 'كود المشروع' : 'Code'}</label><input className={inputCls} value={form.code} onChange={f('code')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>{ar ? 'الموقع' : 'Lieu'}</label><input className={inputCls} value={form.location} onChange={f('location')} /></div>
                <div><label className={labelCls}>{ar ? 'المسؤول' : 'Responsable'}</label><input className={inputCls} value={form.manager} onChange={f('manager')} /></div>
              </div>
              <div><label className={labelCls}>{ar ? 'الهدف العام' : 'Objectif général'}</label><textarea className={inputCls + ' resize-none'} rows={2} value={form.generalGoal} onChange={f('generalGoal')} /></div>
              <div><label className={labelCls}>{ar ? 'الأهداف الخاصة' : 'Objectifs spécifiques'}</label><textarea className={inputCls + ' resize-none'} rows={2} value={form.specificGoals} onChange={f('specificGoals')} /></div>
              <div><label className={labelCls}>{ar ? 'المستفيدون' : 'Bénéficiaires'}</label><textarea className={inputCls + ' resize-none'} rows={2} value={form.beneficiaries} onChange={f('beneficiaries')} /></div>
              <div><label className={labelCls}>{ar ? 'الوصف' : 'Description'}</label><textarea className={inputCls + ' resize-none'} rows={2} value={form.description} onChange={f('description')} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={labelCls}>{ar ? 'الميزانية (MAD)' : 'Budget (MAD)'}</label><input type="number" className={inputCls} value={form.budget} onChange={f('budget')} /></div>
                <div><label className={labelCls}>{ar ? 'تاريخ البداية' : 'Date début'}</label><input type="date" className={inputCls} value={form.startDate} onChange={f('startDate')} /></div>
                <div><label className={labelCls}>{ar ? 'تاريخ النهاية' : 'Date fin'}</label><input type="date" className={inputCls} value={form.endDate} onChange={f('endDate')} /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditModal(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {ar ? 'إلغاء' : 'Annuler'}
                </button>
                <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-40">
                  {saving ? '...' : (ar ? 'حفظ' : 'Enregistrer')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">{ar ? 'حذف المشروع؟' : 'Supprimer ce projet ?'}</p>
            <p className="text-sm text-gray-500">{ar ? 'لا يمكن التراجع عن هذا الإجراء.' : 'Cette action est irréversible.'}</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteModal(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
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
