import React, { useEffect, useState } from 'react';
import { Shield, Building2, Users, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { superadminApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
import { formatDate } from '../../lib/utils';

export const SuperAdminPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<'orgs' | 'users'>('orgs');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [subForm, setSubForm] = useState({ plan: 'BASIC', status: 'ACTIVE', expiresAt: '' });

  const load = async () => {
    try {
      const [st, og, us] = await Promise.all([
        superadminApi.getStats(),
        superadminApi.getOrganizations(),
        superadminApi.getUsers(),
      ]);
      setStats(st.data);
      setOrgs(og.data.data || og.data);
      setUsers(us.data.data || us.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openSubModal = (org: any) => {
    setSelectedOrg(org);
    setSubForm({
      plan: org.subscription?.plan || 'BASIC',
      status: org.subscription?.status || 'ACTIVE',
      expiresAt: org.subscription?.expiresAt?.split('T')[0] || '',
    });
    setShowSubModal(true);
  };

  const handleSubUpdate = async () => {
    if (!selectedOrg) return;
    setSaving(true);
    setSaveError(null);
    try {
      await superadminApi.updateSubscription(selectedOrg.id, subForm);
      setShowSubModal(false);
      load();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleDeleteOrg = async () => {
    if (!deleteOrgId) return;
    setDeleting(true);
    try {
      await superadminApi.deleteOrganization(deleteOrgId);
      setDeleteOrgId(null);
      load();
    } finally { setDeleting(false); }
  };

  const handleToggleUser = async (userId: string) => {
    try {
      await superadminApi.toggleUser(userId);
      load();
    } catch {}
  };

  const planBadge: Record<string, string> = { BASIC: 'badge-gray', STANDARD: 'badge-blue', PREMIUM: 'badge-purple' };
  const subStatusBadge: Record<string, string> = { TRIAL: 'badge-yellow', ACTIVE: 'badge-green', EXPIRED: 'badge-red', CANCELLED: 'badge-red' };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h2 className="page-title flex items-center gap-2"><Shield size={22} />{t('superadmin.title')}</h2>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard title={t('superadmin.stats.totalOrgs')} value={stats.totalOrgs ?? 0} icon={<Building2 size={20} />} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard title={t('superadmin.stats.totalUsers')} value={stats.totalUsers ?? 0} icon={<Users size={20} />} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
        <StatCard title={t('superadmin.stats.trialOrgs')} value={stats.trialOrgs ?? 0} icon={<Shield size={20} />} iconBg="bg-yellow-100 dark:bg-yellow-900/30" iconColor="text-yellow-600 dark:text-yellow-400" />
        <StatCard title={t('superadmin.stats.activeOrgs')} value={stats.activeOrgs ?? 0} icon={<Shield size={20} />} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Plan distribution */}
      {stats.planDistribution && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{lang === 'ar' ? 'توزيع الخطط' : 'Distribution des plans'}</h3>
          <div className="flex gap-4">
            {Object.entries(stats.planDistribution).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-2">
                <span className={planBadge[plan]}>{plan}</span>
                <span className="font-bold text-gray-900 dark:text-white">{String(count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[['orgs', t('superadmin.organizations')], ['users', t('superadmin.users')]].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : activeTab === 'orgs' ? (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr>
                <th>{lang === 'ar' ? 'الجمعية' : 'Association'}</th>
                <th>{lang === 'ar' ? 'المدينة' : 'Ville'}</th>
                <th>{lang === 'ar' ? 'الخطة' : 'Plan'}</th>
                <th>{lang === 'ar' ? 'الاشتراك' : 'Abonnement'}</th>
                <th>{lang === 'ar' ? 'الأعضاء' : 'Membres'}</th>
                <th>{t('common.date')}</th>
                <th>{t('common.actions')}</th>
              </tr></thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <div className="font-medium text-gray-900 dark:text-white">{org.name}</div>
                      <div className="text-xs text-gray-500">{org.email}</div>
                    </td>
                    <td>{org.city || '-'}</td>
                    <td><span className={planBadge[org.subscription?.plan] || 'badge-gray'}>{org.subscription?.plan || 'N/A'}</span></td>
                    <td><span className={subStatusBadge[org.subscription?.status] || 'badge-gray'}>{t(`subscription.${org.subscription?.status?.toLowerCase() || 'trial'}`)}</span></td>
                    <td>{org._count?.members ?? 0}</td>
                    <td>{formatDate(org.createdAt, lang)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openSubModal(org)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteOrgId(org.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr>
                <th>{lang === 'ar' ? 'المستخدم' : 'Utilisateur'}</th>
                <th>{lang === 'ar' ? 'الجمعية' : 'Association'}</th>
                <th>{lang === 'ar' ? 'الدور' : 'Rôle'}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.date')}</th>
                <th>{t('common.actions')}</th>
              </tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td>{user.organization?.name || '-'}</td>
                    <td><span className="badge badge-blue">{user.role}</span></td>
                    <td><span className={user.isActive ? 'badge-green' : 'badge-red'}>{user.isActive ? t('members.active') : t('members.inactive')}</span></td>
                    <td>{formatDate(user.createdAt, lang)}</td>
                    <td>
                      <button onClick={() => handleToggleUser(user.id)} className={`p-1.5 rounded-lg transition-colors ${user.isActive ? 'text-emerald-500 hover:text-red-600' : 'text-red-500 hover:text-emerald-600'}`}>
                        {user.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      <Modal isOpen={showSubModal} onClose={() => { setShowSubModal(false); setSaveError(null); }} title={t('superadmin.manageSub')}
        footer={<><button onClick={() => { setShowSubModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleSubUpdate} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
          {saveError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
          {selectedOrg && <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedOrg.name}</div>}
          <div>
            <label className="label">{lang === 'ar' ? 'الخطة' : 'Plan'}</label>
            <select className="input" value={subForm.plan} onChange={(e) => setSubForm({ ...subForm, plan: e.target.value })}>
              {['BASIC', 'STANDARD', 'PREMIUM'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'الحالة' : 'Statut'}</label>
            <select className="input" value={subForm.status} onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}>
              {['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'].map((s) => <option key={s} value={s}>{t(`subscription.${s.toLowerCase()}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'تاريخ الانتهاء' : 'Date d\'expiration'}</label>
            <input className="input" type="date" value={subForm.expiresAt} onChange={(e) => setSubForm({ ...subForm, expiresAt: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteOrgId} onClose={() => setDeleteOrgId(null)} onConfirm={handleDeleteOrg}
        title={t('superadmin.deleteOrg')} message={t('common.confirmDelete')} loading={deleting} />
    </div>
  );
};
