import React, { useState, useRef } from 'react';
import { Settings, Building2, User, CreditCard, Sun, Moon, Globe, CalendarDays, Activity, BookOpen, Landmark, Mail, Zap, CheckCircle2, ArrowUpCircle, Camera } from 'lucide-react';

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
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { authApi } from '../../lib/api';
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

  const showSuccess = (key: string) => {
    setSuccess(key);
    setError(null);
    setTimeout(() => setSuccess(null), 2500);
  };

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

  const handleUpgrade = async (plan: string) => {
    if (!window.confirm(
      lang === 'ar'
        ? `هل تريد الترقية إلى الباقة ${plan}؟ سيتم تفعيل الاشتراك لمدة سنة.`
        : `Activer le plan ${plan} pour 1 an ?`
    )) return;
    setUpgradingSub(true);
    try {
      await authApi.upgradeSubscription(plan);
      await refreshUser();
      showSuccess('sub');
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

  const sub = org?.subscription;
  const planBadge: Record<string, string> = { BASIC: 'badge-gray', STANDARD: 'badge-blue', PREMIUM: 'badge-purple' };
  const statusBadge: Record<string, string> = { TRIAL: 'badge-yellow', ACTIVE: 'badge-green', EXPIRED: 'badge-red', CANCELLED: 'badge-red' };

  const SaveButton = ({ key: k, onClick }: { key: string; onClick: () => void }) => (
    <button onClick={onClick} disabled={saving === k} className="btn-primary">
      {saving === k ? t('common.loading') : t('common.save')}
      {success === k && <span className="ms-1 text-emerald-300">✓</span>}
    </button>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="page-title">{t('settings.title')}</h2>

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

      {/* ── 3. Association Info ── */}
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
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
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

        {/* Current status bar */}
        {sub && (
          <div className="flex flex-wrap items-center gap-3 mb-5 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {lang === 'ar' ? 'الباقة الحالية:' : 'Plan actuel :'}
              </span>
              <span className={planBadge[sub.plan]}>{t(`settings.plans.${sub.plan}`)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={statusBadge[sub.status]}>{t(`subscription.${sub.status.toLowerCase()}`)}</span>
            </div>
            {sub.expiresAt && (
              <div className="text-xs text-gray-400">
                {lang === 'ar' ? 'تنتهي: ' : 'Expire le : '}{formatDate(sub.expiresAt, lang)}
              </div>
            )}
            {success === 'sub' && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 size={13} />{lang === 'ar' ? 'تم التفعيل' : 'Activé avec succès'}
              </span>
            )}
          </div>
        )}

        {/* Plan cards */}
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
                { icon: '📊', label: lang === 'ar' ? 'التقارير' : 'Rapports' },
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
                { icon: '🏗️', label: lang === 'ar' ? 'المشاريع والتمويل' : 'Projets & financement' },
                { icon: '🔔', label: lang === 'ar' ? 'التذكيرات الذكية' : 'Rappels intelligents' },
              ],
            },
          ].map(({ key, color, headerBg, price, features }) => {
            const isCurrent = sub?.plan === key && sub?.status === 'ACTIVE';
            const isTrial = sub?.status === 'TRIAL';
            const PLAN_LEVELS: Record<string, number> = { BASIC: 1, STANDARD: 2, PREMIUM: 3 };
            const isUpgrade = PLAN_LEVELS[key] > PLAN_LEVELS[sub?.plan || 'BASIC'] || isTrial;
            const isDowngrade = PLAN_LEVELS[key] < PLAN_LEVELS[sub?.plan || 'BASIC'] && !isTrial;

            return (
              <div key={key} className={`rounded-xl border-2 overflow-hidden flex flex-col ${isCurrent ? 'border-emerald-500 shadow-lg' : color}`}>
                {/* Header */}
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
                  </div>
                  <div className="text-lg font-bold text-primary-600 dark:text-primary-400">{price}</div>
                </div>

                {/* Features */}
                <div className="p-4 flex-1 space-y-2">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span>{f.icon}</span>{f.label}
                    </div>
                  ))}
                </div>

                {/* Action */}
                <div className="p-4 pt-0">
                  {isCurrent ? (
                    <div className="w-full text-center text-sm text-emerald-600 dark:text-emerald-400 font-medium py-2">
                      {lang === 'ar' ? '✓ مفعّل' : '✓ Plan actuel'}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(key)}
                      disabled={upgradingSub}
                      className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isUpgrade
                          ? 'bg-primary-600 hover:bg-primary-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <ArrowUpCircle size={14} />
                      {upgradingSub
                        ? (lang === 'ar' ? 'جاري...' : 'En cours...')
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

      {/* ── 6. Appearance ── */}
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
