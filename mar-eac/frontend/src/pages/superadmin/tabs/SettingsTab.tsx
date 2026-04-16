import React, { useEffect, useState } from 'react';
import { Save, Settings, CreditCard, Link2, Bell, CheckCircle } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';

interface SettingValue { value: string; category: string }
type Settings = Record<string, SettingValue>;

const CATEGORIES = ['GENERAL', 'BILLING', 'INTEGRATIONS', 'NOTIFICATIONS'] as const;

const CAT_ICONS: Record<string, React.ReactNode> = {
  GENERAL: <Settings size={15} />,
  BILLING: <CreditCard size={15} />,
  INTEGRATIONS: <Link2 size={15} />,
  NOTIFICATIONS: <Bell size={15} />,
};

export const SettingsTab: React.FC = () => {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const se = (k: string) => t(`sa.settings.${k}`);
  const sh = (k: string) => t(`sa.shared.${k}`);

  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('GENERAL');
  const [form, setForm] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await superadminApi.getPlatformSettings();
      setSettings(res.data);
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.data as Settings)) {
        initial[k] = v.value;
      }
      setForm(initial);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await superadminApi.updatePlatformSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const catLabel = (cat: string) => {
    if (isAr) {
      return { GENERAL: 'عام', BILLING: 'الفوترة', INTEGRATIONS: 'التكاملات', NOTIFICATIONS: 'الإشعارات' }[cat] || cat;
    }
    return { GENERAL: 'Général', BILLING: 'Facturation', INTEGRATIONS: 'Intégrations', NOTIFICATIONS: 'Notifications' }[cat] || cat;
  };

  const settingsByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = Object.entries(settings).filter(([, v]) => v.category === cat);
    return acc;
  }, {} as Record<string, [string, SettingValue][]>);

  const FIELD_CONFIG: Record<string, { label: string; labelAr: string; type: string; placeholder?: string }> = {
    platform_name:       { label: 'Nom de la plateforme', labelAr: 'اسم المنصة', type: 'text' },
    trial_duration_days: { label: 'Durée d\'essai (jours)', labelAr: 'مدة التجربة (أيام)', type: 'number' },
    default_currency:    { label: 'Devise par défaut', labelAr: 'العملة الافتراضية', type: 'text', placeholder: 'MAD' },
    support_email:       { label: 'Email de support', labelAr: 'بريد الدعم', type: 'email' },
    whatsapp_api_key:    { label: 'Clé API WhatsApp Business', labelAr: 'مفتاح API واتساب', type: 'password' },
    whatsapp_phone_id:   { label: 'Phone ID (Meta)', labelAr: 'Phone ID (ميتا)', type: 'text' },
    sendgrid_api_key:    { label: 'Clé API SendGrid', labelAr: 'مفتاح API SendGrid', type: 'password' },
    email_from:          { label: 'Email expéditeur', labelAr: 'بريد المُرسِل', type: 'email' },
    auto_trial_reminder: { label: 'Rappel automatique fin d\'essai', labelAr: 'تذكير تلقائي بنهاية التجربة', type: 'boolean' },
    trial_reminder_days: { label: 'Rappel avant expiration (jours)', labelAr: 'التذكير قبل الانتهاء (أيام)', type: 'number' },
  };

  const inp = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all';

  const renderField = (key: string) => {
    const cfg = FIELD_CONFIG[key];
    if (!cfg) return null;

    if (cfg.type === 'boolean') {
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, [key]: f[key] === 'true' ? 'false' : 'true' }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form[key] === 'true' ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form[key] === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {form[key] === 'true' ? sh('active') : sh('inactive')}
          </span>
        </div>
      );
    }

    return (
      <input
        type={cfg.type}
        className={inp}
        value={form[key] || ''}
        placeholder={cfg.placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{se('title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isAr ? 'تكوين المنصة والتكاملات الخارجية' : 'Configurez la plateforme et les intégrations externes'}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          {saved
            ? <><CheckCircle size={15} /> {se('saved')}</>
            : <><Save size={15} /> {saving ? sh('loading') : se('save')}</>
          }
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">{sh('loading')}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Category Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-start ${
                    activeCategory === cat
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className={activeCategory === cat ? 'text-indigo-500' : 'text-gray-400'}>
                    {CAT_ICONS[cat]}
                  </span>
                  {catLabel(cat)}
                  {settingsByCategory[cat]?.length > 0 && (
                    <span className={`ms-auto text-xs px-1.5 py-0.5 rounded-full ${
                      activeCategory === cat ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {settingsByCategory[cat].length}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Integration status indicators */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {isAr ? 'حالة التكاملات' : 'Statut des intégrations'}
              </p>
              {[
                { name: 'WhatsApp', key: 'whatsapp_api_key', color: 'bg-emerald-500' },
                { name: 'SendGrid', key: 'sendgrid_api_key', color: 'bg-blue-500' },
              ].map(integration => {
                const configured = !!(form[integration.key] && form[integration.key].length > 5);
                return (
                  <div key={integration.name} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{integration.name}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${configured ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${configured ? integration.color : 'bg-gray-300'}`} />
                      {configured ? (isAr ? 'مُفعّل' : 'Configuré') : (isAr ? 'غير مُفعّل' : 'Non configuré')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Settings Form */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
              {settingsByCategory[activeCategory]?.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">{sh('noData')}</div>
              ) : (
                settingsByCategory[activeCategory]?.map(([key]) => {
                  const cfg = FIELD_CONFIG[key];
                  if (!cfg) return null;
                  return (
                    <div key={key} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="sm:w-64 flex-shrink-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {isAr ? cfg.labelAr : cfg.label}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 font-mono">{key}</div>
                      </div>
                      <div className="flex-1">{renderField(key)}</div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Danger zone */}
            {activeCategory === 'GENERAL' && (
              <div className="mt-5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                  {isAr ? 'منطقة الخطر' : 'Zone dangereuse'}
                </h3>
                <p className="text-xs text-red-600 dark:text-red-500">
                  {isAr
                    ? 'الإجراءات في هذا القسم لا يمكن التراجع عنها. تصرف بحذر.'
                    : 'Les actions dans cette section sont irréversibles. Agissez avec précaution.'}
                </p>
              </div>
            )}

            {/* API Documentation hint */}
            {activeCategory === 'INTEGRATIONS' && (
              <div className="mt-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                  <Link2 size={14} /> {isAr ? 'كيفية الاتصال' : 'Comment se connecter'}
                </h3>
                <ul className="space-y-1.5 text-xs text-blue-700 dark:text-blue-300">
                  <li>• <strong>WhatsApp Business API</strong>: {isAr ? 'احصل على مفتاح API من Meta for Developers' : 'Obtenez votre clé depuis Meta for Developers'}</li>
                  <li>• <strong>SendGrid</strong>: {isAr ? 'أنشئ مفتاح API من لوحة تحكم SendGrid' : 'Créez une clé API depuis le tableau de bord SendGrid'}</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
