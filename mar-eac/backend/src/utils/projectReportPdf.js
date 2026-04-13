const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const arabicReshaper = require('arabic-reshaper');
const ar = (text) => {
  if (!text) return '';
  const shaped = arabicReshaper.convertArabic(String(text));
  return shaped.split(' ').reverse().join(' ');
};

const FONT_AR = path.join(__dirname, '../../assets/Amiri-Regular.ttf');
const FONT_AR_BOLD = path.join(__dirname, '../../assets/Amiri-Bold.ttf');

const STATUS_LABEL = {
  PLANNED: { fr: 'Planifié', ar: 'مُخطَّط' },
  IN_PROGRESS: { fr: 'En cours', ar: 'جاري التنفيذ' },
  COMPLETED: { fr: 'Terminé', ar: 'مكتمل' },
  CANCELLED: { fr: 'Annulé', ar: 'ملغى' },
};
const MS_STATUS = {
  PENDING: { fr: 'En attente', ar: 'قيد الانتظار' },
  IN_PROGRESS: { fr: 'En cours', ar: 'جاري' },
  COMPLETED: { fr: 'Réalisé', ar: 'منجز' },
  DELAYED: { fr: 'Retardé', ar: 'متأخر' },
};
const TYPE_LABEL = {
  WATER: { fr: 'Eau potable', ar: 'الماء الصالح للشرب' },
  ROAD: { fr: 'Route / Piste', ar: 'طريق / مسلك' },
  HEALTH: { fr: 'Santé', ar: 'الصحة' },
  EDUCATION: { fr: 'Éducation', ar: 'التعليم' },
  ENVIRONMENT: { fr: 'Environnement', ar: 'البيئة' },
  AGRICULTURE: { fr: 'Agriculture', ar: 'الفلاحة' },
  INFRASTRUCTURE: { fr: 'Infrastructure', ar: 'البنية التحتية' },
  OTHER: { fr: 'Autre', ar: 'أخرى' },
};

const fmtDate = (d, lang) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA', { day: '2-digit', month: 'long', year: 'numeric' });
};
const fmtCurrency = (n) => `${(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`;

const hasFont = fs.existsSync(FONT_AR);

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

  const W = doc.page.width - 80;
  const isAr = lang === 'ar' && hasFont;
  const regularFont = isAr ? FONT_AR : 'Helvetica';
  const boldFont = isAr ? (fs.existsSync(FONT_AR_BOLD) ? FONT_AR_BOLD : FONT_AR) : 'Helvetica-Bold';
  const features = {};
  // Helper: apply arabic reshaping when in AR mode
  const t = (text) => isAr ? ar(text) : String(text || '');

  const funded = project.funding?.fundedAmount || 0;
  const total = project.funding?.totalBudget || 0;
  const pct = total > 0 ? Math.min(100, (funded / total) * 100) : 0;
  const completedMs = project.milestones.filter((m) => m.status === 'COMPLETED').length;
  const totalMs = project.milestones.length;
  const msPct = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;

  // ── Header band ──────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 90).fill('#1e3a5f');
  doc.fillColor('white').font(boldFont).fontSize(18);
  const orgName = (lang === 'ar' && project.organization.nameAr) ? project.organization.nameAr : project.organization.name;
  doc.text(t(orgName), 40, 20, { width: W });
  doc.font(regularFont).fontSize(10).fillColor('#a0c4ff');
  doc.text(t(lang === 'ar' ? 'تقرير المشروع' : 'Rapport de Projet'), 40, 44, { width: W });
  doc.fillColor('white').font(boldFont).fontSize(13);
  doc.text(t(project.title), 40, 62, { width: W });

  // Status badge top-right
  const stLabel = t(STATUS_LABEL[project.status]?.[lang] || project.status);
  const stColor = { PLANNED: '#3b82f6', IN_PROGRESS: '#f59e0b', COMPLETED: '#10b981', CANCELLED: '#ef4444' }[project.status] || '#6b7280';
  doc.roundedRect(doc.page.width - 130, 18, 90, 22, 11).fill(stColor);
  doc.fillColor('white').font(boldFont).fontSize(9).text(stLabel, doc.page.width - 130, 24, { width: 90, align: 'center' });

  let y = 110;

  // ── Key info row ─────────────────────────────────────────────────────────
  const infoItems = [
    { label: t(lang === 'ar' ? 'النوع' : 'Type'), value: t(TYPE_LABEL[project.type]?.[lang] || project.type) },
    { label: t(lang === 'ar' ? 'المسؤول' : 'Responsable'), value: t(project.manager || '—') },
    { label: t(lang === 'ar' ? 'تاريخ البداية' : 'Début'), value: fmtDate(project.startDate, lang) },
    { label: t(lang === 'ar' ? 'تاريخ النهاية' : 'Fin prévue'), value: fmtDate(project.endDate, lang) },
  ];
  const colW = W / infoItems.length;
  infoItems.forEach((item, i) => {
    doc.roundedRect(40 + i * colW, y, colW - 6, 46, 6).fill('#f0f4f8');
    doc.fillColor('#64748b').font(regularFont).fontSize(8).text(item.label, 46 + i * colW, y + 8, { width: colW - 18, align: isAr ? 'right' : 'left' });
    doc.fillColor('#1e293b').font(boldFont).fontSize(10).text(item.value, 46 + i * colW, y + 22, { width: colW - 18, align: isAr ? 'right' : 'left' });
  });
  y += 60;

  // ── Goals ────────────────────────────────────────────────────────────────
  if (project.generalGoal || project.specificGoals) {
    doc.fillColor('#1e3a5f').font(boldFont).fontSize(12).text(t(lang === 'ar' ? 'الأهداف' : 'Objectifs'), 40, y);
    y += 18;
    if (project.generalGoal) {
      doc.fillColor('#334155').font(regularFont).fontSize(9).text(t((lang === 'ar' ? 'الهدف العام: ' : 'Objectif général : ') + project.generalGoal), 40, y, { width: W });
      y += doc.heightOfString(project.generalGoal, { width: W }) + 6;
    }
    if (project.specificGoals) {
      doc.fillColor('#334155').font(regularFont).fontSize(9).text(t((lang === 'ar' ? 'الأهداف الخاصة: ' : 'Objectifs spécifiques : ') + project.specificGoals), 40, y, { width: W });
      y += doc.heightOfString(project.specificGoals, { width: W }) + 6;
    }
    y += 8;
  }

  // ── Progress section ─────────────────────────────────────────────────────
  doc.fillColor('#1e3a5f').font(boldFont).fontSize(12).text(t(lang === 'ar' ? 'التقدم المحرز' : 'Avancement'), 40, y);
  y += 18;

  doc.fillColor('#475569').font(regularFont).fontSize(9).text(t(lang === 'ar' ? 'تقدم المراحل' : 'Avancement des jalons'), 40, y);
  doc.fillColor('#475569').font(boldFont).fontSize(9).text(`${msPct}%  (${completedMs}/${totalMs})`, 40, y, { width: W, align: 'right' });
  y += 14;
  doc.roundedRect(40, y, W, 10, 5).fill('#e2e8f0');
  if (msPct > 0) doc.roundedRect(40, y, W * msPct / 100, 10, 5).fill('#3b82f6');
  y += 20;

  if (total > 0) {
    doc.fillColor('#475569').font(regularFont).fontSize(9).text(t(lang === 'ar' ? 'التمويل' : 'Financement'), 40, y);
    doc.fillColor('#475569').font(boldFont).fontSize(9).text(`${pct.toFixed(0)}%  ${fmtCurrency(funded)} / ${fmtCurrency(total)}`, 40, y, { width: W, align: 'right' });
    y += 14;
    doc.roundedRect(40, y, W, 10, 5).fill('#e2e8f0');
    if (pct > 0) doc.roundedRect(40, y, W * pct / 100, 10, 5).fill('#10b981');
    y += 24;
  }

  // ── Milestones table ─────────────────────────────────────────────────────
  if (project.milestones.length > 0) {
    if (y > 600) { doc.addPage(); y = 40; }
    doc.fillColor('#1e3a5f').font(boldFont).fontSize(12).text(t(lang === 'ar' ? 'مراحل المشروع' : 'Jalons du projet'), 40, y);
    y += 20;

    const cols = [
      { label: '#', w: 24 },
      { label: t(lang === 'ar' ? 'المرحلة' : 'Jalon'), w: W * 0.38 },
      { label: t(lang === 'ar' ? 'التاريخ المخطط' : 'Date prévue'), w: W * 0.18 },
      { label: t(lang === 'ar' ? 'التاريخ الفعلي' : 'Date réelle'), w: W * 0.18 },
      { label: t(lang === 'ar' ? 'الحالة' : 'Statut'), w: W * 0.18 },
    ];
    doc.rect(40, y, W, 18).fill('#1e3a5f');
    let cx = 40;
    cols.forEach((col) => {
      doc.fillColor('white').font(boldFont).fontSize(8).text(col.label, cx + 4, y + 5, { width: col.w - 8 });
      cx += col.w;
    });
    y += 18;

    project.milestones.forEach((ms, idx) => {
      if (y > 720) { doc.addPage(); y = 40; }
      const bg = idx % 2 === 0 ? '#f8fafc' : 'white';
      const msH = 22;
      doc.rect(40, y, W, msH).fill(bg);

      const msStatusColor = { COMPLETED: '#10b981', IN_PROGRESS: '#3b82f6', DELAYED: '#ef4444', PENDING: '#94a3b8' }[ms.status] || '#94a3b8';
      const msLabel = t(MS_STATUS[ms.status]?.[lang] || ms.status);

      cx = 40;
      doc.fillColor('#374151').font(regularFont).fontSize(8).text(String(idx + 1), cx + 4, y + 7, { width: cols[0].w - 8 });
      cx += cols[0].w;
      doc.fillColor('#1e293b').font(boldFont).fontSize(8).text(t(ms.title), cx + 4, y + 7, { width: cols[1].w - 8 });
      cx += cols[1].w;
      doc.fillColor('#374151').font(regularFont).fontSize(8).text(fmtDate(ms.plannedDate, lang), cx + 4, y + 7, { width: cols[2].w - 8 });
      cx += cols[2].w;
      doc.fillColor('#374151').font(regularFont).fontSize(8).text(fmtDate(ms.actualDate, lang), cx + 4, y + 7, { width: cols[3].w - 8 });
      cx += cols[3].w;
      doc.roundedRect(cx + 2, y + 5, cols[4].w - 8, 13, 6).fill(msStatusColor);
      doc.fillColor('white').font(boldFont).fontSize(7).text(msLabel, cx + 2, y + 8, { width: cols[4].w - 8, align: 'center' });
      y += msH;
    });
    y += 12;
  }

  // ── Funding entries ───────────────────────────────────────────────────────
  if (project.funding?.entries?.length > 0) {
    if (y > 600) { doc.addPage(); y = 40; }
    doc.fillColor('#1e3a5f').font(boldFont).fontSize(12).text(t(lang === 'ar' ? 'مصادر التمويل' : 'Sources de financement'), 40, y);
    y += 20;

    project.funding.entries.forEach((entry, idx) => {
      if (y > 730) { doc.addPage(); y = 40; }
      const bg = idx % 2 === 0 ? '#f0fdf4' : 'white';
      doc.rect(40, y, W, 20).fill(bg);
      doc.fillColor('#1e293b').font(boldFont).fontSize(9).text(t(entry.source + (entry.donor ? ` — ${entry.donor}` : '')), 46, y + 6, { width: W * 0.55 });
      doc.fillColor('#10b981').font(boldFont).fontSize(9).text(fmtCurrency(entry.amount), 46, y + 6, { width: W - 12, align: 'right' });
      doc.fillColor('#64748b').font(regularFont).fontSize(7.5).text(fmtDate(entry.date, lang), 46, y + 14, { width: W * 0.55 });
      y += 20;
    });

    doc.rect(40, y, W, 22).fill('#1e3a5f');
    doc.fillColor('white').font(boldFont).fontSize(10).text(t(lang === 'ar' ? 'المجموع' : 'TOTAL'), 46, y + 6, { width: W * 0.55 });
    doc.fillColor('#86efac').font(boldFont).fontSize(10).text(fmtCurrency(funded), 46, y + 6, { width: W - 12, align: 'right' });
    y += 30;
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const pageCount = doc.bufferedPageRange().count + 1;
  doc.fillColor('#94a3b8').font(regularFont).fontSize(8);
  const footerTxt = lang === 'ar'
    ? t(`تقرير المشروع — ${new Date().toLocaleDateString('fr-MA')}`)
    : `Rapport généré le ${new Date().toLocaleDateString('fr-MA')}`;
  doc.text(footerTxt, 40, doc.page.height - 40, { width: W, align: 'center' });

  doc.end();
}

module.exports = { generateProjectReportPDF };
