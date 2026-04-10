import React, { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Users, UserCheck } from 'lucide-react';
import { membersApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/utils';

export const MembersPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [members, setMembers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', role: 'MEMBER', joinDate: '' });
  const [formError, setFormError] = useState('');

  const load = async () => {
    try {
      const [ms, st] = await Promise.all([membersApi.getAll(), membersApi.getStats()]);
      // Only regular members
      setMembers(ms.data.filter((m: any) => m.role === 'MEMBER'));
      setStats(st.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.phone?.includes(q);
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
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} />{t('members.addMember')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title={lang === 'ar' ? 'إجمالي الأعضاء' : 'Total adhérents'}
          value={members.length}
          icon={<Users size={20} />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title={t('members.stats.active')}
          value={members.filter((m) => m.isActive).length}
          icon={<UserCheck size={20} />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* Search */}
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
                      <span className={m.isActive ? 'badge-green' : 'badge-red'}>
                        {m.isActive ? t('members.active') : t('members.inactive')}
                      </span>
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
