import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, UserCheck, FileText, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { meetingsApi, membersApi, votingApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/utils';
import { downloadBlob } from '../../lib/utils';

export const MeetingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [meeting, setMeeting] = useState<any>(null);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [votingSessions, setVotingSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('attendance');
  const [loading, setLoading] = useState(true);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showAddAttendeesModal, setShowAddAttendeesModal] = useState(false);
  const [decisionForm, setDecisionForm] = useState({ description: '', assignedTo: '', dueDate: '' });
  const [voteSessionForm, setVoteSessionForm] = useState({ title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [quorumError, setQuorumError] = useState<{ boardTotal: number; boardPresent: number; quorum: number } | null>(null);

  const BOARD_ROLES = ['PRESIDENT', 'VICE_PRESIDENT', 'TREASURER', 'SECRETARY', 'ADVISOR'];

  const load = async () => {
    if (!id) return;
    try {
      const [m, sess] = await Promise.all([meetingsApi.getById(id), votingApi.getSessions(id)]);
      setMeeting(m.data);
      setVotingSessions(sess.data);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    membersApi.getAll({ isActive: true }).then((r) => setAllMembers(r.data));
  }, [id]);

  const handleMarkAttendance = async (memberId: string, present: boolean) => {
    if (!id) return;
    await meetingsApi.markAttendance(id, memberId, present);
    load();
  };

  const handleAddDecision = async () => {
    if (!id || !decisionForm.description) return;
    setSaving(true); setSaveError(null);
    try {
      await meetingsApi.addDecision(id, decisionForm);
      setShowDecisionModal(false);
      setDecisionForm({ description: '', assignedTo: '', dueDate: '' });
      load();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleCreateVoteSession = async () => {
    if (!id || !voteSessionForm.title) return;
    setSaving(true); setSaveError(null);
    try {
      await votingApi.createSession(id, voteSessionForm);
      setShowVoteModal(false);
      setVoteSessionForm({ title: '', description: '' });
      load();
    } catch (err: any) {
      const errData = err?.response?.data;
      if (errData?.code === 'QUORUM_NOT_MET') {
        setShowVoteModal(false);
        setQuorumError(errData);
      } else {
        setSaveError(errData?.message || 'Erreur lors de la sauvegarde');
      }
    } finally { setSaving(false); }
  };

  const handleCastVote = async (sessionId: string, memberId: string, choice: string) => {
    try {
      await votingApi.castVote(sessionId, { memberId, choice });
      load();
    } catch (err: any) {
      toast({ type: 'error', message: err.response?.data?.message || t('common.error') });
    }
  };

  const handleCloseVoting = async (sessionId: string) => {
    await votingApi.closeSession(sessionId);
    load();
  };

  const handleAddAttendees = async () => {
    if (!id || !selectedMemberIds.length) return;
    setSaving(true); setSaveError(null);
    try {
      await meetingsApi.addAttendees(id, selectedMemberIds);
      setShowAddAttendeesModal(false);
      setSelectedMemberIds([]);
      load();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleGeneratePV = async () => {
    if (!id) return;
    try {
      const res = await meetingsApi.generatePV(id, lang);
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), `PV_${meeting?.title}.pdf`);
    } catch {}
  };

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    await meetingsApi.update(id, { status });
    load();
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!meeting) return <div className="text-center py-16 text-gray-500">{t('common.noData')}</div>;

  const TABS = ['attendance', 'decisions', 'voting', 'pv'];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link to="/meetings" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-4">
          <ArrowLeft size={16} />{t('common.back')}
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="page-title">{meeting.title}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
              <span>{formatDate(meeting.date, lang)}</span>
              {meeting.location && <span>• {meeting.location}</span>}
              <span className={`badge ${meeting.status === 'COMPLETED' ? 'badge-green' : meeting.status === 'IN_PROGRESS' ? 'badge-yellow' : 'badge-blue'}`}>
                {t(`meetings.statuses.${meeting.status}`)}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {meeting.status === 'SCHEDULED' && <button onClick={() => handleStatusChange('IN_PROGRESS')} className="btn-primary text-sm">{t('meetings.startMeeting')}</button>}
            {meeting.status === 'IN_PROGRESS' && <button onClick={() => handleStatusChange('COMPLETED')} className="btn-success text-sm">{t('meetings.endMeeting')}</button>}
          </div>
        </div>
      </div>

      {/* Agenda */}
      {meeting.agenda && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('meetings.agenda')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{meeting.agenda}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t(`meetings.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (() => {
        const boardAttendances = meeting.attendances.filter((a: any) => BOARD_ROLES.includes(a.member?.role));
        const adherentAttendances = meeting.attendances.filter((a: any) => !BOARD_ROLES.includes(a.member?.role));
        const totalPresent = meeting.attendances.filter((a: any) => a.present).length;

        const AttendanceRow = ({ att }: { att: any }) => (
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="text-primary-700 dark:text-primary-400 text-xs font-semibold">{att.member?.name?.charAt(0)}</span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{att.member?.name}</div>
                <div className="text-xs text-gray-500">{t(`members.roles.${att.member?.role}`)}</div>
              </div>
            </div>
            <button
              onClick={() => handleMarkAttendance(att.memberId, !att.present)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${att.present ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'}`}>
              {att.present ? <UserCheck size={14} /> : null}
              {att.present ? t('meetings.present') : t('meetings.absent')}
            </button>
          </div>
        );

        return (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">
                {totalPresent} / {meeting.attendances.length} {lang === 'ar' ? 'حاضرون' : 'présents'}
              </div>
              <button onClick={() => setShowAddAttendeesModal(true)} className="btn-secondary text-sm">
                <Plus size={14} />{t('meetings.addAttendees')}
              </button>
            </div>

            {meeting.attendances.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">{lang === 'ar' ? 'لم يتم إضافة أي حاضر بعد' : 'Aucun participant ajouté'}</p>
            ) : (
              <div className="space-y-5">
                {boardAttendances.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                        {lang === 'ar' ? 'المكتب الإداري' : 'Bureau administratif'}
                      </span>
                      <span className="text-xs text-gray-400">({boardAttendances.filter((a: any) => a.present).length}/{boardAttendances.length})</span>
                    </div>
                    <div className="space-y-2">
                      {boardAttendances.map((att: any) => <AttendanceRow key={att.id} att={att} />)}
                    </div>
                  </div>
                )}
                {adherentAttendances.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        {lang === 'ar' ? 'المنخرطون' : 'Adhérents'}
                      </span>
                      <span className="text-xs text-gray-400">({adherentAttendances.filter((a: any) => a.present).length}/{adherentAttendances.length})</span>
                    </div>
                    <div className="space-y-2">
                      {adherentAttendances.map((att: any) => <AttendanceRow key={att.id} att={att} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Decisions Tab */}
      {activeTab === 'decisions' && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('meetings.decisions')} ({meeting.decisions.length})</h3>
            <button onClick={() => setShowDecisionModal(true)} className="btn-primary text-sm"><Plus size={14} />{t('meetings.addDecision')}</button>
          </div>
          {meeting.decisions.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">{lang === 'ar' ? 'لا توجد قرارات بعد' : 'Aucune décision'}</p>
          ) : (
            <div className="space-y-3">
              {meeting.decisions.map((d: any, i: number) => (
                <div key={d.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-400 flex-shrink-0">{i + 1}</span>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">{d.description}</p>
                      {d.assignedTo && <p className="text-xs text-gray-500 mt-1">{lang === 'ar' ? 'المسؤول' : 'Responsable'}: {d.assignedTo}</p>}
                      {d.dueDate && <p className="text-xs text-gray-500">{lang === 'ar' ? 'الموعد النهائي' : 'Échéance'}: {formatDate(d.dueDate, lang)}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Voting Tab */}
      {activeTab === 'voting' && (() => {
        const boardAttendances = meeting.attendances.filter((a: any) => BOARD_ROLES.includes(a.member?.role));
        const boardPresent = boardAttendances.filter((a: any) => a.present);
        const boardTotal = boardAttendances.length;
        const quorum = Math.floor(boardTotal / 2) + 1;
        const quorumMet = boardTotal > 0 && boardPresent.length >= quorum;

        return (
          <div className="space-y-4">
            {/* Quorum banner */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${quorumMet ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
              {quorumMet
                ? <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                : <AlertTriangle size={18} className="text-red-500 shrink-0" />}
              <span className={`font-medium ${quorumMet ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                {boardTotal === 0
                  ? (lang === 'ar' ? 'لم يُضف أي عضو من المكتب الإداري بعد — أضف الحضور أولاً' : 'Aucun membre du bureau ajouté — ajoutez les présences d\'abord')
                  : quorumMet
                    ? (lang === 'ar' ? `النصاب مكتمل ✓ — ${boardPresent.length} من ${boardTotal} أعضاء المكتب حاضرون` : `Quorum atteint ✓ — ${boardPresent.length}/${boardTotal} membres du bureau présents`)
                    : (lang === 'ar' ? `النصاب غير مكتمل — حاضر ${boardPresent.length} من ${boardTotal}، يجب ${quorum} على الأقل` : `Quorum non atteint — ${boardPresent.length}/${boardTotal} présents, ${quorum} requis`)}
              </span>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setShowVoteModal(true)} className="btn-primary text-sm">
                <Plus size={14} />{lang === 'ar' ? 'جلسة تصويت جديدة' : 'Nouvelle session de vote'}
              </button>
            </div>

            {votingSessions.length === 0 ? (
              <div className="card p-8 text-center text-gray-400 text-sm">{lang === 'ar' ? 'لا توجد جلسات تصويت' : 'Aucune session de vote'}</div>
            ) : (
              <div className="space-y-4">
                {votingSessions.map((session) => {
                  const yes = session.votes?.filter((v: any) => v.choice === 'YES').length || 0;
                  const no = session.votes?.filter((v: any) => v.choice === 'NO').length || 0;
                  const abstain = session.votes?.filter((v: any) => v.choice === 'ABSTAIN').length || 0;
                  const totalVotes = yes + no + abstain;
                  const passed = yes > no;
                  const getVote = (memberId: string) => session.votes?.find((v: any) => v.memberId === memberId);

                  const btnBase = 'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors';

                  return (
                    <div key={session.id} className="card p-4 space-y-4">
                      {/* Session header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{session.title}</h4>
                          {session.description && <p className="text-sm text-gray-500 mt-0.5">{session.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={session.isOpen ? 'badge-green' : 'badge-gray'}>
                            {session.isOpen ? (lang === 'ar' ? 'مفتوح' : 'Ouvert') : (lang === 'ar' ? 'مغلق' : 'Clôturé')}
                          </span>
                          {session.isOpen && (
                            <button onClick={() => handleCloseVoting(session.id)} className="btn-secondary text-xs py-1">
                              {lang === 'ar' ? 'إغلاق' : 'Clôturer'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* OPEN SESSION: per-member voting */}
                      {session.isOpen && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                              {lang === 'ar' ? 'تصويت أعضاء المكتب الإداري' : 'Vote du bureau administratif'}
                            </span>
                            <span className="text-xs text-gray-400">{totalVotes}/{boardPresent.length} {lang === 'ar' ? 'صوّتوا' : 'ont voté'}</span>
                          </div>
                          {boardPresent.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">{lang === 'ar' ? 'لا يوجد أعضاء مكتب حاضرون' : 'Aucun membre du bureau présent'}</p>
                          ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                              {boardPresent.map((att: any) => {
                                const v = getVote(att.memberId);
                                return (
                                  <div key={att.memberId} className="flex items-center justify-between px-3 py-2.5 gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{att.member?.name}</div>
                                      <div className="text-xs text-gray-400">{t(`members.roles.${att.member?.role}`)}</div>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                      <button onClick={() => handleCastVote(session.id, att.memberId, 'YES')}
                                        className={`${btnBase} ${v?.choice === 'YES' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-emerald-400 hover:text-emerald-600'}`}>
                                        {lang === 'ar' ? 'نعم' : 'Oui'}
                                      </button>
                                      <button onClick={() => handleCastVote(session.id, att.memberId, 'NO')}
                                        className={`${btnBase} ${v?.choice === 'NO' ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-red-400 hover:text-red-600'}`}>
                                        {lang === 'ar' ? 'لا' : 'Non'}
                                      </button>
                                      <button onClick={() => handleCastVote(session.id, att.memberId, 'ABSTAIN')}
                                        className={`${btnBase} ${v?.choice === 'ABSTAIN' ? 'bg-gray-400 text-white border-gray-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400'}`}>
                                        {lang === 'ar' ? 'امتناع' : 'Abst.'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {totalVotes > 0 && (
                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex gap-4 text-xs">
                              <span className="text-emerald-600 font-medium">{lang === 'ar' ? 'نعم' : 'Oui'}: {yes}</span>
                              <span className="text-red-500 font-medium">{lang === 'ar' ? 'لا' : 'Non'}: {no}</span>
                              {abstain > 0 && <span className="text-gray-500">{lang === 'ar' ? 'امتناع' : 'Abst.'}: {abstain}</span>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* CLOSED SESSION: results report */}
                      {!session.isOpen && (
                        <div className="space-y-3">
                          {/* Verdict */}
                          <div className={`flex items-center gap-3 p-3 rounded-xl border ${totalVotes === 0 ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700' : passed ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                            <span className="text-2xl">{totalVotes === 0 ? '📭' : passed ? '✅' : '❌'}</span>
                            <div>
                              <p className={`font-semibold text-sm ${totalVotes === 0 ? 'text-gray-500' : passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                {totalVotes === 0
                                  ? (lang === 'ar' ? 'لم يتم التصويت' : 'Aucun vote enregistré')
                                  : passed
                                    ? (lang === 'ar' ? 'القرار مقبول بالأغلبية' : 'Décision adoptée à la majorité')
                                    : (lang === 'ar' ? 'القرار مرفوض' : 'Décision rejetée')}
                              </p>
                              {totalVotes > 0 && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {lang === 'ar'
                                    ? `نعم: ${yes} (${Math.round(yes / totalVotes * 100)}%) · لا: ${no} (${Math.round(no / totalVotes * 100)}%)${abstain > 0 ? ` · امتناع: ${abstain}` : ''}`
                                    : `Oui: ${yes} (${Math.round(yes / totalVotes * 100)}%) · Non: ${no} (${Math.round(no / totalVotes * 100)}%)${abstain > 0 ? ` · Abst.: ${abstain}` : ''}`}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Per-member breakdown */}
                          {boardAttendances.length > 0 && (
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {lang === 'ar' ? 'تفصيل تصويت المكتب' : 'Détail des votes du bureau'}
                                </span>
                              </div>
                              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {boardAttendances.map((att: any) => {
                                  const v = getVote(att.memberId);
                                  const colorMap: Record<string, string> = {
                                    YES: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                                    NO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                    ABSTAIN: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
                                  };
                                  const labelMap: Record<string, string> = {
                                    YES: lang === 'ar' ? 'نعم' : 'Oui',
                                    NO: lang === 'ar' ? 'لا' : 'Non',
                                    ABSTAIN: lang === 'ar' ? 'امتناع' : 'Abstention',
                                  };
                                  return (
                                    <div key={att.memberId} className={`flex items-center justify-between px-3 py-2 ${!v ? 'opacity-50' : ''}`}>
                                      <div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{att.member?.name}</span>
                                        <span className="text-xs text-gray-400 ms-2">{t(`members.roles.${att.member?.role}`)}</span>
                                      </div>
                                      {v
                                        ? <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${colorMap[v.choice]}`}>{labelMap[v.choice]}</span>
                                        : <span className="text-xs text-gray-400">{lang === 'ar' ? 'لم يصوّت' : "N'a pas voté"}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* PV Tab */}
      {activeTab === 'pv' && (
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={handleGeneratePV} className="btn-primary"><Download size={16} />{t('meetings.generatePV')}</button>
          </div>
          {meeting.pvUrl && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">{lang === 'ar' ? 'المحضر المرفوع' : 'PV importé'}:</p>
              <a href={meeting.pvUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-sm flex items-center gap-1">
                <FileText size={14} />{lang === 'ar' ? 'عرض المحضر' : 'Voir le PV'}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Add Decision Modal */}
      <Modal isOpen={showDecisionModal} onClose={() => { setShowDecisionModal(false); setSaveError(null); }} title={t('meetings.addDecision')}
        footer={<><button onClick={() => { setShowDecisionModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleAddDecision} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
          {saveError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
          <div>
            <label className="label">{t('common.description')} *</label>
            <textarea className="input" rows={3} value={decisionForm.description} onChange={(e) => setDecisionForm({ ...decisionForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{lang === 'ar' ? 'المسؤول' : 'Responsable'}</label>
              <input className="input" value={decisionForm.assignedTo} onChange={(e) => setDecisionForm({ ...decisionForm, assignedTo: e.target.value })} />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'الموعد النهائي' : 'Échéance'}</label>
              <input className="input" type="date" value={decisionForm.dueDate} onChange={(e) => setDecisionForm({ ...decisionForm, dueDate: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Create Vote Session Modal */}
      <Modal isOpen={showVoteModal} onClose={() => { setShowVoteModal(false); setSaveError(null); }} title={lang === 'ar' ? 'إنشاء جلسة تصويت' : 'Créer une session de vote'}
        footer={<><button onClick={() => { setShowVoteModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleCreateVoteSession} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
          {saveError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
          <div>
            <label className="label">{lang === 'ar' ? 'موضوع التصويت' : 'Sujet du vote'} *</label>
            <input className="input" value={voteSessionForm.title} onChange={(e) => setVoteSessionForm({ ...voteSessionForm, title: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('common.description')}</label>
            <textarea className="input" rows={2} value={voteSessionForm.description} onChange={(e) => setVoteSessionForm({ ...voteSessionForm, description: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Quorum Error Modal */}
      <Modal
        isOpen={!!quorumError}
        onClose={() => setQuorumError(null)}
        title={lang === 'ar' ? '⚠️ النصاب القانوني غير مكتمل' : '⚠️ Quorum légal non atteint'}
        footer={<button onClick={() => setQuorumError(null)} className="btn-primary">{lang === 'ar' ? 'حسناً، سأكمل الحضور' : 'Compris — compléter la présence'}</button>}
      >
        {quorumError && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {lang === 'ar'
                ? `لا يمكن فتح جلسة تصويت قانونية. يشترط القانون حضور النصف زائد واحد (${quorumError.quorum}) من أعضاء المكتب الإداري (${quorumError.boardTotal} إجمالاً).`
                : `Impossible d'ouvrir une session de vote légale. La loi exige la présence de la majorité absolue (${quorumError.quorum}) des membres du bureau administratif (${quorumError.boardTotal} au total).`}
            </p>
            <div className="flex items-center justify-center gap-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-500">{quorumError.boardPresent}</p>
                <p className="text-xs text-gray-500 mt-1">{lang === 'ar' ? 'حاضر' : 'Présents'}</p>
              </div>
              <div className="text-2xl text-gray-300">/</div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-600 dark:text-gray-300">{quorumError.boardTotal}</p>
                <p className="text-xs text-gray-500 mt-1">{lang === 'ar' ? 'إجمالي المكتب' : 'Total bureau'}</p>
              </div>
              <div className="text-2xl text-gray-300">→</div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-500">{quorumError.quorum}</p>
                <p className="text-xs text-gray-500 mt-1">{lang === 'ar' ? 'مطلوب' : 'Requis'}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">
              {lang === 'ar'
                ? 'يرجى تسجيل حضور المزيد من أعضاء المكتب في تبويب "الحضور" أولاً.'
                : 'Veuillez marquer la présence de plus de membres du bureau dans l\'onglet "Présence" d\'abord.'}
            </p>
          </div>
        )}
      </Modal>

      {/* Add Attendees Modal */}
      <Modal isOpen={showAddAttendeesModal} onClose={() => { setShowAddAttendeesModal(false); setSaveError(null); }} title={t('meetings.addAttendees')}
        footer={<><button onClick={() => { setShowAddAttendeesModal(false); setSaveError(null); }} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleAddAttendees} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.add')}</button></>}
      >
        {saveError && <div className="p-3 mb-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
        {(() => {
          const available = allMembers.filter((m) => !meeting.attendances.some((a: any) => a.memberId === m.id));
          const boardAvail = available.filter((m) => BOARD_ROLES.includes(m.role));
          const adherentAvail = available.filter((m) => !BOARD_ROLES.includes(m.role));

          const MemberCheckbox = ({ m }: { m: any }) => (
            <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <input type="checkbox" checked={selectedMemberIds.includes(m.id)}
                onChange={(e) => setSelectedMemberIds(e.target.checked ? [...selectedMemberIds, m.id] : selectedMemberIds.filter((id) => id !== m.id))} />
              <span className="text-sm text-gray-900 dark:text-white">{m.name}</span>
              <span className="text-xs text-gray-500">{t(`members.roles.${m.role}`)}</span>
            </label>
          );

          if (available.length === 0) {
            return <p className="text-sm text-gray-400 text-center py-4">{lang === 'ar' ? 'جميع الأعضاء مضافون بالفعل' : 'Tous les membres sont déjà ajoutés'}</p>;
          }

          return (
            <div className="max-h-80 overflow-y-auto space-y-4">
              {boardAvail.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1 px-2">
                    {lang === 'ar' ? 'المكتب الإداري' : 'Bureau administratif'}
                  </p>
                  {boardAvail.map((m) => <MemberCheckbox key={m.id} m={m} />)}
                </div>
              )}
              {adherentAvail.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1 px-2">
                    {lang === 'ar' ? 'المنخرطون' : 'Adhérents'}
                  </p>
                  {adherentAvail.map((m) => <MemberCheckbox key={m.id} m={m} />)}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
