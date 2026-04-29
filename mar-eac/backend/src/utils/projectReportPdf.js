const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const arabicReshaper = require('arabic-reshaper');

// ── Fonts ─────────────────────────────────────────────────────────────────────
const FONT_AR      = path.join(__dirname, '../assets/fonts/Amiri-Regular.ttf');
const FONT_AR_BOLD = path.join(__dirname, '../assets/fonts/Amiri-Bold.ttf');
const hasFont      = fs.existsSync(FONT_AR);

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  navy:    '#1e3a5f',
  blue:    '#2563eb',
  sky:     '#e8f0fe',
  green:   '#10b981',
  amber:   '#f59e0b',
  red:     '#ef4444',
  slate:   '#64748b',
  dark:    '#1e293b',
  light:   '#f8fafc',
  border:  '#e2e8f0',
  white:   '#ffffff',
  accent:  '#3b82f6',
};

// ── Lookup tables ─────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  PLANNED:     C.accent,
  IN_PROGRESS: C.amber,
  COMPLETED:   C.green,
  CANCELLED:   C.red,
};
const STATUS_LABEL = {
  PLANNED:     { fr: 'Planifié',    ar: 'مُخطَّط' },
  IN_PROGRESS: { fr: 'En cours',    ar: 'جاري التنفيذ' },
  COMPLETED:   { fr: 'Terminé',     ar: 'مكتمل' },
  CANCELLED:   { fr: 'Annulé',      ar: 'ملغى' },
};
const MS_STATUS_LABEL = {
  PENDING:     { fr: 'En attente',  ar: 'قيد الانتظار' },
  IN_PROGRESS: { fr: 'En cours',    ar: 'جاري' },
  COMPLETED:   { fr: 'Réalisé',     ar: 'منجز' },
  DELAYED:     { fr: 'Retardé',     ar: 'متأخر' },
};
const MS_STATUS_COLOR = {
  COMPLETED:   C.green,
  IN_PROGRESS: C.accent,
  DELAYED:     C.red,
  PENDING:     C.slate,
};
const TYPE_LABEL = {
  ROAD:              { fr: 'Route / Piste',          ar: 'طريق / مسلك' },
  ROAD_REPAIR:       { fr: 'Réparation de routes',   ar: 'إصلاح الطرق' },
  WATER:             { fr: 'Eau potable',             ar: 'الماء الصالح للشرب' },
  WATER_INSTALLATION:{ fr: "Installation d'eau",     ar: 'تركيب الماء' },
  LOCAL_DEVELOPMENT: { fr: 'Développement local',    ar: 'التنمية المحلية' },
  HEALTH:            { fr: 'Santé',                  ar: 'الصحة' },
  EDUCATION:         { fr: 'Éducation',              ar: 'التعليم' },
  ENVIRONMENT:       { fr: 'Environnement',          ar: 'البيئة' },
  AGRICULTURE:       { fr: 'Agriculture',            ar: 'الفلاحة' },
  INFRASTRUCTURE:    { fr: 'Infrastructure',         ar: 'البنية التحتية' },
  OTHER:             { fr: 'Autre',                  ar: 'أخرى' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};
const fmtMoney = (n) =>
  `${(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`;

const reshape = (text) => {
  if (!text) return '';
  const shaped = arabicReshaper.convertArabic(String(text));
  return shaped.split(' ').reverse().join(' ');
};

// ── Main generator ────────────────────────────────────────────────────────────
async function generateProjectReportPDF(req, res) {
  const prisma = require('../config/database');
  const orgId  = req.organization.id;
  const { id } = req.params;
  const lang   = req.query.lang || 'fr';
  const isAr   = lang === 'ar' && hasFont;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    include: {
      milestones: { orderBy: { order: 'asc' } },
      funding:    { include: { entries: { orderBy: { date: 'asc' } } } },
      organization: { select: { name: true, nameAr: true, city: true, logo: true } },
    },
  });
  if (!project) { res.status(404).json({ message: 'Project not found' }); return; }

  // ── Font aliases ────────────────────────────────────────────────────────────
  const fReg  = isAr ? FONT_AR      : 'Helvetica';
  const fBold = isAr ? FONT_AR_BOLD : 'Helvetica-Bold';

  // Text helpers
  const t  = (s) => isAr ? reshape(String(s || '')) : String(s || '');
  const al = isAr ? 'right' : 'left';      // default text align
  const oal = isAr ? 'left' : 'right';     // opposite align

  // ── Document ────────────────────────────────────────────────────────────────
  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: project.title } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="project-${id}.pdf"`);
  doc.pipe(res);

  const PW = doc.page.width;   // 595
  const PH = doc.page.height;  // 842
  const M  = 44;               // margin
  const W  = PW - M * 2;       // content width

  // ── Computed values ─────────────────────────────────────────────────────────
  const funded      = project.funding?.fundedAmount || 0;
  const total       = project.funding?.totalBudget  || 0;
  const pct         = total > 0 ? Math.min(100, (funded / total) * 100) : 0;
  const completedMs = project.milestones.filter(m => m.status === 'COMPLETED').length;
  const totalMs     = project.milestones.length;
  const msPct       = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;
  const stColor     = STATUS_COLOR[project.status] || C.slate;
  const orgName     = (isAr && project.organization.nameAr) ? project.organization.nameAr : project.organization.name;

  // ═══════════════════════════════════════════════════════════════════════════
  // COVER BAND
  // ═══════════════════════════════════════════════════════════════════════════
  // Full-width deep navy header
  doc.rect(0, 0, PW, 110).fill(C.navy);
  // Accent stripe at the very top
  doc.rect(0, 0, PW, 4).fill(stColor);

  // Organisation name
  doc.font(fBold).fontSize(15).fillColor(C.white);
  doc.text(t(orgName), M, 18, { width: W, align: al });

  // Report label
  doc.font(fReg).fontSize(9).fillColor('#93c5fd');
  doc.text(
    t(isAr ? 'تقرير المشروع' : 'Rapport de Projet'),
    M, 40, { width: W, align: al },
  );

  // Project title
  doc.font(fBold).fontSize(17).fillColor(C.white);
  doc.text(t(project.title), M, 56, { width: W - 100, align: al });

  // Status pill — always top-right corner of band
  doc.roundedRect(PW - M - 90, 18, 90, 24, 12).fill(stColor);
  doc.font(fBold).fontSize(9).fillColor(C.white);
  doc.text(
    t(STATUS_LABEL[project.status]?.[lang] || project.status),
    PW - M - 90, 25, { width: 90, align: 'center' },
  );

  let y = 125;

  // ═══════════════════════════════════════════════════════════════════════════
  // INFO CARDS ROW
  // ═══════════════════════════════════════════════════════════════════════════
  const infoItems = [
    {
      label: isAr ? 'النوع' : 'Type',
      value: t(TYPE_LABEL[project.type]?.[lang] || project.type),
    },
    {
      label: isAr ? 'المسؤول' : 'Responsable',
      value: t(project.manager || '—'),
    },
    {
      label: isAr ? 'تاريخ البداية' : 'Début',
      value: fmtDate(project.startDate),
    },
    {
      label: isAr ? 'تاريخ النهاية' : 'Fin prévue',
      value: fmtDate(project.endDate),
    },
  ];
  const displayItems = isAr ? [...infoItems].reverse() : infoItems;
  const cW = W / 4;

  displayItems.forEach((item, i) => {
    const cx = M + i * cW;
    // Card background
    doc.roundedRect(cx, y, cW - 8, 52, 7).fill(C.light);
    // Top accent bar
    doc.rect(cx, y, cW - 8, 3).fill(stColor);
    // Label
    doc.font(fBold).fontSize(7.5).fillColor(C.slate);
    doc.text(t(item.label), cx + 8, y + 10, { width: cW - 22, align: al });
    // Value
    doc.font(fBold).fontSize(11).fillColor(C.dark);
    doc.text(item.value, cx + 8, y + 24, { width: cW - 22, align: al });
  });
  y += 64;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION HELPER — draws a coloured left/right bar + bold title
  // ═══════════════════════════════════════════════════════════════════════════
  const sectionTitle = (label, yPos, color = C.navy) => {
    const barX = isAr ? M + W - 4 : M;
    doc.rect(barX, yPos, 4, 20).fill(color);
    doc.font(fBold).fontSize(13).fillColor(color);
    const textX = isAr ? M : M + 10;
    doc.text(t(label), textX, yPos + 3, { width: W - 10, align: al });
    // Thin separator line
    doc.moveTo(M, yPos + 24).lineTo(M + W, yPos + 24)
       .lineWidth(0.5).strokeColor(C.border).stroke();
    return yPos + 32;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GOALS
  // ═══════════════════════════════════════════════════════════════════════════
  if (project.generalGoal || project.specificGoals) {
    y = sectionTitle(isAr ? 'الأهداف' : 'Objectifs', y, C.navy);

    if (project.generalGoal) {
      // Sub-label
      doc.font(fBold).fontSize(9).fillColor(C.accent);
      doc.text(
        t(isAr ? 'الهدف العام' : 'Objectif général'),
        M, y, { width: W, align: al },
      );
      y += 14;
      doc.font(fReg).fontSize(9.5).fillColor(C.dark);
      const gtxt = t(project.generalGoal);
      doc.text(gtxt, M, y, { width: W, align: al });
      y += doc.heightOfString(gtxt, { width: W }) + 10;
    }
    if (project.specificGoals) {
      doc.font(fBold).fontSize(9).fillColor(C.accent);
      doc.text(
        t(isAr ? 'الأهداف الخاصة' : 'Objectifs spécifiques'),
        M, y, { width: W, align: al },
      );
      y += 14;
      doc.font(fReg).fontSize(9.5).fillColor(C.dark);
      const stxt = t(project.specificGoals);
      doc.text(stxt, M, y, { width: W, align: al });
      y += doc.heightOfString(stxt, { width: W }) + 10;
    }
    y += 8;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS
  // ═══════════════════════════════════════════════════════════════════════════
  y = sectionTitle(isAr ? 'التقدم المحرز' : 'Avancement', y, C.accent);

  // — Milestones bar —
  const msBarLabel  = t(isAr ? 'تقدم المراحل' : 'Avancement des jalons');
  const msPctLabel  = `${msPct}% (${completedMs}/${totalMs})`;
  doc.font(fBold).fontSize(9).fillColor(C.dark);
  doc.text(msBarLabel, M, y, { width: W * 0.6, align: al });
  doc.font(fBold).fontSize(9).fillColor(C.accent);
  doc.text(msPctLabel, M, y, { width: W, align: oal });
  y += 14;
  doc.roundedRect(M, y, W, 11, 5).fill(C.border);
  if (msPct > 0) {
    const bw = W * msPct / 100;
    isAr
      ? doc.roundedRect(M + W - bw, y, bw, 11, 5).fill(C.accent)
      : doc.roundedRect(M, y, bw, 11, 5).fill(C.accent);
  }
  y += 20;

  // — Funding bar —
  if (total > 0) {
    const fLabel    = t(isAr ? 'التمويل' : 'Financement');
    const fPctLabel = `${pct.toFixed(0)}% — ${fmtMoney(funded)} / ${fmtMoney(total)}`;
    doc.font(fBold).fontSize(9).fillColor(C.dark);
    doc.text(fLabel, M, y, { width: W * 0.4, align: al });
    doc.font(fBold).fontSize(9).fillColor(C.green);
    doc.text(fPctLabel, M, y, { width: W, align: oal });
    y += 14;
    doc.roundedRect(M, y, W, 11, 5).fill(C.border);
    if (pct > 0) {
      const bw = W * pct / 100;
      isAr
        ? doc.roundedRect(M + W - bw, y, bw, 11, 5).fill(C.green)
        : doc.roundedRect(M, y, bw, 11, 5).fill(C.green);
    }
    y += 24;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MILESTONES TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  if (project.milestones.length > 0) {
    if (y > 590) { doc.addPage(); y = M; }
    y = sectionTitle(isAr ? 'مراحل المشروع' : 'Jalons du projet', y, C.navy);

    // Column definitions in logical (LTR) order; reversed for AR display
    const colsLTR = [
      { key: 'num',     labelFr: '#',           labelAr: '#',               w: 28 },
      { key: 'title',   labelFr: 'Jalon',        labelAr: 'المرحلة',         w: W * 0.38 },
      { key: 'planned', labelFr: 'Date prévue',  labelAr: 'التاريخ المخطط',  w: W * 0.19 },
      { key: 'actual',  labelFr: 'Date réelle',  labelAr: 'التاريخ الفعلي',  w: W * 0.19 },
      { key: 'status',  labelFr: 'Statut',       labelAr: 'الحالة',          w: W * 0.18 },
    ];
    const cols = isAr ? [...colsLTR].reverse() : colsLTR;

    // Header
    const hh = 20;
    doc.rect(M, y, W, hh).fill(C.navy);
    let cx = M;
    cols.forEach(col => {
      doc.font(fBold).fontSize(8).fillColor(C.white);
      doc.text(t(isAr ? col.labelAr : col.labelFr), cx + 5, y + 6, {
        width: col.w - 10, align: al,
      });
      cx += col.w;
    });
    y += hh;

    project.milestones.forEach((ms, idx) => {
      if (y > 720) { doc.addPage(); y = M; }
      const rh  = 24;
      const bg  = idx % 2 === 0 ? C.light : C.white;
      doc.rect(M, y, W, rh).fill(bg);
      // Left border stripe
      doc.rect(M, y, 3, rh).fill(MS_STATUS_COLOR[ms.status] || C.slate);

      const renderCell = {
        num:     (x, w) => {
          doc.font(fBold).fontSize(8).fillColor(C.slate)
             .text(String(idx + 1), x + 5, y + 8, { width: w - 10, align: al });
        },
        title:   (x, w) => {
          doc.font(fBold).fontSize(8.5).fillColor(C.dark)
             .text(t(ms.title), x + 5, y + 8, { width: w - 10, align: al });
        },
        planned: (x, w) => {
          doc.font(fReg).fontSize(8).fillColor(C.slate)
             .text(fmtDate(ms.plannedDate), x + 5, y + 8, { width: w - 10, align: al });
        },
        actual:  (x, w) => {
          doc.font(fReg).fontSize(8).fillColor(C.slate)
             .text(fmtDate(ms.actualDate), x + 5, y + 8, { width: w - 10, align: al });
        },
        status:  (x, w) => {
          const sc  = MS_STATUS_COLOR[ms.status] || C.slate;
          const sl  = t(MS_STATUS_LABEL[ms.status]?.[lang] || ms.status);
          doc.roundedRect(x + 4, y + 6, w - 12, 13, 6).fill(sc);
          doc.font(fBold).fontSize(7).fillColor(C.white)
             .text(sl, x + 4, y + 9, { width: w - 12, align: 'center' });
        },
      };

      cx = M;
      cols.forEach(col => { renderCell[col.key]?.(cx, col.w); cx += col.w; });
      y += rh;
    });
    y += 14;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNDING ENTRIES
  // ═══════════════════════════════════════════════════════════════════════════
  if (project.funding?.entries?.length > 0) {
    if (y > 590) { doc.addPage(); y = M; }
    y = sectionTitle(isAr ? 'مصادر التمويل' : 'Sources de financement', y, C.green);

    // Sub-header
    doc.rect(M, y, W, 18).fill('#dcfce7');
    const fhLabel = t(isAr ? 'المصدر / المانح' : 'Source / Donateur');
    const fhAmt   = t(isAr ? 'المبلغ' : 'Montant');
    const fhDate  = t(isAr ? 'التاريخ' : 'Date');
    if (isAr) {
      doc.font(fBold).fontSize(8).fillColor('#15803d')
         .text(fhAmt,   M + 6,       y + 5, { width: W * 0.22, align: 'left' });
      doc.font(fBold).fontSize(8).fillColor('#15803d')
         .text(fhDate,  M + W * 0.22, y + 5, { width: W * 0.2, align: 'center' });
      doc.font(fBold).fontSize(8).fillColor('#15803d')
         .text(fhLabel, M + W * 0.42, y + 5, { width: W * 0.54, align: 'right' });
    } else {
      doc.font(fBold).fontSize(8).fillColor('#15803d')
         .text(fhLabel, M + 8, y + 5, { width: W * 0.54 });
      doc.font(fBold).fontSize(8).fillColor('#15803d')
         .text(fhDate,  M + W * 0.58, y + 5, { width: W * 0.2, align: 'center' });
      doc.font(fBold).fontSize(8).fillColor('#15803d')
         .text(fhAmt,   M + W * 0.78, y + 5, { width: W * 0.22, align: 'right' });
    }
    y += 18;

    project.funding.entries.forEach((entry, idx) => {
      if (y > 730) { doc.addPage(); y = M; }
      const rh = 22;
      const bg = idx % 2 === 0 ? '#f0fdf4' : C.white;
      doc.rect(M, y, W, rh).fill(bg);

      const srcTxt = t(entry.source + (entry.donor ? ` — ${entry.donor}` : ''));
      const amtTxt = fmtMoney(entry.amount);
      const dtTxt  = fmtDate(entry.date);

      if (isAr) {
        doc.font(fBold).fontSize(9).fillColor(C.green)
           .text(amtTxt, M + 6, y + 7, { width: W * 0.22, align: 'left' });
        doc.font(fReg).fontSize(8).fillColor(C.slate)
           .text(dtTxt, M + W * 0.22, y + 7, { width: W * 0.2, align: 'center' });
        doc.font(fBold).fontSize(9).fillColor(C.dark)
           .text(srcTxt, M + W * 0.42, y + 7, { width: W * 0.54, align: 'right' });
      } else {
        doc.font(fBold).fontSize(9).fillColor(C.dark)
           .text(srcTxt, M + 8, y + 7, { width: W * 0.54 });
        doc.font(fReg).fontSize(8).fillColor(C.slate)
           .text(dtTxt, M + W * 0.58, y + 7, { width: W * 0.2, align: 'center' });
        doc.font(fBold).fontSize(9).fillColor(C.green)
           .text(amtTxt, M + W * 0.78, y + 7, { width: W * 0.22, align: 'right' });
      }
      y += rh;
    });

    // Total row
    const th = 26;
    doc.rect(M, y, W, th).fill(C.navy);
    const totLabel = t(isAr ? 'المجموع الكلي' : 'TOTAL');
    if (isAr) {
      doc.font(fBold).fontSize(10.5).fillColor('#86efac')
         .text(fmtMoney(funded), M + 8, y + 8, { width: W * 0.4, align: 'left' });
      doc.font(fBold).fontSize(10.5).fillColor(C.white)
         .text(totLabel, M + W * 0.4, y + 8, { width: W * 0.55, align: 'right' });
    } else {
      doc.font(fBold).fontSize(10.5).fillColor(C.white)
         .text(totLabel, M + 8, y + 8, { width: W * 0.5 });
      doc.font(fBold).fontSize(10.5).fillColor('#86efac')
         .text(fmtMoney(funded), M + 8, y + 8, { width: W - 8, align: 'right' });
    }
    y += th + 14;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  const footerY = PH - 36;
  doc.rect(0, footerY, PW, 36).fill(C.navy);
  const footerTxt = isAr
    ? t(`تقرير المشروع — ${new Date().toLocaleDateString('fr-MA')}`)
    : `Rapport généré le ${new Date().toLocaleDateString('fr-MA')}`;
  doc.font(fReg).fontSize(8).fillColor('#93c5fd');
  doc.text(footerTxt, M, footerY + 12, { width: W, align: 'center' });

  doc.end();
}

module.exports = { generateProjectReportPDF };
