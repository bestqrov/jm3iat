import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, MapPin, Calendar, CheckCircle2,
  Clock, AlertCircle, Circle, Pencil, Sparkles, FileDown, ChevronRight,
  FileText, Save, Loader2,
} from 'lucide-react';
import { projectsApi, fundingApi, requestsApi, documentsApi, milestonesApi, technicalCardApi } from '../../lib/api';
import { downloadBlob } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '../../lib/utils';

const FUNDING_SOURCES = ['COMMUNE', 'DONOR', 'INTERNAL', 'GRANT', 'OTHER'];

const MS_STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: { fr: string; ar: string } }> = {
  PENDING:     { color: 'text-gray-400',    bg: 'bg-gray-100 dark:bg-gray-800',      icon: <Circle size={14} />,       label: { fr: 'En attente', ar: 'قيد الانتظار' } },
  IN_PROGRESS: { color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20',    icon: <Clock size={14} />,        label: { fr: 'En cours',   ar: 'جاري' } },
  COMPLETED:   { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: <CheckCircle2 size={14} />, label: { fr: 'Réalisé',   ar: 'منجز' } },
  DELAYED:     { color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20',      icon: <AlertCircle size={14} />,  label: { fr: 'Retardé',   ar: 'متأخر' } },
};

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();

  const [project, setProject] = useState<any>(null);
  const [funding, setFunding] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('avancement');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal states
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'funding' | 'milestone'; id: string } | null>(null);

  // Forms
  const [fundingForm, setFundingForm] = useState({ source: 'COMMUNE', amount: '', donor: '', notes: '' });
  const [budgetForm, setBudgetForm] = useState({ totalBudget: '' });
  const [msForm, setMsForm] = useState({ title: '', description: '', plannedDate: '', actualDate: '', status: 'PENDING' });

  // Technical card
  const [tc, setTc] = useState<any>({});
  const [tcSaving, setTcSaving]         = useState(false);
  const [tcExporting, setTcExporting]   = useState(false);
  const [tcSaved, setTcSaved]           = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const [p, f, r, d, m, tcRes] = await Promise.allSettled([
        projectsApi.getById(id),
        fundingApi.get(id),
        requestsApi.getAll(),
        documentsApi.getAll({ projectId: id }),
        milestonesApi.getAll(id),
        technicalCardApi.get(id),
      ]);
      if (p.status === 'fulfilled') setProject(p.value.data);
      if (f.status === 'fulfilled') setFunding(f.value.data);
      if (r.status === 'fulfilled') setRequests(r.value.data.filter((req: any) => req.projectId === id));
      if (d.status === 'fulfilled') setDocuments(d.value.data);
      if (m.status === 'fulfilled') setMilestones(m.value.data);
      if (tcRes.status === 'fulfilled') setTc(tcRes.value.data.technicalCard || {});
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  // ── Funding handlers ─────────────────────────────────────────────────────
  const handleAddFunding = async () => {
    if (!id || !fundingForm.amount) return;
    setSaving(true); setSaveError(null);
    try {
      await fundingApi.addEntry(id, fundingForm);
      setShowFundingModal(false);
      setFundingForm({ source: 'COMMUNE', amount: '', donor: '', notes: '' });
      load();
    } catch (err: any) { setSaveError(err?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleUpdateBudget = async () => {
    if (!id || !budgetForm.totalBudget) return;
    setSaving(true); setSaveError(null);
    try {
      await fundingApi.updateBudget(id, parseFloat(budgetForm.totalBudget));
      setShowBudgetModal(false); load();
    } catch (err: any) { setSaveError(err?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  // ── Milestone handlers ────────────────────────────────────────────────────
  const openMilestoneModal = (ms?: any) => {
    if (ms) {
      setEditingMilestone(ms);
      setMsForm({
        title: ms.title,
        description: ms.description || '',
        plannedDate: ms.plannedDate ? ms.plannedDate.split('T')[0] : '',
        actualDate: ms.actualDate ? ms.actualDate.split('T')[0] : '',
        status: ms.status,
      });
    } else {
      setEditingMilestone(null);
      setMsForm({ title: '', description: '', plannedDate: '', actualDate: '', status: 'PENDING' });
    }
    setShowMilestoneModal(true);
  };

  const handleSaveMilestone = async () => {
    if (!id || !msForm.title) return;
    setSaving(true);
    try {
      if (editingMilestone) {
        await milestonesApi.update(id, editingMilestone.id, msForm);
      } else {
        await milestonesApi.create(id, msForm);
      }
      setShowMilestoneModal(false);
      load();
    } catch (err: any) { alert(err?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleGeneratePlan = async () => {
    if (!id) return;
    const confirmed = window.confirm(
      lang === 'ar'
        ? 'سيتم حذف المراحل الحالية وإنشاء خطة جديدة تلقائياً. هل تريد المتابعة؟'
        : 'Cela va remplacer les jalons existants par un plan généré automatiquement. Continuer ?'
    );
    if (!confirmed) return;
    setGenerating(true);
    try {
      const res = await milestonesApi.generatePlan(id);
      setMilestones(res.data);
    } catch { alert(lang === 'ar' ? 'خطأ في توليد الخطة' : 'Erreur lors de la génération'); }
    finally { setGenerating(false); }
  };

  const handleExportReport = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const res = await milestonesApi.exportReport(id, lang);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-projet-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert(lang === 'ar' ? 'خطأ في تصدير التقرير' : 'Erreur export PDF'); }
    finally { setExporting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !id) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'funding') await fundingApi.deleteEntry(deleteTarget.id);
      else await milestonesApi.delete(id, deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch {} finally { setDeleting(false); }
  };

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    await projectsApi.update(id, { status });
    load();
  };

  const handleMilestoneStatusCycle = async (ms: any) => {
    if (!id) return;
    const next: Record<string, string> = { PENDING: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED', COMPLETED: 'PENDING', DELAYED: 'IN_PROGRESS' };
    const actualDate = next[ms.status] === 'COMPLETED' ? new Date().toISOString().split('T')[0] : ms.actualDate?.split('T')[0] || '';
    await milestonesApi.update(id, ms.id, { status: next[ms.status], actualDate });
    load();
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!project) return <div className="text-center py-16 text-gray-500">{t('common.noData')}</div>;

  const funded = funding?.fundedAmount || 0;
  const total = funding?.totalBudget || 0;
  const pct = total > 0 ? Math.min(100, (funded / total) * 100) : 0;
  const completedMs = milestones.filter((m) => m.status === 'COMPLETED').length;
  const msPct = milestones.length > 0 ? Math.round((completedMs / milestones.length) * 100) : 0;

  const statusBadge: Record<string, string> = { PLANNED: 'badge-blue', IN_PROGRESS: 'badge-yellow', COMPLETED: 'badge-green', CANCELLED: 'badge-red' };

  const handleSaveTc = async () => {
    if (!id) return;
    setTcSaving(true);
    try {
      await technicalCardApi.save(id, tc);
      setTcSaved(true);
      setTimeout(() => setTcSaved(false), 2000);
    } catch {}
    setTcSaving(false);
  };

  const handleExportTcPdf = async () => {
    if (!id) return;
    setTcExporting(true);
    try {
      const res = await technicalCardApi.exportPdf(id);
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), `bataqa-taniya-${project.title}.pdf`);
    } catch {}
    setTcExporting(false);
  };

  const TABS = [
    { key: 'avancement',     label: lang === 'ar' ? 'التقدم والمراحل' : 'Avancement' },
    { key: 'details',        label: t('projects.tabs.details') },
    { key: 'funding',        label: t('projects.tabs.funding') },
    { key: 'requests',       label: t('projects.tabs.requests') },
    { key: 'documents',      label: t('projects.tabs.documents') },
    { key: 'technicalCard',  label: lang === 'ar' ? 'البطاقة التقنية' : 'Fiche Technique' },
  ];

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link to="/projects" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-4">
          <ArrowLeft size={16} />{t('common.back')}
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="page-title">{project.title}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="badge badge-blue">{t(`projects.types.${project.type}`)}</span>
              <span className={statusBadge[project.status]}>{t(`projects.statuses.${project.status}`)}</span>
              {project.location && <span className="flex items-center gap-1 text-sm text-gray-500"><MapPin size={13} />{project.location}</span>}
              {project.startDate && <span className="flex items-center gap-1 text-sm text-gray-500"><Calendar size={13} />{formatDate(project.startDate, lang)}</span>}
              {project.endDate && <span className="flex items-center gap-1 text-sm text-gray-500"><ChevronRight size={13} />{formatDate(project.endDate, lang)}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleExportReport} disabled={exporting}
              className="btn-secondary text-sm">
              <FileDown size={15} />{exporting ? '...' : (lang === 'ar' ? 'تصدير التقرير' : 'Rapport PDF')}
            </button>
            {project.status === 'PLANNED' && <button onClick={() => handleStatusChange('IN_PROGRESS')} className="btn-primary text-sm">{lang === 'ar' ? 'بدء المشروع' : 'Démarrer'}</button>}
            {project.status === 'IN_PROGRESS' && <button onClick={() => handleStatusChange('COMPLETED')} className="btn-success text-sm">{lang === 'ar' ? 'إتمام المشروع' : 'Terminer'}</button>}
          </div>
        </div>
      </div>

      {/* Progress overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Milestones progress */}
        <div className="card p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {lang === 'ar' ? 'تقدم المراحل' : 'Avancement des jalons'}
            </span>
            <span className="text-lg font-bold text-primary-600">{msPct}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div className="bg-primary-500 h-3 rounded-full transition-all duration-500" style={{ width: `${msPct}%` }} />
          </div>
          <p className="text-xs text-gray-400">{completedMs} / {milestones.length} {lang === 'ar' ? 'مرحلة منجزة' : 'jalons réalisés'}</p>
        </div>
        {/* Funding progress */}
        <div className="card p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('projects.funding')}</span>
            <span className="text-lg font-bold text-emerald-600">{pct.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatCurrency(funded, lang)}</span>
            <span>{lang === 'ar' ? 'من ' : 'sur '}{formatCurrency(total, lang)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── AVANCEMENT TAB ────────────────────────────────────────────────── */}
      {activeTab === 'avancement' && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lang === 'ar'
                ? 'أضف مراحل يدوياً أو اترك النظام يولّد خطة متكاملة حسب نوع المشروع'
                : 'Ajoutez des jalons manuellement ou laissez le système générer un plan complet selon le type de projet'}
            </p>
            <div className="flex gap-2">
              <button onClick={handleGeneratePlan} disabled={generating}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-60">
                <Sparkles size={15} />
                {generating
                  ? (lang === 'ar' ? 'جاري التوليد...' : 'Génération...')
                  : (lang === 'ar' ? 'توليد خطة تلقائية' : 'Générer un plan')}
              </button>
              <button onClick={() => openMilestoneModal()} className="btn-primary text-sm">
                <Plus size={15} />{lang === 'ar' ? 'مرحلة جديدة' : 'Nouveau jalon'}
              </button>
            </div>
          </div>

          {milestones.length === 0 ? (
            <div className="card p-12 text-center">
              <Sparkles size={36} className="text-violet-400 mx-auto mb-3" />
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-lg mb-1">
                {lang === 'ar' ? 'لا توجد مراحل بعد' : 'Aucun jalon défini'}
              </p>
              <p className="text-sm text-gray-400 mb-4">
                {lang === 'ar'
                  ? 'انقر على "توليد خطة تلقائية" لإنشاء مراحل المشروع حسب نوعه ومدته'
                  : 'Cliquez sur "Générer un plan" pour créer automatiquement les jalons selon le type et la durée du projet'}
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={handleGeneratePlan} disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm">
                  <Sparkles size={16} />{lang === 'ar' ? 'توليد خطة تلقائية' : 'Générer un plan automatique'}
                </button>
                <button onClick={() => openMilestoneModal()} className="btn-secondary text-sm">
                  <Plus size={15} />{lang === 'ar' ? 'إضافة يدوية' : 'Ajouter manuellement'}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute start-[22px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-300 via-primary-200 to-gray-200 dark:from-primary-700 dark:via-primary-800 dark:to-gray-700" />

              <div className="space-y-3">
                {milestones.map((ms, idx) => {
                  const cfg = MS_STATUS_CONFIG[ms.status] || MS_STATUS_CONFIG.PENDING;
                  const isLast = idx === milestones.length - 1;
                  const isOverdue = ms.status !== 'COMPLETED' && ms.plannedDate && new Date(ms.plannedDate) < new Date();
                  return (
                    <div key={ms.id} className="flex gap-4 ps-0">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <button
                          onClick={() => handleMilestoneStatusCycle(ms)}
                          title={lang === 'ar' ? 'انقر لتغيير الحالة' : 'Cliquer pour changer le statut'}
                          className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                            ms.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-600 text-white' :
                            ms.status === 'IN_PROGRESS' ? 'bg-blue-500 border-blue-600 text-white' :
                            ms.status === 'DELAYED' ? 'bg-red-500 border-red-600 text-white' :
                            'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                          }`}>
                          {cfg.icon}
                        </button>
                        <span className="absolute -bottom-1 -end-1 w-4 h-4 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-500">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Card */}
                      <div className={`flex-1 mb-2 rounded-xl border p-4 transition-all ${cfg.bg} ${isOverdue ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{ms.title}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color} bg-white dark:bg-gray-900 border border-current`}>
                                {cfg.label[lang as 'fr' | 'ar'] || cfg.label.fr}
                              </span>
                              {isOverdue && ms.status !== 'COMPLETED' && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                                  {lang === 'ar' ? 'متأخر' : 'En retard'}
                                </span>
                              )}
                            </div>
                            {ms.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ms.description}</p>}
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                              {ms.plannedDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} className="text-gray-400" />
                                  {lang === 'ar' ? 'مخطط: ' : 'Prévu : '}{formatDate(ms.plannedDate, lang)}
                                </span>
                              )}
                              {ms.actualDate && (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 size={10} />
                                  {lang === 'ar' ? 'فعلي: ' : 'Réalisé : '}{formatDate(ms.actualDate, lang)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => openMilestoneModal(ms)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setDeleteTarget({ type: 'milestone', id: ms.id })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress summary at bottom */}
              <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-4 flex-wrap">
                {Object.entries(MS_STATUS_CONFIG).map(([status, cfg]) => {
                  const count = milestones.filter((m) => m.status === status).length;
                  return (
                    <div key={status} className="flex items-center gap-1.5 text-sm">
                      <span className={cfg.color}>{cfg.icon}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                      <span className="text-gray-500">{cfg.label[lang as 'fr' | 'ar'] || cfg.label.fr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DETAILS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'details' && (
        <div className="card p-5 space-y-4">
          {project.description && (
            <div>
              <label className="label">{t('projects.description')}</label>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">{t('projects.type')}:</span> <strong>{t(`projects.types.${project.type}`)}</strong></div>
            <div><span className="text-gray-500">{t('projects.status')}:</span> <strong>{t(`projects.statuses.${project.status}`)}</strong></div>
            {project.manager && <div><span className="text-gray-500">{lang === 'ar' ? 'المسؤول:' : 'Responsable:'}</span> <strong>{project.manager}</strong></div>}
            {project.startDate && <div><span className="text-gray-500">{t('projects.startDate')}:</span> <strong>{formatDate(project.startDate, lang)}</strong></div>}
            {project.endDate && <div><span className="text-gray-500">{t('projects.endDate')}:</span> <strong>{formatDate(project.endDate, lang)}</strong></div>}
            {project.budget && <div><span className="text-gray-500">{lang === 'ar' ? 'الميزانية:' : 'Budget:'}</span> <strong>{formatCurrency(project.budget, lang)}</strong></div>}
            {project.beneficiaries && <div className="col-span-2"><span className="text-gray-500">{lang === 'ar' ? 'المستفيدون:' : 'Bénéficiaires:'}</span> <strong>{project.beneficiaries}</strong></div>}
          </div>
          {project.generalGoal && (
            <div>
              <label className="label">{lang === 'ar' ? 'الهدف العام' : 'But général'}</label>
              <p className="text-sm text-gray-700 dark:text-gray-300">{project.generalGoal}</p>
            </div>
          )}
          {project.specificGoals && (
            <div>
              <label className="label">{lang === 'ar' ? 'الأهداف الخاصة' : 'Buts spécifiques'}</label>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{project.specificGoals}</p>
            </div>
          )}
        </div>
      )}

      {/* ── FUNDING TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'funding' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button onClick={() => { setBudgetForm({ totalBudget: total.toString() }); setShowBudgetModal(true); }} className="btn-secondary text-sm">{t('funding.updateBudget')}</button>
            <button onClick={() => setShowFundingModal(true)} className="btn-primary text-sm"><Plus size={14} />{t('funding.addEntry')}</button>
          </div>
          {!funding?.entries?.length ? (
            <div className="card p-8 text-center text-gray-400 text-sm">{t('common.noData')}</div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr>
                    <th>{t('funding.source')}</th><th>{t('funding.donor')}</th>
                    <th>{t('common.date')}</th><th>{lang === 'ar' ? 'المبلغ' : 'Montant'}</th>
                    <th>{t('common.actions')}</th>
                  </tr></thead>
                  <tbody>
                    {funding.entries.map((entry: any) => (
                      <tr key={entry.id}>
                        <td><span className="badge badge-blue">{t(`funding.sources.${entry.source}`)}</span></td>
                        <td>{entry.donor || '-'}</td>
                        <td>{formatDate(entry.date, lang)}</td>
                        <td className="font-semibold text-emerald-600">{formatCurrency(entry.amount, lang)}</td>
                        <td><button onClick={() => setDeleteTarget({ type: 'funding', id: entry.id })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REQUESTS TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'requests' && (
        <div className="card p-4">
          {requests.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">{lang === 'ar' ? 'لا توجد طلبات مرتبطة' : 'Aucune demande liée'}</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{req.title}</div>
                    <div className="text-xs text-gray-500">{t(`requests.types.${req.type}`)} • {formatDate(req.createdAt, lang)}</div>
                  </div>
                  <span className={`badge ${req.status === 'APPROVED' ? 'badge-green' : req.status === 'REJECTED' ? 'badge-red' : 'badge-yellow'}`}>
                    {t(`requests.statuses.${req.status}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENTS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="card p-4">
          {documents.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">{lang === 'ar' ? 'لا توجد وثائق مرتبطة' : 'Aucun document lié'}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{doc.title}</div>
                  <div className="text-xs text-gray-500">{formatDate(doc.createdAt, lang)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TECHNICAL CARD TAB ───────────────────────────────────────────── */}
      {activeTab === 'technicalCard' && (
        <div className="space-y-5" dir="rtl">
          {/* Actions bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-primary-600" />
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                {lang === 'ar' ? 'البطاقة التقنية للمشروع' : 'Fiche Technique du Projet'}
              </h3>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExportTcPdf} disabled={tcExporting} className="btn-secondary flex items-center gap-2 text-sm">
                {tcExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                {lang === 'ar' ? 'تصدير PDF' : 'Exporter PDF'}
              </button>
              <button onClick={handleSaveTc} disabled={tcSaving} className="btn-primary flex items-center gap-2 text-sm">
                {tcSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {tcSaved ? (lang === 'ar' ? 'تم الحفظ ✓' : 'Enregistré ✓') : (lang === 'ar' ? 'حفظ' : 'Enregistrer')}
              </button>
            </div>
          </div>

          {/* Section: الصفة */}
          <div className="card p-5">
            <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-4 border-b pb-2 border-gray-200 dark:border-gray-700 text-right">الصفة</h4>
            <div className="flex gap-6 justify-end">
              {['تعاونية', 'شباب حامل فكرة مشروع'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                  <input type="radio" name="holderType" value={opt}
                    checked={(tc.holderType || 'تعاونية') === opt}
                    onChange={() => setTc((p: any) => ({ ...p, holderType: opt }))}
                    className="w-4 h-4 accent-primary-600" />
                </label>
              ))}
            </div>
          </div>

          {/* Section: سلسلة المشروع */}
          <div className="card p-5">
            <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-4 border-b pb-2 border-gray-200 dark:border-gray-700 text-right">سلسلة المشروع</h4>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <input key={i} value={(tc.projectChain || [])[i] || ''} placeholder={`......... ${i + 1}`}
                  onChange={e => {
                    const arr = [...(tc.projectChain || Array(9).fill(''))];
                    arr[i] = e.target.value;
                    setTc((p: any) => ({ ...p, projectChain: arr }));
                  }}
                  className="input text-right text-sm" />
              ))}
            </div>
          </div>

          {/* Section: معلومات الوحدة */}
          <div className="card p-5">
            <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-4 border-b pb-2 border-gray-200 dark:border-gray-700 text-right">معلومات إضافية عن الوحدة</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 text-right">الجماعة</label>
                <input value={tc.commune || ''} onChange={e => setTc((p: any) => ({ ...p, commune: e.target.value }))}
                  className="input w-full text-right" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 text-right">رقم السجل التعاوني</label>
                <input value={tc.regNumber || ''} onChange={e => setTc((p: any) => ({ ...p, regNumber: e.target.value }))}
                  className="input w-full text-right" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 text-right">ر.ب.ت.و (للشباب)</label>
                <input value={tc.iceNumber || ''} onChange={e => setTc((p: any) => ({ ...p, iceNumber: e.target.value }))}
                  className="input w-full text-right" />
              </div>
              <div />
              {[
                { label: 'أعضاء المكتب — ذكور', key: 'boardMale' },
                { label: 'أعضاء المكتب — إناث', key: 'boardFemale' },
                { label: 'الشركاء — ذكور', key: 'partnerMale' },
                { label: 'الشركاء — إناث', key: 'partnerFemale' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 text-right">{label}</label>
                  <input type="number" min="0" value={tc[key] || ''} onChange={e => setTc((p: any) => ({ ...p, [key]: e.target.value }))}
                    className="input w-full text-right" />
                </div>
              ))}
            </div>
          </div>

          {/* Section: محتوى المشروع */}
          <div className="card p-5 space-y-5">
            <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 border-b pb-2 border-gray-200 dark:border-gray-700 text-right">محتوى المشروع</h4>
            {[
              { label: 'فكرة المشروع', key: 'projectIdea' },
              { label: 'إشكالية وجدوى المشروع', key: 'problemFeasibility' },
              { label: 'جانب الابتكار في المشروع', key: 'innovation' },
              { label: 'مكونات المشروع', key: 'components' },
              { label: 'أهداف المشروع والنتائج المنتظرة', key: 'objectives' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-primary-700 dark:text-primary-400 mb-2 text-right">{label}</label>
                <textarea value={tc[key] || ''} onChange={e => setTc((p: any) => ({ ...p, [key]: e.target.value }))}
                  rows={3} className="input w-full text-right resize-none" />
              </div>
            ))}
          </div>

          {/* Section: التركيبة المالية */}
          <div className="card p-5">
            <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-4 border-b pb-2 border-gray-200 dark:border-gray-700 text-right">التركيبة المالية</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 text-right">مساهمة حامل المشروع %</label>
                <input type="number" min="0" max="100" value={tc.holderPct ?? 10}
                  onChange={e => setTc((p: any) => ({ ...p, holderPct: e.target.value, indhPct: String(100 - Number(e.target.value)) }))}
                  className="input w-full text-right" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 text-right">مساهمة المبادرة الوطنية للتنمية البشرية %</label>
                <input type="number" min="0" max="100" value={tc.indhPct ?? 90}
                  onChange={e => setTc((p: any) => ({ ...p, indhPct: e.target.value, holderPct: String(100 - Number(e.target.value)) }))}
                  className="input w-full text-right" />
              </div>
            </div>
            {project?.budget && (
              <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-right text-sm">
                <div className="text-gray-600 dark:text-gray-400">
                  {lang === 'ar' ? 'التكلفة الإجمالية' : 'Coût total'}: <strong>{formatCurrency(project.budget, lang)}</strong>
                </div>
                <div className="mt-1 text-gray-600 dark:text-gray-400">
                  مساهمة حامل المشروع: <strong className="text-emerald-600">{formatCurrency(Math.round(project.budget * (tc.holderPct ?? 10) / 100), lang)}</strong>
                  {' · '}مساهمة INDH: <strong className="text-primary-600">{formatCurrency(Math.round(project.budget * (tc.indhPct ?? 90) / 100), lang)}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODALS ───────────────────────────────────────────────────────── */}

      {/* Milestone Modal */}
      <Modal isOpen={showMilestoneModal} onClose={() => setShowMilestoneModal(false)}
        title={editingMilestone ? (lang === 'ar' ? 'تعديل المرحلة' : 'Modifier le jalon') : (lang === 'ar' ? 'مرحلة جديدة' : 'Nouveau jalon')}
        footer={<><button onClick={() => setShowMilestoneModal(false)} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleSaveMilestone} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">{lang === 'ar' ? 'عنوان المرحلة' : 'Titre du jalon'} *</label>
            <input className="input" value={msForm.title} onChange={(e) => setMsForm({ ...msForm, title: e.target.value })} />
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'وصف' : 'Description'}</label>
            <textarea className="input" rows={2} value={msForm.description} onChange={(e) => setMsForm({ ...msForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{lang === 'ar' ? 'التاريخ المخطط' : 'Date prévue'}</label>
              <input className="input" type="date" value={msForm.plannedDate} onChange={(e) => setMsForm({ ...msForm, plannedDate: e.target.value })} />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'التاريخ الفعلي' : 'Date réelle'}</label>
              <input className="input" type="date" value={msForm.actualDate} onChange={(e) => setMsForm({ ...msForm, actualDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'الحالة' : 'Statut'}</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MS_STATUS_CONFIG).map(([status, cfg]) => (
                <label key={status} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-colors ${msForm.status === status ? `border-current ${cfg.color} bg-white dark:bg-gray-900` : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                  <input type="radio" name="msStatus" value={status} checked={msForm.status === status}
                    onChange={() => setMsForm({ ...msForm, status })} className="hidden" />
                  <span className={msForm.status === status ? cfg.color : ''}>{cfg.icon}</span>
                  {cfg.label[lang as 'fr' | 'ar'] || cfg.label.fr}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Funding Entry Modal */}
      <Modal isOpen={showFundingModal} onClose={() => { setShowFundingModal(false); setSaveError(null); }} title={t('funding.addEntry')}
        footer={<><button onClick={() => { setShowFundingModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleAddFunding} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
          {saveError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('funding.source')} *</label>
              <select className="input" value={fundingForm.source} onChange={(e) => setFundingForm({ ...fundingForm, source: e.target.value })}>
                {FUNDING_SOURCES.map((s) => <option key={s} value={s}>{t(`funding.sources.${s}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'المبلغ' : 'Montant'} *</label>
              <input className="input" type="number" step="0.01" value={fundingForm.amount} onChange={(e) => setFundingForm({ ...fundingForm, amount: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{t('funding.donor')}</label>
            <input className="input" value={fundingForm.donor} onChange={(e) => setFundingForm({ ...fundingForm, donor: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('funding.notes')}</label>
            <textarea className="input" rows={2} value={fundingForm.notes} onChange={(e) => setFundingForm({ ...fundingForm, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Budget Modal */}
      <Modal isOpen={showBudgetModal} onClose={() => { setShowBudgetModal(false); setSaveError(null); }} title={t('funding.updateBudget')}
        footer={<><button onClick={() => { setShowBudgetModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleUpdateBudget} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div>
          {saveError && <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
          <label className="label">{t('projects.totalBudget')} (MAD) *</label>
          <input className="input" type="number" step="0.01" value={budgetForm.totalBudget} onChange={(e) => setBudgetForm({ totalBudget: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title={lang === 'ar' ? 'تأكيد الحذف' : 'Confirmer la suppression'}
        message={t('common.confirmDelete')} loading={deleting}
      />
    </div>
  );
};
