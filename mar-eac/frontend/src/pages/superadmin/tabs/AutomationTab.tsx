import React, { useEffect, useState } from 'react';
import { Plus, Zap, Play, Pencil, Trash2, ToggleLeft, ToggleRight, Mail, MessageCircle, Ban, Bell } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { formatDate } from '../../../lib/utils';

interface AutomationRule {
  id: string;
  name: string;
  nameAr?: string;
  trigger: string;
  actions: any[];
  isActive: boolean;
  lastRun?: string;
  runCount: number;
  createdAt: string;
}

const TRIGGERS = ['TRIAL_EXPIRED', 'PAYMENT_OVERDUE', 'INACTIVE_30D', 'INACTIVE_60D', 'SUBSCRIPTION_EXPIRING'];
const ACTION_TYPES = ['EMAIL', 'WHATSAPP', 'SUSPEND', 'NOTIFY_ADMIN'];

const ACTION_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail size={12} />,
  WHATSAPP: <MessageCircle size={12} />,
  SUSPEND: <Ban size={12} />,
  NOTIFY_ADMIN: <Bell size={12} />,
};

const TRIGGER_COLORS: Record<string, string> = {
  TRIAL_EXPIRED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PAYMENT_OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  INACTIVE_30D: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  INACTIVE_60D: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  SUBSCRIPTION_EXPIRING: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

// Preset examples shown in sidebar
const PRESET_RULES = [
  {
    nameFr: 'Essai expiré → Email + WhatsApp',
    nameAr: 'انتهاء التجربة ← بريد + واتساب',
    trigger: 'TRIAL_EXPIRED',
    actions: [{ type: 'EMAIL', template: 'trial_expired' }, { type: 'WHATSAPP', template: 'trial_expired' }],
  },
  {
    nameFr: 'Paiement en retard → Rappel',
    nameAr: 'تأخر الدفع ← تذكير',
    trigger: 'PAYMENT_OVERDUE',
    actions: [{ type: 'EMAIL', template: 'payment_reminder' }, { type: 'WHATSAPP', template: 'payment_reminder' }],
  },
  {
    nameFr: 'Inactif 30j → Message marketing',
    nameAr: 'غير نشط 30 يوم ← رسالة تسويقية',
    trigger: 'INACTIVE_30D',
    actions: [{ type: 'EMAIL', template: 'reactivation' }],
  },
];

export const AutomationTab: React.FC = () => {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const au = (k: string) => t(`sa.automation.${k}`);
  const sh = (k: string) => t(`sa.shared.${k}`);

  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ ruleId: string; targetCount: number; results: any[] } | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { name: '', nameAr: '', trigger: 'TRIAL_EXPIRED', actions: ['EMAIL'] };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const res = await superadminApi.getAutomationRules();
      setRules(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = (preset?: typeof PRESET_RULES[0]) => {
    setEditing(null);
    setForm(preset
      ? { name: isAr ? preset.nameAr : preset.nameFr, nameAr: preset.nameAr, trigger: preset.trigger, actions: preset.actions.map(a => a.type) }
      : emptyForm
    );
    setShowForm(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setEditing(rule);
    setForm({
      name: rule.name,
      nameAr: rule.nameAr || '',
      trigger: rule.trigger,
      actions: Array.isArray(rule.actions) ? rule.actions.map((a: any) => typeof a === 'string' ? a : a.type) : [],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        name: form.name,
        nameAr: form.nameAr,
        trigger: form.trigger,
        actions: form.actions.map(type => ({ type })),
      };
      if (editing) {
        await superadminApi.updateAutomationRule(editing.id, data);
      } else {
        await superadminApi.createAutomationRule(data);
      }
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: AutomationRule) => {
    await superadminApi.updateAutomationRule(rule.id, { isActive: !rule.isActive });
    await load();
  };

  const handleRun = async (ruleId: string) => {
    setRunningId(ruleId);
    setRunResult(null);
    try {
      const res = await superadminApi.runAutomationRule(ruleId);
      if (res.data?.execution) {
        setRunResult({ ruleId, ...res.data.execution });
      }
      await load();
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await superadminApi.deleteAutomationRule(deleteId);
    setDeleteId(null);
    await load();
  };

  const toggleAction = (actionType: string) => {
    setForm(f => ({
      ...f,
      actions: f.actions.includes(actionType)
        ? f.actions.filter(a => a !== actionType)
        : [...f.actions, actionType],
    }));
  };

  const triggerLabel = (trigger: string) => {
    if (isAr) {
      const m: Record<string, string> = {
        TRIAL_EXPIRED: 'انتهاء التجربة',
        PAYMENT_OVERDUE: 'تأخر الدفع',
        INACTIVE_30D: 'غير نشط 30 يوماً',
        INACTIVE_60D: 'غير نشط 60 يوماً',
        SUBSCRIPTION_EXPIRING: 'انتهاء الاشتراك',
      };
      return m[trigger] || trigger;
    }
    const m: Record<string, string> = {
      TRIAL_EXPIRED: 'Essai expiré',
      PAYMENT_OVERDUE: 'Paiement en retard',
      INACTIVE_30D: 'Inactif 30 jours',
      INACTIVE_60D: 'Inactif 60 jours',
      SUBSCRIPTION_EXPIRING: 'Abonnement expirant',
    };
    return m[trigger] || trigger;
  };

  const actionLabel = (action: string) => {
    if (isAr) {
      const m: Record<string, string> = { EMAIL: 'بريد', WHATSAPP: 'واتساب', SUSPEND: 'تعليق', NOTIFY_ADMIN: 'إخطار' };
      return m[action] || action;
    }
    const m: Record<string, string> = { EMAIL: 'Email', WHATSAPP: 'WhatsApp', SUSPEND: 'Suspendre', NOTIFY_ADMIN: 'Notifier Admin' };
    return m[action] || action;
  };

  const inp = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none';
  const lbl = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{au('title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isAr ? 'أتمتة الإجراءات بناءً على أحداث المنصة' : 'Automatisez les actions selon les événements de la plateforme'}
          </p>
        </div>
        <button onClick={() => openCreate()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={15} /> {au('createRule')}
        </button>
      </div>

      {/* Presets suggestion bar */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800">
        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-1.5">
          <Zap size={12} /> {au('examples.title')}
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_RULES.map((preset, i) => (
            <button
              key={i}
              onClick={() => openCreate(preset)}
              className="text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            >
              + {isAr ? preset.nameAr : preset.nameFr}
            </button>
          ))}
        </div>
      </div>

      {/* Rules list */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">{sh('loading')}</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Zap size={48} className="mx-auto mb-3 opacity-30" />
          <p>{au('noRules')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className={`bg-white dark:bg-gray-800 rounded-2xl border ${rule.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'} p-4 shadow-sm`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {isAr && rule.nameAr ? rule.nameAr : rule.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TRIGGER_COLORS[rule.trigger] || 'bg-gray-100 text-gray-600'}`}>
                      <Zap size={10} /> {triggerLabel(rule.trigger)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-gray-400">{isAr ? 'الإجراءات:' : 'Actions:'}</span>
                    {(Array.isArray(rule.actions) ? rule.actions : []).map((action: any, i: number) => {
                      const type = typeof action === 'string' ? action : action.type;
                      return (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                          {ACTION_ICONS[type]} {actionLabel(type)}
                        </span>
                      );
                    })}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{au('runCount')}: {rule.runCount} {sh('times')}</span>
                    {rule.lastRun && <span>{au('lastRun')}: {formatDate(rule.lastRun)}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRun(rule.id)}
                    disabled={runningId === rule.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
                  >
                    <Play size={11} /> {runningId === rule.id ? '...' : au('runNow')}
                  </button>
                  <button onClick={() => openEdit(rule)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleToggle(rule)} className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${rule.isActive ? 'text-emerald-500' : 'text-gray-400'}`}>
                    {rule.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                  <button onClick={() => setDeleteId(rule.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? au('editRule') : au('createRule')}>
        <div className="space-y-4">
          <div>
            <label className={lbl}>{au('ruleName')} (FR) *</label>
            <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{au('ruleNameAr')}</label>
            <input className={inp} dir="rtl" value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>{au('trigger')} *</label>
            <select className={inp} value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}>
              {TRIGGERS.map(tr => <option key={tr} value={tr}>{triggerLabel(tr)}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>{au('actions')}</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ACTION_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleAction(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                    form.actions.includes(type)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400'
                  }`}
                >
                  {ACTION_ICONS[type]} {actionLabel(type)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            {sh('cancel')}
          </button>
          <button onClick={handleSave} disabled={saving || !form.name} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {saving ? sh('loading') : sh('save')}
          </button>
        </div>
      </Modal>

      {/* Run result panel */}
      {runResult && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Play size={14} />
              {isAr
                ? `تم التنفيذ — ${runResult.targetCount} جمعية مستهدفة`
                : `Exécution terminée — ${runResult.targetCount} organisation(s) ciblée(s)`}
            </p>
            <button onClick={() => setRunResult(null)} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
              {isAr ? 'إغلاق' : 'Fermer'}
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {runResult.results.length === 0 ? (
              <p className="text-xs text-gray-400">{isAr ? 'لا توجد جمعيات تطابق هذا المشغل.' : 'Aucune organisation ne correspond à ce déclencheur.'}</p>
            ) : (
              runResult.results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`px-1.5 py-0.5 rounded font-mono ${
                    r.status === 'SENT' || r.status === 'SUSPENDED' || r.status === 'REMINDER_CREATED' || r.status === 'LOGGED'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : r.status === 'SKIPPED'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  }`}>{r.status}</span>
                  <span className="text-gray-500 dark:text-gray-400">[{r.type}]</span>
                  <span className="text-gray-400 font-mono text-[11px]">{r.orgId}</span>
                  {r.reason && <span className="text-amber-500 dark:text-amber-400">— {r.reason}</span>}
                  {r.error  && <span className="text-red-500">— {r.error}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={au('confirmDelete')}
        message={isAr ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'Cette action est irréversible.'}
        variant="danger"
      />
    </div>
  );
};
