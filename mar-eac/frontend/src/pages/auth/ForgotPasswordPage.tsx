import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, KeyRound, Copy, Check, MessageCircle, Globe, Sun, Moon } from 'lucide-react';
import { authApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export const ForgotPasswordPage: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ tempPassword: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const ar = lang === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || (ar ? 'حدث خطأ' : 'Une erreur est survenue'));
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    if (result) {
      navigator.clipboard.writeText(result.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappMsg = result
    ? encodeURIComponent(
        ar
          ? `مرحباً، كلمة المرور المؤقتة لحسابي (${email}) هي: ${result.tempPassword} — يرجى تغييرها بعد الدخول.`
          : `Bonjour, mon mot de passe temporaire pour le compte (${email}) est : ${result.tempPassword} — merci de le changer après connexion.`
      )
    : '';

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
        </div>

        <div className="card p-6">
          <Link to="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-5">
            <ArrowLeft size={15} />{ar ? 'العودة لتسجيل الدخول' : 'Retour à la connexion'}
          </Link>

          {!result ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <KeyRound size={20} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {ar ? 'نسيت كلمة المرور؟' : 'Mot de passe oublié ?'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {ar ? 'أدخل بريدك الإلكتروني لإعادة التعيين' : 'Entrez votre email pour réinitialiser'}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">
                    {ar ? 'البريد الإلكتروني' : 'Adresse email'}
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      className="input ps-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="example@assoc.ma"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading
                    ? (ar ? 'جاري...' : 'En cours...')
                    : (ar ? 'إعادة تعيين كلمة المرور' : 'Réinitialiser le mot de passe')}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-5">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={28} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {ar ? 'تم إعادة التعيين ✓' : 'Réinitialisé avec succès ✓'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {ar ? `مرحباً ${result.name}` : `Bonjour ${result.name}`}
                </p>
              </div>

              {/* Temp password box */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-2">
                  {ar ? 'كلمة المرور المؤقتة' : 'Mot de passe temporaire'}
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex-1 font-mono text-xl font-bold tracking-widest text-gray-900 dark:text-white">
                    {result.tempPassword}
                  </span>
                  <button
                    onClick={copyPassword}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copied ? (ar ? 'تم' : 'Copié') : (ar ? 'نسخ' : 'Copier')}
                  </button>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  {ar ? '⚠️ غيّر كلمة المرور بعد الدخول مباشرة' : '⚠️ Changez ce mot de passe après connexion'}
                </p>
              </div>

              {/* Recovery options */}
              <div className="space-y-3">
                {/* Login button */}
                <Link to="/login" className="btn-primary w-full justify-center py-2.5">
                  {ar ? 'تسجيل الدخول الآن' : 'Se connecter maintenant'}
                </Link>

                {/* WhatsApp share */}
                <a
                  href={`https://wa.me/?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium text-sm transition-colors"
                >
                  <MessageCircle size={18} />
                  {ar ? 'إرسال كلمة المرور عبر واتساب' : 'Envoyer via WhatsApp'}
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
