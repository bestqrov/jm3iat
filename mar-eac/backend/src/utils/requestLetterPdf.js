const PDFDocument    = require('pdfkit');
const path           = require('path');
const fs             = require('fs');
const arabicReshaper = require('arabic-reshaper');

// ── Helpers ───────────────────────────────────────────────────────────────────

const FONT_DIR   = path.join(__dirname, '../assets/fonts');
const FONT_AR    = path.join(FONT_DIR, 'Amiri-Regular.ttf');
const FONT_BOLD  = path.join(FONT_DIR, 'Amiri-Bold.ttf');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('./uploads');

const ar = (text) => {
  if (!text) return '';
  const shaped = arabicReshaper.convertArabic(String(text));
  return shaped.split(' ').reverse().join(' ');
};

const fillRect = (doc, x, y, w, h, color) => {
  if (color) doc.save().rect(x, y, w, h).fill(color).restore();
};
const hLine = (doc, x1, x2, y, color = '#b0bec5', lw = 0.5) => {
  doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(lw).stroke(color).restore();
};

const FR_MONTHS = ['janvier','février','mars','avril','mai','juin',
                   'juillet','août','septembre','octobre','novembre','décembre'];

const dateFr = () => {
  const d = new Date();
  return `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const dateAr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

const logoPath = (org) => {
  if (!org?.logo) return null;
  if (org.logo.startsWith('data:')) {
    try { return Buffer.from(org.logo.split(',')[1], 'base64'); } catch (_) { return null; }
  }
  return [
    path.join(UPLOAD_DIR, path.basename(org.logo)),
    path.join(process.cwd(), 'uploads', path.basename(org.logo)),
  ].find(p => fs.existsSync(p)) || null;
};

const C = {
  blueDark : '#0d3d6b',
  blue     : '#1565c0',
  blueLight: '#dbeafe',
  accent   : '#0288d1',
  gold     : '#9a7d0a',
  text     : '#1a1a2e',
  gray     : '#546e7a',
  divider  : '#dce8f0',
  white    : '#ffffff',
  yellow   : '#fff8e1',
  amber    : '#7b5200',
};

// ── FRENCH letter (LTR, Times-Roman, Moroccan admin format) ───────────────────

const generateFrLetter = (doc, org, request, template) => {
  const W = 595, H = 842, M = 45, CW = W - 2 * M;
  let y = 0;

  // ── Header band ─────────────────────────────────────────────────────────────
  const hH = 82;
  fillRect(doc, 0, 0, W, hH, C.blueDark);
  fillRect(doc, 0, hH - 3, W, 3, C.accent);
  fillRect(doc, 0, 0, 4, hH, C.accent);
  fillRect(doc, W - 4, 0, 4, hH, C.accent);

  const lp = logoPath(org);
  if (lp) { try { doc.image(lp, M, 12, { fit: [56, 56] }); } catch (_) {} }

  const orgNameFr = org?.name || '';
  doc.font('Times-Bold').fontSize(15).fillColor(C.white);
  doc.text(orgNameFr.toUpperCase(), M + 68, 18, { width: CW - 70, align: 'left', lineBreak: false });

  const subInfo = [org?.address || org?.addressAr, org?.city, org?.phone, org?.email].filter(Boolean).join('  |  ');
  if (subInfo) {
    doc.font('Times-Roman').fontSize(8).fillColor('#a8d4f5');
    doc.text(subInfo, M + 68, 38, { width: CW - 70, align: 'left', lineBreak: false });
  }

  // RC / legal ref line (Moroccan admin standard)
  const rcLine = [
    org?.bankRib ? `RIB : ${org.bankRib}` : null,
  ].filter(Boolean).join('  –  ');
  if (rcLine) {
    doc.font('Times-Roman').fontSize(7.5).fillColor('#a8d4f5');
    doc.text(rcLine, M + 68, 54, { width: CW - 70, align: 'left', lineBreak: false });
  }

  y = hH + 18;

  // ── Lieu + date (right aligned, Moroccan standard) ───────────────────────────
  const city = org?.city || '';
  const dateStr = city ? `${city}, le ${dateFr()}` : `Le ${dateFr()}`;
  doc.font('Times-Roman').fontSize(11).fillColor(C.gray);
  doc.text(dateStr, M, y, { width: CW, align: 'right', lineBreak: false });
  y += 28;

  // ── Sender block (left, compact) ────────────────────────────────────────────
  const senderLines = [
    orgNameFr,
    org?.address,
    [org?.city, org?.region].filter(Boolean).join(' — '),
    org?.phone ? `Tél : ${org.phone}` : null,
    org?.email ? `Email : ${org.email}` : null,
  ].filter(Boolean);

  doc.font('Times-Roman').fontSize(9).fillColor(C.gray);
  let sy = y;
  senderLines.forEach(line => {
    doc.text(line, M, sy, { width: 200, align: 'left', lineBreak: false });
    sy += 13;
  });

  // ── Recipient block (right, Moroccan standard: destinataire à droite) ────────
  let ry = y;
  if (request.recipient) {
    doc.font('Times-Bold').fontSize(11).fillColor(C.text);
    doc.text(`À Monsieur / Madame`, M + CW - 210, ry, { width: 210, align: 'left', lineBreak: false });
    ry += 15;
    doc.font('Times-Roman').fontSize(11).fillColor(C.text);
    doc.text(request.recipient, M + CW - 210, ry, { width: 210, align: 'left', lineBreak: false });
    ry += 15;
    doc.font('Times-Roman').fontSize(11).fillColor(C.gray);
    doc.text(city || 'Ville', M + CW - 210, ry, { width: 210, align: 'left', lineBreak: false });
  }

  y = Math.max(sy, ry) + 22;
  hLine(doc, M, W - M, y, C.divider, 1);
  y += 14;

  // ── Objet + Réf (Moroccan admin format: underlined) ──────────────────────────
  doc.font('Times-Bold').fontSize(11).fillColor(C.text);
  const objetLabel = 'Objet : ';
  const objetText  = request.title;
  doc.text(objetLabel, M, y, { continued: true, lineBreak: false });
  doc.font('Times-Roman').text(objetText, { lineBreak: false });
  // Underline the objet line
  const objWidth = doc.widthOfString(objetLabel + objetText);
  hLine(doc, M, M + Math.min(objWidth, CW), y + 13, C.text, 0.6);
  y += 24;

  if (request.amount) {
    doc.font('Times-Bold').fontSize(10).fillColor(C.gray);
    doc.text(`Montant : ${Number(request.amount).toLocaleString('fr-MA')} MAD`, M, y, { lineBreak: false });
    y += 18;
  }
  y += 6;

  // ── Salutation ───────────────────────────────────────────────────────────────
  doc.font('Times-Roman').fontSize(12).fillColor(C.text);
  doc.text('Monsieur, Madame,', M, y, { lineBreak: false });
  y += 22;

  // ── Body text ─────────────────────────────────────────────────────────────────
  const ctx = {
    orgName: orgNameFr,
    title: request.title,
    recipient: request.recipient || '',
    amount: request.amount ? `${Number(request.amount).toLocaleString('fr-MA')} MAD` : '',
    description: request.description || '',
  };
  const bodyText = typeof template.bodyFr === 'function' ? template.bodyFr(ctx) : template.bodyFr;

  doc.font('Times-Roman').fontSize(11.5).fillColor(C.text);
  const paragraphs = bodyText.split('\n\n');
  for (const para of paragraphs) {
    if (!para.trim()) continue;
    doc.text(para.replace(/\n/g, ' '), M, y, {
      width: CW, align: 'justify', lineBreak: true, lineGap: 2,
    });
    y = doc.y + 10;
  }

  // ── Amount box ───────────────────────────────────────────────────────────────
  if (request.amount) {
    y += 4;
    fillRect(doc, M, y, CW, 26, C.yellow);
    doc.font('Times-Bold').fontSize(11).fillColor(C.amber);
    doc.text(
      `Montant sollicité : ${Number(request.amount).toLocaleString('fr-MA')} dirhams`,
      M + 8, y + 7, { width: CW - 16, align: 'left', lineBreak: false }
    );
    y += 34;
  }

  // ── Closing (formule de politesse marocaine) ─────────────────────────────────
  y += 8;
  doc.font('Times-Roman').fontSize(11.5).fillColor(C.text);
  doc.text(
    'Veuillez agréer, Monsieur, Madame, l\'expression de nos salutations distinguées.',
    M, y, { width: CW, align: 'left', lineBreak: true }
  );
  y = doc.y + 30;

  // ── Signature block ──────────────────────────────────────────────────────────
  const sigY = Math.max(y, H - 120);
  hLine(doc, M, W - M, sigY, C.divider);

  const half = CW / 2;
  doc.font('Times-Bold').fontSize(10).fillColor(C.text);
  doc.text('Le Secrétaire Général', M, sigY + 12, { width: half, align: 'center', lineBreak: false });
  doc.text('Le Président de l\'Association', M + half, sigY + 12, { width: half, align: 'center', lineBreak: false });

  hLine(doc, M + 15, M + half - 15, sigY + 56, C.text, 0.7);
  hLine(doc, M + half + 15, W - M - 15, sigY + 56, C.text, 0.7);

  // ── Footer band ───────────────────────────────────────────────────────────────
  fillRect(doc, 0, H - 26, W, 26, C.blueDark);
  fillRect(doc, 0, H - 26, W, 2, C.accent);
  doc.font('Times-Roman').fontSize(7.5).fillColor('#a8d4f5');
  const footerFr = [orgNameFr, org?.city, org?.phone].filter(Boolean).join('  |  ');
  doc.text(footerFr, M, H - 17, { width: CW, align: 'center', lineBreak: false });
};

// ── ARABIC letter (RTL, Amiri, Moroccan admin format) ────────────────────────

const generateArLetter = (doc, org, request, template) => {
  const W = 595, H = 842, M = 40, CW = W - 2 * M;
  let y = 0;

  // ── Header band ─────────────────────────────────────────────────────────────
  const hH = 90;
  fillRect(doc, 0, 0, W, hH, C.blueDark);
  fillRect(doc, 0, 0, 5, hH, C.accent);
  fillRect(doc, W - 5, 0, 5, hH, C.accent);

  const lp = logoPath(org);
  if (lp) { try { doc.image(lp, W - M - 62, 14, { fit: [58, 58] }); } catch (_) {} }

  const orgName = org?.nameAr || org?.name || '';
  doc.font('AR-Bold').fontSize(16).fillColor(C.white);
  doc.text(ar(orgName), M, 18, { width: CW - 70, align: 'right', lineBreak: false });

  const sub = [org?.cityAr || org?.city, org?.phone].filter(Boolean).join('  |  ');
  if (sub) {
    doc.font('AR').fontSize(9).fillColor('#a8d4f5');
    doc.text(ar(sub), M, 40, { width: CW - 70, align: 'right', lineBreak: false });
  }
  if (org?.email) {
    doc.font('AR').fontSize(8).fillColor('#a8d4f5');
    doc.text(org.email, M + 10, 60, { width: 200, align: 'left', lineBreak: false });
  }

  fillRect(doc, 0, hH - 3, W, 3, C.accent);
  y = hH + 12;

  // ── بسم الله ─────────────────────────────────────────────────────────────────
  doc.font('AR-Bold').fontSize(13).fillColor(C.gold);
  doc.text(ar('بسم الله الرحمن الرحيم'), M, y, { width: CW, align: 'center', lineBreak: false });
  y += 20;
  hLine(doc, M, W - M, y, C.divider, 1);
  y += 14;

  // ── Date (right, Moroccan admin format) ──────────────────────────────────────
  const city = org?.cityAr || org?.city || '';
  const dateLabel = city ? `${ar(city)} في: ${dateAr()}` : dateAr();
  doc.font('AR').fontSize(10).fillColor(C.gray);
  doc.text(dateLabel, M, y, { width: CW, align: 'right', lineBreak: false });
  y += 24;

  // ── Recipient block (right aligned) ─────────────────────────────────────────
  if (request.recipient) {
    fillRect(doc, M, y, CW, 36, '#f0f4f8');
    doc.font('AR-Bold').fontSize(11).fillColor(C.text);
    doc.text(ar(`إلى السيد / ${request.recipient}`), M + 6, y + 7, { width: CW - 12, align: 'right', lineBreak: false });
    doc.font('AR').fontSize(10).fillColor(C.gray);
    doc.text(ar('المحترم/ة،'), M + 6, y + 22, { width: CW - 12, align: 'right', lineBreak: false });
    y += 46;
  }

  // ── Subject box ──────────────────────────────────────────────────────────────
  fillRect(doc, M, y, CW, 24, C.blueLight);
  doc.save()
     .rect(M, y, 4, 24).fill(C.blue).restore();
  doc.font('AR-Bold').fontSize(11).fillColor(C.blue);
  doc.text(ar(`الموضوع : ${request.title}`), M + 8, y + 6, { width: CW - 16, align: 'right', lineBreak: false });
  y += 32;

  // ── Salutation ───────────────────────────────────────────────────────────────
  doc.font('AR').fontSize(12).fillColor(C.text);
  doc.text(ar('السادة المحترمون،'), M, y, { width: CW, align: 'right', lineBreak: false });
  y += 18;
  doc.text(ar('السلام عليكم ورحمة الله وبركاته، وبعد:'), M, y, { width: CW, align: 'right', lineBreak: false });
  y += 22;

  // ── Body text ─────────────────────────────────────────────────────────────────
  const ctx = {
    orgName: org?.nameAr || org?.name || '',
    title: request.title,
    recipient: request.recipient || '',
    amount: request.amount ? `${Number(request.amount).toLocaleString('fr-MA')} درهم` : '',
    description: request.description || '',
  };
  const bodyText = typeof template.bodyAr === 'function' ? template.bodyAr(ctx) : template.bodyAr;

  const paragraphs = bodyText.split('\n\n');
  for (const para of paragraphs) {
    if (!para.trim()) continue;
    const lines = para.split('\n');
    for (const line of lines) {
      if (!line.trim()) { y += 8; continue; }
      doc.font('AR').fontSize(11).fillColor(C.text);
      const shaped = arabicReshaper.convertArabic(line);
      const reversed = shaped.split(' ').reverse().join(' ');
      doc.text(reversed, M, y, { width: CW, align: 'right', lineBreak: true, lineGap: 3 });
      y = doc.y + 2;
    }
    y += 8;
  }

  // ── Amount box ───────────────────────────────────────────────────────────────
  if (request.amount) {
    y += 4;
    fillRect(doc, M, y, CW, 26, C.yellow);
    doc.font('AR-Bold').fontSize(11).fillColor(C.amber);
    doc.text(ar(`المبلغ المطلوب : ${Number(request.amount).toLocaleString('fr-MA')} درهم`), M + 6, y + 7, { width: CW - 12, align: 'right', lineBreak: false });
    y += 34;
  }

  // ── Closing ──────────────────────────────────────────────────────────────────
  y += 8;
  doc.font('AR').fontSize(11.5).fillColor(C.text);
  doc.text(ar('وتفضلوا بقبول فائق الاحترام والتقدير.'), M, y, { width: CW, align: 'right', lineBreak: false });
  y += 28;

  // ── Signature block ──────────────────────────────────────────────────────────
  const sigY = Math.max(y, H - 125);
  hLine(doc, M, W - M, sigY, C.divider);

  const half = CW / 2;
  doc.font('AR-Bold').fontSize(10).fillColor(C.text);
  // In Moroccan Arabic format: president on RIGHT, secretary on LEFT
  doc.text(ar('رئيس الجمعية'), M + half, sigY + 12, { width: half, align: 'right', lineBreak: false });
  doc.text(ar('الكاتب العام'), M, sigY + 12, { width: half, align: 'left', lineBreak: false });

  doc.font('AR').fontSize(9).fillColor(C.gray);
  doc.text(ar('الختم والتوقيع'), M + half, sigY + 25, { width: half, align: 'right', lineBreak: false });
  doc.text(ar('الختم والتوقيع'), M, sigY + 25, { width: half, align: 'left', lineBreak: false });

  hLine(doc, M + half + 15, W - M - 15, sigY + 60, C.text, 0.7);
  hLine(doc, M + 15, M + half - 15, sigY + 60, C.text, 0.7);

  // ── Footer band ───────────────────────────────────────────────────────────────
  fillRect(doc, 0, H - 28, W, 28, C.blueDark);
  fillRect(doc, 0, H - 28, W, 3, C.accent);
  doc.font('AR').fontSize(8).fillColor('#a8d4f5');
  doc.text(ar(org?.nameAr || org?.name || ''), M, H - 19, { width: CW, align: 'center', lineBreak: false });
};

// ── Entry point ───────────────────────────────────────────────────────────────

const generateRequestLetterPdf = (org, request, template, lang) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: {
      Title: lang === 'fr' ? template.nameFr : template.nameAr,
      Author: org?.name || 'Mar E-A.C',
    }});

    // Register Arabic fonts (with fallback)
    const fontsExist = fs.existsSync(FONT_AR) && fs.existsSync(FONT_BOLD);
    if (fontsExist) {
      doc.registerFont('AR',      FONT_AR);
      doc.registerFont('AR-Bold', FONT_BOLD);
    } else {
      console.warn('[PDF] Arabic fonts missing at', FONT_DIR, '— using Helvetica fallback');
      doc.registerFont('AR',      'Helvetica');
      doc.registerFont('AR-Bold', 'Helvetica-Bold');
    }

    const chunks = [];
    doc.on('data',  chunk => chunks.push(chunk));
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
    doc.on('error', err   => reject(err));

    try {
      if (lang === 'fr') {
        generateFrLetter(doc, org, request, template);
      } else {
        generateArLetter(doc, org, request, template);
      }
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateRequestLetterPdf };
