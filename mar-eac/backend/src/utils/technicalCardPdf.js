const PDFDocument    = require('pdfkit');
const path           = require('path');
const fs             = require('fs');
const arabicReshaper = require('arabic-reshaper');

const FONT_DIR = path.join(__dirname, '../assets/fonts');

// ── Font paths ─────────────────────────────────────────────────────────────
const FONTS = {
  bold:    path.join(FONT_DIR, 'Amiri-Bold.ttf'),       // section titles
  regular: path.join(FONT_DIR, 'Amiri-Regular.ttf'),    // labels
  body:    path.join(FONT_DIR, 'Jordan.ttf'),            // body / cell values
  accent:  path.join(FONT_DIR, 'Line.ttf'),             // sub-headers accent
};

// ── Arabic text processor ─────────────────────────────────────────────────
// Handles: Arabic letter shaping + proper RTL word/segment ordering
// Segments are split into Arabic runs vs Latin/numeric runs, then reversed
const ar = (text) => {
  if (!text) return '';
  const input = String(text);

  // Shape Arabic letters so they connect properly
  const shaped = arabicReshaper.convertArabic(input);

  // Split into runs: Arabic vs non-Arabic (numbers, Latin, punctuation)
  const runs = [];
  let buf = '';
  let mode = null; // 'ar' | 'other'

  for (const ch of shaped) {
    const isArChar = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿‌‍]/.test(ch);
    const m = isArChar ? 'ar' : 'other';
    if (m !== mode) {
      if (buf) runs.push({ text: buf, ar: mode === 'ar' });
      buf = ch;
      mode = m;
    } else {
      buf += ch;
    }
  }
  if (buf) runs.push({ text: buf, ar: mode === 'ar' });

  // Reverse the run order for RTL display; keep each run's own content intact
  runs.reverse();
  return runs.map(r => r.text).join('');
};

const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('ar-MA'); } catch { return ''; }
};

// ── PDF generator ─────────────────────────────────────────────────────────
const generateTechnicalCardPdf = (project, org, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `بطاقة تقنية — ${project.title}` } });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="bataqa-taniya-${project.id}.pdf"`);
  doc.pipe(res);

  // Register fonts — fall back to Helvetica if a file is missing
  const reg = (alias, file) => {
    if (fs.existsSync(file)) { doc.registerFont(alias, file); return true; }
    return false;
  };

  const hasBold   = reg('F_BOLD',   FONTS.bold);
  const hasReg    = reg('F_REG',    FONTS.regular);
  const hasBody   = reg('F_BODY',   FONTS.body);
  const hasAccent = reg('F_ACCENT', FONTS.accent);

  const F_BOLD   = hasBold   ? 'F_BOLD'   : 'Helvetica-Bold';
  const F_REG    = hasReg    ? 'F_REG'    : 'Helvetica';
  const F_BODY   = hasBody   ? 'F_BODY'   : (hasReg ? 'F_REG' : 'Helvetica');
  const F_ACCENT = hasAccent ? 'F_ACCENT' : F_BOLD;

  const W = 595, H = 842;
  const ML = 42, MR = 42;
  const CW = W - ML - MR;           // ≈ 511

  // ── Palette ──────────────────────────────────────────────────────────────
  const DARK_GREEN  = '#2e5e2e';
  const MID_GREEN   = '#6aaa6a';
  const LIGHT_GREEN = '#d6edd6';
  const LABEL_BG    = '#f2f2f2';
  const BORDER      = '#444444';
  const TEXT        = '#111111';
  const WHITE       = '#ffffff';

  const tc = (project.technicalCard && typeof project.technicalCard === 'object') ? project.technicalCard : {};

  // ── Low-level helpers ─────────────────────────────────────────────────────

  // Filled + stroked rectangle
  const box = (x, y, w, h, fill, stroke) => {
    doc.save();
    if (fill)  { doc.rect(x, y, w, h).fillColor(fill).fill(); }
    if (stroke){ doc.rect(x, y, w, h).strokeColor(stroke).lineWidth(0.7).stroke(); }
    doc.restore();
  };

  // Arabic text right-aligned inside a bounding box
  // x, y = top-left of the bounding box;  w = width;  vCenter = vertical offset
  const T = (font, size, color, text, x, y, w, vOff = 0, align = 'right') => {
    doc.font(font).fontSize(size).fillColor(color);
    doc.text(ar(text), x + 2, y + vOff, { width: w - 4, align, lineBreak: false });
  };

  // ── Structural row helpers ─────────────────────────────────────────────────

  // Full-width dark green section header
  const sectionRow = (label, y, h = 24) => {
    box(ML, y, CW, h, DARK_GREEN, DARK_GREEN);
    T(F_BOLD, 11, WHITE, label, ML, y, CW, (h - 13) / 2, 'center');
    return y + h;
  };

  // Full-width medium-green sub-header (تقديم الجمعية style)
  const subRow = (label, y, h = 19) => {
    box(ML, y, CW, h, MID_GREEN, BORDER);
    T(F_ACCENT, 10, '#1a2e1a', label, ML, y, CW, (h - 11) / 2, 'center');
    return y + h;
  };

  // 2-column data row: right = shaded label, left = value
  const dataRow = (label, value, y, h = 23) => {
    const LW = Math.round(CW * 0.43);   // label column width
    const VW = CW - LW;                 // value column width

    box(ML, y, CW, h, WHITE, BORDER);
    box(W - MR - LW, y, LW, h, LABEL_BG, null);
    // vertical divider
    doc.save().strokeColor(BORDER).lineWidth(0.7)
       .moveTo(W - MR - LW, y).lineTo(W - MR - LW, y + h).stroke().restore();

    T(F_REG,  8.5, '#333333', label, W - MR - LW, y, LW, (h - 10) / 2, 'right');
    T(F_BODY, 9.5, TEXT,      value || '', ML, y, VW, (h - 11) / 2, 'right');
    return y + h;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // TOP-RIGHT IDENTIFICATION BLOCK
  // ══════════════════════════════════════════════════════════════════════════

  const neighborhood = tc.neighborhood || '';
  const commune      = tc.commune || org?.cityAr || org?.city || '';
  const province     = tc.province || org?.regionAr || org?.region || '';
  const orgNameAr    = org?.nameAr || org?.name || '';

  const INFO_W = 260;
  const INFO_X = W - MR - INFO_W;
  let iy = 34;

  const infoLine = (label, value) => {
    doc.font(F_BOLD).fontSize(9).fillColor(DARK_GREEN);
    doc.text(ar(`${label} : (`), INFO_X, iy, { width: INFO_W - 4, align: 'right', lineBreak: false });
    doc.font(F_BODY).fontSize(9).fillColor(TEXT);
    doc.text(ar(`${value || '...'}`), INFO_X, iy, { width: INFO_W - 70, align: 'right', lineBreak: false });
    doc.font(F_BOLD).fontSize(9).fillColor(DARK_GREEN);
    doc.text(ar(')'), INFO_X, iy, { width: 20, align: 'left', lineBreak: false });
    iy += 15;
  };

  // Simpler single-call approach — renders the whole line at once
  const infoLineFull = (label, value) => {
    const line = `${label} : ( ${value || '...'} )`;
    doc.font(F_BOLD).fontSize(9).fillColor(TEXT);
    doc.text(ar(line), INFO_X, iy, { width: INFO_W, align: 'right', lineBreak: false });
    iy += 15;
  };

  infoLineFull('جمعية', orgNameAr);
  infoLineFull('ب', neighborhood);
  infoLineFull('جماعة', commune);
  infoLineFull('اقليـم', province);

  // ══════════════════════════════════════════════════════════════════════════
  // CENTERED PAGE TITLE
  // ══════════════════════════════════════════════════════════════════════════

  const TITLE_X = ML;
  const TITLE_W = CW - INFO_W - 12;
  const TITLE_Y = 36;
  const TITLE_H = 38;

  box(TITLE_X, TITLE_Y, TITLE_W, TITLE_H, LIGHT_GREEN, DARK_GREEN);
  // Double border effect
  box(TITLE_X + 2, TITLE_Y + 2, TITLE_W - 4, TITLE_H - 4, null, MID_GREEN);

  doc.font(F_BOLD).fontSize(15).fillColor(DARK_GREEN);
  doc.text(ar('بطاقة تقنية للمشروع'), TITLE_X + 4, TITLE_Y + 10, {
    width: TITLE_W - 8, align: 'center', lineBreak: false,
  });

  let y = Math.max(iy, TITLE_Y + TITLE_H) + 10;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — معلومات خاصة بالجمعية
  // ══════════════════════════════════════════════════════════════════════════

  y = sectionRow('معلومات خاصة بالجمعية', y, 24);
  y = subRow('تقديم الجمعية', y, 19);

  const presidentName   = tc.presidentName || '';
  const mandateDuration = org?.mandateDuration ? `${org.mandateDuration} سنوات` : (tc.mandateDuration || '');
  const lastRenewal     = fmtDate(org?.bureauCreationDate) || tc.lastRenewalDate || '';

  [
    ['اسم الجمعية (بالعربية)',          org?.nameAr || ''],
    ['اسم الجمعية (بالفرنسية)',          org?.name   || ''],
    ['تاريخ تأسيس الجمعية',             fmtDate(org?.foundingDate)],
    ['عنوان الجمعية',                   org?.addressAr || org?.address || ''],
    ['اسم رئيس(ة) الجمعية',            presidentName],
    ['مدة صالحية مكتب الجمعية',        mandateDuration],
    ['آخر تاريخ لتجديد مكتب الجمعية', lastRenewal],
  ].forEach(([label, value]) => { y = dataRow(label, value, y, 23); });

  y += 10;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — مكونات المشروع
  // ══════════════════════════════════════════════════════════════════════════

  y = sectionRow('مكونات المشروع :', y, 24);

  const COMP_H = 78;
  box(ML, y, CW, COMP_H, WHITE, BORDER);

  const components = tc.components || '';
  if (components) {
    let ly = y + 8;
    components.split('\n').filter(l => l.trim()).forEach(line => {
      doc.font(F_BODY).fontSize(9.5).fillColor(TEXT);
      doc.text(ar(`- ${line.trim()}`), ML + 8, ly, { width: CW - 16, align: 'right', lineBreak: false });
      ly += 16;
    });
  } else {
    [10, 30, 52].forEach(off => {
      doc.font(F_BODY).fontSize(9).fillColor('#aaa');
      doc.text(ar('-'), ML + 8, y + off, { width: CW - 16, align: 'right', lineBreak: false });
    });
  }

  y += COMP_H + 10;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — مساهمة الشركاء
  // ══════════════════════════════════════════════════════════════════════════

  y = sectionRow('مساهمة الشركاء في المشروع :', y, 24);

  const C0 = Math.round(CW * 0.50);   // الشريك
  const C1 = Math.round(CW * 0.28);   // المساهمة
  const C2 = CW - C0 - C1;            // النسبة
  const cols = [C0, C1, C2];
  const colLabels = ['الشريك', 'المساهمة بالدرهم', 'نسبة المساهمة في المائة'];

  const COL_H = 21;

  // Column header row
  box(ML, y, CW, COL_H, MID_GREEN, BORDER);
  let cx = ML;
  cols.forEach((cw, ci) => {
    if (ci > 0) {
      doc.save().strokeColor(BORDER).lineWidth(0.7)
         .moveTo(cx, y).lineTo(cx, y + COL_H).stroke().restore();
    }
    T(F_BOLD, 8.5, '#1a2e1a', colLabels[ci], cx, y, cw, (COL_H - 10) / 2, 'center');
    cx += cw;
  });
  y += COL_H;

  // Partner rows (4 rows)
  const partners = Array.isArray(tc.partners) ? tc.partners : [];
  for (let i = 0; i < 4; i++) {
    const p = partners[i] || {};
    const ROW_H = 21;
    box(ML, y, CW, ROW_H, WHITE, BORDER);
    cx = ML;
    const vals = [p.name || '-', p.amount || '', p.percentage || ''];
    cols.forEach((cw, ci) => {
      if (ci > 0) {
        doc.save().strokeColor(BORDER).lineWidth(0.7)
           .moveTo(cx, y).lineTo(cx, y + ROW_H).stroke().restore();
      }
      T(F_BODY, 9, TEXT, vals[ci], cx, y, cw, (ROW_H - 11) / 2, ci === 0 ? 'right' : 'center');
      cx += cw;
    });
    y += ROW_H;
  }

  // Total row
  const TOT_H = 21;
  box(ML, y, CW, TOT_H, LIGHT_GREEN, BORDER);
  cx = ML;
  const totAmt = partners.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const totPct = partners.reduce((s, p) => s + (parseFloat(p.percentage) || 0), 0);
  const totVals = [
    '- المجمـوع',
    totAmt ? String(totAmt.toLocaleString('ar-MA')) : '',
    totPct ? `${totPct}%` : '',
  ];
  cols.forEach((cw, ci) => {
    if (ci > 0) {
      doc.save().strokeColor(BORDER).lineWidth(0.7)
         .moveTo(cx, y).lineTo(cx, y + TOT_H).stroke().restore();
    }
    T(F_BOLD, 9, DARK_GREEN, totVals[ci], cx, y, cw, (TOT_H - 11) / 2, ci === 0 ? 'right' : 'center');
    cx += cw;
  });
  y += TOT_H + 10;

  // ══════════════════════════════════════════════════════════════════════════
  // TOTAL COST ROW
  // ══════════════════════════════════════════════════════════════════════════

  const totalCost = tc.totalCost || project.budget || '';
  const COST_H = 27;
  box(ML, y, CW, COST_H, WHITE, BORDER);

  const costDisplay = totalCost
    ? `${Number(totalCost).toLocaleString('ar-MA')} درهم`
    : '..................................................................';

  // Label (bold, dark green)
  doc.font(F_BOLD).fontSize(9.5).fillColor(DARK_GREEN);
  doc.text(ar('التكلفة الإجمالية للمشروع بالدرهم :'), ML + 6, y + 8, {
    width: CW * 0.5, align: 'right', lineBreak: false,
  });
  // Value (body font)
  doc.font(F_BODY).fontSize(9.5).fillColor(TEXT);
  doc.text(ar(costDisplay), ML + 6, y + 8, {
    width: CW - 12, align: 'left', lineBreak: false,
  });
  y += COST_H + 28;

  // ══════════════════════════════════════════════════════════════════════════
  // SIGNATURE
  // ══════════════════════════════════════════════════════════════════════════

  doc.font(F_BOLD).fontSize(10.5).fillColor(DARK_GREEN);
  doc.text(ar('امضـاء : رئيس )ة ( الجمعية'), ML, y, {
    width: CW * 0.45, align: 'right', lineBreak: false,
  });

  doc.end();
};

module.exports = { generateTechnicalCardPdf };
