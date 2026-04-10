import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, Plus, Check } from 'lucide-react';
import { remindersApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/utils';

const typeIcons: Record<string, string> = {
  FUNDING_REQUEST: '💰', PROJECT_UPDATE: '🏗️', FINANCE_RECORD: '📊',
  WATER_READING: '💧', MEETING: '📅', CUSTOM: '🔔',
};

export const RemindersPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [reminders, setReminders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'CUSTOM' });

  const load = async () => {
    try {
      const res = await remindersApi.getAll(filter === 'unread' ? { unread: true } : {});
      setReminders(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); load(); }, [filter]);

  const handleMarkRead = async (id: string) => {
    await remindersApi.markRead(id);
    load();
  };

  const handleMarkAllRead = async () => {
    await remindersApi.markAllRead();
    load();
  };

  const handleDelete = async (id: string) => {
    await remindersApi.delete(id);
    load();
  };

  const handleCreate = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      await remindersApi.create({ ...form, scheduledFor: new Date().toISOString() });
      setShowModal(false);
      setForm({ title: '', message: '', type: 'CUSTOM' });
      load();
    } finally { setSaving(false); }
  };

  const unreadCount = reminders.filter((r) => !r.isRead).length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title flex items-center gap-2">
            {t('reminders.title')}
            {unreadCount > 0 && <span className="badge badge-red">{unreadCount}</span>}
          </h2>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn-secondary"><CheckCheck size={16} />{t('reminders.markAllRead')}</button>
          )}
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} />{t('reminders.createReminder')}</button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[['all', t('reminders.all')], ['unread', t('reminders.unread')]].map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === v ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : reminders.length === 0 ? (
        <EmptyState icon={<Bell size={28} />} title={t('reminders.noReminders')} />
      ) : (
        <div className="space-y-3">
          {reminders.map((r) => (
            <div key={r.id} className={`card p-4 flex items-start gap-4 transition-all ${!r.isRead ? 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
              <div className="text-2xl flex-shrink-0 mt-0.5">{typeIcons[r.type] || '🔔'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{r.title}</span>
                  <span className="badge badge-blue text-xs">{t(`reminders.types.${r.type}`)}</span>
                  {!r.isRead && <span className="badge badge-red text-xs">{lang === 'ar' ? 'جديد' : 'Nouveau'}</span>}
                </div>
                {r.message && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.message}</p>}
                <p className="text-xs text-gray-400 mt-1">{formatDate(r.createdAt, lang)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!r.isRead && (
                  <button onClick={() => handleMarkRead(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors" title={t('reminders.markRead')}>
                    <Check size={15} />
                  </button>
                )}
                <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('reminders.createReminder')}
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">{lang === 'ar' ? 'العنوان' : 'Titre'} *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'الرسالة' : 'Message'}</label>
            <textarea className="input" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
};
