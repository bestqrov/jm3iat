const prisma = require('../../config/database');
const PDFDocument = require('pdfkit');
const path = require('path');

const FONT_DIR     = path.join(__dirname, '../../assets/fonts');
const FONT_AR      = path.join(FONT_DIR, 'Amiri-Regular.ttf');
const FONT_AR_BOLD = path.join(FONT_DIR, 'Amiri-Bold.ttf');

// Reverse Arabic word order so PDFKit (LTR) renders RTL text correctly.
const arw = (str) => {
  if (!str) return '';
  return String(str).split(' ').reverse().join(' ');
};

const ROLE_AR = {
  PRESIDENT:      'الرئيس',
  VICE_PRESIDENT: 'نائب الرئيس',
  TREASURER:      'أمين المال',
  SECRETARY:      'الكاتب العام',
  BOARD:          'عضو المكتب',
  MEMBER:         'عضو',
};

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
    const isAr = (req.query.lang || 'ar') === 'ar';

    const PAGE_W = 595.28;
    const MARGIN = 45;
    const CW = PAGE_W - MARGIN * 2;
    const NAVY = '#1a3a6b';
    const NAVY_LIGHT = '#e8eef7';

    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', autoFirstPage: true });

    doc.registerFont('AR',      FONT_AR);
    doc.registerFont('AR-Bold', FONT_AR_BOLD);

    const fontBold = isAr ? 'AR-Bold' : 'Helvetica-Bold';
    const fontReg  = isAr ? 'AR'      : 'Helvetica';
    const align    = isAr ? 'right'   : 'left';

    // ar() wraps word-order reversal only when isAr is true
    const ar = (str) => isAr ? arw(str) : String(str || '');

    const dateStr = isAr
      ? new Date(meeting.date).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date(meeting.date).toLocaleDateString('fr-MA', { year: 'numeric', month: 'long', day: 'numeric' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PV_${meeting.id}.pdf"`);
    doc.pipe(res);

    // ── Top colour band ──────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 8).fill(NAVY);

    // ── Association name ─────────────────────────────────────────────────────
    const orgNameDisplay = isAr ? (org.nameAr || org.name) : org.name;
    doc.font(fontBold).fontSize(15).fillColor(NAVY)
      .text(ar(orgNameDisplay), MARGIN, 28, { width: CW, align });

    // Association city/region under name
    if (org.city || org.region) {
      const cityLine = isAr
        ? ar((org.cityAr || org.city || '') + (org.region ? ' - ' + (org.regionAr || org.region) : ''))
        : ((org.city || '') + (org.region ? ' - ' + org.region : ''));
      doc.font(fontReg).fontSize(9).fillColor('#64748b')
        .text(cityLine, MARGIN, doc.y, { width: CW, align });
    }

    // ── Title banner ─────────────────────────────────────────────────────────
    const titleY = doc.y + 10;
    doc.rect(MARGIN, titleY, CW, 36).fill(NAVY);
    const pvTitle = isAr ? arw('محضر اجتماع') : 'Procès-Verbal de Réunion';
    doc.font(fontBold).fontSize(17).fillColor('#ffffff')
      .text(pvTitle, MARGIN, titleY + 8, { width: CW, align: 'center' });

    // ── Info table ───────────────────────────────────────────────────────────
    let y = titleY + 50;
    doc.rect(MARGIN, y, CW, 1).fill(NAVY_LIGHT);
    y += 6;

    const infoRows = isAr
      ? [
          [arw('عنوان الاجتماع'), ar(meeting.title)],
          [arw('تاريخ الاجتماع'), dateStr],
          [arw('مكان الانعقاد'),  ar(meeting.location || '—')],
        ]
      : [
          ['Titre',       meeting.title],
          ['Date',        dateStr],
          ['Lieu',        meeting.location || '—'],
        ];

    const LW = isAr ? CW * 0.35 : CW * 0.3;
    const VW = CW - LW - 6;

    infoRows.forEach(([label, value]) => {
      doc.font(fontBold).fontSize(10).fillColor(NAVY)
        .text(label, isAr ? MARGIN + VW + 6 : MARGIN, y, { width: LW, align });
      doc.font(fontReg).fontSize(10).fillColor('#1e293b')
        .text(value, isAr ? MARGIN : MARGIN + LW + 6, y, { width: VW, align });
      y = doc.y + 4;
    });

    doc.rect(MARGIN, y, CW, 1).fill(NAVY_LIGHT);
    y += 10;

    // ── Section helper ───────────────────────────────────────────────────────
    const section = (title) => {
      doc.rect(MARGIN, y, CW, 24).fill(NAVY);
      doc.font(fontBold).fontSize(11).fillColor('#ffffff')
        .text(title, MARGIN + 8, y + 6, { width: CW - 16, align });
      y = y + 28;
    };

    const checkPageBreak = (needed = 40) => {
      if (y + needed > 780) {
        doc.addPage();
        doc.rect(0, 0, PAGE_W, 8).fill(NAVY);
        y = 30;
      }
    };

    // ── Attendance ───────────────────────────────────────────────────────────
    const present = meeting.attendances.filter((a) => a.present);
    const absent  = meeting.attendances.filter((a) => !a.present);

    checkPageBreak(60);
    section(isAr ? arw('قائمة الحضور والغياب') : 'Liste de présence');

    // Present
    const presentLabel = isAr ? arw('الأعضاء الحاضرون') : 'Membres présents';
    doc.font(fontBold).fontSize(10).fillColor(NAVY)
      .text(presentLabel, MARGIN + 6, y, { width: CW - 12, align });
    y = doc.y + 4;

    if (present.length === 0) {
      doc.font(fontReg).fontSize(10).fillColor('#94a3b8')
        .text(isAr ? arw('لا يوجد حضور مسجل') : 'Aucun présent enregistré',
          MARGIN + 12, y, { width: CW - 24, align });
      y = doc.y + 4;
    } else {
      present.forEach((a) => {
        checkPageBreak(20);
        const roleAr = ROLE_AR[a.member.role] || 'عضو';
        const memberLine = isAr
          ? ar(roleAr + ' — ' + a.member.name)
          : `${a.member.name}  —  ${a.member.role}`;
        doc.rect(MARGIN + 6, y, 6, 6).fill('#059669');
        doc.font(fontReg).fontSize(10).fillColor('#1e293b')
          .text(memberLine, MARGIN + 16, y - 1, { width: CW - 28, align });
        y = doc.y + 2;
      });
    }

    y += 6;
    const absentLabel = isAr ? arw('الأعضاء الغائبون') : 'Membres absents';
    doc.font(fontBold).fontSize(10).fillColor(NAVY)
      .text(absentLabel, MARGIN + 6, y, { width: CW - 12, align });
    y = doc.y + 4;

    if (absent.length === 0) {
      doc.font(fontReg).fontSize(10).fillColor('#94a3b8')
        .text(isAr ? arw('لا يوجد غياب مسجل') : 'Aucune absence enregistrée',
          MARGIN + 12, y, { width: CW - 24, align });
      y = doc.y + 4;
    } else {
      absent.forEach((a) => {
        checkPageBreak(20);
        const memberLine = isAr ? ar(a.member.name) : a.member.name;
        doc.rect(MARGIN + 6, y, 6, 6).fill('#dc2626');
        doc.font(fontReg).fontSize(10).fillColor('#1e293b')
          .text(memberLine, MARGIN + 16, y - 1, { width: CW - 28, align });
        y = doc.y + 2;
      });
    }
    y += 10;

    // ── Agenda ───────────────────────────────────────────────────────────────
    if (meeting.agenda) {
      checkPageBreak(60);
      section(isAr ? arw('جدول الأعمال') : "Ordre du jour");
      doc.font(fontReg).fontSize(10).fillColor('#1e293b')
        .text(isAr ? ar(meeting.agenda) : meeting.agenda,
          MARGIN + 8, y, { width: CW - 16, align });
      y = doc.y + 10;
    }

    // ── Decisions ────────────────────────────────────────────────────────────
    if (meeting.decisions.length > 0) {
      checkPageBreak(60);
      section(isAr ? arw('القرارات المتخذة') : 'Décisions prises');

      meeting.decisions.forEach((d, i) => {
        checkPageBreak(30);

        // Number badge
        doc.rect(MARGIN + 6, y, 18, 18).fill(NAVY);
        doc.font(fontBold).fontSize(9).fillColor('#ffffff')
          .text(String(i + 1), MARGIN + 6, y + 4, { width: 18, align: 'center' });

        const descText = isAr ? ar(d.description) : d.description;
        doc.font(fontReg).fontSize(10).fillColor('#1e293b')
          .text(descText, MARGIN + 28, y, { width: CW - 36, align });
        y = doc.y + 2;

        if (d.assignedTo) {
          const resp = isAr
            ? ar('المسؤول عن التنفيذ: ' + d.assignedTo)
            : `Responsable : ${d.assignedTo}`;
          doc.font(fontBold).fontSize(9).fillColor('#64748b')
            .text(resp, MARGIN + 28, y, { width: CW - 36, align });
          y = doc.y + 2;
        }
        if (d.dueDate) {
          const due = isAr
            ? ar('تاريخ الإنجاز: ' + new Date(d.dueDate).toLocaleDateString('ar-MA'))
            : `Échéance : ${new Date(d.dueDate).toLocaleDateString('fr-MA')}`;
          doc.font(fontBold).fontSize(9).fillColor('#64748b')
            .text(due, MARGIN + 28, y, { width: CW - 36, align });
          y = doc.y + 2;
        }
        y += 6;
      });
      y += 4;
    }

    // ── Signature block ───────────────────────────────────────────────────────
    checkPageBreak(90);
    y += 8;
    doc.rect(MARGIN, y, CW, 1).fill(NAVY_LIGHT);
    y += 12;

    const sigTitle = isAr ? arw('التوقيعات والأختام') : 'Signatures et cachets';
    doc.font(fontBold).fontSize(11).fillColor(NAVY)
      .text(sigTitle, MARGIN, y, { width: CW, align });
    y = doc.y + 16;

    // Two signature boxes side by side
    const boxW = (CW - 20) / 2;
    [[isAr ? arw('الرئيس') : 'Le(a) Président(e)',
      isAr ? arw('الكاتب العام') : 'Le(a) Secrétaire Général(e)'],
    ].forEach((labels) => {
      labels.forEach((lbl, idx) => {
        const bx = MARGIN + idx * (boxW + 20);
        doc.rect(bx, y, boxW, 70).stroke(NAVY_LIGHT);
        doc.font(fontBold).fontSize(9).fillColor(NAVY)
          .text(lbl, bx + 4, y + 4, { width: boxW - 8, align: 'center' });
        doc.font(fontReg).fontSize(8).fillColor('#94a3b8')
          .text(isAr ? arw('التوقيع والختم') : 'Signature et cachet',
            bx + 4, y + 50, { width: boxW - 8, align: 'center' });
      });
    });
    y += 76;

    // ── Bottom colour band ────────────────────────────────────────────────────
    doc.rect(0, 829, PAGE_W, 8).fill(NAVY);

    // Footer text
    const footerLeft  = isAr ? arw('محضر اجتماع رسمي') : 'Procès-verbal officiel';
    const footerRight = isAr
      ? arw(new Date(meeting.date).toLocaleDateString('ar-MA'))
      : new Date(meeting.date).toLocaleDateString('fr-MA');
    doc.font(fontReg).fontSize(8).fillColor('#94a3b8')
      .text(footerLeft, MARGIN, 816, { width: CW / 2, align: isAr ? 'right' : 'left' });
    doc.font(fontReg).fontSize(8).fillColor('#94a3b8')
      .text(footerRight, MARGIN + CW / 2, 816, { width: CW / 2, align: isAr ? 'left' : 'right' });

    doc.end();
  } catch (err) {
    console.error('[generatePV]', err);
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
