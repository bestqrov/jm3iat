import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Mail, MessageCircle, Send, Trash2, Plus, Users, CheckCircle, Clock,
  Zap, Calendar, ToggleLeft, ToggleRight, ChevronDown, BarChart2,
  AlertCircle, RefreshCw, Search, X, Phone,
} from 'lucide-react';
import { superadminApi, marketingApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { formatDate } from '../../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignType = 'no_template' | 'trial_reminder' | 'payment_reminder' | 'promo' | 'renewal' | 'reactivation';
type ScheduleType = 'now' | 'scheduled';
type SendType = 'manual' | 'bulk';
type Channel = 'whatsapp' | 'email' | 'both';
type Segment = 'all' | 'water_users' | 'productive_orgs' | 'trial_expired' | 'inactive_users' | 'by_pack';
type AutoTrigger = 'trial_expired' | 'unpaid_invoice' | 'inactive_user';

interface OrgOption {
  id: string;
  name: string;
  phone: string;
  email?: string;
  modules: string[];
  subscription?: { status: string };
}

interface CampaignForm {
  campaignType: CampaignType;
  channel: Channel;
  sendType: SendType;
  manualOrganizationId: string;   // replaces phoneManual
  segmentation: Segment[];
  scheduleType: ScheduleType;
  scheduleDate: string;
  messageContent: string;
  automationEnabled: boolean;
  automationTrigger: AutoTrigger | '';
  tracking: { sent: boolean; opened: boolean; clicked: boolean };
}

interface MarketingCampaign {
  id: string;
  campaignType: string;
  channel: string;
  sendType: string;
  segmentation: string[];
  messageContent: string;
  scheduleType: string;
  scheduleDate?: string;
  tracking: { sent: boolean; opened: boolean; clicked: boolean };
  automationEnabled: boolean;
  automationTrigger?: string;
  status: string;
  sentAt?: string;
  recipientCount: number;
  createdAt: string;
}

interface EmailCampaign {
  id: string; title: string; subject: string; body: string;
  targetGroup: string; status: string; sentAt?: string;
  scheduledAt?: string; recipientCount: number; createdAt: string;
}

interface WaMessage {
  id: string; phone: string; message: string;
  type: string; trigger?: string; status: string;
  sentAt?: string; createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAMPAIGN_TYPES: CampaignType[] = [
  'no_template', 'trial_reminder', 'payment_reminder', 'promo', 'renewal', 'reactivation',
];

const ALL_SEGMENTS: Segment[] = [
  'all', 'water_users', 'productive_orgs', 'trial_expired', 'inactive_users', 'by_pack',
];

const STATUS_BADGE: Record<string, string> = {
  DRAFT:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  SENT:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  FAILED:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle size={12} className="text-emerald-500" />,
  email:    <Mail size={12} className="text-blue-500" />,
  both:     <BarChart2 size={12} className="text-purple-500" />,
};

const DEFAULT_FORM: CampaignForm = {
  campaignType: 'no_template',
  channel: 'whatsapp',
  sendType: 'bulk',
  manualOrganizationId: '',
  segmentation: ['all'],
  scheduleType: 'now',
  scheduleDate: '',
  messageContent: '',
  automationEnabled: false,
  automationTrigger: '',
  tracking: { sent: false, opened: false, clicked: false },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const MarketingTab: React.FC = () => {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const mk = (k: string) => t(`sa.marketing.${k}`);
  const sh = (k: string) => t(`sa.shared.${k}`);

  // Sub-tab: composer | email | history
  const [subTab, setSubTab] = useState<'composer' | 'email' | 'history'>('composer');

  // Composer state
  const [form, setForm] = useState<CampaignForm>(DEFAULT_FORM);
  const [templates, setTemplates] = useState<Record<string, { fr: string; ar: string }>>({});
  const [templateApplied, setTemplateApplied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [segPreview, setSegPreview] = useState<{ count: number; sample: { name: string; phone: string | null }[] } | null>(null);
  const [segPreviewing, setSegPreviewing] = useState(false);

  // Org picker (manual mode)
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
  const orgPickerRef = useRef<HTMLDivElement>(null);

  // History
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Email tab (legacy)
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailForm, setEmailForm] = useState({ title: '', subject: '', body: '', targetGroup: 'ALL', scheduledAt: '' });
  const [confirmSendId, setConfirmSendId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [emailDeleteId, setEmailDeleteId] = useState<string | null>(null);

  // WhatsApp history (shown in history tab)
  const [waMessages, setWaMessages] = useState<WaMessage[]>([]);

  const inp = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors';
  const lbl = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5';
  const cardCls = 'bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm';

  // ── Loaders ─────────────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    try {
      const res = await marketingApi.getTemplates();
      setTemplates(res.data);
    } catch { /* silent */ }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const [camp, wa] = await Promise.all([
        marketingApi.getCampaigns(),
        superadminApi.getWhatsAppMessages(),
      ]);
      setCampaigns(camp.data?.data ?? camp.data);
      setWaMessages(wa.data);
    } finally {
      setHistLoading(false);
    }
  }, []);

  const loadEmail = useCallback(async () => {
    setEmailLoading(true);
    try {
      const res = await superadminApi.getEmailCampaigns();
      setEmailCampaigns(res.data);
    } finally {
      setEmailLoading(false);
    }
  }, []);

  const loadOrgs = useCallback(async (q?: string) => {
    setOrgsLoading(true);
    try {
      const res = await marketingApi.getOrganizations(q);
      setOrgs(res.data);
    } catch { setOrgs([]); }
    finally { setOrgsLoading(false); }
  }, []);

  // Load orgs when switching to manual mode
  useEffect(() => {
    if (form.sendType === 'manual' && orgs.length === 0) loadOrgs();
  }, [form.sendType, orgs.length, loadOrgs]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (orgPickerRef.current && !orgPickerRef.current.contains(e.target as Node)) {
        setOrgPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    loadTemplates();
    loadHistory();
  }, [loadTemplates, loadHistory]);

  useEffect(() => {
    if (subTab === 'email') loadEmail();
    if (subTab === 'history') loadHistory();
  }, [subTab, loadEmail, loadHistory]);

  // ── Template auto-fill ───────────────────────────────────────────────────────

  const applyTemplate = (type: CampaignType) => {
    setForm(f => ({ ...f, campaignType: type }));
    if (type !== 'no_template' && templates[type]) {
      const msg = isAr ? templates[type].ar : templates[type].fr;
      setForm(f => ({ ...f, campaignType: type, messageContent: msg }));
      setTemplateApplied(true);
    } else {
      setTemplateApplied(false);
    }
  };

  // ── Segmentation multi-select ─────────────────────────────────────────────────

  const toggleSegment = (seg: Segment) => {
    setForm(f => {
      let next: Segment[];
      if (seg === 'all') {
        next = ['all'];
      } else {
        const without = f.segmentation.filter(s => s !== 'all');
        if (without.includes(seg)) {
          const removed = without.filter(s => s !== seg);
          next = removed.length ? removed : ['all'];
        } else {
          next = [...without, seg];
        }
      }
      // Trigger preview for non-'all' selections
      setTimeout(() => previewSegment(next), 0);
      return { ...f, segmentation: next };
    });
  };

  // ── Segment preview ─────────────────────────────────────────────────────────

  const previewSegment = useCallback(async (segs: Segment[]) => {
    if (segs.includes('all') || segs.length === 0) { setSegPreview(null); return; }
    setSegPreviewing(true);
    try {
      const res = await marketingApi.previewSegment(segs);
      setSegPreview(res.data);
    } catch { setSegPreview(null); }
    finally { setSegPreviewing(false); }
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const submitCampaign = async () => {
    setSending(true);
    setSendError(null);
    setSendSuccess(null);
    try {
      const payload = {
        campaignType:      form.campaignType,
        channel:           form.channel,
        sendType:          form.sendType,
        segmentation:      form.segmentation,
        messageContent:    form.messageContent,
        scheduleType:      form.scheduleType,
        scheduleDate:      form.scheduleType === 'scheduled' ? form.scheduleDate : undefined,
        tracking:          form.tracking,
        automationEnabled: form.automationEnabled,
        automationTrigger: form.automationEnabled ? form.automationTrigger : undefined,
        ...(form.sendType === 'manual' ? { manualOrganizationId: form.manualOrganizationId } : {}),
      };
      const res = await marketingApi.send(payload);
      const data = res.data;
      const isScheduled = data?.campaign?.status === 'SCHEDULED';
      const statusMsg = isScheduled
        ? (isAr ? 'تمت جدولة الحملة بنجاح ✓' : 'Campagne programmée avec succès ✓')
        : (isAr
            ? `تم الإرسال إلى n8n — ${data?.recipientCount ?? 0} ${mk('recipients')} ✓`
            : `Envoyé à n8n — ${data?.recipientCount ?? 0} ${mk('recipients')} ✓`);
      setSendSuccess(statusMsg);
      setForm(DEFAULT_FORM);
      setTemplateApplied(false);
      setSegPreview(null);
      setSelectedOrg(null);
      setOrgSearch('');
      loadHistory();
    } catch (err: any) {
      const errData = err?.response?.data;
      const msg = errData?.n8nError
        ? (isAr ? `n8n: ${JSON.stringify(errData.n8nError)}` : `n8n: ${JSON.stringify(errData.n8nError)}`)
        : (errData?.message || (isAr ? 'حدث خطأ' : 'Erreur inconnue'));
      setSendError(msg);
    } finally {
      setSending(false);
    }
  };

  // ── Email legacy actions ─────────────────────────────────────────────────────

  const createEmail = async () => {
    await superadminApi.createEmailCampaign(emailForm);
    setShowEmailForm(false);
    setEmailForm({ title: '', subject: '', body: '', targetGroup: 'ALL', scheduledAt: '' });
    loadEmail();
  };

  const sendEmail = async () => {
    if (!confirmSendId) return;
    setSendingId(confirmSendId);
    setConfirmSendId(null);
    try {
      await superadminApi.sendEmailCampaign(confirmSendId);
      loadEmail();
    } finally { setSendingId(null); }
  };

  const deleteEmail = async () => {
    if (!emailDeleteId) return;
    await superadminApi.deleteEmailCampaign(emailDeleteId);
    setEmailDeleteId(null);
    loadEmail();
  };

  const deleteCampaign = async () => {
    if (!deleteId) return;
    await marketingApi.deleteCampaign(deleteId);
    setDeleteId(null);
    loadHistory();
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const segLabel = (s: string) => mk(`segments.${s}`);

  const targetLabel = (tg: string) => isAr
    ? ({ ALL: 'الكل', TRIAL: 'تجربة', ACTIVE: 'نشط', EXPIRED: 'منتهي', INACTIVE: 'غير نشط' } as any)[tg] || tg
    : ({ ALL: 'Toutes', TRIAL: 'Essai', ACTIVE: 'Actif', EXPIRED: 'Expiré', INACTIVE: 'Inactif' } as any)[tg] || tg;

  const canSubmit = form.messageContent.trim() &&
    (form.sendType === 'bulk' || form.manualOrganizationId) &&
    (form.scheduleType === 'now' || form.scheduleDate);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{mk('title')}</h2>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit text-sm">
        {(['composer', 'email', 'history'] as const).map(tab => {
          const labels: Record<string, string> = {
            composer: mk('composerTab'),
            email:    mk('emailTab'),
            history:  mk('historyTab'),
          };
          const icons: Record<string, React.ReactNode> = {
            composer: <Send size={13} />,
            email:    <Mail size={13} />,
            history:  <Clock size={13} />,
          };
          return (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                subTab === tab
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {icons[tab]} {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* ══════════════ COMPOSER TAB ══════════════ */}
      {subTab === 'composer' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Left: main form */}
          <div className="xl:col-span-2 space-y-4">

            {/* ① Campaign Type */}
            <div className={cardCls}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
                {mk('campaignType')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CAMPAIGN_TYPES.map(ct => (
                  <button
                    key={ct}
                    onClick={() => applyTemplate(ct)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-start ${
                      form.campaignType === ct
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {mk(`campaignTypes.${ct}`)}
                  </button>
                ))}
              </div>
              {templateApplied && (
                <p className="mt-3 text-xs text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5">
                  <CheckCircle size={12} /> {mk('templateHint')}
                </p>
              )}
            </div>

            {/* ② Channel + Send type */}
            <div className={cardCls}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">2</span>
                {mk('channel')} & {mk('sendType')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>{mk('channel')}</label>
                  <div className="flex gap-2">
                    {(['whatsapp', 'email', 'both'] as Channel[]).map(ch => (
                      <button
                        key={ch}
                        onClick={() => setForm(f => ({ ...f, channel: ch }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                          form.channel === ch
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {CHANNEL_ICON[ch]} {mk(`channels.${ch}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={lbl}>{mk('sendType')}</label>
                  <div className="flex gap-2">
                    {(['bulk', 'manual'] as SendType[]).map(st => (
                      <button
                        key={st}
                        onClick={() => setForm(f => ({ ...f, sendType: st }))}
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                          form.sendType === st
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {mk(`sendTypes.${st}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {form.sendType === 'manual' && (
                <div className="mt-4" ref={orgPickerRef}>
                  <label className={lbl}>
                    {isAr ? 'اختر الجمعية *' : 'Choisir l\'association *'}
                  </label>

                  {/* Selected org display */}
                  {selectedOrg ? (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                          <Users size={12} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedOrg.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Phone size={10} /> {selectedOrg.phone}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedOrg(null); setForm(f => ({ ...f, manualOrganizationId: '' })); setOrgPickerOpen(true); }}
                        className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-400 hover:text-indigo-600 flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    /* Search input */
                    <div className="relative">
                      <div className="relative">
                        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          className={`${inp} ps-9`}
                          placeholder={isAr ? 'ابحث باسم الجمعية أو الرقم...' : 'Rechercher par nom ou numéro...'}
                          value={orgSearch}
                          onFocus={() => { setOrgPickerOpen(true); if (!orgSearch) loadOrgs(); }}
                          onChange={e => {
                            setOrgSearch(e.target.value);
                            setOrgPickerOpen(true);
                            loadOrgs(e.target.value);
                          }}
                        />
                        {orgsLoading && (
                          <RefreshCw size={12} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                        )}
                      </div>

                      {/* Dropdown */}
                      {orgPickerOpen && (
                        <div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                          {orgs.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-400">
                              {orgsLoading
                                ? (isAr ? 'جار البحث...' : 'Recherche...')
                                : (isAr ? 'لا توجد جمعيات بأرقام هاتف' : 'Aucune association avec numéro')
                              }
                            </div>
                          ) : (
                            <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                              {orgs.map(org => (
                                <li key={org.id}>
                                  <button
                                    onClick={() => {
                                      setSelectedOrg(org);
                                      setForm(f => ({ ...f, manualOrganizationId: org.id }));
                                      setOrgPickerOpen(false);
                                      setOrgSearch('');
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-start"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                      {org.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{org.name}</p>
                                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                        <Phone size={10} /> {org.phone}
                                        {org.subscription?.status && (
                                          <span className={`ms-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                            org.subscription.status === 'ACTIVE'  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                            org.subscription.status === 'TRIAL'   ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                                            org.subscription.status === 'EXPIRED' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                            'bg-gray-100 text-gray-500'
                                          }`}>
                                            {org.subscription.status}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ③ Segmentation */}
            {form.sendType === 'bulk' && (
              <div className={cardCls}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">3</span>
                  {mk('segmentation')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ALL_SEGMENTS.map(seg => {
                    const active = form.segmentation.includes(seg);
                    return (
                      <button
                        key={seg}
                        onClick={() => toggleSegment(seg)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          active
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {active && <CheckCircle size={11} />}
                        {segLabel(seg)}
                      </button>
                    );
                  })}
                </div>

                {/* Live segment preview */}
                {segPreviewing && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <RefreshCw size={11} className="animate-spin" />
                    {isAr ? 'جار الحساب...' : 'Calcul en cours...'}
                  </p>
                )}
                {!segPreviewing && segPreview && (
                  <div className="mt-3 flex items-center gap-3 p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                    <Users size={13} className="text-indigo-500 flex-shrink-0" />
                    <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                      {segPreview.count} {mk('recipients')}
                      {segPreview.sample.length > 0 && (
                        <span className="font-normal text-indigo-500 ms-2">
                          ({segPreview.sample.map(s => s.name || s.phone).filter(Boolean).join(', ')}
                          {segPreview.count > segPreview.sample.length ? '…' : ''})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ④ Message */}
            <div className={cardCls}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                  {form.sendType === 'bulk' ? '4' : '3'}
                </span>
                {mk('messageContent')}
              </h3>
              <textarea
                rows={5}
                className={inp}
                placeholder={mk('messagePlaceholder')}
                value={form.messageContent}
                onChange={e => {
                  setTemplateApplied(false);
                  setForm(f => ({ ...f, messageContent: e.target.value }));
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">{form.messageContent.length} chars</span>
                {form.messageContent.length > 0 && (
                  <button
                    onClick={() => { setForm(f => ({ ...f, messageContent: '' })); setTemplateApplied(false); }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    {isAr ? 'مسح' : 'Effacer'}
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Right: scheduling + automation + tracking + send */}
          <div className="space-y-4">

            {/* Schedule */}
            <div className={cardCls}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Calendar size={14} className="text-indigo-500" />
                {mk('scheduleType')}
              </h3>
              <div className="flex gap-2 mb-3">
                {(['now', 'scheduled'] as ScheduleType[]).map(st => (
                  <button
                    key={st}
                    onClick={() => setForm(f => ({ ...f, scheduleType: st }))}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                      form.scheduleType === st
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {mk(`scheduleTypes.${st}`)}
                  </button>
                ))}
              </div>
              {form.scheduleType === 'scheduled' && (
                <div>
                  <label className={lbl}>{mk('scheduleDate')}</label>
                  <input
                    type="datetime-local"
                    className={inp}
                    value={form.scheduleDate}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={e => setForm(f => ({ ...f, scheduleDate: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Automation */}
            <div className={cardCls}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Zap size={14} className="text-amber-500" />
                {mk('automation')}
              </h3>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{mk('automationEnabled')}</span>
                <button
                  onClick={() => setForm(f => ({ ...f, automationEnabled: !f.automationEnabled }))}
                  className="flex-shrink-0"
                >
                  {form.automationEnabled
                    ? <ToggleRight size={26} className="text-indigo-600" />
                    : <ToggleLeft size={26} className="text-gray-300 dark:text-gray-600" />
                  }
                </button>
              </div>
              {form.automationEnabled && (
                <div>
                  <label className={lbl}>{mk('automationTrigger')}</label>
                  <select
                    className={inp}
                    value={form.automationTrigger}
                    onChange={e => setForm(f => ({ ...f, automationTrigger: e.target.value as AutoTrigger }))}
                  >
                    <option value="">{isAr ? 'اختر المُحفّز' : 'Choisir un déclencheur'}</option>
                    {(['trial_expired', 'unpaid_invoice', 'inactive_user'] as AutoTrigger[]).map(at => (
                      <option key={at} value={at}>{mk(`automationTriggers.${at}`)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Tracking */}
            <div className={cardCls}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <BarChart2 size={14} className="text-purple-500" />
                {mk('tracking')}
              </h3>
              <div className="space-y-2.5">
                {([
                  { key: 'sent',    label: mk('trackingSent') },
                  { key: 'opened',  label: mk('trackingOpened') },
                  { key: 'clicked', label: mk('trackingClicked') },
                ] as { key: keyof CampaignForm['tracking']; label: string }[]).map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                    <button
                      onClick={() => setForm(f => ({ ...f, tracking: { ...f.tracking, [key]: !f.tracking[key] } }))}
                    >
                      {form.tracking[key]
                        ? <ToggleRight size={22} className="text-indigo-600" />
                        : <ToggleLeft size={22} className="text-gray-300 dark:text-gray-600" />
                      }
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {/* Feedback */}
            {sendError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{sendError}</span>
              </div>
            )}
            {sendSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle size={15} className="flex-shrink-0" />
                <span>{sendSuccess}</span>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={submitCampaign}
              disabled={sending || !canSubmit}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              {sending
                ? <><RefreshCw size={15} className="animate-spin" /> {mk('sending')}</>
                : <><Send size={15} /> {mk('send')}</>
              }
            </button>

            {/* n8n hint */}
            <p className="text-xs text-center text-gray-400">
              {isAr ? 'يتم الإرسال عبر n8n Webhook' : 'Envoi via n8n Webhook'}
            </p>
          </div>
        </div>
      )}

      {/* ══════════════ EMAIL TAB ══════════════ */}
      {subTab === 'email' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowEmailForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={15} /> {mk('createCampaign')}
            </button>
          </div>
          {emailLoading ? (
            <div className="text-center py-10 text-gray-400">{sh('loading')}</div>
          ) : emailCampaigns.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Mail size={48} className="mx-auto mb-3 opacity-30" />
              <p>{mk('noCampaigns')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emailCampaigns.map(c => (
                <div key={c.id} className={cardCls}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{c.title}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status] || STATUS_BADGE.DRAFT}`}>
                          {mk(`campaignStatus.${c.status}`)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{c.subject}</div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Users size={11} /> {targetLabel(c.targetGroup)}</span>
                        {c.sentAt && <span className="flex items-center gap-1"><CheckCircle size={11} className="text-emerald-500" /> {formatDate(c.sentAt)}</span>}
                        {c.scheduledAt && !c.sentAt && <span className="flex items-center gap-1"><Clock size={11} className="text-blue-500" /> {formatDate(c.scheduledAt)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.status === 'DRAFT' && (
                        <button
                          onClick={() => setConfirmSendId(c.id)}
                          disabled={sendingId === c.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Send size={12} /> {mk('sendNow')}
                        </button>
                      )}
                      <button onClick={() => setEmailDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ HISTORY TAB ══════════════ */}
      {subTab === 'history' && (
        <div className="space-y-5">
          {/* Marketing campaigns */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">{mk('historyTitle')}</h3>
              <button onClick={loadHistory} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
            {histLoading ? (
              <div className="text-center py-8 text-gray-400">{sh('loading')}</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Send size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{mk('noCampaigns')}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {campaigns.map(c => (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="flex-shrink-0 mt-0.5">{CHANNEL_ICON[c.channel] || <MessageCircle size={12} />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {mk(`campaignTypes.${c.campaignType}`) || c.campaignType}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status] || STATUS_BADGE.DRAFT}`}>
                          {mk(`campaignStatus.${c.status}`)}
                        </span>
                        {c.automationEnabled && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <Zap size={10} /> {isAr ? 'أتمتة' : 'Auto'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{c.messageContent}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {c.segmentation?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users size={10} /> {c.segmentation.map(segLabel).join(', ')}
                          </span>
                        )}
                        {c.sentAt && <span>{formatDate(c.sentAt)}</span>}
                        {c.recipientCount > 0 && <span>{c.recipientCount} {mk('recipients')}</span>}
                      </div>
                    </div>
                    <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WhatsApp history */}
          {waMessages.length > 0 && (
            <div className={cardCls}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{mk('whatsapp.recentMessages')}</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {waMessages.map(msg => (
                  <div key={msg.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                    <MessageCircle size={14} className="text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{msg.phone}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${msg.status === 'SENT' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-100 text-red-600'}`}>
                          {msg.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{msg.message}</p>
                    </div>
                    {msg.sentAt && <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(msg.sentAt)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ MODALS ══════════════ */}

      {/* Email create modal */}
      <Modal isOpen={showEmailForm} onClose={() => setShowEmailForm(false)} title={mk('createCampaign')}>
        <div className="space-y-4">
          <div>
            <label className={lbl}>{mk('campaignTitle')} *</label>
            <input className={inp} value={emailForm.title} onChange={e => setEmailForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{mk('subject')} *</label>
            <input className={inp} value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{mk('targetGroup')}</label>
            <select className={inp} value={emailForm.targetGroup} onChange={e => setEmailForm(f => ({ ...f, targetGroup: e.target.value }))}>
              {['ALL', 'TRIAL', 'ACTIVE', 'EXPIRED', 'INACTIVE'].map(tg => <option key={tg} value={tg}>{targetLabel(tg)}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>{mk('body')} *</label>
            <textarea rows={5} className={inp} value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{mk('scheduledAt')} ({isAr ? 'اختياري' : 'optionnel'})</label>
            <input type="datetime-local" className={inp} value={emailForm.scheduledAt} onChange={e => setEmailForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowEmailForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">{sh('cancel')}</button>
          <button
            onClick={createEmail}
            disabled={!emailForm.title || !emailForm.subject || !emailForm.body}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {sh('create')}
          </button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!confirmSendId} onClose={() => setConfirmSendId(null)} onConfirm={sendEmail} title={mk('confirmSend')} message={mk('confirmSendMsg')} />
      <ConfirmDialog isOpen={!!emailDeleteId} onClose={() => setEmailDeleteId(null)} onConfirm={deleteEmail} title={isAr ? 'حذف الحملة؟' : 'Supprimer la campagne ?'} message={isAr ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'Cette action est irréversible.'} variant="danger" />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={deleteCampaign} title={isAr ? 'حذف هذه الحملة؟' : 'Supprimer cette campagne ?'} message={isAr ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'Cette action est irréversible.'} variant="danger" />
    </div>
  );
};
