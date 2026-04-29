import React, { useEffect, useState } from 'react';
import { Plus, Calendar, MapPin, Users, ChevronRight, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { meetingsApi, membersApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/utils';

const STATUS_TABS = ['', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const MeetingsPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', date: '', location: '', agenda: '' });
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const BOARD_ROLES = ['PRESIDENT', 'VICE_PRESIDENT', 'TREASURER', 'SECRETARY', 'ADVISOR'];

  const load = async () => {
    try {
      const [ms, st] = await Promise.all([
        meetingsApi.getAll(status ? { status } : {}),
        meetingsApi.getStats(),
      ]);
      setMeetings(ms.data);
      setStats(st.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); load(); }, [status]);

  const openCreateModal = async () => {
    setShowModal(true);
    setSelectedMemberIds([]);
    setLoadingMembers(true);
    try {
      const res = await membersApi.getAll({ isActive: true });
      setAllMembers(res.data);
    } finally { setLoadingMembers(false); }
  };

  const handleCreate = async () => {
    if (!form.title || !form.date) return;
    setSaving(true);
    setSaveError(null);
    try {
      const created = await meetingsApi.create(form);
      if (selectedMemberIds.length > 0) {
        await meetingsApi.addAttendees(created.data.id, selectedMemberIds);
      }
      setShowModal(false);
      setForm({ title: '', date: '', location: '', agenda: '' });
      setSelectedMemberIds([]);
      load();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const toggleMember = (id: string) =>
    setSelectedMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await meetingsApi.delete(deleteId);
      setDeleteId(null);
      load();
    } finally { setDeleting(false); }
  };

  const statusBadge = (s: string) => ({
    SCHEDULED: 'badge-blue', IN_PROGRESS: 'badge-yellow', COMPLETED: 'badge-green', CANCELLED: 'badge-red',
  }[s] || 'badge-gray');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-amber-600 via-orange-500 to-yellow-500 p-5 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow">
            <Calendar size={24} className="text-amber-200" />
            {t('meetings.title')}
          </h2>
          <button onClick={openCreateModal} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-amber-700 hover:bg-amber-50 text-sm font-semibold transition-colors shadow">
            <Plus size={15} />{t('meetings.createMeeting')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard title={t('meetings.stats.total')} value={stats.total ?? 0} icon={<Calendar size={20} />} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard title={t('meetings.stats.thisMonth')} value={stats.thisMonth ?? 0} icon={<Calendar size={20} />} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
        <StatCard title={t('meetings.stats.completed')} value={stats.completed ?? 0} icon={<Calendar size={20} />} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" />
        <StatCard title={t('meetings.stats.scheduled')} value={stats.scheduled ?? 0} icon={<Calendar size={20} />} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400" />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              status === s
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            {s ? t(`meetings.statuses.${s}`) : t('common.all')}
          </button>
        ))}
      </div>

      {/* Meetings list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : meetings.length === 0 ? (
        <EmptyState icon={<Calendar size={28} />} title={t('meetings.noMeetings')} action={<button onClick={openCreateModal} className="btn-primary"><Plus size={16} />{t('meetings.createMeeting')}</button>} />
      ) : (
        <div className="grid gap-4">
          {meetings.map((m) => (
            <div key={m.id} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar size={20} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{m.title}</h3>
                  <span className={statusBadge(m.status)}>{t(`meetings.statuses.${m.status}`)}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Calendar size={13} />{formatDate(m.date, lang)}</span>
                  {m.location && <span className="flex items-center gap-1"><MapPin size={13} />{m.location}</span>}
                  <span className="flex items-center gap-1"><Users size={13} />{m._count?.attendances ?? 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Link to={`/meetings/${m.id}`} className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                  <Eye size={16} />
                </Link>
                <button onClick={() => setDeleteId(m.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={16} />
                </button>
                <Link to={`/meetings/${m.id}`} className="p-2 rounded-lg text-gray-400 hover:text-gray-600">
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSaveError(null); }}
        title={t('meetings.createMeeting')}
        footer={
          <>
            <button onClick={() => { setShowModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button>
          </>
        }
      >
        <div className="space-y-4">
          {saveError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {saveError}
            </div>
          )}
          <div>
            <label className="label">{t('meetings.meetingTitle')} *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('meetings.date')} *</label>
              <input className="input" type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('meetings.location')}</label>
              <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{t('meetings.agenda')}</label>
            <textarea className="input" rows={3} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} />
          </div>

          {/* Attendance selection */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0 flex items-center gap-1.5">
                <Users size={14} className="text-primary-500" />
                {lang === 'ar' ? 'الحاضرون' : 'Participants'}
                {selectedMemberIds.length > 0 && (
                  <span className="text-xs text-primary-600 font-semibold">({selectedMemberIds.length})</span>
                )}
              </label>
              {allMembers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedMemberIds(selectedMemberIds.length === allMembers.length ? [] : allMembers.map((m) => m.id))}
                  className="text-xs text-primary-600 hover:underline"
                >
                  {selectedMemberIds.length === allMembers.length
                    ? (lang === 'ar' ? 'إلغاء الكل' : 'Tout désélectionner')
                    : (lang === 'ar' ? 'تحديد الكل' : 'Tout sélectionner')}
                </button>
              )}
            </div>

            {loadingMembers ? (
              <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : allMembers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">{lang === 'ar' ? 'لا يوجد أعضاء مسجلون' : 'Aucun membre enregistré'}</p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-4 pr-1">
                {/* Board members */}
                {allMembers.filter((m) => BOARD_ROLES.includes(m.role)).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1.5">
                      {lang === 'ar' ? 'المكتب الإداري' : 'Bureau administratif'}
                    </p>
                    <div className="space-y-1">
                      {allMembers.filter((m) => BOARD_ROLES.includes(m.role)).map((m) => (
                        <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => toggleMember(m.id)} className="accent-indigo-600" />
                          <span className="text-sm text-gray-900 dark:text-white flex-1">{m.name}</span>
                          <span className="text-xs text-gray-400">{t(`members.roles.${m.role}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adhérents */}
                {allMembers.filter((m) => !BOARD_ROLES.includes(m.role)).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1.5">
                      {lang === 'ar' ? 'المنخرطون' : 'Adhérents'}
                    </p>
                    <div className="space-y-1">
                      {allMembers.filter((m) => !BOARD_ROLES.includes(m.role)).map((m) => (
                        <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => toggleMember(m.id)} className="accent-emerald-600" />
                          <span className="text-sm text-gray-900 dark:text-white flex-1">{m.name}</span>
                          <span className="text-xs text-gray-400">{t(`members.roles.${m.role}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={t('meetings.deleteMeeting')} message={t('common.confirmDelete')} loading={deleting} />
    </div>
  );
};
