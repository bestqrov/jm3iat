import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Globe, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status) {
        setError(msg || `Server error (${status})`);
      } else {
        setError('Cannot reach server. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setError('');
    setLoading(true);
    setEmail(demoEmail);
    setPassword(demoPassword);
    try {
      await login(demoEmail, demoPassword);
      navigate('/dashboard');
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status) {
        setError(msg || `Server error (${status})`);
      } else {
        setError('Cannot reach server. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      {/* Top controls */}
      <div className="fixed top-4 end-4 flex gap-2">
        <button
          onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
        >
          <Globe size={14} />{lang === 'ar' ? 'FR' : 'عر'}
        </button>
        <button
          onClick={toggleTheme}
          className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-xl">MA</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('appName')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('appTagline')}</p>
        </div>

        {/* Form */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('auth.loginTitle')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('auth.loginSubtitle')}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="example@assoc.ma"
              />
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pe-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? t('common.loading') : t('auth.loginBtn')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              {t('auth.registerBtn')}
            </Link>
          </p>
        </div>

        {/* Demo quick login */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 space-y-2">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Demo — دخول سريع:</p>
          <button
            onClick={() => handleDemoLogin('admin@example.ma', 'Admin@123')}
            disabled={loading}
            className="w-full text-xs px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Admin — admin@example.ma
          </button>
          <button
            onClick={() => handleDemoLogin('superadmin@mareac.ma', 'SuperAdmin@123')}
            disabled={loading}
            className="w-full text-xs px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Super Admin — superadmin@mareac.ma
          </button>
        </div>
      </div>
    </div>
  );
};
