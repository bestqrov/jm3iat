import React, { useEffect, useState, useCallback } from 'react';
import {
  Trophy, Users, Shield, CalendarDays, Swords,
  Plus, Edit2, Trash2, UserCheck, AlertTriangle,
  ChevronRight, Target, Activity, Star,
} from 'lucide-react';
import { sportsApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonList } from '../../components/ui/Skeleton';
import { formatDate } from '../../lib/utils';

// ─── helpers ──────────────────────────────────────────────────────────────────

const age = (dob?: string | null) => {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
};

const matchResult = (m: any) => {
  if (m.scoreUs == null || m.scoreThem == null) return null;
  if (m.scoreUs > m.scoreThem) return 'WIN';
  if (m.scoreUs < m.scoreThem) return 'LOSS';
  return 'DRAW';
};

const licenseStatus = (expiry?: string | null) => {
  if (!expiry) return 'none';
  const d = new Date(expiry);
  const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'soon';
  return 'ok';
};

// ─── Small reusable components ────────────────────────────────────────────────

const StatCard = ({ icon, label, value, sub, color }: any) => (
  <div className="card p-4 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export const SportsPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const { hasModule } = useAuth();
  const ar = lang === 'ar';
  const s = (t as any).sports;

  const [tab, setTab] = useState<'dashboard' | 'players' | 'teams' | 'trainings' | 'matches'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState<any>(null);
  const [showMatchStatsModal, setShowMatchStatsModal] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forms
  const emptyTeam = { name: '', category: '', coachName: '', coachPhone: '', color: '#16a34a' };
  const emptyPlayer = { name: '', phone: '', email: '', teamId: '', position: '', jerseyNumber: '', dateOfBirth: '', licenseNumber: '', licenseExpiry: '' };
  const emptyTraining = { teamId: '', date: '', location: '', duration: '', notes: '' };
  const emptyMatch = { teamId: '', opponent: '', date: '', location: '', isHome: true, notes: '' };

  const [teamForm, setTeamForm] = useState(emptyTeam);
  const [playerForm, setPlayerForm] = useState(emptyPlayer);
  const [trainingForm, setTrainingForm] = useState(emptyTraining);
  const [matchForm, setMatchForm] = useState(emptyMatch as any);
  const [attendanceState, setAttendanceState] = useState<Record<string, boolean>>({});
  const [matchStatForm, setMatchStatForm] = useState<any>({});
  const [playerFilter, setPlayerFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const [st, tm, pl, tr, ma] = await Promise.all([
        sportsApi.getStats(),
        sportsApi.getTeams(),
        sportsApi.getPlayers(),
        sportsApi.getTrainings(),
        sportsApi.getMatches(),
      ]);
      setStats(st.data);
      setTeams(tm.data);
      setPlayers(pl.data);
      setTrainings(tr.data);
      setMatches(ma.data);
    } catch { /* module not activated */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!hasModule('SPORTS')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <Trophy size={48} className="text-amber-400" />
        <p className="text-gray-500 max-w-sm">{s?.noModule}</p>
      </div>
    );
  }

  // ── CRUD helpers ─────────────────────────────────────────────────────────────

  const openEditTeam = (tm: any) => {
    setEditTarget(tm);
    setTeamForm({ name: tm.name, category: tm.category || '', coachName: tm.coachName || '', coachPhone: tm.coachPhone || '', color: tm.color || '#16a34a' });
    setShowTeamModal(true);
  };
  const openEditPlayer = (pl: any) => {
    setEditTarget(pl);
    setPlayerForm({
      name: pl.name, phone: pl.phone || '', email: pl.email || '',
      teamId: pl.teamId || '', position: pl.position || '', jerseyNumber: pl.jerseyNumber ?? '',
      dateOfBirth: pl.dateOfBirth ? pl.dateOfBirth.split('T')[0] : '',
      licenseNumber: pl.licenseNumber || '',
      licenseExpiry: pl.licenseExpiry ? pl.licenseExpiry.split('T')[0] : '',
    });
    setShowPlayerModal(true);
  };
  const openEditTraining = (tr: any) => {
    setEditTarget(tr);
    setTrainingForm({
      teamId: tr.teamId || '', date: tr.date.split('T')[0],
      location: tr.location || '', duration: tr.duration ?? '', notes: tr.notes || '',
    });
    setShowTrainingModal(true);
  };
  const openEditMatch = (ma: any) => {
    setEditTarget(ma);
    setMatchForm({
      teamId: ma.teamId || '', opponent: ma.opponent,
      date: ma.date.split('T')[0], location: ma.location || '',
      isHome: ma.isHome, notes: ma.notes || '',
    });
    setShowMatchModal(true);
  };

  const saveTeam = async () => {
    if (!teamForm.name.trim()) return;
    setSaving(true); setError(null);
    try {
      if (editTarget) await sportsApi.updateTeam(editTarget.id, teamForm);
      else await sportsApi.createTeam(teamForm);
      setShowTeamModal(false); setEditTarget(null); setTeamForm(emptyTeam);
      load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const savePlayer = async () => {
    if (!playerForm.name.trim()) return;
    setSaving(true); setError(null);
    try {
      if (editTarget) await sportsApi.updatePlayer(editTarget.id, playerForm);
      else await sportsApi.createPlayer(playerForm);
      setShowPlayerModal(false); setEditTarget(null); setPlayerForm(emptyPlayer);
      load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const saveTraining = async () => {
    if (!trainingForm.date) return;
    setSaving(true); setError(null);
    try {
      if (editTarget) await sportsApi.updateTraining(editTarget.id, trainingForm);
      else await sportsApi.createTraining(trainingForm);
      setShowTrainingModal(false); setEditTarget(null); setTrainingForm(emptyTraining);
      load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const saveMatch = async () => {
    if (!matchForm.opponent || !matchForm.date) return;
    setSaving(true); setError(null);
    try {
      if (editTarget) await sportsApi.updateMatch(editTarget.id, matchForm);
      else await sportsApi.createMatch(matchForm);
      setShowMatchModal(false); setEditTarget(null); setMatchForm(emptyMatch);
      load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'team')     await sportsApi.deleteTeam(deleteTarget.id);
      if (deleteTarget.type === 'player')   await sportsApi.deletePlayer(deleteTarget.id);
      if (deleteTarget.type === 'training') await sportsApi.deleteTraining(deleteTarget.id);
      if (deleteTarget.type === 'match')    await sportsApi.deleteMatch(deleteTarget.id);
      setDeleteTarget(null); load();
    } catch {}
  };

  const openAttendance = (tr: any) => {
    const state: Record<string, boolean> = {};
    tr.attendances?.forEach((a: any) => { state[a.playerId] = a.present; });
    setAttendanceState(state);
    setShowAttendanceModal(tr);
  };

  const saveAttendance = async () => {
    if (!showAttendanceModal) return;
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(attendanceState).map(([playerId, present]) =>
          sportsApi.markAttendance({ trainingId: showAttendanceModal.id, playerId, present })
        )
      );
      setShowAttendanceModal(null); load();
    } catch {}
    finally { setSaving(false); }
  };

  const openMatchStats = (ma: any) => {
    const state: any = {};
    ma.stats?.forEach((s: any) => { state[s.playerId] = s; });
    setMatchStatForm(state);
    setShowMatchStatsModal(ma);
  };

  const saveMatchStats = async () => {
    if (!showMatchStatsModal) return;
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(matchStatForm).map(([playerId, data]: any) =>
          sportsApi.upsertMatchStat(showMatchStatsModal.id, { playerId, ...data })
        )
      );
      setShowMatchStatsModal(null); load();
    } catch {}
    finally { setSaving(false); }
  };

  const updateScore = async (matchId: string, field: 'scoreUs' | 'scoreThem', val: string) => {
    await sportsApi.updateMatch(matchId, { [field]: val === '' ? null : parseInt(val) });
    load();
  };

  const updateMatchStatus = async (matchId: string, status: string) => {
    await sportsApi.updateMatch(matchId, { status });
    load();
  };

  const TABS = ['dashboard', 'players', 'teams', 'trainings', 'matches'] as const;
  const POSITIONS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'];
  const CATEGORIES = ['U10', 'U12', 'U15', 'U18', 'SENIOR', 'FEMALE', 'MIXED'];

  const filteredPlayers = playerFilter === 'all' ? players
    : playerFilter === 'active' ? players.filter(p => p.isActive)
    : players.filter(p => p.teamId === playerFilter);

  if (loading) return <SkeletonList rows={4} />;

  return (
    <div className="space-y-6" dir={ar ? 'rtl' : 'ltr'}>
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
            <Trophy size={24} className="text-white" />
          </div>
          <div>
            <h1 className="page-title">{s?.title}</h1>
            <p className="text-sm text-gray-500">{s?.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map((tabKey) => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === tabKey ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {s?.tabs?.[tabKey]}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ───────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Users size={22} className="text-white" />} label={s?.stats?.activePlayers} value={stats?.activePlayers} sub={`/ ${stats?.totalPlayers} ${ar ? 'إجمالي' : 'total'}`} color="bg-amber-500" />
            <StatCard icon={<Shield size={22} className="text-white" />} label={s?.stats?.totalTeams} value={stats?.totalTeams} color="bg-blue-500" />
            <StatCard icon={<CalendarDays size={22} className="text-white" />} label={s?.stats?.trainingsYear} value={stats?.trainingsThisYear} color="bg-emerald-500" />
            <StatCard icon={<Swords size={22} className="text-white" />} label={s?.stats?.totalMatches} value={stats?.totalMatches} color="bg-purple-500" />
          </div>

          {/* Results row */}
          {stats && stats.totalMatches > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="card p-4 text-center border-t-4 border-emerald-500">
                <p className="text-3xl font-bold text-emerald-600">{stats.wins}</p>
                <p className="text-xs text-gray-500 mt-1">{s?.stats?.wins}</p>
              </div>
              <div className="card p-4 text-center border-t-4 border-amber-400">
                <p className="text-3xl font-bold text-amber-500">{stats.draws}</p>
                <p className="text-xs text-gray-500 mt-1">{s?.stats?.draws}</p>
              </div>
              <div className="card p-4 text-center border-t-4 border-red-500">
                <p className="text-3xl font-bold text-red-500">{stats.losses}</p>
                <p className="text-xs text-gray-500 mt-1">{s?.stats?.losses}</p>
              </div>
            </div>
          )}

          {/* Expired licenses alert */}
          {stats?.expiredLicenses > 0 && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle size={20} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                {ar
                  ? `${stats.expiredLicenses} لاعب لديه رخصة منتهية الصلاحية — يُنصح بالتجديد`
                  : `${stats.expiredLicenses} joueur(s) avec licence(s) expirée(s) — renouvellement conseillé`}
              </p>
            </div>
          )}

          {/* Upcoming matches */}
          {matches.filter(m => m.status === 'SCHEDULED').length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Swords size={16} className="text-amber-500" />
                {ar ? 'المباريات القادمة' : 'Prochains matchs'}
              </h3>
              <div className="space-y-2">
                {matches.filter(m => m.status === 'SCHEDULED').slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${m.isHome ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{m.opponent}</p>
                        <p className="text-xs text-gray-400">{m.team?.name} · {m.isHome ? (ar ? 'ملعبنا' : 'Domicile') : (ar ? 'خارج' : 'Extérieur')}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(m.date, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent trainings */}
          {trainings.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                {ar ? 'آخر التدريبات' : 'Derniers entraînements'}
              </h3>
              <div className="space-y-2">
                {trainings.slice(0, 4).map(tr => {
                  const present = tr.attendances?.filter((a: any) => a.present).length || 0;
                  const total = tr.attendances?.length || 0;
                  return (
                    <div key={tr.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{tr.team?.name || (ar ? 'كل الفرق' : 'Toutes équipes')}</p>
                        <p className="text-xs text-gray-400">{tr.location} · {formatDate(tr.date, lang)}</p>
                      </div>
                      {total > 0 && (
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-lg">
                          {present}/{total} {ar ? 'حضور' : 'présents'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TEAMS TAB ───────────────────────────────────────────────────────── */}
      {tab === 'teams' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditTarget(null); setTeamForm(emptyTeam); setShowTeamModal(true); }} className="btn-primary text-sm">
              <Plus size={14} />{s?.teams?.add}
            </button>
          </div>
          {teams.length === 0 ? (
            <div className="card p-10 text-center text-gray-400 text-sm">{s?.teams?.noTeams}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map(tm => (
                <div key={tm.id} className="card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: tm.color || '#d97706' }}>
                        <Shield size={18} className="text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{tm.name}</h4>
                        {tm.category && <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{s?.teams?.categories?.[tm.category]}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditTeam(tm)} className="p-1.5 text-gray-400 hover:text-amber-600"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteTarget({ type: 'team', id: tm.id })} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    {tm.coachName && <p>👤 {tm.coachName}{tm.coachPhone ? ` · ${tm.coachPhone}` : ''}</p>}
                    <p className="flex items-center gap-1">
                      <Users size={12} /> {tm._count?.players || 0} {s?.teams?.players}
                      <span className="mx-1">·</span>
                      <CalendarDays size={12} /> {tm._count?.trainings || 0}
                      <span className="mx-1">·</span>
                      <Swords size={12} /> {tm._count?.matches || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PLAYERS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'players' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setPlayerFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${playerFilter === 'all' ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                {s?.players?.all}
              </button>
              <button onClick={() => setPlayerFilter('active')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${playerFilter === 'active' ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                {s?.players?.active}
              </button>
              {teams.map(tm => (
                <button key={tm.id} onClick={() => setPlayerFilter(tm.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${playerFilter === tm.id ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                  {tm.name}
                </button>
              ))}
            </div>
            <button onClick={() => { setEditTarget(null); setPlayerForm(emptyPlayer); setShowPlayerModal(true); }} className="btn-primary text-sm">
              <Plus size={14} />{s?.players?.add}
            </button>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="card p-10 text-center text-gray-400 text-sm">{s?.players?.noPlayers}</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      {[ar ? '#' : '#', s?.players?.name, s?.players?.team, s?.players?.position, s?.players?.licenseExpiry, ''].map((h, i) => (
                        <th key={i} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${ar ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredPlayers.map(pl => {
                      const ls = licenseStatus(pl.licenseExpiry);
                      return (
                        <tr key={pl.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3 text-sm font-bold text-amber-600 w-10">{pl.jerseyNumber ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <span className="text-amber-700 dark:text-amber-400 text-xs font-bold">{pl.name.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{pl.name}</p>
                                {pl.dateOfBirth && <p className="text-xs text-gray-400">{age(pl.dateOfBirth)} {ar ? 'سنة' : 'ans'}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{pl.team?.name || <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {pl.position ? s?.players?.positions?.[pl.position] : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {ls === 'expired' && <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">{s?.players?.licenseExpired}</span>}
                            {ls === 'soon' && <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">{s?.players?.licenseExpiringSoon}</span>}
                            {ls === 'ok' && <span className="text-xs text-gray-400">{formatDate(pl.licenseExpiry, lang)}</span>}
                            {ls === 'none' && <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => openEditPlayer(pl)} className="p-1.5 text-gray-400 hover:text-amber-600"><Edit2 size={13} /></button>
                              <button onClick={() => setDeleteTarget({ type: 'player', id: pl.id })} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TRAININGS TAB ───────────────────────────────────────────────────── */}
      {tab === 'trainings' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditTarget(null); setTrainingForm(emptyTraining); setShowTrainingModal(true); }} className="btn-primary text-sm">
              <Plus size={14} />{s?.trainings?.add}
            </button>
          </div>
          {trainings.length === 0 ? (
            <div className="card p-10 text-center text-gray-400 text-sm">{s?.trainings?.noTrainings}</div>
          ) : (
            <div className="space-y-3">
              {trainings.map(tr => {
                const present = tr.attendances?.filter((a: any) => a.present).length || 0;
                const total = tr.attendances?.length || 0;
                const rate = total ? Math.round(present / total * 100) : 0;
                return (
                  <div key={tr.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                          <CalendarDays size={18} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">
                            {tr.team?.name || (ar ? 'كل الفرق' : 'Toutes équipes')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(tr.date, lang)}
                            {tr.location && ` · ${tr.location}`}
                            {tr.duration && ` · ${tr.duration} ${ar ? 'د' : 'min'}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {total > 0 && (
                          <div className="text-center">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${rate >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                              {rate}%
                            </span>
                            <p className="text-xs text-gray-400 mt-0.5">{present}/{total}</p>
                          </div>
                        )}
                        <button onClick={() => openAttendance(tr)} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
                          <UserCheck size={13} />{s?.trainings?.attendance}
                        </button>
                        <button onClick={() => openEditTraining(tr)} className="p-1.5 text-gray-400 hover:text-amber-600"><Edit2 size={13} /></button>
                        <button onClick={() => setDeleteTarget({ type: 'training', id: tr.id })} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    {tr.notes && <p className="text-xs text-gray-400 mt-2 ms-12">{tr.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MATCHES TAB ─────────────────────────────────────────────────────── */}
      {tab === 'matches' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditTarget(null); setMatchForm(emptyMatch); setShowMatchModal(true); }} className="btn-primary text-sm">
              <Plus size={14} />{s?.matches?.add}
            </button>
          </div>
          {matches.length === 0 ? (
            <div className="card p-10 text-center text-gray-400 text-sm">{s?.matches?.noMatches}</div>
          ) : (
            <div className="space-y-3">
              {matches.map(ma => {
                const result = matchResult(ma);
                const resultColors: Record<string, string> = {
                  WIN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                  DRAW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                  LOSS: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                };
                return (
                  <div key={ma.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ma.isHome ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <Swords size={18} className={ma.isHome ? 'text-blue-600' : 'text-gray-500'} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">
                            {ma.team?.name || '—'} <span className="text-gray-400 font-normal">vs</span> {ma.opponent}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(ma.date, lang)}
                            {ma.location && ` · ${ma.location}`}
                            {` · ${ma.isHome ? s?.matches?.isHome : s?.matches?.isAway}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Score input inline */}
                        {ma.status === 'SCHEDULED' ? (
                          <div className="flex items-center gap-1">
                            <input type="number" min={0} className="input w-14 text-center py-1 text-sm" placeholder="0"
                              defaultValue={ma.scoreUs ?? ''} onBlur={e => updateScore(ma.id, 'scoreUs', e.target.value)} />
                            <span className="text-gray-400 text-sm">–</span>
                            <input type="number" min={0} className="input w-14 text-center py-1 text-sm" placeholder="0"
                              defaultValue={ma.scoreThem ?? ''} onBlur={e => updateScore(ma.id, 'scoreThem', e.target.value)} />
                          </div>
                        ) : (
                          ma.scoreUs != null && (
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-gray-900 dark:text-white">{ma.scoreUs} – {ma.scoreThem}</span>
                              {result && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${resultColors[result]}`}>{s?.matches?.result?.[result]}</span>}
                            </div>
                          )
                        )}
                        {/* Status control */}
                        {ma.status === 'SCHEDULED' && (
                          <button onClick={() => updateMatchStatus(ma.id, 'COMPLETED')} className="btn-secondary text-xs py-1">
                            {ar ? 'تأكيد النتيجة' : 'Valider'}
                          </button>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ma.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : ma.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                          {s?.matches?.statuses?.[ma.status]}
                        </span>
                        {ma.status === 'COMPLETED' && (
                          <button onClick={() => openMatchStats(ma)} className="btn-secondary text-xs py-1 flex items-center gap-1">
                            <Star size={12} />{s?.matches?.stats}
                          </button>
                        )}
                        <button onClick={() => openEditMatch(ma)} className="p-1.5 text-gray-400 hover:text-amber-600"><Edit2 size={13} /></button>
                        <button onClick={() => setDeleteTarget({ type: 'match', id: ma.id })} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    {ma.notes && <p className="text-xs text-gray-400 mt-2 ms-12">{ma.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}

      {/* Team Modal */}
      <Modal isOpen={showTeamModal} onClose={() => { setShowTeamModal(false); setEditTarget(null); setError(null); }}
        title={editTarget ? s?.teams?.edit : s?.teams?.add}
        footer={<><button onClick={() => { setShowTeamModal(false); setEditTarget(null); setError(null); }} className="btn-secondary">{(t as any).common?.cancel}</button><button onClick={saveTeam} disabled={saving} className="btn-primary">{saving ? (t as any).common?.loading : (t as any).common?.save}</button></>}
      >
        <div className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm text-red-600">{error}</div>}
          <div><label className="label">{s?.teams?.name} *</label>
            <input className="input" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{s?.teams?.category}</label>
              <select className="input" value={teamForm.category} onChange={e => setTeamForm({ ...teamForm, category: e.target.value })}>
                <option value="">{ar ? 'اختر' : 'Choisir'}</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{s?.teams?.categories?.[c]}</option>)}
              </select></div>
            <div><label className="label">{s?.teams?.color}</label>
              <input type="color" className="input h-10 p-1 cursor-pointer" value={teamForm.color} onChange={e => setTeamForm({ ...teamForm, color: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{s?.teams?.coachName}</label>
              <input className="input" value={teamForm.coachName} onChange={e => setTeamForm({ ...teamForm, coachName: e.target.value })} /></div>
            <div><label className="label">{s?.teams?.coachPhone}</label>
              <input className="input" value={teamForm.coachPhone} onChange={e => setTeamForm({ ...teamForm, coachPhone: e.target.value })} /></div>
          </div>
        </div>
      </Modal>

      {/* Player Modal */}
      <Modal isOpen={showPlayerModal} onClose={() => { setShowPlayerModal(false); setEditTarget(null); setError(null); }}
        title={editTarget ? s?.players?.edit : s?.players?.add}
        footer={<><button onClick={() => { setShowPlayerModal(false); setEditTarget(null); setError(null); }} className="btn-secondary">{(t as any).common?.cancel}</button><button onClick={savePlayer} disabled={saving} className="btn-primary">{saving ? (t as any).common?.loading : (t as any).common?.save}</button></>}
      >
        <div className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">{s?.players?.name} *</label>
              <input className="input" value={playerForm.name} onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })} /></div>
            <div><label className="label">{s?.players?.phone}</label>
              <input className="input" value={playerForm.phone} onChange={e => setPlayerForm({ ...playerForm, phone: e.target.value })} /></div>
            <div><label className="label">{s?.players?.email}</label>
              <input className="input" type="email" value={playerForm.email} onChange={e => setPlayerForm({ ...playerForm, email: e.target.value })} /></div>
            <div><label className="label">{s?.players?.team}</label>
              <select className="input" value={playerForm.teamId} onChange={e => setPlayerForm({ ...playerForm, teamId: e.target.value })}>
                <option value="">{s?.players?.noTeam}</option>
                {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </select></div>
            <div><label className="label">{s?.players?.position}</label>
              <select className="input" value={playerForm.position} onChange={e => setPlayerForm({ ...playerForm, position: e.target.value })}>
                <option value="">{ar ? 'اختر' : 'Choisir'}</option>
                {POSITIONS.map(p => <option key={p} value={p}>{s?.players?.positions?.[p]}</option>)}
              </select></div>
            <div><label className="label">{s?.players?.jerseyNumber}</label>
              <input className="input" type="number" min={1} max={99} value={playerForm.jerseyNumber} onChange={e => setPlayerForm({ ...playerForm, jerseyNumber: e.target.value })} /></div>
            <div><label className="label">{s?.players?.dateOfBirth}</label>
              <input className="input" type="date" value={playerForm.dateOfBirth} onChange={e => setPlayerForm({ ...playerForm, dateOfBirth: e.target.value })} /></div>
            <div><label className="label">{s?.players?.licenseNumber}</label>
              <input className="input" value={playerForm.licenseNumber} onChange={e => setPlayerForm({ ...playerForm, licenseNumber: e.target.value })} /></div>
            <div><label className="label">{s?.players?.licenseExpiry}</label>
              <input className="input" type="date" value={playerForm.licenseExpiry} onChange={e => setPlayerForm({ ...playerForm, licenseExpiry: e.target.value })} /></div>
          </div>
        </div>
      </Modal>

      {/* Training Modal */}
      <Modal isOpen={showTrainingModal} onClose={() => { setShowTrainingModal(false); setEditTarget(null); setError(null); }}
        title={editTarget ? s?.trainings?.edit : s?.trainings?.add}
        footer={<><button onClick={() => { setShowTrainingModal(false); setEditTarget(null); setError(null); }} className="btn-secondary">{(t as any).common?.cancel}</button><button onClick={saveTraining} disabled={saving} className="btn-primary">{saving ? (t as any).common?.loading : (t as any).common?.save}</button></>}
      >
        <div className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{s?.trainings?.date} *</label>
              <input className="input" type="date" value={trainingForm.date} onChange={e => setTrainingForm({ ...trainingForm, date: e.target.value })} /></div>
            <div><label className="label">{s?.trainings?.team}</label>
              <select className="input" value={trainingForm.teamId} onChange={e => setTrainingForm({ ...trainingForm, teamId: e.target.value })}>
                <option value="">{ar ? 'كل الفرق' : 'Toutes équipes'}</option>
                {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </select></div>
            <div><label className="label">{s?.trainings?.location}</label>
              <input className="input" value={trainingForm.location} onChange={e => setTrainingForm({ ...trainingForm, location: e.target.value })} /></div>
            <div><label className="label">{s?.trainings?.duration}</label>
              <input className="input" type="number" min={10} value={trainingForm.duration} onChange={e => setTrainingForm({ ...trainingForm, duration: e.target.value })} /></div>
            <div className="col-span-2"><label className="label">{s?.trainings?.notes}</label>
              <textarea className="input" rows={2} value={trainingForm.notes} onChange={e => setTrainingForm({ ...trainingForm, notes: e.target.value })} /></div>
          </div>
        </div>
      </Modal>

      {/* Match Modal */}
      <Modal isOpen={showMatchModal} onClose={() => { setShowMatchModal(false); setEditTarget(null); setError(null); }}
        title={editTarget ? s?.matches?.edit : s?.matches?.add}
        footer={<><button onClick={() => { setShowMatchModal(false); setEditTarget(null); setError(null); }} className="btn-secondary">{(t as any).common?.cancel}</button><button onClick={saveMatch} disabled={saving} className="btn-primary">{saving ? (t as any).common?.loading : (t as any).common?.save}</button></>}
      >
        <div className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">{s?.matches?.opponent} *</label>
              <input className="input" value={matchForm.opponent} onChange={e => setMatchForm({ ...matchForm, opponent: e.target.value })} /></div>
            <div><label className="label">{s?.matches?.date} *</label>
              <input className="input" type="date" value={matchForm.date} onChange={e => setMatchForm({ ...matchForm, date: e.target.value })} /></div>
            <div><label className="label">{s?.teams?.title}</label>
              <select className="input" value={matchForm.teamId} onChange={e => setMatchForm({ ...matchForm, teamId: e.target.value })}>
                <option value="">{ar ? 'اختر' : 'Choisir'}</option>
                {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </select></div>
            <div><label className="label">{s?.matches?.location}</label>
              <input className="input" value={matchForm.location} onChange={e => setMatchForm({ ...matchForm, location: e.target.value })} /></div>
            <div className="flex items-center gap-3 mt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={matchForm.isHome} onChange={e => setMatchForm({ ...matchForm, isHome: e.target.checked })} />
                <span className="text-sm text-gray-700 dark:text-gray-300">{s?.matches?.isHome}</span>
              </label>
            </div>
            <div className="col-span-2"><label className="label">{s?.matches?.notes}</label>
              <textarea className="input" rows={2} value={matchForm.notes} onChange={e => setMatchForm({ ...matchForm, notes: e.target.value })} /></div>
          </div>
        </div>
      </Modal>

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <Modal isOpen={!!showAttendanceModal} onClose={() => setShowAttendanceModal(null)}
          title={`${s?.trainings?.attendance} — ${formatDate(showAttendanceModal.date, lang)}`}
          footer={<><button onClick={() => setShowAttendanceModal(null)} className="btn-secondary">{(t as any).common?.cancel}</button><button onClick={saveAttendance} disabled={saving} className="btn-primary">{saving ? (t as any).common?.loading : s?.trainings?.saveAttendance}</button></>}
        >
          {showAttendanceModal.attendances?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">{ar ? 'لم يُضف لاعبون لهذا الفريق بعد' : 'Aucun joueur dans cette équipe'}</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {showAttendanceModal.attendances?.map((att: any) => (
                <label key={att.playerId} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-700">{att.player?.jerseyNumber ?? '#'}</span>
                    <span className="text-sm text-gray-900 dark:text-white">{att.player?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${attendanceState[att.playerId] ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {attendanceState[att.playerId] ? s?.trainings?.present : s?.trainings?.absent}
                    </span>
                    <input type="checkbox" checked={!!attendanceState[att.playerId]}
                      onChange={e => setAttendanceState({ ...attendanceState, [att.playerId]: e.target.checked })} />
                  </div>
                </label>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Match Stats Modal */}
      {showMatchStatsModal && (
        <Modal isOpen={!!showMatchStatsModal} onClose={() => setShowMatchStatsModal(null)}
          title={`${s?.matches?.stats} — ${showMatchStatsModal.opponent}`}
          footer={<><button onClick={() => setShowMatchStatsModal(null)} className="btn-secondary">{(t as any).common?.cancel}</button><button onClick={saveMatchStats} disabled={saving} className="btn-primary">{saving ? (t as any).common?.loading : (t as any).common?.save}</button></>}
        >
          {(() => {
            const matchPlayers = showMatchStatsModal.teamId
              ? players.filter(p => p.teamId === showMatchStatsModal.teamId && p.isActive)
              : players.filter(p => p.isActive);
            if (matchPlayers.length === 0) return <p className="text-sm text-gray-400 text-center py-4">{s?.players?.noPlayers}</p>;
            return (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <div className={`grid grid-cols-5 gap-1 px-2 py-1 text-xs font-semibold text-gray-500 uppercase`}>
                  <span>{s?.players?.name}</span>
                  <span className="text-center">{s?.matches?.goals}</span>
                  <span className="text-center">{s?.matches?.assists}</span>
                  <span className="text-center">🟨</span>
                  <span className="text-center">🟥</span>
                </div>
                {matchPlayers.map(pl => {
                  const st = matchStatForm[pl.id] || {};
                  const set = (field: string, val: string) => setMatchStatForm({ ...matchStatForm, [pl.id]: { ...st, [field]: parseInt(val) || 0 } });
                  return (
                    <div key={pl.id} className="grid grid-cols-5 gap-1 items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                      <span className="text-sm text-gray-900 dark:text-white truncate">{pl.jerseyNumber ? `#${pl.jerseyNumber} ` : ''}{pl.name}</span>
                      {['goals', 'assists', 'yellowCards', 'redCards'].map(field => (
                        <input key={field} type="number" min={0} max={20} className="input py-1 text-center text-sm"
                          value={st[field] ?? 0} onChange={e => set(field, e.target.value)} />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={ar ? 'تأكيد الحذف' : 'Confirmer la suppression'}
        message={(t as any).common?.confirmDelete}
      />
    </div>
  );
};
