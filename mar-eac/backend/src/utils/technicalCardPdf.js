const PDFDocument    = require('pdfkit');
const path           = require('path');
const fs             = require('fs');
const arabicReshaper = require('arabic-reshaper');

const FONT_DIR  = path.join(__dirname, '../assets/fonts');
const FONT_AR   = path.join(FONT_DIR, 'Amiri-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'Amiri-Bold.ttf');

const ar = (text) => {
  if (!text) return '';
  const shaped = arabicReshaper.convertArabic(String(text));
  return shaped.split(' ').reverse().join(' ');
};

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('ar-MA'); } catch { return '—'; }
};

const STATUS_PHASE = {
  PLANNED:     'فكرة',
  IN_PROGRESS: 'مشروع في طور التنفيذ',
  COMPLETED:   'مشروع قائم',
  CANCELLED:   'ملغى',
};

const generateTechnicalCardPdf = (project, org, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `البطاقة التقنية — ${project.title}` } });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="bataqa-taniya-${project.id}.pdf"`);
  doc.pipe(res);

  const fontsOk = fs.existsSync(FONT_AR) && fs.existsSync(FONT_BOLD);
  if (fontsOk) {
    doc.registerFont('AR',   FONT_AR);
    doc.registerFont('ARB',  FONT_BOLD);
  }

  const AR   = fontsOk ? 'AR'  : 'Helvetica';
  const ARB  = fontsOk ? 'ARB' : 'Helvetica-Bold';

  const W = 595, H = 842;
  const M = 40, CW = W - 2 * M;
  const tc  = (project.technicalCard && typeof project.technicalCard === 'object') ? project.technicalCard : {};

  // ── Colors ──────────────────────────────────────────────────────────────────
  const RED    = '#C8102E';   // Moroccan red
  const GREEN  = '#006233';   // Moroccan green
  const NAVY   = '#1e3a5f';
  const LIGHT  = '#f0f4f8';
  const BORDER = '#c0c0c0';

  let y = 0;

  // ── Helper: draw rtl text (Arabic) ──────────────────────────────────────────
  const arText = (text, x, ty, opts = {}) => {
    doc.text(ar(text), x, ty, { lineBreak: false, ...opts });
  };

  // ── Helper: horizontal line ──────────────────────────────────────────────────
  const hline = (ty, color = BORDER, lw = 0.5) => {
    doc.save().strokeColor(color).lineWidth(lw).moveTo(M, ty).lineTo(W - M, ty).stroke().restore();
  };

  // ── Helper: fill rect ────────────────────────────────────────────────────────
  const fillRect = (rx, ry, rw, rh, color) => {
    doc.save().fillColor(color).rect(rx, ry, rw, rh).fill().restore();
  };

  // ── Helper: bordered cell ────────────────────────────────────────────────────
  const cell = (rx, ry, rw, rh, label, value, opts = {}) => {
    doc.save()
       .rect(rx, ry, rw, rh)
       .strokeColor(BORDER).lineWidth(0.5).stroke()
       .restore();

    if (label) {
      doc.font(ARB).fontSize(8).fillColor(NAVY);
      arText(label, rx + 4, ry + 5, { width: rw - 8, align: 'right' });
    }
    if (value) {
      doc.font(AR).fontSize(8).fillColor('#333');
      arText(value, rx + 4, ry + (label ? 17 : 8), { width: rw - 8, align: 'right' });
    }
    return ry + rh;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ═══════════════════════════════════════════════════════════════════════════

  // Top green stripe
  fillRect(0, 0, W, 8, GREEN);
  // Top red stripe
  fillRect(0, 8, W, 4, RED);

  // Header band
  fillRect(0, 12, W, 68, NAVY);

  // State entity logo (left side of header) — if provided
  const uploadDir = process.env.UPLOAD_DIR || path.resolve('./uploads');
  const etatLogoPath = tc.etatLogoUrl
    ? path.join(uploadDir, path.basename(tc.etatLogoUrl))
    : null;
  if (etatLogoPath && fs.existsSync(etatLogoPath)) {
    try {
      doc.image(etatLogoPath, M, 18, { fit: [50, 50], align: 'left', valign: 'center' });
    } catch (_) { /* skip if unembeddable */ }
  }

  // INDH logo text (right)
  doc.font(ARB).fontSize(9).fillColor('#fff');
  arText('المبادرة الوطنية للتنمية البشرية', M, 20, { width: CW, align: 'right' });
  doc.font(AR).fontSize(7.5).fillColor('#acd3f5');
  arText('المملكة المغربية  —  وزارة الداخلية', M, 33, { width: CW, align: 'right' });
  arText('الكتابة العامة  —  قسم العمل الاجتماعي', M, 44, { width: CW, align: 'right' });

  // Title center
  doc.font(ARB).fontSize(16).fillColor('#fff');
  arText('بطاقة تقنية للمشروع', M, 24, { width: CW, align: 'center' });

  // Bottom accent
  fillRect(0, 80, W, 3, RED);

  y = 95;

  // ── Section: Org name + holder type ────────────────────────────────────────
  doc.font(ARB).fontSize(9).fillColor(NAVY);
  arText('اسم الهيئة حاملة المشروع:', M, y, { width: CW, align: 'right' });
  doc.font(AR).fontSize(9).fillColor('#222');
  arText(org?.nameAr || org?.name || '...', M, y + 12, { width: CW, align: 'right' });

  y += 28;
  hline(y);
  y += 6;

  // الصفة row
  fillRect(M, y, CW, 20, LIGHT);
  doc.font(ARB).fontSize(8.5).fillColor(NAVY);
  arText('الصفة:', M, y + 6, { width: CW - 4, align: 'right' });

  const holderType = tc.holderType || 'جمعية';
  const isAssoc = holderType === 'جمعية';
  const isCoop  = holderType === 'تعاونية';
  const isYouth = holderType === 'شباب حامل فكرة مشروع';

  const box = (bx, by, checked) => {
    doc.save().rect(bx, by, 10, 10).strokeColor(NAVY).lineWidth(0.7).stroke().restore();
    if (checked) {
      doc.font(ARB).fontSize(10).fillColor(GREEN);
      doc.text('✓', bx + 1, by + 0, { lineBreak: false });
    }
  };

  // Three checkboxes — association | coopérative | jeunes
  box(W - M - 70,  y + 5, isCoop);
  doc.font(AR).fontSize(7.5).fillColor('#333');
  arText('التعاونيات', W - M - 60, y + 6, { width: 55, align: 'right' });

  box(W - M - 160, y + 5, isAssoc);
  arText('جمعية', W - M - 150, y + 6, { width: 80, align: 'right' });

  box(W - M - 285, y + 5, isYouth);
  arText('شباب حاملو فكرة مشروع', W - M - 275, y + 6, { width: 110, align: 'right' });

  y += 26;

  // ── Section: سلسلة المشروع ──────────────────────────────────────────────────
  fillRect(M, y, CW, 16, NAVY);
  doc.font(ARB).fontSize(9).fillColor('#fff');
  arText('سلسلة المشروع', M, y + 4, { width: CW - 4, align: 'center' });
  y += 16;

  const chain = Array.isArray(tc.projectChain) ? tc.projectChain : ['', '', '', '', '', '', '', '', ''];
  const chainCols = 2, chainH = 18;
  const colW = Math.floor(CW / chainCols);
  for (let r = 0; r < Math.ceil(chain.length / chainCols); r++) {
    for (let c = 0; c < chainCols; c++) {
      const idx = r * chainCols + c;
      const val = chain[idx] || '';
      const cx = M + (chainCols - 1 - c) * colW;
      doc.save().rect(cx, y, colW, chainH).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
      if (val) {
        doc.font(AR).fontSize(8).fillColor('#333');
        arText(val, cx + 4, y + 5, { width: colW - 8, align: 'right' });
      }
    }
    y += chainH;
  }

  y += 6;

  // ── Section: معلومات عامة عن الوحدة ────────────────────────────────────────
  fillRect(M, y, CW, 16, NAVY);
  doc.font(ARB).fontSize(9).fillColor('#fff');
  arText('معلومات عامة عن الوحدة', M, y + 4, { width: CW - 4, align: 'center' });
  y += 16;

  const infoRows = [
    { label: 'تاريخ التأسيس',             value: fmtDate(org?.foundingDate) },
    { label: 'العنوان',                    value: org?.addressAr || org?.address || '' },
    { label: 'الجماعة',                    value: tc.commune || org?.cityAr || org?.city || '' },
    { label: 'الهاتف',                     value: org?.phone || '' },
    { label: 'تسمية الوحدة',              value: org?.nameAr || org?.name || '' },
    { label: 'رقم السجل التعاوني',        value: tc.regNumber || '' },
    { label: 'ر.ب.ت.و',                   value: tc.iceNumber || '' },
  ];
  const infoH = 20;
  infoRows.forEach(({ label, value }) => {
    doc.save().rect(M, y, CW, infoH).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    // label column (right side ~35%)
    const lw = Math.floor(CW * 0.38);
    const vw = CW - lw;
    fillRect(W - M - lw, y, lw, infoH, LIGHT);
    doc.save().moveTo(W - M - lw, y).lineTo(W - M - lw, y + infoH).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    doc.font(ARB).fontSize(8).fillColor(NAVY);
    arText(label, W - M - lw + 4, y + 6, { width: lw - 8, align: 'right' });
    doc.font(AR).fontSize(8.5).fillColor('#222');
    arText(value, M + 4, y + 6, { width: vw - 8, align: 'right' });
    y += infoH;
  });

  // Bureau members + Partners (male/female)
  const memberRows = [
    { label: 'عدد أعضاء المكتب', maleKey: 'boardMale', femaleKey: 'boardFemale' },
    { label: 'عدد الشركاء',       maleKey: 'partnerMale', femaleKey: 'partnerFemale' },
  ];
  const mfW = Math.floor(CW / 3);
  memberRows.forEach(({ label, maleKey, femaleKey }) => {
    const lw2 = Math.floor(CW * 0.38);
    // outer border
    doc.save().rect(M, y, CW, infoH).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    // label
    fillRect(W - M - lw2, y, lw2, infoH, LIGHT);
    doc.save().moveTo(W - M - lw2, y).lineTo(W - M - lw2, y + infoH).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    doc.font(ARB).fontSize(8).fillColor(NAVY);
    arText(label, W - M - lw2 + 4, y + 6, { width: lw2 - 8, align: 'right' });
    // male / female columns
    const vw2 = CW - lw2;
    const halfVW = Math.floor(vw2 / 2);
    doc.save().moveTo(M + halfVW, y).lineTo(M + halfVW, y + infoH).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    doc.font(ARB).fontSize(7.5).fillColor(NAVY);
    arText('ذكور', M + halfVW + 4, y + 3, { width: halfVW - 8, align: 'right' });
    arText('إناث', M + 4, y + 3, { width: halfVW - 8, align: 'right' });
    doc.font(AR).fontSize(9).fillColor('#222');
    arText(String(tc[maleKey] || ''), M + halfVW + 4, y + 11, { width: halfVW - 8, align: 'center' });
    arText(String(tc[femaleKey] || ''), M + 4, y + 11, { width: halfVW - 8, align: 'center' });
    y += infoH;
  });

  // Bottom green/red stripe
  fillRect(0, H - 8, W, 8, GREEN);
  fillRect(0, H - 12, W, 4, RED);
  doc.font(AR).fontSize(7).fillColor('#888');
  doc.text('1/3', W / 2 - 10, H - 22, { lineBreak: false });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = 0;

  fillRect(0, 0, W, 8, GREEN);
  fillRect(0, 8, W, 4, RED);
  fillRect(0, 12, W, 36, NAVY);
  doc.font(ARB).fontSize(10).fillColor('#fff');
  arText('بطاقة تقنية للمشروع — تتمة', M, 22, { width: CW, align: 'center' });
  fillRect(0, 48, W, 3, RED);
  y = 62;

  // Project name + location
  const field2 = (label, value) => {
    doc.save().rect(M, y, CW, 22).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    const lw = Math.floor(CW * 0.35);
    fillRect(W - M - lw, y, lw, 22, LIGHT);
    doc.save().moveTo(W - M - lw, y).lineTo(W - M - lw, y + 22).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    doc.font(ARB).fontSize(8.5).fillColor(NAVY);
    arText(label, W - M - lw + 4, y + 7, { width: lw - 8, align: 'right' });
    doc.font(AR).fontSize(8.5).fillColor('#222');
    arText(value, M + 4, y + 7, { width: CW - lw - 8, align: 'right' });
    y += 22;
  };

  field2('اسم المشروع',          project.title || '');
  field2('مكان تنفيذ المشروع',  project.location || '');

  // مرحلة المشروع
  y += 4;
  fillRect(M, y, CW, 16, LIGHT);
  doc.save().rect(M, y, CW, 16).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
  doc.font(ARB).fontSize(9).fillColor(NAVY);
  arText('مرحلة المشروع:', M, y + 4, { width: CW - 4, align: 'right' });
  y += 16;

  const phases = [
    { label: 'فكرة', match: 'PLANNED' },
    { label: 'مشروع في طور التنفيذ', match: 'IN_PROGRESS' },
    { label: 'مشروع قائم', match: 'COMPLETED' },
  ];
  phases.forEach(({ label, match }) => {
    doc.save().rect(M, y, CW, 16).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    const checked = project.status === match;
    const bxX = W - M - 18;
    doc.save().rect(bxX, y + 3, 10, 10).strokeColor(NAVY).lineWidth(0.6).stroke().restore();
    if (checked) { doc.font(ARB).fontSize(10).fillColor(GREEN); doc.text('✓', bxX + 1, y + 2, { lineBreak: false }); }
    doc.font(AR).fontSize(8.5).fillColor('#333');
    arText(label, M, y + 4, { width: CW - 22, align: 'right' });
    y += 16;
  });
  y += 6;

  // Text sections helper
  const textSection = (titleLabel, value, lines = 3) => {
    fillRect(M, y, CW, 16, NAVY);
    doc.font(ARB).fontSize(9).fillColor('#fff');
    arText(titleLabel, M, y + 4, { width: CW - 4, align: 'center' });
    y += 16;
    const sectionH = lines * 18;
    doc.save().rect(M, y, CW, sectionH).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    if (value) {
      doc.font(AR).fontSize(9).fillColor('#222');
      arText(value, M + 6, y + 6, { width: CW - 12, align: 'right' });
    }
    y += sectionH + 6;
  };

  textSection('فكرة المشروع',                   tc.projectIdea      || '', 3);
  textSection('إشكالية وجدوى المشروع',          tc.problemFeasibility || '', 3);
  textSection('جانب الابتكار في المشروع',       tc.innovation        || '', 3);
  textSection('مكونات المشروع',                  tc.components        || '', 3);

  fillRect(0, H - 8, W, 8, GREEN);
  fillRect(0, H - 12, W, 4, RED);
  doc.font(AR).fontSize(7).fillColor('#888');
  doc.text('2/3', W / 2 - 10, H - 22, { lineBreak: false });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = 0;

  fillRect(0, 0, W, 8, GREEN);
  fillRect(0, 8, W, 4, RED);
  fillRect(0, 12, W, 36, NAVY);
  doc.font(ARB).fontSize(10).fillColor('#fff');
  arText('بطاقة تقنية للمشروع — تتمة 2', M, 22, { width: CW, align: 'center' });
  fillRect(0, 48, W, 3, RED);
  y = 62;

  // أهداف + نتائج
  fillRect(M, y, CW, 16, NAVY);
  doc.font(ARB).fontSize(9).fillColor('#fff');
  arText('أهداف المشروع والنتائج المنتظرة منه', M, y + 4, { width: CW - 4, align: 'center' });
  y += 16;
  const goalH = 60;
  doc.save().rect(M, y, CW, goalH).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
  const goalText = tc.objectives || project.generalGoal || '';
  if (goalText) {
    doc.font(AR).fontSize(9).fillColor('#222');
    arText(goalText, M + 6, y + 8, { width: CW - 12, align: 'right' });
  }
  y += goalH + 10;

  // التركيبة المالية
  fillRect(M, y, CW, 16, NAVY);
  doc.font(ARB).fontSize(9).fillColor('#fff');
  arText('التركيبة المالية للمشروع', M, y + 4, { width: CW - 4, align: 'center' });
  y += 16;

  const budget      = project.budget || tc.totalCost || 0;
  const holderPct   = Number(tc.holderPct  ?? 10);
  const indhPct     = Number(tc.indhPct    ?? 90);
  const holderAmt   = Math.round(budget * holderPct / 100);
  const indhAmt     = Math.round(budget * indhPct   / 100);

  const finRows = [
    { label: 'التكلفة الإجمالية (بالدرهم)', value: budget ? `${budget.toLocaleString('ar-MA')} درهم` : '' },
    { label: `مساهمة حامل المشروع ${holderPct}%`, value: holderAmt ? `${holderAmt.toLocaleString('ar-MA')} درهم` : '' },
    { label: `مساهمة المبادرة الوطنية للتنمية البشرية ${indhPct}%`, value: indhAmt ? `${indhAmt.toLocaleString('ar-MA')} درهم` : '' },
  ];

  finRows.forEach(({ label, value }) => {
    doc.save().rect(M, y, CW, 22).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    const lw = Math.floor(CW * 0.50);
    fillRect(W - M - lw, y, lw, 22, LIGHT);
    doc.save().moveTo(W - M - lw, y).lineTo(W - M - lw, y + 22).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    doc.font(ARB).fontSize(8.5).fillColor(NAVY);
    arText(label, W - M - lw + 4, y + 7, { width: lw - 8, align: 'right' });
    doc.font(ARB).fontSize(9).fillColor(GREEN);
    arText(value, M + 4, y + 7, { width: CW - lw - 8, align: 'center' });
    y += 22;
  });

  y += 16;

  // Date field
  const today = new Date().toLocaleDateString('ar-MA');
  doc.font(ARB).fontSize(8.5).fillColor(NAVY);
  arText(`حرر بـ ${org?.cityAr || org?.city || '...'} يوم: ${today}`, M, y, { width: CW, align: 'right' });
  y += 20;
  hline(y);
  y += 10;

  // المرفقات
  fillRect(M, y, CW, 16, LIGHT);
  doc.save().rect(M, y, CW, 16).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
  doc.font(ARB).fontSize(9).fillColor(NAVY);
  arText('المرفقات:', M, y + 4, { width: CW - 4, align: 'right' });
  y += 16;

  const attachments = [
    'طلب خطي لعامل العمالة رئيس اللجنة الإقليمية للتنمية البشرية مع تحديد موضوع الطلب',
    'تصريح الشرف موقع ومصادق عليه بعدم مزاولة أي وظيفة بالقطاع العمومي أو الخاص',
    'الملف القانوني للهيئة صاحبة فكرة المشروع والتي يجب أن تكون في وضعية قانونية',
    'تصريح الشرف موقع ومصادق عليه بعدم استفادة حامل المشروع من أي دعم مالي',
    'بطاقة تقنية لفكرة المشروع مدعومة بأي وثيقة أخرى تعتبر مفيدة',
  ];

  attachments.forEach((att) => {
    doc.save().rect(M, y, CW, 18).strokeColor(BORDER).lineWidth(0.4).stroke().restore();
    doc.font(AR).fontSize(8).fillColor('#333');
    doc.circle(W - M - 12, y + 9, 2).fillColor(NAVY).fill();
    arText(att, M + 4, y + 5, { width: CW - 20, align: 'right' });
    y += 18;
  });

  fillRect(0, H - 8, W, 8, GREEN);
  fillRect(0, H - 12, W, 4, RED);
  doc.font(AR).fontSize(7).fillColor('#888');
  doc.text('3/3', W / 2 - 10, H - 22, { lineBreak: false });

  doc.end();
};

module.exports = { generateTechnicalCardPdf };
