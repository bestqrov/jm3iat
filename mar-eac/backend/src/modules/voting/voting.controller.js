const prisma = require('../../config/database');

const BOARD_ROLES = ['PRESIDENT', 'VICE_PRESIDENT', 'TREASURER', 'SECRETARY', 'ADVISOR'];

const getSessions = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const sessions = await prisma.votingSession.findMany({
      where: { meetingId },
      include: {
        votes: { include: { member: true } },
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createSession = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { title, description } = req.body;

    if (!title) return res.status(400).json({ message: 'Title required' });

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, organizationId: req.organization.id },
      include: { attendances: { include: { member: true } } },
    });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    // Quorum check: 50%+1 of board members must be present
    const boardAttendances = meeting.attendances.filter((a) => BOARD_ROLES.includes(a.member?.role));
    const boardTotal = boardAttendances.length;
    const boardPresent = boardAttendances.filter((a) => a.present).length;
    const quorum = Math.floor(boardTotal / 2) + 1;

    if (boardTotal === 0 || boardPresent < quorum) {
      return res.status(400).json({
        code: 'QUORUM_NOT_MET',
        message: boardTotal === 0
          ? 'No board members added to this meeting'
          : `Quorum not met: ${boardPresent}/${boardTotal} board members present (need ${quorum})`,
        boardTotal,
        boardPresent,
        quorum,
      });
    }

    const session = await prisma.votingSession.create({
      data: { meetingId, title, description },
    });

    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const castVote = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { memberId, choice } = req.body;

    if (!memberId || !choice) return res.status(400).json({ message: 'memberId and choice required' });
    if (!['YES', 'NO', 'ABSTAIN'].includes(choice)) {
      return res.status(400).json({ message: 'Choice must be YES, NO, or ABSTAIN' });
    }

    const session = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ message: 'Voting session not found' });
    if (!session.isOpen) return res.status(400).json({ message: 'Voting session is closed' });

    const member = await prisma.member.findFirst({
      where: { id: memberId, organizationId: req.organization.id },
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const vote = await prisma.vote.upsert({
      where: { votingSessionId_memberId: { votingSessionId: sessionId, memberId } },
      update: { choice },
      create: { votingSessionId: sessionId, memberId, choice },
      include: { member: true },
    });

    res.json(vote);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const closeSession = async (req, res) => {
  try {
    const session = await prisma.votingSession.update({
      where: { id: req.params.sessionId },
      data: { isOpen: false, closedAt: new Date() },
    });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getResults = async (req, res) => {
  try {
    const session = await prisma.votingSession.findUnique({
      where: { id: req.params.sessionId },
      include: {
        votes: { include: { member: true } },
        meeting: { include: { attendances: { include: { member: true } } } },
      },
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const boardAttendances = session.meeting.attendances.filter((a) => BOARD_ROLES.includes(a.member?.role));
    const boardTotal = boardAttendances.length;
    const boardPresent = boardAttendances.filter((a) => a.present).length;
    const quorum = Math.floor(boardTotal / 2) + 1;

    const total = session.votes.length;
    const yes = session.votes.filter((v) => v.choice === 'YES').length;
    const no = session.votes.filter((v) => v.choice === 'NO').length;
    const abstain = session.votes.filter((v) => v.choice === 'ABSTAIN').length;

    res.json({
      session,
      quorum: { boardTotal, boardPresent, required: quorum, met: boardPresent >= quorum },
      results: {
        total,
        yes,
        no,
        abstain,
        passed: yes > no,
        yesPercent: total ? Math.round((yes / total) * 100) : 0,
        noPercent: total ? Math.round((no / total) * 100) : 0,
        abstainPercent: total ? Math.round((abstain / total) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getSessions, createSession, castVote, closeSession, getResults };
