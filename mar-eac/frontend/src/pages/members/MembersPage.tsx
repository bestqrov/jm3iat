import React, { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Users, UserCheck, FileSpreadsheet, Clock, CheckCircle2, Receipt, Loader2, ExternalLink } from 'lucide-react';
import { membersApi, exportApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/utils';

export const MembersPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [members, setMembers]   = useState<any[]>([]);
  const [pending, setPending]   = useState<any[]>([]);
  const [stats, setStats]       = useState<any>({});
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', role: 'MEMBER', joinDate: '' });
  const [formError, setFormError] = useState('');

  const load = async () => {
    try {
      const [ms, st] = await Promise.all([membersApi.getAll(), membersApi.getStats()]);
      const all = ms.data.filter((m: any) => m.role === 'MEMBER');
      setMembers(all.filter((m: any) => m.isActive));
      setPending(all.filter((m: any) => !m.isActive));
      setStats(st.data);
    } finally { setLoading(false); }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await membersApi.approve(id);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error');
    } finally { setApprovingId(null); }
  };

  useEffect(() => { load(); }, []);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.phone?.includes(q) || m.email?.toLowerCase().includes(q);
  });

  const openAdd = () => {
    setEditMember(null);
    setForm({ name: '', phone: '', email: '', role: 'MEMBER', joinDate: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (m: any) => {
    setEditMember(m);
    setForm({ name: m.name, phone: m.phone || '', email: m.email || '', role: m.role, joinDate: m.joinDate?.split('T')[0] || '' });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError(t('common.required')); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editMember) {
        await membersApi.update(editMember.id, form);
      } else {
        await membersApi.create({ ...form, role: 'MEMBER' });
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setFormError(err.response?.data?.message || t('common.error'));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await membersApi.delete(deleteId);
      setDeleteId(null);
      load();
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('members.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {lang === 'ar' ? 'قائمة منخرطي الجمعية' : 'Liste des adhérents de l\'association'}
          </p>
        </div>
        <button onClick={() => exportApi.members()} className="btn-secondary" title={lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}>
          <FileSpreadsheet size={16} />Excel
        </button>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} />{t('members.addMember')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title={lang === 'ar' ? 'المنخرطون النشطون' : 'Adhérents actifs'}
          value={members.length}
          icon={<UserCheck size={20} />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title={lang === 'ar' ? 'طلبات في الانتظار' : 'Demandes en attente'}
          value={pending.length}
          icon={<Clock size={20} />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Pending join requests */}
      {pending.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock size={14} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              {lang === 'ar' ? `طلبات الانضمام المعلقة (${pending.length})` : `Demandes en attente (${pending.length})`}
            </h3>
          </div>
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-amber-200 dark:bg-amber-800/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-800 dark:text-amber-200 font-bold text-sm">{m.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{m.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">{m.phone}{m.email ? ` · ${m.email}` : ''}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {m.notifyChannel && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        m.notifyChannel === 'whatsapp'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {m.notifyChannel === 'whatsapp' ? '📱 واتساب' : '📧 بريد'}
                      </span>
                    )}
                    {m.paymentReceiptUrl && (
                      <a
                        href={m.paymentReceiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-0.5 hover:bg-indigo-200 transition-colors"
                      >
                        <Receipt size={9} />
                        {lang === 'ar' ? 'وصل الدفع' : 'Reçu'}
                        <ExternalLink size={8} />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(m.id)}
                    disabled={approvingId === m.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    {approvingId === m.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <CheckCircle2 size={13} />}
                    {lang === 'ar' ? 'قبول' : 'Approuver'}
                  </button>
                  <button
                    onClick={() => setDeleteId(m.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active members search + table */}
      <div className="card p-4">
        <div className="relative mb-4">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input ps-9"
            placeholder={t('members.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title={t('members.noMembers')}
            action={<button onClick={openAdd} className="btn-primary"><Plus size={16} />{t('members.addMember')}</button>}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr>
                <th>{t('members.memberName')}</th>
                <th>{t('members.phone')}</th>
                <th>{t('members.email')}</th>
                <th>{t('members.joinDate')}</th>
                <th>{t('members.status')}</th>
                <th>{t('common.actions')}</th>
              </tr></thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-700 dark:text-primary-400 font-semibold text-xs">{m.name.charAt(0)}</span>
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white">{m.name}</div>
                      </div>
                    </td>
                    <td>{m.phone || '-'}</td>
                    <td>{m.email || '-'}</td>
                    <td>{formatDate(m.joinDate, lang)}</td>
                    <td>
                      <span className="badge-green">{t('members.active')}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(m.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editMember ? t('members.editMember') : t('members.addMember')}
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {formError}
            </div>
          )}
          <div>
            <label className="label">{t('members.memberName')} *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('members.phone')}</label>
              <input className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('members.email')}</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{t('members.joinDate')}</label>
            <input className="input" type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('members.deleteMember')}
        message={t('members.deleteConfirm')}
        loading={deleting}
      />
    </div>
  );
};
