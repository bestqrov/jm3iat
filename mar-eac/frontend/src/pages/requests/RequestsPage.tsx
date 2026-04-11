import React, { useEffect, useState } from 'react';
import { Plus, FileText, Pencil, Trash2 } from 'lucide-react';
import { requestsApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatCurrency } from '../../lib/utils';

const REQ_TYPES = ['COMMUNE', 'DONOR', 'MINISTRY', 'OTHER'];
const REQ_STATUSES = ['', 'PENDING', 'APPROVED', 'REJECTED'];
const statusBadge: Record<string, string> = { PENDING: 'badge-yellow', APPROVED: 'badge-green', REJECTED: 'badge-red' };

export const RequestsPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editReq, setEditReq] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'COMMUNE', description: '', recipient: '', amount: '' });
  const [statusForm, setStatusForm] = useState({ status: 'PENDING', notes: '' });

  const load = async () => {
    try {
      const [rs, st] = await Promise.all([
        requestsApi.getAll(statusFilter ? { status: statusFilter } : {}),
        requestsApi.getStats(),
      ]);
      setRequests(rs.data);
      setStats(st.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); load(); }, [statusFilter]);

  const handleCreate = async () => {
    if (!form.title) return;
    setSaving(true);
    setSaveError(null);
    try {
      await requestsApi.create(form);
      setShowModal(false);
      setForm({ title: '', type: 'COMMUNE', description: '', recipient: '', amount: '' });
      load();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const openStatusUpdate = (req: any) => {
    setEditReq(req);
    setStatusForm({ status: req.status, notes: req.notes || '' });
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!editReq) return;
    setSaving(true);
    setSaveError(null);
    try {
      await requestsApi.update(editReq.id, statusForm);
      setShowStatusModal(false);
      load();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await requestsApi.delete(deleteId);
      setDeleteId(null);
      load();
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h2 className="page-title">{t('requests.title')}</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} />{t('requests.createRequest')}</button>
      </div>

      <div className="stats-grid">
        <StatCard title={t('requests.stats.total')} value={stats.total ?? 0} icon={<FileText size={20} />} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard title={t('requests.stats.pending')} value={stats.pending ?? 0} icon={<FileText size={20} />} iconBg="bg-yellow-100 dark:bg-yellow-900/30" iconColor="text-yellow-600 dark:text-yellow-400" />
        <StatCard title={t('requests.stats.approved')} value={stats.approved ?? 0} icon={<FileText size={20} />} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" />
        <StatCard title={t('requests.stats.rejected')} value={stats.rejected ?? 0} icon={<FileText size={20} />} iconBg="bg-red-100 dark:bg-red-900/30" iconColor="text-red-600 dark:text-red-400" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {REQ_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
            {s ? t(`requests.statuses.${s}`) : t('common.all')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : requests.length === 0 ? (
        <EmptyState icon={<FileText size={28} />} title={t('requests.noRequests')} action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} />{t('requests.createRequest')}</button>} />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr>
                <th>{t('requests.requestTitle')}</th>
                <th>{t('requests.type')}</th>
                <th>{t('requests.recipient')}</th>
                <th>{t('requests.amount')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.date')}</th>
                <th>{t('common.actions')}</th>
              </tr></thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div className="font-medium text-gray-900 dark:text-white">{req.title}</div>
                      {req.description && <div className="text-xs text-gray-500 truncate max-w-[200px]">{req.description}</div>}
                    </td>
                    <td><span className="badge badge-blue">{t(`requests.types.${req.type}`)}</span></td>
                    <td>{req.recipient || '-'}</td>
                    <td>{req.amount ? formatCurrency(req.amount, lang) : '-'}</td>
                    <td><span className={statusBadge[req.status]}>{t(`requests.statuses.${req.status}`)}</span></td>
                    <td>{formatDate(req.createdAt, lang)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openStatusUpdate(req)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteId(req.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSaveError(null); }} title={t('requests.createRequest')}
        footer={<><button onClick={() => { setShowModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
          {saveError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
          <div>
            <label className="label">{t('requests.requestTitle')} *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('requests.type')}</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {REQ_TYPES.map((rt) => <option key={rt} value={rt}>{t(`requests.types.${rt}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('requests.recipient')}</label>
              <input className="input" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{t('requests.amount')}</label>
            <input className="input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('requests.description')}</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Status Update Modal */}
      <Modal isOpen={showStatusModal} onClose={() => { setShowStatusModal(false); setSaveError(null); }} title={t('requests.updateStatus')}
        footer={<><button onClick={() => { setShowStatusModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleStatusUpdate} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
          {saveError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
          <div>
            <label className="label">{t('common.status')}</label>
            <select className="input" value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
              {['PENDING', 'APPROVED', 'REJECTED'].map((s) => <option key={s} value={s}>{t(`requests.statuses.${s}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('requests.notes')}</label>
            <textarea className="input" rows={3} value={statusForm.notes} onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={lang === 'ar' ? 'حذف الطلب' : 'Supprimer la demande'} message={t('common.confirmDelete')} loading={deleting} />
    </div>
  );
};
