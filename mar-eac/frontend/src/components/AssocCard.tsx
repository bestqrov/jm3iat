import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import {
  X, Building2, Droplets, ShoppingBag, FolderKanban, Layers,
  Phone, Mail, Copy, Check, Printer, MessageCircle, Landmark, CreditCard,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

// ── Theme definitions (one per association activity) ─────────────────────────

type ThemeDef = {
  gradient: string;
  glowA: string;
  glowB: string;
  badge: string;
  badgeAr: string;
  Icon: LucideIcon;
  qrFg: string;
  qrBg: string;
};

const THEMES: Record<string, ThemeDef> = {
  regular: {
    gradient: 'linear-gradient(135deg,#312e81 0%,#1e40af 55%,#0369a1 100%)',
    glowA: 'rgba(165,180,252,.18)', glowB: 'rgba(96,165,250,.12)',
    badge: 'Gestion Associative',   badgeAr: 'تسيير جمعوي',
    Icon: Building2,                qrFg: '#1e1b4b', qrBg: '#eef2ff',
  },
  water: {
    gradient: 'linear-gradient(135deg,#155e75 0%,#0d9488 55%,#1d4ed8 100%)',
    glowA: 'rgba(103,232,249,.18)', glowB: 'rgba(56,189,248,.12)',
    badge: "Gestion de l'Eau",      badgeAr: 'تدبير الماء',
    Icon: Droplets,                 qrFg: '#0c4a6e', qrBg: '#ecfeff',
  },
  productive: {
    gradient: 'linear-gradient(135deg,#064e3b 0%,#059669 55%,#0d9488 100%)',
    glowA: 'rgba(110,231,183,.18)', glowB: 'rgba(52,211,153,.12)',
    badge: 'Association Productive', badgeAr: 'جمعية إنتاجية',
    Icon: ShoppingBag,               qrFg: '#022c22', qrBg: '#f0fdf4',
  },
  projects: {
    gradient: 'linear-gradient(135deg,#78350f 0%,#d97706 55%,#ef4444 100%)',
    glowA: 'rgba(252,211,77,.18)',  glowB: 'rgba(251,146,60,.12)',
    badge: 'Projets de Développement', badgeAr: 'مشاريع تنموية',
    Icon: FolderKanban,             qrFg: '#451a03', qrBg: '#fffbeb',
  },
  productiveWater: {
    gradient: 'linear-gradient(135deg,#3b0764 0%,#7c3aed 55%,#1d4ed8 100%)',
    glowA: 'rgba(196,181,253,.18)', glowB: 'rgba(139,92,246,.12)',
    badge: 'Multi-Activités',        badgeAr: 'متعدد الأنشطة',
    Icon: Layers,                   qrFg: '#2e1065', qrBg: '#faf5ff',
  },
};

const getThemeKey = (modules: string[]): string => {
  const w = modules.includes('WATER');
  const p = modules.includes('PRODUCTIVE');
  const j = modules.includes('PROJECTS');
  if (w && p) return 'productiveWater';
  if (w)      return 'water';
  if (p)      return 'productive';
  if (j)      return 'projects';
  return 'regular';
};

// ── Small social pill ─────────────────────────────────────────────────────────
const Pill: React.FC<{ label: string; bg: string; url?: string | null }> = ({ label, bg, url }) => {
  if (!url) return null;
  return (
    <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
      className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white leading-none select-none"
      style={{ background: bg }}>
      {label}
    </a>
  );
};

// ── Tab type ──────────────────────────────────────────────────────────────────
type Tab = 'card' | 'qr' | 'payment';

// ── Main component ────────────────────────────────────────────────────────────
interface AssocCardProps { onClose: () => void }

export const AssocCard: React.FC<AssocCardProps> = ({ onClose }) => {
  const { organization } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const org  = organization!;

  const [tab,    setTab]    = useState<Tab>('card');
  const [copied, setCopied] = useState(false);

  const modules  = org.modules ?? [];
  const themeKey = getThemeKey(modules);
  const theme    = THEMES[themeKey];
  const Icon     = theme.Icon;

  const orgName = isAr ? (org.nameAr || org.name) : org.name;
  const city    = isAr ? (org.cityAr  || org.city || '') : (org.city || '');

  // ── QR values ──────────────────────────────────────────────────────────────
  const vCard = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `FN:${org.nameAr || org.name}`,
    `ORG:${org.name}`,
    org.phone    ? `TEL;TYPE=WORK:${org.phone}` : '',
    org.email    ? `EMAIL;TYPE=WORK:${org.email}` : '',
    org.city     ? `ADR:;;${org.city};;;Morocco` : '',
    org.whatsapp ? `X-SOCIALPROFILE;type=whatsapp:${org.whatsapp}` : '',
    'END:VCARD',
  ].filter(Boolean).join('\n');

  const paymentQrValue = [
    org.bankName    ? `Banque: ${org.bankName}` : '',
    org.bankAccount ? `Compte: ${org.bankAccount}` : '',
    org.bankRib     ? `RIB: ${org.bankRib}` : '',
    `Association: ${org.name}`,
  ].filter(Boolean).join('\n');

  const hasBankInfo = !!(org.bankName || org.bankAccount || org.bankRib);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const copyContact = () => {
    const txt = [
      `🏢 ${org.nameAr || org.name}`,
      org.phone    ? `📞 ${org.phone}` : '',
      org.email    ? `✉️ ${org.email}` : '',
      city         ? `📍 ${city}` : '',
      org.whatsapp ? `💬 ${org.whatsapp}` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareWA = () => {
    const text = encodeURIComponent(
      `🏢 *${org.nameAr || org.name}*\n` +
      (org.phone    ? `📞 ${org.phone}\n`    : '') +
      (org.email    ? `✉️ ${org.email}\n`    : '') +
      (city         ? `📍 ${city}\n`         : '') +
      (org.whatsapp ? `💬 ${org.whatsapp}`   : '')
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const TABS: { key: Tab; fr: string; ar: string }[] = [
    { key: 'card',    fr: 'Carte',    ar: 'البطاقة' },
    { key: 'qr',      fr: 'QR Partage', ar: 'QR مشاركة' },
    { key: 'payment', fr: 'Paiement', ar: 'الدفع' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '96vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Modal header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Icon size={15} className="text-gray-500" />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">
              {isAr ? 'البطاقة الإلكترونية للجمعية' : "Carte Électronique de l'Association"}
            </span>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1">

          {/* ══ CARD VISUAL ══════════════════════════════════════════════════ */}
          <div className="px-5 pt-5">
            <div
              className="relative w-full rounded-2xl overflow-hidden"
              style={{ background: theme.gradient, aspectRatio: '1.78 / 1' }}
            >
              {/* Decorative glows */}
              <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${theme.glowA}, transparent 70%)` }} />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${theme.glowB}, transparent 70%)` }} />
              <div className="absolute top-1/3 left-1/2 w-24 h-24 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${theme.glowA}, transparent 70%)` }} />

              {/* Card content */}
              <div className="relative z-10 flex h-full p-4 gap-3">

                {/* Left: org info */}
                <div className="flex-1 flex flex-col justify-between min-w-0">

                  {/* Top: logo + name */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {org.logo
                        ? <img src={org.logo} alt="logo" className="w-full h-full object-contain p-0.5" />
                        : <Icon size={20} className="text-white/80" />
                      }
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <h2 className="text-white font-bold text-[15px] leading-tight line-clamp-2"
                        dir={isAr ? 'rtl' : 'ltr'}>
                        {orgName || (isAr ? 'اسم الجمعية' : "Nom de l'Association")}
                      </h2>
                      {city && (
                        <p className="text-white/65 text-[10px] mt-0.5">{city}</p>
                      )}
                    </div>
                  </div>

                  {/* Activity badge */}
                  <div>
                    <span className="inline-flex items-center gap-1 bg-white/15 border border-white/25 text-white text-[9px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm tracking-wide">
                      <Icon size={8} />
                      {isAr ? theme.badgeAr : theme.badge}
                    </span>
                  </div>

                  {/* Contact */}
                  <div className="space-y-0.5">
                    {org.email && (
                      <div className="flex items-center gap-1.5 text-white/75 text-[10px]">
                        <Mail size={8} className="flex-shrink-0" />
                        <span className="truncate">{org.email}</span>
                      </div>
                    )}
                    {org.phone && (
                      <div className="flex items-center gap-1.5 text-white/75 text-[10px]">
                        <Phone size={8} className="flex-shrink-0" />
                        <span>{org.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Social pills */}
                  <div className="flex gap-1 flex-wrap">
                    <Pill label="WA" bg="#25d366" url={org.whatsapp} />
                    <Pill label="FB" bg="#1877f2" url={org.facebook} />
                    <Pill label="IG" bg="#e1306c" url={org.instagram} />
                    <Pill label="TK" bg="#010101" url={org.tiktok} />
                    <Pill label="YT" bg="#ff0000" url={org.youtube} />
                  </div>
                </div>

                {/* Right: QR */}
                <div className="flex flex-col items-center justify-center flex-shrink-0">
                  <div className="p-1.5 rounded-xl shadow-lg" style={{ background: theme.qrBg }}>
                    <QRCode value={vCard} size={76} fgColor={theme.qrFg} bgColor={theme.qrBg}
                      style={{ display: 'block' }} />
                  </div>
                  <p className="text-white/55 text-[8px] mt-1 text-center">
                    {isAr ? 'امسح للتواصل' : 'Scannez-moi'}
                  </p>
                </div>
              </div>

              {/* Bottom shine */}
              <div className="absolute bottom-0 inset-x-0 h-px bg-white/20" />
            </div>
          </div>

          {/* ══ TABS ══════════════════════════════════════════════════════════ */}
          <div className="flex gap-1 px-5 pt-4">
            {TABS.map(({ key, fr, ar }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {isAr ? ar : fr}
              </button>
            ))}
          </div>

          {/* ══ TAB CONTENT ══════════════════════════════════════════════════ */}
          <div className="px-5 py-4 space-y-2.5">

            {/* ── Share actions tab ── */}
            {tab === 'card' && (
              <>
                <button onClick={shareWA}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                  <div className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                    <MessageCircle size={16} className="text-white" />
                  </div>
                  <div className={isAr ? 'text-right' : 'text-left'}>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {isAr ? 'مشاركة عبر واتساب' : 'Partager via WhatsApp'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isAr ? 'إرسال معلومات الجمعية' : 'Envoyer les informations'}
                    </p>
                  </div>
                </button>

                <button onClick={copyContact}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
                  <div className="w-9 h-9 bg-gray-700 dark:bg-gray-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-white" />}
                  </div>
                  <div className={isAr ? 'text-right' : 'text-left'}>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {copied
                        ? (isAr ? 'تم النسخ ✓' : 'Copié ✓')
                        : (isAr ? 'نسخ معلومات التواصل' : 'Copier les coordonnées')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isAr ? 'البريد والهاتف والمدينة' : 'Email, téléphone, ville'}
                    </p>
                  </div>
                </button>

                <button onClick={() => window.print()}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Printer size={16} className="text-white" />
                  </div>
                  <div className={isAr ? 'text-right' : 'text-left'}>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {isAr ? 'طباعة / حفظ PDF' : 'Imprimer / Enregistrer PDF'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isAr ? 'طباعة البطاقة أو تصديرها' : 'Imprimer ou exporter la carte'}
                    </p>
                  </div>
                </button>
              </>
            )}

            {/* ── Large QR tab ── */}
            {tab === 'qr' && (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="p-4 rounded-2xl border-[3px]"
                  style={{ borderColor: theme.qrFg + '30', background: theme.qrBg }}>
                  <QRCode value={vCard} size={196} fgColor={theme.qrFg} bgColor={theme.qrBg} />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {isAr ? 'رمز المشاركة (vCard)' : 'QR de partage (vCard)'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {isAr
                      ? 'امسح الرمز بكاميرا الهاتف لحفظ معلومات التواصل مباشرة في جهات الاتصال'
                      : 'Scannez ce code avec votre caméra pour enregistrer les coordonnées directement dans vos contacts'}
                  </p>
                </div>
                <button onClick={copyContact}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? (isAr ? 'تم النسخ!' : 'Copié !') : (isAr ? 'نسخ معلومات التواصل' : 'Copier les coordonnées')}
                </button>
              </div>
            )}

            {/* ── Payment tab ── */}
            {tab === 'payment' && (
              <div className="space-y-3">
                {hasBankInfo ? (
                  <>
                    <div className="space-y-2">
                      {org.bankName && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Landmark size={15} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">{isAr ? 'البنك' : 'Banque'}</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{org.bankName}</p>
                          </div>
                        </div>
                      )}
                      {org.bankAccount && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                            <CreditCard size={15} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">{isAr ? 'رقم الحساب' : 'N° de compte'}</p>
                            <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white tracking-wider">{org.bankAccount}</p>
                          </div>
                        </div>
                      )}
                      {org.bankRib && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-700 dark:text-purple-400 text-[10px] font-extrabold">RIB</span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">RIB</p>
                            <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white tracking-wider">{org.bankRib}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-2 pt-2">
                      <div className="p-3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white">
                        <QRCode value={paymentQrValue} size={140} fgColor="#1e293b" bgColor="#ffffff" />
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        {isAr ? 'رمز QR للتحويل البنكي' : 'QR code pour virement bancaire'}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                      <Landmark size={22} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isAr ? 'لم يتم إضافة معلومات البنك' : 'Aucune information bancaire'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {isAr ? 'أضفها من الإعدادات ← البريد والحساب البنكي' : 'Ajoutez-les dans Paramètres → Email et compte bancaire'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5">
            <p className="text-center text-[10px] text-gray-400">
              {isAr ? 'مدعوم من منصة Mar E-A.C' : 'Propulsé par la plateforme Mar E-A.C'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
