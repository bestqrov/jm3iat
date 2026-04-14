const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const prisma = require('../config/database');
const arabicReshaper = require('arabic-reshaper');

// Fix Arabic RTL: reshape ligatures + reverse word order for PDFKit
const ar = (text) => {
  if (!text) return '';
  const shaped = arabicReshaper.convertArabic(String(text));
  return shaped.split(' ').reverse().join(' ');
};

const FONT_DIR  = path.join(__dirname, '../assets/fonts');
const FONT_AR   = path.join(FONT_DIR, 'Amiri-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'Amiri-Bold.ttf');
const FONT_TITLE = path.join(FONT_DIR, 'Line.ttf');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('./uploads');

// ── Palette ─────────────────────────────────────────────────────────────────
const C = {
  blueDark:  '#0d3d6b',
  blue:      '#1565c0',
  blueLight: '#e3f2fd',
  blueMid:   '#bbdefb',
  accent:    '#0288d1',
  red:       '#c62828',
  redBg:     '#ffebee',
  text:      '#1a237e',
  textDark:  '#0d1b3e',
  gray:      '#546e7a',
  border:    '#b0bec5',
  divider:   '#e0e7ef',
  white:     '#ffffff',
  green:     '#2e7d32',
  greenBg:   '#e8f5e9',
  orangeBg:  '#fff3e0',
  orange:    '#e65100',
};

const fmt2 = (n) => (Number(n) || 0).toFixed(2);
const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

// ── Draw helpers ─────────────────────────────────────────────────────────────
const fillRect = (doc, x, y, w, h, fill, stroke, lw = 0.5) => {
  doc.save();
  if (fill) doc.rect(x, y, w, h).fill(fill);
  if (stroke) { doc.rect(x, y, w, h).lineWidth(lw).stroke(stroke); }
  doc.restore();
};

const arText = (doc, text, x, y, w, opts = {}) => {
  doc.text(ar(String(text)), x, y, { width: w, align: opts.align || 'right', lineBreak: false, ...opts });
};

const centerText = (doc, text, x, y, w) => {
  doc.text(String(text), x, y, { width: w, align: 'center', lineBreak: false });
};

const centerAr = (doc, text, x, y, w) => {
  doc.text(ar(String(text)), x, y, { width: w, align: 'center', lineBreak: false });
};

const hLine = (doc, x1, x2, y, color = C.border, lw = 0.4) => {
  doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(lw).stroke(color).restore();
};
const vLine = (doc, x, y1, y2, color = C.border, lw = 0.4) => {
  doc.save().moveTo(x, y1).lineTo(x, y2).lineWidth(lw).stroke(color).restore();
};

// ── Main generator ────────────────────────────────────────────────────────────
const generateWaterBillPDF = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const orgId = req.organization.id;

    const invoice = await prisma.waterInvoice.findFirst({
      where: { id: invoiceId, installation: { organizationId: orgId } },
      include: {
        reading:      true,
        installation: true,
        payment:      true,
      },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });

    // Previous unpaid debt for same installation (excluding current invoice)
    const prevAgg = await prisma.waterInvoice.aggregate({
      where: { installationId: invoice.installationId, isPaid: false, id: { not: invoiceId } },
      _sum: { amount: true },
    });
    const previousDebt = prevAgg._sum.amount || 0;
    const total = invoice.amount + previousDebt;

    // ── PDF setup ──────────────────────────────────────────────────────────
    const doc = new PDFDocument({
      size: 'A4', margin: 0,
      info: { Title: 'فاتورة الماء', Author: org?.name || '' },
    });
    doc.registerFont('AR',      FONT_AR);
    doc.registerFont('AR-Bold', FONT_BOLD);
    doc.registerFont('Title',   FONT_TITLE);

    const fname = `facture-eau-${invoice.installation.meterNumber}-${invoice.reading?.month || ''}-${invoice.reading?.year || ''}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fname}"`);
    doc.pipe(res);

    const W = 595, H = 842;
    const M = 32;           // side margin
    const CW = W - 2 * M;  // content width
    let y = 0;

    // ═══════════════════════════════════════════════════════════════════════
    // 1. HEADER BAND
    // ═══════════════════════════════════════════════════════════════════════
    const headerH = 82;
    fillRect(doc, 0, 0, W, headerH, C.blueDark);

    // Decorative side strips
    fillRect(doc, 0, 0, 6, headerH, C.accent);
    fillRect(doc, W - 6, 0, 6, headerH, C.accent);

    // Logo
    if (org?.logo) {
      // org.logo is stored as "/uploads/filename.ext" — resolve to filesystem path
      const logoFile = path.basename(org.logo);
      const logoPaths = [
        path.join(UPLOAD_DIR, logoFile),
        path.join(process.cwd(), 'uploads', logoFile),
        path.join(__dirname, '../../uploads', logoFile),
      ];
      const lp = logoPaths.find(p => fs.existsSync(p));
      if (lp) {
        try { doc.image(lp, M + 4, 11, { fit: [58, 58] }); } catch (_) {}
      }
    }

    // Org name
    const orgName = org?.nameAr || org?.name || '';
    doc.font('AR-Bold').fontSize(17).fillColor(C.white);
    centerAr(doc, orgName, M + 65, 16, CW - 70);

    const city = org?.cityAr || org?.city || '';
    if (city) {
      doc.font('AR').fontSize(10).fillColor(C.blueMid);
      centerAr(doc, city, M + 65, 40, CW - 70);
    }

    fillRect(doc, 0, headerH - 3, W, 3, C.accent);
    y = headerH;

    // ═══════════════════════════════════════════════════════════════════════
    // 2. TITLE ROW  — فاتورة الماء
    // ═══════════════════════════════════════════════════════════════════════
    y += 10;

    const diam = (cx, cy, r, color) => {
      doc.save().polygon([cx - r, cy], [cx, cy - r], [cx + r, cy], [cx, cy + r]).fill(color).restore();
    };
    diam(M + 14, y + 12, 8, C.blue);

    doc.font('Title').fontSize(24).fillColor(C.blue);
    centerAr(doc, 'فاتورة الماء', M, y + 2, CW);

    diam(W - M - 14, y + 12, 8, C.blue);

    y += 30;
    hLine(doc, M, W - M, y, C.blue, 1);
    y += 10;

    // ═══════════════════════════════════════════════════════════════════════
    // 3. CLIENT INFO SECTION
    // ═══════════════════════════════════════════════════════════════════════
    const infoH   = 72;
    const periodW = 105;
    const labelW  = 120;
    const valW    = CW - periodW - labelW - 4;

    // Period box (leftmost)
    fillRect(doc, M, y, periodW, infoH, C.white, C.border, 0.6);
    fillRect(doc, M, y, periodW, 22, C.blueLight, C.border, 0.5);
    doc.font('AR-Bold').fontSize(10).fillColor(C.text);
    centerAr(doc, 'فترة الاستهلاك', M, y + 6, periodW);

    const reading = invoice.reading;
    let fromDate = '—', toDate = '—';
    if (reading) {
      const lastDay = new Date(reading.year, reading.month, 0).getDate();
      fromDate = `01/${String(reading.month).padStart(2, '0')}/${reading.year}`;
      toDate   = `${lastDay}/${String(reading.month).padStart(2, '0')}/${reading.year}`;
    }
    const rowY1 = y + 28, rowY2 = y + 48;
    doc.font('AR').fontSize(9).fillColor(C.textDark);
    arText(doc, `${fromDate}  : من`, M + 3, rowY1, periodW - 5, { align: 'right' });
    arText(doc, `${toDate}  : الى`, M + 3, rowY2, periodW - 5, { align: 'right' });

    // Values column (middle)
    const valX = M + periodW + 4;
    fillRect(doc, valX, y, valW, infoH, C.white, C.border, 0.4);

    const rH = infoH / 3;
    doc.font('AR').fontSize(11).fillColor(C.textDark);
    centerAr(doc, invoice.installation.householdName || '—', valX, y + rH * 0 + 8, valW);
    doc.font('AR').fontSize(11);
    centerText(doc, invoice.installation.meterNumber || '—', valX, y + rH * 1 + 8, valW);
    doc.font('AR').fontSize(10);
    centerText(doc, fmtDate(reading?.readingDate || invoice.createdAt), valX, y + rH * 2 + 8, valW);

    hLine(doc, valX, valX + valW, y + rH,     C.divider, 0.5);
    hLine(doc, valX, valX + valW, y + rH * 2, C.divider, 0.5);

    // Labels column (rightmost)
    const lbX = valX + valW + 2;
    fillRect(doc, lbX, y, labelW, infoH, C.blueLight, C.border, 0.4);
    doc.font('AR-Bold').fontSize(10).fillColor(C.blue);
    centerAr(doc, 'الاسم الكامل', lbX, y + rH * 0 + 8, labelW - 6);
    centerAr(doc, 'رقم العداد',   lbX, y + rH * 1 + 8, labelW - 6);
    centerAr(doc, 'التاريخ',      lbX, y + rH * 2 + 8, labelW - 6);
    hLine(doc, lbX, lbX + labelW, y + rH,     C.blueMid, 0.5);
    hLine(doc, lbX, lbX + labelW, y + rH * 2, C.blueMid, 0.5);

    y += infoH + 14;

    // ═══════════════════════════════════════════════════════════════════════
    // 4. READINGS TABLE
    // ═══════════════════════════════════════════════════════════════════════
    const tblHdr = 24, tblRow = 32;
    const cols3 = ['الفرق', 'الدليل الحالي', 'الدليل السابق'];
    const vals3 = [
      `${fmt2(reading?.consumption)} م³`,
      fmt2(reading?.currentReading),
      fmt2(reading?.previousReading),
    ];
    const colW3 = CW / 3;

    fillRect(doc, M, y, CW, tblHdr, C.blue, C.blue);
    doc.font('AR-Bold').fontSize(11).fillColor(C.white);
    cols3.forEach((h, i) => {
      centerAr(doc, h, M + i * colW3, y + 7, colW3);
      if (i > 0) vLine(doc, M + i * colW3, y, y + tblHdr, C.accent, 0.5);
    });
    y += tblHdr;

    fillRect(doc, M, y, CW, tblRow, C.white, C.border, 0.5);
    doc.font('AR-Bold').fontSize(14).fillColor(C.textDark);
    vals3.forEach((v, i) => {
      centerText(doc, v, M + i * colW3, y + 9, colW3);
      if (i > 0) vLine(doc, M + i * colW3, y, y + tblRow, C.divider, 0.5);
    });
    y += tblRow + 14;

    // ═══════════════════════════════════════════════════════════════════════
    // 5. PRICING SECTION
    // ═══════════════════════════════════════════════════════════════════════
    const pricH  = 72;
    const taxBxW = CW * 0.38;
    const unitBxW = CW - taxBxW - 5;
    const unitBxX = M + taxBxW + 5;
    const pricePerUnit = invoice.installation.pricePerUnit || 3;
    const varAmount    = pricePerUnit * (reading?.consumption || 0);
    const fixedTax     = Math.max(0, invoice.amount - varAmount);

    // ── RIGHT BOX: ثمن الوحدة (price details) ──────────────────────────────
    fillRect(doc, unitBxX, y, unitBxW, pricH, C.white, C.border, 0.5);
    fillRect(doc, unitBxX, y, unitBxW, 22, C.blueLight, C.border, 0.5);
    doc.font('AR-Bold').fontSize(10).fillColor(C.text);
    centerAr(doc, 'ثمن الوحدة (بالدرهم)', unitBxX, y + 6, unitBxW - 4);

    // Two columns inside the right box
    const halfUnit = unitBxW / 2;
    vLine(doc, unitBxX + halfUnit, y + 22, y + pricH, C.border, 0.5);

    // Sub-headers
    fillRect(doc, unitBxX,           y + 22, halfUnit, 18, C.divider, null);
    fillRect(doc, unitBxX + halfUnit, y + 22, halfUnit, 18, C.divider, null);
    doc.font('AR-Bold').fontSize(8).fillColor(C.gray);
    centerAr(doc, 'الرسوم الثابتة (درهم)', unitBxX,            y + 27, halfUnit);
    centerAr(doc, 'سعر م³ (درهم)',          unitBxX + halfUnit, y + 27, halfUnit);

    // Values
    doc.font('AR-Bold').fontSize(18).fillColor(C.textDark);
    centerText(doc, fixedTax.toFixed(2),    unitBxX,            y + 44, halfUnit);
    centerText(doc, pricePerUnit.toFixed(2), unitBxX + halfUnit, y + 44, halfUnit);

    // ── LEFT BOX: TAXE (label + value rows) ─────────────────────────────────
    fillRect(doc, M, y, taxBxW, pricH, C.white, C.border, 0.5);
    fillRect(doc, M, y, taxBxW, 22, C.blueLight, C.border, 0.5);
    doc.font('AR-Bold').fontSize(10).fillColor(C.text);
    centerText(doc, 'TAXE', M, y + 6, taxBxW);

    // Row heights inside TAXE box
    const taxBodyH = pricH - 22;
    const taxRowH  = taxBodyH / 2;
    const valColW  = taxBxW * 0.38;
    const lblColW  = taxBxW - valColW;

    hLine(doc, M, M + taxBxW, y + 22 + taxRowH, C.divider, 0.5);
    vLine(doc, M + lblColW, y + 22, y + pricH, C.divider, 0.5);

    // Row 1: عدد الأشهر | 1
    const tr1y = y + 22 + (taxRowH / 2) - 6;
    doc.font('AR-Bold').fontSize(8).fillColor(C.gray);
    centerAr(doc, 'عدد الأشهر', M, tr1y, lblColW);
    doc.font('AR-Bold').fontSize(14).fillColor(C.textDark);
    centerText(doc, '1', M + lblColW, tr1y - 1, valColW);

    // Row 2: المبلغ | 0.00
    const tr2y = y + 22 + taxRowH + (taxRowH / 2) - 6;
    doc.font('AR-Bold').fontSize(8).fillColor(C.gray);
    centerAr(doc, 'المبلغ (درهم)', M, tr2y, lblColW);
    doc.font('AR-Bold').fontSize(12).fillColor(C.blue);
    centerText(doc, fixedTax.toFixed(2), M + lblColW, tr2y, valColW);

    y += pricH + 16;

    // ═══════════════════════════════════════════════════════════════════════
    // 6. BOTTOM SECTION — Notes | Amounts
    // ═══════════════════════════════════════════════════════════════════════
    const botH   = 95;
    const notesW = CW * 0.44;
    const amtW   = CW - notesW - 5;
    const amtX   = M + notesW + 5;
    const amtRowH = botH / 3;

    // Notes box
    fillRect(doc, M, y, notesW, botH, C.white, C.border, 0.5);
    fillRect(doc, M, y, notesW, 22, C.blueLight, C.border, 0.5);
    doc.font('AR-Bold').fontSize(10).fillColor(C.text);
    centerAr(doc, 'ملاحظات', M, y + 6, notesW - 4);
    if (reading?.notes) {
      doc.font('AR').fontSize(9).fillColor(C.gray);
      arText(doc, reading.notes, M + 5, y + 27, notesW - 10);
    }

    // Amounts box
    fillRect(doc, amtX, y, amtW, botH, C.white, C.border, 0.5);
    hLine(doc, amtX, amtX + amtW, y + amtRowH,     C.divider, 0.5);
    hLine(doc, amtX, amtX + amtW, y + amtRowH * 2, C.divider, 0.5);

    const lblX = amtX + 6;
    const lblW = amtW - 12;

    // Row 1 — الواجب أداؤه
    doc.font('AR-Bold').fontSize(10).fillColor(C.textDark);
    centerAr(doc, `${fmt2(invoice.amount)} درهم  :  الواجب أداؤه`, amtX, y + (amtRowH / 2) - 7, amtW);

    // Row 2 — الدين السابق
    const r2y = y + amtRowH;
    doc.font('AR').fontSize(10).fillColor(C.gray);
    centerAr(doc, `${fmt2(previousDebt)} درهم  :  الدين السابق`, amtX, r2y + (amtRowH / 2) - 7, amtW);

    // Row 3 — المجموع
    const r3y = y + amtRowH * 2;
    fillRect(doc, amtX, r3y, amtW, amtRowH, C.redBg, null);
    doc.font('AR-Bold').fontSize(12).fillColor(C.red);
    centerAr(doc, `${fmt2(total)} درهم  :  المجموع`, amtX, r3y + (amtRowH / 2) - 7, amtW);

    y += botH + 18;

    // ═══════════════════════════════════════════════════════════════════════
    // 7. PAYMENT STATUS BADGE
    // ═══════════════════════════════════════════════════════════════════════
    const badgeH = 32;
    if (invoice.isPaid) {
      fillRect(doc, M, y, CW, badgeH, C.greenBg, C.green, 0.7);
      doc.font('AR-Bold').fontSize(13).fillColor(C.green);
      centerAr(doc, `${fmtDate(invoice.paidAt)}  —  مدفوعة  ✓`, M, y + 9, CW);
    } else {
      fillRect(doc, M, y, CW, badgeH, C.orangeBg, C.orange, 0.7);
      doc.font('AR-Bold').fontSize(13).fillColor(C.orange);
      centerAr(doc, `${fmtDate(invoice.dueDate)}  :الاستحقاق  —  غير مدفوعة  ⚠`, M, y + 9, CW);
    }

    y += badgeH + 20;

    // ═══════════════════════════════════════════════════════════════════════
    // 8. FOOTER
    // ═══════════════════════════════════════════════════════════════════════
    hLine(doc, M, W - M, H - 38, C.blue, 0.7);
    doc.font('AR').fontSize(8).fillColor(C.gray);
    centerAr(doc, orgName, M, H - 28, CW);
    doc.font('AR').fontSize(7).fillColor(C.border);
    const monthLabel = ar(MONTHS_AR[(reading?.month || 1) - 1]);
    centerText(doc, `N° compteur: ${invoice.installation.meterNumber}  |  ${monthLabel} ${reading?.year || ''}`, M, H - 18, CW);

    doc.end();
  } catch (err) {
    console.error('Water bill PDF error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' });
  }
};

module.exports = { generateWaterBillPDF };
