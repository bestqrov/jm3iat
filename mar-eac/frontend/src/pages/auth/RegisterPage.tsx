import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, CheckCircle, Building2, FolderKanban,
  Droplets, ShoppingBag, ChevronRight, ChevronLeft,
  Bus, DatabaseBackup, MessageCircle, Shield, Trophy,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../i18n';

// ─── Selectable modules ────────────────────────────────────────────────────────

type ModuleKey = 'PROJECTS' | 'WATER' | 'TRANSPORT' | 'SPORTS' | 'PRODUCTIVE';

interface ModuleDef {
  key: ModuleKey;
  icon: React.ReactNode;
  labelAr: string;
  labelFr: string;
  descAr: string;
  descFr: string;
  color: string;
  selectedColor: string;
}

const MODULES: ModuleDef[] = [
  {
    key: 'PROJECTS',
    icon: <FolderKanban size={24} />,
    labelAr: 'المشاريع والطلبات',
    labelFr: 'Projets & demandes',
    descAr: 'تتبع المشاريع، الطلبات والمراحل من البداية للنهاية',
    descFr: 'Suivi des projets, demandes et étapes du début à la fin',
    color: 'border-blue-200 text-blue-600 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-900/20',
    selectedColor: 'border-blue-500 ring-blue-400 bg-blue-100 dark:bg-blue-900/40',
  },
  {
    key: 'WATER',
    icon: <Droplets size={24} />,
    labelAr: 'إدارة الماء',
    labelFr: "Gestion de l'eau",
    descAr: 'إدارة شبكة المياه، قراءة العدادات وفواتير الماء',
    descFr: "Réseau d'eau, relevés de compteurs et facturation",
    color: 'border-cyan-200 text-cyan-600 bg-cyan-50 dark:border-cyan-700 dark:text-cyan-400 dark:bg-cyan-900/20',
    selectedColor: 'border-cyan-500 ring-cyan-400 bg-cyan-100 dark:bg-cyan-900/40',
  },
  {
    key: 'TRANSPORT',
    icon: <Bus size={24} />,
    labelAr: 'النقل المدرسي',
    labelFr: 'Transport scolaire',
    descAr: 'إدارة الحافلات، التلاميذ، المسارات والاشتراكات',
    descFr: 'Gestion des bus, élèves, trajets et abonnements',
    color: 'border-orange-200 text-orange-600 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-900/20',
    selectedColor: 'border-orange-500 ring-orange-400 bg-orange-100 dark:bg-orange-900/40',
  },
  {
    key: 'SPORTS',
    icon: <Trophy size={24} />,
    labelAr: 'الرياضة والأنشطة',
    labelFr: 'Sports & activités',
    descAr: 'تسيير الأنشطة الرياضية، البطولات والمنخرطين',
    descFr: 'Gestion des activités sportives, tournois et adhérents',
    color: 'border-yellow-200 text-yellow-600 bg-yellow-50 dark:border-yellow-700 dark:text-yellow-400 dark:bg-yellow-900/20',
    selectedColor: 'border-yellow-500 ring-yellow-400 bg-yellow-100 dark:bg-yellow-900/40',
  },
  {
    key: 'PRODUCTIVE',
    icon: <ShoppingBag size={24} />,
    labelAr: 'الإنتاج والمبيعات',
    labelFr: 'Production & ventes',
    descAr: 'إدارة الإنتاج، المخزون، المبيعات والعملاء',
    descFr: 'Gestion de production, stocks, ventes et clients',
    color: 'border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-900/20',
    selectedColor: 'border-emerald-500 ring-emerald-400 bg-emerald-100 dark:bg-emerald-900/40',
  },
];

// ─── Optional add-ons ─────────────────────────────────────────────────────────

type AddonKey = 'BACKUP' | 'WHATSAPP' | 'SMART_METER';

interface AddonDef {
  key: AddonKey;
  icon: React.ReactNode;
  labelAr: string;
  labelFr: string;
  descAr: string;
  descFr: string;
  color: string;
  selectedColor: string;
}

const ADDONS: AddonDef[] = [
  {
    key: 'BACKUP',
    icon: <DatabaseBackup size={22} />,
    labelAr: 'النسخ الاحتياطي التلقائي',
    labelFr: 'Backup automatique',
    descAr: 'نسخ احتياطية يومية تلقائية لجميع بياناتك',
    descFr: 'Sauvegardes automatiques quotidiennes de vos données',
    color: 'border-blue-200 text-blue-600 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-900/20',
    selectedColor: 'border-blue-500 ring-blue-400 bg-blue-100 dark:bg-blue-900/40',
  },
  {
    key: 'WHATSAPP',
    icon: <MessageCircle size={22} />,
    labelAr: 'خدمة الواتساب',
    labelFr: 'Service WhatsApp',
    descAr: 'إرسال إشعارات وتنبيهات تلقائية للأعضاء عبر الواتساب',
    descFr: 'Notifications automatiques aux membres via WhatsApp',
    color: 'border-green-200 text-green-600 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-900/20',
    selectedColor: 'border-green-500 ring-green-400 bg-green-100 dark:bg-green-900/40',
  },
  {
    key: 'SMART_METER',
    icon: <span className="text-xl">📷</span>,
    labelAr: 'قراءة العدادات بالكاميرا',
    labelFr: 'Lecture compteurs par caméra (IA)',
    descAr: 'تصوير العداد بكاميرا الهاتف — الذكاء الاصطناعي يقرأ القيمة تلقائياً ويحسب الاستهلاك',
    descFr: 'Photographiez le compteur avec votre mobile — l\'IA lit la valeur et calcule la consommation automatiquement',
    color: 'border-violet-200 text-violet-600 bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:bg-violet-900/20',
    selectedColor: 'border-violet-500 ring-violet-400 bg-violet-100 dark:bg-violet-900/40',
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
    bureauCreationDate: '',
    adminName: '', adminEmail: '', password: '', confirmPassword: '',
  });
  const [selectedModules, setSelectedModules] = useState<Set<ModuleKey>>(new Set());
  const [selectedAddons, setSelectedAddons] = useState<Set<AddonKey>>(new Set());
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }));

  const toggleModule = (key: ModuleKey) =>
    setSelectedModules(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const toggleAddon = (key: AddonKey) =>
    setSelectedAddons(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const buildModules = () => [...Array.from(selectedModules), ...Array.from(selectedAddons)];

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

  // ── Step labels ─────────────────────────────────────────────────────────────
  const STEP_LABELS = isAr
    ? ['معلومات الجمعية', 'أنشطة جمعيتك', 'خدمات إضافية', 'حساب المسؤول']
    : ["Infos de l'asso", 'Activités', 'Options', 'Administrateur'];

  const StepDot: React.FC<{ n: 1 | 2 | 3 | 4 }> = ({ n }) => (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
        step > n ? 'bg-emerald-500 text-white' :
        step === n ? 'bg-primary-600 text-white' :
        'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
      }`}>
        {step > n ? <CheckCircle size={14} /> : n}
      </div>
      <span className="text-[10px] text-gray-500 dark:text-gray-400 hidden sm:block text-center leading-tight max-w-[64px]">
        {STEP_LABELS[n - 1]}
      </span>
    </div>
  );

  const Divider = ({ active }: { active: boolean }) => (
    <div className={`flex-1 h-0.5 transition-colors mt-[-12px] ${active ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
  );

  // ── Selection summary chips ─────────────────────────────────────────────────
  const SummaryChips = () => (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {/* Base always included */}
      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
        {isAr ? '✓ أعضاء + مالية + وثائق' : '✓ Membres + finances + documents'}
      </span>
      {Array.from(selectedModules).map(mk => {
        const m = MODULES.find(x => x.key === mk)!;
        return (
          <span key={mk} className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium">
            ✓ {isAr ? m.labelAr : m.labelFr}
          </span>
        );
      })}
      {Array.from(selectedAddons).map(ak => {
        const a = ADDONS.find(x => x.key === ak)!;
        return (
          <span key={ak} className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
            ✓ {isAr ? a.labelAr : a.labelFr}
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4" dir={dir}>
      <div className="w-full max-w-2xl">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Building2 size={26} className="text-white" />
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
                  <div className="sm:col-span-2">
                    <label className="label">
                      {isAr ? 'تاريخ إنشاء المكتب (للتذكير بالتجديد)' : 'Date de création du bureau (pour rappel de renouvellement)'}
                    </label>
                    <input
                      className="input"
                      type="date"
                      dir="ltr"
                      value={form.bureauCreationDate}
                      onChange={(e) => set('bureauCreationDate', e.target.value)}
                    />
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {isAr
                        ? 'ستتلقى تذكيرات 30 يوماً قبل انتهاء صلاحية المكتب (3 سنوات)'
                        : 'Vous recevrez des rappels 30 jours avant l\'expiration du bureau (3 ans)'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Module selection ──────────────────────────────── */}
            {step === 2 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {isAr ? 'ما الذي تديره جمعيتك؟' : 'Que gère votre association ?'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {isAr
                    ? 'الأعضاء والمالية والوثائق مدرجة دائماً — اختر الوحدات الإضافية (واحدة أو أكثر أو كلها)'
                    : 'Membres, finances et documents sont toujours inclus — choisissez les modules supplémentaires'}
                </p>

                {/* Always-included base */}
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl">
                  <Building2 size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {isAr
                      ? 'الأساس المدرج دائماً: إدارة الأعضاء · المالية والفواتير · الاجتماعات والمحاضر · الوثائق والتقارير'
                      : 'Toujours inclus : Gestion des membres · Finances & factures · Réunions & PV · Documents & rapports'}
                  </span>
                </div>

                {/* Module grid */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {MODULES.map((mod) => {
                    const selected = selectedModules.has(mod.key);
                    return (
                      <button
                        key={mod.key}
                        type="button"
                        onClick={() => toggleModule(mod.key)}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-start w-full
                          ${selected
                            ? `${mod.selectedColor} ring-2 ring-offset-1 ring-current`
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${mod.color}`}>
                          {mod.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">
                            {isAr ? mod.labelAr : mod.labelFr}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            {isAr ? mod.descAr : mod.descFr}
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          selected ? 'border-primary-600 bg-primary-600' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selected && <CheckCircle size={13} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Select all / clear */}
                <div className={`flex gap-3 mt-3 text-xs ${isAr ? 'flex-row-reverse' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedModules(new Set(MODULES.map(m => m.key)))}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {isAr ? 'تحديد الكل' : 'Tout sélectionner'}
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedModules(new Set())}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {isAr ? 'إلغاء الكل' : 'Tout désélectionner'}
                  </button>
                  <span className="text-gray-400 dark:text-gray-500 ms-auto">
                    {selectedModules.size} {isAr ? 'مختار' : 'sélectionné(s)'}
                  </span>
                </div>
              </div>
            )}

            {/* ── Step 3: Add-ons ───────────────────────────────────────── */}
            {step === 3 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {isAr ? 'خدمات إضافية' : 'Services supplémentaires'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  {isAr
                    ? 'اختر الخدمات التي تريدها — يمكن تغييرها في أي وقت من الإعدادات'
                    : 'Choisissez les services supplémentaires — modifiables à tout moment'}
                </p>

                <div className="space-y-3">
                  {ADDONS.map((addon) => {
                    const selected = selectedAddons.has(addon.key);
                    return (
                      <button
                        key={addon.key}
                        type="button"
                        onClick={() => toggleAddon(addon.key)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-start
                          ${selected
                            ? `${addon.selectedColor} ring-2 ring-offset-1 ring-current`
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                          }`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${addon.color}`}>
                          {addon.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">
                            {isAr ? addon.labelAr : addon.labelFr}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            {isAr ? addon.descAr : addon.descFr}
                          </div>
                        </div>
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
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {isAr ? 'ملخص جمعيتك حتى الآن:' : 'Récapitulatif de votre association :'}
                  </p>
                  <SummaryChips />
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
                  {isAr ? 'معلومات حساب المسؤول' : 'Compte administrateur'}
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

                {/* Final recap */}
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                    {isAr ? '📋 ملخص التسجيل النهائي:' : '📋 Récapitulatif final :'}
                  </p>
                  <SummaryChips />
                  <p className="text-xs text-gray-400 mt-2">
                    {isAr
                      ? '⏳ تجربة مجانية 15 يوم · اشتراك 3 سنوات · تنبيه تجديد قبل شهر من الانتهاء'
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
