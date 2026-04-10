import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { membersApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/utils';

const BOARD_ROLES = ['PRESIDENT', 'VICE_PRESIDENT', 'TREASURER', 'SECRETARY', 'ADVISOR'];
const boardRoleOrder = ['PRESIDENT', 'VICE_PRESIDENT', 'TREASURER', 'SECRETARY', 'ADVISOR'];

const roleBadgeColor: Record<string, string> = {
  PRESIDENT: 'badge-red',
  VICE_PRESIDENT: 'badge-purple',
  TREASURER: 'badge-yellow',
  SECRETARY: 'badge-blue',
  ADVISOR: 'badge-green',
};

const roleIcon: Record<string, string> = {
  PRESIDENT: '👑',
  VICE_PRESIDENT: '🎖️',
  TREASURER: '💰',
  SECRETARY: '📋',
  ADVISOR: '💡',
};

export const AdministratifsPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', role: 'PRESIDENT', joinDate: '' });
  const [formError, setFormError] = useState('');

  const load = async () => {
    try {
      const res = await membersApi.getAll();
      const board = res.data
        .filter((m: any) => BOARD_ROLES.includes(m.role))
        .sort((a: any, b: any) => boardRoleOrder.indexOf(a.role) - boardRoleOrder.indexOf(b.role));
      setMembers(board);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditMember(null);
    setForm({ name: '', phone: '', email: '', role: 'PRESIDENT', joinDate: '' });
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
        await membersApi.create(form);
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

  const title = lang === 'ar' ? 'المكتب الإداري' : 'Bureau administratif';
  const addLabel = lang === 'ar' ? 'إضافة عضو إداري' : 'Ajouter au bureau';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {lang === 'ar'
              ? 'أعضاء الهيئة الإدارية للجمعية'
              : 'Membres dirigeants de l\'association'}
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} />{addLabel}
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Shield size={28} />}
          title={lang === 'ar' ? 'لا يوجد أعضاء إداريون' : 'Aucun membre du bureau'}
          action={<button onClick={openAdd} className="btn-primary"><Plus size={16} />{addLabel}</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id} className="card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
              {/* Top: avatar + name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 text-xl">
                  {roleIcon[m.role] || '👤'}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white truncate text-base">{m.name}</div>
                  {m.email && <div className="text-xs text-gray-400 truncate">{m.email}</div>}
                </div>
              </div>

              {/* Role + status */}
              <div className="flex items-center justify-between">
                <span className={`badge ${roleBadgeColor[m.role] || 'badge-gray'} text-xs`}>
                  {t(`members.roles.${m.role}`)}
                </span>
                <span className={m.isActive ? 'badge-green text-xs' : 'badge-red text-xs'}>
                  {m.isActive ? t('members.active') : t('members.inactive')}
                </span>
              </div>

              {/* Info rows */}
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                {m.phone && <div>{lang === 'ar' ? 'هاتف: ' : 'Tél : '}<span className="text-gray-700 dark:text-gray-300">{m.phone}</span></div>}
                <div>{lang === 'ar' ? 'تاريخ الانضمام: ' : 'Depuis le : '}<span className="text-gray-700 dark:text-gray-300">{formatDate(m.joinDate, lang)}</span></div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => openEdit(m)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors font-medium"
                >
                  <Pencil size={13} />{t('common.edit')}
                </button>
                <button
                  onClick={() => setDeleteId(m.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                >
                  <Trash2 size={13} />{t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editMember ? (lang === 'ar' ? 'تعديل العضو الإداري' : 'Modifier le membre') : addLabel}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('members.role')}</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {BOARD_ROLES.map((r) => (
                  <option key={r} value={r}>{t(`members.roles.${r}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('members.joinDate')}</label>
              <input className="input" type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
            </div>
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
