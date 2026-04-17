import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AlertTriangle, X } from 'lucide-react';
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
  const isTrial = sub?.status === 'TRIAL';
  const trialDays = isTrial && (organization as any)?.trialEndsAt
    ? getTrialDaysRemaining((organization as any).trialEndsAt)
    : null;
  const urgent = trialDays !== null && trialDays <= 5;
  const showTrialBanner = isTrial && trialDays !== null && trialDays > 0 && !bannerDismissed;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Trial expiry banner */}
        {showTrialBanner && (
          <div className={`border-b px-4 py-2 flex items-center gap-3 ${urgent
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
            <AlertTriangle size={16} className={`flex-shrink-0 ${urgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
            <p className={`text-sm flex-1 ${urgent ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {lang === 'ar'
                ? <>تنتهي الفترة التجريبية خلال <strong>{trialDays} {trialDays === 1 ? 'يوم' : 'أيام'}</strong>. اشترك الآن للاستمرار.</>
                : <>{t('dashboard.trialEnds')} <strong>{trialDays} {t('dashboard.days')}</strong>. Abonnez-vous pour continuer.</>
              }
            </p>
            <button onClick={() => setBannerDismissed(true)} className={`p-1 ${urgent ? 'text-red-600 hover:text-red-800' : 'text-amber-600 hover:text-amber-800'}`}>
              <X size={16} />
            </button>
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
