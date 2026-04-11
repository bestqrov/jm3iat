const prisma = require('../../config/database');
const PDFDocument = require('pdfkit');

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
    const org = req.organization;

    const [totalMembers, activeMembers, totalMeetings, completedMeetings, totalProjects] =
      await Promise.all([
        prisma.member.count({ where: { organizationId: orgId } }),
        prisma.member.count({ where: { organizationId: orgId, isActive: true } }),
        prisma.meeting.count({ where: { organizationId: orgId } }),
        prisma.meeting.count({ where: { organizationId: orgId, status: 'COMPLETED' } }),
        prisma.project.count({ where: { organizationId: orgId } }).catch(() => 0),
      ]);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rapport_litteraire.pdf"');
    doc.pipe(res);

    // Title
    doc.fontSize(20).text(org.name, { align: 'center' });
    doc.fontSize(16).text('التقرير الأدبي / Rapport Littéraire', { align: 'center' });
    doc.fontSize(11).text(`Date: ${new Date().toLocaleDateString('fr-MA')}`, { align: 'center' });
    doc.moveDown(1.5);

    // Organization info
    doc.fontSize(14).text('معلومات الجمعية / Informations sur l\'Association', { underline: true });
    doc.fontSize(11)
      .text(`Nom / الاسم: ${org.name}`)
      .text(`Ville / المدينة: ${org.city || '-'}`)
      .text(`Région / الجهة: ${org.region || '-'}`);
    doc.moveDown();

    // Members section
    doc.fontSize(14).text('الأعضاء / Membres', { underline: true });
    doc.fontSize(11)
      .text(`Nombre total d'adhérents / عدد الأعضاء الكلي: ${totalMembers}`)
      .text(`Adhérents actifs / الأعضاء النشطون: ${activeMembers}`);
    doc.moveDown();

    // Meetings section
    doc.fontSize(14).text('الاجتماعات / Réunions', { underline: true });
    doc.fontSize(11)
      .text(`Total réunions / مجموع الاجتماعات: ${totalMeetings}`)
      .text(`Réunions tenues / الاجتماعات المنعقدة: ${completedMeetings}`);
    doc.moveDown();

    // Projects section
    if (totalProjects > 0) {
      doc.fontSize(14).text('المشاريع / Projets', { underline: true });
      doc.fontSize(11).text(`Total projets / عدد المشاريع: ${totalProjects}`);
      doc.moveDown();
    }

    doc.moveDown(2);
    doc.fontSize(11).text('Cachet et signature / الختم والتوقيع:', { underline: true });
    doc.moveDown(0.5);
    doc.text('Président(e): ____________________');

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error generating PDF' });
  }
};

// Delegate to the detailed finance PDF generator
const { exportPDF: exportFinancialPDF } = require('../finance/finance.controller');

module.exports = { getLiteraryReport, getFinancialReport, exportLiteraryPDF, exportFinancialPDF };
