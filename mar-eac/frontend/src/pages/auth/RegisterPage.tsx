import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, CheckCircle, Building2, FolderKanban,
  Droplets, ShoppingBag, Layers, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../i18n';

// ─── Association type definitions ────────────────────────────────────────────

type AssocTypeKey = 'REGULAR' | 'PROJECTS' | 'WATER' | 'PRODUCTIVE' | 'PRODUCTIVE_WATER';

const ASSOC_TYPE_MODULES: Record<AssocTypeKey, string[]> = {
  REGULAR:          [],
  PROJECTS:         ['PROJECTS'],
  WATER:            ['WATER'],
  PRODUCTIVE:       ['PRODUCTIVE'],
  PRODUCTIVE_WATER: ['PRODUCTIVE', 'WATER'],
};

// Prices in MAD / month
const ASSOC_TYPE_PRICES: Record<AssocTypeKey, { monthly: number; setup: number }> = {
  REGULAR:          { monthly: 99,  setup: 0 },
  PROJECTS:         { monthly: 149, setup: 0 },
  WATER:            { monthly: 199, setup: 0 },
  PRODUCTIVE:       { monthly: 199, setup: 0 },
  PRODUCTIVE_WATER: { monthly: 299, setup: 0 },
};

const ASSOC_ICONS: Record<AssocTypeKey, React.ReactNode> = {
  REGULAR:          <Building2 size={22} />,
  PROJECTS:         <FolderKanban size={22} />,
  WATER:            <Droplets size={22} />,
  PRODUCTIVE:       <ShoppingBag size={22} />,
  PRODUCTIVE_WATER: <Layers size={22} />,
};

const ASSOC_COLORS: Record<AssocTypeKey, string> = {
  REGULAR:          'border-gray-300 text-gray-600 bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800',
  PROJECTS:         'border-blue-300 text-blue-600 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-900/20',
  WATER:            'border-cyan-300 text-cyan-600 bg-cyan-50 dark:border-cyan-700 dark:text-cyan-400 dark:bg-cyan-900/20',
  PRODUCTIVE:       'border-emerald-300 text-emerald-600 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-900/20',
  PRODUCTIVE_WATER: 'border-purple-300 text-purple-600 bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:bg-purple-900/20',
};

const ASSOC_SELECTED_COLORS: Record<AssocTypeKey, string> = {
  REGULAR:          'border-gray-500 ring-gray-400 bg-gray-100 dark:bg-gray-700',
  PROJECTS:         'border-blue-500 ring-blue-400 bg-blue-100 dark:bg-blue-900/40',
  WATER:            'border-cyan-500 ring-cyan-400 bg-cyan-100 dark:bg-cyan-900/40',
  PRODUCTIVE:       'border-emerald-500 ring-emerald-400 bg-emerald-100 dark:bg-emerald-900/40',
  PRODUCTIVE_WATER: 'border-purple-500 ring-purple-400 bg-purple-100 dark:bg-purple-900/40',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  const regions = (translations[lang] as any).moroccanRegions as string[];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    orgName: '', orgEmail: '', orgPhone: '', orgCity: '', orgRegion: '',
    adminName: '', adminEmail: '', password: '', confirmPassword: '',
  });
  const [assocType, setAssocType] = useState<AssocTypeKey>('REGULAR');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError(isAr ? 'كلمات المرور غير متطابقة' : 'Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, modules: ASSOC_TYPE_MODULES[assocType] });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const ASSOC_TYPES = (Object.keys(ASSOC_TYPE_MODULES) as AssocTypeKey[]);

  // ── Step indicators ──────────────────────────────────────────────────────
  const StepDot: React.FC<{ n: 1 | 2 | 3; label: string }> = ({ n, label }) => (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
        step > n ? 'bg-emerald-500 text-white' :
        step === n ? 'bg-primary-600 text-white' :
        'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
      }`}>
        {step > n ? <CheckCircle size={14} /> : n}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{label}</span>
    </div>
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
        <div className="flex items-center justify-center gap-3 mb-6">
          <StepDot n={1} label={t('auth.orgInfo')} />
          <div className={`flex-1 max-w-12 h-0.5 transition-colors ${step >= 2 ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
          <StepDot n={2} label={t('auth.adminInfo')} />
          <div className={`flex-1 max-w-12 h-0.5 transition-colors ${step >= 3 ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
          <StepDot n={3} label={t('auth.assocTypeTitle')} />
        </div>

        <div className="card p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); setStep(s => (s + 1) as any); }}>

            {/* ── Step 1: Org info ─────────────────────────────────────── */}
            {step === 1 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {t('auth.orgInfo')}
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

            {/* ── Step 2: Admin info ───────────────────────────────────── */}
            {step === 2 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {t('auth.adminInfo')}
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
              </div>
            )}

            {/* ── Step 3: Association type ─────────────────────────────── */}
            {step === 3 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {t('auth.assocTypeTitle')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('auth.assocTypeSubtitle')}</p>

                {/* Trial banner */}
                <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    {isAr
                      ? 'جميع الأنواع تشمل تجربة مجانية لمدة 15 يوماً بدون أي التزام'
                      : 'Tous les types incluent 15 jours d\'essai gratuit sans engagement'}
                  </p>
                </div>

                <div className="space-y-2">
                  {ASSOC_TYPES.map((key) => {
                    const typeLabel = (t(`auth.assocTypes.${key}.label`) as string);
                    const typeDesc  = (t(`auth.assocTypes.${key}.desc`) as string);
                    const price     = ASSOC_TYPE_PRICES[key];
                    const selected  = assocType === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAssocType(key)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-start
                          ${selected
                            ? `${ASSOC_SELECTED_COLORS[key]} ring-2 ring-offset-1 ring-current`
                            : `border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800`
                          }`}
                      >
                        {/* Icon bubble */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ASSOC_COLORS[key]}`}>
                          {ASSOC_ICONS[key]}
                        </div>
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">{typeLabel}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{typeDesc}</div>
                        </div>
                        {/* Price + radio */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <div className="text-end">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{price.monthly}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400"> {isAr ? 'د.م/شهر' : 'MAD/mois'}</span>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            selected ? 'border-primary-600 bg-primary-600' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected summary */}
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {isAr ? 'بعد التجربة المجانية:' : 'Après l\'essai gratuit :'}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {ASSOC_TYPE_PRICES[assocType].monthly} {isAr ? 'د.م / شهر' : 'MAD / mois'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {isAr ? '✓ يمكن إلغاء الاشتراك في أي وقت' : '✓ Résiliable à tout moment'}
                  </p>
                </div>
              </div>
            )}

            {/* ── Navigation buttons ───────────────────────────────────── */}
            <div className={`flex gap-3 mt-6 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(s => (s - 1) as any)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {isAr ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                  {isAr ? 'السابق' : 'Retour'}
                </button>
              )}

              {step < 3 ? (
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
