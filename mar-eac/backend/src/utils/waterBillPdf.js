const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const prisma = require('../config/database');

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
  doc.text(String(text), x, y, { width: w, align: opts.align || 'right', lineBreak: false, ...opts });
};

const centerText = (doc, text, x, y, w) => {
  doc.text(String(text), x, y, { width: w, align: 'center', lineBreak: false });
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
    let logoX = M + 4;
    if (org?.logo) {
      const lp = path.join(UPLOAD_DIR, path.basename(org.logo));
      if (fs.existsSync(lp)) {
        doc.image(lp, logoX, 11, { fit: [58, 58] });
      }
    }

    // Org name (Arabic, centered in remaining space)
    const orgName = org?.nameAr || org?.name || '';
    doc.font('AR-Bold').fontSize(17).fillColor(C.white);
    arText(doc, orgName, M + 65, 16, CW - 70, { align: 'center' });

    // Subtle tagline or city
    const city = org?.cityAr || org?.city || '';
    if (city) {
      doc.font('AR').fontSize(10).fillColor(C.blueMid);
      arText(doc, city, M + 65, 40, CW - 70, { align: 'center' });
    }

    // Thin gold separator at bottom of header
    fillRect(doc, 0, headerH - 3, W, 3, C.accent);
    y = headerH;

    // ═══════════════════════════════════════════════════════════════════════
    // 2. TITLE ROW  — فاتورة الماء
    // ═══════════════════════════════════════════════════════════════════════
    y += 10;

    // Diamond left
    const diam = (cx, cy, r, color) => {
      doc.save().polygon([cx - r, cy], [cx, cy - r], [cx + r, cy], [cx, cy + r]).fill(color).restore();
    };
    diam(doc, M + 14, y + 12, 8, C.blue);

    doc.font('Title').fontSize(24).fillColor(C.blue);
    centerText(doc, 'فاتورة الماء', M, y + 2, CW);

    // Diamond right
    diam(doc, W - M - 14, y + 12, 8, C.blue);

    y += 30;

    // Thin blue rule
    hLine(doc, M, W - M, y, C.blue, 1);
    y += 10;

    // ═══════════════════════════════════════════════════════════════════════
    // 3. CLIENT INFO SECTION
    // ═══════════════════════════════════════════════════════════════════════
    const infoH   = 72;
    const periodW = 105; // left column: period box
    const labelW  = 120; // right column: labels
    const valW    = CW - periodW - labelW - 4;

    // Period box (leftmost)
    fillRect(doc, M, y, periodW, infoH, C.white, C.border, 0.6);
    fillRect(doc, M, y, periodW, 22, C.blueLight, C.border, 0.5);
    doc.font('AR-Bold').fontSize(10).fillColor(C.text);
    arText(doc, 'فترة الاستهلاك', M, y + 6, periodW, { align: 'center' });

    const reading = invoice.reading;
    let fromDate = '—', toDate = '—';
    if (reading) {
      const lastDay = new Date(reading.year, reading.month, 0).getDate();
      fromDate = `01/${String(reading.month).padStart(2, '0')}/${reading.year}`;
      toDate   = `${lastDay}/${String(reading.month).padStart(2, '0')}/${reading.year}`;
    }
    const rowY1 = y + 28, rowY2 = y + 48;
    doc.font('AR').fontSize(9).fillColor(C.textDark);
    // "من :" label right-aligned, value left-aligned inside box
    arText(doc, `من :  ${fromDate}`, M + 3, rowY1, periodW - 5, { align: 'right' });
    arText(doc, `الى :  ${toDate}`,   M + 3, rowY2, periodW - 5, { align: 'right' });

    // Values column (middle)
    const valX = M + periodW + 4;
    fillRect(doc, valX, y, valW, infoH, C.white, C.border, 0.4);

    const rH = infoH / 3;
    doc.font('AR').fontSize(11).fillColor(C.textDark);
    centerText(doc, invoice.installation.householdName || '—', valX, y + rH * 0 + 8, valW);
    doc.font('AR').fontSize(11);
    centerText(doc, invoice.installation.meterNumber || '—', valX, y + rH * 1 + 8, valW);
    doc.font('AR').fontSize(10);
    centerText(doc, fmtDate(reading?.readingDate || invoice.createdAt), valX, y + rH * 2 + 8, valW);

    // Dividers inside value column
    hLine(doc, valX, valX + valW, y + rH,     C.divider, 0.5);
    hLine(doc, valX, valX + valW, y + rH * 2, C.divider, 0.5);

    // Labels column (rightmost)
    const lbX = valX + valW + 2;
    fillRect(doc, lbX, y, labelW, infoH, C.blueLight, C.border, 0.4);
    doc.font('AR-Bold').fontSize(10).fillColor(C.blue);
    arText(doc, 'الاسم الكامل', lbX, y + rH * 0 + 8, labelW - 6);
    arText(doc, 'رقم العداد',   lbX, y + rH * 1 + 8, labelW - 6);
    arText(doc, 'التاريخ',      lbX, y + rH * 2 + 8, labelW - 6);
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

    // Header row
    fillRect(doc, M, y, CW, tblHdr, C.blue, C.blue);
    doc.font('AR-Bold').fontSize(11).fillColor(C.white);
    cols3.forEach((h, i) => {
      centerText(doc, h, M + i * colW3, y + 7, colW3);
      if (i > 0) vLine(doc, M + i * colW3, y, y + tblHdr, C.accent, 0.5);
    });
    y += tblHdr;

    // Data row
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
    // Estimate fixed monthly tax as total - (pricePerUnit × consumption), floored at 0
    const varAmount    = pricePerUnit * (reading?.consumption || 0);
    const fixedTax     = Math.max(0, invoice.amount - varAmount);

    // ─ Right: ثمن الوحدة ─
    fillRect(doc, unitBxX, y, unitBxW, pricH, C.white, C.border, 0.5);
    fillRect(doc, unitBxX, y, unitBxW, 22, C.blueLight, C.border, 0.5);
    doc.font('AR-Bold').fontSize(10).fillColor(C.text);
    arText(doc, 'ثمن الوحدة (بالدرهم)', unitBxX, y + 6, unitBxW - 4, { align: 'center' });

    const halfUnit = unitBxW / 2;
    // Sub-headers
    fillRect(doc, unitBxX,           y + 22, halfUnit, 22, C.divider, C.border, 0.4);
    fillRect(doc, unitBxX + halfUnit, y + 22, halfUnit, 22, C.divider, C.border, 0.4);
    doc.font('AR').fontSize(9).fillColor(C.gray);
    centerText(doc, 'Taxe (للشهر)', unitBxX,            y + 29, halfUnit);
    centerText(doc, 'الطن / م³',    unitBxX + halfUnit, y + 29, halfUnit);

    // Values
    fillRect(doc, unitBxX,           y + 44, halfUnit, pricH - 44, C.white, C.border, 0.4);
    fillRect(doc, unitBxX + halfUnit, y + 44, halfUnit, pricH - 44, C.white, C.border, 0.4);
    doc.font('AR-Bold').fontSize(14).fillColor(C.textDark);
    centerText(doc, fixedTax.toFixed(2),    unitBxX,            y + 51, halfUnit);
    centerText(doc, pricePerUnit.toFixed(2), unitBxX + halfUnit, y + 51, halfUnit);

    // ─ Left: TAXE summary ─
    fillRect(doc, M, y, taxBxW, pricH, C.white, C.border, 0.5);
    fillRect(doc, M, y, taxBxW, 22, C.blueLight, C.border, 0.5);
    doc.font('AR-Bold').fontSize(10).fillColor(C.text);
    centerText(doc, 'TAXE', M, y + 6, taxBxW);

    const taxRowH = (pricH - 22) / 2;
    hLine(doc, M, M + taxBxW, y + 22 + taxRowH, C.divider, 0.5);

    doc.font('AR').fontSize(9).fillColor(C.gray);
    arText(doc, 'عدد الأشهر', M + 4, y + 26, taxBxW - 8);
    arText(doc, 'المبلغ',     M + 4, y + 26 + taxRowH, taxBxW - 8);

    doc.font('AR-Bold').fontSize(13).fillColor(C.textDark);
    centerText(doc, '1',                   M, y + 40, taxBxW);
    centerText(doc, fixedTax.toFixed(2),   M, y + 40 + taxRowH, taxBxW);

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
    arText(doc, 'ملاحظات', M, y + 6, notesW - 4, { align: 'center' });
    if (reading?.notes) {
      doc.font('AR').fontSize(9).fillColor(C.gray);
      arText(doc, reading.notes, M + 5, y + 27, notesW - 10);
    }

    // Amounts box
    fillRect(doc, amtX, y, amtW, botH, C.white, C.border, 0.5);
    hLine(doc, amtX, amtX + amtW, y + amtRowH,     C.divider, 0.5);
    hLine(doc, amtX, amtX + amtW, y + amtRowH * 2, C.divider, 0.5);

    const amtLabelOffset = 8; // right-side label inset

    // Row 1 — الواجب أداؤه
    doc.font('AR-Bold').fontSize(10).fillColor(C.textDark);
    arText(doc, 'الواجب أداؤه :', amtX + amtLabelOffset, y + (amtRowH / 2) - 7, amtW - amtLabelOffset - 4);
    doc.font('AR').fontSize(10).fillColor(C.textDark);
    arText(doc, `${fmt2(invoice.amount)} درهم`, amtX + amtLabelOffset, y + (amtRowH / 2) - 7, amtW - amtLabelOffset - 4, { align: 'left' });

    // Row 2 — الدين السابق
    const r2y = y + amtRowH;
    doc.font('AR-Bold').fontSize(10).fillColor(C.textDark);
    arText(doc, 'الدين السابق :', amtX + amtLabelOffset, r2y + (amtRowH / 2) - 7, amtW - amtLabelOffset - 4);
    doc.font('AR').fontSize(10).fillColor(C.gray);
    arText(doc, `${fmt2(previousDebt)} درهم`, amtX + amtLabelOffset, r2y + (amtRowH / 2) - 7, amtW - amtLabelOffset - 4, { align: 'left' });

    // Row 3 — المجموع (red bg)
    const r3y = y + amtRowH * 2;
    fillRect(doc, amtX, r3y, amtW, amtRowH, C.redBg, null);
    doc.font('AR-Bold').fontSize(12).fillColor(C.red);
    arText(doc, 'المجموع :', amtX + amtLabelOffset, r3y + (amtRowH / 2) - 7, amtW - amtLabelOffset - 4);
    doc.font('AR-Bold').fontSize(12).fillColor(C.red);
    arText(doc, `${fmt2(total)} درهم`, amtX + amtLabelOffset, r3y + (amtRowH / 2) - 7, amtW - amtLabelOffset - 4, { align: 'left' });

    y += botH + 18;

    // ═══════════════════════════════════════════════════════════════════════
    // 7. PAYMENT STATUS BADGE
    // ═══════════════════════════════════════════════════════════════════════
    const badgeH = 32;
    if (invoice.isPaid) {
      fillRect(doc, M, y, CW, badgeH, C.greenBg, C.green, 0.7);
      doc.font('AR-Bold').fontSize(13).fillColor(C.green);
      centerText(doc, `✓  مدفوعة  —  ${fmtDate(invoice.paidAt)}`, M, y + 9, CW);
    } else {
      fillRect(doc, M, y, CW, badgeH, C.orangeBg, C.orange, 0.7);
      doc.font('AR-Bold').fontSize(13).fillColor(C.orange);
      const due = fmtDate(invoice.dueDate);
      centerText(doc, `⚠  غير مدفوعة  —  الاستحقاق: ${due}`, M, y + 9, CW);
    }

    y += badgeH + 20;

    // ═══════════════════════════════════════════════════════════════════════
    // 8. FOOTER
    // ═══════════════════════════════════════════════════════════════════════
    hLine(doc, M, W - M, H - 38, C.blue, 0.7);
    doc.font('AR').fontSize(8).fillColor(C.gray);
    arText(doc, org?.nameAr || org?.name || '', M, H - 28, CW, { align: 'center' });
    // Invoice ref
    doc.font('AR').fontSize(7).fillColor(C.border);
    arText(doc, `N° compteur: ${invoice.installation.meterNumber}  |  ${MONTHS_AR[(reading?.month || 1) - 1]} ${reading?.year || ''}`, M, H - 18, CW, { align: 'center' });

    // ═══════════════════════════════════════════════════════════════════════
    // 9. WATERMARK (light background)
    // ═══════════════════════════════════════════════════════════════════════
    doc.save();
    doc.opacity(0.04).font('Title').fontSize(90).fillColor(C.blue);
    doc.text('💧', W / 2 - 60, H / 2 - 50, { lineBreak: false });
    doc.restore();

    doc.end();
  } catch (err) {
    console.error('Water bill PDF error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' });
  }
};

module.exports = { generateWaterBillPDF };
