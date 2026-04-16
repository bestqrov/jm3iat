import React, { useEffect, useState } from 'react';
import { Mail, MessageCircle, Send, Trash2, Plus, Users, CheckCircle, Clock } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { formatDate } from '../../../lib/utils';

interface Campaign {
  id: string;
  title: string;
  subject: string;
  body: string;
  targetGroup: string;
  status: string;
  sentAt?: string;
  scheduledAt?: string;
  recipientCount: number;
  createdAt: string;
}

interface WhatsAppMsg {
  id: string;
  phone: string;
  message: string;
  type: string;
  trigger?: string;
  status: string;
  sentAt?: string;
  createdAt: string;
}

const TARGET_GROUPS = ['ALL', 'TRIAL', 'ACTIVE', 'EXPIRED', 'INACTIVE'];
const WHATSAPP_TRIGGERS = ['TRIAL_EXPIRY', 'PAYMENT_REMINDER', 'PROMOTION', 'INACTIVE'];

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  SENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export const MarketingTab: React.FC = () => {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const mk = (k: string) => t(`sa.marketing.${k}`);
  const sh = (k: string) => t(`sa.shared.${k}`);

  const [subTab, setSubTab] = useState<'email' | 'whatsapp'>('email');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [waMessages, setWaMessages] = useState<WhatsAppMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmSendId, setConfirmSendId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [waSending, setWaSending] = useState(false);

  const emptyCampaign = { title: '', subject: '', body: '', targetGroup: 'ALL', scheduledAt: '' };
  const [campaignForm, setCampaignForm] = useState(emptyCampaign);

  const emptyWa = { phone: '', message: '', trigger: '', targetGroup: 'ALL' };
  const [waForm, setWaForm] = useState(emptyWa);
  const [waMode, setWaMode] = useState<'manual' | 'bulk'>('manual');

  const load = async () => {
    setLoading(true);
    try {
      const [c, w] = await Promise.all([
        superadminApi.getEmailCampaigns(),
        superadminApi.getWhatsAppMessages(),
      ]);
      setCampaigns(c.data);
      setWaMessages(w.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createCampaign = async () => {
    await superadminApi.createEmailCampaign(campaignForm);
    setShowCampaignForm(false);
    setCampaignForm(emptyCampaign);
    await load();
  };

  const sendCampaign = async () => {
    if (!confirmSendId) return;
    setSendingId(confirmSendId);
    setConfirmSendId(null);
    try {
      await superadminApi.sendEmailCampaign(confirmSendId);
      await load();
    } finally {
      setSendingId(null);
    }
  };

  const deleteCampaign = async () => {
    if (!deleteId) return;
    await superadminApi.deleteEmailCampaign(deleteId);
    setDeleteId(null);
    await load();
  };

  const sendWa = async () => {
    setWaSending(true);
    try {
      if (waMode === 'manual') {
        await superadminApi.sendWhatsApp({ phone: waForm.phone, message: waForm.message, trigger: waForm.trigger || undefined });
      } else {
        await superadminApi.sendBulkWhatsApp({ targetGroup: waForm.targetGroup, message: waForm.message, trigger: waForm.trigger || 'PROMOTION' });
      }
      setWaForm(emptyWa);
      await load();
    } finally {
      setWaSending(false);
    }
  };

  const inp = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none';
  const lbl = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  const targetLabel = (tg: string) => {
    if (isAr) {
      const m: Record<string, string> = { ALL: 'الكل', TRIAL: 'تجربة', ACTIVE: 'نشط', EXPIRED: 'منتهي', INACTIVE: 'غير نشط' };
      return m[tg] || tg;
    }
    const m: Record<string, string> = { ALL: 'Toutes', TRIAL: 'Essai', ACTIVE: 'Actif', EXPIRED: 'Expiré', INACTIVE: 'Inactif' };
    return m[tg] || tg;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{mk('title')}</h2>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
        <button
          onClick={() => setSubTab('email')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'email' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Mail size={15} /> {mk('emailTab')}
        </button>
        <button
          onClick={() => setSubTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'whatsapp' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <MessageCircle size={15} /> {mk('whatsappTab')}
        </button>
      </div>

      {/* Email Campaigns */}
      {subTab === 'email' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCampaignForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={15} /> {mk('createCampaign')}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400">{sh('loading')}</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Mail size={48} className="mx-auto mb-3 opacity-30" />
              <p>{mk('noCampaigns')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(c => (
                <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{c.title}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                          {isAr
                            ? { DRAFT: 'مسودة', SENT: 'أُرسل', SCHEDULED: 'مجدول' }[c.status]
                            : { DRAFT: 'Brouillon', SENT: 'Envoyé', SCHEDULED: 'Programmé' }[c.status]
                          }
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{c.subject}</div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {targetLabel(c.targetGroup)}
                        </span>
                        {c.sentAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle size={11} className="text-emerald-500" />
                            {mk('sentAt')} {formatDate(c.sentAt)}
                            {c.recipientCount > 0 && ` · ${c.recipientCount} ${mk('recipients')}`}
                          </span>
                        )}
                        {c.scheduledAt && !c.sentAt && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-blue-500" /> {formatDate(c.scheduledAt)}
                          </span>
                        )}
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
                      <button
                        onClick={() => setDeleteId(c.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                      >
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

      {/* WhatsApp */}
      {subTab === 'whatsapp' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Send Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle size={16} className="text-emerald-500" />
              {mk('whatsapp.title')}
            </h3>

            {/* Manual / Bulk toggle */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-fit text-sm">
              <button
                onClick={() => setWaMode('manual')}
                className={`px-3 py-1.5 rounded-md transition-colors ${waMode === 'manual' ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}
              >
                {mk('whatsapp.sendManual')}
              </button>
              <button
                onClick={() => setWaMode('bulk')}
                className={`px-3 py-1.5 rounded-md transition-colors ${waMode === 'bulk' ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}
              >
                {mk('whatsapp.sendBulk')}
              </button>
            </div>

            {waMode === 'manual' ? (
              <div className="space-y-3">
                <div>
                  <label className={lbl}>{mk('whatsapp.phone')} *</label>
                  <input className={inp} placeholder="+212XXXXXXXXX" value={waForm.phone} onChange={e => setWaForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div>
                <label className={lbl}>{mk('whatsapp.targetGroup')}</label>
                <select className={inp} value={waForm.targetGroup} onChange={e => setWaForm(f => ({ ...f, targetGroup: e.target.value }))}>
                  {['ALL', 'TRIAL', 'ACTIVE', 'EXPIRED'].map(tg => (
                    <option key={tg} value={tg}>{targetLabel(tg)}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={lbl}>{mk('whatsapp.trigger')}</label>
              <select className={inp} value={waForm.trigger} onChange={e => setWaForm(f => ({ ...f, trigger: e.target.value }))}>
                <option value="">{isAr ? 'بدون محفّز' : 'Sans déclencheur'}</option>
                {WHATSAPP_TRIGGERS.map(tr => (
                  <option key={tr} value={tr}>
                    {isAr
                      ? { TRIAL_EXPIRY: 'انتهاء التجربة', PAYMENT_REMINDER: 'تذكير الدفع', PROMOTION: 'عرض', INACTIVE: 'غير نشط' }[tr]
                      : { TRIAL_EXPIRY: 'Fin d\'essai', PAYMENT_REMINDER: 'Rappel paiement', PROMOTION: 'Promotion', INACTIVE: 'Inactivité' }[tr]
                    }
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={lbl}>{mk('whatsapp.message')} *</label>
              <textarea rows={4} className={inp} value={waForm.message} onChange={e => setWaForm(f => ({ ...f, message: e.target.value }))}
                placeholder={isAr ? 'نص الرسالة...' : 'Votre message WhatsApp...'} />
            </div>

            <button
              onClick={sendWa}
              disabled={waSending || !waForm.message || (waMode === 'manual' && !waForm.phone)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Send size={15} />
              {waSending ? sh('loading') : mk('whatsapp.send')}
            </button>
          </div>

          {/* Recent Messages */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{mk('whatsapp.recentMessages')}</h3>
            {waMessages.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <MessageCircle size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{mk('whatsapp.noMessages')}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {waMessages.map(msg => (
                  <div key={msg.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{msg.phone}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${msg.status === 'SENT' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-100 text-red-600'}`}>
                        {msg.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{msg.message}</p>
                    {msg.trigger && <span className="text-xs text-gray-400 mt-1 block">{msg.trigger}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      <Modal isOpen={showCampaignForm} onClose={() => setShowCampaignForm(false)} title={mk('createCampaign')}>
        <div className="space-y-4">
          <div>
            <label className={lbl}>{mk('campaignTitle')} *</label>
            <input className={inp} value={campaignForm.title} onChange={e => setCampaignForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{mk('subject')} *</label>
            <input className={inp} value={campaignForm.subject} onChange={e => setCampaignForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{mk('targetGroup')}</label>
            <select className={inp} value={campaignForm.targetGroup} onChange={e => setCampaignForm(f => ({ ...f, targetGroup: e.target.value }))}>
              {TARGET_GROUPS.map(tg => <option key={tg} value={tg}>{targetLabel(tg)}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>{mk('body')} *</label>
            <textarea rows={6} className={inp} value={campaignForm.body} onChange={e => setCampaignForm(f => ({ ...f, body: e.target.value }))}
              placeholder={isAr ? 'محتوى البريد الإلكتروني...' : 'Contenu de l\'email...'} />
          </div>
          <div>
            <label className={lbl}>{mk('scheduledAt')} ({isAr ? 'اختياري' : 'optionnel'})</label>
            <input type="datetime-local" className={inp} value={campaignForm.scheduledAt} onChange={e => setCampaignForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowCampaignForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            {sh('cancel')}
          </button>
          <button
            onClick={createCampaign}
            disabled={!campaignForm.title || !campaignForm.subject || !campaignForm.body}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {sh('create')}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmSendId}
        onClose={() => setConfirmSendId(null)}
        onConfirm={sendCampaign}
        title={mk('confirmSend')}
        message={mk('confirmSendMsg')}
        variant="default"
      />
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteCampaign}
        title={isAr ? 'حذف الحملة؟' : 'Supprimer la campagne ?'}
        message={isAr ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'Cette action est irréversible.'}
        variant="danger"
      />
    </div>
  );
};
