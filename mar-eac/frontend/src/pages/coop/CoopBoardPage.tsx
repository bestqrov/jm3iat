import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Plus, Edit2, Trash2, X, CheckCircle, ChevronDown, ChevronRight, AlertCircle, Users, Pencil } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { coopApi, membersApi } from '../../lib/api';
import { SkeletonList } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';
import { formatDate } from '../../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BoardDecision { id: string; description: string; assignedTo?: string; dueDate?: string; status: string; }
interface BoardMeeting {
  id: string; title: string; date: string; location?: string; agenda?: string;
  pvContent?: string; status: string; sessionType?: string;
  decisions: BoardDecision[];
}

// ── Board member constants ─────────────────────────────────────────────────────

const BOARD_ROLES = ['PRESIDENT', 'VICE_PRESIDENT', 'TREASURER', 'SECRETARY', 'ADVISOR', 'OFFICE_STAFF'];
const boardRoleOrder = ['PRESIDENT', 'VICE_PRESIDENT', 'TREASURER', 'SECRETARY', 'ADVISOR', 'OFFICE_STAFF'];

const roleBadgeColor: Record<string, string> = {
  PRESIDENT:      'badge-red',
  VICE_PRESIDENT: 'badge-purple',
  TREASURER:      'badge-yellow',
  SECRETARY:      'badge-blue',
  ADVISOR:        'badge-green',
  OFFICE_STAFF:   'badge-primary',
};

const roleIcon: Record<string, string> = {
  PRESIDENT:      '👑',
  VICE_PRESIDENT: '🎖️',
  TREASURER:      '💰',
  SECRETARY:      '📋',
  ADVISOR:        '💡',
  OFFICE_STAFF:   '🗂️',
};

const roleLabel = (role: string, ar: boolean): string => {
  const labels: Record<string, [string, string]> = {
    PRESIDENT:      ['الرئيس',        'Président(e)'],
    VICE_PRESIDENT: ['نائب الرئيس',   'Vice-Président(e)'],
    TREASURER:      ['أمين المال',    'Trésorier(e)'],
    SECRETARY:      ['الكاتب العام',  'Secrétaire Général(e)'],
    ADVISOR:        ['مستشار',        'Conseiller(e)'],
    OFFICE_STAFF:   ['موظف المكتب',   'Personnel de bureau'],
  };
  return labels[role]?.[ar ? 0 : 1] ?? role;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><X size={18} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const CoopBoardPage: React.FC = () => {
  const { lang } = useLanguage();
  const { organization } = useAuth();
  const ar = lang === 'ar';

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString(ar ? 'ar-MA' : 'fr-FR') : '—';

  // ── Board members state ────────────────────────────────────────────────────
  const [boardMembers, setBoardMembers]   = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberModal, setMemberModal]     = useState(false);
  const [editMember, setEditMember]       = useState<any>(null);
  const [memberForm, setMemberForm]       = useState({ name: '', phone: '', email: '', role: 'PRESIDENT', joinDate: '' });
  const [memberError, setMemberError]     = useState('');
  const [memberSaving, setMemberSaving]   = useState(false);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [deleting, setDeleting]           = useState(false);

  // ── Meetings state ─────────────────────────────────────────────────────────
  const [meetings, setMeetings]           = useState<BoardMeeting[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [expanded, setExpanded]           = useState<string | null>(null);
  const [boardModal, setBoardModal]       = useState(false);
  const [decisionModal, setDecisionModal] = useState<string | null>(null);
  const [editMeeting, setEditMeeting]     = useState<BoardMeeting | null>(null);

  const [boardForm, setBoardForm] = useState({ title: '', sessionType: 'ORDINARY', date: '', location: '', agenda: '', pvContent: '' });
  const [decisionForm, setDecisionForm] = useState({ description: '', assignedTo: '', dueDate: '' });

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await membersApi.getAll();
      const board = (res.data as any[])
        .filter((m: any) => BOARD_ROLES.includes(m.role))
        .sort((a: any, b: any) => boardRoleOrder.indexOf(a.role) - boardRoleOrder.indexOf(b.role));
      setBoardMembers(board);
    } catch { /* ignore */ }
    setMembersLoading(false);
  }, []);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try { const r = await coopApi.getBoardMeetings(); setMeetings(r.data); }
    catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadMembers(); loadMeetings(); }, [loadMembers, loadMeetings]);

  // ── Member handlers ────────────────────────────────────────────────────────

  const openAddMember = () => {
    setEditMember(null);
    setMemberForm({ name: '', phone: '', email: '', role: 'PRESIDENT', joinDate: '' });
    setMemberError('');
    setMemberModal(true);
  };

  const openEditMember = (m: any) => {
    setEditMember(m);
    setMemberForm({ name: m.name, phone: m.phone || '', email: m.email || '', role: m.role, joinDate: m.joinDate?.split('T')[0] || '' });
    setMemberError('');
    setMemberModal(true);
  };

  const saveMember = async () => {
    if (!memberForm.name.trim()) { setMemberError(ar ? 'الاسم مطلوب' : 'Nom requis'); return; }
    setMemberSaving(true);
    setMemberError('');
    try {
      if (editMember) await membersApi.update(editMember.id, memberForm);
      else await membersApi.create(memberForm);
      setMemberModal(false);
      loadMembers();
    } catch (err: any) {
      setMemberError(err.response?.data?.message || (ar ? 'حدث خطأ' : 'Erreur'));
    } finally { setMemberSaving(false); }
  };

  const handleDeleteMember = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try { await membersApi.delete(deleteId); setDeleteId(null); loadMembers(); }
    finally { setDeleting(false); }
  };

  // ── Meeting handlers ───────────────────────────────────────────────────────

  const openBoardModal = (m?: BoardMeeting) => {
    if (m) { setEditMeeting(m); setBoardForm({ title: m.title, sessionType: m.sessionType || 'ORDINARY', date: m.date?.slice(0,10) || '', location: m.location || '', agenda: m.agenda || '', pvContent: m.pvContent || '' }); }
    else   { setEditMeeting(null); setBoardForm({ title: '', sessionType: 'ORDINARY', date: '', location: '', agenda: '', pvContent: '' }); }
    setBoardModal(true);
  };

  const saveMeeting = async () => {
    try {
      if (editMeeting) await coopApi.updateBoardMeeting(editMeeting.id, boardForm);
      else await coopApi.createBoardMeeting(boardForm);
      setBoardModal(false); loadMeetings();
    } catch (e: any) { setError(e.response?.data?.message || 'Erreur'); }
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm(ar ? 'حذف هذا الاجتماع؟' : 'Supprimer cette réunion ?')) return;
    await coopApi.deleteBoardMeeting(id); loadMeetings();
  };

  const saveDecision = async () => {
    if (!decisionModal || !decisionForm.description.trim()) return;
    try {
      await coopApi.addBoardDecision(decisionModal, decisionForm);
      setDecisionModal(null); setDecisionForm({ description: '', assignedTo: '', dueDate: '' }); loadMeetings();
    } catch (e: any) { setError(e.response?.data?.message || 'Erreur'); }
  };

  const toggleDecision = async (meetingId: string, decisionId: string, status: string) => {
    await coopApi.updateBoardDecision(meetingId, decisionId, { status: status === 'DONE' ? 'PENDING' : 'DONE' });
    loadMeetings();
  };

  const markHeld = async (id: string) => {
    await coopApi.updateBoardMeeting(id, { status: 'HELD' }); loadMeetings();
  };

  const counts = { SCHEDULED: meetings.filter(m => m.status === 'SCHEDULED').length, HELD: meetings.filter(m => m.status === 'HELD').length, pending: meetings.reduce((a, m) => a + m.decisions.filter(d => d.status !== 'DONE').length, 0) };

  return (
    <div className="p-4 space-y-6" dir={ar ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)' }}>
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Users size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">{ar ? 'مجلس الإدارة' : 'Conseil d\'Administration'}</h1>
          <p className="text-sm text-teal-100 mt-0.5">{organization?.name}</p>
        </div>
      </div>

      {/* ── SECTION 1: أعضاء الإدارة ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {ar ? 'أعضاء الإدارة' : 'Membres du bureau'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {ar ? `${boardMembers.length} عضو` : `${boardMembers.length} membre(s)`}
            </p>
          </div>
          <button onClick={openAddMember} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-medium transition-colors">
            <Plus size={14} />{ar ? 'إضافة عضو' : 'Ajouter'}
          </button>
        </div>

        {membersLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : boardMembers.length === 0 ? (
          <Card className="text-center py-10">
            <Users size={36} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{ar ? 'لا يوجد أعضاء إدارة بعد' : 'Aucun membre du bureau'}</p>
            <button onClick={openAddMember} className="mt-3 text-xs text-teal-600 hover:underline">
              {ar ? '+ إضافة أول عضو' : '+ Ajouter le premier membre'}
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {boardMembers.map((m) => (
              <Card key={m.id} className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0 text-lg">
                    {roleIcon[m.role] || '👤'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white truncate text-sm">{m.name}</div>
                    {m.email && <div className="text-xs text-gray-400 truncate">{m.email}</div>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`badge ${roleBadgeColor[m.role] || 'badge-gray'} text-xs`}>
                    {roleLabel(m.role, ar)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {m.isActive ? (ar ? 'نشط' : 'Actif') : (ar ? 'غير نشط' : 'Inactif')}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                  {m.phone && <div>{ar ? 'هاتف: ' : 'Tél : '}<span className="text-gray-700 dark:text-gray-300">{m.phone}</span></div>}
                  <div>{ar ? 'منذ: ' : 'Depuis : '}<span className="text-gray-700 dark:text-gray-300">{formatDate(m.joinDate, lang)}</span></div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button onClick={() => openEditMember(m)} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-medium">
                    <Pencil size={12} />{ar ? 'تعديل' : 'Modifier'}
                  </button>
                  <button onClick={() => setDeleteId(m.id)} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium">
                    <Trash2 size={12} />{ar ? 'حذف' : 'Supprimer'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2: الاجتماعات ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {ar ? 'اجتماعات مجلس الإدارة' : 'Réunions du conseil'}
            </h2>
          </div>
          <button onClick={() => openBoardModal()} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-medium transition-colors">
            <Plus size={14} />{ar ? 'اجتماع جديد' : 'Nouvelle réunion'}
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center"><CalendarDays size={16} /></div>
            <div><div className="text-xs text-gray-500 dark:text-gray-400">{ar ? 'مجدولة' : 'Planifiées'}</div><div className="text-lg font-bold text-gray-900 dark:text-white">{counts.SCHEDULED}</div></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center"><CheckCircle size={16} /></div>
            <div><div className="text-xs text-gray-500 dark:text-gray-400">{ar ? 'منعقدة' : 'Tenues'}</div><div className="text-lg font-bold text-gray-900 dark:text-white">{counts.HELD}</div></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${counts.pending > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-400'}`}><AlertCircle size={16} /></div>
            <div><div className="text-xs text-gray-500 dark:text-gray-400">{ar ? 'قرارات معلقة' : 'En attente'}</div><div className="text-lg font-bold text-gray-900 dark:text-white">{counts.pending}</div></div>
          </Card>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-red-700 dark:text-red-400 text-sm flex items-center gap-2 mb-3">
            <AlertCircle size={16} />{error}<button onClick={() => setError('')} className="ms-auto"><X size={14} /></button>
          </div>
        )}

        {loading ? (
          <SkeletonList rows={4} />
        ) : meetings.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{ar ? 'لا توجد اجتماعات مسجلة' : 'Aucune réunion enregistrée'}</p>
            <button onClick={() => openBoardModal()} className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs hover:bg-teal-700">
              {ar ? '+ جدولة أول اجتماع' : '+ Planifier la première réunion'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map(mtg => {
              const isOpen = expanded === mtg.id;
              const statusCls = mtg.status === 'HELD' ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' : mtg.status === 'CANCELLED' ? 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400' : 'text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
              const statusLabel = mtg.status === 'HELD' ? (ar ? 'منعقد' : 'Tenu') : mtg.status === 'CANCELLED' ? (ar ? 'ملغى' : 'Annulé') : (ar ? 'مجدول' : 'Planifié');
              const sessionLabel = mtg.sessionType === 'EXTRAORDINARY' ? (ar ? 'استثنائية' : 'Extraordinaire') : (ar ? 'عادية' : 'Ordinaire');
              const doneCount = mtg.decisions.filter(d => d.status === 'DONE').length;

              return (
                <Card key={mtg.id} className="overflow-hidden hover:shadow-sm transition-shadow !p-0">
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                      <CalendarDays size={18} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{mtg.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>{statusLabel}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{sessionLabel}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3 flex-wrap">
                        <span>📅 {fmtDate(mtg.date)}</span>
                        {mtg.location && <span>📍 {mtg.location}</span>}
                        {mtg.decisions.length > 0 && (
                          <span className="text-teal-600 dark:text-teal-400">
                            ✓ {doneCount}/{mtg.decisions.length} {ar ? 'قرار' : 'décisions'}
                          </span>
                        )}
                      </div>
                      {mtg.agenda && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{ar ? 'ج.أ: ' : 'O.J: '}{mtg.agenda}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openBoardModal(mtg)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"><Edit2 size={14} /></button>
                      <button onClick={() => deleteMeeting(mtg.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"><Trash2 size={14} /></button>
                      <button onClick={() => setExpanded(isOpen ? null : mtg.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50">
                      {mtg.pvContent && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">{ar ? '📄 محضر الاجتماع' : '📄 Procès-verbal'}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 leading-relaxed">{mtg.pvContent}</p>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">{ar ? '📋 القرارات' : '📋 Décisions'}</h4>
                          <button onClick={() => setDecisionModal(mtg.id)} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20">
                            <Plus size={12} />{ar ? 'إضافة قرار' : 'Ajouter'}
                          </button>
                        </div>
                        {mtg.decisions.length === 0 ? (
                          <p className="text-xs text-gray-400 italic text-center py-2">{ar ? 'لا توجد قرارات بعد' : 'Aucune décision enregistrée'}</p>
                        ) : (
                          <div className="space-y-2">
                            {mtg.decisions.map(d => (
                              <div key={d.id} className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                <button onClick={() => toggleDecision(mtg.id, d.id, d.status)} className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${d.status === 'DONE' ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-500 hover:border-emerald-400'}`}>
                                  {d.status === 'DONE' && <CheckCircle size={10} className="text-white" />}
                                </button>
                                <span className={`flex-1 text-xs leading-relaxed ${d.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{d.description}</span>
                                <div className="flex-shrink-0 text-xs text-gray-400 text-end space-y-0.5">
                                  {d.assignedTo && <div>→ {d.assignedTo}</div>}
                                  {d.dueDate && <div>{fmtDate(d.dueDate)}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {mtg.status === 'SCHEDULED' && (
                        <button onClick={() => markHeld(mtg.id)} className="text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 dark:border-emerald-700 px-4 py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium">
                          ✓ {ar ? 'تسجيل الاجتماع كمنعقد' : 'Marquer comme tenu'}
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Member Add/Edit Modal ──────────────────────────────────────────── */}
      {memberModal && (
        <Modal
          title={editMember ? (ar ? 'تعديل العضو' : 'Modifier le membre') : (ar ? 'إضافة عضو إداري' : 'Ajouter un membre')}
          onClose={() => setMemberModal(false)}
        >
          <div className="space-y-4">
            {memberError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {memberError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'الاسم الكامل *' : 'Nom complet *'}</label>
              <input className="input" value={memberForm.name} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'رقم الهاتف' : 'Téléphone'}</label>
                <input className="input" type="tel" value={memberForm.phone} onChange={e => setMemberForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'البريد الإلكتروني' : 'Email'}</label>
                <input className="input" type="email" value={memberForm.email} onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'الدور' : 'Rôle'}</label>
                <select className="input" value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}>
                  {BOARD_ROLES.map(r => (
                    <option key={r} value={r}>{roleLabel(r, ar)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'تاريخ الانضمام' : 'Date d\'adhésion'}</label>
                <input className="input" type="date" value={memberForm.joinDate} onChange={e => setMemberForm(f => ({ ...f, joinDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setMemberModal(false)} className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {ar ? 'إلغاء' : 'Annuler'}
              </button>
              <button onClick={saveMember} disabled={memberSaving} className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {memberSaving ? '...' : (ar ? 'حفظ' : 'Enregistrer')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">{ar ? 'حذف العضو' : 'Supprimer le membre'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{ar ? 'هل أنت متأكد من حذف هذا العضو؟' : 'Êtes-vous sûr de vouloir supprimer ce membre ?'}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {ar ? 'إلغاء' : 'Annuler'}
              </button>
              <button onClick={handleDeleteMember} disabled={deleting} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {deleting ? '...' : (ar ? 'حذف' : 'Supprimer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Board Meeting Modal ────────────────────────────────────────────── */}
      {boardModal && (
        <Modal title={editMeeting ? (ar ? 'تعديل الاجتماع' : 'Modifier la réunion') : (ar ? 'اجتماع جديد' : 'Nouvelle réunion')} onClose={() => setBoardModal(false)} wide>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'نوع الجلسة' : 'Type de séance'}</label>
                <select value={boardForm.sessionType} onChange={e => setBoardForm(f => ({ ...f, sessionType: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="ORDINARY">{ar ? 'عادية' : 'Ordinaire'}</option>
                  <option value="EXTRAORDINARY">{ar ? 'استثنائية' : 'Extraordinaire'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'التاريخ *' : 'Date *'}</label>
                <input type="date" value={boardForm.date} onChange={e => setBoardForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'العنوان *' : 'Titre *'}</label>
              <input value={boardForm.title} onChange={e => setBoardForm(f => ({ ...f, title: e.target.value }))} placeholder={ar ? 'اجتماع عادي لمجلس الإدارة' : 'Réunion ordinaire du CA'} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'المكان' : 'Lieu'}</label>
              <input value={boardForm.location} onChange={e => setBoardForm(f => ({ ...f, location: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'جدول الأعمال' : 'Ordre du jour'}</label>
              <textarea rows={3} value={boardForm.agenda} onChange={e => setBoardForm(f => ({ ...f, agenda: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'محضر الاجتماع (PV)' : 'Procès-verbal (PV)'}</label>
              <textarea rows={4} value={boardForm.pvContent} onChange={e => setBoardForm(f => ({ ...f, pvContent: e.target.value }))} placeholder={ar ? 'نص المحضر الرسمي...' : 'Texte officiel du PV...'} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none" />
            </div>
            <button onClick={saveMeeting} className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-medium text-sm hover:bg-teal-700 transition-colors">
              {ar ? 'حفظ' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Decision Modal ─────────────────────────────────────────────────── */}
      {decisionModal && (
        <Modal title={ar ? 'إضافة قرار' : 'Ajouter une décision'} onClose={() => setDecisionModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'نص القرار *' : 'Décision *'}</label>
              <textarea rows={3} value={decisionForm.description} onChange={e => setDecisionForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'مكلف بالتنفيذ' : 'Responsable'}</label>
              <input value={decisionForm.assignedTo} onChange={e => setDecisionForm(f => ({ ...f, assignedTo: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'أجل التنفيذ' : 'Échéance'}</label>
              <input type="date" value={decisionForm.dueDate} onChange={e => setDecisionForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <button onClick={saveDecision} className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-medium text-sm hover:bg-teal-700 transition-colors">
              {ar ? 'حفظ' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
