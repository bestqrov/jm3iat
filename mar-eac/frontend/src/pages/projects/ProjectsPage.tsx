import React, { useEffect, useState } from 'react';
import { Plus, Briefcase, MapPin, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { projectsApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';

const PROJECT_TYPES = ['ROAD_REPAIR', 'WATER_INSTALLATION', 'LOCAL_DEVELOPMENT', 'EDUCATION', 'HEALTH', 'ENVIRONMENT', 'OTHER'];
const STATUS_TABS = ['', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const statusBadge: Record<string, string> = {
  PLANNED: 'badge-blue', IN_PROGRESS: 'badge-yellow', COMPLETED: 'badge-green', CANCELLED: 'badge-red',
};

export const ProjectsPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'OTHER', description: '', location: '', startDate: '', endDate: '', code: '', generalGoal: '', specificGoals: '', manager: '', budget: '', beneficiaries: '' });

  const load = async () => {
    try {
      const [ps, st] = await Promise.all([
        projectsApi.getAll(statusFilter ? { status: statusFilter } : {}),
        projectsApi.getStats(),
      ]);
      setProjects(ps.data);
      setStats(st.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); load(); }, [statusFilter]);

  const handleCreate = async () => {
    if (!form.title) return;
    setSaving(true);
    setSaveError(null);
    try {
      await projectsApi.create(form);
      setShowModal(false);
      setForm({ title: '', type: 'OTHER', description: '', location: '', startDate: '', endDate: '', code: '', generalGoal: '', specificGoals: '', manager: '', budget: '', beneficiaries: '' });
      load();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await projectsApi.delete(deleteId);
      setDeleteId(null);
      load();
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 p-5 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow">
            <Briefcase size={24} className="text-blue-200" />
            {t('projects.title')}
          </h2>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-sm font-semibold transition-colors shadow"><Plus size={15} />{t('projects.createProject')}</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard title={t('projects.stats.total')} value={stats.total ?? 0} icon={<Briefcase size={20} />} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard title={t('projects.stats.planned')} value={stats.planned ?? 0} icon={<Briefcase size={20} />} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
        <StatCard title={t('projects.stats.inProgress')} value={stats.inProgress ?? 0} icon={<Briefcase size={20} />} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400" />
        <StatCard title={t('projects.stats.completed')} value={stats.completed ?? 0} icon={<Briefcase size={20} />} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
            {s ? t(`projects.statuses.${s}`) : t('common.all')}
          </button>
        ))}
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : projects.length === 0 ? (
        <EmptyState icon={<Briefcase size={28} />} title={t('projects.noProjects')} action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} />{t('projects.createProject')}</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const funded = p.funding?.fundedAmount || 0;
            const total = p.funding?.totalBudget || 0;
            const pct = total > 0 ? Math.min(100, (funded / total) * 100) : 0;
            return (
              <div key={p.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{p.title}</h3>
                    <span className="badge badge-blue text-xs">{t(`projects.types.${p.type}`)}</span>
                  </div>
                  <span className={`badge ${statusBadge[p.status]} ms-2`}>{t(`projects.statuses.${p.status}`)}</span>
                </div>
                {p.location && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <MapPin size={12} />{p.location}
                  </div>
                )}
                {total > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{t('projects.funding')}</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <Link to={`/projects/${p.id}`} className="btn-secondary text-xs py-1.5">
                    <Eye size={13} />{t('common.view')}
                  </Link>
                  <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSaveError(null); }} title={t('projects.createProject')}
        footer={<><button onClick={() => { setShowModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
          {saveError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('projects.projectTitle')} *</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'كود المشروع' : 'Code projet'}</label>
              <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('projects.type')}</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {PROJECT_TYPES.map((pt) => <option key={pt} value={pt}>{t(`projects.types.${pt}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('projects.location')}</label>
              <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('projects.startDate')}</label>
              <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'تاريخ النهاية' : 'Date fin'}</label>
              <input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{lang === 'ar' ? 'المسؤول' : 'Responsable'}</label>
              <input className="input" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'الميزانية العامة (درهم)' : 'Montant général PRJ (MAD)'}</label>
              <input className="input" type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'الهدف العام' : 'But général'}</label>
            <textarea className="input" rows={2} value={form.generalGoal} onChange={(e) => setForm({ ...form, generalGoal: e.target.value })} />
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'الأهداف الخاصة' : 'Buts spéciaux'}</label>
            <textarea className="input" rows={2} value={form.specificGoals} onChange={(e) => setForm({ ...form, specificGoals: e.target.value })} />
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'المستفيدون' : 'Bénéficiaires'}</label>
            <textarea className="input" rows={2} value={form.beneficiaries} onChange={(e) => setForm({ ...form, beneficiaries: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('projects.description')}</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={lang === 'ar' ? 'حذف المشروع' : 'Supprimer le projet'} message={t('common.confirmDelete')} loading={deleting} />
    </div>
  );
};
