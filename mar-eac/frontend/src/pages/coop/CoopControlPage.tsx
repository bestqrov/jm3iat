import React, { useState } from 'react';
import { LayoutDashboard, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

const CONTROL_URL = 'https://mareac.digima.cloud/coop';

export const CoopControlPage: React.FC = () => {
  const { lang } = useLanguage();
  const { organization } = useAuth();
  const ar = lang === 'ar';
  const [key, setKey] = useState(0);
  const [errored, setErrored] = useState(false);

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 dark:bg-gray-900" dir={ar ? 'rtl' : 'ltr'}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
          <LayoutDashboard size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 dark:text-white text-sm">{ar ? 'لوحة التحكم' : 'Tableau de bord'}</h1>
          <p className="text-xs text-gray-400 truncate">{organization?.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { setErrored(false); setKey(k => k + 1); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw size={13} />{ar ? 'تحديث' : 'Actualiser'}
          </button>
          <a
            href={CONTROL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <ExternalLink size={13} />{ar ? 'فتح في نافذة جديدة' : 'Ouvrir dans un onglet'}
          </a>
        </div>
      </div>

      {/* iframe */}
      <div className="flex-1 relative">
        {errored ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 px-6">
            <AlertCircle size={48} className="opacity-30" />
            <div className="text-center">
              <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">
                {ar ? 'تعذّر تحميل الصفحة داخل التطبيق' : 'Impossible de charger la page dans l\'application'}
              </p>
              <p className="text-sm text-gray-400 mb-4">
                {ar ? 'قد يكون الموقع يمنع التضمين. استخدم زر الفتح في نافذة جديدة.' : 'Le site empêche peut-être l\'intégration. Utilisez le bouton pour ouvrir dans un nouvel onglet.'}
              </p>
              <a
                href={CONTROL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700"
              >
                <ExternalLink size={15} />{ar ? 'فتح في نافذة جديدة' : 'Ouvrir dans un onglet'}
              </a>
            </div>
          </div>
        ) : (
          <iframe
            key={key}
            src={CONTROL_URL}
            className="w-full h-full border-0"
            style={{ minHeight: 'calc(100vh - 56px)' }}
            title="لوحة التحكم"
            onError={() => setErrored(true)}
            allow="fullscreen"
          />
        )}
      </div>
    </div>
  );
};
