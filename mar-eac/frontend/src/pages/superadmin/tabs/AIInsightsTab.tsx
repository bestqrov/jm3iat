import React, { useEffect, useState } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Lightbulb, RefreshCw, ArrowRight } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';

interface Insight {
  type: 'WARNING' | 'SUCCESS' | 'DANGER' | 'INFO';
  title: string;
  titleAr: string;
  action: string;
  actionAr: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface PricingSuggestion {
  type: string;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
  reasonAr: string;
}

interface AIInsightsData {
  insights: Insight[];
  typeStats: Record<string, { count: number; active: number }>;
  revenueTrend: number;
  pricingSuggestions: PricingSuggestion[];
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  WARNING: <AlertTriangle size={18} />,
  SUCCESS: <CheckCircle size={18} />,
  DANGER: <TrendingDown size={18} />,
  INFO: <Info size={18} />,
};

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  WARNING: {
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  SUCCESS: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/10',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  DANGER: {
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  INFO: {
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
};

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  MEDIUM: 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  LOW: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

const ASSOC_TYPE_NAMES: Record<string, { fr: string; ar: string }> = {
  REGULAR: { fr: 'Classique', ar: 'عادية' },
  PROJECTS: { fr: 'Projets', ar: 'مشاريع' },
  WATER: { fr: 'Eau', ar: 'الماء' },
  PRODUCTIVE: { fr: 'Productive', ar: 'إنتاجية' },
  PRODUCTIVE_WATER: { fr: 'Productive + Eau', ar: 'إنتاجية + ماء' },
};

export const AIInsightsTab: React.FC = () => {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const ai = (k: string) => t(`sa.insights.${k}`);

  const [data, setData] = useState<AIInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await superadminApi.getAIInsights();
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const priorityLabel = (p: string) => {
    if (isAr) {
      return { HIGH: 'أولوية عالية', MEDIUM: 'أولوية متوسطة', LOW: 'أولوية منخفضة' }[p] || p;
    }
    return { HIGH: 'Haute', MEDIUM: 'Moyenne', LOW: 'Basse' }[p] || p;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain size={22} className="text-indigo-500" /> {ai('title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{ai('subtitle')}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {isAr ? 'تحديث' : 'Actualiser'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Brain size={40} className="mx-auto text-indigo-400 animate-pulse mb-3" />
            <p className="text-gray-400 text-sm">{isAr ? 'جاري تحليل البيانات...' : 'Analyse des données en cours...'}</p>
          </div>
        </div>
      ) : !data ? null : (
        <>
          {/* Revenue Trend Banner */}
          {data.revenueTrend !== 0 && (
            <div className={`rounded-2xl p-4 flex items-center gap-4 border ${
              data.revenueTrend > 0
                ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
            }`}>
              {data.revenueTrend > 0
                ? <TrendingUp size={28} className="text-emerald-500 flex-shrink-0" />
                : <TrendingDown size={28} className="text-red-500 flex-shrink-0" />
              }
              <div>
                <div className={`font-semibold ${data.revenueTrend > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {isAr
                    ? `اتجاه الإيرادات: ${data.revenueTrend > 0 ? '+' : ''}${data.revenueTrend}% مقارنة بالشهر الماضي`
                    : `Tendance revenus: ${data.revenueTrend > 0 ? '+' : ''}${data.revenueTrend}% vs mois précédent`
                  }
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {isAr ? '30 يوم الأخيرة مقارنة بالـ30 يوم التي قبلها' : '30 derniers jours vs 30 jours précédents'}
                </div>
              </div>
            </div>
          )}

          {/* Insights Cards */}
          {data.insights.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Lightbulb size={48} className="mx-auto mb-3 opacity-30" />
              <p>{ai('noInsights')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Lightbulb size={15} className="text-amber-500" />
                {isAr ? 'التوصيات الذكية' : 'Recommandations intelligentes'}
              </h3>
              {data.insights.map((insight, i) => {
                const style = TYPE_STYLES[insight.type] || TYPE_STYLES.INFO;
                return (
                  <div key={i} className={`rounded-2xl p-4 border ${style.bg} ${style.border} flex items-start gap-4`}>
                    <div className={`flex-shrink-0 mt-0.5 ${style.icon}`}>
                      {TYPE_ICONS[insight.type]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {isAr ? insight.titleAr : insight.title}
                        </p>
                        <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[insight.priority]}`}>
                          {priorityLabel(insight.priority)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {isAr ? insight.actionAr : insight.action}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Type Statistics */}
          {Object.keys(data.typeStats).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{ai('typeStats')}</h3>
              <div className="space-y-3">
                {Object.entries(data.typeStats).map(([type, stats]) => {
                  const rate = stats.count > 0 ? Math.round((stats.active / stats.count) * 100) : 0;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {isAr ? (ASSOC_TYPE_NAMES[type]?.ar || type) : (ASSOC_TYPE_NAMES[type]?.fr || type)}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{ai('totalOrgs')}: {stats.count}</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{ai('activeOrgs')}: {stats.active}</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{rate}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing Suggestions */}
          {data.pricingSuggestions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Brain size={15} className="text-indigo-500" />
                {ai('pricingSuggestions')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.pricingSuggestions.map((sug, i) => (
                  <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {isAr ? (ASSOC_TYPE_NAMES[sug.type]?.ar || sug.type) : (ASSOC_TYPE_NAMES[sug.type]?.fr || sug.type)}
                      </span>
                      {sug.suggestedPrice > sug.currentPrice
                        ? <TrendingUp size={16} className="text-emerald-500" />
                        : sug.suggestedPrice < sug.currentPrice
                          ? <TrendingDown size={16} className="text-red-500" />
                          : <CheckCircle size={16} className="text-gray-400" />
                      }
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">{ai('currentPrice')}</div>
                        <div className="text-lg font-bold text-gray-700 dark:text-gray-300">{sug.currentPrice} <span className="text-xs">MAD</span></div>
                      </div>
                      <ArrowRight size={16} className="text-gray-300 flex-shrink-0" />
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">{ai('suggestedPrice')}</div>
                        <div className={`text-lg font-bold ${sug.suggestedPrice > sug.currentPrice ? 'text-emerald-600 dark:text-emerald-400' : sug.suggestedPrice < sug.currentPrice ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
                          {sug.suggestedPrice} <span className="text-xs">MAD</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      {isAr ? sug.reasonAr : sug.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
