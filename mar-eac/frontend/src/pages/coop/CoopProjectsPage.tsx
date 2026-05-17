import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Plus, Edit2, Trash2, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { coopApi } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CoopProject {
  id: string;
  title: string;
  type: string;
  status: string;
  description?: string;
  generalGoal?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><X size={18} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const fmt = (n: number) => new Intl.NumberFormat('fr-MA').format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Main Component ────────────────────────────────────────────────────────────

export const CoopProjectsPage: React.FC = () => {
  const { lang } = useLanguage();
  const { organization } = useAuth();
  const ar = lang === 'ar';

  const [projects, setProjects] = useState<CoopProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editProject, setEditProject] = useState<CoopProject | null>(null);
  const [form, setForm] = useState({ title: '', type: 'INTERNE', description: '', partnerName: '', budget: '', startDate: '', endDate: '', status: 'PLANNED' });

  const load = useCallback(async () => {
    try {
      const r = await coopApi.getCoopProjects();
      setProjects(r.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (p?: CoopProject) => {
    if (p) {
      const partnerName = p.generalGoal?.startsWith('Partenaire: ') ? p.generalGoal.replace('Partenaire: ', '') : '';
      setForm({ title: p.title, type: p.type, description: p.description || '', partnerName, budget: p.budget?.toString() || '', startDate: p.startDate?.slice(0, 10) || '', endDate: p.endDate?.slice(0, 10) || '', status: p.status });
      setEditProject(p);
    } else {
      setForm({ title: '', type: 'INTERNE', description: '', partnerName: '', budget: '', startDate: '', endDate: '', status: 'PLANNED' });
      setEditProject(null);
    }
    setModal(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      budget: form.budget ? parseFloat(form.budget) : undefined,
      generalGoal: form.type === 'PARTENARIAT' && form.partnerName ? `Partenaire: ${form.partnerName}` : undefined,
    };
    if (editProject) await coopApi.updateCoopProject(editProject.id, payload);
    else await coopApi.createCoopProject(payload);
    setModal(false);
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(ar ? 'حذف هذا المشروع؟' : 'Supprimer ce projet ?')) return;
    await coopApi.deleteCoopProject(id);
    load();
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    PLANNED:     { label: ar ? 'مخطط'     : 'Planifié',  color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    IN_PROGRESS: { label: ar ? 'جاري'     : 'En cours',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    COMPLETED:   { label: ar ? 'منجز'     : 'Terminé',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    SUSPENDED:   { label: ar ? 'موقوف'    : 'Suspendu',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };

  const stats = [
    { label: ar ? 'إجمالي المشاريع' : 'Total projets',  value: projects.length,                                         color: 'from-teal-500 to-teal-600' },
    { label: ar ? 'شراكات'          : 'Partenariats',   value: projects.filter(p => p.type === 'PARTENARIAT').length,   color: 'from-indigo-500 to-indigo-600' },
    { label: ar ? 'قيد التنفيذ'     : 'En cours',       value: projects.filter(p => p.status === 'IN_PROGRESS').length, color: 'from-amber-500 to-amber-600' },
    { label: ar ? 'منجزة'           : 'Terminés',       value: projects.filter(p => p.status === 'COMPLETED').length,   color: 'from-emerald-500 to-emerald-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">{ar ? 'المشاريع والشراكات' : 'Projets & Partenariats'}</h1>
            <p className="text-teal-100 text-sm mt-0.5">{organization?.name}</p>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium backdrop-blur-sm transition-colors">
            <Plus size={16} /> {ar ? 'مشروع جديد' : 'Nouveau projet'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-4 shadow-sm`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-white/80 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Projects grid */}
        {loading && (
          <div className="text-center py-16 text-gray-400">{ar ? 'جاري التحميل...' : 'Chargement...'}</div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Briefcase size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">{ar ? 'لا توجد مشاريع مسجلة' : 'Aucun projet enregistré'}</p>
            <p className="text-xs mt-1 opacity-70">{ar ? 'ابدأ بإضافة مشروع جديد' : 'Commencez par ajouter un projet'}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(proj => {
            const isPartnership = proj.type === 'PARTENARIAT';
            const partnerName = proj.generalGoal?.startsWith('Partenaire: ') ? proj.generalGoal.replace('Partenaire: ', '') : '';
            const st = statusMap[proj.status] || statusMap.PLANNED;
            return (
              <div key={proj.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl">{isPartnership ? '🤝' : '🏗️'}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{proj.title}</span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openModal(proj)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => remove(proj.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  <span className="text-xs text-gray-500 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                    {isPartnership ? (ar ? 'شراكة' : 'Partenariat') : proj.type === 'FINANCEMENT' ? (ar ? 'تمويل' : 'Financement') : (ar ? 'مشروع داخلي' : 'Projet interne')}
                  </span>
                </div>

                {isPartnership && partnerName && (
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mb-2">
                    🤝 {ar ? 'الشريك: ' : 'Partenaire: '}{partnerName}
                  </div>
                )}

                {proj.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{proj.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap pt-2 border-t border-gray-100 dark:border-gray-700">
                  {proj.budget != null && <span>💰 {fmt(proj.budget)} MAD</span>}
                  {proj.startDate && <span>📅 {fmtDate(proj.startDate)}</span>}
                  {proj.endDate && <span>→ {fmtDate(proj.endDate)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          title={editProject ? (ar ? 'تعديل المشروع' : 'Modifier le projet') : (ar ? 'مشروع جديد' : 'Nouveau projet')}
          onClose={() => setModal(false)}
          wide
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{ar ? 'نوع المشروع' : 'Type de projet'}</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="INTERNE">{ar ? 'مشروع داخلي' : 'Projet interne'}</option>
                  <option value="PARTENARIAT">{ar ? 'اتفاقية شراكة' : 'Partenariat'}</option>
                  <option value="FINANCEMENT">{ar ? 'طلب تمويل' : 'Financement'}</option>
                </select>
              </div>
              <div>
                <label className="label">{ar ? 'الحالة' : 'Statut'}</label>
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="PLANNED">{ar ? 'مخطط' : 'Planifié'}</option>
                  <option value="IN_PROGRESS">{ar ? 'جاري' : 'En cours'}</option>
                  <option value="COMPLETED">{ar ? 'منجز' : 'Terminé'}</option>
                  <option value="SUSPENDED">{ar ? 'موقوف' : 'Suspendu'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">{ar ? 'عنوان المشروع' : 'Titre du projet'}</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={ar ? 'أدخل عنوان المشروع' : 'Titre du projet...'} />
            </div>

            {form.type === 'PARTENARIAT' && (
              <div>
                <label className="label">{ar ? 'اسم الشريك' : 'Nom du partenaire'}</label>
                <input className="input" value={form.partnerName} onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))} placeholder={ar ? 'وزارة، جمعية، مؤسسة...' : 'Ministère, ONG, entreprise...'} />
              </div>
            )}

            <div>
              <label className="label">{ar ? 'وصف المشروع' : 'Description'}</label>
              <textarea className="input resize-none" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={ar ? 'وصف مختصر للمشروع...' : 'Description du projet...'} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">{ar ? 'الميزانية (MAD)' : 'Budget (MAD)'}</label>
                <input type="number" className="input" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="label">{ar ? 'تاريخ البداية' : 'Date de début'}</label>
                <input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">{ar ? 'تاريخ النهاية' : 'Date de fin'}</label>
                <input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(false)} className="btn-secondary">{ar ? 'إلغاء' : 'Annuler'}</button>
              <button onClick={save} className="btn-primary">{ar ? 'حفظ' : 'Enregistrer'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
