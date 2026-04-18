import React, { useState } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AlertTriangle, X, Zap, Clock } from 'lucide-react';
import { getTrialDaysRemaining } from '../../lib/utils';

export const Layout: React.FC = () => {
  const { isAuthenticated, isLoading, organization } = useAuth();
  const { t, lang } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const sub = (organization as any)?.subscription;
  const isTrial   = sub?.status === 'TRIAL';
  const isExpired = sub?.status === 'EXPIRED';
  const trialDays = (isTrial || isExpired) && (organization as any)?.trialEndsAt
    ? getTrialDaysRemaining((organization as any).trialEndsAt)
    : null;
  const urgent = isTrial && trialDays !== null && trialDays <= 5;
  const showTrialBanner   = isTrial   && trialDays !== null && trialDays > 0 && !bannerDismissed;
  const showExpiredBanner = isExpired || (isTrial && trialDays === 0);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Trial active — dismissible banner */}
        {showTrialBanner && (
          <div className={`border-b px-4 py-2 flex items-center gap-3 ${urgent
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
            <AlertTriangle size={16} className={`flex-shrink-0 ${urgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
            <p className={`text-sm flex-1 ${urgent ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {lang === 'ar'
                ? <>تنتهي الفترة التجريبية خلال <strong>{trialDays} {trialDays === 1 ? 'يوم' : 'أيام'}</strong>. <Link to="/settings" className="underline font-semibold">اشترك الآن</Link> للاستمرار.</>
                : <>{t('dashboard.trialEnds')} <strong>{trialDays} {t('dashboard.days')}</strong>. <Link to="/settings" className="underline font-semibold">Abonnez-vous</Link> pour continuer.</>}
            </p>
            <button onClick={() => setBannerDismissed(true)} className={`p-1 ${urgent ? 'text-red-600 hover:text-red-800' : 'text-amber-600 hover:text-amber-800'}`}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Trial expired — non-dismissible blocking banner */}
        {showExpiredBanner && (
          <div className="border-b border-red-300 dark:border-red-700 bg-red-600 dark:bg-red-900/60 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500 dark:bg-red-800 flex items-center justify-center flex-shrink-0">
              <Clock size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">
                {lang === 'ar' ? '⛔ انتهت الفترة التجريبية' : '⛔ Période d\'essai terminée'}
              </p>
              <p className="text-xs text-red-100 dark:text-red-200 mt-0.5">
                {lang === 'ar'
                  ? 'لقد انتهت فترتك التجريبية المجانية. اشترك الآن لمواصلة استخدام المنصة والوصول إلى بياناتك.'
                  : 'Votre période d\'essai gratuite est terminée. Abonnez-vous pour continuer à utiliser la plateforme et accéder à vos données.'}
              </p>
            </div>
            <Link
              to="/settings"
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-100 text-red-600 dark:text-red-700 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors flex-shrink-0 whitespace-nowrap"
            >
              <Zap size={14} />
              {lang === 'ar' ? 'اشترك الآن' : 'S\'abonner'}
            </Link>
          </div>
        )}

        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
