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
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('ar-MA'); } catch { return ''; }
};

// ── PDF generator — matches the official template exactly ───────────────────

const generateTechnicalCardPdf = (project, org, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `بطاقة تقنية — ${project.title}` } });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="bataqa-taniya-${project.id}.pdf"`);
  doc.pipe(res);

  const fontsOk = fs.existsSync(FONT_AR) && fs.existsSync(FONT_BOLD);
  if (fontsOk) {
    doc.registerFont('AR',  FONT_AR);
    doc.registerFont('ARB', FONT_BOLD);
  }
  const AR  = fontsOk ? 'AR'  : 'Helvetica';
  const ARB = fontsOk ? 'ARB' : 'Helvetica-Bold';

  const W = 595, H = 842;
  const ML = 40, MR = 40;          // left / right margin
  const CW = W - ML - MR;          // 515

  // ── colour palette (matches the Word document style) ────────────────────
  const DARK_GREEN  = '#375e37';    // section header bg — white text
  const MID_GREEN   = '#a8c8a0';    // sub-section / col-header bg — dark text
  const LIGHT_GREEN = '#e8f4e8';    // every-other data row tint (optional)
  const BORDER      = '#555555';
  const TEXT        = '#111111';
  const LABEL_BG    = '#f0f0f0';    // right-side label column bg

  const tc = (project.technicalCard && typeof project.technicalCard === 'object') ? project.technicalCard : {};

  // ── helpers ────────────────────────────────────────────────────────────────

  const rect = (x, y, w, h, fill, stroke) => {
    doc.save();
    if (fill)  doc.fillColor(fill).rect(x, y, w, h).fill();
    if (stroke) doc.strokeColor(stroke).lineWidth(0.7).rect(x, y, w, h).stroke();
    doc.restore();
  };

  // Right-to-left text at position
  const rtl = (text, x, y, opts = {}) => {
    doc.text(ar(text), x, y, { lineBreak: false, ...opts });
  };

  // Draw a 2-column data row: right col = label (shaded), left col = value
  const dataRow = (label, value, y, rowH = 22) => {
    const labelW = Math.round(CW * 0.42);
    const valueW = CW - labelW;

    // outer border
    rect(ML, y, CW, rowH, null, BORDER);
    // label column (right side)
    rect(W - MR - labelW, y, labelW, rowH, LABEL_BG, null);
    // divider between cols
    doc.save().strokeColor(BORDER).lineWidth(0.7)
       .moveTo(W - MR - labelW, y).lineTo(W - MR - labelW, y + rowH)
       .stroke().restore();

    doc.font(ARB).fontSize(8.5).fillColor('#333');
    rtl(label, W - MR - labelW + 4, y + (rowH - 10) / 2, { width: labelW - 8, align: 'right' });

    doc.font(AR).fontSize(9).fillColor(TEXT);
    rtl(value || '', ML + 4, y + (rowH - 10) / 2, { width: valueW - 8, align: 'right' });
    return y + rowH;
  };

  // Section header row (full width, dark green)
  const sectionHeader = (label, y, h = 22) => {
    rect(ML, y, CW, h, DARK_GREEN, DARK_GREEN);
    doc.font(ARB).fontSize(10).fillColor('#ffffff');
    rtl(label, ML + 4, y + (h - 12) / 2, { width: CW - 8, align: 'right' });
    return y + h;
  };

  // Sub-section header row (full width, mid green)
  const subHeader = (label, y, h = 18) => {
    rect(ML, y, CW, h, MID_GREEN, BORDER);
    doc.font(ARB).fontSize(9).fillColor('#1a3a1a');
    rtl(label, ML + 4, y + (h - 10) / 2, { width: CW - 8, align: 'right' });
    return y + h;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // TOP-RIGHT IDENTIFICATION BLOCK
  // ════════════════════════════════════════════════════════════════════════════

  const neighborhood = tc.neighborhood || '';
  const commune      = tc.commune || org?.cityAr || org?.city || '';
  const province     = tc.province || org?.regionAr || org?.region || '';
  const orgNameAr    = org?.nameAr || org?.name || '';

  const infoLines = [
    { label: 'جمعية', value: orgNameAr },
    { label: 'ب',     value: neighborhood },
    { label: 'جماعة', value: commune },
    { label: 'اقليـم', value: province },
  ];

  let iy = 36;
  const infoBlockW = 260;
  infoLines.forEach(({ label, value }) => {
    doc.font(ARB).fontSize(9).fillColor(TEXT);
    rtl(`${label} : (${value || '...'})`, W - MR - infoBlockW, iy, { width: infoBlockW, align: 'right' });
    iy += 15;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CENTER TITLE
  // ════════════════════════════════════════════════════════════════════════════

  const titleY = 40;
  const titleH = 34;
  rect(ML, titleY, CW - infoBlockW - 10, titleH, null, BORDER);
  doc.font(ARB).fontSize(16).fillColor(DARK_GREEN);
  rtl('بطاقة تقنية للمشروع', ML + 4, titleY + 8, { width: CW - infoBlockW - 18, align: 'center' });

  let y = Math.max(iy, titleY + titleH) + 12;

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 1 — معلومات خاصة بالجمعية
  // ════════════════════════════════════════════════════════════════════════════

  y = sectionHeader('معلومات خاصة بالجمعية', y, 22);
  y = subHeader('تقديم الجمعية', y, 18);

  const presidentName    = tc.presidentName || '';
  const mandateDuration  = org?.mandateDuration ? `${org.mandateDuration} سنوات` : (tc.mandateDuration || '');
  const lastRenewal      = fmtDate(org?.bureauCreationDate) || tc.lastRenewalDate || '';

  const rows1 = [
    { label: 'اسم الجمعية (بالعربية)',            value: org?.nameAr || '' },
    { label: 'اسم الجمعية (بالفرنسية)',            value: org?.name || '' },
    { label: 'تاريخ تأسيس الجمعية',               value: fmtDate(org?.foundingDate) },
    { label: 'عنوان الجمعية',                      value: org?.addressAr || org?.address || '' },
    { label: 'اسم رئيس(ة) الجمعية',               value: presidentName },
    { label: 'مدة صالحية مكتب الجمعية',           value: mandateDuration },
    { label: 'آخر تاريخ لتجديد مكتب الجمعية',    value: lastRenewal },
  ];

  rows1.forEach(({ label, value }) => {
    y = dataRow(label, value, y, 22);
  });

  y += 8;

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 2 — مكونات المشروع
  // ════════════════════════════════════════════════════════════════════════════

  y = sectionHeader('مكونات المشروع :', y, 22);

  const components = tc.components || '';
  const compH = 72;
  rect(ML, y, CW, compH, '#ffffff', BORDER);

  if (components) {
    const lines = components.split('\n').filter(l => l.trim());
    let ly = y + 8;
    lines.forEach(line => {
      doc.font(AR).fontSize(9).fillColor(TEXT);
      rtl(`- ${line.trim()}`, ML + 8, ly, { width: CW - 16, align: 'right' });
      ly += 14;
    });
  } else {
    // Empty bullet lines placeholder
    [16, 34, 52].forEach(off => {
      doc.font(AR).fontSize(9).fillColor('#999');
      rtl('-', ML + 8, y + off, { width: CW - 16, align: 'right' });
    });
  }
  y += compH + 8;

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 3 — مساهمة الشركاء في المشروع
  // ════════════════════════════════════════════════════════════════════════════

  y = sectionHeader('مساهمة الشركاء في المشروع :', y, 22);

  // Column widths
  const partnerCols = [
    { label: 'الشريك',                       w: Math.round(CW * 0.50) },
    { label: 'المساهمة بالدرهم',              w: Math.round(CW * 0.28) },
    { label: 'نسبة المساهمة في المائة',       w: CW - Math.round(CW * 0.50) - Math.round(CW * 0.28) },
  ];
  const colHeaderH = 20;

  // Column headers row (mid green)
  rect(ML, y, CW, colHeaderH, MID_GREEN, BORDER);
  let colX = ML;
  partnerCols.forEach((col, i) => {
    if (i > 0) {
      doc.save().strokeColor(BORDER).lineWidth(0.7)
         .moveTo(colX, y).lineTo(colX, y + colHeaderH).stroke().restore();
    }
    doc.font(ARB).fontSize(8.5).fillColor('#1a3a1a');
    rtl(col.label, colX + 2, y + 5, { width: col.w - 4, align: 'center' });
    colX += col.w;
  });
  y += colHeaderH;

  // Partner data rows
  const partners = Array.isArray(tc.partners) ? tc.partners : [];
  const NUM_ROWS = 4;
  const partnerRowH = 20;

  for (let i = 0; i < NUM_ROWS; i++) {
    const p = partners[i] || {};
    const isLast = i === NUM_ROWS - 1;
    const rowBg = isLast ? null : null;

    rect(ML, y, CW, partnerRowH, rowBg, BORDER);
    colX = ML;

    const vals = [p.name || '-', p.amount ? String(p.amount) : '', p.percentage ? String(p.percentage) : ''];
    partnerCols.forEach((col, ci) => {
      if (ci > 0) {
        doc.save().strokeColor(BORDER).lineWidth(0.7)
           .moveTo(colX, y).lineTo(colX, y + partnerRowH).stroke().restore();
      }
      doc.font(AR).fontSize(9).fillColor(TEXT);
      rtl(vals[ci], colX + 4, y + 5, { width: col.w - 8, align: ci === 0 ? 'right' : 'center' });
      colX += col.w;
    });
    y += partnerRowH;
  }

  // Total row (mid green)
  rect(ML, y, CW, partnerRowH, MID_GREEN, BORDER);
  colX = ML;
  partnerCols.forEach((col, ci) => {
    if (ci > 0) {
      doc.save().strokeColor(BORDER).lineWidth(0.7)
         .moveTo(colX, y).lineTo(colX, y + partnerRowH).stroke().restore();
    }
    colX += col.w;
  });
  doc.font(ARB).fontSize(9).fillColor('#1a3a1a');
  rtl('- المجمـــوع', ML + 4, y + 5, { width: partnerCols[0].w - 8, align: 'right' });

  const totalAmt = partners.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const totalPct = partners.reduce((s, p) => s + (parseFloat(p.percentage) || 0), 0);
  doc.font(ARB).fontSize(9).fillColor('#1a3a1a');
  if (totalAmt) rtl(String(totalAmt), ML + partnerCols[0].w + 4, y + 5, { width: partnerCols[1].w - 8, align: 'center' });
  if (totalPct) rtl(`${totalPct}%`, ML + partnerCols[0].w + partnerCols[1].w + 4, y + 5, { width: partnerCols[2].w - 8, align: 'center' });
  y += partnerRowH + 8;

  // ════════════════════════════════════════════════════════════════════════════
  // TOTAL COST ROW
  // ════════════════════════════════════════════════════════════════════════════

  const totalCost = tc.totalCost || project.budget || '';
  const totalCostH = 26;
  rect(ML, y, CW, totalCostH, '#ffffff', BORDER);
  doc.font(ARB).fontSize(9.5).fillColor(DARK_GREEN);
  const costLabel = ar('التكلفة الإجمالية للمشروع بالدرهم :');
  const costValue = totalCost ? ar(`${Number(totalCost).toLocaleString('ar-MA')} درهم  ....................................`) : ar('......................................................................');
  rtl(`${costLabel}   ${costValue}`, ML + 6, y + 7, { width: CW - 12, align: 'right' });
  y += totalCostH + 24;

  // ════════════════════════════════════════════════════════════════════════════
  // SIGNATURE
  // ════════════════════════════════════════════════════════════════════════════

  doc.font(ARB).fontSize(10).fillColor(TEXT);
  rtl('امضـاء : رئيس )ة ( الجمعية', ML, y, { width: CW * 0.45, align: 'right' });

  doc.end();
};

module.exports = { generateTechnicalCardPdf };
