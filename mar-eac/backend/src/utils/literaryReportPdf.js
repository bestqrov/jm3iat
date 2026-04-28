'use strict';
const PDFDocument    = require('pdfkit');
const path           = require('path');
const fs             = require('fs');
const arabicReshaper = require('arabic-reshaper');

const FONT_DIR   = path.join(__dirname, '../assets/fonts');
const FONT_AR    = path.join(FONT_DIR, 'Amiri-Regular.ttf');
const FONT_BOLD  = path.join(FONT_DIR, 'Amiri-Bold.ttf');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('./uploads');

// ── Arabic text helper ────────────────────────────────────────────────────────
const ar = (t) => {
  if (!t) return '';
  const shaped = arabicReshaper.convertArabic(String(t));
  return shaped.split(' ').reverse().join(' ');
};

// ── Drawing primitives ────────────────────────────────────────────────────────
const fill  = (doc, x, y, w, h, color) =>
  doc.save().rect(x, y, w, h).fill(color).restore();

const fillO = (doc, x, y, w, h, color, op) =>
  doc.save().fillOpacity(op).rect(x, y, w, h).fill(color).fillOpacity(1).restore();

const hline = (doc, x1, x2, y, color = '#e2e8f0', lw = 0.5) =>
  doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(lw).stroke(color).restore();

// ── Date helpers ──────────────────────────────────────────────────────────────
const FR_MONTHS = ['janvier','février','mars','avril','mai','juin',
                   'juillet','août','septembre','octobre','novembre','décembre'];
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','ماي','يونيو',
                   'يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر'];

const fmtFr = (d = new Date()) =>
  `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const fmtAr = (d = new Date()) =>
  `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;

// ── Logo path resolver ────────────────────────────────────────────────────────
const logoPath = (org) => {
  if (!org?.logo) return null;
  return [
    path.join(UPLOAD_DIR, path.basename(org.logo)),
    path.join(process.cwd(), 'uploads', path.basename(org.logo)),
  ].find(p => fs.existsSync(p)) || null;
};

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  navy   : '#0d2b5e', navyMid: '#1a3f7a', navyL: '#1e4080',
  blue   : '#1565c0', blueL  : '#dbeafe',
  teal   : '#0e7490', tealL  : '#cffafe',
  green  : '#15803d', greenL : '#dcfce7',
  amber  : '#b45309', amberL : '#fef3c7',
  red    : '#b91c1c', redL   : '#fee2e2',
  purple : '#6d28d9', purpleL: '#ede9fe',
  gray   : '#475569', grayL  : '#f1f5f9',
  text   : '#1e293b', white  : '#ffffff',
  gold   : '#c59a0a', accent : '#0284c7',
  divider: '#e2e8f0', footerBg: '#060f22',
};

// ── Geometric motif helpers ───────────────────────────────────────────────────

const star8 = (doc, cx, cy, outerR, innerR, color, op) => {
  doc.save().fillColor(color).fillOpacity(op);
  let first = true;
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI / 8) - Math.PI / 2;
    const r     = i % 2 === 0 ? outerR : innerR;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (first) { doc.moveTo(px, py); first = false; }
    else doc.lineTo(px, py);
  }
  doc.closePath().fill();
  doc.restore();
};

const rosette = (doc, cx, cy, r, color, op) => {
  doc.save().strokeColor(color).strokeOpacity(op).lineWidth(0.5);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    doc.circle(cx + r * Math.cos(a), cy + r * Math.sin(a), r).stroke();
  }
  doc.circle(cx, cy, r).stroke();
  doc.restore();
};

const dotGrid = (doc, W, H, spacing, color, op, dotR = 0.7) => {
  doc.save().fillColor(color).fillOpacity(op);
  for (let gx = spacing; gx < W; gx += spacing)
    for (let gy = spacing; gy < H; gy += spacing)
      doc.circle(gx, gy, dotR).fill();
  doc.restore();
};

const diamonds = (doc, y, W, color, op, step = 18) => {
  doc.save().fillColor(color).fillOpacity(op);
  for (let x = step; x < W; x += step) {
    doc.moveTo(x, y - 3).lineTo(x + 3, y).lineTo(x, y + 3).lineTo(x - 3, y)
       .closePath().fill();
  }
  doc.restore();
};

// ── COVER PAGE ────────────────────────────────────────────────────────────────

const drawCover = (doc, org, year, lp, lang) => {
  const W = 595, H = 842, M = 45, CW = W - 2 * M;
  const isFr = lang === 'fr';
  const today = new Date();

  // Background zones
  fill(doc, 0, 0,        W, H * 0.61, C.navy);
  fill(doc, 0, H * 0.61, W, H * 0.39, C.navyMid);

  // Dot grid texture
  dotGrid(doc, W, H, 22, C.white, 0.04);

  // Corner rosettes
  rosette(doc, 0,   0,   55, C.accent, 0.22);
  rosette(doc, W,   0,   55, C.accent, 0.22);
  rosette(doc, 0,   H,   50, C.accent, 0.17);
  rosette(doc, W,   H,   50, C.accent, 0.17);

  // Corner stars
  star8(doc, 60,     78,     42, 19, C.accent, 0.10);
  star8(doc, W - 60, 78,     42, 19, C.accent, 0.10);
  star8(doc, 60,     H - 78, 38, 17, C.accent, 0.08);
  star8(doc, W - 60, H - 78, 38, 17, C.accent, 0.08);

  // Star medallion behind logo
  star8(doc, W / 2, 128, 72, 32, C.accent, 0.11);
  doc.save().strokeColor(C.white).strokeOpacity(0.07).lineWidth(0.8);
  [58, 68, 78].forEach(r => doc.circle(W / 2, 128, r).stroke());
  doc.restore();

  // Frame borders
  fill(doc, 0, 0,     W, 5,   C.accent);
  fill(doc, 0, H - 5, W, 5,   C.accent);
  fill(doc, 0, 0,     5, H,   C.accent);
  fill(doc, W - 5, 0, 5, H,   C.accent);
  doc.save().strokeColor(C.accent).strokeOpacity(0.28).lineWidth(0.8)
     .rect(14, 14, W - 28, H - 28).stroke().restore();

  // Separator at 61%
  const sepY = Math.round(H * 0.61);
  fill(doc, M, sepY - 1, CW, 2, C.accent);
  diamonds(doc, sepY + 8, W, C.gold, 0.55);

  // Footer strip
  fill(doc, 0, H - 52, W, 52, C.footerBg);
  fill(doc, 0, H - 52, W, 2,  C.accent);

  // Bismillah (Arabic only)
  if (!isFr) {
    doc.font('AR-Bold').fontSize(11).fillColor(C.gold);
    doc.text(ar('بسم الله الرحمن الرحيم'), M, 20,
      { width: CW, align: 'center', lineBreak: false });
  }

  // Logo
  const logoY = 48;
  if (lp) {
    try { doc.image(lp, W / 2 - 44, logoY + 8, { fit: [88, 88] }); } catch (_) {}
  } else {
    doc.save().fillColor(C.accent).fillOpacity(0.18)
       .circle(W / 2, logoY + 50, 44).fill().restore();
    doc.font(isFr ? 'Times-Bold' : 'AR-Bold').fontSize(38).fillColor(C.white);
    const init = isFr
      ? (org?.name || 'J').substring(0, 2).toUpperCase()
      : ar((org?.nameAr || org?.name || 'ج').charAt(0));
    doc.text(init, W / 2 - 50, logoY + 24, { width: 100, align: 'center', lineBreak: false });
  }

  // Report type label
  const labelY = 163;
  doc.font(isFr ? 'Times-Bold' : 'AR-Bold').fontSize(8.5).fillColor('#7dd3fc');
  doc.text(
    isFr ? "RAPPORT MORAL & D'ACTIVITES" : ar('التقرير الادبي والانشطة'),
    M, labelY, { width: CW, align: 'center', lineBreak: false }
  );
  diamonds(doc, labelY + 13, W, C.gold, 0.38, 14);

  // Organization name
  const nameY = 183;
  if (isFr) {
    doc.font('Times-Bold').fontSize(21).fillColor(C.white);
    doc.text((org?.name || '').toUpperCase(), M, nameY,
      { width: CW, align: 'center', lineBreak: false });
    if (org?.nameAr) {
      doc.font('AR-Bold').fontSize(13).fillColor('#93c5fd');
      doc.text(ar(org.nameAr), M, nameY + 28,
        { width: CW, align: 'center', lineBreak: false });
    }
  } else {
    doc.font('AR-Bold').fontSize(21).fillColor(C.white);
    doc.text(ar(org?.nameAr || org?.name || ''), M, nameY,
      { width: CW, align: 'center', lineBreak: false });
    if (org?.name && org?.nameAr) {
      doc.font('Times-Roman').fontSize(12).fillColor('#93c5fd');
      doc.text(org.name, M, nameY + 28,
        { width: CW, align: 'center', lineBreak: false });
    }
  }

  // Year badge
  const badgeY = 231;
  const bw = 110, bh = 34;
  fill(doc, W / 2 - bw / 2, badgeY, bw, bh, C.accent);
  star8(doc, W / 2 - bw / 2 - 9, badgeY + bh / 2, 9, 4, C.gold, 0.7);
  star8(doc, W / 2 + bw / 2 + 9, badgeY + bh / 2, 9, 4, C.gold, 0.7);
  doc.font(isFr ? 'Times-Bold' : 'AR-Bold').fontSize(18).fillColor(C.white);
  doc.text(String(year), W / 2 - bw / 2, badgeY + 9,
    { width: bw, align: 'center', lineBreak: false });

  // Info lines in bottom half
  const infoData = isFr ? [
    org?.city         ? `Ville : ${org.city}`                             : null,
    org?.region       ? `Region : ${org.region}`                          : null,
    org?.foundingDate ? `Fondee le ${fmtFr(new Date(org.foundingDate))}`  : null,
    org?.email        ? org.email                                          : null,
    org?.phone        ? org.phone                                          : null,
  ] : [
    (org?.cityAr || org?.city)     ? ar(`المدينة : ${org.cityAr || org.city}`)           : null,
    (org?.regionAr || org?.region) ? ar(`الجهة : ${org.regionAr || org.region}`)         : null,
    org?.foundingDate ? ar(`تاسست في : ${fmtAr(new Date(org.foundingDate))}`)            : null,
    org?.email        ? org.email                                                          : null,
    org?.phone        ? org.phone                                                          : null,
  ];
  const lines = infoData.filter(Boolean);

  let iy = sepY + 22;
  lines.forEach((line, idx) => {
    fillO(doc, M + 45, iy, CW - 90, 22, C.white, idx % 2 === 0 ? 0.06 : 0.03);
    doc.font(isFr ? 'Times-Roman' : 'AR').fontSize(9.5).fillColor('#bae6fd');
    doc.text(line, M + 45, iy + 6, { width: CW - 90, align: 'center', lineBreak: false });
    iy += 26;
  });

  // Footer date
  doc.font(isFr ? 'Times-Roman' : 'AR').fontSize(7.5).fillColor('#64748b');
  doc.text(
    isFr ? `Genere le ${fmtFr(today)}` : ar(`صدر بتاريخ ${fmtAr(today)}`),
    M, H - 35, { width: CW, align: 'center', lineBreak: false }
  );
};

// ── Content page chrome ───────────────────────────────────────────────────────

const contentHeader = (doc, org, year, lp, lang) => {
  const W = 595, M = 45, CW = W - 2 * M;
  const isFr = lang === 'fr';

  fill(doc, 0, 0, W, 68, C.navy);
  fill(doc, 0, 68, W, 3, C.accent);
  fill(doc, 0, 0,  4, 68, C.accent);
  fill(doc, W - 4, 0, 4, 68, C.accent);
  star8(doc, isFr ? W - 18 : 18, 10, 10, 5, C.accent, 0.25);
  star8(doc, isFr ? 18 : W - 18, 10, 10, 5, C.accent, 0.25);

  // Logo: left for FR, right for AR
  if (lp) {
    try {
      const logoX = isFr ? M : W - M - 48;
      doc.image(lp, logoX, 10, { fit: [48, 48] });
    } catch (_) {}
  }

  const nameStr  = isFr
    ? (org?.name || '').toUpperCase()
    : ar(org?.nameAr || org?.name || '');
  const fontBold = isFr ? 'Times-Bold' : 'AR-Bold';
  const fontReg  = isFr ? 'Times-Roman' : 'AR';
  const align    = isFr ? 'left' : 'right';
  // For FR: text starts after logo on left. For AR: text in full width, right-aligned (logo is on right edge)
  const textX    = isFr ? M + 58 : M;
  const textW    = isFr ? CW - 58 : CW - 58;

  doc.font(fontBold).fontSize(12).fillColor(C.white);
  doc.text(nameStr, textX, 12, { width: textW, align, lineBreak: false });

  doc.font(fontReg).fontSize(8).fillColor('#93c5fd');
  const subLine = isFr
    ? `Rapport d'activites ${year}   |   ${fmtFr()}`
    : ar(`التقرير الادبي ${year}   |   ${fmtAr()}`);
  doc.text(subLine, textX, 29, { width: textW, align, lineBreak: false });

  const contact = [org?.city, org?.phone].filter(Boolean).join('  |  ');
  if (contact) {
    doc.font(fontReg).fontSize(7.5).fillColor('#bfdbfe');
    doc.text(isFr ? contact : ar(contact), textX, 46, { width: textW, align, lineBreak: false });
  }
  return 80;
};

const contentFooter = (doc, org, lang, pageNum) => {
  const W = 595, H = 842, M = 45, CW = W - 2 * M;
  const isFr = lang === 'fr';
  fill(doc, 0, H - 24, W, 24, C.navy);
  fill(doc, 0, H - 24, W, 1.5, C.accent);
  doc.font(isFr ? 'Times-Roman' : 'AR').fontSize(7).fillColor('#93c5fd');
  const ft = [org?.name, org?.city, org?.phone].filter(Boolean).join('  |  ');
  doc.text(isFr ? ft : ar(ft), M, H - 15,
    { width: CW - 24, align: 'center', lineBreak: false });
  if (pageNum) {
    doc.font('Times-Roman').fontSize(7).fillColor('#64748b');
    doc.text(String(pageNum), W - M - 18, H - 15,
      { width: 18, align: 'right', lineBreak: false });
  }
};

// ── FRENCH content ────────────────────────────────────────────────────────────

const frContent = (doc, data, year, lp) => {
  const { org, members, meetings, finance, projects, requests } = data;
  const W = 595, H = 842, M = 45, CW = W - 2 * M;
  const PAGE_BOTTOM = H - 34;
  let pageNum = 2;

  doc.addPage();
  let y = contentHeader(doc, org, year, lp, 'fr');

  const newPage = (needed) => {
    if (y + needed > PAGE_BOTTOM) {
      contentFooter(doc, org, 'fr', pageNum++);
      doc.addPage();
      y = contentHeader(doc, org, year, lp, 'fr');
    }
  };

  // Section header: colored bar, left accent stripe, white text
  const sec = (title, color) => {
    newPage(58);
    fill(doc, M, y, CW, 27, color);
    fill(doc, M, y, 5,  27, C.white);
    star8(doc, W - M - 16, y + 13, 8, 4, C.white, 0.25);
    doc.font('Times-Bold').fontSize(10.5).fillColor(C.white);
    doc.text(title, M + 13, y + 8, { width: CW - 28, align: 'left', lineBreak: false });
    y += 34;
  };

  // Stat cards grid
  const statRow = (items) => {
    newPage(74);
    const n = items.length, gap = 5;
    const bw = Math.floor((CW - gap * (n - 1)) / n);
    items.forEach((item, i) => {
      const bx = M + i * (bw + gap);
      fill(doc, bx, y, bw, 60, item.bg);
      fill(doc, bx, y, bw, 3, item.color);
      const vs = String(item.value);
      const fs = vs.length > 9 ? 10 : vs.length > 6 ? 13 : vs.length > 4 ? 16 : 20;
      doc.font('Times-Bold').fontSize(fs).fillColor(item.color);
      const valY = y + 5 + Math.max(0, (20 - fs) * 0.6);
      doc.text(vs, bx, valY, { width: bw, align: 'center', lineBreak: false });
      doc.font('Times-Roman').fontSize(7.5).fillColor(C.gray);
      doc.text(item.label, bx, y + 45, { width: bw, align: 'center', lineBreak: false });
    });
    y += 68;
  };

  // ══ 1. PRESENTATION ══════════════════════════════════════════════════════════
  sec("1. PRESENTATION DE L'ASSOCIATION", C.navy);
  newPage(110);

  doc.font('Times-Bold').fontSize(15).fillColor(C.navy);
  doc.text((org?.name || '').toUpperCase(), M, y,
    { width: CW, align: 'center', lineBreak: false });
  y += 22;

  if (org?.nameAr) {
    doc.font('AR-Bold').fontSize(11).fillColor(C.blue);
    doc.text(ar(org.nameAr), M, y, { width: CW, align: 'center', lineBreak: false });
    y += 18;
  }

  const chips = [
    org?.city        ? org.city                                          : null,
    org?.region      ? org.region                                        : null,
    org?.foundingDate ? `Fondee le ${fmtFr(new Date(org.foundingDate))}` : null,
  ].filter(Boolean);

  if (chips.length) {
    y += 2;
    doc.font('Times-Roman').fontSize(9).fillColor(C.gray);
    doc.text(chips.join('   |   '), M, y, { width: CW, align: 'center', lineBreak: false });
    y += 14;
  }
  if (org?.email || org?.phone) {
    const c = [org.email, org.phone].filter(Boolean).join('   |   ');
    doc.font('Times-Roman').fontSize(8.5).fillColor(C.gray);
    doc.text(c, M, y, { width: CW, align: 'center', lineBreak: false });
    y += 13;
  }
  y += 5;
  hline(doc, M + 50, W - M - 50, y, C.divider, 1);
  y += 10;

  if (org?.activities) {
    newPage(48);
    doc.font('Times-Bold').fontSize(8.5).fillColor(C.blue);
    doc.text("Activites principales :", M, y, { lineBreak: false });
    y += 13;
    doc.font('Times-Roman').fontSize(9.5).fillColor(C.text);
    doc.text(org.activities, M + 8, y,
      { width: CW - 16, lineBreak: true, lineGap: 1.5, align: 'justify' });
    y = doc.y + 8;
  }
  y += 6;

  // ══ 2. MEMBRES ═══════════════════════════════════════════════════════════════
  sec('2. MEMBRES & ADHESION', C.blue);
  statRow([
    { value: members?.total       ?? 0, label: 'Total adherents', bg: C.blueL,   color: C.blue   },
    { value: members?.active      ?? 0, label: 'Membres actifs',  bg: C.greenL,  color: C.green  },
    { value: members?.board       ?? 0, label: 'Bureau',          bg: C.purpleL, color: C.purple },
    { value: members?.newThisYear ?? 0, label: `Nouveaux ${year}`,bg: C.tealL,   color: C.teal   },
  ]);

  // ══ 3. REUNIONS ══════════════════════════════════════════════════════════════
  sec('3. REUNIONS & DELIBERATIONS', C.teal);
  statRow([
    { value: meetings?.total     ?? 0, label: 'Total reunions', bg: C.tealL,   color: C.teal   },
    { value: meetings?.completed ?? 0, label: 'Tenues',         bg: C.greenL,  color: C.green  },
    { value: meetings?.scheduled ?? 0, label: 'Programmees',    bg: C.amberL,  color: C.amber  },
    { value: meetings?.decisions ?? 0, label: 'Decisions',      bg: C.purpleL, color: C.purple },
  ]);

  if (meetings?.recent?.length) {
    newPage(24 + meetings.recent.length * 22);
    fill(doc, M, y, CW, 19, C.tealL);
    fill(doc, M, y, 4,  19, C.teal);
    doc.font('Times-Bold').fontSize(8.5).fillColor(C.teal);
    doc.text('Dernieres reunions', M + 10, y + 5, { lineBreak: false });
    y += 21;
    meetings.recent.forEach((mt, idx) => {
      const d    = new Date(mt.date);
      const dStr = `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      fill(doc, M, y, CW, 20, idx % 2 === 0 ? C.grayL : C.white);
      doc.font('Times-Roman').fontSize(8.5).fillColor(C.text);
      doc.text(`${dStr}  —  ${mt.title || mt.type || '—'}`, M + 8, y + 6,
        { width: CW - 88, lineBreak: false });
      doc.font('Times-Bold').fontSize(8).fillColor(C.teal);
      doc.text(`${mt._count?.attendances ?? 0} presents`, W - M - 78, y + 6,
        { width: 74, align: 'right', lineBreak: false });
      y += 22;
    });
    y += 6;
  }

  // ══ 4. BILAN FINANCIER ═══════════════════════════════════════════════════════
  sec(`4. BILAN FINANCIER ${year}`, C.green);
  const inc = finance?.totalIncome   ?? 0;
  const exp = finance?.totalExpenses ?? 0;
  const bal = inc - exp;
  statRow([
    { value: `${inc.toLocaleString('fr-MA')} MAD`, label: 'Recettes',
      bg: C.greenL, color: C.green },
    { value: `${exp.toLocaleString('fr-MA')} MAD`, label: 'Depenses',
      bg: C.redL,   color: C.red   },
    { value: `${Math.abs(bal).toLocaleString('fr-MA')} MAD`,
      label: bal >= 0 ? 'Solde positif' : 'Solde negatif',
      bg: bal >= 0 ? C.blueL : C.redL,
      color: bal >= 0 ? C.blue : C.red },
  ]);

  // Mini bar visual
  if (inc > 0 || exp > 0) {
    newPage(58);
    const maxV = Math.max(inc, exp, 1);
    const bw   = (CW - 10) / 2 - 8;
    const maxH = 34;
    const incH = Math.round((inc / maxV) * maxH);
    const expH = Math.round((exp / maxV) * maxH);
    fill(doc, M,          y + maxH - incH, bw, incH, C.greenL);
    fill(doc, M,          y + maxH - incH, bw, 2,    C.green);
    fill(doc, M + bw + 16, y + maxH - expH, bw, expH, C.redL);
    fill(doc, M + bw + 16, y + maxH - expH, bw, 2,    C.red);
    hline(doc, M, W - M, y + maxH, C.divider, 0.8);
    doc.font('Times-Roman').fontSize(7.5).fillColor(C.gray);
    doc.text('Recettes', M,           y + maxH + 4, { width: bw, align: 'center', lineBreak: false });
    doc.text('Depenses', M + bw + 16, y + maxH + 4, { width: bw, align: 'center', lineBreak: false });
    y += maxH + 20;
  }

  // ══ 5. PROJETS & CORRESPONDANCES ══════════════════════════════════════════
  sec('5. PROJETS & CORRESPONDANCES', C.amber);
  statRow([
    { value: projects?.total      ?? 0, label: 'Total projets',     bg: C.amberL,  color: C.amber  },
    { value: projects?.completed  ?? 0, label: 'Realises',          bg: C.greenL,  color: C.green  },
    { value: projects?.inProgress ?? 0, label: 'En cours',          bg: C.blueL,   color: C.blue   },
    { value: requests?.total      ?? 0, label: 'Courriers envoyes', bg: C.purpleL, color: C.purple },
  ]);

  // ══ 6. TRANSPORT SCOLAIRE ════════════════════════════════════════════════════
  if (data.transport && (data.transport.totalStudents > 0 || data.transport.totalVehicles > 0)) {
    sec('6. TRANSPORT SCOLAIRE', C.teal);
    statRow([
      { value: data.transport.totalStudents ?? 0, label: 'Eleves transportes', bg: C.blueL,   color: C.blue   },
      { value: data.transport.totalVehicles ?? 0, label: 'Bus / Vehicules',    bg: C.tealL,   color: C.teal   },
      { value: data.transport.totalRoutes   ?? 0, label: 'Itineraires',        bg: C.purpleL, color: C.purple },
    ]);
  }

  // ══ 7. PERSPECTIVES & ORIENTATIONS ═══════════════════════════════════════════
  sec('7. PERSPECTIVES & ORIENTATIONS', C.purple);
  [
    "Renforcement des capacites institutionnelles de l'association.",
    'Poursuite des projets de developpement local et communautaire.',
    'Elargissement du reseau de partenariats et de financements.',
    'Amelioration des services rendus aux membres et aux beneficiaires.',
  ].forEach((p, idx) => {
    newPage(24);
    fill(doc, M, y, CW, 22, idx % 2 === 0 ? C.purpleL : C.grayL);
    fill(doc, M, y, 4,  22, C.purple);
    doc.font('Times-Roman').fontSize(9.5).fillColor(C.text);
    doc.text(p, M + 11, y + 6, { width: CW - 15, lineBreak: false });
    y += 24;
  });
  y += 8;

  // ══ SIGNATURE ════════════════════════════════════════════════════════════════
  newPage(92);
  const sigY = Math.max(y + 8, H - 108);
  hline(doc, M, W - M, sigY, C.divider, 1);
  const half = CW / 2;

  doc.font('Times-Bold').fontSize(10).fillColor(C.text);
  doc.text('Le Secretaire General',          M,          sigY + 12,
    { width: half, align: 'center', lineBreak: false });
  doc.text("Le President de l'Association",  M + half,   sigY + 12,
    { width: half, align: 'center', lineBreak: false });
  doc.font('Times-Roman').fontSize(8).fillColor(C.gray);
  doc.text('Cachet & Signature', M,        sigY + 24, { width: half, align: 'center', lineBreak: false });
  doc.text('Cachet & Signature', M + half, sigY + 24, { width: half, align: 'center', lineBreak: false });
  hline(doc, M + 15,        M + half - 15, sigY + 64, C.text, 0.6);
  hline(doc, M + half + 15, W - M - 15,    sigY + 64, C.text, 0.6);

  contentFooter(doc, org, 'fr', pageNum);
};

// ── ARABIC content ────────────────────────────────────────────────────────────

const arContent = (doc, data, year, lp) => {
  const { org, members, meetings, finance, projects, requests } = data;
  const W = 595, H = 842, M = 40, CW = W - 2 * M;
  const PAGE_BOTTOM = H - 34;
  let pageNum = 2;

  doc.addPage();
  let y = contentHeader(doc, org, year, lp, 'ar');

  const newPage = (needed) => {
    if (y + needed > PAGE_BOTTOM) {
      contentFooter(doc, org, 'ar', pageNum++);
      doc.addPage();
      y = contentHeader(doc, org, year, lp, 'ar');
    }
  };

  // Section header: RTL — accent stripe on RIGHT, star on LEFT
  const sec = (titleAr, color) => {
    newPage(58);
    fill(doc, M, y, CW, 27, color);
    fill(doc, W - M - 5, y, 5, 27, C.white);
    star8(doc, M + 16, y + 13, 8, 4, C.white, 0.25);
    doc.font('AR-Bold').fontSize(10.5).fillColor(C.white);
    doc.text(ar(titleAr), M + 8, y + 8,
      { width: CW - 20, align: 'right', lineBreak: false });
    y += 34;
  };

  // Stat cards — items reversed for RTL visual order
  const statRow = (items) => {
    newPage(74);
    const n = items.length, gap = 5;
    const bw = Math.floor((CW - gap * (n - 1)) / n);
    [...items].reverse().forEach((item, i) => {
      const bx = M + i * (bw + gap);
      fill(doc, bx, y, bw, 60, item.bg);
      fill(doc, bx, y, bw, 3, item.color);
      const vs = String(item.value);
      const fs = vs.length > 9 ? 10 : vs.length > 6 ? 13 : vs.length > 4 ? 16 : 20;
      doc.font('AR-Bold').fontSize(fs).fillColor(item.color);
      const valY = y + 5 + Math.max(0, (20 - fs) * 0.6);
      doc.text(vs, bx, valY, { width: bw, align: 'center', lineBreak: false });
      doc.font('AR').fontSize(7.5).fillColor(C.gray);
      doc.text(ar(item.label), bx, y + 45, { width: bw, align: 'center', lineBreak: false });
    });
    y += 68;
  };

  // ══ بسم الله ═══════════════════════════════════════════════════════════════
  doc.font('AR-Bold').fontSize(13).fillColor(C.gold);
  doc.text(ar('بسم الله الرحمن الرحيم'), M, y,
    { width: CW, align: 'center', lineBreak: false });
  y += 19;
  diamonds(doc, y, W, C.gold, 0.35, 18);
  y += 12;

  // ══ 1. تقديم الجمعية ═══════════════════════════════════════════════════════
  sec('1. تقديم الجمعية', C.navy);
  newPage(110);

  const orgNameAr = org?.nameAr || org?.name || '';
  doc.font('AR-Bold').fontSize(16).fillColor(C.navy);
  doc.text(ar(orgNameAr), M, y, { width: CW, align: 'center', lineBreak: false });
  y += 22;

  if (org?.name && org?.nameAr) {
    doc.font('Times-Roman').fontSize(11).fillColor(C.blue);
    doc.text(org.name, M, y, { width: CW, align: 'center', lineBreak: false });
    y += 17;
  }

  const chips = [
    (org?.cityAr   || org?.city)   ? (org.cityAr   || org.city)   : null,
    (org?.regionAr || org?.region) ? (org.regionAr || org.region) : null,
    org?.foundingDate
      ? `${new Date(org.foundingDate).getDate()} ${AR_MONTHS[new Date(org.foundingDate).getMonth()]} ${new Date(org.foundingDate).getFullYear()}`
      : null,
  ].filter(Boolean);

  if (chips.length) {
    y += 2;
    doc.font('AR').fontSize(9).fillColor(C.gray);
    doc.text(ar(chips.join('   |   ')), M, y, { width: CW, align: 'center', lineBreak: false });
    y += 14;
  }
  if (org?.email || org?.phone) {
    const c = [org.email, org.phone].filter(Boolean).join('   |   ');
    doc.font('AR').fontSize(8.5).fillColor(C.gray);
    doc.text(ar(c), M, y, { width: CW, align: 'center', lineBreak: false });
    y += 13;
  }
  y += 5;
  hline(doc, M + 50, W - M - 50, y, C.divider, 1);
  y += 10;

  if (org?.activitiesAr || org?.activities) {
    newPage(48);
    doc.font('AR-Bold').fontSize(8.5).fillColor(C.blue);
    doc.text(ar('انشطة الجمعية :'), M, y,
      { width: CW, align: 'right', lineBreak: false });
    y += 13;
    const actText = org.activitiesAr || org.activities;
    const shaped  = arabicReshaper.convertArabic(actText);
    doc.font('AR').fontSize(9.5).fillColor(C.text);
    doc.text(shaped.split(' ').reverse().join(' '), M + 8, y,
      { width: CW - 16, align: 'right', lineBreak: true, lineGap: 1.5 });
    y = doc.y + 8;
  }
  y += 6;

  // ══ 2. الاعضاء والانخراط ══════════════════════════════════════════════════
  sec('2. الاعضاء والانخراط', C.blue);
  statRow([
    { value: members?.total       ?? 0, label: 'مجموع الاعضاء',    bg: C.blueL,   color: C.blue   },
    { value: members?.active      ?? 0, label: 'الاعضاء النشطون',  bg: C.greenL,  color: C.green  },
    { value: members?.board       ?? 0, label: 'اعضاء المكتب',     bg: C.purpleL, color: C.purple },
    { value: members?.newThisYear ?? 0, label: `منخرطون ${year}`,  bg: C.tealL,   color: C.teal   },
  ]);

  // ══ 3. الاجتماعات والمداولات ══════════════════════════════════════════════
  sec('3. الاجتماعات والمداولات', C.teal);
  statRow([
    { value: meetings?.total     ?? 0, label: 'مجموع الاجتماعات',    bg: C.tealL,   color: C.teal   },
    { value: meetings?.completed ?? 0, label: 'الاجتماعات المنعقدة', bg: C.greenL,  color: C.green  },
    { value: meetings?.scheduled ?? 0, label: 'المبرمجة',            bg: C.amberL,  color: C.amber  },
    { value: meetings?.decisions ?? 0, label: 'القرارات',            bg: C.purpleL, color: C.purple },
  ]);

  if (meetings?.recent?.length) {
    newPage(24 + meetings.recent.length * 22);
    fill(doc, M, y, CW, 19, C.tealL);
    fill(doc, W - M - 4, y, 4, 19, C.teal);
    doc.font('AR-Bold').fontSize(8.5).fillColor(C.teal);
    doc.text(ar('اخر الاجتماعات'), M, y + 5,
      { width: CW - 8, align: 'right', lineBreak: false });
    y += 21;
    meetings.recent.forEach((mt, idx) => {
      const d    = new Date(mt.date);
      const dStr = `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      fill(doc, M, y, CW, 20, idx % 2 === 0 ? C.grayL : C.white);
      // RTL: title on right, attendees count on left, date on far left
      doc.font('AR').fontSize(8.5).fillColor(C.text);
      doc.text(ar(mt.title || mt.type || '—'), M + 82, y + 6,
        { width: CW - 88, align: 'right', lineBreak: false });
      doc.font('AR-Bold').fontSize(8).fillColor(C.teal);
      doc.text(ar(dStr), M, y + 6, { width: 78, align: 'left', lineBreak: false });
      y += 22;
    });
    y += 6;
  }

  // ══ 4. الوضعية المالية ════════════════════════════════════════════════════
  sec(`4. الوضعية المالية ${year}`, C.green);
  const inc = finance?.totalIncome   ?? 0;
  const exp = finance?.totalExpenses ?? 0;
  const bal = inc - exp;
  statRow([
    { value: `${inc.toLocaleString('fr-MA')} د.م`, label: 'المداخيل',
      bg: C.greenL, color: C.green },
    { value: `${exp.toLocaleString('fr-MA')} د.م`, label: 'المصاريف',
      bg: C.redL,   color: C.red   },
    { value: `${Math.abs(bal).toLocaleString('fr-MA')} د.م`,
      label: bal >= 0 ? 'الرصيد الايجابي' : 'رصيد سلبي',
      bg:    bal >= 0 ? C.blueL : C.redL,
      color: bal >= 0 ? C.blue  : C.red },
  ]);

  // Mini bar visual (RTL: مداخيل on right, مصاريف on left)
  if (inc > 0 || exp > 0) {
    newPage(58);
    const maxV = Math.max(inc, exp, 1);
    const bw   = (CW - 10) / 2 - 8;
    const maxH = 34;
    const incH = Math.round((inc / maxV) * maxH);
    const expH = Math.round((exp / maxV) * maxH);
    // RTL: income bar on right side
    fill(doc, M + bw + 16, y + maxH - incH, bw, incH, C.greenL);
    fill(doc, M + bw + 16, y + maxH - incH, bw, 2,    C.green);
    fill(doc, M,           y + maxH - expH, bw, expH, C.redL);
    fill(doc, M,           y + maxH - expH, bw, 2,    C.red);
    hline(doc, M, W - M, y + maxH, C.divider, 0.8);
    doc.font('AR').fontSize(7.5).fillColor(C.gray);
    doc.text(ar('المداخيل'), M + bw + 16, y + maxH + 4, { width: bw, align: 'center', lineBreak: false });
    doc.text(ar('المصاريف'), M,           y + maxH + 4, { width: bw, align: 'center', lineBreak: false });
    y += maxH + 20;
  }

  // ══ 5. المشاريع والمراسلات ════════════════════════════════════════════════
  sec('5. المشاريع والمراسلات', C.amber);
  statRow([
    { value: projects?.total      ?? 0, label: 'المشاريع الكلية', bg: C.amberL,  color: C.amber  },
    { value: projects?.completed  ?? 0, label: 'المنجزة',         bg: C.greenL,  color: C.green  },
    { value: projects?.inProgress ?? 0, label: 'قيد الانجاز',    bg: C.blueL,   color: C.blue   },
    { value: requests?.total      ?? 0, label: 'المراسلات',      bg: C.purpleL, color: C.purple },
  ]);

  // ══ 6. النقل المدرسي ══════════════════════════════════════════════════════
  if (data.transport && (data.transport.totalStudents > 0 || data.transport.totalVehicles > 0)) {
    sec('6. النقل المدرسي', C.teal);
    statRow([
      { value: data.transport.totalStudents ?? 0, label: 'الطلاب المنقولون', bg: C.blueL,   color: C.blue   },
      { value: data.transport.totalVehicles ?? 0, label: 'الحافلات',          bg: C.tealL,   color: C.teal   },
      { value: data.transport.totalRoutes   ?? 0, label: 'المسارات',          bg: C.purpleL, color: C.purple },
    ]);
  }

  // ══ 7. التوجهات والافاق ═══════════════════════════════════════════════════
  sec('7. التوجهات والافاق', C.purple);
  [
    'تعزيز القدرات المؤسسية للجمعية وتطوير هياكلها التنظيمية.',
    'مواصلة تنفيذ مشاريع التنمية المحلية وخدمة المجتمع.',
    'توسيع شبكة الشراكات وتنويع مصادر التمويل.',
    'تحسين الخدمات المقدمة للمنخرطين والمستفيدين.',
  ].forEach((o, idx) => {
    newPage(24);
    fill(doc, M, y, CW, 22, idx % 2 === 0 ? C.purpleL : C.grayL);
    fill(doc, W - M - 4, y, 4, 22, C.purple);
    const shaped = arabicReshaper.convertArabic(o);
    doc.font('AR').fontSize(9.5).fillColor(C.text);
    doc.text(shaped.split(' ').reverse().join(' '), M, y + 6,
      { width: CW - 8, align: 'right', lineBreak: false });
    y += 24;
  });
  y += 8;

  // ══ SIGNATURE ════════════════════════════════════════════════════════════════
  newPage(92);
  const sigY = Math.max(y + 8, H - 108);
  hline(doc, M, W - M, sigY, C.divider, 1);
  const half = CW / 2;

  doc.font('AR-Bold').fontSize(10).fillColor(C.text);
  // RTL: president on right half, secretary on left half
  doc.text(ar('رئيس الجمعية'), M + half, sigY + 12,
    { width: half, align: 'right', lineBreak: false });
  doc.text(ar('الكاتب العام'),  M,         sigY + 12,
    { width: half, align: 'left',  lineBreak: false });
  doc.font('AR').fontSize(8).fillColor(C.gray);
  doc.text(ar('الختم والتوقيع'), M + half, sigY + 24,
    { width: half, align: 'right', lineBreak: false });
  doc.text(ar('الختم والتوقيع'), M,         sigY + 24,
    { width: half, align: 'left',  lineBreak: false });
  hline(doc, M + half + 15, W - M - 12, sigY + 64, C.text, 0.6);
  hline(doc, M + 12,         M + half - 15, sigY + 64, C.text, 0.6);

  contentFooter(doc, org, 'ar', pageNum);
};

// ── ENTRY POINT ───────────────────────────────────────────────────────────────

const generateLiteraryReportPdf = (data, lang, year, res) => {
  const doc = new PDFDocument({
    size: 'A4', margin: 0, autoFirstPage: true,
    info: {
      Title:  lang === 'fr' ? `Rapport d'activites ${year}` : `التقرير الادبي ${year}`,
      Author: data.org?.name || 'Mar E-A.C',
    },
  });

  const fontsExist = fs.existsSync(FONT_AR) && fs.existsSync(FONT_BOLD);
  if (fontsExist) {
    doc.registerFont('AR',      FONT_AR);
    doc.registerFont('AR-Bold', FONT_BOLD);
  } else {
    console.warn('[PDF] Arabic fonts missing — Helvetica fallback');
    doc.registerFont('AR',      'Helvetica');
    doc.registerFont('AR-Bold', 'Helvetica-Bold');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="rapport-${year}-${lang}.pdf"`);
  doc.pipe(res);

  const lp = logoPath(data.org);
  drawCover(doc, data.org, year, lp, lang);
  if (lang === 'fr') frContent(doc, data, year, lp);
  else               arContent(doc, data, year, lp);

  doc.end();
};

module.exports = { generateLiteraryReportPdf };
