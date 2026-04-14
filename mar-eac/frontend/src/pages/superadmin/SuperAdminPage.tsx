import React, { useEffect, useState } from 'react';
import {
  Shield, Building2, Users, Pencil, Trash2, ToggleLeft, ToggleRight,
  KeyRound, Copy, Check, Droplets, ShoppingBag, FolderKanban, Layers,
} from 'lucide-react';
import { superadminApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
import { formatDate } from '../../lib/utils';

// ─── Association type config ──────────────────────────────────────────────────

type AssocTypeKey = 'REGULAR' | 'PROJECTS' | 'WATER' | 'PRODUCTIVE' | 'PRODUCTIVE_WATER';

const ASSOC_TYPES: { key: AssocTypeKey; labelFr: string; labelAr: string; icon: React.ReactNode; badge: string; dot: string }[] = [
  { key: 'REGULAR',          labelFr: 'Association classique',    labelAr: 'جمعية عادية',             icon: <Building2 size={13} />,   badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',           dot: '#6b7280' },
  { key: 'PROJECTS',         labelFr: 'Avec projets',             labelAr: 'مع مشاريع',               icon: <FolderKanban size={13} />, badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',          dot: '#2563eb' },
  { key: 'WATER',            labelFr: 'Gestion de l\'eau',        labelAr: 'جمعية الماء',             icon: <Droplets size={13} />,    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',           dot: '#0891b2' },
  { key: 'PRODUCTIVE',       labelFr: 'Association productive',   labelAr: 'جمعية إنتاجية',           icon: <ShoppingBag size={13} />, badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: '#059669' },
  { key: 'PRODUCTIVE_WATER', labelFr: 'Productive + Eau',         labelAr: 'إنتاجية + ماء',           icon: <Layers size={13} />,      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',   dot: '#7c3aed' },
];

const getAssocType = (modules: string[] = []): AssocTypeKey => {
  const hasProd  = modules.includes('PRODUCTIVE');
  const hasWater = modules.includes('WATER');
  const hasProj  = modules.includes('PROJECTS');
  if (hasProd && hasWater) return 'PRODUCTIVE_WATER';
  if (hasProd)  return 'PRODUCTIVE';
  if (hasWater) return 'WATER';
  if (hasProj)  return 'PROJECTS';
  return 'REGULAR';
};

const AssocTypeBadge: React.FC<{ modules: string[]; lang: string }> = ({ modules, lang }) => {
  const key = getAssocType(modules);
  const cfg = ASSOC_TYPES.find(t => t.key === key)!;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
      {cfg.icon}
      {lang === 'ar' ? cfg.labelAr : cfg.labelFr}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const SuperAdminPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';

  const [activeTab, setActiveTab] = useState<'orgs' | 'users'>('orgs');
  const [orgs, setOrgs]   = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading]   = useState(true);
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedOrg, setSelectedOrg]  = useState<any>(null);
  const [deleteOrgId, setDeleteOrgId]  = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [subForm, setSubForm] = useState<{ assocType: AssocTypeKey; status: string; expiresAt: string }>({
    assocType: 'REGULAR', status: 'ACTIVE', expiresAt: '',
  });
  const [resetResult, setResetResult] = useState<{ tempPassword: string; name: string; email: string } | null>(null);
  const [resetCopied, setResetCopied] = useState(false);

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
      assocType: getAssocType(org.modules || []),
      status:    org.subscription?.status    || 'ACTIVE',
      expiresAt: org.subscription?.expiresAt?.split('T')[0] || '',
    });
    setSaveError(null);
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
      setSaveError(err?.response?.data?.message || (isAr ? 'خطأ في الحفظ' : 'Erreur lors de la sauvegarde'));
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
    try { await superadminApi.toggleUser(userId); load(); } catch {}
  };

  const handleResetPassword = async (userId: string) => {
    try { const res = await superadminApi.resetUserPassword(userId); setResetResult(res.data); } catch {}
  };

  const copyResetPassword = () => {
    if (resetResult) {
      navigator.clipboard.writeText(resetResult.tempPassword);
      setResetCopied(true);
      setTimeout(() => setResetCopied(false), 2000);
    }
  };

  const subStatusBadge: Record<string, string> = {
    TRIAL: 'badge-yellow', ACTIVE: 'badge-green', EXPIRED: 'badge-red', CANCELLED: 'badge-red',
  };

  const typeDistribution: Record<string, number> = stats.typeDistribution || {};
  const totalOrgs = stats.totalOrgs || 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h2 className="page-title flex items-center gap-2"><Shield size={22} />{t('superadmin.title')}</h2>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard title={t('superadmin.stats.totalOrgs')}  value={stats.totalOrgs  ?? 0} icon={<Building2 size={20} />} iconBg="bg-blue-100 dark:bg-blue-900/30"    iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard title={t('superadmin.stats.totalUsers')} value={stats.totalUsers ?? 0} icon={<Users size={20} />}     iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
        <StatCard title={t('superadmin.stats.trialOrgs')}  value={stats.trialOrgs  ?? 0} icon={<Shield size={20} />}    iconBg="bg-yellow-100 dark:bg-yellow-900/30" iconColor="text-yellow-600 dark:text-yellow-400" />
        <StatCard title={t('superadmin.stats.activeOrgs')} value={stats.activeOrgs ?? 0} icon={<Shield size={20} />}    iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Association type distribution */}
      {Object.keys(typeDistribution).length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">
            {isAr ? 'توزيع أنواع الجمعيات' : 'Répartition par type d\'association'}
          </h3>
          <div className="space-y-3">
            {ASSOC_TYPES.map(({ key, labelFr, labelAr, icon, dot }) => {
              const count = typeDistribution[key] || 0;
              const pct   = totalOrgs > 0 ? Math.round((count / totalOrgs) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <span style={{ color: dot }}>{icon}</span>
                      {isAr ? labelAr : labelFr}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{count} <span className="text-xs text-gray-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: dot }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {([['orgs', t('superadmin.organizations')], ['users', t('superadmin.users')]] as [string, string][]).map(([tab, label]) => (
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
                <th>{isAr ? 'الجمعية' : 'Association'}</th>
                <th>{isAr ? 'المدينة' : 'Ville'}</th>
                <th>{isAr ? 'النوع' : 'Type'}</th>
                <th>{isAr ? 'الاشتراك' : 'Abonnement'}</th>
                <th>{isAr ? 'الأعضاء' : 'Membres'}</th>
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
                    <td><AssocTypeBadge modules={org.modules || []} lang={lang} /></td>
                    <td><span className={subStatusBadge[org.subscription?.status] || 'badge-gray'}>{t(`subscription.${org.subscription?.status?.toLowerCase() || 'trial'}`)}</span></td>
                    <td>{org._count?.members ?? 0}</td>
                    <td>{formatDate(org.createdAt, lang)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openSubModal(org)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20" title={isAr ? 'تعديل' : 'Modifier'}><Pencil size={14} /></button>
                        <button onClick={() => setDeleteOrgId(org.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title={isAr ? 'حذف' : 'Supprimer'}><Trash2 size={14} /></button>
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
                <th>{isAr ? 'المستخدم' : 'Utilisateur'}</th>
                <th>{isAr ? 'الجمعية' : 'Association'}</th>
                <th>{isAr ? 'الدور' : 'Rôle'}</th>
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
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggleUser(user.id)}
                          className={`p-1.5 rounded-lg transition-colors ${user.isActive ? 'text-emerald-500 hover:text-red-600' : 'text-red-500 hover:text-emerald-600'}`}
                          title={user.isActive ? (isAr ? 'تعطيل' : 'Désactiver') : (isAr ? 'تفعيل' : 'Activer')}>
                          {user.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button onClick={() => handleResetPassword(user.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                          title={isAr ? 'إعادة تعيين كلمة المرور' : 'Réinitialiser le mot de passe'}>
                          <KeyRound size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Subscription / Pack Modal */}
      <Modal
        isOpen={showSubModal}
        onClose={() => { setShowSubModal(false); setSaveError(null); }}
        title={isAr ? 'تعديل النوع والاشتراك' : 'Modifier le type et l\'abonnement'}
        footer={
          <>
            <button onClick={() => { setShowSubModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={handleSubUpdate} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button>
          </>
        }
      >
        <div className="space-y-5">
          {saveError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{saveError}</div>
          )}
          {selectedOrg && (
            <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">{selectedOrg.name}</div>
          )}

          {/* Association type */}
          <div>
            <label className="label mb-2 block">{isAr ? 'نوع الجمعية' : 'Type d\'association'}</label>
            <div className="space-y-2">
              {ASSOC_TYPES.map(({ key, labelFr, labelAr, icon, badge, dot }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSubForm(f => ({ ...f, assocType: key }))}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-start transition-all ${
                    subForm.assocType === key
                      ? 'border-current ring-1 ring-current ' + badge
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-white dark:bg-gray-800'
                  }`}
                  style={subForm.assocType === key ? { borderColor: dot } : {}}
                >
                  <span style={{ color: dot }}>{icon}</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{isAr ? labelAr : labelFr}</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors`}
                    style={{ borderColor: subForm.assocType === key ? dot : '#d1d5db', backgroundColor: subForm.assocType === key ? dot : 'transparent' }}>
                    {subForm.assocType === key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="label">{isAr ? 'حالة الاشتراك' : 'Statut'}</label>
            <select className="input" value={subForm.status} onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}>
              {['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>{t(`subscription.${s.toLowerCase()}`)}</option>
              ))}
            </select>
          </div>

          {/* Expiry */}
          <div>
            <label className="label">{isAr ? 'تاريخ الانتهاء' : 'Date d\'expiration'}</label>
            <input className="input" type="date" value={subForm.expiresAt} onChange={(e) => setSubForm({ ...subForm, expiresAt: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteOrgId} onClose={() => setDeleteOrgId(null)} onConfirm={handleDeleteOrg}
        title={t('superadmin.deleteOrg')} message={t('common.confirmDelete')} loading={deleting} />

      {/* Reset password result modal */}
      <Modal
        isOpen={!!resetResult}
        onClose={() => { setResetResult(null); setResetCopied(false); }}
        title={isAr ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}
        footer={<button onClick={() => { setResetResult(null); setResetCopied(false); }} className="btn-primary">{isAr ? 'تم' : 'Fermer'}</button>}
      >
        {resetResult && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isAr
                ? `تم إعادة تعيين كلمة مرور ${resetResult.name} (${resetResult.email})`
                : `Mot de passe de ${resetResult.name} (${resetResult.email}) réinitialisé`}
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-2">
                {isAr ? 'كلمة المرور المؤقتة' : 'Mot de passe temporaire'}
              </p>
              <div className="flex items-center gap-3">
                <span className="flex-1 font-mono text-xl font-bold tracking-widest text-gray-900 dark:text-white">
                  {resetResult.tempPassword}
                </span>
                <button onClick={copyResetPassword}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50">
                  {resetCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {resetCopied ? (isAr ? 'تم' : 'Copié') : (isAr ? 'نسخ' : 'Copier')}
                </button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                {isAr ? '⚠️ شارك هذه الكلمة مع المستخدم وأخبره بتغييرها' : '⚠️ Communiquez ce mot de passe à l\'utilisateur et demandez-lui de le changer'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
