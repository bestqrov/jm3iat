import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, ArrowRight, Shield, Lock, Eye, Trash2, Bell, Mail, ChevronRight, LucideIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const content = {
  ar: {
    title: 'سياسة الخصوصية',
    subtitle: 'نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية',
    updated: 'آخر تحديث: 1 يناير 2025',
    backHome: 'العودة للرئيسية',
    sections: [
      {
        icon: 'Shield',
        title: '1. مقدمة',
        content: `تُعدّ هذه السياسة جزءاً من الشروط العامة لاستخدام منصة جمعيتي (Jam3iyati)، وهي منصة رقمية متخصصة في إدارة الجمعيات المغربية. بمجرد إنشائك لحساب أو استخدامك للمنصة، فإنك توافق على الشروط الواردة في هذه السياسة.

تلتزم شركة جمعيتي بحماية المعلومات الشخصية التي تشاركها معنا، وتعمل وفق المبادئ المعمول بها في مجال حماية البيانات.`,
      },
      {
        icon: 'Eye',
        title: '2. المعلومات التي نجمعها',
        content: `نقوم بجمع المعلومات التالية عند استخدامك للمنصة:

**معلومات الحساب:**
• اسم الجمعية والمسؤول عنها
• البريد الإلكتروني ورقم الهاتف
• المدينة والمنطقة الجغرافية
• كلمة المرور (مشفّرة ولا يمكن الوصول إليها)

**بيانات الاستخدام:**
• سجلات الدخول وأوقات النشاط
• الوحدات المستخدمة داخل المنصة
• الإجراءات المنجزة (إضافة أعضاء، تسجيل معاملات مالية...)

**بيانات الجمعية:**
• معلومات الأعضاء المنخرطين
• السجلات المالية والتقارير
• الوثائق والملفات المرفوعة`,
      },
      {
        icon: 'Lock',
        title: '3. كيف نستخدم معلوماتك',
        content: `نستخدم المعلومات التي نجمعها للأغراض التالية حصراً:

• **تشغيل الخدمة:** توفير وظائف المنصة وصيانتها وتحسينها
• **إدارة الحساب:** التحقق من الهوية وإدارة الاشتراك
• **التواصل:** إرسال التنبيهات، التذكيرات، وإشعارات النظام
• **الدعم التقني:** مساعدتك في حل المشكلات والإجابة على استفساراتك
• **الأمن:** رصد الأنشطة المشبوهة وحماية حسابك
• **التطوير:** تحليل أنماط الاستخدام لتحسين تجربة المستخدم

نحن لا نبيع أي معلومات شخصية لأطراف ثالثة ولا نشاركها لأغراض تجارية.`,
      },
      {
        icon: 'Shield',
        title: '4. حماية البيانات وأمانها',
        content: `نتخذ تدابير أمنية صارمة لحماية بياناتك:

• **التشفير:** جميع البيانات المنقولة مشفّرة باستخدام بروتوكول HTTPS/TLS
• **كلمات المرور:** مشفّرة بخوارزميات bcrypt ولا يمكن لأي موظف الاطلاع عليها
• **النسخ الاحتياطية:** نسخ احتياطية يومية تلقائية لبياناتك
• **الوصول المحدود:** لا يمكن الوصول إلى بياناتك إلا من قِبَل المخولين داخل فريقنا التقني
• **المراقبة:** أنظمة مراقبة مستمرة لرصد أي نشاط غير اعتيادي`,
      },
      {
        icon: 'Bell',
        title: '5. ملفات تعريف الارتباط (Cookies)',
        content: `تستخدم منصة جمعيتي ملفات تعريف الارتباط للأغراض التالية:

• **ملفات ضرورية:** للحفاظ على جلسة تسجيل الدخول وإعدادات اللغة
• **ملفات التحليل:** لفهم كيفية استخدام المنصة وتحسينها (بشكل مجمّع وغير شخصي)

يمكنك ضبط إعدادات المتصفح لرفض ملفات تعريف الارتباط، غير أن ذلك قد يؤثر على بعض وظائف المنصة.`,
      },
      {
        icon: 'Trash2',
        title: '6. حقوقك على بياناتك',
        content: `بموجب القوانين المعمول بها، تتمتع بالحقوق التالية:

• **حق الاطلاع:** طلب نسخة من بياناتك الشخصية المحفوظة لدينا
• **حق التصحيح:** تصحيح أي معلومات غير دقيقة أو منقوصة
• **حق الحذف:** طلب حذف بياناتك من أنظمتنا (مع مراعاة الالتزامات القانونية)
• **حق التصدير:** استخراج بيانات جمعيتك في صيغة قابلة للقراءة
• **حق الاعتراض:** الاعتراض على معالجة بياناتك في حالات معينة

لممارسة أي من هذه الحقوق، يرجى التواصل معنا عبر: advicermano@gmail.com`,
      },
      {
        icon: 'Mail',
        title: '7. مشاركة البيانات مع أطراف ثالثة',
        content: `لا نشارك بياناتك الشخصية مع أطراف ثالثة إلا في الحالات التالية:

• **مزودو الخدمات:** خوادم الاستضافة والبريد الإلكتروني، وهم ملزمون بعدم استخدام بياناتك لأغراض أخرى
• **الالتزامات القانونية:** إذا طُلب منا ذلك بموجب قرار قضائي أو لوائح قانونية نافذة
• **حماية الحقوق:** في حالات الاحتيال أو الاستخدام المسيء

في جميع الأحوال، نسعى لتقليل المعلومات المشاركة إلى أدنى حد ممكن.`,
      },
      {
        icon: 'Shield',
        title: '8. الاحتفاظ بالبيانات',
        content: `نحتفظ ببياناتك خلال فترة اشتراكك النشط في المنصة. بعد إلغاء الاشتراك:

• تُحذف بيانات الحساب خلال 30 يوماً من طلب الحذف
• قد نحتفظ ببعض السجلات المحاسبية لمدة تصل إلى 5 سنوات وفق المتطلبات القانونية
• يمكنك تصدير جميع بياناتك قبل إلغاء الاشتراك`,
      },
      {
        icon: 'Bell',
        title: '9. التغييرات على هذه السياسة',
        content: `قد نُحدّث هذه السياسة من وقت لآخر. في حالة إجراء تغييرات جوهرية، سنعلمك عبر:
• إشعار داخل المنصة عند تسجيل دخولك
• رسالة بريد إلكتروني على العنوان المسجّل لديك

استمرارك في استخدام المنصة بعد التحديث يُعدّ موافقةً ضمنية على السياسة الجديدة.`,
      },
      {
        icon: 'Mail',
        title: '10. التواصل معنا',
        content: `لأي استفسار يخص خصوصيتك أو بياناتك، يمكنك التواصل معنا عبر:

• **البريد الإلكتروني:** advicermano@gmail.com
• **من خلال المنصة:** قسم الدعم التقني داخل لوحة التحكم

نلتزم بالرد على جميع الطلبات خلال 72 ساعة من استلامها.`,
      },
    ],
  },
  fr: {
    title: 'Politique de confidentialité',
    subtitle: 'Nous respectons votre vie privée et nous engageons à protéger vos données personnelles',
    updated: 'Dernière mise à jour : 1er janvier 2025',
    backHome: 'Retour à l\'accueil',
    sections: [
      {
        icon: 'Shield',
        title: '1. Introduction',
        content: `La présente politique fait partie des conditions générales d'utilisation de la plateforme Jam3iyati, une plateforme digitale spécialisée dans la gestion des associations marocaines. En créant un compte ou en utilisant la plateforme, vous acceptez les termes décrits dans cette politique.

Jam3iyati s'engage à protéger les informations personnelles que vous partagez avec nous, et opère conformément aux principes en vigueur en matière de protection des données.`,
      },
      {
        icon: 'Eye',
        title: '2. Informations que nous collectons',
        content: `Nous collectons les informations suivantes lors de votre utilisation de la plateforme :

**Informations du compte :**
• Nom de l'association et du responsable
• Adresse e-mail et numéro de téléphone
• Ville et région géographique
• Mot de passe (chiffré, inaccessible à notre équipe)

**Données d'utilisation :**
• Journaux de connexion et horaires d'activité
• Modules utilisés sur la plateforme
• Actions effectuées (ajout de membres, enregistrement de transactions…)

**Données de l'association :**
• Informations sur les membres adhérents
• Registres financiers et rapports
• Documents et fichiers téléversés`,
      },
      {
        icon: 'Lock',
        title: '3. Comment nous utilisons vos informations',
        content: `Nous utilisons les informations collectées exclusivement aux fins suivantes :

• **Fonctionnement du service :** fournir, maintenir et améliorer les fonctionnalités de la plateforme
• **Gestion du compte :** vérification d'identité et gestion de l'abonnement
• **Communication :** envoi d'alertes, rappels et notifications système
• **Support technique :** vous aider à résoudre les problèmes et répondre à vos questions
• **Sécurité :** détection d'activités suspectes et protection de votre compte
• **Développement :** analyse des usages pour améliorer l'expérience utilisateur

Nous ne vendons ni ne partageons aucune information personnelle à des tiers à des fins commerciales.`,
      },
      {
        icon: 'Shield',
        title: '4. Protection et sécurité des données',
        content: `Nous appliquons des mesures de sécurité strictes pour protéger vos données :

• **Chiffrement :** toutes les données transmises sont chiffrées via HTTPS/TLS
• **Mots de passe :** chiffrés par algorithme bcrypt, inaccessibles même à nos équipes
• **Sauvegardes :** sauvegardes automatiques quotidiennes de vos données
• **Accès restreint :** seules les personnes habilitées au sein de notre équipe technique peuvent accéder à vos données
• **Surveillance :** systèmes de monitoring continu pour détecter toute activité anormale`,
      },
      {
        icon: 'Bell',
        title: '5. Cookies',
        content: `La plateforme Jam3iyati utilise des cookies aux fins suivantes :

• **Cookies essentiels :** maintien de votre session de connexion et des préférences de langue
• **Cookies analytiques :** compréhension de l'utilisation de la plateforme pour l'améliorer (données agrégées et anonymisées)

Vous pouvez configurer votre navigateur pour refuser les cookies, mais cela peut affecter certaines fonctionnalités de la plateforme.`,
      },
      {
        icon: 'Trash2',
        title: '6. Vos droits sur vos données',
        content: `Conformément aux lois applicables, vous disposez des droits suivants :

• **Droit d'accès :** demander une copie de vos données personnelles conservées chez nous
• **Droit de rectification :** corriger toute information inexacte ou incomplète
• **Droit à l'effacement :** demander la suppression de vos données (sous réserve des obligations légales)
• **Droit à la portabilité :** exporter les données de votre association dans un format lisible
• **Droit d'opposition :** vous opposer au traitement de vos données dans certains cas

Pour exercer l'un de ces droits, contactez-nous à : advicermano@gmail.com`,
      },
      {
        icon: 'Mail',
        title: '7. Partage des données avec des tiers',
        content: `Nous ne partageons pas vos données personnelles avec des tiers, sauf dans les cas suivants :

• **Prestataires de services :** hébergement et messagerie électronique, tenus contractuellement de ne pas utiliser vos données à d'autres fins
• **Obligations légales :** si une décision judiciaire ou une réglementation en vigueur l'exige
• **Protection des droits :** en cas de fraude ou d'utilisation abusive

Dans tous les cas, nous réduisons au minimum les informations partagées.`,
      },
      {
        icon: 'Shield',
        title: '8. Conservation des données',
        content: `Nous conservons vos données pendant toute la durée de votre abonnement actif. Après résiliation :

• Les données du compte sont supprimées dans les 30 jours suivant la demande
• Certains registres comptables peuvent être conservés jusqu'à 5 ans conformément aux exigences légales
• Vous pouvez exporter toutes vos données avant de résilier votre abonnement`,
      },
      {
        icon: 'Bell',
        title: '9. Modifications de cette politique',
        content: `Nous pouvons mettre à jour cette politique périodiquement. En cas de modifications importantes, nous vous en informerons par :
• Une notification au sein de la plateforme lors de votre prochaine connexion
• Un e-mail à l'adresse enregistrée dans votre compte

La poursuite de votre utilisation de la plateforme après mise à jour vaut acceptation tacite de la nouvelle politique.`,
      },
      {
        icon: 'Mail',
        title: '10. Nous contacter',
        content: `Pour toute question relative à votre vie privée ou vos données, contactez-nous via :

• **E-mail :** advicermano@gmail.com
• **Via la plateforme :** section Support technique dans votre tableau de bord

Nous nous engageons à répondre à toutes les demandes dans un délai de 72 heures.`,
      },
    ],
  },
};

const iconMap: Record<string, LucideIcon> = {
  Shield, Lock, Eye, Trash2, Bell, Mail,
};

export const PrivacyPage: React.FC = () => {
  const { lang, dir, setLang } = useLanguage();
  const [activeSection, setActiveSection] = useState(0);
  const isAr = lang === 'ar';
  const c = isAr ? content.ar : content.fr;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div dir={dir} className={`min-h-screen bg-gray-50 dark:bg-gray-950 ${isAr ? 'font-[Cairo,sans-serif]' : 'font-sans'}`}>

      {/* Header */}
      <div className="bg-gradient-to-br from-primary-700 to-blue-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* top bar: back link on start, lang switcher on end */}
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-2 text-primary-200 hover:text-white text-sm transition-colors">
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

          {/* title block — flex flows RTL naturally via dir */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">{c.title}</h1>
              <p className="text-primary-200 text-base max-w-xl">{c.subtitle}</p>
              <p className="text-primary-300 text-xs mt-3">{c.updated}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* flex: with dir=rtl, aside (first) appears on RIGHT, main on LEFT */}
        <div className="flex gap-8">

          {/* Sidebar TOC — desktop only */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {isAr ? 'المحتويات' : 'Sommaire'}
                </p>
              </div>
              <nav className="py-2">
                {c.sections.map((s, i) => (
                  <a
                    key={i}
                    href={`#section-${i}`}
                    onClick={() => setActiveSection(i)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${activeSection === i ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
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
              const Icon = iconMap[section.icon] || Shield;
              return (
                <div
                  key={i}
                  id={`section-${i}`}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
                  onMouseEnter={() => setActiveSection(i)}
                >
                  {/* section header — flex flows via dir */}
                  <div className="flex items-center gap-3 p-6 pb-4 border-b border-gray-50 dark:border-gray-700">
                    <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-primary-600 dark:text-primary-400" />
                    </div>
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">{section.title}</h2>
                  </div>
                  <div className="p-6 text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-3">
                    {section.content.split('\n').map((line, j) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={j} className="font-semibold text-gray-800 dark:text-gray-200 mt-4">{line.replace(/\*\*/g, '')}</p>;
                      }
                      if (line.startsWith('• **')) {
                        const match = line.match(/^• \*\*(.+?)\*\*(.*)$/);
                        if (match) return (
                          <p key={j} className="flex gap-2">
                            <span className="text-primary-500 flex-shrink-0">•</span>
                            <span><strong className="text-gray-800 dark:text-gray-200">{match[1]}</strong>{match[2]}</span>
                          </p>
                        );
                      }
                      if (line.startsWith('• ')) {
                        return (
                          <p key={j} className="flex gap-2">
                            <span className="text-primary-500 flex-shrink-0">•</span>
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
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    {isAr ? 'تواصل معنا' : 'Nous contacter'}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {isAr
                      ? <>لأي استفسار، راسلنا على <a href="mailto:advicermano@gmail.com" className="text-primary-600 dark:text-primary-400 underline">advicermano@gmail.com</a></>
                      : <>Pour toute question, écrivez-nous à <a href="mailto:advicermano@gmail.com" className="text-primary-600 dark:text-primary-400 underline">advicermano@gmail.com</a></>
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <div className="flex items-center justify-between pt-4">
              <Link to="/" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                {isAr ? 'الرئيسية ←' : '← Accueil'}
              </Link>
              <Link to="/terms" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                {isAr ? '→ شروط الاستخدام' : "Conditions d'utilisation →"}
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
