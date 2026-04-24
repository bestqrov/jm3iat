import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Users, Calendar, Briefcase,
  Facebook, Instagram, Youtube, Send, CheckCircle2, Loader2,
  Building2, Globe, Star, Heart, Award, TrendingUp,
  FileText, Share2, Copy, Check, Droplets, ShoppingBag, Bus,
  ChevronRight, UserPlus, MessageSquare, Clock,
} from 'lucide-react';
import { publicApi } from '../../lib/api';

interface OrgProfile {
  id: string;
  name: string;
  nameAr?: string;
  email: string;
  phone?: string;
  city?: string;  cityAr?: string;
  region?: string; regionAr?: string;
  address?: string; addressAr?: string;
  description?: string; descriptionAr?: string;
  activities?: string; activitiesAr?: string;
  logo?: string;
  foundingDate?: string;
  facebook?: string; instagram?: string;
  whatsapp?: string; youtube?: string; tiktok?: string;
  modules?: string[];
  _count: { members: number; meetings: number; projects: number };
}

type Tab = 'about' | 'card' | 'join';

const inp = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all';
const lbl = 'block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide';

export const PublicProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg]         = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState<Tab>('about');
  const [form, setForm]       = useState({ fullName: '', phone: '', email: '', city: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [formErr, setFormErr]       = useState('');
  const [copied, setCopied]         = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    publicApi.getProfile(slug)
      .then(r => setOrg(r.data))
      .catch(() => setError('Association introuvable'))
      .finally(() => setLoading(false));
  }, [slug]);

  const submit = async () => {
    if (!form.fullName || !form.phone) { setFormErr('الاسم والهاتف مطلوبان / Nom et téléphone requis'); return; }
    setSubmitting(true); setFormErr('');
    try {
      await publicApi.submitJoin(slug!, form);
      setSubmitted(true);
    } catch (e: any) {
      setFormErr(e?.response?.data?.message || 'Erreur');
    } finally { setSubmitting(false); }
  };

  const shareUrl = window.location.href;
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getModuleLabel = (mod: string) => {
    const map: Record<string, { ar: string; fr: string; icon: React.ReactNode; color: string }> = {
      WATER:      { ar: 'جمعية الماء',     fr: 'Eau & Irrigation',    icon: <Droplets size={13} />,    color: 'bg-cyan-100 text-cyan-700' },
      PRODUCTIVE: { ar: 'إنتاجية',         fr: 'Productive',          icon: <ShoppingBag size={13} />, color: 'bg-emerald-100 text-emerald-700' },
      TRANSPORT:  { ar: 'نقل مدرسي',       fr: 'Transport scolaire',  icon: <Bus size={13} />,         color: 'bg-orange-100 text-orange-700' },
      PROJECTS:   { ar: 'مشاريع',          fr: 'Projets',             icon: <Briefcase size={13} />,   color: 'bg-blue-100 text-blue-700' },
    };
    return map[mod];
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
      <div className="text-center">
        <Loader2 size={36} className="animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400">جارٍ التحميل...</p>
      </div>
    </div>
  );

  if (error || !org) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 size={32} className="text-gray-300" />
        </div>
        <p className="text-2xl font-bold text-gray-300 mb-2">404</p>
        <p className="text-gray-400">{error || 'Association introuvable'}</p>
      </div>
    </div>
  );

  const foundingYear = org.foundingDate ? new Date(org.foundingDate).getFullYear() : null;
  const age = foundingYear ? new Date().getFullYear() - foundingYear : null;
  const modules = org.modules ?? [];

  const TABS: { key: Tab; labelAr: string; labelFr: string; icon: React.ReactNode }[] = [
    { key: 'about', labelAr: 'حول الجمعية',       labelFr: 'À propos',           icon: <Building2 size={14} /> },
    { key: 'card',  labelAr: 'البطاقة الإلكترونية', labelFr: 'Carte électronique', icon: <FileText size={14} /> },
    { key: 'join',  labelAr: 'الانضمام',           labelFr: 'Rejoindre',          icon: <UserPlus size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-br from-indigo-800 via-indigo-700 to-purple-800 text-white overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2" />

        <div className="relative max-w-4xl mx-auto px-6 py-14 flex flex-col items-center text-center gap-5">
          {/* Logo */}
          <div className="relative">
            {org.logo
              ? <img src={`/uploads/${org.logo.split('/').pop()}`} alt="logo" className="w-24 h-24 rounded-2xl object-cover border-4 border-white/30 shadow-2xl" />
              : <div className="w-24 h-24 rounded-2xl bg-white/10 border-4 border-white/20 flex items-center justify-center shadow-2xl">
                  <Building2 size={40} className="text-white/60" />
                </div>
            }
            <span className="absolute -bottom-2 -end-2 w-7 h-7 bg-emerald-400 rounded-full flex items-center justify-center shadow-md">
              <Check size={14} className="text-white" strokeWidth={3} />
            </span>
          </div>

          {/* Name */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{org.name}</h1>
            {org.nameAr && org.nameAr !== org.name && (
              <p className="text-indigo-200 mt-1 text-xl font-medium">{org.nameAr}</p>
            )}
            {(org.city || org.region) && (
              <p className="text-indigo-300 mt-2 text-sm flex items-center justify-center gap-1.5">
                <MapPin size={13} />
                {[org.cityAr || org.city, org.regionAr || org.region].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {/* Module badges */}
          {modules.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {modules.map(m => {
                const cfg = getModuleLabel(m);
                return cfg ? (
                  <span key={m} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-sm`}>
                    {cfg.icon} {cfg.ar}
                  </span>
                ) : null;
              })}
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-8 sm:gap-12 mt-2">
            {[
              { icon: <Users size={18} />,    val: org._count.members,  labelAr: 'منخرط',   labelFr: 'Membres' },
              { icon: <Calendar size={18} />, val: org._count.meetings, labelAr: 'اجتماع',  labelFr: 'Réunions' },
              { icon: <Briefcase size={18}/>, val: org._count.projects, labelAr: 'مشروع',   labelFr: 'Projets' },
              ...(age ? [{ icon: <Clock size={18} />, val: age, labelAr: 'سنة',  labelFr: 'ans' }] : []),
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold">{s.val}</div>
                <div className="text-xs text-indigo-300 flex items-center gap-1 justify-center mt-0.5">
                  {s.icon} {s.labelAr}
                </div>
              </div>
            ))}
          </div>

          {/* CTA + share */}
          <div className="flex gap-3 mt-1">
            <button onClick={() => setTab('join')}
              className="px-6 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors text-sm flex items-center gap-2 shadow-lg">
              <UserPlus size={15} /> انضم الآن
            </button>
            <button onClick={copyLink}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors text-sm flex items-center gap-2 backdrop-blur-sm">
              {copied ? <Check size={15} /> : <Share2 size={15} />}
              {copied ? 'تم النسخ' : 'مشاركة'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 mt-6 shadow-sm">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}>
              {t.icon}
              <span className="hidden sm:inline">{t.labelAr}</span>
              <span className="sm:hidden text-xs">{t.labelAr}</span>
            </button>
          ))}
        </div>

        {/* ── About Tab ── */}
        {tab === 'about' && (
          <div className="mt-6 space-y-5 pb-10">

            {/* Description cards */}
            {(org.description || org.descriptionAr) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-indigo-50 to-white">
                  <MessageSquare size={16} className="text-indigo-500" />
                  <h3 className="font-bold text-gray-900 text-sm">نبذة عن الجمعية</h3>
                </div>
                <div className="px-6 py-5 space-y-3">
                  {org.descriptionAr && (
                    <p className="text-gray-700 leading-loose text-sm">{org.descriptionAr}</p>
                  )}
                  {org.description && org.description !== org.descriptionAr && (
                    <p className="text-gray-500 leading-relaxed text-sm" dir="ltr">{org.description}</p>
                  )}
                </div>
              </div>
            )}

            {/* Activities */}
            {(org.activitiesAr || org.activities) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-emerald-50 to-white">
                  <Star size={16} className="text-emerald-500" />
                  <h3 className="font-bold text-gray-900 text-sm">الأنشطة والاهتمامات</h3>
                </div>
                <div className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    {(org.activitiesAr || org.activities || '').split(/[,،\n]/).map((a, i) => a.trim() && (
                      <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                        {a.trim()}
                      </span>
                    ))}
                  </div>
                  {org.activities && org.activities !== org.activitiesAr && (
                    <p className="text-gray-400 text-xs mt-3" dir="ltr">{org.activities}</p>
                  )}
                </div>
              </div>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Contact */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Phone size={15} className="text-indigo-500" />
                  <h3 className="font-bold text-gray-900 text-sm">التواصل</h3>
                </div>
                <div className="space-y-3">
                  {org.phone && (
                    <a href={`tel:${org.phone}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                      <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Phone size={13} className="text-indigo-500" />
                      </span>
                      <span dir="ltr">{org.phone}</span>
                    </a>
                  )}
                  {org.email && (
                    <a href={`mailto:${org.email}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                      <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Mail size={13} className="text-indigo-500" />
                      </span>
                      <span dir="ltr" className="truncate">{org.email}</span>
                    </a>
                  )}
                  {(org.address || org.addressAr) && (
                    <div className="flex items-start gap-3 text-sm text-gray-600">
                      <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin size={13} className="text-indigo-500" />
                      </span>
                      <span>{org.addressAr || org.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Award size={15} className="text-purple-500" />
                  <h3 className="font-bold text-gray-900 text-sm">معلومات</h3>
                </div>
                <div className="space-y-3">
                  {foundingYear && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Calendar size={13} className="text-purple-500" />
                      </span>
                      <span>تأسست سنة {foundingYear} · {age} سنة</span>
                    </div>
                  )}
                  {(org.city || org.region) && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Globe size={13} className="text-purple-500" />
                      </span>
                      <span>{[org.cityAr || org.city, org.regionAr || org.region].filter(Boolean).join(' — ')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <Users size={13} className="text-purple-500" />
                    </span>
                    <span>{org._count.members} منخرط مسجل</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social media */}
            {(org.facebook || org.instagram || org.youtube || org.whatsapp || org.tiktok) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={15} className="text-blue-500" />
                  <h3 className="font-bold text-gray-900 text-sm">التواصل الاجتماعي</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {org.facebook && (
                    <a href={org.facebook} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                      <Facebook size={15} /> فيسبوك
                    </a>
                  )}
                  {org.instagram && (
                    <a href={org.instagram} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 rounded-xl text-sm font-medium hover:bg-pink-100 transition-colors">
                      <Instagram size={15} /> إنستغرام
                    </a>
                  )}
                  {org.youtube && (
                    <a href={org.youtube} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                      <Youtube size={15} /> يوتيوب
                    </a>
                  )}
                  {org.whatsapp && (
                    <a href={`https://wa.me/${org.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors">
                      <Send size={15} /> واتساب
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Why join CTA */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white text-center">
              <Heart size={28} className="mx-auto mb-3 text-pink-300" />
              <h3 className="text-xl font-bold mb-2">كن جزءاً من الجمعية</h3>
              <p className="text-indigo-200 text-sm mb-5 leading-relaxed">
                انضم إلى {org._count.members} منخرط وساهم في مسيرة العمل الجمعوي بمنطقتك
              </p>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { icon: <Users size={18} />, text: 'شبكة علاقات' },
                  { icon: <TrendingUp size={18} />, text: 'تطوير المهارات' },
                  { icon: <Award size={18} />, text: 'تأثير حقيقي' },
                ].map((b, i) => (
                  <div key={i} className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="flex justify-center mb-1 text-indigo-200">{b.icon}</div>
                    <p className="text-xs text-indigo-100">{b.text}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setTab('join')}
                className="px-8 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-2 mx-auto">
                <UserPlus size={16} /> سجل طلب الانضمام
                <ChevronRight size={16} className="rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* ── Electronic Card Tab ── */}
        {tab === 'card' && (
          <div className="mt-6 pb-10 space-y-5">
            <p className="text-center text-sm text-gray-500">البطاقة التعريفية الرسمية للجمعية</p>

            {/* The card */}
            <div ref={cardRef} className="relative max-w-lg mx-auto">
              <div className="bg-gradient-to-br from-indigo-800 via-indigo-700 to-purple-800 rounded-3xl p-6 text-white shadow-2xl overflow-hidden">
                {/* BG decorations */}
                <div className="absolute top-0 left-0 w-48 h-48 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none" />

                {/* Top row: logo + title + verified */}
                <div className="relative flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {org.logo
                      ? <img src={`/uploads/${org.logo.split('/').pop()}`} alt="logo"
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow-lg" />
                      : <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center">
                          <Building2 size={28} className="text-white/60" />
                        </div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-full tracking-widest uppercase">
                        Mar E-A.C
                      </span>
                      <span className="text-[10px] bg-emerald-400/80 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                        <Check size={9} strokeWidth={3} /> موثقة
                      </span>
                    </div>
                    <h2 className="font-extrabold text-lg leading-tight">{org.name}</h2>
                    {org.nameAr && org.nameAr !== org.name && (
                      <p className="text-indigo-200 text-sm">{org.nameAr}</p>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="my-4 border-t border-white/10" />

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-xs relative">
                  <div>
                    <p className="text-indigo-300 mb-0.5">المدينة / الجهة</p>
                    <p className="font-semibold">{[org.cityAr || org.city, org.regionAr || org.region].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  {foundingYear && (
                    <div>
                      <p className="text-indigo-300 mb-0.5">سنة التأسيس</p>
                      <p className="font-semibold">{foundingYear}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-indigo-300 mb-0.5">عدد المنخرطين</p>
                    <p className="font-semibold">{org._count.members} منخرط</p>
                  </div>
                  <div>
                    <p className="text-indigo-300 mb-0.5">عدد المشاريع</p>
                    <p className="font-semibold">{org._count.projects} مشروع</p>
                  </div>
                  {org.phone && (
                    <div>
                      <p className="text-indigo-300 mb-0.5">الهاتف</p>
                      <p className="font-semibold" dir="ltr">{org.phone}</p>
                    </div>
                  )}
                  {org.email && (
                    <div>
                      <p className="text-indigo-300 mb-0.5">البريد</p>
                      <p className="font-semibold truncate" dir="ltr">{org.email}</p>
                    </div>
                  )}
                </div>

                {/* Modules */}
                {modules.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {modules.map(m => {
                      const cfg = getModuleLabel(m);
                      return cfg ? (
                        <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15">
                          {cfg.icon} {cfg.ar}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Bottom: ID + QR placeholder */}
                <div className="mt-5 flex items-end justify-between relative">
                  <div>
                    <p className="text-[9px] text-indigo-300 mb-0.5 tracking-widest uppercase">رقم التعريف</p>
                    <p className="font-mono text-xs text-indigo-200 tracking-wider">
                      {org.id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  {/* QR-like grid placeholder */}
                  <div className="w-12 h-12 bg-white/10 rounded-xl grid grid-cols-4 gap-0.5 p-1.5 flex-shrink-0">
                    {Array.from({ length: 16 }, (_, i) => (
                      <div key={i} className={`rounded-[1px] ${Math.random() > 0.4 ? 'bg-white/70' : 'bg-transparent'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Share card */}
            <div className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <Share2 size={15} className="text-indigo-500" /> شارك البطاقة
              </h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500 font-mono truncate border border-gray-100">
                  {shareUrl}
                </div>
                <button onClick={copyLink}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors flex-shrink-0">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'تم' : 'نسخ'}
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                {org.whatsapp && (
                  <a href={`https://wa.me/?text=${encodeURIComponent('شاهد صفحة الجمعية: ' + shareUrl)}`}
                    target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium hover:bg-emerald-100 transition-colors">
                    <Send size={13} /> واتساب
                  </a>
                )}
                {org.facebook && (
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium hover:bg-blue-100 transition-colors">
                    <Facebook size={13} /> فيسبوك
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Join Tab ── */}
        {tab === 'join' && (
          <div className="mt-6 pb-10 space-y-5">

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Users size={20} className="text-indigo-500" />,    title: 'مجتمع',       sub: 'شبكة علاقات قوية',    bg: 'bg-indigo-50' },
                { icon: <TrendingUp size={20} className="text-emerald-500"/>, title: 'تطوير',      sub: 'فرص تكوين وتعلم',     bg: 'bg-emerald-50' },
                { icon: <Award size={20} className="text-amber-500" />,     title: 'مشاركة',      sub: 'أنشطة ومشاريع',       bg: 'bg-amber-50' },
              ].map((b, i) => (
                <div key={i} className={`${b.bg} rounded-2xl p-4 text-center`}>
                  <div className="flex justify-center mb-2">{b.icon}</div>
                  <p className="font-bold text-gray-900 text-xs">{b.title}</p>
                  <p className="text-gray-400 text-[10px] mt-0.5">{b.sub}</p>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-4 border-b border-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <UserPlus size={16} className="text-indigo-500" />
                  طلب الانضمام إلى {org.nameAr || org.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">أكمل النموذج وسنتواصل معك قريباً</p>
              </div>

              {submitted ? (
                <div className="text-center py-14 px-6">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={40} className="text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">تم إرسال طلبك!</h3>
                  <p className="text-gray-500 text-sm mb-6">سيتواصل معك مسؤول الجمعية قريباً على الرقم الذي أدخلته</p>
                  <button onClick={() => { setSubmitted(false); setTab('about'); }}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                    العودة للصفحة الرئيسية
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  <div>
                    <label className={lbl}>الاسم الكامل *</label>
                    <input className={inp} placeholder="مثال: محمد الأمين" value={form.fullName} onChange={e => setForm(p => ({...p, fullName: e.target.value}))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>الهاتف *</label>
                      <input className={inp} type="tel" placeholder="06XXXXXXXX" dir="ltr" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
                    </div>
                    <div>
                      <label className={lbl}>المدينة</label>
                      <input className={inp} placeholder="مراكش..." value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>البريد الإلكتروني</label>
                    <input className={inp} type="email" placeholder="exemple@gmail.com" dir="ltr" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
                  </div>
                  <div>
                    <label className={lbl}>رسالة أو ملاحظة (اختياري)</label>
                    <textarea className={`${inp} h-24 resize-none`} placeholder="اكتب سبب رغبتك في الانضمام..." value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))} />
                  </div>
                  {formErr && (
                    <p className="text-sm text-red-500 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-xl">
                      <span>⚠</span> {formErr}
                    </p>
                  )}
                  <button onClick={submit} disabled={submitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {submitting ? 'جارٍ الإرسال...' : 'إرسال طلب الانضمام'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="text-center text-xs text-gray-400 py-6">
          مدعوم بـ <span className="font-semibold text-indigo-500">Mar E-A.C</span> · منصة إدارة الجمعيات
        </footer>
      </div>
    </div>
  );
};
