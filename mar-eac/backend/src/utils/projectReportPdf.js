const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const arabicReshaper = require('arabic-reshaper');

const FONT_AR      = path.join(__dirname, '../assets/fonts/Amiri-Regular.ttf');
const FONT_AR_BOLD = path.join(__dirname, '../assets/fonts/Amiri-Bold.ttf');

const STATUS_LABEL = {
  PLANNED:     { fr: 'Planifié',     ar: 'مُخطَّط' },
  IN_PROGRESS: { fr: 'En cours',     ar: 'جاري التنفيذ' },
  COMPLETED:   { fr: 'Terminé',      ar: 'مكتمل' },
  CANCELLED:   { fr: 'Annulé',       ar: 'ملغى' },
};
const MS_STATUS = {
  PENDING:     { fr: 'En attente',   ar: 'قيد الانتظار' },
  IN_PROGRESS: { fr: 'En cours',     ar: 'جاري' },
  COMPLETED:   { fr: 'Réalisé',      ar: 'منجز' },
  DELAYED:     { fr: 'Retardé',      ar: 'متأخر' },
};
const TYPE_LABEL = {
  WATER:          { fr: 'Eau potable',       ar: 'الماء الصالح للشرب' },
  ROAD:           { fr: 'Route / Piste',     ar: 'طريق / مسلك' },
  HEALTH:         { fr: 'Santé',             ar: 'الصحة' },
  EDUCATION:      { fr: 'Éducation',         ar: 'التعليم' },
  ENVIRONMENT:    { fr: 'Environnement',     ar: 'البيئة' },
  AGRICULTURE:    { fr: 'Agriculture',       ar: 'الفلاحة' },
  INFRASTRUCTURE: { fr: 'Infrastructure',    ar: 'البنية التحتية' },
  OTHER:          { fr: 'Autre',             ar: 'أخرى' },
};

const fmtDate = (d, lang) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA', { day: '2-digit', month: 'long', year: 'numeric' });
};
const fmtCurrency = (n) => `${(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`;

const hasFont = fs.existsSync(FONT_AR);

const reshape = (text) => {
  if (!text) return '';
  const shaped = arabicReshaper.convertArabic(String(text));
  return shaped.split(' ').reverse().join(' ');
};

async function generateProjectReportPDF(req, res) {
  const prisma = require('../config/database');
  const orgId = req.organization.id;
  const { id } = req.params;
  const lang = req.query.lang || 'fr';

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    include: {
      milestones: { orderBy: { order: 'asc' } },
      funding: { include: { entries: { orderBy: { date: 'asc' } } } },
      organization: { select: { name: true, nameAr: true, city: true, logo: true } },
    },
  });
  if (!project) { res.status(404).json({ message: 'Project not found' }); return; }

  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: project.title } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="project-${id}.pdf"`);
  doc.pipe(res);

  const M = 40;
  const PW = doc.page.width;
  const W = PW - M * 2;
  const isAr = lang === 'ar' && hasFont;
  const regularFont = isAr ? FONT_AR : 'Helvetica';
  const boldFont    = isAr ? (fs.existsSync(FONT_AR_BOLD) ? FONT_AR_BOLD : FONT_AR) : 'Helvetica-Bold';

  // Render text: reshape when AR, pass through otherwise
  const t = (text) => isAr ? reshape(String(text || '')) : String(text || '');
  // Text alignment helper
  const align = (a = 'left') => isAr ? (a === 'left' ? 'right' : a === 'right' ? 'left' : a) : a;
  // x offset for text inside a card: start from right edge when RTL
  const tx = (x, cardW, pad = 6) => isAr ? x + pad : x + pad;
  const textOpts = (w, a = 'natural') => ({ width: w, align: isAr ? 'right' : (a === 'natural' ? 'left' : a) });

  const funded     = project.funding?.fundedAmount || 0;
  const total      = project.funding?.totalBudget  || 0;
  const pct        = total > 0 ? Math.min(100, (funded / total) * 100) : 0;
  const completedMs = project.milestones.filter((m) => m.status === 'COMPLETED').length;
  const totalMs    = project.milestones.length;
  const msPct      = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;

  // ── Header band ─────────────────────────────────────────────────────────────
  doc.rect(0, 0, PW, 90).fill('#1e3a5f');

  const orgName = (lang === 'ar' && project.organization.nameAr) ? project.organization.nameAr : project.organization.name;
  doc.fillColor('white').font(boldFont).fontSize(18);
  doc.text(t(orgName), M, 18, { width: W, align: isAr ? 'right' : 'left' });

  doc.font(regularFont).fontSize(10).fillColor('#a0c4ff');
  doc.text(t(lang === 'ar' ? 'تقرير المشروع' : 'Rapport de Projet'), M, 44, { width: W, align: isAr ? 'right' : 'left' });

  doc.fillColor('white').font(boldFont).fontSize(13);
  doc.text(t(project.title), M, 62, { width: W, align: isAr ? 'right' : 'left' });

  // Status badge — top-right for FR, top-left for AR
  const stLabel = t(STATUS_LABEL[project.status]?.[lang] || project.status);
  const stColor = { PLANNED: '#3b82f6', IN_PROGRESS: '#f59e0b', COMPLETED: '#10b981', CANCELLED: '#ef4444' }[project.status] || '#6b7280';
  const badgeX = isAr ? M : PW - 130;
  doc.roundedRect(badgeX, 18, 90, 22, 11).fill(stColor);
  doc.fillColor('white').font(boldFont).fontSize(9).text(stLabel, badgeX, 24, { width: 90, align: 'center' });

  let y = 110;

  // ── Key info cards ───────────────────────────────────────────────────────────
  const infoItems = [
    { label: lang === 'ar' ? 'النوع' : 'Type',              value: t(TYPE_LABEL[project.type]?.[lang] || project.type) },
    { label: lang === 'ar' ? 'المسؤول' : 'Responsable',      value: t(project.manager || '—') },
    { label: lang === 'ar' ? 'تاريخ البداية' : 'Début',      value: fmtDate(project.startDate, lang) },
    { label: lang === 'ar' ? 'تاريخ النهاية' : 'Fin prévue', value: fmtDate(project.endDate, lang) },
  ];
  // Reverse card order for RTL so reading flows right-to-left
  const displayItems = isAr ? [...infoItems].reverse() : infoItems;
  const colW = W / displayItems.length;
  displayItems.forEach((item, i) => {
    const cx = M + i * colW;
    doc.roundedRect(cx, y, colW - 6, 46, 6).fill('#f0f4f8');
    doc.fillColor('#64748b').font(regularFont).fontSize(8)
       .text(t(item.label), cx + 6, y + 8, { width: colW - 18, align: isAr ? 'right' : 'left' });
    doc.fillColor('#1e293b').font(boldFont).fontSize(10)
       .text(item.value, cx + 6, y + 22, { width: colW - 18, align: isAr ? 'right' : 'left' });
  });
  y += 60;

  // ── Goals ────────────────────────────────────────────────────────────────────
  if (project.generalGoal || project.specificGoals) {
    doc.fillColor('#1e3a5f').font(boldFont).fontSize(12)
       .text(t(lang === 'ar' ? 'الأهداف' : 'Objectifs'), M, y, { width: W, align: isAr ? 'right' : 'left' });
    y += 18;

    if (project.generalGoal) {
      const prefix = lang === 'ar' ? 'الهدف العام: ' : 'Objectif général : ';
      const txt = t(prefix + project.generalGoal);
      doc.fillColor('#334155').font(regularFont).fontSize(9)
         .text(txt, M, y, { width: W, align: isAr ? 'right' : 'left' });
      y += doc.heightOfString(txt, { width: W }) + 6;
    }
    if (project.specificGoals) {
      const prefix = lang === 'ar' ? 'الأهداف الخاصة: ' : 'Objectifs spécifiques : ';
      const txt = t(prefix + project.specificGoals);
      doc.fillColor('#334155').font(regularFont).fontSize(9)
         .text(txt, M, y, { width: W, align: isAr ? 'right' : 'left' });
      y += doc.heightOfString(txt, { width: W }) + 6;
    }
    y += 8;
  }

  // ── Progress section ─────────────────────────────────────────────────────────
  doc.fillColor('#1e3a5f').font(boldFont).fontSize(12)
     .text(t(lang === 'ar' ? 'التقدم المحرز' : 'Avancement'), M, y, { width: W, align: isAr ? 'right' : 'left' });
  y += 18;

  // Milestones progress bar
  const msBarLabel = t(lang === 'ar' ? 'تقدم المراحل' : 'Avancement des jalons');
  const msPctLabel = `${msPct}%  (${completedMs}/${totalMs})`;
  if (isAr) {
    doc.fillColor('#475569').font(boldFont).fontSize(9).text(msPctLabel, M, y, { width: W * 0.35, align: 'left' });
    doc.fillColor('#475569').font(regularFont).fontSize(9).text(msBarLabel, M + W * 0.35, y, { width: W * 0.65, align: 'right' });
  } else {
    doc.fillColor('#475569').font(regularFont).fontSize(9).text(msBarLabel, M, y);
    doc.fillColor('#475569').font(boldFont).fontSize(9).text(msPctLabel, M, y, { width: W, align: 'right' });
  }
  y += 14;
  doc.roundedRect(M, y, W, 10, 5).fill('#e2e8f0');
  if (msPct > 0) {
    if (isAr) {
      // RTL: bar fills from the right
      doc.roundedRect(M + W - W * msPct / 100, y, W * msPct / 100, 10, 5).fill('#3b82f6');
    } else {
      doc.roundedRect(M, y, W * msPct / 100, 10, 5).fill('#3b82f6');
    }
  }
  y += 20;

  if (total > 0) {
    const fundLabel = t(lang === 'ar' ? 'التمويل' : 'Financement');
    const fundPctLabel = `${pct.toFixed(0)}%  ${fmtCurrency(funded)} / ${fmtCurrency(total)}`;
    if (isAr) {
      doc.fillColor('#475569').font(boldFont).fontSize(9).text(fundPctLabel, M, y, { width: W * 0.55, align: 'left' });
      doc.fillColor('#475569').font(regularFont).fontSize(9).text(fundLabel, M + W * 0.55, y, { width: W * 0.45, align: 'right' });
    } else {
      doc.fillColor('#475569').font(regularFont).fontSize(9).text(fundLabel, M, y);
      doc.fillColor('#475569').font(boldFont).fontSize(9).text(fundPctLabel, M, y, { width: W, align: 'right' });
    }
    y += 14;
    doc.roundedRect(M, y, W, 10, 5).fill('#e2e8f0');
    if (pct > 0) {
      if (isAr) {
        doc.roundedRect(M + W - W * pct / 100, y, W * pct / 100, 10, 5).fill('#10b981');
      } else {
        doc.roundedRect(M, y, W * pct / 100, 10, 5).fill('#10b981');
      }
    }
    y += 24;
  }

  // ── Milestones table ──────────────────────────────────────────────────────────
  if (project.milestones.length > 0) {
    if (y > 600) { doc.addPage(); y = 40; }
    doc.fillColor('#1e3a5f').font(boldFont).fontSize(12)
       .text(t(lang === 'ar' ? 'مراحل المشروع' : 'Jalons du projet'), M, y, { width: W, align: isAr ? 'right' : 'left' });
    y += 20;

    // Column definitions — define logical order, then reverse for AR display
    const colsFR = [
      { key: 'num',     label: '#',                              w: 24 },
      { key: 'title',   label: 'Jalon',                         w: W * 0.38 },
      { key: 'planned', label: 'Date prévue',                   w: W * 0.18 },
      { key: 'actual',  label: 'Date réelle',                   w: W * 0.18 },
      { key: 'status',  label: 'Statut',                        w: W * 0.18 },
    ];
    const colsAR = [
      { key: 'status',  label: 'الحالة',                        w: W * 0.18 },
      { key: 'actual',  label: 'التاريخ الفعلي',                w: W * 0.18 },
      { key: 'planned', label: 'التاريخ المخطط',               w: W * 0.18 },
      { key: 'title',   label: 'المرحلة',                       w: W * 0.38 },
      { key: 'num',     label: '#',                              w: 24 },
    ];
    const cols = isAr ? colsAR : colsFR;

    // Header row
    doc.rect(M, y, W, 18).fill('#1e3a5f');
    let cx = M;
    cols.forEach((col) => {
      doc.fillColor('white').font(boldFont).fontSize(8)
         .text(t(col.label), cx + 4, y + 5, { width: col.w - 8, align: isAr ? 'right' : 'left' });
      cx += col.w;
    });
    y += 18;

    project.milestones.forEach((ms, idx) => {
      if (y > 720) { doc.addPage(); y = 40; }
      const bg = idx % 2 === 0 ? '#f8fafc' : 'white';
      const msH = 22;
      doc.rect(M, y, W, msH).fill(bg);

      const msStatusColor = { COMPLETED: '#10b981', IN_PROGRESS: '#3b82f6', DELAYED: '#ef4444', PENDING: '#94a3b8' }[ms.status] || '#94a3b8';
      const msLabel = t(MS_STATUS[ms.status]?.[lang] || ms.status);

      // Build a map of column key → render function
      const renderCell = {
        num:     (x, w) => {
          doc.fillColor('#374151').font(regularFont).fontSize(8)
             .text(String(idx + 1), x + 4, y + 7, { width: w - 8, align: isAr ? 'right' : 'left' });
        },
        title:   (x, w) => {
          doc.fillColor('#1e293b').font(boldFont).fontSize(8)
             .text(t(ms.title), x + 4, y + 7, { width: w - 8, align: isAr ? 'right' : 'left' });
        },
        planned: (x, w) => {
          doc.fillColor('#374151').font(regularFont).fontSize(8)
             .text(fmtDate(ms.plannedDate, lang), x + 4, y + 7, { width: w - 8, align: isAr ? 'right' : 'left' });
        },
        actual:  (x, w) => {
          doc.fillColor('#374151').font(regularFont).fontSize(8)
             .text(fmtDate(ms.actualDate, lang), x + 4, y + 7, { width: w - 8, align: isAr ? 'right' : 'left' });
        },
        status:  (x, w) => {
          doc.roundedRect(x + 2, y + 5, w - 8, 13, 6).fill(msStatusColor);
          doc.fillColor('white').font(boldFont).fontSize(7)
             .text(msLabel, x + 2, y + 8, { width: w - 8, align: 'center' });
        },
      };

      cx = M;
      cols.forEach((col) => {
        renderCell[col.key]?.(cx, col.w);
        cx += col.w;
      });
      y += msH;
    });
    y += 12;
  }

  // ── Funding entries ────────────────────────────────────────────────────────────
  if (project.funding?.entries?.length > 0) {
    if (y > 600) { doc.addPage(); y = 40; }
    doc.fillColor('#1e3a5f').font(boldFont).fontSize(12)
       .text(t(lang === 'ar' ? 'مصادر التمويل' : 'Sources de financement'), M, y, { width: W, align: isAr ? 'right' : 'left' });
    y += 20;

    project.funding.entries.forEach((entry, idx) => {
      if (y > 730) { doc.addPage(); y = 40; }
      const bg = idx % 2 === 0 ? '#f0fdf4' : 'white';
      doc.rect(M, y, W, 20).fill(bg);

      const sourceTxt = t(entry.source + (entry.donor ? ` — ${entry.donor}` : ''));
      const amountTxt = fmtCurrency(entry.amount);
      const dateTxt   = fmtDate(entry.date, lang);

      if (isAr) {
        // AR: amount on left, source on right
        doc.fillColor('#10b981').font(boldFont).fontSize(9)
           .text(amountTxt, M + 6, y + 6, { width: W * 0.35, align: 'left' });
        doc.fillColor('#1e293b').font(boldFont).fontSize(9)
           .text(sourceTxt, M + W * 0.35, y + 6, { width: W * 0.6, align: 'right' });
        doc.fillColor('#64748b').font(regularFont).fontSize(7.5)
           .text(dateTxt, M + 6, y + 13, { width: W * 0.35, align: 'left' });
      } else {
        doc.fillColor('#1e293b').font(boldFont).fontSize(9)
           .text(sourceTxt, M + 6, y + 6, { width: W * 0.55 });
        doc.fillColor('#10b981').font(boldFont).fontSize(9)
           .text(amountTxt, M + 6, y + 6, { width: W - 12, align: 'right' });
        doc.fillColor('#64748b').font(regularFont).fontSize(7.5)
           .text(dateTxt, M + 6, y + 13, { width: W * 0.55 });
      }
      y += 20;
    });

    // Total row
    doc.rect(M, y, W, 22).fill('#1e3a5f');
    if (isAr) {
      doc.fillColor('#86efac').font(boldFont).fontSize(10)
         .text(fmtCurrency(funded), M + 6, y + 6, { width: W * 0.45, align: 'left' });
      doc.fillColor('white').font(boldFont).fontSize(10)
         .text(t('المجموع'), M + W * 0.45, y + 6, { width: W * 0.5, align: 'right' });
    } else {
      doc.fillColor('white').font(boldFont).fontSize(10).text('TOTAL', M + 6, y + 6, { width: W * 0.55 });
      doc.fillColor('#86efac').font(boldFont).fontSize(10)
         .text(fmtCurrency(funded), M + 6, y + 6, { width: W - 12, align: 'right' });
    }
    y += 30;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────────
  const footerTxt = lang === 'ar'
    ? t(`تقرير المشروع — ${new Date().toLocaleDateString('fr-MA')}`)
    : `Rapport généré le ${new Date().toLocaleDateString('fr-MA')}`;
  doc.fillColor('#94a3b8').font(regularFont).fontSize(8)
     .text(footerTxt, M, doc.page.height - 40, { width: W, align: 'center' });

  doc.end();
}

module.exports = { generateProjectReportPDF };
