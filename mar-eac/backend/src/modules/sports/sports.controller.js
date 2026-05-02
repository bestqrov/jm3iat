const prisma = require('../../config/database');

const oid = (req) => req.organization.id;

// ── Stats ─────────────────────────────────────────────────────────────────────

const getStats = async (req, res) => {
  try {
    const id = oid(req);
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      totalPlayers, activePlayers, totalTeams,
      totalTrainings, trainingsThisYear, totalMatches,
      wins, draws, losses, expiredLicenses,
    ] = await Promise.all([
      prisma.sportPlayer.count({ where: { organizationId: id } }),
      prisma.sportPlayer.count({ where: { organizationId: id, isActive: true } }),
      prisma.sportTeam.count({ where: { organizationId: id } }),
      prisma.sportTraining.count({ where: { organizationId: id } }),
      prisma.sportTraining.count({ where: { organizationId: id, date: { gte: yearStart } } }),
      prisma.sportMatch.count({ where: { organizationId: id, status: 'COMPLETED' } }),
      prisma.sportMatch.count({
        where: { organizationId: id, status: 'COMPLETED', scoreUs: { gt: prisma.sportMatch.fields.scoreThem } },
      }).catch(() => 0),
      prisma.sportMatch.count({
        where: {
          organizationId: id, status: 'COMPLETED',
          AND: [{ scoreUs: { not: null } }, { scoreThem: { not: null } }],
        },
      }).then(async (completed) => {
        const matches = await prisma.sportMatch.findMany({
          where: { organizationId: id, status: 'COMPLETED', scoreUs: { not: null }, scoreThem: { not: null } },
          select: { scoreUs: true, scoreThem: true },
        });
        return matches.filter(m => m.scoreUs === m.scoreThem).length;
      }).catch(() => 0),
      prisma.sportMatch.findMany({
        where: { organizationId: id, status: 'COMPLETED', scoreUs: { not: null }, scoreThem: { not: null } },
        select: { scoreUs: true, scoreThem: true },
      }).then(matches => matches.filter(m => m.scoreUs < m.scoreThem).length).catch(() => 0),
      prisma.sportPlayer.count({
        where: { organizationId: id, isActive: true, licenseExpiry: { lt: new Date() } },
      }),
    ]);

    // Recalculate wins properly
    const completedMatches = await prisma.sportMatch.findMany({
      where: { organizationId: id, status: 'COMPLETED', scoreUs: { not: null }, scoreThem: { not: null } },
      select: { scoreUs: true, scoreThem: true },
    });
    const winsCalc = completedMatches.filter(m => m.scoreUs > m.scoreThem).length;
    const drawsCalc = completedMatches.filter(m => m.scoreUs === m.scoreThem).length;
    const lossesCalc = completedMatches.filter(m => m.scoreUs < m.scoreThem).length;

    res.json({
      totalPlayers, activePlayers, totalTeams,
      totalTrainings, trainingsThisYear, totalMatches,
      wins: winsCalc, draws: drawsCalc, losses: lossesCalc,
      expiredLicenses,
    });
  } catch (err) {
    console.error('[sports/stats]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Teams ─────────────────────────────────────────────────────────────────────

const getTeams = async (req, res) => {
  try {
    const teams = await prisma.sportTeam.findMany({
      where: { organizationId: oid(req) },
      include: { _count: { select: { players: true, trainings: true, matches: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(teams);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const createTeam = async (req, res) => {
  try {
    const { name, category, coachName, coachPhone, color } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const team = await prisma.sportTeam.create({
      data: { organizationId: oid(req), name, category, coachName, coachPhone, color },
    });
    res.status(201).json(team);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const updateTeam = async (req, res) => {
  try {
    const { name, category, coachName, coachPhone, color } = req.body;
    const team = await prisma.sportTeam.updateMany({
      where: { id: req.params.id, organizationId: oid(req) },
      data: { name, category, coachName, coachPhone, color },
    });
    if (!team.count) return res.status(404).json({ message: 'Team not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const deleteTeam = async (req, res) => {
  try {
    const del = await prisma.sportTeam.deleteMany({ where: { id: req.params.id, organizationId: oid(req) } });
    if (!del.count) return res.status(404).json({ message: 'Team not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// ── Players ───────────────────────────────────────────────────────────────────

const getPlayers = async (req, res) => {
  try {
    const { teamId, isActive } = req.query;
    const where = { organizationId: oid(req) };
    if (teamId) where.teamId = teamId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const players = await prisma.sportPlayer.findMany({
      where,
      include: { team: { select: { id: true, name: true, category: true } } },
      orderBy: [{ teamId: 'asc' }, { name: 'asc' }],
    });
    res.json(players);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const createPlayer = async (req, res) => {
  try {
    const { name, phone, email, teamId, position, jerseyNumber, dateOfBirth, licenseNumber, licenseExpiry } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const player = await prisma.sportPlayer.create({
      data: {
        organizationId: oid(req),
        name, phone, email,
        teamId: teamId || null,
        position,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        licenseNumber,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      },
      include: { team: { select: { id: true, name: true } } },
    });
    res.status(201).json(player);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const updatePlayer = async (req, res) => {
  try {
    const { name, phone, email, teamId, position, jerseyNumber, dateOfBirth, licenseNumber, licenseExpiry, isActive } = req.body;
    const existing = await prisma.sportPlayer.findFirst({ where: { id: req.params.id, organizationId: oid(req) } });
    if (!existing) return res.status(404).json({ message: 'Player not found' });
    const player = await prisma.sportPlayer.update({
      where: { id: req.params.id },
      data: {
        name, phone, email,
        teamId: teamId !== undefined ? (teamId || null) : undefined,
        position,
        jerseyNumber: jerseyNumber !== undefined ? (jerseyNumber ? parseInt(jerseyNumber) : null) : undefined,
        dateOfBirth: dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : undefined,
        licenseNumber,
        licenseExpiry: licenseExpiry !== undefined ? (licenseExpiry ? new Date(licenseExpiry) : null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      include: { team: { select: { id: true, name: true } } },
    });
    res.json(player);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const deletePlayer = async (req, res) => {
  try {
    const del = await prisma.sportPlayer.deleteMany({ where: { id: req.params.id, organizationId: oid(req) } });
    if (!del.count) return res.status(404).json({ message: 'Player not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// ── Trainings ─────────────────────────────────────────────────────────────────

const getTrainings = async (req, res) => {
  try {
    const { teamId } = req.query;
    const where = { organizationId: oid(req) };
    if (teamId) where.teamId = teamId;
    const trainings = await prisma.sportTraining.findMany({
      where,
      include: {
        team: { select: { id: true, name: true } },
        attendances: { include: { player: { select: { id: true, name: true, jerseyNumber: true } } } },
      },
      orderBy: { date: 'desc' },
    });
    res.json(trainings);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const createTraining = async (req, res) => {
  try {
    const { teamId, date, location, duration, notes } = req.body;
    if (!date) return res.status(400).json({ message: 'Date required' });
    const training = await prisma.sportTraining.create({
      data: {
        organizationId: oid(req),
        teamId: teamId || null,
        date: new Date(date),
        location,
        duration: duration ? parseInt(duration) : null,
        notes,
      },
    });

    // Auto-create attendance records for team players
    if (teamId) {
      const players = await prisma.sportPlayer.findMany({
        where: { teamId, isActive: true },
        select: { id: true },
      });
      if (players.length > 0) {
        await prisma.sportTrainingAttendance.createMany({
          data: players.map(p => ({ trainingId: training.id, playerId: p.id, present: false })),
          skipDuplicates: true,
        });
      }
    }

    const full = await prisma.sportTraining.findUnique({
      where: { id: training.id },
      include: {
        team: { select: { id: true, name: true } },
        attendances: { include: { player: { select: { id: true, name: true, jerseyNumber: true } } } },
      },
    });
    res.status(201).json(full);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const updateTraining = async (req, res) => {
  try {
    const { date, location, duration, notes, teamId } = req.body;
    const existing = await prisma.sportTraining.findFirst({ where: { id: req.params.id, organizationId: oid(req) } });
    if (!existing) return res.status(404).json({ message: 'Training not found' });
    const training = await prisma.sportTraining.update({
      where: { id: req.params.id },
      data: {
        date: date ? new Date(date) : undefined,
        location,
        duration: duration !== undefined ? (duration ? parseInt(duration) : null) : undefined,
        notes,
        teamId: teamId !== undefined ? (teamId || null) : undefined,
      },
    });
    res.json(training);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const deleteTraining = async (req, res) => {
  try {
    const del = await prisma.sportTraining.deleteMany({ where: { id: req.params.id, organizationId: oid(req) } });
    if (!del.count) return res.status(404).json({ message: 'Training not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const markAttendance = async (req, res) => {
  try {
    const { trainingId, playerId, present } = req.body;
    const training = await prisma.sportTraining.findFirst({
      where: { id: trainingId, organizationId: oid(req) },
    });
    if (!training) return res.status(404).json({ message: 'Training not found' });

    const att = await prisma.sportTrainingAttendance.upsert({
      where: { trainingId_playerId: { trainingId, playerId } },
      update: { present },
      create: { trainingId, playerId, present },
    });
    res.json(att);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// ── Matches ───────────────────────────────────────────────────────────────────

const getMatches = async (req, res) => {
  try {
    const { teamId, status } = req.query;
    const where = { organizationId: oid(req) };
    if (teamId) where.teamId = teamId;
    if (status) where.status = status;
    const matches = await prisma.sportMatch.findMany({
      where,
      include: {
        team: { select: { id: true, name: true } },
        stats: { include: { player: { select: { id: true, name: true, jerseyNumber: true } } } },
      },
      orderBy: { date: 'desc' },
    });
    res.json(matches);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const createMatch = async (req, res) => {
  try {
    const { teamId, opponent, date, location, isHome, notes } = req.body;
    if (!opponent || !date) return res.status(400).json({ message: 'Opponent and date required' });
    const match = await prisma.sportMatch.create({
      data: {
        organizationId: oid(req),
        teamId: teamId || null,
        opponent,
        date: new Date(date),
        location,
        isHome: isHome !== false,
        notes,
        status: 'SCHEDULED',
      },
      include: { team: { select: { id: true, name: true } } },
    });
    res.status(201).json(match);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const updateMatch = async (req, res) => {
  try {
    const { opponent, date, location, isHome, scoreUs, scoreThem, status, notes, teamId } = req.body;
    const existing = await prisma.sportMatch.findFirst({ where: { id: req.params.id, organizationId: oid(req) } });
    if (!existing) return res.status(404).json({ message: 'Match not found' });
    const match = await prisma.sportMatch.update({
      where: { id: req.params.id },
      data: {
        opponent: opponent !== undefined ? opponent : undefined,
        date: date ? new Date(date) : undefined,
        location: location !== undefined ? location : undefined,
        isHome: isHome !== undefined ? isHome : undefined,
        scoreUs: scoreUs !== undefined ? (scoreUs !== null ? parseInt(scoreUs) : null) : undefined,
        scoreThem: scoreThem !== undefined ? (scoreThem !== null ? parseInt(scoreThem) : null) : undefined,
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? notes : undefined,
        teamId: teamId !== undefined ? (teamId || null) : undefined,
      },
      include: { team: { select: { id: true, name: true } } },
    });
    res.json(match);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const deleteMatch = async (req, res) => {
  try {
    const del = await prisma.sportMatch.deleteMany({ where: { id: req.params.id, organizationId: oid(req) } });
    if (!del.count) return res.status(404).json({ message: 'Match not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const upsertMatchStat = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { playerId, goals, assists, yellowCards, redCards, minutesPlayed } = req.body;
    const match = await prisma.sportMatch.findFirst({ where: { id: matchId, organizationId: oid(req) } });
    if (!match) return res.status(404).json({ message: 'Match not found' });
    const stat = await prisma.sportMatchStat.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      update: {
        goals: goals !== undefined ? parseInt(goals) : undefined,
        assists: assists !== undefined ? parseInt(assists) : undefined,
        yellowCards: yellowCards !== undefined ? parseInt(yellowCards) : undefined,
        redCards: redCards !== undefined ? parseInt(redCards) : undefined,
        minutesPlayed: minutesPlayed !== undefined ? (minutesPlayed ? parseInt(minutesPlayed) : null) : undefined,
      },
      create: {
        matchId, playerId,
        goals: parseInt(goals) || 0,
        assists: parseInt(assists) || 0,
        yellowCards: parseInt(yellowCards) || 0,
        redCards: parseInt(redCards) || 0,
        minutesPlayed: minutesPlayed ? parseInt(minutesPlayed) : null,
      },
      include: { player: { select: { id: true, name: true, jerseyNumber: true } } },
    });
    res.json(stat);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

module.exports = {
  getStats,
  getTeams, createTeam, updateTeam, deleteTeam,
  getPlayers, createPlayer, updatePlayer, deletePlayer,
  getTrainings, createTraining, updateTraining, deleteTraining, markAttendance,
  getMatches, createMatch, updateMatch, deleteMatch, upsertMatchStat,
};
