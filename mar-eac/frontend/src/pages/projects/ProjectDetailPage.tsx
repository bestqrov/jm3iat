import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, MapPin, Calendar } from 'lucide-react';
import { projectsApi, fundingApi, requestsApi, documentsApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../lib/utils';

const FUNDING_SOURCES = ['COMMUNE', 'DONOR', 'INTERNAL', 'GRANT', 'OTHER'];

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const [project, setProject] = useState<any>(null);
  const [funding, setFunding] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fundingForm, setFundingForm] = useState({ source: 'COMMUNE', amount: '', donor: '', notes: '' });
  const [budgetForm, setBudgetForm] = useState({ totalBudget: '' });

  const load = async () => {
    if (!id) return;
    try {
      const [p, f, r, d] = await Promise.allSettled([
        projectsApi.getById(id),
        fundingApi.get(id),
        requestsApi.getAll(),
        documentsApi.getAll({ projectId: id }),
      ]);
      if (p.status === 'fulfilled') setProject(p.value.data);
      if (f.status === 'fulfilled') setFunding(f.value.data);
      if (r.status === 'fulfilled') setRequests(r.value.data.filter((req: any) => req.projectId === id));
      if (d.status === 'fulfilled') setDocuments(d.value.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleAddFunding = async () => {
    if (!id || !fundingForm.amount) return;
    setSaving(true);
    setSaveError(null);
    try {
      await fundingApi.addEntry(id, fundingForm);
      setShowFundingModal(false);
      setFundingForm({ source: 'COMMUNE', amount: '', donor: '', notes: '' });
      load();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleUpdateBudget = async () => {
    if (!id || !budgetForm.totalBudget) return;
    setSaving(true);
    setSaveError(null);
    try {
      await fundingApi.updateBudget(id, parseFloat(budgetForm.totalBudget));
      setShowBudgetModal(false);
      load();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await fundingApi.deleteEntry(entryId);
      load();
    } catch {}
  };

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    await projectsApi.update(id, { status });
    load();
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!project) return <div className="text-center py-16 text-gray-500">{t('common.noData')}</div>;

  const funded = funding?.fundedAmount || 0;
  const total = funding?.totalBudget || 0;
  const pct = total > 0 ? Math.min(100, (funded / total) * 100) : 0;

  const statusBadge: Record<string, string> = { PLANNED: 'badge-blue', IN_PROGRESS: 'badge-yellow', COMPLETED: 'badge-green', CANCELLED: 'badge-red' };

  return (
    <div className="space-y-6">
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
            </div>
          </div>
          <div className="flex gap-2">
            {project.status === 'PLANNED' && <button onClick={() => handleStatusChange('IN_PROGRESS')} className="btn-primary text-sm">{lang === 'ar' ? 'بدء المشروع' : 'Démarrer'}</button>}
            {project.status === 'IN_PROGRESS' && <button onClick={() => handleStatusChange('COMPLETED')} className="btn-success text-sm">{lang === 'ar' ? 'إتمام المشروع' : 'Terminer'}</button>}
          </div>
        </div>
      </div>

      {/* Funding progress bar */}
      {total > 0 && (
        <div className="card p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">{t('projects.funding')}</span>
            <span className="font-semibold text-gray-900 dark:text-white">{pct.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
            <div className="bg-primary-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div><div className="font-bold text-gray-900 dark:text-white">{formatCurrency(total, lang)}</div><div className="text-xs text-gray-500">{t('projects.totalBudget')}</div></div>
            <div><div className="font-bold text-emerald-600">{formatCurrency(funded, lang)}</div><div className="text-xs text-gray-500">{t('projects.fundedAmount')}</div></div>
            <div><div className="font-bold text-red-500">{formatCurrency(total - funded, lang)}</div><div className="text-xs text-gray-500">{t('projects.remaining')}</div></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {['details', 'funding', 'requests', 'documents'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>
            {t(`projects.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="card p-5 space-y-3">
          {project.description && (
            <div>
              <label className="label">{t('projects.description')}</label>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">{t('projects.type')}:</span> <strong>{t(`projects.types.${project.type}`)}</strong></div>
            <div><span className="text-gray-500">{t('projects.status')}:</span> <strong>{t(`projects.statuses.${project.status}`)}</strong></div>
            {project.startDate && <div><span className="text-gray-500">{t('projects.startDate')}:</span> <strong>{formatDate(project.startDate, lang)}</strong></div>}
            {project.endDate && <div><span className="text-gray-500">{t('projects.endDate')}:</span> <strong>{formatDate(project.endDate, lang)}</strong></div>}
          </div>
        </div>
      )}

      {/* Funding Tab */}
      {activeTab === 'funding' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button onClick={() => { setBudgetForm({ totalBudget: total.toString() }); setShowBudgetModal(true); }} className="btn-secondary text-sm">{t('funding.updateBudget')}</button>
            <button onClick={() => setShowFundingModal(true)} className="btn-primary text-sm"><Plus size={14} />{t('funding.addEntry')}</button>
          </div>
          {funding?.entries?.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">{t('common.noData')}</div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr>
                    <th>{t('funding.source')}</th>
                    <th>{t('funding.donor')}</th>
                    <th>{t('common.date')}</th>
                    <th>{lang === 'ar' ? 'المبلغ' : 'Montant'}</th>
                    <th>{t('common.actions')}</th>
                  </tr></thead>
                  <tbody>
                    {funding?.entries?.map((entry: any) => (
                      <tr key={entry.id}>
                        <td><span className="badge badge-blue">{t(`funding.sources.${entry.source}`)}</span></td>
                        <td>{entry.donor || '-'}</td>
                        <td>{formatDate(entry.date, lang)}</td>
                        <td className="font-semibold text-emerald-600">{formatCurrency(entry.amount, lang)}</td>
                        <td>
                          <button onClick={() => handleDeleteEntry(entry.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requests Tab */}
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

      {/* Documents Tab */}
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

      {/* Add Funding Modal */}
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

      {/* Update Budget Modal */}
      <Modal isOpen={showBudgetModal} onClose={() => { setShowBudgetModal(false); setSaveError(null); }} title={t('funding.updateBudget')}
        footer={<><button onClick={() => { setShowBudgetModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleUpdateBudget} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div>
          {saveError && <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
          <label className="label">{t('projects.totalBudget')} (MAD) *</label>
          <input className="input" type="number" step="0.01" value={budgetForm.totalBudget} onChange={(e) => setBudgetForm({ totalBudget: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
};
