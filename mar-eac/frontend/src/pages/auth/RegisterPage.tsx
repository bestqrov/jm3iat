import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../i18n';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const regions = (translations[lang] as any).moroccanRegions as string[];

  const [form, setForm] = useState({
    orgName: '', orgEmail: '', orgPhone: '', orgCity: '', orgRegion: '',
    adminName: '', adminEmail: '', password: '', confirmPassword: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError(lang === 'ar' ? 'كلمات المرور غير متطابقة' : 'Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
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

        <div className="card p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Org info */}
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
                  <input className="input" type="email" required value={form.orgEmail} onChange={(e) => set('orgEmail', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('auth.orgPhone')}</label>
                  <input className="input" type="tel" value={form.orgPhone} onChange={(e) => set('orgPhone', e.target.value)} />
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

            {/* Admin info */}
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
                  <input className="input" type="email" required value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} />
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

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? t('common.loading') : t('auth.registerBtn')}
            </button>
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
