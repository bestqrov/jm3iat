const prisma = require('../../config/database');
const PDFDocument = require('pdfkit');

const getAll = async (req, res) => {
  try {
    const { status } = req.query;
    const where = { organizationId: req.organization.id };
    if (status) where.status = status;

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        _count: { select: { attendances: true, decisions: true } },
      },
      orderBy: { date: 'desc' },
    });

    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
      include: {
        attendances: { include: { member: true } },
        decisions: { orderBy: { createdAt: 'asc' } },
        sessions: { include: { votes: { include: { member: true } } } },
        documents: true,
      },
    });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const create = async (req, res) => {
  try {
    const { title, date, location, agenda } = req.body;
    if (!title || !date) return res.status(400).json({ message: 'Title and date required' });

    const meetingDate = new Date(date);

    const meeting = await prisma.meeting.create({
      data: {
        organizationId: req.organization.id,
        title,
        date: meetingDate,
        location: location || null,
        agenda: agenda || null,
      },
    });

    const dateStr = meetingDate.toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = meetingDate.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });
    await prisma.reminder.create({
      data: {
        organizationId: req.organization.id,
        type: 'MEETING',
        title: `اجتماع: ${title}`,
        message: `${dateStr} ${timeStr}${location ? ` — ${location}` : ''}`,
        scheduledFor: meetingDate,
        isRead: false,
      },
    });

    res.status(201).json(meeting);
  } catch (err) {
    console.error('[create meeting]', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const update = async (req, res) => {
  try {
    const { title, date, location, agenda, status } = req.body;
    const meeting = await prisma.meeting.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const updated = await prisma.meeting.update({
      where: { id: req.params.id },
      data: {
        title: title ?? meeting.title,
        date: date ? new Date(date) : meeting.date,
        location: location ?? meeting.location,
        agenda: agenda ?? meeting.agenda,
        status: status ?? meeting.status,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const remove = async (req, res) => {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    await prisma.meeting.delete({ where: { id: req.params.id } });
    res.json({ message: 'Meeting deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const addAttendees = async (req, res) => {
  try {
    const { memberIds } = req.body;
    const meetingId = req.params.id;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: 'memberIds array required' });
    }

    await Promise.all(
      memberIds.map((memberId) =>
        prisma.meetingAttendance.upsert({
          where: { meetingId_memberId: { meetingId, memberId } },
          update: {},
          create: { meetingId, memberId, present: false },
        })
      )
    );

    const attendances = await prisma.meetingAttendance.findMany({
      where: { meetingId },
      include: { member: true },
    });

    res.json(attendances);
  } catch (err) {
    console.error('[addAttendees]', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

const markAttendance = async (req, res) => {
  try {
    const { memberId, present } = req.body;
    const meetingId = req.params.id;

    const attendance = await prisma.meetingAttendance.upsert({
      where: { meetingId_memberId: { meetingId, memberId } },
      update: { present },
      create: { meetingId, memberId, present },
      include: { member: true },
    });

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const addDecision = async (req, res) => {
  try {
    const { description, assignedTo, dueDate } = req.body;
    if (!description) return res.status(400).json({ message: 'Description required' });

    const meeting = await prisma.meeting.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const decision = await prisma.decision.create({
      data: {
        meetingId: req.params.id,
        description,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json(decision);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateDecision = async (req, res) => {
  try {
    const { description, assignedTo, dueDate, status } = req.body;
    const decision = await prisma.decision.update({
      where: { id: req.params.decisionId },
      data: { description, assignedTo, dueDate: dueDate ? new Date(dueDate) : undefined, status },
    });
    res.json(decision);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadPV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: { pvUrl: `/uploads/${req.file.filename}` },
    });

    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const generatePV = async (req, res) => {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
      include: {
        attendances: { include: { member: true } },
        decisions: true,
      },
    });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const org = req.organization;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PV_${meeting.id}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text(org.name, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text('Procès-Verbal de Réunion / محضر اجتماع', { align: 'center' });
    doc.moveDown();

    // Meeting info
    doc.fontSize(12).text(`Titre / العنوان: ${meeting.title}`);
    doc.text(`Date: ${new Date(meeting.date).toLocaleDateString('fr-MA')}`);
    doc.text(`Lieu / المكان: ${meeting.location || '-'}`);
    doc.moveDown();

    // Attendance
    doc.fontSize(14).text('Présents / الحاضرون:', { underline: true });
    doc.moveDown(0.3);
    const present = meeting.attendances.filter((a) => a.present);
    const absent = meeting.attendances.filter((a) => !a.present);
    present.forEach((a) => doc.fontSize(11).text(`  ✓ ${a.member.name} - ${a.member.role}`));
    doc.moveDown(0.3);
    doc.fontSize(14).text('Absents / الغائبون:', { underline: true });
    absent.forEach((a) => doc.fontSize(11).text(`  ✗ ${a.member.name}`));
    doc.moveDown();

    // Agenda
    if (meeting.agenda) {
      doc.fontSize(14).text('Ordre du jour / جدول الأعمال:', { underline: true });
      doc.fontSize(11).text(meeting.agenda);
      doc.moveDown();
    }

    // Decisions
    if (meeting.decisions.length > 0) {
      doc.fontSize(14).text('Décisions / القرارات:', { underline: true });
      doc.moveDown(0.3);
      meeting.decisions.forEach((d, i) => {
        doc.fontSize(11).text(`${i + 1}. ${d.description}`);
        if (d.assignedTo) doc.text(`   Responsable: ${d.assignedTo}`);
        if (d.dueDate) doc.text(`   Échéance: ${new Date(d.dueDate).toLocaleDateString('fr-MA')}`);
      });
    }

    doc.moveDown(2);
    doc.text('Signatures:', { underline: true });
    doc.moveDown(0.5);
    doc.text('Président: ____________________          Secrétaire: ____________________');

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error generating PV' });
  }
};

const getStats = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, thisMonth, completed, scheduled] = await Promise.all([
      prisma.meeting.count({ where: { organizationId: orgId } }),
      prisma.meeting.count({ where: { organizationId: orgId, date: { gte: startOfMonth } } }),
      prisma.meeting.count({ where: { organizationId: orgId, status: 'COMPLETED' } }),
      prisma.meeting.count({ where: { organizationId: orgId, status: 'SCHEDULED' } }),
    ]);

    res.json({ total, thisMonth, completed, scheduled });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAll, getById, create, update, remove,
  addAttendees, markAttendance, addDecision, updateDecision,
  uploadPV, generatePV, getStats,
};
