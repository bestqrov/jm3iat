import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Crown, Wallet, PenLine, Plus, Pencil, Trash2, X,
  CheckCircle2, XCircle, Eye, EyeOff, Loader2, ShieldCheck,
} from 'lucide-react';
import { staffApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

type StaffRole = 'PRESIDENT' | 'TREASURER' | 'SECRETARY';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
}

interface RoleConfig {
  icon: React.ReactNode;
  colorBg: string;
  colorText: string;
  colorBorder: string;
}

const ROLE_CONFIG: Record<StaffRole, RoleConfig> = {
  PRESIDENT: {
    icon: <Crown size={18} />,
    colorBg:     'bg-indigo-50 dark:bg-indigo-900/20',
    colorText:   'text-indigo-700 dark:text-indigo-400',
    colorBorder: 'border-indigo-200 dark:border-indigo-700',
  },
  TREASURER: {
    icon: <Wallet size={18} />,
    colorBg:     'bg-emerald-50 dark:bg-emerald-900/20',
    colorText:   'text-emerald-700 dark:text-emerald-400',
    colorBorder: 'border-emerald-200 dark:border-emerald-700',
  },
  SECRETARY: {
    icon: <PenLine size={18} />,
    colorBg:     'bg-amber-50 dark:bg-amber-900/20',
    colorText:   'text-amber-700 dark:text-amber-400',
    colorBorder: 'border-amber-200 dark:border-amber-700',
  },
};

const ROLES: StaffRole[] = ['PRESIDENT', 'TREASURER', 'SECRETARY'];

export const StaffAccounts: React.FC = () => {
  const { t, lang } = useLanguage();
  const { isAdmin } = useAuth();
  const [staff, setStaff]       = useState<StaffUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<{ role: StaffRole; user?: StaffUser } | null>(null);
  const [saving, setSaving]     = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({ name: '', email: '', password: '' });

  const load = useCallback(() => {
    setLoading(true);
    staffApi.getAll().then(r => setStaff(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Only ADMIN can manage staff
  if (!isAdmin) return null;

  const byRole = (role: StaffRole) => staff.find(s => s.role === role) || null;

  const openCreate = (role: StaffRole) => {
    setForm({ name: '', email: '', password: '' });
    setError('');
    setModal({ role });
  };

  const openEdit = (user: StaffUser) => {
    setForm({ name: user.name, email: user.email, password: '' });
    setError('');
    setModal({ role: user.role, user });
  };

  const save = async () => {
    if (!modal) return;
    if (!form.name || !form.email) { setError(lang === 'ar' ? 'الاسم والبريد مطلوبان' : 'Nom et e-mail requis'); return; }
    if (!modal.user && !form.password) { setError(lang === 'ar' ? 'كلمة المرور مطلوبة' : 'Mot de passe requis'); return; }
    setSaving(true); setError('');
    try {
      if (modal.user) {
        const payload: any = { name: form.name, email: form.email };
        if (form.password) payload.password = form.password;
        await staffApi.update(modal.user.id, payload);
      } else {
        await staffApi.create({ name: form.name, email: form.email, password: form.password, role: modal.role });
      }
      setModal(null); load();
    } catch (err: any) {
      setError(err?.response?.data?.message || (lang === 'ar' ? 'حدث خطأ' : 'Erreur'));
    } finally { setSaving(false); }
  };

  const toggleActive = async (user: StaffUser) => {
    try {
      await staffApi.update(user.id, { isActive: !user.isActive });
      load();
    } catch {}
  };

  const remove = async (user: StaffUser) => {
    const msg = lang === 'ar' ? t('settings.staff.deleteConfirm') : t('settings.staff.deleteConfirm');
    if (!confirm(msg)) return;
    try { await staffApi.remove(user.id); load(); } catch {}
  };

  const tr = (key: string) => {
    const parts = `settings.staff.${key}`.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = { settings: { staff: (t as any)('settings')?.staff } };
    return t(`settings.staff.${key}` as any) || key;
  };

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
          <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('settings.staff.title')}</h3>
          <p className="text-xs text-gray-500 mt-0.5 max-w-lg">{t('settings.staff.subtitle')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLES.map(role => {
            const cfg    = ROLE_CONFIG[role];
            const user   = byRole(role);
            const roleKey = role.toLowerCase() as 'president' | 'treasurer' | 'secretary';
            const label  = lang === 'ar'
              ? t(`settings.staff.roles.${role}.label` as any)
              : t(`settings.staff.roles.${role}.label` as any);
            const desc   = lang === 'ar'
              ? t(`settings.staff.roles.${role}.desc` as any)
              : t(`settings.staff.roles.${role}.desc` as any);
            const permsKey = `settings.staff.permissions.${role}` as any;
            const perms: string[] = t(permsKey) as any || [];

            return (
              <div key={role} className={`rounded-xl border-2 ${cfg.colorBorder} overflow-hidden flex flex-col`}>
                {/* Role header */}
                <div className={`px-4 py-3 ${cfg.colorBg} flex items-center gap-2`}>
                  <span className={cfg.colorText}>{cfg.icon}</span>
                  <span className={`font-bold text-sm ${cfg.colorText}`}>{label}</span>
                  {user && (
                    <span className={`ms-auto text-xs font-medium ${user.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                      {user.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col gap-3">
                  {/* Description */}
                  <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>

                  {/* Permissions chips */}
                  {Array.isArray(perms) && perms.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {perms.map((p: string, i: number) => (
                        <span key={i} className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${cfg.colorBg} ${cfg.colorText}`}>
                          <ShieldCheck size={10} />{p}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Account info */}
                  {user ? (
                    <div className="mt-auto">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1">
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                        <div className={`text-xs font-medium ${user.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                          {user.isActive ? t('settings.staff.active') : t('settings.staff.inactive')}
                        </div>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                        >
                          <Pencil size={12} />{lang === 'ar' ? 'تعديل' : 'Modifier'}
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border ${user.isActive ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                        >
                          {user.isActive ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                          {user.isActive ? (lang === 'ar' ? 'تعطيل' : 'Désactiver') : (lang === 'ar' ? 'تفعيل' : 'Activer')}
                        </button>
                        <button
                          onClick={() => remove(user)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => openCreate(role)}
                      className={`mt-auto w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 border-dashed ${cfg.colorBorder} ${cfg.colorText} hover:${cfg.colorBg} transition-colors text-sm font-medium`}
                    >
                      <Plus size={14} />{t('settings.staff.createFor')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className={ROLE_CONFIG[modal.role].colorText}>{ROLE_CONFIG[modal.role].icon}</span>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {modal.user ? t('settings.staff.editAccount') : t('settings.staff.createFor')}
                  {' — '}
                  {t(`settings.staff.roles.${modal.role}.label` as any)}
                </h3>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">{t('settings.staff.name')} *</label>
                <input className="input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
              </div>
              <div>
                <label className="label">{t('settings.staff.email')} *</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
              </div>
              <div>
                <label className="label">
                  {modal.user ? t('settings.staff.newPassword') : `${t('settings.staff.password')} *`}
                </label>
                <div className="relative">
                  <input
                    className="input pe-10"
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({...p, password: e.target.value}))}
                    placeholder={modal.user ? (lang === 'ar' ? 'اتركها فارغة للإبقاء' : 'Laisser vide pour conserver') : ''}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute inset-y-0 end-2 flex items-center px-2 text-gray-400">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : (lang === 'ar' ? 'حفظ' : 'Enregistrer')}
                </button>
                <button onClick={() => setModal(null)} className="btn-secondary flex-1">
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
