const prisma = require('../../config/database');
const { generateFinancialPDF } = require('../../utils/financePdf');
const { generateLiteraryReportPdf } = require('../../utils/literaryReportPdf');

const getLiteraryReport = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const org = req.organization;

    const [
      totalMembers, activeMembers, boardMembers,
      totalMeetings, completedMeetings, scheduledMeetings,
      totalProjects, completedProjects, inProgressProjects,
      totalDecisions, recentMeetings,
    ] = await Promise.all([
      prisma.member.count({ where: { organizationId: orgId } }),
      prisma.member.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.member.count({ where: { organizationId: orgId, role: { not: 'MEMBER' } } }),
      prisma.meeting.count({ where: { organizationId: orgId } }),
      prisma.meeting.count({ where: { organizationId: orgId, status: 'COMPLETED' } }),
      prisma.meeting.count({ where: { organizationId: orgId, status: 'SCHEDULED' } }),
      prisma.project.count({ where: { organizationId: orgId } }).catch(() => 0),
      prisma.project.count({ where: { organizationId: orgId, status: 'COMPLETED' } }).catch(() => 0),
      prisma.project.count({ where: { organizationId: orgId, status: 'IN_PROGRESS' } }).catch(() => 0),
      prisma.decision.count({ where: { meeting: { organizationId: orgId } } }),
      prisma.meeting.findMany({
        where: { organizationId: orgId },
        orderBy: { date: 'desc' },
        take: 5,
        include: { _count: { select: { attendances: true, decisions: true } } },
      }),
    ]);

    res.json({
      organization: { id: org.id, name: org.name, city: org.city, region: org.region },
      members: { total: totalMembers, active: activeMembers, board: boardMembers },
      meetings: { total: totalMeetings, completed: completedMeetings, scheduled: scheduledMeetings },
      projects: { total: totalProjects, completed: completedProjects, inProgress: inProgressProjects },
      decisions: { total: totalDecisions },
      recentMeetings,
      generatedAt: new Date(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getFinancialReport = async (req, res) => {
  try {
    const orgId = req.organization.id;

    const [income, expenses, transactions, categoryStats] = await Promise.all([
      prisma.transaction.aggregate({
        where: { organizationId: orgId, type: 'INCOME' },
        _sum: { amount: true }, _count: true,
      }),
      prisma.transaction.aggregate({
        where: { organizationId: orgId, type: 'EXPENSE' },
        _sum: { amount: true }, _count: true,
      }),
      prisma.transaction.findMany({
        where: { organizationId: orgId },
        orderBy: { date: 'desc' },
        take: 20,
      }),
      prisma.transaction.groupBy({
        by: ['category', 'type'],
        where: { organizationId: orgId },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Monthly breakdown for current year
    const year = new Date().getFullYear();
    const yearlyTx = await prisma.transaction.findMany({
      where: {
        organizationId: orgId,
        date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) },
      },
      select: { type: true, amount: true, date: true },
    });

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1, income: 0, expenses: 0,
    }));
    yearlyTx.forEach((tx) => {
      const m = new Date(tx.date).getMonth();
      if (tx.type === 'INCOME') monthly[m].income += tx.amount;
      else monthly[m].expenses += tx.amount;
    });

    const totalIncome = income._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;

    res.json({
      summary: {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        incomeCount: income._count,
        expenseCount: expenses._count,
      },
      categoryStats,
      monthly,
      recentTransactions: transactions,
      generatedAt: new Date(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const exportLiteraryPDF = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const lang  = req.query.lang  || 'ar';
    const year  = parseInt(req.query.year) || new Date().getFullYear();

    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year, 11, 31, 23, 59, 59);

    const [
      totalMembers, activeMembers, boardMembers, newThisYear,
      totalMeetings, completedMeetings, scheduledMeetings,
      totalDecisions, recentMeetings,
      totalProjects, completedProjects, inProgressProjects,
      incomeAgg, expensesAgg,
      totalRequests,
      orgFull,
      totalTransportStudents, totalTransportVehicles, totalTransportRoutes,
    ] = await Promise.all([
      prisma.member.count({ where: { organizationId: orgId } }),
      prisma.member.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.member.count({ where: { organizationId: orgId, role: { not: 'MEMBER' } } }),
      prisma.member.count({ where: { organizationId: orgId, createdAt: { gte: yearStart, lte: yearEnd } } }),
      prisma.meeting.count({ where: { organizationId: orgId } }),
      prisma.meeting.count({ where: { organizationId: orgId, status: 'COMPLETED' } }),
      prisma.meeting.count({ where: { organizationId: orgId, status: 'SCHEDULED' } }),
      prisma.decision.count({ where: { meeting: { organizationId: orgId } } }).catch(() => 0),
      prisma.meeting.findMany({
        where: { organizationId: orgId },
        orderBy: { date: 'desc' }, take: 5,
        include: { _count: { select: { attendances: true } } },
      }),
      prisma.project.count({ where: { organizationId: orgId } }).catch(() => 0),
      prisma.project.count({ where: { organizationId: orgId, status: 'COMPLETED' } }).catch(() => 0),
      prisma.project.count({ where: { organizationId: orgId, status: 'IN_PROGRESS' } }).catch(() => 0),
      prisma.transaction.aggregate({
        where: { organizationId: orgId, type: 'INCOME',
          date: { gte: yearStart, lte: yearEnd } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { organizationId: orgId, type: 'EXPENSE',
          date: { gte: yearStart, lte: yearEnd } },
        _sum: { amount: true },
      }),
      prisma.request.count({ where: { organizationId: orgId } }).catch(() => 0),
      prisma.organization.findUnique({ where: { id: orgId } }),
      // Transport
      prisma.transportStudent.count({ where: { organizationId: orgId } }).catch(() => 0),
      prisma.transportVehicle.count({ where: { organizationId: orgId } }).catch(() => 0),
      prisma.transportRoute.count({ where: { organizationId: orgId } }).catch(() => 0),
    ]);

    const data = {
      org: orgFull || req.organization,
      members:  { total: totalMembers, active: activeMembers, board: boardMembers, newThisYear },
      meetings: { total: totalMeetings, completed: completedMeetings,
                  scheduled: scheduledMeetings, decisions: totalDecisions,
                  recent: recentMeetings },
      finance:  { totalIncome: incomeAgg._sum.amount || 0,
                  totalExpenses: expensesAgg._sum.amount || 0 },
      projects: { total: totalProjects, completed: completedProjects, inProgress: inProgressProjects },
      requests: { total: totalRequests },
      transport: { totalStudents: totalTransportStudents, totalVehicles: totalTransportVehicles, totalRoutes: totalTransportRoutes },
    };

    generateLiteraryReportPdf(data, lang, year, res);
  } catch (err) {
    console.error('[exportLiteraryPDF]', err);
    if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' });
  }
};

const exportFinancialPDF = (req, res) => generateFinancialPDF(req, res).catch((err) => {
  console.error('PDF export error:', err);
  if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' });
});

module.exports = { getLiteraryReport, getFinancialReport, exportLiteraryPDF, exportFinancialPDF };
