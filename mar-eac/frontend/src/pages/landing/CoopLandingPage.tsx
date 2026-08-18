import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle, Globe, Menu, X, Sparkles, ChevronDown,
  Package, ShoppingCart, TrendingUp, Users, Shield,
  ArrowRight, BarChart2, Leaf,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

const COOP_TYPES_AR = [
  'تعاونية إنتاجية', 'تعاونية زراعية', 'تعاونية حرفية',
  'تعاونية صيد بحري', 'تعاونية خدماتية', 'تعاونية للنساء',
  'تعاونية فلاحية', 'أخرى',
];
const COOP_TYPES_FR = [
  'Coopérative productive', 'Coopérative agricole', 'Coopérative artisanale',
  'Coopérative de pêche', 'Coopérative de services', 'Coopérative féminine',
  'Coopérative agropastorale', 'Autre',
];

export const CoopLandingPage: React.FC = () => {
  const { lang, dir, setLang } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();
  const isAr = lang === 'ar';
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({
    coopName: '', coopType: '', coopCity: '', coopRegion: '',
    membersCount: '', phone: '',
    adminName: '', adminEmail: '', password: '', confirmPassword: '',
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setSubmitError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Les mots de passe ne correspondent pas');
      return;
    }
    setSubmitting(true); setSubmitError('');
    try {
      await register({
        orgName:    form.coopName,
        orgEmail:   form.adminEmail,
        orgPhone:   form.phone,
        orgCity:    form.coopCity,
        orgRegion:  form.coopRegion,
        adminName:  form.adminName,
        adminEmail: form.adminEmail,
        password:   form.password,
        modules:    ['PRODUCTIVE'],
        assocType:  'PRODUCTIVE',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || (isAr ? 'حدث خطأ' : 'Une erreur est survenue'));
    } finally { setSubmitting(false); }
  };

  const inp = `w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 transition-all`;
  const lbl = `block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5`;

  const faqs = isAr ? [
    { q: 'هل أحتاج خبرة تقنية لاستخدام المنصة؟', a: 'لا إطلاقاً. المنصة مصممة خصيصاً للتعاونيات المغربية — بسيطة ويمكن لأي شخص إدارتها.' },
    { q: 'ماذا توفر لي المنصة بالضبط؟', a: 'إدارة كاملة لتعاونيتك: الأعضاء، المكتب الإداري، الاجتماعات ومحاضرها، المشاريع، والمالية — كل شيء في لوحة تحكم واحدة.' },
    { q: 'هل يمكنني إدارة المخزون والإنتاج؟', a: 'نعم. تتبع دورات الإنتاج، حركات المخزون، والمبيعات لعملائك مباشرة من التطبيق.' },
    { q: 'هل بياناتي آمنة؟', a: 'نعم، بياناتك محفوظة بشكل آمن ولا يمكن لأي جهة خارجية الوصول إليها.' },
  ] : [
    { q: 'Faut-il des compétences techniques ?', a: 'Absolument pas. La plateforme est conçue pour les coopératives marocaines — simple, accessible à tous.' },
    { q: 'Que m\'offre exactement la plateforme ?', a: 'La gestion complète de votre coopérative : membres, bureau administratif, réunions et PV, projets, et finances — tout dans un seul tableau de bord.' },
    { q: 'Puis-je gérer ma production et mon stock ?', a: 'Oui. Suivez vos cycles de production, mouvements de stock, et ventes à vos clients directement depuis l\'application.' },
    { q: 'Mes données sont-elles sécurisées ?', a: 'Oui, vos données sont stockées de manière sécurisée et ne sont accessibles à aucun tiers.' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950" dir={dir}>

      {/* ── Nav ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo-saas.png" alt="Minassatona" className="h-9 w-9 object-contain" />
              <div>
                <span className="font-bold text-gray-900 dark:text-white">Minassatona</span>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium leading-none mt-0.5">
                  {isAr ? 'حصري للتعاونيات المغربية' : 'Exclusif coopératives marocaines'}
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                {isAr ? 'الرئيسية' : 'Accueil'}
              </Link>
              <a href="#how" className="text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-600 transition-colors">
                {isAr ? 'كيف يعمل' : 'Comment ça marche'}
              </a>
              <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-600 transition-colors">
                {isAr ? 'الأسعار' : 'Tarifs'}
              </a>
              <a href="#faq" className="text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-600 transition-colors">
                {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
              </a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => setLang(isAr ? 'fr' : 'ar')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-300 hover:text-emerald-600 transition-all">
                <Globe size={14} />{isAr ? 'FR' : 'عر'}
              </button>
              <Link to="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-1.5">
                {isAr ? 'تسجيل الدخول' : 'Connexion'}
              </Link>
              <button onClick={() => setShowForm(true)}
                className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                {isAr ? 'سجّل تعاونيتك' : 'Inscrire ma coopérative'}
              </button>
            </div>

            <button className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400" onClick={() => setMenuOpen(v => !v)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-4 space-y-3">
            <Link to="/" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600 dark:text-gray-400 py-2">{isAr ? 'الرئيسية' : 'Accueil'}</Link>
            <a href="#how" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600 dark:text-gray-400 py-2">{isAr ? 'كيف يعمل' : 'Comment ça marche'}</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600 dark:text-gray-400 py-2">{isAr ? 'الأسعار' : 'Tarifs'}</a>
            <div className="pt-2 flex flex-col gap-2">
              <button onClick={() => { setLang(isAr ? 'fr' : 'ar'); setMenuOpen(false); }} className="flex items-center gap-2 text-sm text-gray-600 py-2">
                <Globe size={14} />{isAr ? 'Français' : 'العربية'}
              </button>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-center py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                {isAr ? 'تسجيل الدخول' : 'Connexion'}
              </Link>
              <button onClick={() => { setShowForm(true); setMenuOpen(false); }}
                className="block w-full text-center py-2.5 text-sm bg-emerald-600 text-white rounded-lg font-medium">
                {isAr ? 'سجّل تعاونيتك' : 'Inscrire ma coopérative'}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-16 overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-200 dark:bg-emerald-900/20 rounded-full blur-3xl opacity-40" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-200 dark:bg-teal-900/20 rounded-full blur-3xl opacity-30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white leading-tight mb-8">
              {isAr ? (
                <>أنتجوا فقط —<br /><span className="text-emerald-600">نحن نبيع منتجاتكم 🤝</span></>
              ) : (
                <>Produisez seulement —<br /><span className="text-emerald-600">nous vendons vos produits 🤝</span></>
              )}
            </h1>
          </div>

          {/* Banner image — right after the hero heading */}
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl shadow-emerald-200/40 dark:shadow-emerald-900/30 border border-white/70 dark:border-gray-700 mb-12">
            <img
              src={isAr ? '/nbnr.png' : '/nbffr.png'}
              alt={isAr ? 'منصتنا — للتعاونيات' : 'Minassatona — Coopératives'}
              className="w-full h-auto object-cover block"
            />
          </div>

          <div className="text-center max-w-3xl mx-auto">
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              {isAr
                ? 'منصة ذكية تُدير تعاونيتك بالكامل — الأعضاء، المكتب الإداري، الاجتماعات، المشاريع، الإنتاج والمالية — بدون خبرة تقنية، بدون تكاليف إضافية.'
                : 'Une plateforme intelligente qui gère votre coopérative de A à Z — membres, bureau administratif, réunions, projets, production et finances — sans compétence technique, sans frais supplémentaires.'}
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <button onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-2xl text-base shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                {isAr ? 'سجّل تعاونيتك مجاناً' : 'Inscrire ma coopérative gratuitement'}
                <ArrowRight size={18} className={isAr ? 'rotate-180' : ''} />
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              {(isAr
                ? ['✅ تجربة مجانية 15 يوم', '✅ بدون بطاقة بنكية', '✅ دعم بالعربية']
                : ['✅ 15 jours gratuits', '✅ Sans carte bancaire', '✅ Support en arabe']
              ).map((t, i) => <span key={i}>{t}</span>)}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-8 max-w-4xl mx-auto grid grid-cols-3 gap-4">
            {[
              { icon: '🤝', value: '+120', label: isAr ? 'تعاونية شريكة' : 'coopératives partenaires' },
              { icon: '📋', value: isAr ? 'محاضر' : 'PV', label: isAr ? 'اجتماعات موثقة' : 'réunions documentées' },
              { icon: '💰', value: isAr ? 'مالية' : 'Finances', label: isAr ? 'متابعة كاملة' : 'suivi complet' },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 text-center shadow-sm">
                <div className="text-3xl mb-2">{s.icon}</div>
                <p className="font-black text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <span className="inline-block bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {isAr ? 'كل ما تحتاجه تعاونيتك' : 'Tout ce dont votre coopérative a besoin'}
            </span>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
              {isAr ? 'تسيير ذكي — في منصة واحدة' : 'Gestion intelligente — en une seule plateforme'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-14">
              {isAr
                ? 'نظام تسيير متكامل لتعاونيتك — من الأعضاء إلى المالية، مروراً بالاجتماعات والإنتاج'
                : 'Un système de gestion complet pour votre coopérative — des membres aux finances, en passant par les réunions et la production'}
            </p>
          </div>

          {/* Gestion column */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <p className="font-black text-gray-900 dark:text-white">
                    {isAr ? 'نظام التسيير' : 'Système de gestion'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isAr ? 'أدر تعاونيتك رقمياً بالكامل' : 'Gérez votre coopérative 100% digitalement'}
                  </p>
                </div>
              </div>
              <ul className="space-y-3">
                {(isAr ? [
                  { icon: <Users size={15} />, text: 'إدارة الأعضاء، الانخراطات، والمدفوعات' },
                  { icon: <Package size={15} />, text: 'المنتجات والمخزون وحركة البضاعة' },
                  { icon: <ShoppingCart size={15} />, text: 'متابعة الطلبيات والمبيعات لحظة بلحظة' },
                  { icon: <TrendingUp size={15} />, text: 'تقارير الأرباح الصافية بصيغة PDF' },
                  { icon: <Shield size={15} />, text: 'المالية الكاملة — إيرادات، مصاريف، رصيد' },
                  { icon: <BarChart2 size={15} />, text: 'الاجتماعات والمحاضر والوثائق الرسمية' },
                ] : [
                  { icon: <Users size={15} />, text: 'Membres, adhésions & paiements' },
                  { icon: <Package size={15} />, text: 'Produits, stock & mouvements de marchandises' },
                  { icon: <ShoppingCart size={15} />, text: 'Suivi commandes & ventes en temps réel' },
                  { icon: <TrendingUp size={15} />, text: 'Rapports de bénéfices nets en PDF' },
                  { icon: <Shield size={15} />, text: 'Finances complètes — recettes, dépenses, solde' },
                  { icon: <BarChart2 size={15} />, text: 'Réunions, PV & documents officiels' },
                ]).map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-blue-500 flex-shrink-0">{item.icon}</span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom tagline */}
          <p className="text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {isAr
              ? '🤝 كل ما تحتاجه تعاونيتك، في مكان واحد'
              : '🤝 Tout ce dont votre coopérative a besoin, au même endroit'}
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
              {isAr ? 'كيف يعمل النظام؟ — 3 خطوات فقط' : '3 étapes seulement'}
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {(isAr ? [
              { icon: '✅', title: 'سجّل تعاونيتك', desc: 'أنشئ حسابك، أضف معلومات تعاونيتك، واحصل على الموافقة — في دقائق' },
              { icon: '👥', title: 'أضف الأعضاء والمكتب', desc: 'أضف الأعضاء، حدّد المكتب الإداري (الرئيس، الكاتب، الأمين...) وباقي المعلومات' },
              { icon: '📊', title: 'سيّر تعاونيتك يومياً', desc: 'الاجتماعات، المحاضر، المشاريع، الإنتاج، والمالية — كل شيء من لوحة تحكم واحدة' },
            ] : [
              { icon: '✅', title: 'Inscrivez votre coopérative', desc: 'Créez votre compte, ajoutez les informations de votre coopérative, obtenez l\'approbation — en quelques minutes' },
              { icon: '👥', title: 'Ajoutez membres & bureau', desc: 'Ajoutez vos adhérents, définissez le bureau administratif (président, secrétaire, trésorier...) et le reste' },
              { icon: '📊', title: 'Gérez au quotidien', desc: 'Réunions, PV, projets, production et finances — tout depuis un seul tableau de bord' },
            ]).map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700">
                <div className="text-5xl mb-5">{s.icon}</div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">{s.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ── */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
              {isAr ? 'هل تعاني من هذه المشاكل؟' : 'Souffrez-vous de ces problèmes ?'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {isAr ? 'المشكلة الكبرى لكل تعاونية: التسيير الإداري والمالي مبعثر وصعب التتبع' : 'Le vrai défi : une gestion administrative et financière éparpillée, difficile à suivre'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">😰</span>
                <h3 className="font-bold text-red-800 dark:text-red-300 text-lg">{isAr ? 'قبل المنصة' : 'Avant la plateforme'}</h3>
              </div>
              <ul className="space-y-3">
                {(isAr ? [
                  'وثائق ومحاضر مبعثرة بين الأوراق والملفات',
                  'صعوبة تتبع من دفع ومن لم يدفع',
                  'لا وجود رقمي — لا تسيير موحّد للأعضاء والمكتب',
                  'حساب المالية والإنتاج يدوياً وبدون تقارير دقيقة',
                  'ضياع الوقت في الإدارة بدل التركيز على التعاونية',
                ] : [
                  'Documents et PV éparpillés entre papiers et dossiers',
                  'Difficile de suivre qui a payé et qui ne l\'a pas fait',
                  'Aucune gestion digitale unifiée des membres et du bureau',
                  'Finances et production calculées à la main, sans rapports précis',
                  'Temps perdu en gestion administrative',
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-red-700 dark:text-red-300">
                    <span className="text-red-400 mt-0.5 flex-shrink-0 font-bold">✗</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🚀</span>
                <h3 className="font-bold text-emerald-800 dark:text-emerald-300 text-lg">{isAr ? 'مع منصتنا' : 'Avec notre plateforme'}</h3>
              </div>
              <ul className="space-y-3">
                {(isAr ? [
                  'كل الأعضاء والمكتب الإداري في مكان واحد',
                  'محاضر الاجتماعات تُنشأ وتُحفظ تلقائياً',
                  'تتبع المالية والانخراطات والمدفوعات في الوقت الفعلي',
                  'تتبع الإنتاج والمخزون والمبيعات بدقة',
                  'تقارير جاهزة بصيغة PDF في أي وقت',
                ] : [
                  'Tous les membres et le bureau administratif au même endroit',
                  'Les PV de réunions sont générés et archivés automatiquement',
                  'Suivi des finances, adhésions et paiements en temps réel',
                  'Suivi précis de la production, du stock et des ventes',
                  'Rapports PDF prêts à tout moment',
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            {isAr ? 'الأسعار' : 'Tarifs'}
          </span>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
            {isAr ? 'باقة واحدة — كل شيء متاح' : 'Un seul pack — tout inclus'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-10">
            💡 {isAr ? 'بثمن انخراط فرد واحد تستفيد من كامل المنصة' : 'Pour le prix d\'une adhésion, toute la plateforme est à vous'}
          </p>

          {/* Single pricing card */}
          <div className="relative rounded-3xl border-2 border-emerald-400 shadow-2xl overflow-hidden bg-white dark:bg-gray-900 text-right mx-auto max-w-md">
            <div className="bg-emerald-600 text-white text-xs font-bold text-center py-2.5 tracking-wide">
              {isAr ? '⭐ الباقة الوحيدة — وصول كامل' : '⭐ Pack unique — accès complet'}
            </div>
            <div className="p-8">
              {/* Price */}
              <div className="flex items-baseline gap-1 justify-center mb-2">
                <span className="text-6xl font-black text-gray-900 dark:text-white">70</span>
                <span className="text-gray-500 dark:text-gray-400 text-lg">{isAr ? ' د.م/شهر' : ' MAD/mois'}</span>
              </div>
              <p className="text-center text-xs text-gray-400 mb-8">
                {isAr ? 'تجربة مجانية 15 يوم · بدون بطاقة بنكية' : 'Essai gratuit 15 jours · Sans carte bancaire'}
              </p>

              {/* What you get — management value */}
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3 text-center">
                {isAr ? 'ماذا تشمل الباقة' : 'Ce que comprend le pack'}
              </p>
              <ul className="space-y-2.5 mb-8">
                {(isAr ? [
                  'إدارة الأعضاء والانخراطات والمدفوعات',
                  'المالية الكاملة — إيرادات، مصاريف، تقارير',
                  'الاجتماعات والمحاضر والقرارات',
                  'إدارة الوثائق والملفات الرسمية',
                  'المنتجات والمخزون وحركة البضاعة',
                  'متابعة الطلبيات والمبيعات في الوقت الفعلي',
                  'تقارير الأرباح بصيغة PDF',
                  'الممتلكات: عقارات، سيارات، تجهيزات',
                  'دعم بالعربية على واتساب',
                ] : [
                  'Gestion membres, adhésions & paiements',
                  'Finances complètes — recettes, dépenses, rapports',
                  'Réunions, PV et décisions',
                  'Documents & dossiers officiels',
                  'Produits, stock & mouvements de marchandises',
                  'Suivi commandes & ventes en temps réel',
                  'Rapports de bénéfices en PDF',
                  'Actifs : immobilier, véhicules, équipements',
                  'Support en arabe via WhatsApp',
                ]).map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>

              <button onClick={() => setShowForm(true)}
                className="w-full py-4 rounded-2xl font-black text-base bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-lg hover:-translate-y-0.5">
                {isAr ? 'ابدأ مجاناً ←' : 'Commencer gratuitement →'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white text-center mb-12">
            {isAr ? 'الأسئلة الشائعة' : 'Questions fréquentes'}
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <button className="w-full flex items-center justify-between px-6 py-4 text-right" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{faq.q}</span>
                  <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <div className="px-6 pb-4 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 to-teal-700 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-black mb-4">{isAr ? 'ابدأ اليوم — مجاناً' : 'Commencez aujourd\'hui — gratuitement'}</h2>
          <p className="text-emerald-100 mb-8">{isAr ? 'تجربة مجانية 15 يوم · بدون بطاقة بنكية · دعم بالعربية' : '15 jours gratuits · Sans carte bancaire · Support en arabe'}</p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-8 py-4 rounded-2xl text-base hover:shadow-xl transition-all hover:-translate-y-0.5">
            {isAr ? 'سجّل تعاونيتك الآن ←' : 'Inscrire ma coopérative →'}
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-white py-10 px-4 text-center text-sm text-gray-400">
        <p className="mb-2">Minassatona · {isAr ? 'للتعاونيات والجمعيات المغربية' : 'Pour les coopératives & associations marocaines'}</p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link to="/" className="hover:text-white">{isAr ? 'الرئيسية' : 'Accueil'}</Link>
          <Link to="/login" className="hover:text-white">{isAr ? 'تسجيل الدخول' : 'Connexion'}</Link>
          <Link to="/privacy" className="hover:text-white">{isAr ? 'الخصوصية' : 'Confidentialité'}</Link>
        </div>
      </footer>

      {/* ── REGISTRATION MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir={dir}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">{isAr ? 'تسجيل تعاونيتك' : 'Inscrire votre coopérative'}</h2>
                  <p className="text-emerald-100 text-xs mt-0.5">{isAr ? 'تجربة مجانية 15 يوم — بدون التزام' : 'Essai gratuit 15 jours — sans engagement'}</p>
                </div>
                <button onClick={() => { setShowForm(false); setFormStep(1); setSubmitError(''); }}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>
              {/* Steps */}
              <div className="flex items-center gap-2 mt-4">
                {[1, 2].map(s => (
                  <div key={s} className={`flex items-center gap-2 ${s < 2 ? 'flex-1' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${formStep >= s ? 'bg-white text-emerald-600' : 'bg-white/30 text-white'}`}>{s}</div>
                    <span className="text-xs text-emerald-100 hidden sm:block">
                      {s === 1 ? (isAr ? 'معلومات التعاونية' : 'Infos coopérative') : (isAr ? 'حساب المسؤول' : 'Compte responsable')}
                    </span>
                    {s < 2 && <div className={`flex-1 h-0.5 rounded-full ${formStep > s ? 'bg-white' : 'bg-white/30'}`} />}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={formStep === 1 ? (e) => { e.preventDefault(); setFormStep(2); } : handleSubmit}
              className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">

              {formStep === 1 ? (
                <>
                  <div>
                    <label className={lbl}>{isAr ? 'اسم التعاونية *' : 'Nom de la coopérative *'}</label>
                    <input className={inp} required value={form.coopName} onChange={e => set('coopName', e.target.value)}
                      placeholder={isAr ? 'تعاونية الأطلس للزيتون...' : 'Coopérative Atlas Olive...'} />
                  </div>
                  <div>
                    <label className={lbl}>{isAr ? 'نوع النشاط *' : 'Type d\'activité *'}</label>
                    <select className={inp} required value={form.coopType} onChange={e => set('coopType', e.target.value)}>
                      <option value="">{isAr ? '-- اختر نوع التعاونية --' : '-- Choisir le type --'}</option>
                      {(isAr ? COOP_TYPES_AR : COOP_TYPES_FR).map((t, i) => (
                        <option key={i} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>{isAr ? 'المدينة *' : 'Ville *'}</label>
                      <input className={inp} required value={form.coopCity} onChange={e => set('coopCity', e.target.value)}
                        placeholder={isAr ? 'مراكش' : 'Marrakech'} />
                    </div>
                    <div>
                      <label className={lbl}>{isAr ? 'الجهة' : 'Région'}</label>
                      <input className={inp} value={form.coopRegion} onChange={e => set('coopRegion', e.target.value)}
                        placeholder={isAr ? 'سوس ماسة' : 'Souss-Massa'} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>{isAr ? 'عدد الأعضاء' : 'Nombre de membres'}</label>
                      <input className={inp} type="number" min="1" value={form.membersCount} onChange={e => set('membersCount', e.target.value)}
                        placeholder="12" />
                    </div>
                    <div>
                      <label className={lbl}>{isAr ? 'رقم الهاتف *' : 'Téléphone *'}</label>
                      <input className={inp} required type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                        placeholder="06XXXXXXXX" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={lbl}>{isAr ? 'اسم المسؤول *' : 'Nom du responsable *'}</label>
                    <input className={inp} required value={form.adminName} onChange={e => set('adminName', e.target.value)}
                      placeholder={isAr ? 'محمد الأمين...' : 'Mohammed El Amine...'} />
                  </div>
                  <div>
                    <label className={lbl}>{isAr ? 'البريد الإلكتروني *' : 'Email *'}</label>
                    <input className={inp} required type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)}
                      placeholder="coop@example.com" />
                  </div>
                  <div>
                    <label className={lbl}>{isAr ? 'كلمة المرور *' : 'Mot de passe *'}</label>
                    <input className={inp} required type="password" minLength={6} value={form.password} onChange={e => set('password', e.target.value)}
                      placeholder="••••••••" />
                  </div>
                  <div>
                    <label className={lbl}>{isAr ? 'تأكيد كلمة المرور *' : 'Confirmer le mot de passe *'}</label>
                    <input className={inp} required type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                      placeholder="••••••••" />
                  </div>
                  {submitError && (
                    <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{submitError}</p>
                  )}
                </>
              )}
            </form>

            <div className="px-6 pb-6 flex gap-3">
              {formStep === 2 && (
                <button type="button" onClick={() => setFormStep(1)}
                  className="flex-1 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  {isAr ? '← رجوع' : '← Retour'}
                </button>
              )}
              <button
                onClick={formStep === 1 ? (e: any) => { e.preventDefault(); if (form.coopName && form.coopType && form.coopCity && form.phone) setFormStep(2); } : handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                {submitting
                  ? (isAr ? 'جاري التسجيل...' : 'Inscription...')
                  : formStep === 1
                    ? (isAr ? 'التالي ←' : 'Suivant →')
                    : (isAr ? '✅ إنشاء الحساب' : '✅ Créer le compte')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
