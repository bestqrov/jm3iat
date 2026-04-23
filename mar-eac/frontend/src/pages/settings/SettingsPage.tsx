import React, { useState, useRef } from 'react';
import { Settings, Building2, User, CreditCard, Sun, Moon, Globe, CalendarDays, Activity, BookOpen, Landmark, Mail, Zap, CheckCircle2, ArrowUpCircle, Camera, Share2, MessageCircle, Wifi, WifiOff, RefreshCw, Unlink, ExternalLink } from 'lucide-react';

const MOROCCO_REGIONS = [
  { fr: 'Tanger-Tétouan-Al Hoceïma',       ar: 'طنجة-تطوان-الحسيمة' },
  { fr: 'Oriental',                          ar: 'الشرق' },
  { fr: 'Fès-Meknès',                        ar: 'فاس-مكناس' },
  { fr: 'Rabat-Salé-Kénitra',               ar: 'الرباط-سلا-القنيطرة' },
  { fr: 'Béni Mellal-Khénifra',             ar: 'بني ملال-خنيفرة' },
  { fr: 'Casablanca-Settat',                ar: 'الدار البيضاء-سطات' },
  { fr: 'Marrakech-Safi',                   ar: 'مراكش-آسفي' },
  { fr: 'Drâa-Tafilalet',                   ar: 'درعة-تافيلالت' },
  { fr: 'Souss-Massa',                      ar: 'سوس-ماسة' },
  { fr: 'Guelmim-Oued Noun',                ar: 'كلميم-واد نون' },
  { fr: 'Laâyoune-Sakia El Hamra',          ar: 'العيون-الساقية الحمراء' },
  { fr: 'Dakhla-Oued Ed-Dahab',             ar: 'الداخلة-وادي الذهب' },
];
import { useAuth } from '../../contexts/AuthContext';
import { StaffAccounts } from '../../components/settings/StaffAccounts';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { authApi, whatsappApi, backupApi } from '../../lib/api';
import { formatDate } from '../../lib/utils';

export const SettingsPage: React.FC = () => {
  const { user, organization, refreshUser } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const org = organization as any;

  // French profile
  const [orgFormFr, setOrgFormFr] = useState({
    name: org?.name || '',
    phone: org?.phone || '',
    address: org?.address || '',
    city: org?.city || '',
    region: org?.region || '',
    description: org?.description || '',
  });

  // Arabic profile
  const [orgFormAr, setOrgFormAr] = useState({
    nameAr: org?.nameAr || '',
    addressAr: org?.addressAr || '',
    cityAr: org?.cityAr || '',
    regionAr: org?.regionAr || '',
    descriptionAr: org?.descriptionAr || '',
  });

  const [infoFormFr, setInfoFormFr] = useState({
    foundingDate: org?.foundingDate ? new Date(org.foundingDate).toISOString().split('T')[0] : '',
    activities: org?.activities || '',
    adminHistory: org?.adminHistory || '',
  });

  const [infoFormAr, setInfoFormAr] = useState({
    activitiesAr: org?.activitiesAr || '',
    adminHistoryAr: org?.adminHistoryAr || '',
  });

  const [contactForm, setContactForm] = useState({
    email: org?.email || '',
    bankName: org?.bankName || '',
    bankAccount: org?.bankAccount || '',
    bankRib: org?.bankRib || '',
  });

  const [socialForm, setSocialForm] = useState({
    whatsapp:  org?.whatsapp  || '',
    facebook:  org?.facebook  || '',
    instagram: org?.instagram || '',
    tiktok:    org?.tiktok    || '',
    youtube:   org?.youtube   || '',
  });

  const handleSaveSocial = async () => {
    setSaving('social');
    try {
      await authApi.updateOrganization(socialForm);
      showSuccess('social');
    } catch { setError('social'); } finally { setSaving(null); }
  };

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    currentPassword: '',
    newPassword: '',
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(org?.logo || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradingSub, setUpgradingSub] = useState(false);

  // Backup extra
  const [backupRecords,   setBackupRecords]   = useState<any[]>([]);
  const [backupToggling,  setBackupToggling]  = useState(false);
  const [backupCreating,  setBackupCreating]  = useState(false);

  const hasBackup = ((org as any)?.modules ?? []).includes('BACKUP');

  const loadBackups = async () => {
    if (!hasBackup) return;
    try {
      const r = await backupApi.list();
      setBackupRecords(r.data);
    } catch {}
  };

  React.useEffect(() => { loadBackups(); }, [hasBackup]);

  const handleToggleBackup = async () => {
    setBackupToggling(true);
    try {
      await backupApi.toggle();
      await refreshUser();
    } catch {} finally { setBackupToggling(false); }
  };

  const handleCreateBackup = async () => {
    setBackupCreating(true);
    try {
      backupApi.create();
      await new Promise(r => setTimeout(r, 1500));
      await loadBackups();
    } catch {} finally { setBackupCreating(false); }
  };

  // WhatsApp instance
  const [waStatus,       setWaStatus]       = useState<'idle' | 'loading' | 'connected' | 'disconnected'>('idle');
  const [waQr,           setWaQr]           = useState<string | null>(null);
  const [waPolling,      setWaPolling]      = useState(false);
  const [waError,        setWaError]        = useState<string | null>(null);
  const [waDisconnecting,setWaDisconnecting]= useState(false);

  const showSuccess = (key: string) => {
    setSuccess(key);
    setError(null);
    setTimeout(() => setSuccess(null), 2500);
  };

  React.useEffect(() => { loadWaStatus(); }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setUploadingLogo(true);
    try {
      await authApi.uploadLogo(file);
      await refreshUser();
    } catch { setLogoPreview(org?.logo || null); }
    finally { setUploadingLogo(false); }
  };

  const handleSaveOrg = async () => {
    setSaving('org');
    try {
      await authApi.updateOrganization(lang === 'ar' ? orgFormAr : orgFormFr);
      showSuccess('org');
    } catch { setError('org'); } finally { setSaving(null); }
  };

  const handleSaveInfo = async () => {
    setSaving('info');
    try {
      if (lang === 'ar') {
        await authApi.updateOrganization({
          foundingDate: infoFormFr.foundingDate,
          activitiesAr: infoFormAr.activitiesAr,
          adminHistoryAr: infoFormAr.adminHistoryAr,
        });
      } else {
        await authApi.updateOrganization(infoFormFr);
      }
      showSuccess('info');
    } catch { setError('info'); } finally { setSaving(null); }
  };

  const [downgradeTarget, setDowngradeTarget] = useState<string | null>(null);

  const PLAN_LEVELS: Record<string, number> = { BASIC: 1, STANDARD: 2, PREMIUM: 3 };

  // Features lost per plan downgrade
  const DOWNGRADE_LOSSES: Record<string, { icon: string; fr: string; ar: string }[]> = {
    BASIC: [
      { icon: '💰', fr: 'Gestion financière (recettes & dépenses)', ar: 'إدارة المالية (إيرادات ومصاريف)' },
      { icon: '📊', fr: 'Rapports & statistiques avancées', ar: 'التقارير والإحصاءات المتقدمة' },
      { icon: '💧', fr: 'Module eau (si activé)', ar: 'وحدة الماء (إن كانت مفعلة)' },
      { icon: '🏗️', fr: 'Projets & demandes de financement', ar: 'المشاريع وطلبات التمويل' },
      { icon: '🔔', fr: 'Rappels & notifications automatiques', ar: 'التذكيرات والإشعارات التلقائية' },
      { icon: '🚌', fr: 'Transport scolaire (si activé)', ar: 'النقل المدرسي (إن كان مفعلاً)' },
    ],
    STANDARD: [
      { icon: '💧', fr: 'Module eau (si activé)', ar: 'وحدة الماء (إن كانت مفعلة)' },
      { icon: '🏗️', fr: 'Projets & demandes de financement', ar: 'المشاريع وطلبات التمويل' },
      { icon: '🔔', fr: 'Rappels & notifications automatiques', ar: 'التذكيرات والإشعارات التلقائية' },
      { icon: '🚌', fr: 'Transport scolaire (si activé)', ar: 'النقل المدرسي (إن كان مفعلاً)' },
    ],
  };

  const handleUpgrade = async (plan: string) => {
    const currentLevel = PLAN_LEVELS[sub?.plan || 'BASIC'];
    const targetLevel  = PLAN_LEVELS[plan];
    const isDowngrade  = targetLevel < currentLevel && sub?.status !== 'TRIAL';

    if (isDowngrade) {
      setDowngradeTarget(plan);
      return;
    }
    await doUpgrade(plan);
  };

  const doUpgrade = async (plan: string) => {
    setUpgradingSub(true);
    try {
      await authApi.upgradeSubscription(plan);
      await refreshUser();
      showSuccess('sub');
    } catch { } finally { setUpgradingSub(false); setDowngradeTarget(null); }
  };

  const cancelPendingDowngrade = async () => {
    setUpgradingSub(true);
    try {
      await authApi.cancelDowngrade();
      await refreshUser();
    } catch { } finally { setUpgradingSub(false); }
  };

  const handleSaveContact = async () => {
    setSaving('contact');
    try {
      await authApi.updateOrganization(contactForm);
      showSuccess('contact');
    } catch (err: any) {
      setError(err.response?.data?.message || 'contact');
    } finally { setSaving(null); }
  };

  const handleSaveProfile = async () => {
    setSaving('profile');
    try {
      await authApi.updateProfile(profileForm);
      await refreshUser();
      showSuccess('profile');
    } catch { setError('profile'); } finally { setSaving(null); }
  };

  // WhatsApp connect flow
  const loadWaStatus = async () => {
    setWaStatus('loading'); setWaError(null);
    try {
      const r = await whatsappApi.getStatus();
      setWaStatus(r.data.connected ? 'connected' : 'disconnected');
    } catch { setWaStatus('disconnected'); }
  };

  const handleWaConnect = async () => {
    setWaStatus('loading'); setWaQr(null); setWaError(null);
    try {
      const r = await whatsappApi.getQr();
      if (r.data.base64) {
        setWaQr(r.data.base64);
        setWaStatus('disconnected');
        // Poll for connection every 3s for up to 2 min
        setWaPolling(true);
        let tries = 0;
        const iv = setInterval(async () => {
          tries++;
          if (tries > 40) { clearInterval(iv); setWaPolling(false); return; }
          try {
            const c = await whatsappApi.confirm();
            if (c.data.success) {
              clearInterval(iv);
              setWaPolling(false);
              setWaQr(null);
              setWaStatus('connected');
              await refreshUser();
            }
          } catch { /* still waiting */ }
        }, 3000);
      } else {
        setWaError(lang === 'ar' ? 'لم يتم توليد QR بعد، حاول مجدداً' : 'QR not ready, retry in 2s');
        setWaStatus('disconnected');
      }
    } catch (err: any) {
      setWaError(err?.response?.data?.message || 'Error');
      setWaStatus('disconnected');
    }
  };

  const handleWaDisconnect = async () => {
    setWaDisconnecting(true);
    try {
      await whatsappApi.disconnect();
      setWaStatus('disconnected');
      setWaQr(null);
      await refreshUser();
    } catch { } finally { setWaDisconnecting(false); }
  };

  const sub = org?.subscription;
  const planBadge: Record<string, string> = { BASIC: 'badge-gray', STANDARD: 'badge-blue', PREMIUM: 'badge-purple' };
  const statusBadge: Record<string, string> = { TRIAL: 'badge-yellow', ACTIVE: 'badge-green', EXPIRED: 'badge-red', CANCELLED: 'badge-red' };

  const SaveButton = ({ key: k, onClick }: { key: string; onClick: () => void }) => (
    <button onClick={onClick} disabled={saving === k} className="btn-primary">
      {saving === k ? t('common.loading') : t('common.save')}
      {success === k && <span className="ms-1 text-emerald-300">✓</span>}
    </button>
  );

  const publicSlug = org?.email?.split('@')[0] || '';
  const publicUrl = `${window.location.origin}/p/${publicSlug}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="page-title">{t('settings.title')}</h2>

      {/* ── Public Profile Card ── */}
      {publicSlug && (
        <div className="card p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Globe size={18} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{lang === 'ar' ? 'صفحتك العامة' : 'Votre page publique'}</p>
                <p className="text-xs text-gray-500 truncate max-w-xs">{publicUrl}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => { navigator.clipboard.writeText(publicUrl); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                {lang === 'ar' ? 'نسخ' : 'Copier'}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                {lang === 'ar' ? 'عرض' : 'Voir'}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. Organization Profile ── */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('settings.orgProfile')}</h3>
            <span className="inline-flex items-center gap-1 mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              {lang === 'ar' ? '🇲🇦 الملف الشخصي العربي' : '🇫🇷 Profil Français'}
            </span>
          </div>
        </div>
        <div className="space-y-4">

          {/* ── Logo upload ── */}
          <div className={`flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="relative flex-shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-500 overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={lang === 'ar' ? 'تحميل الشعار' : 'Télécharger le logo'}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Building2 size={22} className="text-gray-300 dark:text-gray-600" />
              )}
              <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                <Camera size={16} className="text-white" />
              </span>
              {uploadingLogo && (
                <span className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center rounded-xl">
                  <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </span>
              )}
            </button>
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={handleLogoUpload} />
            <div className={`min-w-0 ${lang === 'ar' ? 'text-right' : ''}`}>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {lang === 'ar' ? 'شعار الجمعية' : 'Logo de l\'association'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === 'ar' ? 'يظهر في التقارير والوثائق — PNG أو JPG' : 'Affiché dans les rapports · PNG ou JPG'}
              </p>
              {!uploadingLogo && (
                <button type="button" onClick={() => logoInputRef.current?.click()} className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  {logoPreview ? (lang === 'ar' ? 'تغيير الشعار' : 'Changer le logo') : (lang === 'ar' ? 'إضافة شعار' : 'Ajouter un logo')}
                </button>
              )}
            </div>
          </div>

          {lang === 'ar' ? (
            /* ── Arabic profile fields ── */
            <div className="space-y-4" dir="rtl">
              <div>
                <label className="label text-right">اسم الجمعية بالعربية</label>
                <input className="input text-right" value={orgFormAr.nameAr} onChange={(e) => setOrgFormAr({ ...orgFormAr, nameAr: e.target.value })} placeholder="اسم الجمعية" />
              </div>
              <div>
                <label className="label text-right">العنوان</label>
                <input className="input text-right" value={orgFormAr.addressAr} onChange={(e) => setOrgFormAr({ ...orgFormAr, addressAr: e.target.value })} placeholder="العنوان الكامل" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-right">المدينة</label>
                  <input className="input text-right" value={orgFormAr.cityAr} onChange={(e) => setOrgFormAr({ ...orgFormAr, cityAr: e.target.value })} placeholder="المدينة" />
                </div>
                <div>
                  <label className="label text-right">الجهة</label>
                  <select className="input text-right" dir="rtl" value={orgFormAr.regionAr} onChange={(e) => setOrgFormAr({ ...orgFormAr, regionAr: e.target.value })}>
                    <option value="">— اختر الجهة —</option>
                    {MOROCCO_REGIONS.map((r) => (
                      <option key={r.fr} value={r.ar}>{r.ar}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label text-right">وصف مختصر</label>
                <textarea className="input text-right" rows={2} value={orgFormAr.descriptionAr} onChange={(e) => setOrgFormAr({ ...orgFormAr, descriptionAr: e.target.value })} placeholder="وصف الجمعية" />
              </div>
            </div>
          ) : (
            /* ── French profile fields ── */
            <div className="space-y-4">
              <div>
                <label className="label">{t('auth.orgName')}</label>
                <input className="input" value={orgFormFr.name} onChange={(e) => setOrgFormFr({ ...orgFormFr, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Adresse</label>
                <input className="input" value={orgFormFr.address} onChange={(e) => setOrgFormFr({ ...orgFormFr, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('auth.orgCity')}</label>
                  <input className="input" value={orgFormFr.city} onChange={(e) => setOrgFormFr({ ...orgFormFr, city: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('auth.orgRegion')}</label>
                  <select className="input" value={orgFormFr.region} onChange={(e) => setOrgFormFr({ ...orgFormFr, region: e.target.value })}>
                    <option value="">— Choisir la région —</option>
                    {MOROCCO_REGIONS.map((r) => (
                      <option key={r.fr} value={r.fr}>{r.fr}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input className="input" type="tel" value={orgFormFr.phone} onChange={(e) => setOrgFormFr({ ...orgFormFr, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Description courte</label>
                <textarea className="input" rows={2} value={orgFormFr.description} onChange={(e) => setOrgFormFr({ ...orgFormFr, description: e.target.value })} />
              </div>
            </div>
          )}

          <button onClick={handleSaveOrg} disabled={saving === 'org'} className="btn-primary">
            {saving === 'org' ? t('common.loading') : t('common.save')}
            {success === 'org' && <span className="ms-1">✓</span>}
          </button>
        </div>
      </div>

      {/* ── 2. Contact & Bank ── */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
            <Landmark size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'البريد الإلكتروني والحساب البنكي' : 'Email et compte bancaire'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {lang === 'ar' ? 'معلومات التواصل والتحويلات المالية' : 'Coordonnées et virements financiers'}
            </p>
          </div>
        </div>
        <div className="space-y-4">

          {/* Association email */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Mail size={13} className="text-indigo-500" />
              {lang === 'ar' ? 'البريد الإلكتروني للجمعية' : 'Email de l\'association'}
            </label>
            <input
              className="input"
              type="email"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              placeholder="association@example.ma"
            />
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Landmark size={12} />
              {lang === 'ar' ? 'معلومات الحساب البنكي' : 'Informations bancaires'}
            </p>
            <div className="space-y-3">
              <div>
                <label className="label">{lang === 'ar' ? 'اسم البنك' : 'Nom de la banque'}</label>
                <input
                  className="input"
                  value={contactForm.bankName}
                  onChange={(e) => setContactForm({ ...contactForm, bankName: e.target.value })}
                  placeholder={lang === 'ar' ? 'مثال: بنك المغرب' : 'Ex : Attijariwafa Bank'}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{lang === 'ar' ? 'رقم الحساب' : 'Numéro de compte'}</label>
                  <input
                    className="input font-mono"
                    value={contactForm.bankAccount}
                    onChange={(e) => setContactForm({ ...contactForm, bankAccount: e.target.value })}
                    placeholder="00000000000000000000"
                  />
                </div>
                <div>
                  <label className="label">RIB</label>
                  <input
                    className="input font-mono"
                    value={contactForm.bankRib}
                    onChange={(e) => setContactForm({ ...contactForm, bankRib: e.target.value })}
                    placeholder="000 000 0000000000000000 00"
                  />
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleSaveContact} disabled={saving === 'contact'} className="btn-primary">
            {saving === 'contact' ? t('common.loading') : t('common.save')}
            {success === 'contact' && <span className="ms-1">✓</span>}
          </button>
          {error === 'contact' && (
            <p className="text-xs text-red-500">{lang === 'ar' ? 'البريد الإلكتروني مستخدم بالفعل' : 'Email déjà utilisé par une autre organisation'}</p>
          )}
        </div>
      </div>

      {/* ── 3. Social Media ── */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center">
            <Share2 size={18} className="text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'وسائل التواصل الاجتماعي' : 'Réseaux sociaux'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {lang === 'ar'
                ? 'تُستخدم في التسويق والأتمتة والوثائق'
                : 'Utilisés dans le marketing, automatisations et documents'}
            </p>
          </div>
        </div>
        <div className="space-y-3" {...(lang === 'ar' ? { dir: 'rtl' } : {})}>
          {([
            { key: 'whatsapp',  label: 'WhatsApp',  labelAr: 'واتساب',   placeholder: '+212600000000',              color: 'text-emerald-500' },
            { key: 'facebook',  label: 'Facebook',  labelAr: 'فيسبوك',   placeholder: 'facebook.com/your-page',     color: 'text-blue-600'   },
            { key: 'instagram', label: 'Instagram', labelAr: 'إنستغرام', placeholder: 'instagram.com/your-handle',  color: 'text-pink-500'   },
            { key: 'tiktok',    label: 'TikTok',    labelAr: 'تيك توك',  placeholder: 'tiktok.com/@your-handle',   color: 'text-gray-800 dark:text-gray-200' },
            { key: 'youtube',   label: 'YouTube',   labelAr: 'يوتيوب',   placeholder: 'youtube.com/@your-channel', color: 'text-red-500'    },
          ] as const).map(({ key, label, labelAr, placeholder, color }) => (
            <div key={key}>
              <label className={`label flex items-center gap-1.5 ${lang === 'ar' ? 'justify-end' : ''}`}>
                <span className={`text-xs font-bold ${color}`}>{lang === 'ar' ? labelAr : label}</span>
              </label>
              <input
                className={`input ${lang === 'ar' ? 'text-right' : ''}`}
                type={key === 'whatsapp' ? 'tel' : 'url'}
                value={socialForm[key]}
                onChange={(e) => setSocialForm({ ...socialForm, [key]: e.target.value })}
                placeholder={placeholder}
              />
            </div>
          ))}
          <button onClick={handleSaveSocial} disabled={saving === 'social'} className="btn-primary mt-2">
            {saving === 'social' ? t('common.loading') : t('common.save')}
            {success === 'social' && <span className="ms-1">✓</span>}
          </button>
        </div>
      </div>

      {/* ── 4. WhatsApp Instance ── */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
            <MessageCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'ربط واتساب الجمعية' : 'Connexion WhatsApp'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {lang === 'ar'
                ? 'ربط رقم الجمعية لإرسال الرسائل والمراسلات منها مباشرة'
                : 'Connectez le numéro de l\'association pour envoyer directement depuis lui'}
            </p>
          </div>
        </div>

        {waError && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            ⚠ {waError}
          </div>
        )}

        {waStatus === 'connected' || org?.evolutionInstance ? (
          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
            <div className="flex items-center gap-3">
              <Wifi size={20} className="text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {lang === 'ar' ? 'الواتساب متصل ✓' : 'WhatsApp connecté ✓'}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                  {org?.evolutionInstance || ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleWaDisconnect}
              disabled={waDisconnecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              {waDisconnecting ? <RefreshCw size={14} className="animate-spin" /> : <Unlink size={14} />}
              {lang === 'ar' ? 'قطع الاتصال' : 'Déconnecter'}
            </button>
          </div>
        ) : waQr ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {lang === 'ar'
                ? 'افتح واتساب ← المزيد ← الأجهزة المرتبطة ← ربط جهاز ← امسح الكود'
                : 'Ouvrez WhatsApp → Plus → Appareils liés → Lier un appareil → Scannez'}
            </p>
            <img src={waQr} alt="QR Code" className="w-52 h-52 rounded-xl border-4 border-emerald-400 shadow-lg" />
            {waPolling && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <RefreshCw size={14} className="animate-spin" />
                {lang === 'ar' ? 'في انتظار المسح...' : 'En attente du scan...'}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <WifiOff size={28} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {lang === 'ar'
                ? 'الواتساب غير متصل — اضغط لربط رقم الجمعية'
                : 'WhatsApp non connecté — cliquez pour lier le numéro de l\'association'}
            </p>
            <button
              onClick={handleWaConnect}
              disabled={waStatus === 'loading'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {waStatus === 'loading' ? <RefreshCw size={15} className="animate-spin" /> : <MessageCircle size={15} />}
              {waStatus === 'loading'
                ? (lang === 'ar' ? 'جارٍ التحميل...' : 'Chargement...')
                : (lang === 'ar' ? 'ربط واتساب الجمعية' : 'Connecter WhatsApp')}
            </button>
          </div>
        )}
      </div>

      {/* ── 5. Association Info ── */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center">
            <CalendarDays size={18} className="text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'معلومات الجمعية' : 'Informations de l\'association'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {lang === 'ar' ? 'التأسيس، الأنشطة، التاريخ الإداري' : 'Fondation, activités, historique administratif'}
            </p>
          </div>
        </div>
        <div className="space-y-4">

          {/* Founding date */}
          <div>
            <label className="label flex items-center gap-1.5">
              <CalendarDays size={13} className="text-teal-500" />
              {lang === 'ar' ? 'تاريخ تأسيس الجمعية' : 'Date de création de l\'association'}
            </label>
            <input
              className="input"
              type="date"
              value={infoFormFr.foundingDate}
              onChange={(e) => setInfoFormFr({ ...infoFormFr, foundingDate: e.target.value })}
            />
            {org?.foundingDate && (
              <p className="text-xs text-gray-400 mt-1">
                {lang === 'ar' ? 'الحالي: ' : 'Actuel : '}{formatDate(org.foundingDate, lang)}
              </p>
            )}
          </div>

          {/* Activities */}
          <div {...(lang === 'ar' ? { dir: 'rtl' } : {})}>
            <label className={`label flex items-center gap-1.5 ${lang === 'ar' ? 'justify-end' : ''}`}>
              <Activity size={13} className="text-teal-500" />
              {lang === 'ar' ? 'أنشطة الجمعية' : 'Activités de l\'association'}
            </label>
            {lang === 'ar' ? (
              <textarea
                className="input text-right"
                rows={4}
                placeholder="صف الأنشطة الرئيسية للجمعية: التنمية المحلية، التعليم، الصحة..."
                value={infoFormAr.activitiesAr}
                onChange={(e) => setInfoFormAr({ ...infoFormAr, activitiesAr: e.target.value })}
              />
            ) : (
              <textarea
                className="input"
                rows={4}
                placeholder="Décrivez les activités principales : développement local, éducation, santé..."
                value={infoFormFr.activities}
                onChange={(e) => setInfoFormFr({ ...infoFormFr, activities: e.target.value })}
              />
            )}
          </div>

          {/* Administrative history */}
          <div {...(lang === 'ar' ? { dir: 'rtl' } : {})}>
            <label className={`label flex items-center gap-1.5 ${lang === 'ar' ? 'justify-end' : ''}`}>
              <BookOpen size={13} className="text-teal-500" />
              {lang === 'ar' ? 'التاريخ الإداري' : 'Historique administratif'}
            </label>
            {lang === 'ar' ? (
              <>
                <textarea
                  className="input text-right"
                  rows={5}
                  placeholder="سجل هنا تاريخ الهيئات الإدارية السابقة، الانتخابات، القرارات المهمة..."
                  value={infoFormAr.adminHistoryAr}
                  onChange={(e) => setInfoFormAr({ ...infoFormAr, adminHistoryAr: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">مثال: 2020 - رئيس: محمد أمين، الكاتب: فاطمة...</p>
              </>
            ) : (
              <>
                <textarea
                  className="input"
                  rows={5}
                  placeholder="Enregistrez ici l'historique des bureaux passés, élections, décisions importantes..."
                  value={infoFormFr.adminHistory}
                  onChange={(e) => setInfoFormFr({ ...infoFormFr, adminHistory: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">Ex : 2020 – Président : Mohamed Amine, Secrétaire : Fatima...</p>
              </>
            )}
          </div>

          <button onClick={handleSaveInfo} disabled={saving === 'info'} className="btn-primary">
            {saving === 'info' ? t('common.loading') : t('common.save')}
            {success === 'info' && <span className="ms-1">✓</span>}
          </button>
        </div>
      </div>

      {/* ── 4. Account Settings ── */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <User size={18} className="text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('settings.account')}</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">{t('auth.adminName')}</label>
            <input className="input" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'كلمة المرور الحالية' : 'Mot de passe actuel'}</label>
            <input className="input" type="password" value={profileForm.currentPassword} onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}</label>
            <input className="input" type="password" value={profileForm.newPassword} onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })} />
          </div>
          <button onClick={handleSaveProfile} disabled={saving === 'profile'} className="btn-primary">
            {saving === 'profile' ? t('common.loading') : t('common.save')}
            {success === 'profile' && <span className="ms-1">✓</span>}
          </button>
        </div>
      </div>

      {/* ── 5. Subscription & Upgrade ── */}
      <div className="card p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'الاشتراك والترقية' : 'Abonnement & Activation'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {lang === 'ar' ? 'اختر الباقة المناسبة لجمعيتك' : 'Choisissez le plan adapté à votre association'}
            </p>
          </div>
        </div>

        {/* ── Current pack card ── */}
        {sub && (() => {
          const modules: string[] = (org as any)?.modules ?? [];
          const MODULE_LABELS: Record<string, { fr: string; ar: string; icon: string; color: string }> = {
            FINANCE:          { fr: 'Finance',           ar: 'المالية',          icon: '💰', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
            PROJECTS:         { fr: 'Projets',           ar: 'المشاريع',         icon: '🏗️', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
            WATER:            { fr: 'Eau',               ar: 'الماء',            icon: '💧', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
            PRODUCTIVE:       { fr: 'Production',        ar: 'الإنتاج',          icon: '🏭', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
            TRANSPORT:        { fr: 'Transport scolaire',ar: 'النقل المدرسي',    icon: '🚌', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
            REPORTS:          { fr: 'Rapports',          ar: 'التقارير',         icon: '📊', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
            REMINDERS:        { fr: 'Rappels',           ar: 'التذكيرات',        icon: '🔔', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
          };
          const ASSOC_TYPE_LABEL: Record<string, { fr: string; ar: string; icon: string }> = {
            TRANSPORT:        { fr: 'Transport scolaire', ar: 'النقل المدرسي',   icon: '🚌' },
            WATER:            { fr: 'Eau potable',        ar: 'الماء الشروب',    icon: '💧' },
            PROJECTS:         { fr: 'Projets',            ar: 'مشاريع',          icon: '🏗️' },
            PRODUCTIVE:       { fr: 'Coopérative',        ar: 'تعاونية إنتاجية', icon: '🏭' },
            PRODUCTIVE_WATER: { fr: 'Eau & Production',   ar: 'ماء وإنتاج',      icon: '🌿' },
            REGULAR:          { fr: 'Association classique', ar: 'جمعية عامة',   icon: '🏛️' },
          };
          // Derive assoc type from modules
          const assocType = modules.includes('TRANSPORT') ? 'TRANSPORT'
            : modules.includes('WATER') && modules.includes('PRODUCTIVE') ? 'PRODUCTIVE_WATER'
            : modules.includes('WATER') ? 'WATER'
            : modules.includes('PRODUCTIVE') ? 'PRODUCTIVE'
            : modules.includes('PROJECTS') ? 'PROJECTS'
            : 'REGULAR';
          const typeInfo = ASSOC_TYPE_LABEL[assocType];

          return (
            <div className="rounded-xl border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{typeInfo.icon}</span>
                    <span className="font-bold text-gray-900 dark:text-white text-base">
                      {lang === 'ar' ? typeInfo.ar : typeInfo.fr}
                    </span>
                    <span className={planBadge[sub.plan]}>{t(`settings.plans.${sub.plan}`)}</span>
                    <span className={statusBadge[sub.status]}>{t(`subscription.${sub.status.toLowerCase()}`)}</span>
                  </div>
                  {sub.expiresAt && (
                    <p className="text-xs text-gray-400 mb-2">
                      {lang === 'ar' ? 'تنتهي: ' : 'Expire le : '}{formatDate(sub.expiresAt, lang)}
                    </p>
                  )}
                  {/* Active modules */}
                  {modules.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {modules.map(m => {
                        const info = MODULE_LABELS[m];
                        if (!info) return null;
                        return (
                          <span key={m} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${info.color}`}>
                            {info.icon} {lang === 'ar' ? info.ar : info.fr}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                {success === 'sub' && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 size={13} />{lang === 'ar' ? 'تم التحديث' : 'Mis à jour'}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Pending downgrade banner ── */}
        {sub?.pendingPlan && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-xl">⏳</span>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {lang === 'ar'
                    ? `طلب تخفيض الباقة إلى ${sub.pendingPlan} قيد الموافقة`
                    : `Demande de passage au plan ${sub.pendingPlan} en attente d'approbation`}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {lang === 'ar'
                    ? 'سيتم تطبيق التغيير بعد موافقة المشرف'
                    : 'Le changement sera appliqué après approbation du superadmin'}
                </p>
              </div>
            </div>
            <button
              onClick={cancelPendingDowngrade}
              disabled={upgradingSub}
              className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
            >
              {lang === 'ar' ? 'إلغاء الطلب' : 'Annuler la demande'}
            </button>
          </div>
        )}

        {/* ── Plan cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              key: 'BASIC',
              color: 'border-gray-300 dark:border-gray-600',
              headerBg: 'bg-gray-100 dark:bg-gray-700',
              price: lang === 'ar' ? '50 درهم/شهر' : '50 MAD/mois',
              features: [
                { icon: '👥', label: lang === 'ar' ? 'إدارة الأعضاء' : 'Gestion des membres' },
                { icon: '📅', label: lang === 'ar' ? 'الاجتماعات' : 'Réunions' },
                { icon: '📄', label: lang === 'ar' ? 'الوثائق' : 'Documents' },
                { icon: '🗳️', label: lang === 'ar' ? 'التصويت والقرارات' : 'Votes & décisions' },
              ],
            },
            {
              key: 'STANDARD',
              color: 'border-blue-400 dark:border-blue-500',
              headerBg: 'bg-blue-50 dark:bg-blue-900/30',
              price: lang === 'ar' ? '150 درهم/شهر' : '150 MAD/mois',
              features: [
                { icon: '✅', label: lang === 'ar' ? 'كل ما في الأساسي' : 'Tout le Basic' },
                { icon: '💰', label: lang === 'ar' ? 'إدارة المالية' : 'Finances' },
                { icon: '📊', label: lang === 'ar' ? 'التقارير والإحصاءات' : 'Rapports & stats' },
                { icon: '🏗️', label: lang === 'ar' ? 'المشاريع والتمويل' : 'Projets & financement' },
              ],
            },
            {
              key: 'PREMIUM',
              color: 'border-purple-500 dark:border-purple-400',
              headerBg: 'bg-purple-50 dark:bg-purple-900/30',
              price: lang === 'ar' ? '249 درهم/شهر' : '249 MAD/mois',
              features: [
                { icon: '✅', label: lang === 'ar' ? 'كل ما في المعياري' : 'Tout le Standard' },
                { icon: '💧', label: lang === 'ar' ? 'إدارة الماء' : 'Gestion eau' },
                { icon: '🚌', label: lang === 'ar' ? 'النقل المدرسي' : 'Transport scolaire' },
                { icon: '🔔', label: lang === 'ar' ? 'التذكيرات الذكية' : 'Rappels intelligents' },
              ],
            },
          ].map(({ key, color, headerBg, price, features }) => {
            const isCurrent = sub?.plan === key && sub?.status === 'ACTIVE';
            const isTrial   = sub?.status === 'TRIAL';
            const isUpgrade   = PLAN_LEVELS[key] > PLAN_LEVELS[sub?.plan || 'BASIC'] || isTrial;
            const isDowngrade = PLAN_LEVELS[key] < PLAN_LEVELS[sub?.plan || 'BASIC'] && !isTrial;

            return (
              <div key={key} className={`rounded-xl border-2 overflow-hidden flex flex-col transition-shadow ${isCurrent ? 'border-emerald-500 shadow-lg' : color}`}>
                <div className={`p-4 ${headerBg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 dark:text-white">{t(`settings.plans.${key}`)}</span>
                    {isCurrent && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 size={13} />{lang === 'ar' ? 'الحالي' : 'Actif'}
                      </span>
                    )}
                    {key === 'PREMIUM' && !isCurrent && (
                      <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-medium">
                        {lang === 'ar' ? 'الأفضل' : 'Meilleur'}
                      </span>
                    )}
                    {isDowngrade && (
                      <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">
                        {lang === 'ar' ? 'تخفيض' : 'Rétrog.'}
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-primary-600 dark:text-primary-400">{price}</div>
                </div>
                <div className="p-4 flex-1 space-y-2">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span>{f.icon}</span>{f.label}
                    </div>
                  ))}
                </div>
                <div className="p-4 pt-0">
                  {isCurrent ? (
                    <div className="w-full text-center text-sm text-emerald-600 dark:text-emerald-400 font-medium py-2">
                      {lang === 'ar' ? '✓ مفعّل حالياً' : '✓ Plan actuel'}
                    </div>
                  ) : sub?.pendingPlan === key ? (
                    <div className="w-full text-center text-xs text-amber-600 dark:text-amber-400 font-medium py-2 flex items-center justify-center gap-1">
                      ⏳ {lang === 'ar' ? 'في انتظار الموافقة' : 'En attente d\'approbation'}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(key)}
                      disabled={upgradingSub || !!sub?.pendingPlan}
                      className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        isDowngrade
                          ? 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                          : 'bg-primary-600 hover:bg-primary-700 text-white'
                      }`}
                    >
                      <ArrowUpCircle size={14} className={isDowngrade ? 'rotate-180' : ''} />
                      {upgradingSub
                        ? (lang === 'ar' ? 'جاري...' : 'En cours...')
                        : isDowngrade
                          ? (lang === 'ar' ? `طلب تخفيض إلى ${key}` : `Demander ${key}`)
                          : isUpgrade
                            ? (lang === 'ar' ? `ترقية إلى ${key}` : `Passer au ${key}`)
                            : (lang === 'ar' ? `تفعيل ${key}` : `Activer ${key}`)}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Downgrade confirmation dialog ── */}
      {downgradeTarget && (() => {
        const losses = DOWNGRADE_LOSSES[downgradeTarget] || [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
              {/* Header */}
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⚠️</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {lang === 'ar' ? 'تأكيد تخفيض الباقة' : 'Confirmer la rétrogradation'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {lang === 'ar'
                        ? `سيتم الانتقال إلى الباقة ${downgradeTarget}`
                        : `Passage au plan ${downgradeTarget}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  {lang === 'ar' ? '⚠️ ستفقد الوصول إلى هذه الميزات فوراً:' : '⚠️ Vous perdrez immédiatement l\'accès à :'}
                </p>
                <ul className="space-y-2">
                  {losses.map((l, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/10 rounded-lg px-3 py-2">
                      <span className="text-base flex-shrink-0">{l.icon}</span>
                      <span>{lang === 'ar' ? l.ar : l.fr}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                  {lang === 'ar'
                    ? '💡 ستظل بياناتك محفوظة. يمكنك الترقية مجدداً في أي وقت لاستعادة الوصول.'
                    : '💡 Vos données restent conservées. Vous pouvez rétrograder à tout moment pour récupérer l\'accès.'}
                </p>
              </div>

              {/* Footer */}
              <div className="p-5 pt-0 flex gap-3">
                <button
                  onClick={() => setDowngradeTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  onClick={() => doUpgrade(downgradeTarget)}
                  disabled={upgradingSub}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {upgradingSub
                    ? (lang === 'ar' ? 'جاري...' : 'En cours...')
                    : (lang === 'ar' ? 'تأكيد التخفيض' : 'Confirmer la rétrogradation')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 6. Options extras ── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
            <span className="text-lg">⚙️</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'خيارات إضافية' : 'Options supplémentaires'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {lang === 'ar' ? 'خدمات إضافية تُضاف على اشتراكك الحالي' : 'Services additionnels ajoutés à votre abonnement actuel'}
            </p>
          </div>
        </div>

        {/* ── BACKUP extra card ── */}
        <div className={`rounded-xl border-2 p-4 transition-colors ${hasBackup ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${hasBackup ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <span className="text-xl">💾</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {lang === 'ar' ? 'الحفظ الاحتياطي التلقائي' : 'Sauvegarde & Backups'}
                  </span>
                  <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                    +29 MAD/mois
                  </span>
                  {hasBackup && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 size={11} />{lang === 'ar' ? 'مفعّل' : 'Actif'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                  {lang === 'ar'
                    ? 'تصدير كامل لبيانات جمعيتك (أعضاء، مالية، اجتماعات، وثائق…) بصيغة JSON قابلة للاستيراد'
                    : 'Export complet de vos données (membres, finances, réunions, documents…) au format JSON importable'}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['👥 Membres', '💰 Finances', '📅 Réunions', '📄 Documents', '🚌 Transport'].map(f => (
                    <span key={f} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{f}</span>
                  ))}
                </div>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              onClick={handleToggleBackup}
              disabled={backupToggling}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${hasBackup ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${hasBackup ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Backup management (visible when enabled) */}
          {hasBackup && (
            <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'ar' ? `${backupRecords.length} نسخة احتياطية` : `${backupRecords.length} sauvegarde(s)`}
                </span>
                <button
                  onClick={handleCreateBackup}
                  disabled={backupCreating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-60"
                >
                  {backupCreating ? (
                    <>{lang === 'ar' ? 'جاري التصدير...' : 'Exportation...'}</>
                  ) : (
                    <>{lang === 'ar' ? '⬇️ إنشاء نسخة الآن' : '⬇️ Créer une sauvegarde'}</>
                  )}
                </button>
              </div>

              {backupRecords.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {backupRecords.map((rec: any) => (
                    <div key={rec.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-xs border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500">✓</span>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {new Date(rec.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-400">
                        {rec.createdByName && <span>{rec.createdByName}</span>}
                        <span>{rec.sizeKb} KB</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-3">
                  {lang === 'ar' ? 'لا توجد نسخ احتياطية بعد — اضغط إنشاء نسخة' : 'Aucune sauvegarde encore — cliquez sur Créer'}
                </p>
              )}

              <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                💡 {lang === 'ar'
                  ? 'النسخة الاحتياطية تُنزَّل فوراً كملف JSON. احتفظ بها في مكان آمن.'
                  : 'La sauvegarde est téléchargée immédiatement en JSON. Conservez-la dans un endroit sûr.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 7. Staff Accounts ── */}
      <StaffAccounts />

      {/* ── 7. Appearance ── */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <Settings size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{lang === 'ar' ? 'المظهر واللغة' : 'Apparence et Langue'}</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">{t('settings.theme')}</label>
            <div className="flex gap-3">
              {[['light', <Sun size={16} />, t('settings.light')], ['dark', <Moon size={16} />, t('settings.dark')]].map(([val, icon, label]) => (
                <button key={String(val)} onClick={() => theme !== val && toggleTheme()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${theme === val ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                  {icon as React.ReactNode}{String(label)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{t('settings.language')}</label>
            <div className="flex gap-3">
              {[['ar', t('settings.arabic')], ['fr', t('settings.french')]].map(([val, label]) => (
                <button key={String(val)} onClick={() => setLang(String(val) as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${lang === val ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                  <Globe size={16} />{String(label)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
