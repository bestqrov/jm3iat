const PDFDocument     = require('pdfkit');
const path            = require('path');
const fs              = require('fs');
const arabicReshaper  = require('arabic-reshaper');

const ar = (text) => {
  if (!text) return '';
  const shaped = arabicReshaper.convertArabic(String(text));
  return shaped.split(' ').reverse().join(' ');
};

const FONT_DIR  = path.join(__dirname, '../assets/fonts');
const FONT_AR   = path.join(FONT_DIR, 'Amiri-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'Amiri-Bold.ttf');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('./uploads');

const C = {
  blueDark:  '#0d3d6b',
  blue:      '#1565c0',
  blueLight: '#e3f2fd',
  accent:    '#0288d1',
  gold:      '#9a7d0a',
  text:      '#1a1a2e',
  gray:      '#455a64',
  border:    '#b0bec5',
  divider:   '#dce8f0',
  white:     '#ffffff',
};

const fillRect = (doc, x, y, w, h, fill) => {
  if (fill) doc.save().rect(x, y, w, h).fill(fill).restore();
};
const hLine = (doc, x1, x2, y, color = C.border, lw = 0.5) => {
  doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(lw).stroke(color).restore();
};
const fmtDate = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

// Draw a block of Arabic text (handles newlines), returns new y
const arBlock = (doc, text, x, y, w, opts = {}) => {
  const { fontSize = 12, font = 'AR', color = C.text, lineGap = 4 } = opts;
  doc.font(font).fontSize(fontSize).fillColor(color);
  const lines = String(text).split('\n');
  for (const line of lines) {
    if (line.trim() === '') { y += fontSize * 0.9; continue; }
    doc.text(ar(line), x, y, { width: w, align: 'right', lineBreak: false });
    y += fontSize + lineGap;
  }
  return y;
};

const generateRequestLetterPdf = async (org, request, template, lang, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: template.nameAr } });
  doc.registerFont('AR',      FONT_AR);
  doc.registerFont('AR-Bold', FONT_BOLD);

  const fname = `letter-${request.id}-${Date.now()}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  doc.pipe(res);

  const W = 595, H = 842;
  const M = 40;
  const CW = W - 2 * M;
  let y = 0;

  // ── 1. Header band ──────────────────────────────────────────────────────────
  const hH = 88;
  fillRect(doc, 0, 0, W, hH, C.blueDark);
  fillRect(doc, 0, 0, 5, hH, C.accent);
  fillRect(doc, W - 5, 0, 5, hH, C.accent);

  // Logo
  if (org?.logo) {
    const lp = [
      path.join(UPLOAD_DIR, path.basename(org.logo)),
      path.join(process.cwd(), 'uploads', path.basename(org.logo)),
    ].find(p => fs.existsSync(p));
    if (lp) { try { doc.image(lp, M + 4, 14, { fit: [58, 58] }); } catch (_) {} }
  }

  // Org name (Arabic)
  const orgName = org?.nameAr || org?.name || '';
  doc.font('AR-Bold').fontSize(16).fillColor(C.white);
  doc.text(ar(orgName), M + 68, 18, { width: CW - 70, align: 'right', lineBreak: false });

  // City + phone under name
  const sub = [org?.cityAr || org?.city, org?.phone].filter(Boolean).join('  |  ');
  if (sub) {
    doc.font('AR').fontSize(9).fillColor('#a8d4f5');
    doc.text(ar(sub), M + 68, 40, { width: CW - 70, align: 'right', lineBreak: false });
  }

  // Email bottom-left (Latin)
  if (org?.email) {
    doc.font('AR').fontSize(8).fillColor('#a8d4f5');
    doc.text(org.email, M + 10, 68, { width: 180, align: 'left', lineBreak: false });
  }

  fillRect(doc, 0, hH - 3, W, 3, C.accent);
  y = hH + 14;

  // ── 2. بسم الله ─────────────────────────────────────────────────────────────
  doc.font('AR-Bold').fontSize(13).fillColor(C.gold);
  doc.text(ar('بسم الله الرحمن الرحيم'), M, y, { width: CW, align: 'center', lineBreak: false });
  y += 18;
  hLine(doc, M, W - M, y, C.divider, 1);
  y += 12;

  // ── 3. Date (right) ─────────────────────────────────────────────────────────
  const dateStr = fmtDate();
  const cityStr = org?.cityAr || org?.city || '';
  const dateLabel = cityStr ? `${ar(cityStr)} في ${dateStr}` : dateStr;
  doc.font('AR').fontSize(10).fillColor(C.gray);
  doc.text(ar(dateLabel), M, y, { width: CW, align: 'right', lineBreak: false });
  y += 22;

  // ── 4. Recipient block ───────────────────────────────────────────────────────
  if (request.recipient) {
    doc.font('AR-Bold').fontSize(11).fillColor(C.text);
    doc.text(ar(`إلى السيد / ${request.recipient}`), M, y, { width: CW, align: 'right', lineBreak: false });
    y += 16;
    doc.font('AR').fontSize(10).fillColor(C.gray);
    doc.text(ar('المحترم/ة،'), M, y, { width: CW, align: 'right', lineBreak: false });
    y += 20;
  }

  // ── 5. Subject line ──────────────────────────────────────────────────────────
  fillRect(doc, M, y, CW, 22, C.blueLight);
  doc.font('AR-Bold').fontSize(11).fillColor(C.blue);
  doc.text(ar(`الموضوع : ${request.title}`), M + 6, y + 5, { width: CW - 12, align: 'right', lineBreak: false });
  y += 30;

  // ── 6. Salutation ────────────────────────────────────────────────────────────
  doc.font('AR').fontSize(12).fillColor(C.text);
  doc.text(ar('السادة المحترمون،'), M, y, { width: CW, align: 'right', lineBreak: false });
  y += 18;
  doc.text(ar('السلام عليكم ورحمة الله وبركاته، وبعد:'), M, y, { width: CW, align: 'right', lineBreak: false });
  y += 20;

  // ── 7. Body text ─────────────────────────────────────────────────────────────
  const bodyText = lang === 'fr' ? template.bodyFr : template.bodyAr;
  const ctx = {
    orgName: org?.nameAr || org?.name || '',
    title:   request.title,
    recipient: request.recipient || '',
    amount: request.amount ? `${Number(request.amount).toLocaleString('fr-MA')} درهم` : '',
    description: request.description || '',
  };
  const rendered = typeof bodyText === 'function' ? bodyText(ctx) : bodyText;

  const paragraphs = rendered.split('\n\n');
  for (const para of paragraphs) {
    if (!para.trim()) continue;
    // Multi-line paragraph with auto-wrap
    const lines = para.split('\n');
    for (const line of lines) {
      if (!line.trim()) { y += 8; continue; }
      doc.font('AR').fontSize(11).fillColor(C.text);
      const reshaped = arabicReshaper.convertArabic(line);
      const reversed = reshaped.split(' ').reverse().join(' ');
      doc.text(reversed, M, y, { width: CW, align: 'right', lineBreak: true, lineGap: 3 });
      y = doc.y + 2;
    }
    y += 8;
  }

  // ── 8. Amount highlight (if present) ────────────────────────────────────────
  if (request.amount) {
    y += 4;
    fillRect(doc, M, y, CW, 24, '#fff8e1');
    doc.font('AR-Bold').fontSize(11).fillColor('#7b5200');
    doc.text(ar(`المبلغ المطلوب : ${Number(request.amount).toLocaleString('fr-MA')} درهم`), M + 6, y + 6, { width: CW - 12, align: 'right', lineBreak: false });
    y += 32;
  }

  // ── 9. Closing ───────────────────────────────────────────────────────────────
  y += 6;
  doc.font('AR').fontSize(11).fillColor(C.text);
  doc.text(ar('وتفضلوا بقبول فائق الاحترام والتقدير.'), M, y, { width: CW, align: 'right', lineBreak: false });
  y += 24;

  // ── 10. Signature block ──────────────────────────────────────────────────────
  // Place near bottom
  const sigY = Math.max(y + 20, H - 130);
  hLine(doc, M, W - M, sigY, C.divider, 1);

  const col = CW / 2;
  doc.font('AR-Bold').fontSize(10).fillColor(C.text);
  doc.text(ar('الكاتب العام'), M, sigY + 12, { width: col, align: 'left', lineBreak: false });
  doc.text(ar('رئيس الجمعية'), M + col, sigY + 12, { width: col, align: 'right', lineBreak: false });

  // Signature lines
  hLine(doc, M + 10, M + col - 20, sigY + 52, C.text, 0.7);
  hLine(doc, M + col + 20, W - M - 10, sigY + 52, C.text, 0.7);

  // ── 11. Footer band ──────────────────────────────────────────────────────────
  fillRect(doc, 0, H - 28, W, 28, C.blueDark);
  fillRect(doc, 0, H - 28, W, 3, C.accent);
  doc.font('AR').fontSize(8).fillColor('#a8d4f5');
  const footer = org?.nameAr || org?.name || '';
  doc.text(ar(footer), M, H - 20, { width: CW, align: 'center', lineBreak: false });

  doc.end();
};

module.exports = { generateRequestLetterPdf };
