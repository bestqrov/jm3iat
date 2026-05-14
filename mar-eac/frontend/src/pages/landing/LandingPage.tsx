import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, DollarSign, BarChart2, Droplets, Bus, Factory,
  CheckCircle, ChevronDown, Globe, Menu, X, ArrowRight,
  Star, Zap, Shield, TrendingUp, AlertCircle, LucideIcon,
  Layers, FileText, MapPin, Network, Scale, ClipboardList,
  CreditCard, Package, UserPlus, Sparkles, Trophy, Crown,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const iconMap: Record<string, LucideIcon> = {
  Users, DollarSign, BarChart2, Droplets, Bus, Factory, Layers, FileText,
  MapPin, Network, Scale, ClipboardList, CreditCard, Package, UserPlus, Trophy, Crown,
};

export const LandingPage: React.FC = () => {
  const { lang, dir, t, setLang } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [plan3Y, setPlan3Y] = useState(false);

  const isAr = lang === 'ar';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const lp = (key: string) => t(`landing.${key}`);

  const features = isAr
    ? [
        { icon: 'Users',        title: 'إدارة الأعضاء',               desc: 'سجل وتابع أعضاءك، انخراطاتهم، ومستحقاتهم بسهولة تامة',                    soon: false, isNew: false },
        { icon: 'UserPlus',     title: 'طلب الانضمام الإلكتروني',       desc: 'نموذج انضمام عبر الإنترنت مع رفع وصل الدفع واختيار قناة الإشعار',           soon: false, isNew: true },
        { icon: 'CreditCard',   title: 'بطاقة المنخرط الرقمية',         desc: 'توليد بطاقة عضوية احترافية بشكل تلقائي عند قبول الانضمام',                  soon: false, isNew: true },
        { icon: 'DollarSign',   title: 'المالية',                       desc: 'تتبع الإيرادات والمصاريف وأنشئ تقارير مالية احترافية',                       soon: false, isNew: false },
        { icon: 'BarChart2',    title: 'التقارير',                      desc: 'تقارير تفصيلية وإحصائيات فورية عن نشاط جمعيتك بالعربية والفرنسية',           soon: false, isNew: false },
        { icon: 'Package',      title: 'الممتلكات',                     desc: 'تسيير الأصول والممتلكات: عقارات، سيارات، تجهيزات بشكل منظم',                 soon: false, isNew: true },
        { icon: 'ClipboardList',title: 'البطاقة التقنية للمشاريع',      desc: 'توليد البطاقة التقنية لأي مشروع تلقائياً بصيغة PDF',                         soon: false, isNew: true },
        { icon: 'Droplets',     title: 'إدارة الماء',                   desc: 'إدارة شبكة المياه، الفواتير، والقراءات بكل دقة',                             soon: false, isNew: false },
        { icon: 'Factory',      title: 'الإنتاج والمبيعات',             desc: 'إدارة الإنتاج والمبيعات والمخزون للجمعيات الإنتاجية',                        soon: false, isNew: false },
        { icon: 'Network',      title: 'الشراكات والاتفاقيات',          desc: 'تدبير عقود الشراكة والاتفاقيات مع الجهات الخارجية',                           soon: true,  isNew: false },
        { icon: 'MapPin',       title: 'الخرائط الميدانية (GIS)',       desc: 'تتبع العمليات الميدانية وشبكة الماء على الخريطة',                             soon: true,  isNew: false },
        { icon: 'Scale',        title: 'نصاب الجمع العام',              desc: 'احتساب النصاب القانوني وإدارة تصويتات الجمع العام',                           soon: true,  isNew: false },
      ]
    : [
        { icon: 'Users',        title: 'Gestion des membres',           desc: 'Enregistrez et suivez vos membres, cotisations et adhésions facilement',       soon: false, isNew: false },
        { icon: 'UserPlus',     title: 'Adhésion en ligne',             desc: 'Formulaire d\'adhésion en ligne avec upload du reçu et choix du canal de notification', soon: false, isNew: true },
        { icon: 'CreditCard',   title: 'Carte d\'adhérent numérique',   desc: 'Génération automatique d\'une carte de membre professionnelle à l\'approbation',  soon: false, isNew: true },
        { icon: 'DollarSign',   title: 'Finances',                      desc: 'Suivez revenus et dépenses, générez des rapports financiers professionnels',      soon: false, isNew: false },
        { icon: 'BarChart2',    title: 'Rapports',                      desc: 'Rapports détaillés en arabe et français avec mise en page professionnelle',       soon: false, isNew: false },
        { icon: 'Package',      title: 'Gestion des actifs',            desc: 'Gérez immobilier, véhicules et équipements de manière organisée',                 soon: false, isNew: true },
        { icon: 'ClipboardList',title: 'Fiche technique de projet',     desc: 'Génération automatique de la fiche technique en PDF pour tout projet',            soon: false, isNew: true },
        { icon: 'Droplets',     title: "Gestion de l'eau",              desc: "Gérez le réseau d'eau, factures et relevés avec précision",                       soon: false, isNew: false },
        { icon: 'Factory',      title: 'Production & Ventes',           desc: 'Gérez production, ventes et stocks pour les associations productives',             soon: false, isNew: false },
        { icon: 'Network',      title: 'Partenariats & conventions',    desc: 'Gérez contrats de partenariat et conventions avec organismes externes',             soon: true,  isNew: false },
        { icon: 'MapPin',       title: 'Cartographie terrain (GIS)',    desc: "Suivez opérations terrain et réseau d'eau sur carte interactive",                  soon: true,  isNew: false },
        { icon: 'Scale',        title: "Quorum — Assemblée Générale",   desc: 'Calcul du quorum légal et gestion des votes en assemblée générale',                soon: true,  isNew: false },
      ];

  const pricingPacks = isAr
    ? [
        {
          key: 'REGULAR',
          icon: 'FileText',
          name: 'جمعية عادية',
          price: '50',
          desc: 'الأعضاء، الاجتماعات، المالية، الوثائق',
          features: [
            'إدارة الأعضاء',
            '✨ طلب الانضمام الإلكتروني',
            '✨ بطاقة المنخرط الرقمية',
            'الاجتماعات والمحاضر',
            'المالية والفواتير',
            'الوثائق والتقارير',
          ],
          popular: false,
          color: 'blue',
        },
        {
          key: 'PROJECTS',
          icon: 'BarChart2',
          name: 'جمعية المشاريع',
          price: '100',
          desc: 'الوحدات الأساسية + إدارة المشاريع والطلبات والممتلكات',
          features: [
            'كل مميزات الجمعية العادية',
            'إدارة المشاريع',
            '✨ الممتلكات (عقارات، سيارات…)',
            '✨ البطاقة التقنية للمشاريع',
            'متابعة الطلبات',
            'تقارير بالعربية والفرنسية',
          ],
          popular: false,
          color: 'indigo',
        },
        {
          key: 'WATER',
          icon: 'Droplets',
          name: 'جمعية تدبير الماء',
          price: '100',
          desc: 'الوحدات الأساسية + إدارة شبكة الماء والفواتير',
          features: [
            'كل مميزات الجمعية العادية',
            'إدارة شبكة الماء',
            'قراءة العدادات',
            'فواتير الماء',
            'تقارير استهلاك الماء',
          ],
          popular: false,
          color: 'cyan',
        },
        {
          key: 'PRODUCTIVE',
          icon: 'Factory',
          name: 'جمعية إنتاجية',
          price: '100',
          desc: 'الوحدات الأساسية + الإنتاج والمبيعات والعملاء',
          features: [
            'كل مميزات الجمعية العادية',
            'إدارة المشاريع والممتلكات',
            'إدارة الإنتاج',
            'المبيعات والعملاء',
            'الفعاليات',
          ],
          popular: false,
          color: 'green',
        },
        {
          key: 'SPORTIF',
          icon: 'Trophy',
          name: 'جمعية رياضية',
          price: '100',
          desc: 'الوحدات الأساسية + تسيير الرياضيين والتدريبات والمنافسات',
          features: [
            'كل مميزات الجمعية العادية',
            'إدارة الرياضيين والفرق',
            'جدولة التدريبات والمباريات',
            'إدارة التراخيص الرياضية',
            'نتائج المنافسات والترتيب',
            'المعدات الرياضية',
          ],
          popular: false,
          color: 'orange',
        },
        {
          key: 'PRO',
          icon: 'Crown',
          name: 'باقة PRO',
          price: '250',
          desc: 'جميع الوحدات بدون استثناء — للجمعيات الكبيرة والمتعددة النشاطات',
          features: [
            '✨ كل مميزات جميع الباقات',
            'إدارة المشاريع والممتلكات',
            'إدارة شبكة الماء',
            'إدارة الإنتاج والمبيعات',
            'الفعاليات والتذاكر',
            'النقل المدرسي مجاناً',
            'دعم أولوي 24/7',
          ],
          popular: true,
          color: 'gold',
        },
      ]
    : [
        {
          key: 'REGULAR',
          icon: 'FileText',
          name: 'Association classique',
          price: '50',
          desc: 'Membres, réunions, finances, documents',
          features: [
            'Gestion des membres',
            '✨ Adhésion en ligne',
            '✨ Carte d\'adhérent numérique',
            'Réunions & procès-verbaux',
            'Finances & factures',
            'Documents & rapports',
          ],
          popular: false,
          color: 'blue',
        },
        {
          key: 'PROJECTS',
          icon: 'BarChart2',
          name: 'Association de projets',
          price: '100',
          desc: 'Modules de base + projets, demandes et actifs',
          features: [
            'Tout le pack classique',
            'Gestion de projets',
            '✨ Actifs (immobilier, véhicules…)',
            '✨ Fiche technique de projet PDF',
            'Suivi des demandes',
            'Rapports en arabe & français',
          ],
          popular: false,
          color: 'indigo',
        },
        {
          key: 'WATER',
          icon: 'Droplets',
          name: "Association de l'eau",
          price: '100',
          desc: "Modules de base + réseau d'eau et facturation",
          features: [
            'Tout le pack classique',
            "Réseau d'eau",
            'Relevés de compteurs',
            'Factures eau',
            'Rapports de consommation',
          ],
          popular: false,
          color: 'cyan',
        },
        {
          key: 'PRODUCTIVE',
          icon: 'Factory',
          name: 'Association productive',
          price: '100',
          desc: 'Modules de base + production, ventes, clients',
          features: [
            'Tout le pack classique',
            'Projets & actifs',
            'Gestion de production',
            'Ventes & clients',
            'Événements',
          ],
          popular: false,
          color: 'green',
        },
        {
          key: 'SPORTIF',
          icon: 'Trophy',
          name: 'Association sportive',
          price: '100',
          desc: 'Modules de base + sportifs, entraînements et compétitions',
          features: [
            'Tout le pack classique',
            'Gestion des sportifs & équipes',
            'Planning entraînements & matchs',
            'Licences sportives',
            'Résultats & classements',
            'Matériel sportif',
          ],
          popular: false,
          color: 'orange',
        },
        {
          key: 'PRO',
          icon: 'Crown',
          name: 'Pack PRO',
          price: '250',
          desc: 'Tous les modules sans exception — pour les grandes associations multi-activités',
          features: [
            '✨ Tout le contenu de tous les packs',
            'Projets & actifs',
            "Réseau d'eau",
            'Production & ventes',
            'Événements & billetterie',
            'Transport scolaire offert',
            'Support prioritaire 24/7',
          ],
          popular: true,
          color: 'gold',
        },
      ];

  const paymentSteps = isAr
    ? [
        { num: '1', title: 'اختر الباقة', desc: 'حدد الباقة المناسبة لحجم جمعيتك' },
        { num: '2', title: 'قم بالدفع', desc: 'حوّل المبلغ عبر البنك أو CashPlus' },
        { num: '3', title: 'أرسل الوصل', desc: 'ارفع صورة وصل الدفع في المنصة' },
        { num: '4', title: 'يتم التفعيل', desc: 'يتم التحقق وتفعيل حسابك خلال 24 ساعة' },
      ]
    : [
        { num: '1', title: 'Choisissez un pack', desc: 'Sélectionnez le pack adapté à votre association' },
        { num: '2', title: 'Effectuez le paiement', desc: 'Transférez le montant via banque ou CashPlus' },
        { num: '3', title: 'Envoyez le reçu', desc: 'Téléchargez la photo du reçu sur la plateforme' },
        { num: '4', title: 'Activation', desc: 'Vérification et activation sous 24 heures' },
      ];

  const testimonials = isAr
    ? [
        { name: 'محمد الإدريسي', role: 'رئيس جمعية التنمية — مراكش', text: 'جمعيتي غيّر طريقة عملنا بالكامل. كنا نضيع ساعات في الأوراق، الآن كل شيء في مكان واحد.', stars: 5 },
        { name: 'فاطمة بنعلي', role: 'مسؤولة مالية — جمعية الأمل، أكادير', text: 'التقارير المالية أصبحت تأخذ دقائق بدلاً من أيام. ممتاز جداً!', stars: 5 },
        { name: 'يوسف الحسني', role: 'مدير جمعية الماء — تيزنيت', text: 'وحدة إدارة وتدبير الماء رائعة، تتبع الفواتير والقراءات أصبح سهلاً جداً.', stars: 5 },
      ]
    : [
        { name: 'Mohammed El Idrissi', role: 'Président — Association Développement, Marrakech', text: "Minassatona a transformé notre façon de travailler. On perdait des heures en paperasse, maintenant tout est centralisé.", stars: 5 },
        { name: 'Fatima Benali', role: 'Responsable financière — Association Espoir, Agadir', text: 'Les rapports financiers prennent maintenant des minutes au lieu de journées. Excellent !', stars: 5 },
        { name: 'Youssef El Hassani', role: "Directeur — Association de l'eau, Tiznit", text: "Le module de gestion d'eau est remarquable, le suivi est devenu très simple.", stars: 5 },
      ];

  const faqItems = isAr
    ? [
        { q: 'هل هناك تجربة مجانية؟', a: 'نعم! تحصل على 15 يوماً مجانية كاملة بدون التزام وبدون بطاقة ائتمانية.' },
        { q: 'كيف يتم الدفع؟', a: 'الدفع يتم عبر تحويل بنكي أو CashPlus. بعد الدفع ترسل الوصل ويتم التفعيل في اقل من 4 ساعات.' },
        { q: 'ما هي مدة الاشتراك؟', a: 'مدة الاشتراك 3 سنوات. ستتلقى تنبيهاً قبل شهر من انتهاء صلاحية اشتراكك لتجديده في الوقت المناسب.' },
        { q: 'هل النظام سهل الاستخدام؟', a: 'نعم، تم تصميمه خصيصاً ليكون بسيطاً ومريحاً. معظم المستخدمين يبدأون بدون تدريب.' },
        { q: 'هل يمكنني تغيير الباقة لاحقاً؟', a: 'بالتأكيد! يمكنك الترقية أو تغيير الباقة في أي وقت.' },
        { q: 'هل بياناتي آمنة؟', a: 'نعم، بياناتك مشفرة ومحمية. نسخ احتياطية تلقائية يومية.' },
      ]
    : [
        { q: 'Y a-t-il un essai gratuit ?', a: 'Oui ! Vous bénéficiez de 15 jours gratuits complets, sans engagement et sans carte bancaire.' },
        { q: 'Comment payer ?', a: "Le paiement s'effectue par virement bancaire ou CashPlus. Après paiement, envoyez le reçu et votre compte est activé en moins de 4 heures." },
        { q: "Quelle est la durée de l'abonnement ?", a: "L'abonnement est valable 3 ans. Vous recevrez une notification un mois avant l'expiration pour renouveler en temps voulu." },
        { q: 'Est-ce facile à utiliser ?', a: 'Oui, conçu pour être simple et intuitif. La plupart des utilisateurs commencent sans formation.' },
        { q: 'Puis-je changer de pack plus tard ?', a: 'Absolument ! Vous pouvez mettre à niveau ou changer de pack à tout moment.' },
        { q: 'Mes données sont-elles sécurisées ?', a: 'Oui, vos données sont chiffrées et protégées. Sauvegardes automatiques quotidiennes.' },
      ];

  const problemItems = isAr
    ? [
        'ضياع الوثائق والسجلات المهمة',
        'أخطاء في الحسابات المالية',
        'صعوبة متابعة الأعضاء وانخراطاتهم',
        'تقارير يدوية تستغرق ساعات',
        'غياب الشفافية في القرارات',
      ]
    : [
        'Perte de documents et registres importants',
        'Erreurs dans les calculs financiers',
        'Difficulté à suivre les adhérents',
        'Rapports manuels qui prennent des heures',
        'Manque de transparence dans les décisions',
      ];

  const trialBenefits = isAr
    ? ['إعداد سريع في 5 دقائق', 'دعم تقني مجاني', 'تصدير بياناتك في أي وقت']
    : ['Configuration rapide en 5 minutes', 'Support technique gratuit', 'Exportez vos données à tout moment'];

  return (
    <div dir={dir} className={`min-h-screen bg-white dark:bg-gray-950 ${isAr ? 'font-[Cairo,sans-serif]' : 'font-sans'}`}>

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img src="/logo-saas.png" alt="Minassatona" className="h-9 w-9 object-contain" />
              <span className="font-bold text-xl text-gray-900 dark:text-white">Minassatona</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                {isAr ? 'المميزات' : 'Fonctionnalités'}
              </a>
              <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                {isAr ? 'الأسعار' : 'Tarifs'}
              </a>
              <a href="#faq" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
              </a>
              <Link to="/cooperatives" className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
                🌱 {isAr ? 'للتعاونيات' : 'Coopératives'}
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setLang(isAr ? 'fr' : 'ar')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300 hover:text-primary-600 transition-all"
              >
                <Globe size={14} />
                {isAr ? 'FR' : 'عر'}
              </button>
              <Link to="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-1.5">
                {isAr ? 'تسجيل الدخول' : 'Connexion'}
              </Link>
              <Link to="/register" className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                {isAr ? 'ابدأ مجاناً' : 'Essai gratuit'}
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600 dark:text-gray-400 py-2">{isAr ? 'المميزات' : 'Fonctionnalités'}</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600 dark:text-gray-400 py-2">{isAr ? 'الأسعار' : 'Tarifs'}</a>
            <a href="#faq" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600 dark:text-gray-400 py-2">{isAr ? 'الأسئلة الشائعة' : 'FAQ'}</a>
            <Link to="/cooperatives" onClick={() => setMenuOpen(false)} className="block text-sm text-emerald-600 dark:text-emerald-400 font-medium py-2">
              🌱 {isAr ? 'للتعاونيات' : 'Coopératives'}
            </Link>
            <div className="pt-2 flex flex-col gap-2">
              <button onClick={() => { setLang(isAr ? 'fr' : 'ar'); setMenuOpen(false); }} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 py-2">
                <Globe size={14} /> {isAr ? 'Passer en Français' : 'التبديل للعربية'}
              </button>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-center py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                {isAr ? 'تسجيل الدخول' : 'Connexion'}
              </Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="block text-center py-2.5 text-sm bg-primary-600 text-white rounded-lg font-medium">
                {isAr ? 'ابدأ مجاناً' : 'Essai gratuit'}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-16 overflow-hidden bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        {/* background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -start-40 w-80 h-80 bg-primary-200/30 dark:bg-primary-900/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -end-40 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-0 text-center">

          {/* ── Banner image — switches by language ── */}
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl shadow-primary-200/40 dark:shadow-primary-900/30 border border-white/70 dark:border-gray-700 mb-10">
            <img
              src={isAr ? '/nbnr.png' : '/nbffr.png'}
              alt={isAr ? 'منصتنا — لوحة التحكم' : 'Minassatona — Tableau de bord'}
              className="w-full h-auto object-cover block"
            />
          </div>

          {/* Badge */}
          <div className={`inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 text-sm font-medium px-4 py-2 rounded-full mb-6 ${isAr ? 'flex-row-reverse' : ''}`}>
            <Zap size={14} className="text-primary-500" />
            {isAr ? 'تجربة مجانية 15 يوم — بدون بطاقة ائتمانية' : 'Essai gratuit 15 jours — sans carte bancaire'}
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-5">
            {isAr ? (
              <>
                سيّر جمعيتك بسهولة مع{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600">جمعيتي</span>
              </>
            ) : (
              <>
                Gérez votre association avec{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600">Minassatona</span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {isAr
              ? 'منصة رقمية لإدارة الأعضاء، المالية، والتقارير بكل سهولة'
              : 'Une plateforme digitale pour gérer membres, finances et rapports en toute simplicité'}
          </p>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 ${isAr ? 'sm:flex-row-reverse' : ''}`}>
            <Link
              to="/register"
              className="group flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-7 py-3.5 rounded-xl font-semibold text-base shadow-lg shadow-primary-200 dark:shadow-primary-900/30 hover:shadow-xl transition-all duration-200"
            >
              {!isAr && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1 -order-1" />}
              {isAr ? 'ابدأ تجربة مجانية (15 يوم)' : 'Essai gratuit (15 jours)'}
              {isAr && <ArrowRight size={18} className="rotate-180" />}
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-7 py-3.5 rounded-xl font-semibold text-base border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {isAr ? 'شاهد العرض' : 'Voir la démo'}
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pb-16">
            {[
              { value: '+200', label: isAr ? 'جمعية نشطة' : 'Associations actives' },
              { value: '15', label: isAr ? 'يوم مجاناً' : 'Jours gratuits' },
              { value: '100%', label: isAr ? 'دعم تقني' : 'Support technique' },
            ].map((s, i) => (
              <div key={i} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{s.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* scroll indicator */}
        <div className="flex justify-center pb-6 animate-bounce">
          <ChevronDown size={24} className="text-gray-400 dark:text-gray-600" />
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="py-24 bg-red-50 dark:bg-red-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                {isAr ? 'المشكلة' : 'Le problème'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {isAr ? 'تعبت من الفوضى الورقية؟' : 'Fatigué de la gestion papier ?'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                {isAr
                  ? 'الجمعيات التي تعتمد على الأوراق تعاني يومياً من'
                  : 'Les associations qui utilisent le papier souffrent quotidiennement de'}
              </p>
              <ul className="space-y-3">
                {problemItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual */}
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
                <div className="space-y-3">
                  {[
                    { label: isAr ? 'وثائق مفقودة' : 'Documents perdus', pct: 78 },
                    { label: isAr ? 'أخطاء مالية' : 'Erreurs financières', pct: 64 },
                    { label: isAr ? 'وقت ضائع' : 'Temps perdu', pct: 85 },
                  ].map((bar, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{bar.label}</span>
                        <span className="text-red-500 font-medium">{bar.pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full" style={{ width: `${bar.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-center text-gray-400">
                  {isAr ? 'مشاكل الإدارة الورقية' : 'Problèmes de gestion papier'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOLUTION ── */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            {isAr ? 'الحل' : 'La solution'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {isAr ? 'جمعيتي يحول التسيير لنظام رقمي' : 'Minassatona transforme votre gestion en système digital'}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-16">
            {isAr ? 'نظام شامل يجمع كل احتياجات جمعيتك في مكان واحد' : 'Un système complet qui regroupe tous vos besoins en un seul endroit'}
          </p>

          {/* Before → After */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-2xl p-6 text-start">
              <div className="text-red-500 font-bold text-sm mb-4 flex items-center gap-2">
                <X size={16} /> {isAr ? 'قبل جمعيتي' : 'Avant Minassatona'}
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {(isAr
                  ? ['أوراق في كل مكان', 'ضياع البيانات', 'تقارير يدوية', 'انعدام الشفافية', 'وقت ضائع']
                  : ['Papiers partout', 'Perte de données', 'Rapports manuels', 'Pas de transparence', 'Temps perdu']
                ).map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 rounded-2xl p-6 text-start">
              <div className="text-green-600 font-bold text-sm mb-4 flex items-center gap-2">
                <CheckCircle size={16} /> {isAr ? 'مع جمعيتي' : 'Avec Minassatona'}
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {(isAr
                  ? [
                      'كل شيء رقمي ومنظم',
                      'بيانات محفوظة وآمنة',
                      'تقارير تلقائية بالعربية والفرنسية',
                      'طلب انضمام إلكتروني مع إشعار فوري',
                      'بطاقة منخرط رقمية تلقائية',
                      'شفافية كاملة وتوفير الوقت',
                    ]
                  : [
                      'Tout est numérique et organisé',
                      'Données sauvegardées et sécurisées',
                      'Rapports automatiques en arabe et français',
                      'Adhésion en ligne avec notification instantanée',
                      'Carte d\'adhérent numérique automatique',
                      'Transparence totale et gain de temps',
                    ]
                ).map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {isAr ? 'المميزات' : 'Fonctionnalités'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {isAr ? 'كل ما تحتاجه جمعيتك' : 'Tout ce dont votre association a besoin'}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
              {isAr
                ? 'مميزات متكاملة مصممة خصيصاً لإدارة الجمعيات المغربية'
                : 'Des fonctionnalités complètes conçues spécialement pour les associations marocaines'}
            </p>
            {/* New features highlight strip */}
            <div className={`inline-flex flex-wrap justify-center gap-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl px-5 py-3`}>
              <span className="flex items-center gap-1.5 text-xs font-bold text-primary-700 dark:text-primary-300">
                <Sparkles size={13} />
                {isAr ? 'مستجدات المنصة:' : 'Nouveautés :'}
              </span>
              {(isAr
                ? [
                    '🛒 التجارة الإلكترونية',
                    '🏪 متجر عام للتعاونيات',
                    '📦 إدارة المخزون والطلبيات',
                    '💰 تتبع الأرباح والمدفوعات',
                    '📋 البطاقة التقنية للمشاريع',
                    '🔧 اختيار متعدد لنوع الجمعية',
                  ]
                : [
                    '🛒 Module Commerce',
                    '🏪 Boutique publique coopératives',
                    '📦 Stocks & commandes',
                    '💰 Suivi bénéfices & paiements',
                    '📋 Fiche technique projets PDF',
                    '🔧 Multi-sélection type association',
                  ]
              ).map((label, i) => (
                <span key={i} className="text-xs bg-white dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700 px-2.5 py-1 rounded-full font-medium">
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = iconMap[feature.icon] || Users;
              const colors = [
                'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
                'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',
                'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
                'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
              ];
              return (
                <div key={i} className={`relative group bg-white dark:bg-gray-800 rounded-2xl p-6 border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ${feature.soon ? 'border-dashed border-gray-200 dark:border-gray-600 opacity-80' : feature.isNew ? 'border-primary-200 dark:border-primary-800' : 'border-gray-100 dark:border-gray-700'}`}>
                  {feature.soon && (
                    <span className="absolute top-3 end-3 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      {isAr ? 'قريباً' : 'Bientôt'}
                    </span>
                  )}
                  {feature.isNew && !feature.soon && (
                    <span className="absolute top-3 end-3 flex items-center gap-1 text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full">
                      <Sparkles size={9} />
                      {isAr ? 'جديد' : 'Nouveau'}
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colors[i % colors.length]}`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FREE TRIAL BANNER ── */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-700 dark:to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-6">
            {isAr ? 'تجربة مجانية' : 'Essai gratuit'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {isAr ? 'جرب النظام مجاناً لمدة 15 يوم' : 'Essayez gratuitement pendant 15 jours'}
          </h2>
          <p className="text-primary-100 text-lg mb-8">
            {isAr ? 'بدون التزام، بدون بطاقة ائتمانية — فقط سجّل وابدأ' : 'Sans engagement, sans carte bancaire — inscrivez-vous et commencez'}
          </p>
          <div className={`flex flex-wrap justify-center gap-4 mb-8 text-sm text-primary-100 ${isAr ? '' : ''}`}>
            {trialBenefits.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                <CheckCircle size={14} className="text-primary-200" /> {b}
              </span>
            ))}
          </div>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-primary-700 hover:bg-primary-50 px-8 py-3.5 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {!isAr && <ArrowRight size={18} className="-order-1" />}
            {isAr ? 'ابدأ الآن' : 'Commencer'}
            {isAr && <ArrowRight size={18} className="rotate-180" />}
          </Link>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {isAr ? 'الأسعار' : 'Tarifs'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              {isAr ? 'باقة عروض تناسب نوع و حجم جمعيتك' : 'Un pack adapté à votre type d\'association'}
            </h2>
            <p className="text-base font-semibold text-primary-600 dark:text-primary-400 mb-3">
              {isAr
                ? '💡 بثمن انخراط فرد واحد استفد من مميزات المنصة'
                : '💡 Pour le prix d\'une seule adhésion, profitez de toute la plateforme'}
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-6">
              {isAr
                ? 'اختر الباقة المناسبة — تجربة مجانية 15 يوم بدون التزام'
                : 'Choisissez votre pack — 15 jours d\'essai gratuit sans engagement'}
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 gap-1">
              <button
                onClick={() => setPlan3Y(false)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${!plan3Y ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                {isAr ? 'شهري' : 'Mensuel'}
              </button>
              <button
                onClick={() => setPlan3Y(true)}
                className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${plan3Y ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                {isAr ? '3 سنوات' : '3 ans'}
                <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">-35%</span>
              </button>
            </div>
            {plan3Y && (
              <p className="mt-3 text-xs text-green-600 dark:text-green-400 font-medium">
                {isAr
                  ? '⏳ مدة الاشتراك تتوافق مع دورة المكتب المسيّر للجمعية · تنبيه تجديد قبل شهر من الانتهاء'
                  : "⏳ Durée alignée sur le mandat du bureau directeur · Rappel de renouvellement 1 mois avant"}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {pricingPacks.map((pack, i) => {
              const Icon = iconMap[pack.icon] || FileText;
              const colorMap: Record<string, { icon: string; badge: string; border: string }> = {
                blue:   { icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', badge: 'bg-blue-600', border: 'border-blue-200 dark:border-blue-800' },
                indigo: { icon: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-600', border: 'border-indigo-200 dark:border-indigo-800' },
                cyan:   { icon: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400', badge: 'bg-cyan-600', border: 'border-cyan-200 dark:border-cyan-800' },
                green:  { icon: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400', badge: 'bg-green-600', border: 'border-green-200 dark:border-green-800' },
                purple: { icon: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', badge: 'bg-purple-600', border: 'border-purple-200 dark:border-purple-800' },
                orange: { icon: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400', badge: 'bg-orange-600', border: 'border-orange-200 dark:border-orange-800' },
                gold:   { icon: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400', badge: 'bg-gradient-to-r from-yellow-500 to-amber-500', border: 'border-yellow-300 dark:border-yellow-700' },
              };
              const c = colorMap[pack.color] || colorMap.blue;
              return (
                <div
                  key={i}
                  className={`relative flex flex-col rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                    pack.popular
                      ? `${c.border} shadow-xl`
                      : 'border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5'
                  } bg-white dark:bg-gray-800`}
                >
                  {pack.popular && (
                    <div className={`${c.badge} text-white text-xs font-bold text-center py-1.5 tracking-wide`}>
                      {isAr ? '⭐ الأكثر طلباً' : '⭐ Le plus populaire'}
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1">
                    {/* Header */}
                    <div className={`flex items-center justify-between mb-4 ${isAr ? 'flex-row-reverse' : ''}`}>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">{pack.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pack.desc}</p>
                      </div>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
                        <Icon size={20} />
                      </div>
                    </div>

                    {/* Price */}
                    {(() => {
                      const base = parseInt(pack.price); // already monthly
                      const total3Y = Math.round(base * 36 * 0.65);
                      const perMonth3Y = Math.round(base * 0.65);
                      return (
                        <div className="mb-5">
                          <div className={`flex items-baseline gap-1 ${isAr ? 'flex-row-reverse justify-end' : ''}`}>
                            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                              {plan3Y ? perMonth3Y : base}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {isAr ? ' د.م/شهر' : ' MAD/mois'}
                            </span>
                          </div>
                          {plan3Y && (
                            <div className={`flex items-center gap-2 mt-1 ${isAr ? 'flex-row-reverse' : ''}`}>
                              <span className="text-xs text-gray-400 line-through">{base} {isAr ? 'د.م' : 'MAD'}</span>
                              <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                                {isAr ? `إجمالي 3 سنوات: ${total3Y} د.م` : `Total 3 ans : ${total3Y} MAD`}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Features */}
                    <ul className="space-y-2 mb-6 flex-1">
                      {pack.features.map((f, j) => (
                        <li key={j} className={`flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 ${isAr ? 'flex-row-reverse' : ''}`}>
                          <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Link
                      to="/register"
                      className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        pack.popular
                          ? `${c.badge} text-white hover:opacity-90 shadow-md`
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-primary-600 hover:text-white'
                      }`}
                    >
                      {isAr ? 'ابدأ مجاناً' : 'Commencer gratuitement'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Transport add-on */}
          <div className="mt-8 max-w-2xl mx-auto bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-5">
            <div className={`flex items-start gap-3 ${isAr ? 'flex-row-reverse text-end' : ''}`}>
              <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bus size={18} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {isAr ? '🚌 النقل المدرسي — خيار إضافي لجميع الباقات' : '🚌 Transport scolaire — option disponible pour tous les packs'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {isAr
                    ? 'إدارة الحافلات والتلاميذ والاشتراكات — يُضاف على أي باقة حسب الطلب'
                    : 'Gestion des bus, élèves et abonnements — s\'ajoute à tout pack sur demande'}
                </p>
              </div>
            </div>
          </div>

          {/* After-trial note */}
          <div className="mt-4 max-w-2xl mx-auto bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
            <div className={`flex items-start gap-3 ${isAr ? 'flex-row-reverse text-end' : ''}`}>
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield size={15} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {isAr ? 'بعد التجربة المجانية:' : 'Après l\'essai gratuit :'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {plan3Y
                    ? (isAr
                        ? 'اشتراك 3 سنوات · توفير 35% على السعر الشهري · تنبيه تجديد قبل شهر من الانتهاء · الدفع عبر تحويل بنكي أو CashPlus'
                        : 'Abonnement 3 ans · Économie de 35% sur le prix mensuel · Rappel 1 mois avant · Paiement par virement ou CashPlus')
                    : (isAr
                        ? 'اشتراك شهري · الدفع عبر تحويل بنكي أو CashPlus · تنبيه تجديد قبل الانتهاء'
                        : 'Abonnement mensuel · Paiement par virement ou CashPlus · Rappel avant expiration')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAYMENT STEPS ── */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {isAr ? 'كيفية الدفع' : 'Comment payer'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              {isAr ? 'خطوات بسيطة للتفعيل' : "Étapes simples pour l'activation"}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {paymentSteps.map((step, i) => (
              <div key={i} className="relative text-center">
                {i < paymentSteps.length - 1 && (
                  <div className={`hidden lg:block absolute top-8 ${isAr ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'} w-full h-0.5 bg-primary-200 dark:bg-primary-800 z-0`} />
                )}
                <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-md shadow-primary-200 dark:shadow-primary-900/30">
                    {step.num}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COOPERATIVES SECTION ── */}
      <section id="cooperatives" className="py-24 bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Pain point header */}
          <div className="text-center mb-16">
            <span className="inline-block bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {isAr ? 'للتعاونيات والجمعيات الإنتاجية' : 'Pour les coopératives & associations productives'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {isAr
                ? 'تنتجون... ونحن نبيع لكم 🤝'
                : 'Vous produisez... nous vendons pour vous 🤝'}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {isAr
                ? 'المشكلة الكبرى لكل تعاونية: الإنتاج ممتاز، لكن التسويق والبيع صعب. نحن حللنا هذه المعادلة.'
                : 'Le vrai défi de chaque coopérative : une production excellente, mais le marketing et la vente restent difficiles. Nous avons résolu cette équation.'}
            </p>
          </div>

          {/* Banner image */}
          <div className="w-full rounded-2xl overflow-hidden shadow-xl shadow-emerald-100/50 dark:shadow-emerald-900/20 border border-emerald-100 dark:border-emerald-900 mb-16">
            <img
              src={isAr ? '/nbnr.png' : '/nbffr.png'}
              alt={isAr ? 'منصتنا — للتعاونيات' : 'Minassatona — Coopératives'}
              className="w-full h-auto object-cover block"
            />
          </div>

          {/* Problem vs Solution */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Problem */}
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-xl">😰</div>
                <h3 className="font-bold text-red-800 dark:text-red-300 text-lg">
                  {isAr ? 'الواقع المؤلم قبل المنصة' : 'La réalité difficile avant la plateforme'}
                </h3>
              </div>
              <ul className="space-y-3">
                {(isAr ? [
                  'منتجات رائعة تبقى في المستودع بدون مشترين',
                  'لا وجود رقمي، لا موقع، لا متجر إلكتروني',
                  'التسويق يحتاج خبرة وميزانية كبيرة',
                  'صعوبة الوصول للزبائن خارج المنطقة الجغرافية',
                  'ضياع الوقت في الإدارة بدل التركيز على الإنتاج',
                ] : [
                  'Produits excellents qui restent en stock faute d\'acheteurs',
                  'Aucune présence digitale, pas de boutique en ligne',
                  'Le marketing nécessite expertise et budget',
                  'Difficulté à atteindre des clients hors de la région',
                  'Temps perdu en gestion au lieu de se concentrer sur la production',
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-red-700 dark:text-red-300">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Solution */}
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-xl">🚀</div>
                <h3 className="font-bold text-emerald-800 dark:text-emerald-300 text-lg">
                  {isAr ? 'مع منصتنا — بسيط وذكي' : 'Avec notre plateforme — simple & intelligent'}
                </h3>
              </div>
              <ul className="space-y-3">
                {(isAr ? [
                  'متجر إلكتروني جاهز على lkhdmano.cloud — بدون أي تقنية',
                  'منتجاتك تصل لزبائن من جميع مدن المغرب',
                  'الطلبيات تصلك مباشرة، الدفع عند الاستلام (COD)',
                  'تتبع المخزون، الأرباح، والمدفوعات في لوحة واحدة',
                  'أنتم تركزون على الإنتاج، نحن نتكفل بالباقي',
                ] : [
                  'Boutique en ligne prête sur lkhdmano.cloud — sans technique',
                  'Vos produits atteignent des clients dans tout le Maroc',
                  'Commandes livrées directement, paiement à la livraison (COD)',
                  'Suivi stock, bénéfices et paiements dans un seul tableau de bord',
                  'Vous vous concentrez sur la production, nous gérons le reste',
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* How it works — 3 steps */}
          <div className="mb-16">
            <h3 className="text-center text-xl font-bold text-gray-900 dark:text-white mb-10">
              {isAr ? 'كيف يعمل النظام؟ — 3 خطوات فقط' : 'Comment ça marche ? — 3 étapes seulement'}
            </h3>
            <div className="grid sm:grid-cols-3 gap-6 relative">
              {/* connector line */}
              <div className="hidden sm:block absolute top-10 left-1/6 right-1/6 h-0.5 bg-emerald-200 dark:bg-emerald-800 z-0" style={{ left: '20%', right: '20%' }} />
              {(isAr ? [
                { step: '١', icon: '✅', title: 'سجّل وأرسل منتجاتك', desc: 'سجّل تعاونيتك، احصل على الموافقة، ثم أرسل منتجاتك إلى مستودعنا — هذا كل شيء من جهتك' },
                { step: '٢', icon: '📣', title: 'فريقنا يتكفل بالباقي', desc: 'فريقنا يضيف منتجاتك في المتجر، ينشئ الإعلانات، ويسوّق لها عبر القنوات الرقمية' },
                { step: '٣', icon: '💰', title: 'نبيع ونُحوّل لك المال', desc: 'نبيع منتجاتك، نُرسلها للزبون، نحصّل المبلغ، ونُحوّل أرباحك مباشرة إلى حسابك' },
              ] : [
                { step: '1', icon: '✅', title: 'Inscrivez-vous & envoyez vos produits', desc: 'Inscrivez votre coopérative, obtenez l\'approbation, puis envoyez vos produits à notre entrepôt — c\'est tout de votre côté' },
                { step: '2', icon: '📣', title: 'Notre équipe s\'occupe du reste', desc: 'Notre équipe ajoute vos produits à la boutique, crée les publicités et assure la promotion digitale' },
                { step: '3', icon: '💰', title: 'On vend & on vire vos gains', desc: 'On vend vos produits, on les livre au client, on encaisse et on transfère vos bénéfices directement sur votre compte' },
              ]).map((s, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-lg mb-4 shadow-lg">
                    {s.step}
                  </div>
                  <div className="text-3xl mb-3">{s.icon}</div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">{s.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key stats / proof */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14">
            {(isAr ? [
              { value: '100%', label: 'دفع عند الاستلام — COD', icon: '💵' },
              { value: '0 درهم', label: 'لا رسوم تقنية للإعداد', icon: '🆓' },
              { value: '∞', label: 'منتجات بدون حد أقصى', icon: '📦' },
              { value: '24/7', label: 'متجرك مفتوح دائماً', icon: '🟢' },
            ] : [
              { value: '100%', label: 'Paiement à la livraison COD', icon: '💵' },
              { value: '0 MAD', label: 'Zéro frais technique', icon: '🆓' },
              { value: '∞', label: 'Produits sans limite', icon: '📦' },
              { value: '24/7', label: 'Boutique toujours ouverte', icon: '🟢' },
            ]).map((stat, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 text-center shadow-sm">
                <div className="text-3xl mb-2">{stat.icon}</div>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-10 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="absolute rounded-full bg-white"
                  style={{ width: 80 + i * 60, height: 80 + i * 60, top: `${-10 + i * 20}%`, right: `${-5 + i * 20}%` }} />
              ))}
            </div>
            <div className="relative z-10">
              <p className="text-emerald-100 text-sm font-medium mb-2">
                {isAr ? '🌱 حصري للتعاونيات والجمعيات الإنتاجية' : '🌱 Exclusif coopératives & associations productives'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold mb-3">
                {isAr
                  ? 'أنتجوا فقط — نحن نتكفل بالبيع والتسويق'
                  : 'Produisez seulement — nous gérons ventes & marketing'}
              </h3>
              <p className="text-emerald-100 max-w-xl mx-auto mb-8 text-sm leading-relaxed">
                {isAr
                  ? 'انضم إلى المنصة اليوم، أضف منتجاتك، وابدأ في استقبال الطلبيات من جميع أنحاء المغرب. تجربة مجانية 15 يوم بدون أي التزام.'
                  : 'Rejoignez la plateforme aujourd\'hui, ajoutez vos produits et commencez à recevoir des commandes de tout le Maroc. Essai gratuit 15 jours sans engagement.'}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/register"
                  className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-7 py-3 rounded-xl text-sm hover:shadow-lg transition-all hover:-translate-y-0.5">
                  {isAr ? 'ابدأ مجاناً الآن ←' : 'Commencer gratuitement →'}
                </Link>
                <a href="https://lkhdmano.cloud/store" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-500/30 hover:bg-emerald-500/50 border border-white/30 text-white font-medium px-6 py-3 rounded-xl text-sm transition-all">
                  🏪 {isAr ? 'شاهد المتجر العام' : 'Voir la boutique publique'}
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {isAr ? 'شهادات العملاء' : 'Témoignages'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              {isAr ? 'ماذا يقول مستخدمونا' : 'Ce que disent nos utilisateurs'}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{t.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              {isAr ? 'أسئلة يطرحها الجميع' : 'Questions fréquentes'}
            </h2>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={`w-full flex items-center justify-between p-5 text-start gap-4 transition-colors ${openFaq === i ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                >
                  <span className="font-medium text-gray-900 dark:text-white">{item.q}</span>
                  <ChevronDown size={18} className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-primary-900 to-blue-900 dark:from-gray-950 dark:via-primary-950 dark:to-blue-950 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -start-20 w-80 h-80 bg-primary-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -end-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <TrendingUp size={20} className="text-primary-400" />
            <span className="text-primary-400 text-sm font-medium">
              {isAr ? 'انضم إلى مئات الجمعيات' : "Rejoignez des centaines d'associations"}
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
            {isAr ? 'ابدأ اليوم وخلي جمعيتك تتطور' : "Commencez aujourd'hui et développez votre association"}
          </h2>
          <p className="text-primary-200 text-lg mb-10">
            {isAr ? 'انضم إلى مئات الجمعيات التي تثق في جمعيتي' : "Rejoignez des centaines d'associations qui font confiance à Minassatona"}
          </p>
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${isAr ? 'sm:flex-row-reverse' : ''}`}>
            <Link
              to="/register"
              className="group flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white px-8 py-4 rounded-xl font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-200"
            >
              {!isAr && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1 -order-1" />}
              {isAr ? 'ابدأ تجربة مجانية' : "Démarrer l'essai gratuit"}
              {isAr && <ArrowRight size={18} className="transition-transform group-hover:-translate-x-1 rotate-180" />}
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold text-base border border-white/20 transition-all duration-200"
            >
              {isAr ? 'تسجيل الدخول' : 'Se connecter'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 dark:bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <img src="/logo-saas.png" alt="Minassatona" className="h-8 w-8 object-contain" />
              <div>
                <div className="font-bold text-white">Minassatona</div>
                <div className="text-xs text-gray-500">
                  {isAr ? 'تدبير الجمعيات والتعاونيات المغربية' : 'Tadbir — Gestion des associations et coopératives marocaines'}
                </div>
              </div>
            </div>

            <div className={`flex flex-wrap justify-center gap-4 text-xs text-gray-500`}>
              <a href="mailto:advicermano@gmail.com" className="hover:text-gray-300 transition-colors">
                {isAr ? 'تواصل معنا' : 'Nous contacter'}
              </a>
              <span className="text-gray-700">·</span>
              <Link to="/privacy" className="hover:text-gray-300 transition-colors">
                {isAr ? 'سياسة الخصوصية' : 'Politique de confidentialité'}
              </Link>
              <span className="text-gray-700">·</span>
              <Link to="/terms" className="hover:text-gray-300 transition-colors">
                {isAr ? 'شروط الاستخدام' : "Conditions d'utilisation"}
              </Link>
            </div>

            <div className="text-xs text-gray-600">
              © {new Date().getFullYear()} Minassatona. {isAr ? 'جميع الحقوق محفوظة' : 'Tous droits réservés'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
