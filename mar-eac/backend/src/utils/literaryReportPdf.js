const PDFDocument    = require('pdfkit');
const path           = require('path');
const fs             = require('fs');
const arabicReshaper = require('arabic-reshaper');

const FONT_DIR   = path.join(__dirname, '../assets/fonts');
const FONT_AR    = path.join(FONT_DIR, 'Amiri-Regular.ttf');
const FONT_BOLD  = path.join(FONT_DIR, 'Amiri-Bold.ttf');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('./uploads');

const ar = (t) => {
  if (!t) return '';
  const shaped = arabicReshaper.convertArabic(String(t));
  return shaped.split(' ').reverse().join(' ');
};

const fill  = (doc, x, y, w, h, color) => {
  if (color) doc.save().rect(x, y, w, h).fill(color).restore();
};
const fillO = (doc, x, y, w, h, color, op) => {
  doc.save().fillOpacity(op).rect(x, y, w, h).fill(color).fillOpacity(1).restore();
};
const hline = (doc, x1, x2, y, color = '#cfd8dc', lw = 0.5) => {
  doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(lw).stroke(color).restore();
};

const FR_MONTHS = ['janvier','février','mars','avril','mai','juin',
                   'juillet','août','septembre','octobre','novembre','décembre'];
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','ماي','يونيو',
                   'يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر'];

const fmtFr = (d = new Date()) => `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const fmtAr = (d = new Date()) =>
  `${String(d.getDate()).padStart(2,'0')} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;

const logoPath = (org) => {
  if (!org?.logo) return null;
  return [
    path.join(UPLOAD_DIR, path.basename(org.logo)),
    path.join(process.cwd(), 'uploads', path.basename(org.logo)),
  ].find(p => fs.existsSync(p)) || null;
};

const C = {
  navy   : '#0d2b5e', navyMid: '#1a3f7a', navyL: '#1e4080',
  blue   : '#1565c0', blueL  : '#dbeafe',
  teal   : '#0e7490', tealL  : '#cffafe',
  green  : '#15803d', greenL : '#dcfce7',
  amber  : '#b45309', amberL : '#fef3c7',
  red    : '#b91c1c', redL   : '#fee2e2',
  purple : '#6d28d9', purpleL: '#ede9fe',
  gray   : '#475569', grayL  : '#f1f5f9', grayAlt: '#e8eef4',
  text   : '#1e293b', white  : '#ffffff',
  gold   : '#c59a0a', accent : '#0284c7',
  divider: '#e2e8f0', footerBg: '#0a1f44',
};

// ── Geometric motif helpers ──────────────────────────────────────────────────

// 8-point star
const star8 = (doc, cx, cy, outerR, innerR, color, op) => {
  doc.save().fillColor(color).fillOpacity(op);
  let first = true;
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI / 8) - Math.PI / 2;
    const r     = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (first) { doc.moveTo(x, y); first = false; }
    else doc.lineTo(x, y);
  }
  doc.closePath().fill();
  doc.restore();
};

// Concentric circle outlines
const rings = (doc, cx, cy, radii, color, op, lw = 0.6) => {
  doc.save().strokeColor(color).strokeOpacity(op).lineWidth(lw);
  radii.forEach(r => doc.circle(cx, cy, r).stroke());
  doc.restore();
};

// Corner rosette: 6 circles around a centre circle (Islamic pattern)
const rosette = (doc, cx, cy, r, color, op) => {
  doc.save().strokeColor(color).strokeOpacity(op).lineWidth(0.5);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    doc.circle(cx + r * Math.cos(a), cy + r * Math.sin(a), r).stroke();
  }
  doc.circle(cx, cy, r).stroke();
  doc.restore();
};

// Subtle dot grid
const dotGrid = (doc, W, H, spacing, color, op, dotR = 0.7) => {
  doc.save().fillColor(color).fillOpacity(op);
  for (let gx = spacing; gx < W; gx += spacing)
    for (let gy = spacing; gy < H; gy += spacing)
      doc.circle(gx, gy, dotR).fill();
  doc.restore();
};

// Diamond row separator
const diamonds = (doc, y, W, color, op, step = 18) => {
  doc.save().fillColor(color).fillOpacity(op);
  for (let x = step; x < W; x += step) {
    doc.moveTo(x, y - 3).lineTo(x + 3, y).lineTo(x, y + 3).lineTo(x - 3, y)
       .closePath().fill();
  }
  doc.restore();
};

// ── COVER (shared structure, lang-aware) ─────────────────────────────────────

const drawCover = (doc, org, year, lp, lang) => {
  const W = 595, H = 842, M = 45, CW = W - 2 * M;
  const today = new Date();
  const isFr  = lang === 'fr';

  // ── Background zones ───────────────────────────────────────────────────────
  fill(doc, 0, 0,       W, H * 0.62,  C.navy);
  fill(doc, 0, H * 0.62,W, H * 0.38,  C.navyMid);

  // ── Motif layer 1: subtle dot grid across whole page ────────────────────────
  dotGrid(doc, W, H, 22, C.white, 0.04);

  // ── Motif layer 2: four corner rosettes ─────────────────────────────────────
  const cr = 52;
  rosette(doc, 0,   0,   cr, C.accent, 0.22);
  rosette(doc, W,   0,   cr, C.accent, 0.22);
  rosette(doc, 0,   H,   cr, C.accent, 0.18);
  rosette(doc, W,   H,   cr, C.accent, 0.18);

  // ── Motif layer 3: large background star centres ────────────────────────────
  star8(doc, 60,     80,     45, 20, C.accent, 0.10);
  star8(doc, W - 60, 80,     45, 20, C.accent, 0.10);
  star8(doc, 60,     H - 80, 40, 18, C.accent, 0.08);
  star8(doc, W - 60, H - 80, 40, 18, C.accent, 0.08);

  // ── Motif layer 4: 8-point star medallion behind logo ──────────────────────
  star8(doc, W / 2, 124, 72, 32, C.accent, 0.13);
  rings(doc, W / 2, 124, [58, 68, 78], C.white, 0.07);

  // ── Accent frame lines ────────────────────────────────────────────────────
  fill(doc, 0, 0,     W, 5,   C.accent);
  fill(doc, 0, H - 5, W, 5,   C.accent);
  fill(doc, 0, 0,     5, H,   C.accent);
  fill(doc, W - 5, 0, 5, H,   C.accent);

  // Inner accent frame
  doc.save().strokeColor(C.accent).strokeOpacity(0.3).lineWidth(0.8)
     .rect(14, 14, W - 28, H - 28).stroke().restore();

  // ── Diamond row decoration at 60% separator ────────────────────────────────
  fill(doc, 30, H * 0.62 - 1, W - 60, 2, C.accent);
  diamonds(doc, H * 0.62, W, C.gold, 0.55);

  // ── Bottom footer band ─────────────────────────────────────────────────────
  fill(doc, 0, H - 52, W, 52, C.footerBg);
  fill(doc, 0, H - 52, W, 2,  C.accent);

  // ── Logo ──────────────────────────────────────────────────────────────────
  const logoY = 46;
  if (lp) {
    try { doc.image(lp, W / 2 - 44, logoY + 8, { fit: [88, 88] }); } catch (_) {}
  } else {
    doc.font(isFr ? 'Times-Bold' : 'AR-Bold').fontSize(38).fillColor(C.white);
    const init = isFr
      ? (org?.name || 'J').substring(0, 2).toUpperCase()
      : ar((org?.nameAr || org?.name || 'ج').charAt(0));
    doc.text(init, W / 2 - 50, logoY + 26, { width: 100, align: 'center', lineBreak: false });
  }

  // ── Arabic bismillah (both covers, more prominent on Arabic) ───────────────
  if (!isFr) {
    doc.font('AR-Bold').fontSize(11).fillColor(C.gold);
    doc.text(ar('بسم الله الرحمن الرحيم'), M, 18, { width: CW, align: 'center', lineBreak: false });
  }

  // ── Report type label ──────────────────────────────────────────────────────
  const labelY = 158;
  doc.font(isFr ? 'Times-Bold' : 'AR-Bold').fontSize(9).fillColor('#7dd3fc');
  if (isFr) {
    doc.text('RAPPORT MORAL & D\'ACTIVITES', M, labelY, { width: CW, align: 'center', lineBreak: false });
  } else {
    doc.text(ar('التقرير الادبي والانشطة'), M, labelY, { width: CW, align: 'center', lineBreak: false });
  }

  // Small diamond line under label
  diamonds(doc, labelY + 14, W, C.gold, 0.4, 14);

  // ── Main org name ──────────────────────────────────────────────────────────
  const nameY = 180;
  if (isFr) {
    doc.font('Times-Bold').fontSize(22).fillColor(C.white);
    doc.text((org?.name || '').toUpperCase(), M, nameY, { width: CW, align: 'center', lineBreak: false });
    if (org?.nameAr) {
      doc.font('AR-Bold').fontSize(14).fillColor('#93c5fd');
      doc.text(ar(org.nameAr), M, nameY + 30, { width: CW, align: 'center', lineBreak: false });
    }
  } else {
    doc.font('AR-Bold').fontSize(22).fillColor(C.white);
    doc.text(ar(org?.nameAr || org?.name || ''), M, nameY, { width: CW, align: 'center', lineBreak: false });
    if (org?.name && org?.nameAr) {
      doc.font('AR').fontSize(13).fillColor('#93c5fd');
      doc.text(org.name, M, nameY + 30, { width: CW, align: 'center', lineBreak: false });
    }
  }

  // ── Year badge ────────────────────────────────────────────────────────────
  const badgeY = 228;
  fill(doc, W / 2 - 52, badgeY, 104, 32, C.accent);
  star8(doc, W / 2 - 54, badgeY + 16, 8, 4, C.gold, 0.7);
  star8(doc, W / 2 + 54, badgeY + 16, 8, 4, C.gold, 0.7);
  doc.font(isFr ? 'Times-Bold' : 'AR-Bold').fontSize(19).fillColor(C.white);
  doc.text(String(year), W / 2 - 52, badgeY + 7, { width: 104, align: 'center', lineBreak: false });

  // ── Info lines (bottom half) ──────────────────────────────────────────────
  const infoData = isFr ? [
    org?.city                ? `Ville : ${org.city}`                                             : null,
    org?.region              ? `Region : ${org.region}`                                          : null,
    org?.foundingDate        ? `Fondee le ${fmtFr(new Date(org.foundingDate))}`                  : null,
    org?.email               ? org.email                                                          : null,
    org?.phone               ? org.phone                                                          : null,
  ] : [
    (org?.cityAr || org?.city)     ? ar(`المدينة : ${org.cityAr || org.city}`)                   : null,
    (org?.regionAr || org?.region) ? ar(`الجهة : ${org.regionAr || org.region}`)                 : null,
    org?.foundingDate              ? ar(`تاسست في : ${fmtAr(new Date(org.foundingDate))}`)       : null,
    org?.email                     ? org.email                                                     : null,
    org?.phone                     ? org.phone                                                     : null,
  ];
  const lines = infoData.filter(Boolean);

  let iy = H * 0.62 + 20;
  lines.forEach((line, idx) => {
    fillO(doc, M + 50, iy, CW - 100, 22, C.white, idx % 2 === 0 ? 0.06 : 0.03);
    doc.font(isFr ? 'Times-Roman' : 'AR').fontSize(9.5).fillColor('#bae6fd');
    doc.text(line, M + 50, iy + 6, { width: CW - 100, align: 'center', lineBreak: false });
    iy += 26;
  });

  // ── Footer date ────────────────────────────────────────────────────────────
  doc.font(isFr ? 'Times-Roman' : 'AR').fontSize(8).fillColor('#64748b');
  const dateLabel = isFr ? `Genere le ${fmtFr(today)}` : ar(`صدر بتاريخ ${fmtAr(today)}`);
  doc.text(dateLabel, M, H - 34, { width: CW, align: 'center', lineBreak: false });
};

// ── Content page header (redrawn on overflow pages) ──────────────────────────

const contentHeader = (doc, org, year, lp, lang) => {
  const W = 595, M = 45, CW = W - 2 * M;
  const isFr = lang === 'fr';
  fill(doc, 0, 0, W, 68, C.navy);
  fill(doc, 0, 68, W, 3, C.accent);
  fill(doc, 0, 0, 4, 68, C.accent);
  fill(doc, W - 4, 0, 4, 68, C.accent);
  // Small corner stars on header
  star8(doc, W - 16, 8, 10, 5, C.accent, 0.25);
  star8(doc, 16, 8, 10, 5, C.accent, 0.25);

  if (lp) {
    try {
      const logoX = isFr ? M : W - M - 48;
      doc.image(lp, logoX, 8, { fit: [48, 48] });
    } catch (_) {}
  }
  const nameStr = isFr ? (org?.name || '').toUpperCase() : ar(org?.nameAr || org?.name || '');
  const fontBold = isFr ? 'Times-Bold' : 'AR-Bold';
  const fontReg  = isFr ? 'Times-Roman' : 'AR';
  const align    = isFr ? 'left' : 'right';
  const textX    = isFr ? M + 58 : M;
  const textW    = CW - 60;

  doc.font(fontBold).fontSize(13).fillColor(C.white);
  doc.text(nameStr, textX, 12, { width: textW, align, lineBreak: false });
  doc.font(fontReg).fontSize(8).fillColor('#93c5fd');
  const subLine = isFr
    ? `Rapport d'activites ${year}  |  ${fmtFr()}`
    : ar(`التقرير الادبي ${year}  |  ${fmtAr()}`);
  doc.text(subLine, textX, 30, { width: textW, align, lineBreak: false });
  const contact = [org?.city, org?.phone].filter(Boolean).join('  |  ');
  if (contact) {
    doc.font(fontReg).fontSize(7.5).fillColor('#bfdbfe');
    const cStr = isFr ? contact : ar(contact);
    doc.text(cStr, textX, 46, { width: textW, align, lineBreak: false });
  }
  return 78; // y after header
};

// ── Content page footer ───────────────────────────────────────────────────────

const contentFooter = (doc, org, lang) => {
  const W = 595, H = 842, M = 45, CW = W - 2 * M;
  fill(doc, 0, H - 22, W, 22, C.navy);
  hline(doc, 0, W, H - 22, C.accent, 1.5);
  doc.font(lang === 'fr' ? 'Times-Roman' : 'AR').fontSize(7).fillColor('#93c5fd');
  const ft = [org?.name, org?.city, org?.phone].filter(Boolean).join('  |  ');
  doc.text(lang === 'fr' ? ft : ar(ft), M, H - 13, { width: CW, align: 'center', lineBreak: false });
};

// ── FRENCH content page ───────────────────────────────────────────────────────

const frContent = (doc, data, year, lp) => {
  const { org, members, meetings, finance, projects, requests } = data;
  const W = 595, H = 842, M = 45, CW = W - 2 * M;
  const FOOTER_H = 30;
  const PAGE_BOTTOM = H - FOOTER_H;

  doc.addPage();
  let y = contentHeader(doc, org, year, lp, 'fr');

  // ── Helpers ────────────────────────────────────────────────────────────────

  const newPageIfNeeded = (needed) => {
    if (y + needed > PAGE_BOTTOM) {
      contentFooter(doc, org, 'fr');
      doc.addPage();
      y = contentHeader(doc, org, year, lp, 'fr');
    }
  };

  const sec = (title, color = C.navy) => {
    newPageIfNeeded(60);
    fill(doc, M, y, CW, 25, color);
    fill(doc, M, y, 5, 25, C.white);
    // Small star decoration on right
    star8(doc, W - M - 14, y + 12, 8, 4, C.white, 0.3);
    doc.font('Times-Bold').fontSize(10.5).fillColor(C.white);
    doc.text(title, M + 14, y + 7, { width: CW - 30, align: 'left', lineBreak: false });
    y += 32;
  };

  const statRow = (items) => {
    newPageIfNeeded(66);
    const gap = 4;
    const bw  = Math.floor((CW - gap * (items.length - 1)) / items.length);
    items.forEach((item, i) => {
      const bx  = M + i * (bw + gap);
      fill(doc, bx, y, bw, 56, item.bg);
      const vs  = String(item.value);
      const fs  = vs.length > 7 ? 11 : vs.length > 4 ? 15 : 21;
      doc.font('Times-Bold').fontSize(fs).fillColor(item.color);
      doc.text(vs, bx, y + (fs < 15 ? 16 : fs < 21 ? 13 : 8), { width: bw, align: 'center', lineBreak: false });
      doc.font('Times-Roman').fontSize(7.5).fillColor(item.color);
      doc.text(item.label, bx, y + 40, { width: bw, align: 'center', lineBreak: false });
    });
    y += 63;
  };

  // ══ 1. PRESENTATION — no grid, centered layout ════════════════════════════

  sec('1. PRESENTATION DE L\'ASSOCIATION', C.navy);
  newPageIfNeeded(120);

  // Centered info block (no table/quadrillage)
  fillO(doc, M + 20, y, CW - 40, 14, C.accent, 0.08);
  doc.font('Times-Bold').fontSize(16).fillColor(C.navy);
  doc.text((org?.name || '').toUpperCase(), M, y + 2, { width: CW, align: 'center', lineBreak: false });
  y += 22;

  if (org?.nameAr) {
    doc.font('AR-Bold').fontSize(12).fillColor(C.blue);
    doc.text(ar(org.nameAr), M, y, { width: CW, align: 'center', lineBreak: false });
    y += 18;
  }

  // Info chips row (city | region | date)
  const chips = [
    org?.city        ? org.city                              : null,
    org?.region      ? org.region                           : null,
    org?.foundingDate
      ? `Fondee le ${fmtFr(new Date(org.foundingDate))}`   : null,
  ].filter(Boolean);

  if (chips.length) {
    y += 4;
    doc.font('Times-Roman').fontSize(9.5).fillColor(C.gray);
    doc.text(chips.join('   |   '), M, y, { width: CW, align: 'center', lineBreak: false });
    y += 16;
  }

  if (org?.email || org?.phone) {
    const contact = [org?.email, org?.phone].filter(Boolean).join('  |  ');
    doc.font('Times-Roman').fontSize(8.5).fillColor(C.gray);
    doc.text(contact, M, y, { width: CW, align: 'center', lineBreak: false });
    y += 14;
  }

  // Diamond separator
  y += 4;
  diamonds(doc, y, W, C.navy, 0.18, 18);
  y += 10;

  if (org?.activities) {
    newPageIfNeeded(50);
    doc.font('Times-Bold').fontSize(8.5).fillColor(C.blue);
    doc.text('Activites de l\'association :', M, y, { lineBreak: false });
    y += 14;
    doc.font('Times-Roman').fontSize(9.5).fillColor(C.text);
    doc.text(org.activities, M + 10, y, { width: CW - 20, lineBreak: true, lineGap: 1.5, align: 'justify' });
    y = doc.y + 8;
  }
  y += 6;

  // ══ 2. MEMBRES ═══════════════════════════════════════════════════════════════
  sec('2. MEMBRES & ADHESION', C.blue);
  statRow([
    { value: members?.total ?? 0,       label: 'Total adherents', bg: C.blueL,   color: C.blue },
    { value: members?.active ?? 0,      label: 'Membres actifs',  bg: C.greenL,  color: C.green },
    { value: members?.board ?? 0,       label: 'Bureau',          bg: C.purpleL, color: C.purple },
    { value: members?.newThisYear ?? 0, label: `Nouveaux ${year}`,bg: C.tealL,   color: C.teal },
  ]);

  // ══ 3. REUNIONS ══════════════════════════════════════════════════════════════
  sec('3. REUNIONS & DELIBERATIONS', C.teal);
  statRow([
    { value: meetings?.total ?? 0,     label: 'Total reunions', bg: C.tealL,   color: C.teal },
    { value: meetings?.completed ?? 0, label: 'Tenues',         bg: C.greenL,  color: C.green },
    { value: meetings?.scheduled ?? 0, label: 'Programmees',    bg: C.amberL,  color: C.amber },
    { value: meetings?.decisions ?? 0, label: 'Decisions',      bg: C.purpleL, color: C.purple },
  ]);

  if (meetings?.recent?.length) {
    newPageIfNeeded(20 + meetings.recent.length * 21);
    fill(doc, M, y, CW, 16, C.tealL);
    doc.font('Times-Bold').fontSize(8.5).fillColor(C.teal);
    doc.text('Dernieres reunions', M + 8, y + 4, { lineBreak: false });
    y += 18;
    meetings.recent.forEach((mt, idx) => {
      const d    = new Date(mt.date);
      const dStr = `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      fill(doc, M, y, CW, 19, idx % 2 === 0 ? C.grayL : C.white);
      doc.font('Times-Roman').fontSize(8.5).fillColor(C.text);
      doc.text(`${dStr}  -  ${mt.title || mt.type || '—'}`, M + 8, y + 5, { width: CW - 90, lineBreak: false });
      doc.font('Times-Bold').fontSize(8.5).fillColor(C.teal);
      doc.text(`${mt._count?.attendances ?? 0} presents`, W - M - 78, y + 5, { width: 73, align: 'right', lineBreak: false });
      y += 21;
    });
    y += 4;
  }

  // ══ 4. FINANCES ══════════════════════════════════════════════════════════════
  sec(`4. BILAN FINANCIER ${year}`, C.green);
  const inc = finance?.totalIncome ?? 0;
  const exp = finance?.totalExpenses ?? 0;
  const bal = inc - exp;
  statRow([
    { value: `${inc.toLocaleString('fr-MA')} MAD`, label: 'Recettes',  bg: C.greenL, color: C.green },
    { value: `${exp.toLocaleString('fr-MA')} MAD`, label: 'Depenses',  bg: C.redL,   color: C.red },
    { value: `${Math.abs(bal).toLocaleString('fr-MA')} MAD`,
      label: bal >= 0 ? 'Solde positif' : 'Solde negatif',
      bg: bal >= 0 ? C.blueL : C.redL, color: bal >= 0 ? C.blue : C.red },
  ]);

  // ══ 5. PROJETS ════════════════════════════════════════════════════════════════
  sec('5. PROJETS & CORRESPONDANCES', C.amber);
  statRow([
    { value: projects?.total ?? 0,      label: 'Total projets',     bg: C.amberL,  color: C.amber },
    { value: projects?.completed ?? 0,  label: 'Realises',          bg: C.greenL,  color: C.green },
    { value: projects?.inProgress ?? 0, label: 'En cours',          bg: C.blueL,   color: C.blue },
    { value: requests?.total ?? 0,      label: 'Courriers envoyes', bg: C.purpleL, color: C.purple },
  ]);

  // ══ 6. PERSPECTIVES ══════════════════════════════════════════════════════════
  sec('6. PERSPECTIVES & ORIENTATIONS', C.purple);
  [
    'Renforcement des capacites institutionnelles de l\'association.',
    'Poursuite des projets de developpement local et communautaire.',
    'Elargissement du reseau de partenariats et de financements.',
    'Amelioration des services rendus aux membres et aux beneficiaires.',
  ].forEach((p, idx) => {
    newPageIfNeeded(20);
    fill(doc, M, y, CW, 19, idx % 2 === 0 ? C.purpleL : C.grayL);
    fill(doc, M, y, 4, 19, C.purple);
    doc.font('Times-Roman').fontSize(9.5).fillColor(C.text);
    doc.text(p, M + 10, y + 5, { width: CW - 14, lineBreak: false });
    y += 21;
  });
  y += 8;

  // ══ SIGNATURE ════════════════════════════════════════════════════════════════
  newPageIfNeeded(90);
  const sigY = Math.max(y + 8, H - 100);
  hline(doc, M, W - M, sigY, C.divider, 1);
  const half = CW / 2;
  doc.font('Times-Bold').fontSize(10).fillColor(C.text);
  doc.text('Le Secretaire General', M, sigY + 10, { width: half, align: 'center', lineBreak: false });
  doc.text('Le President de l\'Association', M + half, sigY + 10, { width: half, align: 'center', lineBreak: false });
  doc.font('Times-Roman').fontSize(8.5).fillColor(C.gray);
  doc.text('Cachet & Signature', M, sigY + 23, { width: half, align: 'center', lineBreak: false });
  doc.text('Cachet & Signature', M + half, sigY + 23, { width: half, align: 'center', lineBreak: false });
  hline(doc, M + 15, M + half - 15, sigY + 60, C.text, 0.7);
  hline(doc, M + half + 15, W - M - 15, sigY + 60, C.text, 0.7);

  contentFooter(doc, org, 'fr');
};

// ── ARABIC content page ────────────────────────────────────────────────────────

const arContent = (doc, data, year, lp) => {
  const { org, members, meetings, finance, projects, requests } = data;
  const W = 595, H = 842, M = 40, CW = W - 2 * M;
  const FOOTER_H = 30;
  const PAGE_BOTTOM = H - FOOTER_H;

  doc.addPage();
  let y = contentHeader(doc, org, year, lp, 'ar');

  const newPageIfNeeded = (needed) => {
    if (y + needed > PAGE_BOTTOM) {
      contentFooter(doc, org, 'ar');
      doc.addPage();
      y = contentHeader(doc, org, year, lp, 'ar');
    }
  };

  const sec = (titleAr, color = C.navy) => {
    newPageIfNeeded(60);
    fill(doc, M, y, CW, 25, color);
    fill(doc, W - M - 5, y, 5, 25, C.white);
    star8(doc, M + 14, y + 12, 8, 4, C.white, 0.3);
    doc.font('AR-Bold').fontSize(10.5).fillColor(C.white);
    doc.text(ar(titleAr), M + 8, y + 7, { width: CW - 24, align: 'right', lineBreak: false });
    y += 32;
  };

  const statRow = (items) => {
    newPageIfNeeded(66);
    const gap = 4;
    const bw  = Math.floor((CW - gap * (items.length - 1)) / items.length);
    [...items].reverse().forEach((item, i) => {
      const bx  = M + i * (bw + gap);
      fill(doc, bx, y, bw, 56, item.bg);
      const vs  = String(item.value);
      const fs  = vs.length > 7 ? 11 : vs.length > 4 ? 15 : 21;
      doc.font('AR-Bold').fontSize(fs).fillColor(item.color);
      doc.text(vs, bx, y + (fs < 15 ? 16 : fs < 21 ? 13 : 8), { width: bw, align: 'center', lineBreak: false });
      doc.font('AR').fontSize(7.5).fillColor(item.color);
      doc.text(ar(item.label), bx, y + 40, { width: bw, align: 'center', lineBreak: false });
    });
    y += 63;
  };

  // ══ بسم الله ═════════════════════════════════════════════════════════════════
  doc.font('AR-Bold').fontSize(13).fillColor(C.gold);
  doc.text(ar('بسم الله الرحمن الرحيم'), M, y, { width: CW, align: 'center', lineBreak: false });
  y += 16;
  diamonds(doc, y, W, C.gold, 0.35, 18);
  y += 10;

  // ══ 1. تقديم الجمعية — no grid, centered ══════════════════════════════════════

  sec('1. تقديم الجمعية', C.navy);
  newPageIfNeeded(120);

  // Centered org name (no table)
  fillO(doc, M + 20, y, CW - 40, 14, C.accent, 0.07);
  const orgNameAr = org?.nameAr || org?.name || '';
  doc.font('AR-Bold').fontSize(17).fillColor(C.navy);
  doc.text(ar(orgNameAr), M, y + 1, { width: CW, align: 'center', lineBreak: false });
  y += 22;

  if (org?.name && org?.nameAr) {
    doc.font('AR').fontSize(11).fillColor(C.blue);
    doc.text(org.name, M, y, { width: CW, align: 'center', lineBreak: false });
    y += 17;
  }

  // Info chips (city | region | date)
  const chips = [
    (org?.cityAr || org?.city)     ? (org.cityAr || org.city)                                  : null,
    (org?.regionAr || org?.region) ? (org.regionAr || org.region)                              : null,
    org?.foundingDate
      ? `${new Date(org.foundingDate).getDate()} ${AR_MONTHS[new Date(org.foundingDate).getMonth()]} ${new Date(org.foundingDate).getFullYear()}`
      : null,
  ].filter(Boolean);

  if (chips.length) {
    y += 4;
    doc.font('AR').fontSize(9.5).fillColor(C.gray);
    doc.text(ar(chips.join('   |   ')), M, y, { width: CW, align: 'center', lineBreak: false });
    y += 16;
  }

  if (org?.email || org?.phone) {
    const contact = [org?.email, org?.phone].filter(Boolean).join('  |  ');
    doc.font('AR').fontSize(8.5).fillColor(C.gray);
    doc.text(ar(contact), M, y, { width: CW, align: 'center', lineBreak: false });
    y += 14;
  }

  y += 4;
  diamonds(doc, y, W, C.navy, 0.18, 18);
  y += 10;

  if (org?.activitiesAr || org?.activities) {
    newPageIfNeeded(50);
    doc.font('AR-Bold').fontSize(8.5).fillColor(C.blue);
    doc.text(ar('انشطة الجمعية :'), M, y, { width: CW, align: 'right', lineBreak: false });
    y += 14;
    const actText = org.activitiesAr || org.activities;
    const shaped  = arabicReshaper.convertArabic(actText);
    doc.font('AR').fontSize(9.5).fillColor(C.text);
    doc.text(shaped.split(' ').reverse().join(' '), M + 10, y,
      { width: CW - 20, align: 'right', lineBreak: true, lineGap: 1.5 });
    y = doc.y + 8;
  }
  y += 6;

  // ══ 2. الاعضاء ════════════════════════════════════════════════════════════════
  sec('2. الاعضاء والانخراط', C.blue);
  statRow([
    { value: members?.total ?? 0,       label: 'مجموع الاعضاء',   bg: C.blueL,   color: C.blue },
    { value: members?.active ?? 0,      label: 'الاعضاء النشطون', bg: C.greenL,  color: C.green },
    { value: members?.board ?? 0,       label: 'اعضاء المكتب',    bg: C.purpleL, color: C.purple },
    { value: members?.newThisYear ?? 0, label: `منخرطون ${year}`, bg: C.tealL,   color: C.teal },
  ]);

  // ══ 3. الاجتماعات ════════════════════════════════════════════════════════════
  sec('3. الاجتماعات والمداولات', C.teal);
  statRow([
    { value: meetings?.total ?? 0,     label: 'مجموع الاجتماعات',    bg: C.tealL,   color: C.teal },
    { value: meetings?.completed ?? 0, label: 'الاجتماعات المنعقدة', bg: C.greenL,  color: C.green },
    { value: meetings?.scheduled ?? 0, label: 'المبرمجة',             bg: C.amberL,  color: C.amber },
    { value: meetings?.decisions ?? 0, label: 'القرارات',             bg: C.purpleL, color: C.purple },
  ]);

  if (meetings?.recent?.length) {
    newPageIfNeeded(20 + meetings.recent.length * 21);
    fill(doc, M, y, CW, 16, C.tealL);
    doc.font('AR-Bold').fontSize(8.5).fillColor(C.teal);
    doc.text(ar('اخر الاجتماعات'), M + 6, y + 4, { width: CW - 12, align: 'right', lineBreak: false });
    y += 18;
    meetings.recent.forEach((mt, idx) => {
      const d    = new Date(mt.date);
      const dStr = `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      fill(doc, M, y, CW, 19, idx % 2 === 0 ? C.grayL : C.white);
      doc.font('AR').fontSize(8.5).fillColor(C.text);
      doc.text(ar(mt.title || mt.type || '—'), M + 85, y + 5, { width: CW - 90, align: 'right', lineBreak: false });
      doc.font('AR-Bold').fontSize(8.5).fillColor(C.teal);
      doc.text(ar(dStr), M, y + 5, { width: 80, align: 'left', lineBreak: false });
      y += 21;
    });
    y += 4;
  }

  // ══ 4. الوضعية المالية ════════════════════════════════════════════════════════
  sec(`4. الوضعية المالية ${year}`, C.green);
  const inc = finance?.totalIncome ?? 0;
  const exp = finance?.totalExpenses ?? 0;
  const bal = inc - exp;
  statRow([
    { value: `${inc.toLocaleString('fr-MA')} د.م`, label: 'المداخيل',
      bg: C.greenL, color: C.green },
    { value: `${exp.toLocaleString('fr-MA')} د.م`, label: 'المصاريف',
      bg: C.redL,   color: C.red },
    { value: `${Math.abs(bal).toLocaleString('fr-MA')} د.م`,
      label: bal >= 0 ? 'الرصيد الايجابي' : 'رصيد سلبي',
      bg: bal >= 0 ? C.blueL : C.redL, color: bal >= 0 ? C.blue : C.red },
  ]);

  // ══ 5. المشاريع ══════════════════════════════════════════════════════════════
  sec('5. المشاريع والمراسلات', C.amber);
  statRow([
    { value: projects?.total ?? 0,      label: 'المشاريع الكلية',   bg: C.amberL,  color: C.amber },
    { value: projects?.completed ?? 0,  label: 'المنجزة',           bg: C.greenL,  color: C.green },
    { value: projects?.inProgress ?? 0, label: 'قيد الانجاز',       bg: C.blueL,   color: C.blue },
    { value: requests?.total ?? 0,      label: 'المراسلات',         bg: C.purpleL, color: C.purple },
  ]);

  // ══ 6. التوجهات ══════════════════════════════════════════════════════════════
  sec('6. التوجهات والافاق', C.purple);
  [
    'تعزيز القدرات المؤسسية للجمعية وتطوير هياكلها التنظيمية.',
    'مواصلة تنفيذ مشاريع التنمية المحلية وخدمة المجتمع.',
    'توسيع شبكة الشراكات وتنويع مصادر التمويل.',
    'تحسين الخدمات المقدمة للمنخرطين والمستفيدين.',
  ].forEach((o, idx) => {
    newPageIfNeeded(20);
    fill(doc, M, y, CW, 19, idx % 2 === 0 ? C.purpleL : C.grayL);
    fill(doc, W - M - 4, y, 4, 19, C.purple);
    const sh = arabicReshaper.convertArabic(o);
    doc.font('AR').fontSize(9.5).fillColor(C.text);
    doc.text(sh.split(' ').reverse().join(' '), M, y + 5, { width: CW - 10, align: 'right', lineBreak: false });
    y += 21;
  });
  y += 8;

  // ══ SIGNATURE ════════════════════════════════════════════════════════════════
  newPageIfNeeded(90);
  const sigY = Math.max(y + 8, H - 100);
  hline(doc, M, W - M, sigY, C.divider, 1);
  const half = CW / 2;
  doc.font('AR-Bold').fontSize(10).fillColor(C.text);
  doc.text(ar('رئيس الجمعية'), M + half, sigY + 10, { width: half, align: 'right', lineBreak: false });
  doc.text(ar('الكاتب العام'), M, sigY + 10, { width: half, align: 'left', lineBreak: false });
  doc.font('AR').fontSize(8.5).fillColor(C.gray);
  doc.text(ar('الختم والتوقيع'), M + half, sigY + 23, { width: half, align: 'right', lineBreak: false });
  doc.text(ar('الختم والتوقيع'), M, sigY + 23, { width: half, align: 'left', lineBreak: false });
  hline(doc, M + half + 15, W - M - 10, sigY + 60, C.text, 0.7);
  hline(doc, M + 10, M + half - 15, sigY + 60, C.text, 0.7);

  contentFooter(doc, org, 'ar');
};

// ── ENTRY POINT ───────────────────────────────────────────────────────────────

const generateLiteraryReportPdf = (data, lang, year, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true,
    info: { Title: lang === 'fr' ? `Rapport d\'activites ${year}` : `التقرير الادبي ${year}`,
            Author: data.org?.name || 'Mar E-A.C' } });

  const fontsExist = fs.existsSync(FONT_AR) && fs.existsSync(FONT_BOLD);
  if (fontsExist) {
    doc.registerFont('AR',      FONT_AR);
    doc.registerFont('AR-Bold', FONT_BOLD);
  } else {
    console.warn('[PDF] Arabic fonts missing — Helvetica fallback');
    doc.registerFont('AR',      'Helvetica');
    doc.registerFont('AR-Bold', 'Helvetica-Bold');
  }

  const fname = `rapport-${year}-${lang}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  doc.pipe(res);

  const lp = logoPath(data.org);
  drawCover(doc, data.org, year, lp, lang);

  if (lang === 'fr') frContent(doc, data, year, lp);
  else               arContent(doc, data, year, lp);

  doc.end();
};

module.exports = { generateLiteraryReportPdf };
