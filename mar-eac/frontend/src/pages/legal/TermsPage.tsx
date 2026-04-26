import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, ArrowRight, FileText, Users, DollarSign, AlertTriangle, Scale, Ban, RefreshCw, Mail, ChevronRight, LucideIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const content = {
  ar: {
    title: 'شروط الاستخدام',
    subtitle: 'يُرجى قراءة هذه الشروط بعناية قبل استخدام منصة جمعيتي',
    updated: 'آخر تحديث: 1 يناير 2025',
    backHome: 'العودة للرئيسية',
    sections: [
      {
        icon: 'FileText',
        title: '1. قبول الشروط',
        content: `بإنشائك لحساب على منصة جمعيتي (Jam3iyati) أو استخدامك لأي من خدماتها، فإنك تؤكد أنك قرأت هذه الشروط وفهمتها ووافقت على الالتزام بها.

إذا كنت تمثّل جمعية أو منظمة، فإنك تؤكد أن لديك الصلاحية القانونية للموافقة على هذه الشروط باسمها.

إذا كنت لا توافق على أي من هذه الشروط، يرجى الامتناع عن استخدام المنصة.`,
      },
      {
        icon: 'FileText',
        title: '2. وصف الخدمة',
        content: `جمعيتي هي منصة رقمية متكاملة تُتيح للجمعيات المغربية إدارة شؤونها الإدارية والمالية. تشمل الخدمات المُقدَّمة:

• **إدارة الأعضاء:** تسجيل الأعضاء ومتابعة انخراطاتهم وبياناتهم
• **المالية:** تتبع الإيرادات والمصاريف وإنشاء التقارير المالية
• **الاجتماعات:** جدولة الاجتماعات وحفظ المحاضر والقرارات
• **الوثائق:** رفع وتنظيم الوثائق الرسمية
• **المشاريع:** تتبع المشاريع والمراحل والميزانيات
• **إدارة الماء:** خاص بجمعيات الماء لقراءة العدادات وإصدار الفواتير
• **النقل المدرسي:** إدارة الحافلات والتلاميذ والاشتراكات
• **التقارير:** توليد تقارير أدبية ومالية قابلة للطباعة

تحتفظ جمعيتي بحق تعديل أو إضافة أو إيقاف أي خدمة مع إشعار مسبق.`,
      },
      {
        icon: 'Users',
        title: '3. شروط إنشاء الحساب',
        content: `لإنشاء حساب على المنصة، يجب أن:

• تكون جمعيتك مُسجَّلة بشكل قانوني في المملكة المغربية
• تقدّم معلومات صحيحة ودقيقة وكاملة عند التسجيل
• تحافظ على سرية كلمة المرور وتتحمل مسؤولية أي نشاط يتم من خلال حسابك
• تُبلّغنا فوراً في حالة الاشتباه في اختراق حسابك
• لا تنشئ أكثر من حساب واحد لكل جمعية

يُحظر إنشاء حساب بهوية مزوّرة أو باسم جمعية لا تمثّلها.`,
      },
      {
        icon: 'DollarSign',
        title: '4. الاشتراك والدفع',
        content: `**التجربة المجانية:**
تحصل على 15 يوماً مجانية كاملة عند إنشاء الحساب، بدون الحاجة إلى أي معلومات دفع مسبقة.

**باقات الاشتراك (بالدرهم المغربي / شهر):**
• جمعية عادية: 99 د.م/شهر
• جمعية فيها مشاريع: 149 د.م/شهر
• جمعية الماء: 199 د.م/شهر
• جمعية إنتاجية: 199 د.م/شهر
• جمعية إنتاجية مع الماء: 299 د.م/شهر
• النقل المدرسي: 179 د.م/شهر

**طريقة الدفع:**
الدفع يتم حصرياً عبر:
• التحويل البنكي
• CashPlus

بعد الدفع، يجب رفع وصل الأداء على المنصة. يتم التفعيل خلال 24 ساعة من التحقق.

**لا توجد استرداد تلقائي.** في حالة وجود مشكلة، يرجى التواصل معنا خلال 7 أيام من تاريخ الدفع.`,
      },
      {
        icon: 'Scale',
        title: '5. الالتزامات والمسؤوليات',
        content: `**التزاماتنا تجاهك:**
• توفير المنصة بشكل مستمر مع وقت توقف لا يتجاوز 2% شهرياً
• الحفاظ على سرية بياناتك وأمانها
• تقديم الدعم التقني خلال أوقات العمل
• إشعارك بأي تغييرات جوهرية قبل تطبيقها

**التزاماتك تجاهنا:**
• استخدام المنصة فقط لأغراض مشروعة ومتوافقة مع القانون المغربي
• عدم محاولة اختراق أو إضعاف أمن المنصة
• عدم مشاركة بيانات الأعضاء مع جهات غير مخوّلة
• الإبلاغ عن أي خلل تقني أو ثغرة أمنية تكتشفها`,
      },
      {
        icon: 'Ban',
        title: '6. الاستخدام المحظور',
        content: `يُحظر استخدام منصة جمعيتي للأغراض التالية:

• نشر أي محتوى غير قانوني أو مسيء أو مضلّل
• انتهاك حقوق الملكية الفكرية لأي طرف
• إرسال بريد إلكتروني عشوائي (spam) أو محتوى ترويجي غير مرغوب فيه
• محاولة الوصول إلى بيانات جمعيات أخرى
• استخدام المنصة في أنشطة تجارية غير مرتبطة بإدارة الجمعيات
• إعادة بيع أو تأجير أو إعادة توزيع خدمات المنصة
• إجراء هجمات DDoS أو أي هجوم إلكتروني من أي نوع

مخالفة هذه البنود تُخوّلنا تعليق حسابك أو إلغاءه فوراً.`,
      },
      {
        icon: 'AlertTriangle',
        title: '7. حدود المسؤولية',
        content: `لا تتحمل جمعيتي المسؤولية عن:

• أي خسائر أو أضرار ناتجة عن توقف الخدمة لأسباب خارجة عن إرادتنا (قوة قاهرة، مشاكل مع مزود الاستضافة...)
• دقة البيانات التي يُدخلها المستخدمون على المنصة
• أي قرارات إدارية أو مالية تتخذها الجمعية بناءً على تقارير المنصة
• فقدان البيانات الناتج عن إهمال المستخدم (حذف بيانات غير مقصود...)

توفر المنصة "كما هي" (as-is) ونسعى باستمرار لتحسينها دون ضمان خلوّها من الأعطال.`,
      },
      {
        icon: 'RefreshCw',
        title: '8. الإلغاء وإنهاء الخدمة',
        content: `**إلغاء من طرفك:**
يمكنك إلغاء اشتراكك في أي وقت من إعدادات الحساب. لن يتم تجديد الاشتراك بعد انتهاء الفترة الحالية. تظل بياناتك متاحة للتصدير لمدة 30 يوماً بعد الإلغاء.

**إيقاف الخدمة من طرفنا:**
نحتفظ بالحق في إيقاف حسابك في الحالات التالية:
• مخالفة شروط الاستخدام
• عدم سداد الاشتراك بعد مهلة التذكير
• استخدام المنصة لأغراض غير مشروعة

في حالة الإيقاف الطارئ بسبب مخالفة، لن يحق المطالبة باسترداد رسوم الاشتراك.`,
      },
      {
        icon: 'Scale',
        title: '9. الملكية الفكرية',
        content: `**ملكيتنا:**
جميع عناصر المنصة (الشعار، التصميم، الكود البرمجي، قواعد البيانات) هي ملكية حصرية لشركة جمعيتي ومحمية بموجب قوانين حقوق الملكية الفكرية المعمول بها.

**ملكيتك:**
جميع البيانات التي تُدخلها على المنصة (معلومات الأعضاء، السجلات المالية...) تبقى ملكيتك الحصرية. لا نطالب بأي حقوق عليها.`,
      },
      {
        icon: 'RefreshCw',
        title: '10. تعديل الشروط',
        content: `نحتفظ بالحق في تعديل هذه الشروط من وقت لآخر. في حالة إجراء تعديلات جوهرية، سنُبلّغك عبر:
• إشعار داخل المنصة عند تسجيل دخولك
• رسالة بريد إلكتروني على عنوانك المسجّل

استمرارك في استخدام المنصة بعد التعديل يُعدّ قبولاً ضمنياً للشروط الجديدة.`,
      },
      {
        icon: 'Scale',
        title: '11. القانون المطبّق والاختصاص القضائي',
        content: `تخضع هذه الشروط لقوانين المملكة المغربية. في حالة نشوء أي نزاع، يتم اللجوء أولاً إلى التسوية الودية. في حالة تعذّر ذلك، تكون المحاكم المغربية المختصة صاحبة الاختصاص القضائي.`,
      },
      {
        icon: 'Mail',
        title: '12. التواصل معنا',
        content: `لأي استفسار حول هذه الشروط:

• **البريد الإلكتروني:** advicermano@gmail.com
• **من خلال المنصة:** قسم الدعم التقني

نلتزم بالرد خلال 72 ساعة من استلام طلبك.`,
      },
    ],
  },
  fr: {
    title: "Conditions d'utilisation",
    subtitle: 'Veuillez lire attentivement ces conditions avant d\'utiliser la plateforme Jam3iyati',
    updated: 'Dernière mise à jour : 1er janvier 2025',
    backHome: 'Retour à l\'accueil',
    sections: [
      {
        icon: 'FileText',
        title: '1. Acceptation des conditions',
        content: `En créant un compte sur la plateforme Jam3iyati ou en utilisant l'un de ses services, vous confirmez avoir lu, compris et accepté les présentes conditions.

Si vous représentez une association ou une organisation, vous confirmez disposer de l'autorité légale pour accepter ces conditions en son nom.

Si vous n'acceptez pas l'une de ces conditions, veuillez vous abstenir d'utiliser la plateforme.`,
      },
      {
        icon: 'FileText',
        title: '2. Description du service',
        content: `Jam3iyati est une plateforme digitale complète permettant aux associations marocaines de gérer leurs affaires administratives et financières. Les services proposés comprennent :

• **Gestion des membres :** inscription des adhérents, suivi des cotisations et des données
• **Finances :** suivi des recettes et dépenses, génération de rapports financiers
• **Réunions :** planification des réunions, conservation des procès-verbaux et décisions
• **Documents :** téléversement et organisation des documents officiels
• **Projets :** suivi des projets, des étapes et des budgets
• **Gestion de l'eau :** pour les associations d'eau — relevés de compteurs et facturation
• **Transport scolaire :** gestion des bus, élèves et abonnements
• **Rapports :** génération de rapports littéraires et financiers imprimables

Jam3iyati se réserve le droit de modifier, ajouter ou suspendre tout service avec préavis.`,
      },
      {
        icon: 'Users',
        title: '3. Conditions de création de compte',
        content: `Pour créer un compte sur la plateforme, vous devez :

• Être une association légalement enregistrée au Royaume du Maroc
• Fournir des informations exactes, précises et complètes lors de l'inscription
• Maintenir la confidentialité de votre mot de passe et assumer la responsabilité de toute activité sur votre compte
• Nous informer immédiatement en cas de soupçon de compromission de votre compte
• Ne pas créer plus d'un compte par association

Il est interdit de créer un compte sous une fausse identité ou au nom d'une association que vous ne représentez pas.`,
      },
      {
        icon: 'DollarSign',
        title: '4. Abonnement et paiement',
        content: `**Période d'essai gratuite :**
Vous bénéficiez de 15 jours gratuits complets à la création du compte, sans qu'aucune information de paiement ne soit requise.

**Packs d'abonnement (en Dirham marocain / mois) :**
• Association classique : 99 MAD/mois
• Association avec projets : 149 MAD/mois
• Association de l'eau : 199 MAD/mois
• Association productive : 199 MAD/mois
• Association productive + eau : 299 MAD/mois
• Transport scolaire : 179 MAD/mois

**Mode de paiement :**
Le paiement s'effectue exclusivement via :
• Virement bancaire
• CashPlus

Après paiement, le reçu doit être téléversé sur la plateforme. L'activation intervient dans les 24 heures suivant la vérification.

**Pas de remboursement automatique.** En cas de problème, contactez-nous dans les 7 jours suivant la date de paiement.`,
      },
      {
        icon: 'Scale',
        title: '5. Engagements et responsabilités',
        content: `**Nos engagements envers vous :**
• Fournir la plateforme en continu avec un temps d'arrêt ne dépassant pas 2% par mois
• Garantir la confidentialité et la sécurité de vos données
• Offrir un support technique pendant les heures ouvrables
• Vous informer de tout changement important avant sa mise en œuvre

**Vos engagements envers nous :**
• Utiliser la plateforme uniquement à des fins légitimes et conformes à la loi marocaine
• Ne pas tenter de compromettre ou d'affaiblir la sécurité de la plateforme
• Ne pas partager les données des membres avec des tiers non autorisés
• Signaler tout dysfonctionnement technique ou faille de sécurité découvert`,
      },
      {
        icon: 'Ban',
        title: '6. Utilisations interdites',
        content: `Il est interdit d'utiliser la plateforme Jam3iyati aux fins suivantes :

• Publier tout contenu illégal, offensant ou trompeur
• Violer les droits de propriété intellectuelle d'un tiers
• Envoyer des spams ou des contenus promotionnels non sollicités
• Tenter d'accéder aux données d'autres associations
• Utiliser la plateforme pour des activités commerciales non liées à la gestion associative
• Revendre, louer ou redistribuer les services de la plateforme
• Lancer des attaques DDoS ou toute autre forme d'attaque informatique

Toute violation de ces dispositions nous autorise à suspendre ou résilier votre compte immédiatement.`,
      },
      {
        icon: 'AlertTriangle',
        title: '7. Limitation de responsabilité',
        content: `Jam3iyati ne saurait être tenu responsable de :

• Toute perte ou dommage résultant d'une interruption de service due à des causes indépendantes de notre volonté (force majeure, problèmes avec l'hébergeur…)
• L'exactitude des données saisies par les utilisateurs sur la plateforme
• Toute décision administrative ou financière prise par l'association sur la base des rapports de la plateforme
• La perte de données résultant d'une négligence de l'utilisateur (suppression accidentelle…)

La plateforme est fournie "en l'état" (as-is) et nous œuvrons continuellement à son amélioration sans garantir son absence totale de défauts.`,
      },
      {
        icon: 'RefreshCw',
        title: '8. Résiliation et fin de service',
        content: `**Résiliation de votre côté :**
Vous pouvez résilier votre abonnement à tout moment depuis les paramètres du compte. L'abonnement ne sera pas renouvelé après la fin de la période en cours. Vos données resteront disponibles pour export pendant 30 jours après la résiliation.

**Suspension de notre côté :**
Nous nous réservons le droit de suspendre votre compte dans les cas suivants :
• Violation des conditions d'utilisation
• Non-paiement de l'abonnement après le délai de rappel
• Utilisation de la plateforme à des fins illégales

En cas de suspension d'urgence pour violation, aucun remboursement des frais d'abonnement ne pourra être réclamé.`,
      },
      {
        icon: 'Scale',
        title: '9. Propriété intellectuelle',
        content: `**Notre propriété :**
Tous les éléments de la plateforme (logo, design, code source, bases de données) sont la propriété exclusive de Jam3iyati et sont protégés par les lois sur la propriété intellectuelle en vigueur.

**Votre propriété :**
Toutes les données que vous saisissez sur la plateforme (informations des membres, registres financiers…) restent votre propriété exclusive. Nous ne revendiquons aucun droit sur celles-ci.`,
      },
      {
        icon: 'RefreshCw',
        title: '10. Modification des conditions',
        content: `Nous nous réservons le droit de modifier les présentes conditions périodiquement. En cas de modifications importantes, nous vous en informerons via :
• Une notification au sein de la plateforme lors de votre prochaine connexion
• Un e-mail à l'adresse enregistrée dans votre compte

La poursuite de votre utilisation de la plateforme après modification vaut acceptation tacite des nouvelles conditions.`,
      },
      {
        icon: 'Scale',
        title: '11. Loi applicable et juridiction compétente',
        content: `Les présentes conditions sont régies par les lois du Royaume du Maroc. En cas de litige, une résolution à l'amiable sera d'abord tentée. En cas d'échec, les tribunaux marocains compétents auront juridiction exclusive.`,
      },
      {
        icon: 'Mail',
        title: '12. Nous contacter',
        content: `Pour toute question relative aux présentes conditions :

• **E-mail :** advicermano@gmail.com
• **Via la plateforme :** section Support technique

Nous nous engageons à répondre dans un délai de 72 heures.`,
      },
    ],
  },
};

const iconMap: Record<string, LucideIcon> = {
  FileText, Users, DollarSign, AlertTriangle, Scale, Ban, RefreshCw, Mail,
};

export const TermsPage: React.FC = () => {
  const { lang, dir, setLang } = useLanguage();
  const [activeSection, setActiveSection] = useState(0);
  const isAr = lang === 'ar';
  const c = isAr ? content.ar : content.fr;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div dir={dir} className={`min-h-screen bg-gray-50 dark:bg-gray-950 ${isAr ? 'font-[Cairo,sans-serif]' : 'font-sans'}`}>

      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
              <ArrowRight size={16} className="rotate-180 rtl:rotate-0" />
              {c.backHome}
            </Link>
            <button
              onClick={() => setLang(isAr ? 'fr' : 'ar')}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm px-3 py-1.5 rounded-lg transition-all"
            >
              <Globe size={14} /> {isAr ? 'FR' : 'عر'}
            </button>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Scale size={28} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">{c.title}</h1>
              <p className="text-gray-400 text-base max-w-xl">{c.subtitle}</p>
              <p className="text-gray-500 text-xs mt-3">{c.updated}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* dir=rtl makes aside (first child) appear on RIGHT automatically */}
        <div className="flex gap-8">

          {/* Sidebar TOC */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {isAr ? 'المحتويات' : 'Sommaire'}
                </p>
              </div>
              <nav className="py-2 max-h-[70vh] overflow-y-auto">
                {c.sections.map((s, i) => (
                  <a
                    key={i}
                    href={`#section-${i}`}
                    onClick={() => setActiveSection(i)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${activeSection === i ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                  >
                    <ChevronRight size={12} className="flex-shrink-0 rtl:rotate-180" />
                    <span className="truncate">{s.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0 space-y-6">
            {c.sections.map((section, i) => {
              const Icon = iconMap[section.icon] || FileText;
              return (
                <div
                  key={i}
                  id={`section-${i}`}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
                  onMouseEnter={() => setActiveSection(i)}
                >
                  <div className="flex items-center gap-3 p-6 pb-4 border-b border-gray-50 dark:border-gray-700">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-gray-600 dark:text-gray-400" />
                    </div>
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">{section.title}</h2>
                  </div>
                  <div className="p-6 text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-2">
                    {section.content.split('\n').map((line, j) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={j} className="font-semibold text-gray-800 dark:text-gray-200 mt-4 pt-2">{line.replace(/\*\*/g, '')}</p>;
                      }
                      if (line.startsWith('• **')) {
                        const match = line.match(/^• \*\*(.+?)\*\*(.*)$/);
                        if (match) return (
                          <p key={j} className="flex gap-2">
                            <span className="text-gray-400 flex-shrink-0">•</span>
                            <span><strong className="text-gray-800 dark:text-gray-200">{match[1]}</strong>{match[2]}</span>
                          </p>
                        );
                      }
                      if (line.startsWith('• ')) {
                        return (
                          <p key={j} className="flex gap-2">
                            <span className="text-gray-400 flex-shrink-0">•</span>
                            <span>{line.slice(2)}</span>
                          </p>
                        );
                      }
                      if (line.trim() === '') return <div key={j} className="h-1" />;
                      return <p key={j}>{line}</p>;
                    })}
                  </div>
                </div>
              );
            })}

            {/* Footer note */}
            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    {isAr ? 'تواصل معنا' : 'Nous contacter'}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    <a href="mailto:advicermano@gmail.com" className="text-primary-600 dark:text-primary-400 underline">advicermano@gmail.com</a>
                  </p>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <div className="flex items-center justify-between pt-4">
              <Link to="/privacy" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                {isAr ? 'سياسة الخصوصية ←' : '← Politique de confidentialité'}
              </Link>
              <Link to="/" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                {isAr ? '→ الرئيسية' : 'Accueil →'}
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
