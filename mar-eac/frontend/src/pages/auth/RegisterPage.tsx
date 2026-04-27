import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, CheckCircle, Building2, FolderKanban,
  Droplets, ShoppingBag, ChevronRight, ChevronLeft,
  Bus, DatabaseBackup, MessageCircle, Shield,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../i18n';

// ─── Association types (4 packs) ─────────────────────────────────────────────

type AssocTypeKey = 'REGULAR' | 'PROJECTS' | 'WATER' | 'PRODUCTIVE';

const ASSOC_TYPE_MODULES: Record<AssocTypeKey, string[]> = {
  REGULAR:    [],
  PROJECTS:   ['PROJECTS'],
  WATER:      ['WATER'],
  PRODUCTIVE: ['PRODUCTIVE'],
};

const ASSOC_TYPE_PRICES: Record<AssocTypeKey, number> = {
  REGULAR:    50,
  PROJECTS:   100,
  WATER:      150,
  PRODUCTIVE: 200,
};

const ASSOC_TYPES: { key: AssocTypeKey; icon: React.ReactNode; color: string; selectedColor: string }[] = [
  { key: 'REGULAR',    icon: <Building2 size={26} />,    color: 'border-gray-300 text-gray-600 bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800',          selectedColor: 'border-gray-500 ring-gray-400 bg-gray-100 dark:bg-gray-700' },
  { key: 'PROJECTS',   icon: <FolderKanban size={26} />, color: 'border-blue-300 text-blue-600 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-900/20',       selectedColor: 'border-blue-500 ring-blue-400 bg-blue-100 dark:bg-blue-900/40' },
  { key: 'WATER',      icon: <Droplets size={26} />,     color: 'border-cyan-300 text-cyan-600 bg-cyan-50 dark:border-cyan-700 dark:text-cyan-400 dark:bg-cyan-900/20',       selectedColor: 'border-cyan-500 ring-cyan-400 bg-cyan-100 dark:bg-cyan-900/40' },
  { key: 'PRODUCTIVE', icon: <ShoppingBag size={26} />,  color: 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-900/20', selectedColor: 'border-emerald-500 ring-emerald-400 bg-emerald-100 dark:bg-emerald-900/40' },
];

// ─── Optional add-on features ─────────────────────────────────────────────────

type FeatureKey = 'BACKUP' | 'WHATSAPP' | 'TRANSPORT';

interface FeatureDef {
  key: FeatureKey;
  icon: React.ReactNode;
  labelAr: string;
  labelFr: string;
  descAr: string;
  descFr: string;
  color: string;
  selectedColor: string;
}

const OPTIONAL_FEATURES: FeatureDef[] = [
  {
    key: 'BACKUP',
    icon: <DatabaseBackup size={22} />,
    labelAr: 'النسخ الاحتياطي التلقائي',
    labelFr: 'Backup automatique',
    descAr: 'نسخ احتياطية يومية تلقائية لبياناتك — لا تفقد شيئاً',
    descFr: 'Sauvegardes automatiques quotidiennes — ne perdez aucune donnée',
    color: 'border-blue-200 text-blue-600 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-900/20',
    selectedColor: 'border-blue-500 ring-blue-400 bg-blue-100 dark:bg-blue-900/40',
  },
  {
    key: 'WHATSAPP',
    icon: <MessageCircle size={22} />,
    labelAr: 'خدمة الواتساب',
    labelFr: 'Service WhatsApp',
    descAr: 'إرسال إشعارات وتنبيهات تلقائية للأعضاء عبر الواتساب',
    descFr: 'Envoi automatique de notifications aux membres via WhatsApp',
    color: 'border-green-200 text-green-600 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-900/20',
    selectedColor: 'border-green-500 ring-green-400 bg-green-100 dark:bg-green-900/40',
  },
  {
    key: 'TRANSPORT',
    icon: <Bus size={22} />,
    labelAr: 'النقل المدرسي',
    labelFr: 'Transport scolaire',
    descAr: 'إدارة الحافلات والتلاميذ والاشتراكات — متاح لجميع الجمعيات',
    descFr: 'Gestion des bus, élèves et abonnements — disponible pour toutes les associations',
    color: 'border-orange-200 text-orange-600 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-900/20',
    selectedColor: 'border-orange-500 ring-orange-400 bg-orange-100 dark:bg-orange-900/40',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  const regions = (translations[lang] as any).moroccanRegions as string[];

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState({
    orgName: '', orgEmail: '', orgPhone: '', orgCity: '', orgRegion: '',
    adminName: '', adminEmail: '', password: '', confirmPassword: '',
  });
  const [assocType, setAssocType] = useState<AssocTypeKey>('REGULAR');
  const [selectedFeatures, setSelectedFeatures] = useState<Set<FeatureKey>>(new Set());
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }));

  const toggleFeature = (key: FeatureKey) => {
    setSelectedFeatures(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const buildModules = () => {
    const base = ASSOC_TYPE_MODULES[assocType];
    const extras = Array.from(selectedFeatures);
    return [...new Set([...base, ...extras])];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError(isAr ? 'كلمات المرور غير متطابقة' : 'Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, modules: buildModules() });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const next = (e: React.FormEvent) => { e.preventDefault(); setStep(s => (s + 1) as any); };
  const prev = () => setStep(s => (s - 1) as any);

  // ── Step indicator ──────────────────────────────────────────────────────────
  const STEP_LABELS = isAr
    ? ['معلومات الجمعية', 'نوع الجمعية', 'الميزات الإضافية', 'حساب المسؤول']
    : ["Infos de l'association", "Type d'association", 'Options & fonctionnalités', 'Compte administrateur'];

  const StepDot: React.FC<{ n: 1 | 2 | 3 | 4 }> = ({ n }) => (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors flex-shrink-0 ${
        step > n ? 'bg-emerald-500 text-white' :
        step === n ? 'bg-primary-600 text-white' :
        'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
      }`}>
        {step > n ? <CheckCircle size={14} /> : n}
      </div>
      <span className="text-[10px] text-gray-500 dark:text-gray-400 hidden sm:block text-center leading-tight max-w-[70px]">
        {STEP_LABELS[n - 1]}
      </span>
    </div>
  );

  const Divider: React.FC<{ active: boolean }> = ({ active }) => (
    <div className={`flex-1 h-0.5 transition-colors mt-[-12px] ${active ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4" dir={dir}>
      <div className="w-full max-w-2xl">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-white font-bold text-lg">MA</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.registerTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('auth.registerSubtitle')}</p>
          <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
            <CheckCircle size={12} />{t('auth.trialBadge')}
          </span>
        </div>

        {/* Step progress */}
        <div className="flex items-start justify-center gap-1 mb-6 px-2">
          <StepDot n={1} />
          <Divider active={step >= 2} />
          <StepDot n={2} />
          <Divider active={step >= 3} />
          <StepDot n={3} />
          <Divider active={step >= 4} />
          <StepDot n={4} />
        </div>

        <div className="card p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={step === 4 ? handleSubmit : next}>

            {/* ── Step 1: Org info ─────────────────────────────────────── */}
            {step === 1 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {isAr ? 'معلومات الجمعية' : "Informations de l'association"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">{t('auth.orgName')} *</label>
                    <input className="input" required value={form.orgName} onChange={(e) => set('orgName', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">{t('auth.orgEmail')} *</label>
                    <input className="input" type="email" required dir="ltr" value={form.orgEmail} onChange={(e) => set('orgEmail', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">{t('auth.orgPhone')}</label>
                    <input className="input" type="tel" dir="ltr" value={form.orgPhone} onChange={(e) => set('orgPhone', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">{t('auth.orgCity')}</label>
                    <input className="input" value={form.orgCity} onChange={(e) => set('orgCity', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">{t('auth.orgRegion')}</label>
                    <select className="input" value={form.orgRegion} onChange={(e) => set('orgRegion', e.target.value)}>
                      <option value="">{t('common.selectOption')}</option>
                      {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Association type ──────────────────────────────── */}
            {step === 2 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {isAr ? 'اختر نوع جمعيتك' : "Choisissez le type de votre association"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  {isAr
                    ? 'جميع الأنواع تشمل إدارة الأعضاء والمالية والوثائق والتقارير'
                    : 'Tous les types incluent la gestion des membres, finances, documents et rapports'}
                </p>

                <div className="space-y-3">
                  {ASSOC_TYPES.map(({ key, icon, color, selectedColor }) => {
                    const selected = assocType === key;
                    const labelKey = `auth.assocTypes.${key}.label`;
                    const descKey  = `auth.assocTypes.${key}.desc`;
                    const price    = ASSOC_TYPE_PRICES[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAssocType(key)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-start
                          ${selected
                            ? `${selectedColor} ring-2 ring-offset-1 ring-current`
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                          }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 dark:text-white text-sm">{t(labelKey) as string}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{t(descKey) as string}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="text-end">
                            <span className="text-lg font-extrabold text-gray-900 dark:text-white">{price}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400"> {isAr ? 'د.م/سنة' : 'MAD/an'}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            selected ? 'border-primary-600 bg-primary-600' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Trial banner */}
                <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    {isAr
                      ? 'تجربة مجانية 15 يوماً — بعدها اشتراك 3 سنوات مع تنبيه تجديد قبل شهر'
                      : "Essai gratuit 15 jours — puis abonnement 3 ans avec rappel de renouvellement 1 mois avant"}
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 3: Optional features ────────────────────────────── */}
            {step === 3 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {isAr ? 'الميزات الإضافية' : 'Options & fonctionnalités'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  {isAr
                    ? 'اختر الخدمات الإضافية التي تريدها — يمكن تغييرها لاحقاً من الإعدادات'
                    : 'Choisissez les services supplémentaires — modifiables plus tard dans les paramètres'}
                </p>

                <div className="space-y-3">
                  {OPTIONAL_FEATURES.map((feat) => {
                    const selected = selectedFeatures.has(feat.key);
                    return (
                      <button
                        key={feat.key}
                        type="button"
                        onClick={() => toggleFeature(feat.key)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-start
                          ${selected
                            ? `${feat.selectedColor} ring-2 ring-offset-1 ring-current`
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                          }`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${feat.color}`}>
                          {feat.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">
                            {isAr ? feat.labelAr : feat.labelFr}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            {isAr ? feat.descAr : feat.descFr}
                          </div>
                        </div>
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected ? 'border-primary-600 bg-primary-600' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selected && <CheckCircle size={13} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {isAr ? 'ملخص اختياراتك:' : 'Résumé de vos choix :'}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium">
                      {isAr ? t(`auth.assocTypes.${assocType}.label`) as string : t(`auth.assocTypes.${assocType}.label`) as string}
                    </span>
                    {Array.from(selectedFeatures).map(fk => {
                      const f = OPTIONAL_FEATURES.find(x => x.key === fk)!;
                      return (
                        <span key={fk} className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                          {isAr ? f.labelAr : f.labelFr}
                        </span>
                      );
                    })}
                    {selectedFeatures.size === 0 && (
                      <span className="text-xs text-gray-400">
                        {isAr ? 'لا توجد ميزات إضافية' : 'Aucune option supplémentaire'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <Shield size={13} className="text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {isAr
                      ? 'يمكن تفعيل أو تعطيل هذه الخدمات في أي وقت من إعدادات جمعيتك'
                      : 'Ces services peuvent être activés ou désactivés à tout moment depuis vos paramètres'}
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 4: Admin credentials ─────────────────────────────── */}
            {step === 4 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {isAr ? 'معلومات حساب المسؤول' : 'Informations du compte administrateur'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">{t('auth.adminName')} *</label>
                    <input className="input" required value={form.adminName} onChange={(e) => set('adminName', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">{t('auth.adminEmail')} *</label>
                    <input className="input" type="email" required dir="ltr" value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">{t('auth.password')} *</label>
                    <div className="relative">
                      <input
                        className="input pe-10" type={showPwd ? 'text' : 'password'}
                        required minLength={6} value={form.password}
                        onChange={(e) => set('password', e.target.value)}
                      />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400">
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2 sm:w-1/2">
                    <label className="label">{t('auth.confirmPassword')} *</label>
                    <input
                      className="input" type="password" required
                      value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)}
                    />
                  </div>
                </div>

                {/* Final summary */}
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-2">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {isAr ? '📋 ملخص التسجيل:' : '📋 Récapitulatif :'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium">
                      {t(`auth.assocTypes.${assocType}.label`) as string} — {ASSOC_TYPE_PRICES[assocType]} {isAr ? 'د.م/سنة' : 'MAD/an'}
                    </span>
                    {Array.from(selectedFeatures).map(fk => {
                      const f = OPTIONAL_FEATURES.find(x => x.key === fk)!;
                      return (
                        <span key={fk} className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                          ✓ {isAr ? f.labelAr : f.labelFr}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400">
                    {isAr
                      ? '⏳ تجربة مجانية 15 يوم · اشتراك 3 سنوات · تنبيه تجديد قبل شهر'
                      : "⏳ Essai gratuit 15 jours · Abonnement 3 ans · Rappel renouvellement 1 mois avant"}
                  </p>
                </div>
              </div>
            )}

            {/* ── Navigation ───────────────────────────────────────────── */}
            <div className={`flex gap-3 mt-6 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={prev}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {isAr ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                  {isAr ? 'السابق' : 'Retour'}
                </button>
              )}
              {step < 4 ? (
                <button type="submit" className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                  {isAr ? 'التالي' : 'Suivant'}
                  {isAr ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
                </button>
              ) : (
                <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                  {loading ? t('common.loading') : t('auth.registerBtn')}
                  <CheckCircle size={15} />
                </button>
              )}
            </div>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">{t('auth.loginBtn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
