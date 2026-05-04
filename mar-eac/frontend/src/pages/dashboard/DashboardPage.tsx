import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  Users, Calendar, DollarSign, Briefcase, TrendingUp, TrendingDown,
  Bell, Droplets, ShoppingBag, Layers, Building2, FolderKanban,
  AlertCircle, CheckCircle, Wrench, Package, RefreshCw, Activity, Globe,
  Bus, MapPin, CreditCard, UserCheck, ArrowRightLeft, Sparkles, Crown,
  ChevronDown, ChevronRight, Lock, X, Store,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  membersApi, meetingsApi, financeApi, projectsApi,
  remindersApi, waterApi, assocApi, transportApi,
} from '../../lib/api';
import { StatCard } from '../../components/ui/StatCard';
import { formatCurrency, formatDate, getTrialDaysRemaining } from '../../lib/utils';

// ─── Theme per association type ───────────────────────────────────────────────

type DashTheme = {
  gradient: string;
  primary: string;
  secondary: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  labelFr: string;
  labelAr: string;
};

const getDashTheme = (modules: string[]): DashTheme => {
  const hasWater = modules.includes('WATER');
  const hasProd  = modules.includes('PRODUCTIVE');
  const hasProj  = modules.includes('PROJECTS');

  if (hasWater && hasProd) return {
    gradient: 'linear-gradient(90deg, #7c3aed, #4f46e5, #0891b2)',
    primary: '#7c3aed', secondary: '#0891b2',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    icon: <Layers size={14} />,
    labelFr: 'Association Productive + Eau', labelAr: 'جمعية إنتاجية مع الماء',
  };
  if (hasWater) return {
    gradient: 'linear-gradient(90deg, #0891b2, #2563eb)',
    primary: '#0891b2', secondary: '#2563eb',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    icon: <Droplets size={14} />,
    labelFr: 'Association de l\'eau', labelAr: 'جمعية الماء',
  };
  if (hasProd) return {
    gradient: 'linear-gradient(90deg, #059669, #0d9488)',
    primary: '#059669', secondary: '#0d9488',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    icon: <ShoppingBag size={14} />,
    labelFr: 'Association Productive', labelAr: 'جمعية إنتاجية',
  };
  if (hasProj) return {
    gradient: 'linear-gradient(90deg, #2563eb, #4f46e5)',
    primary: '#2563eb', secondary: '#4f46e5',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    icon: <FolderKanban size={14} />,
    labelFr: 'Association avec Projets', labelAr: 'جمعية المشاريع',
  };
  return {
    gradient: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
    primary: '#4f46e5', secondary: '#7c3aed',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    icon: <Building2 size={14} />,
    labelFr: 'Association Classique', labelAr: 'جمعية عادية',
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const { user, organization, isSuperAdmin, hasModule } = useAuth();
  const { t, lang } = useLanguage();

  if (isSuperAdmin) return <Navigate to="/superadmin" replace />;

  const sub    = organization?.subscription;
  const mods   = organization?.modules ?? [];
  const theme  = getDashTheme(mods);
  const isAr   = lang === 'ar';

  const hasWater     = hasModule('WATER');
  const hasProd      = hasModule('PRODUCTIVE');
  const hasProj      = hasModule('PROJECTS');
  const hasTransport = hasModule('TRANSPORT');
  const hasCoop      = hasModule('COOP');
  const hasFinance   = mods.length > 0 || (sub?.plan && sub.plan !== 'BASIC');

  const trialDays = organization?.trialEndsAt ? getTrialDaysRemaining(organization.trialEndsAt) : null;

  // ── Data state ──
  const [memberStats,        setMemberStats]        = useState<any>(null);
  const [meetingStats,       setMeetingStats]        = useState<any>(null);
  const [financeSummary,     setFinanceSummary]      = useState<any>(null);
  const [monthlyData,        setMonthlyData]         = useState<any[]>([]);
  const [projectStats,       setProjectStats]        = useState<any>(null);
  const [recentMeetings,     setRecentMeetings]      = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions]  = useState<any[]>([]);
  const [reminders,          setReminders]           = useState<any[]>([]);
  const [waterSummary,       setWaterSummary]        = useState<any>(null);
  const [assocStats,         setAssocStats]          = useState<any>(null);
  const [transportStats,     setTransportStats]      = useState<any>(null);
  const [loading,            setLoading]             = useState(true);

  // ── Cooperative conversion ──
  const isPro = organization?.assocType === 'PRO' || (sub?.plan === 'PREMIUM' && (mods.length >= 4));
  const [showCoopSection,  setShowCoopSection]  = useState(false);
  const [showCoopSteps,    setShowCoopSteps]    = useState(false);
  const [showUpgradeDialog,setShowUpgradeDialog]= useState(false);

  const COOP_STEPS = isAr ? [
    { num: '01', title: 'قرار الجمعية العامة', duration: '1 يوم', color: 'bg-emerald-500',
      desc: 'انعقاد جمعية عامة استثنائية للتصويت على قرار التحويل إلى تعاونية. يجب أن يصادق على القرار بأغلبية الثلثين من الأعضاء الحاضرين. تُحرَّر محضر رسمي موثَّق.' },
    { num: '02', title: 'إعداد القانون الأساسي للتعاونية', duration: '7 إلى 15 يوم', color: 'bg-teal-500',
      desc: 'صياغة القانون الأساسي للتعاونية وفق مقتضيات القانون رقم 112.12 المتعلق بالتعاونيات. يجب أن يتضمن: الاسم، المقر، الغرض، رأس المال، الحصص، القيادة، وآليات توزيع الأرباح.' },
    { num: '03', title: 'إيداع الملف لدى ODCO', duration: '30 يوم', color: 'bg-cyan-500',
      desc: 'تقديم ملف التأسيس إلى المكتب المركزي للتعاون (ODCO) يتضمن: القانون الأساسي، محضر الجمعية التأسيسية، قائمة المؤسسين مع وثائق الهوية، شهادة مقر التعاونية، وبطاقة المعلومات البنكية.' },
    { num: '04', title: 'الحصول على شهادة التسجيل', duration: '15 إلى 30 يوم', color: 'bg-blue-500',
      desc: 'بعد مراجعة ODCO للملف وقبوله، يُصدَر قرار تسجيل التعاونية رسمياً. تُسلَّم شهادة التسجيل التي تُعدّ الوثيقة القانونية الأساسية للتعاونية.' },
    { num: '05', title: 'النشر في الجريدة الرسمية', duration: '15 يوم', color: 'bg-indigo-500',
      desc: 'نشر ملخص القانون الأساسي وقرار التسجيل في الجريدة الرسمية للمملكة المغربية. يُعدّ النشر إعلاناً قانونياً رسمياً بوجود التعاونية ويُكسبها الشخصية المعنوية الكاملة.' },
    { num: '06', title: 'فتح الحساب البنكي', duration: '5 إلى 10 أيام', color: 'bg-violet-500',
      desc: 'فتح حساب بنكي باسم التعاونية وإيداع رأس المال الأولي. يجب أن يكون الحساب منفصلاً تماماً عن حساب الجمعية السابقة. يُودَع شهادة التسجيل والقانون الأساسي لدى البنك.' },
    { num: '07', title: 'التسجيل في السجل التجاري', duration: '5 إلى 15 يوم', color: 'bg-purple-500',
      desc: 'التسجيل في السجل التجاري لدى المحكمة التجارية المختصة للحصول على رقم التسجيل التجاري (IF). ضروري للفواتير، العقود، والتعاملات التجارية الرسمية.' },
    { num: '08', title: 'إغلاق ملف الجمعية', duration: '30 يوم', color: 'bg-rose-500',
      desc: 'تسوية الوضعية الإدارية للجمعية السابقة: إخبار السلطة الإدارية بالتوقف، تحويل الأصول والأرصدة إلى التعاونية الجديدة، أرشفة وثائق الجمعية، وإخبار المتعاملين والشركاء بالتغيير.' },
  ] : [
    { num: '01', title: "Décision de l'Assemblée Générale", duration: '1 jour', color: 'bg-emerald-500',
      desc: "Tenue d'une assemblée générale extraordinaire pour voter la décision de conversion en coopérative. La décision doit être approuvée aux deux tiers des membres présents. Un procès-verbal officiel et signé est rédigé." },
    { num: '02', title: 'Rédaction des statuts de la coopérative', duration: '7 à 15 jours', color: 'bg-teal-500',
      desc: "Rédaction des statuts de la coopérative conformément à la loi n°112.12 relative aux coopératives. Ils doivent inclure : le nom, le siège, l'objet, le capital, les parts, la gouvernance et les modalités de distribution des bénéfices." },
    { num: '03', title: "Dépôt du dossier à l'ODCO", duration: '30 jours', color: 'bg-cyan-500',
      desc: "Soumission du dossier de constitution à l'Office de Développement de la Coopération (ODCO). Le dossier comprend : les statuts, le PV de l'AG constitutive, la liste des fondateurs avec pièces d'identité, l'attestation de siège et les coordonnées bancaires." },
    { num: '04', title: "Obtention du certificat d'enregistrement", duration: '15 à 30 jours', color: 'bg-blue-500',
      desc: "Après examen et acceptation du dossier par l'ODCO, une décision d'enregistrement officielle est émise. Le certificat d'enregistrement constitue le document juridique fondamental de la coopérative." },
    { num: '05', title: 'Publication au Bulletin Officiel', duration: '15 jours', color: 'bg-indigo-500',
      desc: "Publication d'un résumé des statuts et de la décision d'enregistrement au Bulletin Officiel du Royaume du Maroc. La publication est une annonce légale officielle conférant à la coopérative sa pleine personnalité morale." },
    { num: '06', title: 'Ouverture du compte bancaire', duration: '5 à 10 jours', color: 'bg-violet-500',
      desc: "Ouverture d'un compte bancaire au nom de la coopérative et dépôt du capital initial. Le compte doit être entièrement distinct du compte de l'ancienne association. Le certificat d'enregistrement et les statuts sont remis à la banque." },
    { num: '07', title: 'Inscription au registre du commerce', duration: '5 à 15 jours', color: 'bg-purple-500',
      desc: "Inscription au registre du commerce auprès du Tribunal de commerce compétent pour obtenir le numéro d'enregistrement (IF). Indispensable pour les factures, les contrats et les transactions commerciales officielles." },
    { num: '08', title: "Clôture du dossier de l'association", duration: '30 jours', color: 'bg-rose-500',
      desc: "Régularisation de la situation administrative de l'ancienne association : notification à l'autorité administrative, transfert des actifs et soldes à la nouvelle coopérative, archivage des documents de l'association et information des partenaires du changement." },
  ];

  useEffect(() => {
    const load = async () => {
      try {
        // Always load: members, meetings, reminders
        const [ms, mts, rem, meetings] = await Promise.allSettled([
          membersApi.getStats(),
          meetingsApi.getStats(),
          remindersApi.getAll({ unread: true }),
          meetingsApi.getAll({ status: undefined }),
        ]);
        if (ms.status       === 'fulfilled') setMemberStats(ms.value.data);
        if (mts.status      === 'fulfilled') setMeetingStats(mts.value.data);
        if (rem.status      === 'fulfilled') setReminders(rem.value.data.slice(0, 5));
        if (meetings.status === 'fulfilled') setRecentMeetings(meetings.value.data.slice(0, 5));

        // Finance — non-REGULAR orgs
        if (hasFinance) {
          const [fin, monthly, tx] = await Promise.allSettled([
            financeApi.getSummary(),
            financeApi.getMonthly(),
            financeApi.getAll(),
          ]);
          if (fin.status    === 'fulfilled') setFinanceSummary(fin.value.data);
          if (monthly.status === 'fulfilled') setMonthlyData(monthly.value.data);
          if (tx.status     === 'fulfilled') setRecentTransactions(tx.value.data.slice(0, 5));
        }

        // Projects module
        if (hasProj) {
          const ps = await projectsApi.getStats().catch(() => null);
          if (ps) setProjectStats(ps.data);
        }

        // Water module
        if (hasWater) {
          const ws = await waterApi.getSummary().catch(() => null);
          if (ws) setWaterSummary(ws.data);
        }

        // Productive module
        if (hasProd) {
          const as = await assocApi.getStats().catch(() => null);
          if (as) setAssocStats(as.data);
        }

        // Transport module
        if (hasTransport) {
          const ts = await transportApi.getStats().catch(() => null);
          if (ts) setTransportStats(ts.data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Chart data ──
  const months = (t('common.months') as unknown as string[]);
  const chartData = monthlyData.map((m, i) => ({
    name: months?.[i] ?? `M${i + 1}`,
    [isAr ? 'إيرادات' : 'Recettes']: m.income,
    [isAr ? 'مصاريف' : 'Dépenses']: m.expenses,
  }));

  const projectPieData = projectStats ? [
    { name: t('projects.statuses.PLANNED'),     value: projectStats.planned     },
    { name: t('projects.statuses.IN_PROGRESS'), value: projectStats.inProgress  },
    { name: t('projects.statuses.COMPLETED'),   value: projectStats.completed   },
  ].filter(d => d.value > 0) : [];

  const PIE_COLORS = [theme.primary, theme.secondary, '#f59e0b'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: theme.primary, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Themed header banner ── */}
      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="h-1.5 w-full" style={{ background: theme.gradient }} />
        <div className="p-5 bg-white dark:bg-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('dashboard.welcome')}, {user?.name?.split(' ')[0]}!
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">{organization?.name}</span>
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {theme.icon}
                {isAr ? theme.labelAr : theme.labelFr}
              </span>
              {sub?.status === 'TRIAL' && trialDays !== null && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {t('dashboard.trialEnds')} {trialDays} {t('dashboard.days')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Convert to cooperative button */}
            <button
              onClick={() => isPro ? setShowCoopSection(v => !v) : setShowUpgradeDialog(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all border ${
                isPro
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-100'
              }`}
            >
              {isPro ? <ArrowRightLeft size={15} /> : <Lock size={14} />}
              {isAr ? 'تحويل إلى تعاونية' : 'Convertir en coopérative'}
              {isPro && (showCoopSection ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
              {!isPro && <Crown size={13} className="text-yellow-500" />}
            </button>

            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: theme.gradient }}
            >
              <span className="font-bold text-white text-sm">MA</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cooperative conversion panel (PRO only) ── */}
      {showCoopSection && isPro && (
        <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 overflow-hidden shadow-lg">
          {/* Panel header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <ArrowRightLeft size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">
                  {isAr ? 'تحويل الجمعية إلى تعاونية' : "Conversion de l'association en coopérative"}
                </h3>
                <p className="text-emerald-100 text-xs mt-0.5">
                  {isAr ? 'دليل خطوة بخطوة وفق القانون المغربي رقم 112.12' : 'Guide étape par étape selon la loi marocaine n°112.12'}
                </p>
              </div>
            </div>
            <button onClick={() => { setShowCoopSection(false); setShowCoopSteps(false); }}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Generate button or steps */}
          {!showCoopSteps ? (
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles size={28} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="text-gray-900 dark:text-white font-bold text-lg mb-2">
                {isAr ? 'هل أنت مستعد للتحويل؟' : 'Prêt pour la conversion ?'}
              </h4>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto mb-6">
                {isAr
                  ? 'اضغط على الزر أدناه لعرض المسار الكامل للتحويل من جمعية إلى تعاونية مع الشروحات التفصيلية لكل خطوة'
                  : 'Cliquez sur le bouton ci-dessous pour afficher le parcours complet de conversion avec les explications détaillées de chaque étape'}
              </p>
              <button
                onClick={() => setShowCoopSteps(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-200 dark:shadow-emerald-900/30 transition-all"
              >
                <Sparkles size={16} />
                {isAr ? 'توليد الخطوات' : 'Générer les étapes'}
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {isAr ? `${COOP_STEPS.length} خطوات — مدة إجمالية تقديرية: 3 إلى 4 أشهر` : `${COOP_STEPS.length} étapes — Durée totale estimée : 3 à 4 mois`}
                </p>
                <span className="text-xs text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                  {isAr ? 'القانون 112.12' : 'Loi 112.12'}
                </span>
              </div>
              {COOP_STEPS.map((step, i) => (
                <div key={i} className="flex gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  {/* Step number */}
                  <div className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <span className="text-white font-bold text-sm">{step.num}</span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">{step.title}</h4>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800 whitespace-nowrap flex-shrink-0">
                        <ArrowRightLeft size={10} />{step.duration}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
              <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  {isAr
                    ? '⚠️ تنبيه: هذه الخطوات إرشادية عامة. يُنصح باستشارة محامٍ متخصص أو ODCO للحصول على توجيه دقيق حسب وضع جمعيتك.'
                    : "⚠️ Avertissement : Ces étapes sont indicatives. Il est recommandé de consulter un juriste spécialisé ou l'ODCO pour un accompagnement adapté à votre situation."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Upgrade to PRO dialog ── */}
      {showUpgradeDialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowUpgradeDialog(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Crown size={22} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">
                  {isAr ? 'ميزة حصرية — باقة PRO' : 'Fonctionnalité exclusive — Pack PRO'}
                </h3>
                <p className="text-white/80 text-xs">{isAr ? '250 د.م/سنة' : '250 MAD/an'}</p>
              </div>
              <button onClick={() => setShowUpgradeDialog(false)} className="ms-auto p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white">
                <X size={16} />
              </button>
            </div>
            {/* Body */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <Lock size={22} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {isAr ? 'التحويل إلى تعاونية — PRO فقط' : 'Conversion en coopérative — PRO uniquement'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {isAr ? 'هذه الميزة متاحة فقط في باقة PRO' : 'Cette fonctionnalité est réservée au pack PRO'}
                  </p>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                {(isAr
                  ? ['دليل تحويل قانوني خطوة بخطوة', 'شرح تفصيلي لكل مرحلة', 'مراجع القانون المغربي 112.12', 'جميع وحدات المنصة مفتوحة', 'دعم أولوي 24/7']
                  : ["Guide légal de conversion étape par étape", "Explication détaillée de chaque phase", "Références loi marocaine 112.12", "Tous les modules de la plateforme ouverts", "Support prioritaire 24/7"]
                ).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/settings"
                onClick={() => setShowUpgradeDialog(false)}
                className="block text-center w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
              >
                {isAr ? 'الترقية إلى PRO — 250 د.م/سنة' : 'Passer au Pack PRO — 250 MAD/an'}
              </Link>
              <button onClick={() => setShowUpgradeDialog(false)} className="block w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3">
                {isAr ? 'لاحقاً' : 'Plus tard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/calendar',  icon: <Calendar size={18} />,   label: isAr ? 'التقويم' : 'Calendrier',        color: 'indigo' },
          { to: '/recurring', icon: <RefreshCw size={18} />,  label: isAr ? 'الدفعات المتكررة' : 'Récurrents', color: 'blue' },
          { to: '/activity',  icon: <Activity size={18} />,   label: isAr ? 'سجل النشاطات' : 'Activité',    color: 'purple' },
          { to: '/settings',  icon: <Globe size={18} />,      label: isAr ? 'الصفحة العامة' : 'Page publique', color: 'emerald' },
        ].map(qa => (
          <Link key={qa.to} to={qa.to}
            className={`card p-3 flex items-center gap-2 hover:shadow-md transition-shadow group`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${qa.color}-100 dark:bg-${qa.color}-900/30 text-${qa.color}-600 dark:text-${qa.color}-400 group-hover:scale-110 transition-transform`}>
              {qa.icon}
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{qa.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Stat cards — base (all types) ── */}
      <div className="stats-grid">
        <StatCard
          title={t('dashboard.totalMembers')}
          value={memberStats?.total ?? '-'}
          icon={<Users size={22} />}
          iconBg={theme.iconBg}
          iconColor={theme.iconColor}
          subtitle={`${memberStats?.active ?? 0} ${t('members.active')}`}
        />
        <StatCard
          title={t('dashboard.totalMeetings')}
          value={meetingStats?.total ?? '-'}
          icon={<Calendar size={22} />}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          subtitle={`${meetingStats?.thisMonth ?? 0} ${isAr ? 'هذا الشهر' : 'ce mois'}`}
        />

        {/* Finance balance — non-REGULAR */}
        {hasFinance && (
          <StatCard
            title={t('dashboard.balance')}
            value={financeSummary ? formatCurrency(financeSummary.balance, lang) : '-'}
            icon={<DollarSign size={22} />}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
        )}

        {/* Projects module stat */}
        {hasProj && (
          <StatCard
            title={t('dashboard.activeProjects')}
            value={projectStats?.inProgress ?? '-'}
            icon={<Briefcase size={22} />}
            iconBg={theme.iconBg}
            iconColor={theme.iconColor}
            subtitle={`${projectStats?.completed ?? 0} ${isAr ? 'مكتمل' : 'terminés'}`}
          />
        )}

        {/* Water module stat */}
        {hasWater && (
          <StatCard
            title={isAr ? 'الفواتير غير المدفوعة' : 'Factures impayées'}
            value={waterSummary?.unpaidInvoices ?? '-'}
            icon={<AlertCircle size={22} />}
            iconBg="bg-cyan-100 dark:bg-cyan-900/30"
            iconColor="text-cyan-600 dark:text-cyan-400"
            subtitle={waterSummary ? formatCurrency(waterSummary.pendingAmount ?? 0, lang) : ''}
          />
        )}

        {/* Productive module stat */}
        {hasProd && (
          <StatCard
            title={isAr ? 'المبيعات هذا الشهر' : 'Ventes ce mois'}
            value={assocStats?.salesThisMonth ?? '-'}
            icon={<ShoppingBag size={22} />}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
            subtitle={assocStats ? formatCurrency(assocStats.revenueThisMonth ?? 0, lang) : ''}
          />
        )}

        {/* Transport module stat */}
        {hasTransport && (
          <StatCard
            title={isAr ? 'تلاميذ النقل' : 'Élèves transportés'}
            value={transportStats?.totalStudents ?? '-'}
            icon={<Bus size={22} />}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            iconColor="text-orange-600 dark:text-orange-400"
            subtitle={transportStats ? (isAr ? `${transportStats.unpaidSubs ?? 0} غير مدفوع` : `${transportStats.unpaidSubs ?? 0} impayé(s)`) : ''}
          />
        )}
      </div>

      {/* ── Module-specific sections ── */}

      {/* WATER module — summary cards */}
      {hasWater && waterSummary && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Droplets size={18} style={{ color: theme.primary }} />
            {isAr ? 'ملخص الماء' : 'Résumé eau'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: isAr ? 'المنشآت' : 'Installations', value: waterSummary.totalInstallations ?? '-', icon: <Droplets size={18} /> },
              { label: isAr ? 'الفواتير هذا الشهر' : 'Factures ce mois', value: waterSummary.invoicesThisMonth ?? '-', icon: <CheckCircle size={18} /> },
              { label: isAr ? 'الإيرادات هذا الشهر' : 'Revenus ce mois', value: formatCurrency(waterSummary.revenueThisMonth ?? 0, lang), icon: <TrendingUp size={18} /> },
              { label: isAr ? 'الأعطال المفتوحة' : 'Pannes ouvertes', value: waterSummary.openRepairs ?? '-', icon: <Wrench size={18} /> },
            ].map((card, i) => (
              <div key={i} className="card p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: `${theme.primary}18` }}>
                  <span style={{ color: theme.primary }}>{card.icon}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRODUCTIVE module — assoc summary */}
      {hasProd && assocStats && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <ShoppingBag size={18} style={{ color: theme.primary }} />
            {isAr ? 'ملخص الإنتاج' : 'Résumé production'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: isAr ? 'المنتجات' : 'Produits', value: assocStats.totalProducts ?? '-', icon: <Package size={18} /> },
              { label: isAr ? 'قيمة المخزون' : 'Valeur stock', value: formatCurrency(assocStats.stockValue ?? 0, lang), icon: <ShoppingBag size={18} /> },
              { label: isAr ? 'العملاء' : 'Clients', value: assocStats.totalClients ?? '-', icon: <Users size={18} /> },
              { label: isAr ? 'إجمالي المبيعات' : 'Total ventes', value: formatCurrency(assocStats.totalRevenue ?? 0, lang), icon: <TrendingUp size={18} /> },
            ].map((card, i) => (
              <div key={i} className="card p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: `${theme.primary}18` }}>
                  <span style={{ color: theme.primary }}>{card.icon}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Transport module section ── */}
      {hasTransport && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Bus size={18} className="text-orange-500" />
            {isAr ? 'ملخص النقل المدرسي' : 'Résumé transport scolaire'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: isAr ? 'التلاميذ' : 'Élèves',          value: transportStats?.totalStudents  ?? '-', icon: <Users size={18} />,     color: '#ea580c' },
              { label: isAr ? 'الحافلات' : 'Véhicules',        value: transportStats?.totalVehicles  ?? '-', icon: <Bus size={18} />,       color: '#ea580c' },
              { label: isAr ? 'الخطوط' : 'Itinéraires',        value: transportStats?.totalRoutes    ?? '-', icon: <MapPin size={18} />,    color: '#ea580c' },
              { label: isAr ? 'غير مدفوع' : 'Abonnements impayés', value: transportStats?.unpaidSubs ?? '-', icon: <CreditCard size={18} />, color: '#dc2626' },
            ].map((card, i) => (
              <Link key={i} to="/transport" className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                <div className="p-2 rounded-lg" style={{ background: `${card.color}18` }}>
                  <span style={{ color: card.color }}>{card.icon}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{card.value}</p>
                </div>
              </Link>
            ))}
          </div>
          {/* Revenue summary */}
          {transportStats && (transportStats.monthRevenue > 0 || transportStats.totalRevenue > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="card p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <TrendingUp size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{isAr ? 'إيرادات هذا الشهر' : 'Revenus ce mois'}</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(transportStats.monthRevenue ?? 0, lang)}</p>
                </div>
              </div>
              <div className="card p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <UserCheck size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{isAr ? 'اشتراكات مدفوعة' : 'Abonnements payés'}</p>
                  <p className="text-sm font-bold text-blue-600">{transportStats.paidSubs ?? '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COOP module — convert to cooperative ── */}
      {hasCoop && (
        <Link
          to="/coop"
          className="block rounded-2xl overflow-hidden border border-teal-200 dark:border-teal-800 hover:shadow-lg transition-shadow"
          style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)' }}
        >
          <div className="p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}>
              <Store size={26} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-0.5">
                {isAr ? 'وحدة التعاونية' : 'Module Coopérative'}
              </p>
              <h3 className="text-base font-bold text-teal-900 dark:text-teal-100">
                {isAr ? 'تحويل إلى تعاونية' : 'Convertir en coopérative'}
              </h3>
              <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5 truncate">
                {isAr
                  ? 'إدارة الحصص الاجتماعية، المخزون، الفواتير والتقارير'
                  : 'Parts sociales, stock, factures, devis et rapports'}
              </p>
            </div>
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-teal-600 text-white">
              {isAr ? '←' : '→'}
            </div>
          </div>
        </Link>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Finance Chart (non-REGULAR) */}
        {hasFinance ? (
          <div className="lg:col-span-2 card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.monthlyChart')}</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, lang)} />
                  <Bar dataKey={isAr ? 'إيرادات' : 'Recettes'} fill={theme.primary}   radius={[4, 4, 0, 0]} />
                  <Bar dataKey={isAr ? 'مصاريف' : 'Dépenses'}  fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                {t('common.noData')}
              </div>
            )}
          </div>
        ) : (
          /* REGULAR: recent meetings takes 2/3 of the row */
          <div className="lg:col-span-2 card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('dashboard.recentMeetings')}</h3>
            {recentMeetings.length > 0 ? (
              <div className="space-y-2">
                {recentMeetings.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{m.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(m.date, lang)}</p>
                    </div>
                    <span className={`badge ${m.status === 'COMPLETED' ? 'badge-green' : m.status === 'SCHEDULED' ? 'badge-blue' : 'badge-gray'}`}>
                      {t(`meetings.statuses.${m.status}`)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('dashboard.noMeetings')}</p>
            )}
          </div>
        )}

        {/* Right column: Projects pie OR Reminders */}
        <div className="card p-4">
          {hasProj && projectPieData.length > 0 ? (
            <>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.projectsChart')}</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={projectPieData}
                    cx="50%" cy="50%" outerRadius={70} dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {projectPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Bell size={16} />{t('dashboard.reminders')}
              </h3>
              {reminders.length > 0 ? (
                <div className="space-y-2">
                  {reminders.map(r => (
                    <div key={r.id} className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300 truncate">{r.title}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">{t('reminders.noReminders')}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Recent tables row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Meetings (always, except for REGULAR it was shown above) */}
        {hasFinance && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('dashboard.recentMeetings')}</h3>
            {recentMeetings.length > 0 ? (
              <div className="space-y-2">
                {recentMeetings.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{m.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(m.date, lang)}</p>
                    </div>
                    <span className={`badge ${m.status === 'COMPLETED' ? 'badge-green' : m.status === 'SCHEDULED' ? 'badge-blue' : 'badge-gray'}`}>
                      {t(`meetings.statuses.${m.status}`)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('dashboard.noMeetings')}</p>
            )}
          </div>
        )}

        {/* Recent Transactions (non-REGULAR) */}
        {hasFinance && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('dashboard.recentTransactions')}</h3>
            {recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-2">
                      {tx.type === 'INCOME'
                        ? <TrendingUp size={16} className="text-emerald-500" />
                        : <TrendingDown size={16} className="text-red-500" />}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{tx.category}</p>
                        <p className="text-xs text-gray-500">{formatDate(tx.date, lang)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, lang)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('dashboard.noTransactions')}</p>
            )}
          </div>
        )}

        {/* REGULAR: only show reminders in the second column */}
        {!hasFinance && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Bell size={16} />{t('dashboard.reminders')}
            </h3>
            {reminders.length > 0 ? (
              <div className="space-y-2">
                {reminders.map(r => (
                  <div key={r.id} className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300 truncate">{r.title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('reminders.noReminders')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
