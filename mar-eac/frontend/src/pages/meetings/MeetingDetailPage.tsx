import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, UserCheck, FileText, Download, Vote, CheckSquare } from 'lucide-react';
import { meetingsApi, membersApi, votingApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { downloadBlob } from '../../lib/utils';

export const MeetingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
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
  const [voteForm, setVoteForm] = useState({ memberId: '', choice: 'YES' });
  const [saving, setSaving] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

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
    setSaving(true);
    try {
      await meetingsApi.addDecision(id, decisionForm);
      setShowDecisionModal(false);
      setDecisionForm({ description: '', assignedTo: '', dueDate: '' });
      load();
    } finally { setSaving(false); }
  };

  const handleCreateVoteSession = async () => {
    if (!id || !voteSessionForm.title) return;
    setSaving(true);
    try {
      await votingApi.createSession(id, voteSessionForm);
      setShowVoteModal(false);
      setVoteSessionForm({ title: '', description: '' });
      load();
    } finally { setSaving(false); }
  };

  const handleCastVote = async (sessionId: string) => {
    if (!voteForm.memberId) return;
    try {
      await votingApi.castVote(sessionId, voteForm);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common.error'));
    }
  };

  const handleCloseVoting = async (sessionId: string) => {
    await votingApi.closeSession(sessionId);
    load();
  };

  const handleAddAttendees = async () => {
    if (!id || !selectedMemberIds.length) return;
    setSaving(true);
    try {
      await meetingsApi.addAttendees(id, selectedMemberIds);
      setShowAddAttendeesModal(false);
      setSelectedMemberIds([]);
      load();
    } finally { setSaving(false); }
  };

  const handleGeneratePV = async () => {
    if (!id) return;
    try {
      const res = await meetingsApi.generatePV(id);
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

  const BOARD_ROLES = ['PRESIDENT', 'VICE_PRESIDENT', 'TREASURER', 'SECRETARY', 'ADVISOR'];

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
                {/* Board members section */}
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

                {/* Adhérents section */}
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
      {activeTab === 'voting' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowVoteModal(true)} className="btn-primary text-sm"><Plus size={14} />{t('voting.createSession')}</button>
          </div>
          {votingSessions.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">{lang === 'ar' ? 'لا توجد جلسات تصويت' : 'Aucune session de vote'}</div>
          ) : (
            votingSessions.map((session) => {
              const total = session.votes?.length || 0;
              const yes = session.votes?.filter((v: any) => v.choice === 'YES').length || 0;
              const no = session.votes?.filter((v: any) => v.choice === 'NO').length || 0;
              const abstain = session.votes?.filter((v: any) => v.choice === 'ABSTAIN').length || 0;
              const chartData = [
                { name: t('voting.yes'), value: yes, fill: '#10b981' },
                { name: t('voting.no'), value: no, fill: '#ef4444' },
                { name: t('voting.abstain'), value: abstain, fill: '#94a3b8' },
              ];
              return (
                <div key={session.id} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{session.title}</h4>
                      {session.description && <p className="text-sm text-gray-500">{session.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={session.isOpen ? 'badge-green' : 'badge-gray'}>{session.isOpen ? t('voting.open') : t('voting.closed')}</span>
                      {session.isOpen && <button onClick={() => handleCloseVoting(session.id)} className="btn-secondary text-xs py-1">{t('voting.close')}</button>}
                    </div>
                  </div>
                  {total > 0 && (
                    <ResponsiveContainer width="100%" height={100}>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                        <Tooltip formatter={(v) => [`${v} (${total ? Math.round((Number(v) / total) * 100) : 0}%)`, '']} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {chartData.map((entry, i) => <rect key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {session.isOpen && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex gap-2 flex-wrap">
                        <select className="input w-auto text-xs" value={voteForm.memberId} onChange={(e) => setVoteForm({ ...voteForm, memberId: e.target.value })}>
                          <option value="">{lang === 'ar' ? 'اختر عضواً' : 'Choisir un membre'}</option>
                          {allMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <select className="input w-auto text-xs" value={voteForm.choice} onChange={(e) => setVoteForm({ ...voteForm, choice: e.target.value })}>
                          <option value="YES">{t('voting.yes')}</option>
                          <option value="NO">{t('voting.no')}</option>
                          <option value="ABSTAIN">{t('voting.abstain')}</option>
                        </select>
                        <button onClick={() => handleCastVote(session.id)} className="btn-primary text-xs py-1.5">{t('voting.vote')}</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

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
      <Modal isOpen={showDecisionModal} onClose={() => setShowDecisionModal(false)} title={t('meetings.addDecision')}
        footer={<><button onClick={() => setShowDecisionModal(false)} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleAddDecision} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
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
      <Modal isOpen={showVoteModal} onClose={() => setShowVoteModal(false)} title={t('voting.createSession')}
        footer={<><button onClick={() => setShowVoteModal(false)} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleCreateVoteSession} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">{t('voting.sessionTitle')} *</label>
            <input className="input" value={voteSessionForm.title} onChange={(e) => setVoteSessionForm({ ...voteSessionForm, title: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('common.description')}</label>
            <textarea className="input" rows={2} value={voteSessionForm.description} onChange={(e) => setVoteSessionForm({ ...voteSessionForm, description: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Add Attendees Modal */}
      <Modal isOpen={showAddAttendeesModal} onClose={() => setShowAddAttendeesModal(false)} title={t('meetings.addAttendees')}
        footer={<><button onClick={() => setShowAddAttendeesModal(false)} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleAddAttendees} disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.add')}</button></>}
      >
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
