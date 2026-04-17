const PDFDocument    = require('pdfkit');
const path           = require('path');
const fs             = require('fs');
const arabicReshaper = require('arabic-reshaper');

// ── Fonts & paths ─────────────────────────────────────────────────────────────
const FONT_DIR   = path.join(__dirname, '../assets/fonts');
const FONT_AR    = path.join(FONT_DIR, 'Amiri-Regular.ttf');
const FONT_BOLD  = path.join(FONT_DIR, 'Amiri-Bold.ttf');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('./uploads');

const ar = (t) => {
  if (!t) return '';
  const shaped = arabicReshaper.convertArabic(String(t));
  return shaped.split(' ').reverse().join(' ');
};

const fill = (doc, x, y, w, h, color) => {
  if (color) doc.save().rect(x, y, w, h).fill(color).restore();
};
const fillO = (doc, x, y, w, h, color, opacity) => {
  doc.save().fillOpacity(opacity).rect(x, y, w, h).fill(color).fillOpacity(1).restore();
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
  navy   : '#0d2b5e',
  navyMid: '#1a3f7a',
  blue   : '#1565c0',
  blueL  : '#dbeafe',
  teal   : '#0e7490',
  tealL  : '#cffafe',
  green  : '#15803d',
  greenL : '#dcfce7',
  amber  : '#b45309',
  amberL : '#fef3c7',
  red    : '#b91c1c',
  redL   : '#fee2e2',
  purple : '#6d28d9',
  purpleL: '#ede9fe',
  gray   : '#475569',
  grayL  : '#f1f5f9',
  grayAlt: '#e8eef4',
  text   : '#1e293b',
  white  : '#ffffff',
  gold   : '#92700a',
  accent : '#0284c7',
  divider: '#e2e8f0',
  footerBg: '#0a1f44',
};

// ────────────────────────────────────────────────────────────────────────────
//  FRENCH COVER PAGE
// ────────────────────────────────────────────────────────────────────────────

const frCover = (doc, org, year, lp) => {
  const W = 595, H = 842, M = 45, CW = W - 2 * M;
  const today = new Date();

  // Background: top 60% navy, bottom 40% slightly lighter navy
  fill(doc, 0,       0,       W, H * 0.6,  C.navy);
  fill(doc, 0,       H * 0.6, W, H * 0.4,  C.navyMid);

  // Accent top stripe
  fill(doc, 0, 0, W, 6, C.accent);

  // Decorative side bars
  fill(doc, 0,     0, 5, H, C.accent);
  fill(doc, W - 5, 0, 5, H, C.accent);

  // Horizontal separator between top/bottom halves
  fill(doc, 30, H * 0.6 - 2, W - 60, 4, C.accent);

  // Bottom strip
  fill(doc, 0, H - 55, W, 55, C.footerBg);
  fill(doc, 0, H - 55, W, 3, C.accent);

  // ── Logo box ──────────────────────────────────────────────────────────────
  const logoBoxY = 55;
  fillO(doc, W / 2 - 56, logoBoxY, 112, 112, C.white, 0.12);
  if (lp) {
    try { doc.image(lp, W / 2 - 44, logoBoxY + 10, { fit: [88, 88] }); } catch (_) {}
  } else {
    doc.font('Times-Bold').fontSize(40).fillColor(C.white);
    const init = (org?.name || 'J').substring(0, 2).toUpperCase();
    doc.text(init, W / 2 - 50, logoBoxY + 30, { width: 100, align: 'center', lineBreak: false });
  }

  // ── Report type label ─────────────────────────────────────────────────────
  doc.font('Times-Bold').fontSize(10).fillColor('#7dd3fc');
  doc.text('RAPPORT MORAL & D\'ACTIVITES', M, 188, { width: CW, align: 'center', lineBreak: false });

  // Thin white divider under label
  fillO(doc, M + 80, 202, CW - 160, 1, C.white, 0.4);

  // ── Association name (French) ─────────────────────────────────────────────
  const orgNameFr = (org?.name || '').toUpperCase();
  doc.font('Times-Bold').fontSize(24).fillColor(C.white);
  doc.text(orgNameFr, M, 212, { width: CW, align: 'center', lineBreak: false });

  // ── Association name (Arabic subtitle) ───────────────────────────────────
  if (org?.nameAr) {
    doc.font('AR-Bold').fontSize(16).fillColor('#93c5fd');
    doc.text(ar(org.nameAr), M, 244, { width: CW, align: 'center', lineBreak: false });
  }

  // ── Year badge ───────────────────────────────────────────────────────────
  const badgeX = W / 2 - 55;
  fill(doc, badgeX, 276, 110, 36, C.accent);
  doc.font('Times-Bold').fontSize(21).fillColor(C.white);
  doc.text(String(year), badgeX, 284, { width: 110, align: 'center', lineBreak: false });

  // ── Info block (bottom half) ─────────────────────────────────────────────
  const infoLines = [
    org?.city                           ? `Ville : ${org.city}`                                               : null,
    org?.region                         ? `Region : ${org.region}`                                            : null,
    org?.foundingDate                   ? `Fondee le ${fmtFr(new Date(org.foundingDate))}`                   : null,
    org?.email                          ? org.email                                                            : null,
    org?.phone                          ? org.phone                                                            : null,
  ].filter(Boolean);

  let iy = H * 0.6 + 22;
  infoLines.forEach((line, idx) => {
    fillO(doc, M + 40, iy, CW - 80, 22, C.white, idx % 2 === 0 ? 0.07 : 0.04);
    doc.font('Times-Roman').fontSize(10).fillColor('#bae6fd');
    doc.text(line, M + 40, iy + 6, { width: CW - 80, align: 'center', lineBreak: false });
    iy += 26;
  });

  // ── Bottom date ───────────────────────────────────────────────────────────
  doc.font('Times-Roman').fontSize(8.5).fillColor('#64748b');
  doc.text(`Genere le ${fmtFr(today)}`, M, H - 36, { width: CW, align: 'center', lineBreak: false });
};

// ────────────────────────────────────────────────────────────────────────────
//  ARABIC COVER PAGE
// ────────────────────────────────────────────────────────────────────────────

const arCover = (doc, org, year, lp) => {
  const W = 595, H = 842, M = 40, CW = W - 2 * M;
  const today = new Date();

  // Background
  fill(doc, 0,       0,       W, H * 0.6,  C.navy);
  fill(doc, 0,       H * 0.6, W, H * 0.4,  C.navyMid);

  // Accents
  fill(doc, 0, 0, W, 6, C.accent);
  fill(doc, 0, 0, 5, H, C.accent);
  fill(doc, W - 5, 0, 5, H, C.accent);
  fill(doc, 30, H * 0.6 - 2, W - 60, 4, C.accent);
  fill(doc, 0, H - 55, W, 55, C.footerBg);
  fill(doc, 0, H - 55, W, 3, C.accent);

  // ── بسم الله ─────────────────────────────────────────────────────────────
  doc.font('AR-Bold').fontSize(14).fillColor('#f59e0b');
  doc.text(ar('بسم الله الرحمن الرحيم'), M, 22, { width: CW, align: 'center', lineBreak: false });

  // ── Logo ─────────────────────────────────────────────────────────────────
  const logoBoxY = 50;
  fillO(doc, W / 2 - 56, logoBoxY, 112, 112, C.white, 0.12);
  if (lp) {
    try { doc.image(lp, W / 2 - 44, logoBoxY + 10, { fit: [88, 88] }); } catch (_) {}
  } else {
    doc.font('AR-Bold').fontSize(38).fillColor(C.white);
    const init = ar((org?.nameAr || org?.name || 'ج').charAt(0));
    doc.text(init, W / 2 - 50, logoBoxY + 32, { width: 100, align: 'center', lineBreak: false });
  }

  // ── Report label ─────────────────────────────────────────────────────────
  doc.font('AR-Bold').fontSize(11).fillColor('#7dd3fc');
  doc.text(ar('التقرير الادبي والانشطة'), M, 182, { width: CW, align: 'center', lineBreak: false });

  fillO(doc, M + 80, 198, CW - 160, 1, C.white, 0.4);

  // ── Org name Arabic ───────────────────────────────────────────────────────
  const orgNameAr = org?.nameAr || org?.name || '';
  doc.font('AR-Bold').fontSize(24).fillColor(C.white);
  doc.text(ar(orgNameAr), M, 207, { width: CW, align: 'center', lineBreak: false });

  // ── Org name French subtitle ──────────────────────────────────────────────
  if (org?.name && org?.nameAr) {
    doc.font('AR').fontSize(13).fillColor('#93c5fd');
    doc.text(org.name, M, 240, { width: CW, align: 'center', lineBreak: false });
  }

  // ── Year badge ────────────────────────────────────────────────────────────
  const badgeX = W / 2 - 55;
  fill(doc, badgeX, 272, 110, 36, C.accent);
  doc.font('AR-Bold').fontSize(21).fillColor(C.white);
  doc.text(String(year), badgeX, 280, { width: 110, align: 'center', lineBreak: false });

  // ── Info block ────────────────────────────────────────────────────────────
  const infoLines = [
    org?.cityAr || org?.city             ? ar(`المدينة : ${org.cityAr || org.city}`)                         : null,
    org?.regionAr || org?.region         ? ar(`الجهة : ${org.regionAr || org.region}`)                       : null,
    org?.foundingDate                    ? ar(`تاسست في : ${fmtAr(new Date(org.foundingDate))}`)             : null,
    org?.email                           ? org.email                                                           : null,
    org?.phone                           ? org.phone                                                           : null,
  ].filter(Boolean);

  let iy = H * 0.6 + 22;
  infoLines.forEach((line, idx) => {
    fillO(doc, M + 40, iy, CW - 80, 22, C.white, idx % 2 === 0 ? 0.07 : 0.04);
    doc.font('AR').fontSize(10).fillColor('#bae6fd');
    doc.text(line, M + 40, iy + 6, { width: CW - 80, align: 'center', lineBreak: false });
    iy += 26;
  });

  // ── Bottom date ───────────────────────────────────────────────────────────
  doc.font('AR').fontSize(8.5).fillColor('#64748b');
  doc.text(ar(`صدر بتاريخ ${fmtAr(today)}`), M, H - 36, { width: CW, align: 'center', lineBreak: false });
};

// ────────────────────────────────────────────────────────────────────────────
//  FRENCH CONTENT PAGE
// ────────────────────────────────────────────────────────────────────────────

const frContent = (doc, data, year, lp) => {
  const { org, members, meetings, finance, projects, requests } = data;
  const W = 595, H = 842, M = 45, CW = W - 2 * M;
  const today = new Date();

  doc.addPage();
  let y = 0;

  // ── Header band ─────────────────────────────────────────────────────────
  fill(doc, 0, 0, W, 70, C.navy);
  fill(doc, 0, 70, W, 3, C.accent);
  fill(doc, 0, 0, 4, 70, C.accent);
  fill(doc, W - 4, 0, 4, 70, C.accent);

  if (lp) { try { doc.image(lp, M, 9, { fit: [50, 50] }); } catch (_) {} }
  doc.font('Times-Bold').fontSize(14).fillColor(C.white);
  doc.text((org?.name || '').toUpperCase(), M + 60, 14, { width: CW - 62, align: 'left', lineBreak: false });
  doc.font('Times-Roman').fontSize(8.5).fillColor('#93c5fd');
  doc.text(`Rapport d'activites ${year}  |  Genere le ${fmtFr(today)}`, M + 60, 34, { width: CW - 62, align: 'left', lineBreak: false });
  const subInfoFr = [org?.city, org?.phone, org?.email].filter(Boolean).join('  |  ');
  if (subInfoFr) {
    doc.font('Times-Roman').fontSize(7.5).fillColor('#bfdbfe');
    doc.text(subInfoFr, M + 60, 50, { width: CW - 62, align: 'left', lineBreak: false });
  }
  y = 88;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const sec = (title, color = C.navy) => {
    fill(doc, M, y, CW, 26, color);
    fill(doc, M, y, 5, 26, C.white);
    doc.font('Times-Bold').fontSize(11).fillColor(C.white);
    doc.text(title, M + 14, y + 7, { width: CW - 18, align: 'left', lineBreak: false });
    y += 34;
  };

  const statRow = (items) => {
    const gap = 4;
    const bw  = Math.floor((CW - gap * (items.length - 1)) / items.length);
    items.forEach((item, i) => {
      const bx = M + i * (bw + gap);
      fill(doc, bx, y, bw, 58, item.bg);
      const valStr = String(item.value);
      const fsize  = valStr.length > 7 ? 12 : valStr.length > 4 ? 16 : 22;
      doc.font('Times-Bold').fontSize(fsize).fillColor(item.color);
      doc.text(valStr, bx, y + (fsize < 16 ? 14 : fsize < 22 ? 12 : 8), { width: bw, align: 'center', lineBreak: false });
      doc.font('Times-Roman').fontSize(8).fillColor(item.color);
      doc.text(item.label, bx, y + 40, { width: bw, align: 'center', lineBreak: false });
    });
    y += 66;
  };

  const textRow = (label, value, alt = false) => {
    fill(doc, M, y, CW, 21, alt ? C.grayAlt : C.grayL);
    doc.font('Times-Bold').fontSize(9.5).fillColor(C.text);
    doc.text(label, M + 8, y + 5, { width: CW * 0.45, align: 'left', lineBreak: false });
    doc.font('Times-Roman').fontSize(9.5).fillColor(C.gray);
    doc.text(String(value), M + CW * 0.5, y + 5, { width: CW * 0.48, align: 'right', lineBreak: false });
    y += 23;
  };

  // ══ 1. PRESENTATION ═════════════════════════════════════════════════════════
  sec('1. PRESENTATION DE L\'ASSOCIATION', C.navy);
  textRow('Nom officiel', org?.name || '—');
  if (org?.nameAr) textRow('Nom arabe', org.nameAr, true);
  textRow('Ville', org?.city || '—');
  textRow('Region', org?.region || '—', true);
  if (org?.foundingDate) {
    const fd = new Date(org.foundingDate);
    textRow('Date de creation', `${fd.getDate()} ${FR_MONTHS[fd.getMonth()]} ${fd.getFullYear()}`);
  }
  if (org?.activities) {
    y += 3;
    fill(doc, M, y, CW, 17, C.blueL);
    doc.font('Times-Bold').fontSize(8.5).fillColor(C.blue);
    doc.text('Activites :', M + 8, y + 4, { lineBreak: false });
    y += 19;
    doc.font('Times-Roman').fontSize(9.5).fillColor(C.text);
    doc.text(org.activities, M + 8, y, { width: CW - 16, lineBreak: true, lineGap: 1.5 });
    y = doc.y + 8;
  }
  y += 4;

  // ══ 2. MEMBRES ══════════════════════════════════════════════════════════════
  sec('2. MEMBRES & ADHESION', C.blue);
  statRow([
    { value: members?.total ?? 0,       label: 'Total adherents', bg: C.blueL,   color: C.blue },
    { value: members?.active ?? 0,      label: 'Membres actifs',  bg: C.greenL,  color: C.green },
    { value: members?.board ?? 0,       label: 'Bureau',          bg: C.purpleL, color: C.purple },
    { value: members?.newThisYear ?? 0, label: `Nouveaux ${year}`,bg: C.tealL,   color: C.teal },
  ]);

  // ══ 3. REUNIONS ═════════════════════════════════════════════════════════════
  sec('3. REUNIONS & DELIBERATIONS', C.teal);
  statRow([
    { value: meetings?.total ?? 0,     label: 'Total reunions', bg: C.tealL,   color: C.teal },
    { value: meetings?.completed ?? 0, label: 'Tenues',         bg: C.greenL,  color: C.green },
    { value: meetings?.scheduled ?? 0, label: 'Programmees',    bg: C.amberL,  color: C.amber },
    { value: meetings?.decisions ?? 0, label: 'Decisions',      bg: C.purpleL, color: C.purple },
  ]);

  if (meetings?.recent?.length) {
    fill(doc, M, y, CW, 17, C.tealL);
    doc.font('Times-Bold').fontSize(8.5).fillColor(C.teal);
    doc.text('Dernieres reunions', M + 8, y + 4, { lineBreak: false });
    y += 19;
    meetings.recent.forEach((mt, idx) => {
      const d   = new Date(mt.date);
      const dStr = `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      fill(doc, M, y, CW, 19, idx % 2 === 0 ? C.grayL : C.white);
      doc.font('Times-Roman').fontSize(8.5).fillColor(C.text);
      doc.text(`${dStr}  -  ${mt.title || mt.type || '—'}`, M + 8, y + 5,
        { width: CW - 90, lineBreak: false });
      doc.font('Times-Bold').fontSize(8.5).fillColor(C.teal);
      doc.text(`${mt._count?.attendances ?? 0} presents`, W - M - 80, y + 5,
        { width: 75, align: 'right', lineBreak: false });
      y += 21;
    });
    y += 4;
  }

  // ══ 4. FINANCES ═════════════════════════════════════════════════════════════
  sec(`4. BILAN FINANCIER ${year}`, C.green);
  const inc = finance?.totalIncome ?? 0;
  const exp = finance?.totalExpenses ?? 0;
  const bal = inc - exp;
  statRow([
    { value: `${inc.toLocaleString('fr-MA')} MAD`, label: 'Recettes',
      bg: C.greenL, color: C.green },
    { value: `${exp.toLocaleString('fr-MA')} MAD`, label: 'Depenses',
      bg: C.redL,   color: C.red },
    { value: `${Math.abs(bal).toLocaleString('fr-MA')} MAD`,
      label: bal >= 0 ? 'Solde positif' : 'Solde negatif',
      bg: bal >= 0 ? C.blueL : C.redL, color: bal >= 0 ? C.blue : C.red },
  ]);

  // ══ 5. PROJETS & DEMANDES ═══════════════════════════════════════════════════
  sec('5. PROJETS & CORRESPONDANCES', C.amber);
  statRow([
    { value: projects?.total ?? 0,      label: 'Total projets',    bg: C.amberL,  color: C.amber },
    { value: projects?.completed ?? 0,  label: 'Realises',         bg: C.greenL,  color: C.green },
    { value: projects?.inProgress ?? 0, label: 'En cours',         bg: C.blueL,   color: C.blue },
    { value: requests?.total ?? 0,      label: 'Courriers envoyes', bg: C.purpleL, color: C.purple },
  ]);

  // ══ 6. PERSPECTIVES ═════════════════════════════════════════════════════════
  sec('6. PERSPECTIVES & ORIENTATIONS', C.purple);
  [
    'Renforcement des capacites institutionnelles de l\'association.',
    'Poursuite des projets de developpement local et communautaire.',
    'Elargissement du reseau de partenariats et de financements.',
    'Amelioration des services rendus aux membres et aux beneficiaires.',
  ].forEach((p, idx) => {
    fill(doc, M, y, CW, 19, idx % 2 === 0 ? C.purpleL + 'aa' : C.grayL);
    fill(doc, M, y, 4, 19, C.purple);
    doc.font('Times-Roman').fontSize(9.5).fillColor(C.text);
    doc.text(p, M + 10, y + 5, { width: CW - 14, lineBreak: false });
    y += 21;
  });
  y += 8;

  // ══ SIGNATURE ══════════════════════════════════════════════════════════════
  const sigY = Math.max(y + 8, H - 108);
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

  // ══ FOOTER ══════════════════════════════════════════════════════════════════
  fill(doc, 0, H - 24, W, 24, C.navy);
  hline(doc, 0, W, H - 24, C.accent, 1.5);
  doc.font('Times-Roman').fontSize(7.5).fillColor('#93c5fd');
  doc.text([org?.name, org?.city, org?.phone, org?.email].filter(Boolean).join('  |  '),
    M, H - 14, { width: CW, align: 'center', lineBreak: false });
};

// ────────────────────────────────────────────────────────────────────────────
//  ARABIC CONTENT PAGE
// ────────────────────────────────────────────────────────────────────────────

const arContent = (doc, data, year, lp) => {
  const { org, members, meetings, finance, projects, requests } = data;
  const W = 595, H = 842, M = 40, CW = W - 2 * M;
  const today = new Date();

  doc.addPage();
  let y = 0;

  // ── Header ─────────────────────────────────────────────────────────────────
  fill(doc, 0, 0, W, 70, C.navy);
  fill(doc, 0, 70, W, 3, C.accent);
  fill(doc, 0, 0, 5, 70, C.accent);
  fill(doc, W - 5, 0, 5, 70, C.accent);

  const orgNameAr = org?.nameAr || org?.name || '';
  if (lp) { try { doc.image(lp, W - M - 54, 9, { fit: [50, 50] }); } catch (_) {} }
  doc.font('AR-Bold').fontSize(14).fillColor(C.white);
  doc.text(ar(orgNameAr), M, 13, { width: CW - 60, align: 'right', lineBreak: false });
  doc.font('AR').fontSize(8.5).fillColor('#93c5fd');
  doc.text(ar(`التقرير الادبي ${year}  |  صدر بتاريخ ${fmtAr(today)}`),
    M, 33, { width: CW - 60, align: 'right', lineBreak: false });
  const subAr = [org?.cityAr || org?.city, org?.phone].filter(Boolean).join('  |  ');
  if (subAr) {
    doc.font('AR').fontSize(7.5).fillColor('#bfdbfe');
    doc.text(ar(subAr), M, 50, { width: CW - 60, align: 'right', lineBreak: false });
  }
  y = 86;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const sec = (titleAr, color = C.navy) => {
    fill(doc, M, y, CW, 26, color);
    fill(doc, W - M - 5, y, 5, 26, C.white);
    doc.font('AR-Bold').fontSize(11).fillColor(C.white);
    doc.text(ar(titleAr), M + 8, y + 7, { width: CW - 16, align: 'right', lineBreak: false });
    y += 34;
  };

  const statRow = (items) => {
    const gap = 4;
    const bw  = Math.floor((CW - gap * (items.length - 1)) / items.length);
    // Reverse for RTL visual order
    [...items].reverse().forEach((item, i) => {
      const bx = M + i * (bw + gap);
      fill(doc, bx, y, bw, 58, item.bg);
      const valStr = String(item.value);
      const fsize  = valStr.length > 7 ? 12 : valStr.length > 4 ? 16 : 22;
      doc.font('AR-Bold').fontSize(fsize).fillColor(item.color);
      doc.text(valStr, bx, y + (fsize < 16 ? 14 : fsize < 22 ? 12 : 8),
        { width: bw, align: 'center', lineBreak: false });
      doc.font('AR').fontSize(8).fillColor(item.color);
      doc.text(ar(item.label), bx, y + 40, { width: bw, align: 'center', lineBreak: false });
    });
    y += 66;
  };

  const rowAr = (labelAr, value, alt = false) => {
    fill(doc, M, y, CW, 21, alt ? C.grayAlt : C.grayL);
    fill(doc, W - M - 4, y, 4, 21, C.navy);
    doc.font('AR-Bold').fontSize(9.5).fillColor(C.text);
    doc.text(ar(labelAr), M + 6, y + 5, { width: CW * 0.48, align: 'right', lineBreak: false });
    doc.font('AR').fontSize(9.5).fillColor(C.gray);
    doc.text(ar(String(value)), M + 6, y + 5, { width: CW * 0.45, align: 'left', lineBreak: false });
    y += 23;
  };

  // ══ بسم الله ═════════════════════════════════════════════════════════════════
  doc.font('AR-Bold').fontSize(13).fillColor(C.gold);
  doc.text(ar('بسم الله الرحمن الرحيم'), M, y, { width: CW, align: 'center', lineBreak: false });
  y += 18;
  hline(doc, M, W - M, y, C.divider, 1);
  y += 10;

  // ══ 1. تقديم الجمعية ══════════════════════════════════════════════════════════
  sec('1. تقديم الجمعية', C.navy);
  rowAr('الاسم الرسمي', org?.nameAr || org?.name || '—');
  if (org?.name && org?.nameAr) rowAr('Nom francais', org.name, true);
  rowAr('المدينة', org?.cityAr || org?.city || '—');
  rowAr('الجهة', org?.regionAr || org?.region || '—', true);
  if (org?.foundingDate) {
    const fd = new Date(org.foundingDate);
    rowAr('تاريخ التاسيس', `${fd.getDate()} ${AR_MONTHS[fd.getMonth()]} ${fd.getFullYear()}`);
  }
  if (org?.activitiesAr || org?.activities) {
    y += 3;
    fill(doc, M, y, CW, 17, C.blueL);
    doc.font('AR-Bold').fontSize(8.5).fillColor(C.blue);
    doc.text(ar('الانشطة :'), M + 6, y + 4, { width: CW - 12, align: 'right', lineBreak: false });
    y += 19;
    doc.font('AR').fontSize(9.5).fillColor(C.text);
    const actText = org.activitiesAr || org.activities;
    const shaped = arabicReshaper.convertArabic(actText);
    doc.text(shaped.split(' ').reverse().join(' '), M, y,
      { width: CW - 8, align: 'right', lineBreak: true, lineGap: 1.5 });
    y = doc.y + 8;
  }
  y += 4;

  // ══ 2. الاعضاء ═══════════════════════════════════════════════════════════════
  sec('2. الاعضاء والانخراط', C.blue);
  statRow([
    { value: members?.total ?? 0,       label: 'مجموع الاعضاء',    bg: C.blueL,   color: C.blue },
    { value: members?.active ?? 0,      label: 'الاعضاء النشطون',  bg: C.greenL,  color: C.green },
    { value: members?.board ?? 0,       label: 'اعضاء المكتب',     bg: C.purpleL, color: C.purple },
    { value: members?.newThisYear ?? 0, label: `منخرطون ${year}`,  bg: C.tealL,   color: C.teal },
  ]);

  // ══ 3. الاجتماعات ════════════════════════════════════════════════════════════
  sec('3. الاجتماعات والمداولات', C.teal);
  statRow([
    { value: meetings?.total ?? 0,     label: 'مجموع الاجتماعات',    bg: C.tealL,   color: C.teal },
    { value: meetings?.completed ?? 0, label: 'الاجتماعات المنعقدة', bg: C.greenL,  color: C.green },
    { value: meetings?.scheduled ?? 0, label: 'المبرمجة',             bg: C.amberL,  color: C.amber },
    { value: meetings?.decisions ?? 0, label: 'القرارات المتخذة',    bg: C.purpleL, color: C.purple },
  ]);

  if (meetings?.recent?.length) {
    fill(doc, M, y, CW, 17, C.tealL);
    doc.font('AR-Bold').fontSize(8.5).fillColor(C.teal);
    doc.text(ar('اخر الاجتماعات'), M + 6, y + 4, { width: CW - 12, align: 'right', lineBreak: false });
    y += 19;
    meetings.recent.forEach((mt, idx) => {
      const d    = new Date(mt.date);
      const dStr = `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      fill(doc, M, y, CW, 19, idx % 2 === 0 ? C.grayL : C.white);
      doc.font('AR').fontSize(8.5).fillColor(C.text);
      doc.text(ar(mt.title || mt.type || '—'), M + 85, y + 5,
        { width: CW - 90, align: 'right', lineBreak: false });
      doc.font('AR-Bold').fontSize(8.5).fillColor(C.teal);
      doc.text(ar(dStr), M, y + 5, { width: 80, align: 'left', lineBreak: false });
      y += 21;
    });
    y += 4;
  }

  // ══ 4. الوضعية المالية ═══════════════════════════════════════════════════════
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

  // ══ 5. المشاريع والمراسلات ═══════════════════════════════════════════════════
  sec('5. المشاريع والمراسلات الرسمية', C.amber);
  statRow([
    { value: projects?.total ?? 0,      label: 'المشاريع الكلية',      bg: C.amberL,  color: C.amber },
    { value: projects?.completed ?? 0,  label: 'المنجزة',              bg: C.greenL,  color: C.green },
    { value: projects?.inProgress ?? 0, label: 'قيد الانجاز',          bg: C.blueL,   color: C.blue },
    { value: requests?.total ?? 0,      label: 'المراسلات المرسلة',    bg: C.purpleL, color: C.purple },
  ]);

  // ══ 6. التوجهات والافاق ══════════════════════════════════════════════════════
  sec('6. التوجهات والافاق المستقبلية', C.purple);
  [
    'تعزيز القدرات المؤسسية للجمعية وتطوير هياكلها التنظيمية.',
    'مواصلة تنفيذ مشاريع التنمية المحلية وخدمة المجتمع.',
    'توسيع شبكة الشراكات وتنويع مصادر التمويل.',
    'تحسين الخدمات المقدمة للمنخرطين والمستفيدين.',
  ].forEach((o, idx) => {
    fill(doc, M, y, CW, 19, idx % 2 === 0 ? C.purpleL : C.grayL);
    fill(doc, W - M - 4, y, 4, 19, C.purple);
    doc.font('AR').fontSize(9.5).fillColor(C.text);
    const sh = arabicReshaper.convertArabic(o);
    doc.text(sh.split(' ').reverse().join(' '), M, y + 5,
      { width: CW - 10, align: 'right', lineBreak: false });
    y += 21;
  });
  y += 8;

  // ══ SIGNATURE ════════════════════════════════════════════════════════════════
  const sigY = Math.max(y + 8, H - 108);
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

  // ══ FOOTER ════════════════════════════════════════════════════════════════════
  fill(doc, 0, H - 24, W, 24, C.navy);
  hline(doc, 0, W, H - 24, C.accent, 1.5);
  doc.font('AR').fontSize(7.5).fillColor('#93c5fd');
  const footAr = [org?.nameAr || org?.name, org?.cityAr || org?.city, org?.phone].filter(Boolean).join('  |  ');
  doc.text(ar(footAr), M, H - 14, { width: CW, align: 'center', lineBreak: false });
};

// ────────────────────────────────────────────────────────────────────────────
//  ENTRY POINT
// ────────────────────────────────────────────────────────────────────────────

const generateLiteraryReportPdf = (data, lang, year, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true,
    info: { Title: lang === 'fr' ? `Rapport d\'activites ${year}` : `التقرير الادبي ${year}`,
            Author: data.org?.name || 'Mar E-A.C' } });

  const fontsExist = fs.existsSync(FONT_AR) && fs.existsSync(FONT_BOLD);
  if (fontsExist) {
    doc.registerFont('AR',      FONT_AR);
    doc.registerFont('AR-Bold', FONT_BOLD);
  } else {
    console.warn('[PDF] Arabic fonts missing — using Helvetica fallback');
    doc.registerFont('AR',      'Helvetica');
    doc.registerFont('AR-Bold', 'Helvetica-Bold');
  }

  const fname = lang === 'fr'
    ? `rapport-activites-${year}.pdf`
    : `rapport-litteraire-${year}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  doc.pipe(res);

  const lp = logoPath(data.org);

  if (lang === 'fr') {
    frCover(doc, data.org, year, lp);
    frContent(doc, data, year, lp);
  } else {
    arCover(doc, data.org, year, lp);
    arContent(doc, data, year, lp);
  }

  doc.end();
};

module.exports = { generateLiteraryReportPdf };
