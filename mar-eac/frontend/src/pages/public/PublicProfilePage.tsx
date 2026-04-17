import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Phone, Mail, Users, Calendar, Briefcase, Facebook, Instagram, Youtube, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { publicApi } from '../../lib/api';

interface OrgProfile {
  id: string;
  name: string;
  nameAr?: string;
  email: string;
  phone?: string;
  city?: string;
  cityAr?: string;
  region?: string;
  description?: string;
  descriptionAr?: string;
  activities?: string;
  logo?: string;
  foundingDate?: string;
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  youtube?: string;
  _count: { members: number; meetings: number; projects: number };
}

export const PublicProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg]       = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [tab, setTab]       = useState<'about' | 'join'>('about');
  const [form, setForm]     = useState({ fullName: '', phone: '', email: '', cin: '', city: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [formErr, setFormErr]       = useState('');

  useEffect(() => {
    if (!slug) return;
    publicApi.getProfile(slug)
      .then(r => setOrg(r.data))
      .catch(() => setError('Association introuvable'))
      .finally(() => setLoading(false));
  }, [slug]);

  const submit = async () => {
    if (!form.fullName || !form.phone) { setFormErr('Nom et téléphone requis / الاسم والهاتف مطلوبان'); return; }
    setSubmitting(true); setFormErr('');
    try {
      await publicApi.submitJoin(slug!, form);
      setSubmitted(true);
    } catch (e: any) {
      setFormErr(e?.response?.data?.message || 'Erreur');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 size={32} className="animate-spin text-indigo-600" />
    </div>
  );

  if (error || !org) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-400 mb-2">404</p>
        <p className="text-gray-500">{error || 'Association introuvable'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="auto">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 text-white">
        <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col items-center text-center gap-4">
          {org.logo && (
            <img src={`/uploads/${org.logo.split('/').pop()}`} alt="logo" className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20 shadow-lg" />
          )}
          <div>
            <h1 className="text-3xl font-bold">{org.name}</h1>
            {org.nameAr && org.nameAr !== org.name && <p className="text-indigo-200 mt-1 text-xl" dir="rtl">{org.nameAr}</p>}
            <p className="text-indigo-300 mt-2 text-sm flex items-center justify-center gap-1.5">
              <MapPin size={13} />{[org.city, org.region].filter(Boolean).join(' — ')}
            </p>
          </div>
          <div className="flex gap-6 text-center mt-2">
            {[
              { icon: <Users size={16} />, val: org._count.members, label: 'Membres' },
              { icon: <Calendar size={16} />, val: org._count.meetings, label: 'Réunions' },
              { icon: <Briefcase size={16} />, val: org._count.projects, label: 'Projets' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-2xl font-bold">{s.val}</div>
                <div className="text-xs text-indigo-300 flex items-center gap-1 justify-center">{s.icon}{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex border-b border-gray-200 bg-white rounded-t-none -mt-0">
          {(['about', 'join'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'about' ? 'À propos / حول الجمعية' : 'Rejoindre / الانضمام'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-b-xl shadow-sm p-6 mb-8">
          {tab === 'about' && (
            <div className="space-y-5">
              {(org.description || org.descriptionAr) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  {org.description && <p className="text-sm text-gray-600 leading-relaxed">{org.description}</p>}
                  {org.descriptionAr && <p className="text-sm text-gray-600 leading-relaxed mt-2" dir="rtl">{org.descriptionAr}</p>}
                </div>
              )}
              {org.activities && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Activités / الأنشطة</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{org.activities}</p>
                </div>
              )}
              <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {org.phone && <a href={`tel:${org.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600"><Phone size={14} />{org.phone}</a>}
                {org.email && <a href={`mailto:${org.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600"><Mail size={14} />{org.email}</a>}
                {org.foundingDate && <span className="flex items-center gap-2 text-sm text-gray-500"><Calendar size={14} />Fondée: {new Date(org.foundingDate).getFullYear()}</span>}
              </div>
              <div className="flex gap-3 mt-2">
                {org.facebook && <a href={org.facebook} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"><Facebook size={16} /></a>}
                {org.instagram && <a href={org.instagram} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100"><Instagram size={16} /></a>}
                {org.youtube && <a href={org.youtube} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100"><Youtube size={16} /></a>}
                {org.whatsapp && <a href={`https://wa.me/${org.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Send size={16} /></a>}
              </div>
            </div>
          )}

          {tab === 'join' && (
            <div>
              {submitted ? (
                <div className="text-center py-10">
                  <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée!</h3>
                  <p className="text-gray-500">تم إرسال طلب الانخراط بنجاح. سنتواصل معك قريباً.</p>
                </div>
              ) : (
                <div className="space-y-4 max-w-md mx-auto">
                  <h3 className="font-semibold text-gray-900">Demande d'adhésion / طلب الانضمام</h3>
                  <div><label className="label">Nom complet / الاسم الكامل *</label><input className="input" value={form.fullName} onChange={e => setForm(p => ({...p, fullName: e.target.value}))} /></div>
                  <div><label className="label">Téléphone / الهاتف *</label><input className="input" type="tel" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} /></div>
                  <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">CIN</label><input className="input" value={form.cin} onChange={e => setForm(p => ({...p, cin: e.target.value}))} /></div>
                    <div><label className="label">Ville / المدينة</label><input className="input" value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} /></div>
                  </div>
                  <div><label className="label">Message</label><textarea className="input h-20 resize-none" value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))} /></div>
                  {formErr && <p className="text-sm text-red-500">{formErr}</p>}
                  <button onClick={submit} disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Envoyer / إرسال
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="text-center text-xs text-gray-400 pb-6">
          Propulsé par <span className="font-semibold text-indigo-500">Mar E-A.C</span>
        </footer>
      </div>
    </div>
  );
};
