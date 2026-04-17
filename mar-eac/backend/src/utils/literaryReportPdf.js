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
  text   : '#1e293b',
  white  : '#ffffff',
  gold   : '#92700a',
  accent : '#0284c7',
  divider: '#e2e8f0',
};

// ────────────────────────────────────────────────────────────────────────────
//  FRENCH VERSION
// ────────────────────────────────────────────────────────────────────────────

const frLetter = (doc, data, year) => {
  const { org, members, meetings, finance, projects, requests } = data;
  const W = 595, H = 842, M = 45, CW = W - 2 * M;
  const today = new Date();

  // ══ PAGE 1 — COVER ════════════════════════════════════════════════════════

  // Full navy background
  fill(doc, 0, 0, W, H, C.navy);
  // Diagonal accent strip
  doc.save()
     .moveTo(0, H * 0.55).lineTo(W, H * 0.45).lineTo(W, H * 0.55).lineTo(0, H * 0.65)
     .fill(C.accent).restore();

  // Bottom strip
  fill(doc, 0, H - 60, W, 60, '#0a1f44');
  hline(doc, 0, W, H - 60, C.accent, 2);

  // Logo circle
  const lp = logoPath(org);
  fill(doc, W / 2 - 52, 80, 104, 104, C.white + '22');
  if (lp) {
    try { doc.image(lp, W / 2 - 42, 90, { fit: [84, 84] }); } catch (_) {}
  } else {
    doc.font('Times-Bold').fontSize(36).fillColor(C.white);
    const initials = (org?.name || 'J').substring(0, 2).toUpperCase();
    doc.text(initials, W / 2 - 26, 112, { width: 52, align: 'center', lineBreak: false });
  }

  // Report title
  doc.font('Times-Bold').fontSize(11).fillColor('#7dd3fc');
  doc.text('RAPPORT MORAL & D\'ACTIVITÉS', M, 210, { width: CW, align: 'center', lineBreak: false });

  doc.font('Times-Bold').fontSize(26).fillColor(C.white);
  doc.text(org?.name?.toUpperCase() || '', M, 230, { width: CW, align: 'center', lineBreak: true });

  const orgNameY = doc.y + 6;
  if (org?.nameAr) {
    doc.font('AR-Bold').fontSize(17).fillColor('#7dd3fc');
    doc.text(ar(org.nameAr), M, orgNameY, { width: CW, align: 'center', lineBreak: false });
  }

  // Year badge
  const badgeY = 340;
  fill(doc, W / 2 - 60, badgeY, 120, 38, C.accent);
  doc.font('Times-Bold').fontSize(22).fillColor(C.white);
  doc.text(String(year), W / 2 - 60, badgeY + 8, { width: 120, align: 'center', lineBreak: false });

  // Info pills
  const pills = [
    org?.city || '',
    `Fondée en ${org?.foundingDate ? new Date(org.foundingDate).getFullYear() : '—'}`,
    org?.email || '',
  ].filter(Boolean);

  let py = 400;
  pills.forEach(p => {
    const pw = Math.min(doc.widthOfString(p, { fontSize: 9 }) + 24, 220);
    fill(doc, W / 2 - pw / 2, py, pw, 22, C.white + '18');
    doc.font('Times-Roman').fontSize(9).fillColor('#bae6fd');
    doc.text(p, W / 2 - pw / 2, py + 6, { width: pw, align: 'center', lineBreak: false });
    py += 28;
  });

  // Bottom info
  doc.font('Times-Roman').fontSize(8.5).fillColor('#94a3b8');
  doc.text(`Rapport généré le ${fmtFr(today)}`, M, H - 42, { width: CW, align: 'center', lineBreak: false });

  // ══ PAGE 2 — CONTENT ══════════════════════════════════════════════════════
  doc.addPage();
  let y = 0;

  // Header band
  fill(doc, 0, 0, W, 72, C.navy);
  fill(doc, 0, 72, W, 3, C.accent);
  fill(doc, 0, 0, 4, 72, C.accent);
  fill(doc, W - 4, 0, 4, 72, C.accent);

  if (lp) { try { doc.image(lp, M, 8, { fit: [52, 52] }); } catch (_) {} }
  doc.font('Times-Bold').fontSize(14).fillColor(C.white);
  doc.text(org?.name?.toUpperCase() || '', M + 62, 16, { width: CW - 64, align: 'left', lineBreak: false });
  doc.font('Times-Roman').fontSize(8.5).fillColor('#93c5fd');
  doc.text(
    `Rapport d'activités ${year}  •  Généré le ${fmtFr(today)}`,
    M + 62, 36, { width: CW - 64, align: 'left', lineBreak: false }
  );
  const subInfo = [org?.city, org?.phone, org?.email].filter(Boolean).join('  |  ');
  if (subInfo) {
    doc.font('Times-Roman').fontSize(7.5).fillColor('#bfdbfe');
    doc.text(subInfo, M + 62, 50, { width: CW - 64, align: 'left', lineBreak: false });
  }
  y = 90;

  // ── Section helper ──────────────────────────────────────────────────────────
  const sectionTitle = (title, icon = '■', color = C.navy) => {
    fill(doc, M, y, CW, 28, color);
    doc.font('Times-Bold').fontSize(12).fillColor(C.white);
    doc.text(`${icon}  ${title}`, M + 10, y + 8, { lineBreak: false });
    y += 36;
  };

  // ── Stat box row ─────────────────────────────────────────────────────────────
  const statRow = (items) => {
    const bw = Math.floor(CW / items.length) - 4;
    items.forEach((item, i) => {
      const bx = M + i * (bw + 5);
      fill(doc, bx, y, bw, 56, item.bg);
      doc.font('Times-Bold').fontSize(22).fillColor(item.color);
      doc.text(String(item.value), bx, y + 6, { width: bw, align: 'center', lineBreak: false });
      doc.font('Times-Roman').fontSize(8.5).fillColor(item.color);
      doc.text(item.label, bx, y + 32, { width: bw, align: 'center', lineBreak: false });
    });
    y += 64;
  };

  // ── Text row ─────────────────────────────────────────────────────────────────
  const textRow = (label, value, bg = C.grayL) => {
    fill(doc, M, y, CW, 22, bg);
    doc.font('Times-Bold').fontSize(10).fillColor(C.text);
    doc.text(label, M + 8, y + 6, { width: CW / 2, align: 'left', lineBreak: false });
    doc.font('Times-Roman').fontSize(10).fillColor(C.gray);
    doc.text(String(value), M + CW / 2, y + 6, { width: CW / 2, align: 'right', lineBreak: false });
    y += 24;
  };

  // ══ 1. PRÉSENTATION ════════════════════════════════════════════════════════
  sectionTitle('PRÉSENTATION DE L\'ASSOCIATION', '🏛', C.navy);

  textRow('Nom officiel', org?.name || '—');
  if (org?.nameAr) textRow('الاسم بالعربية', org.nameAr);
  textRow('Ville', org?.city || '—');
  textRow('Région', org?.region || '—');
  if (org?.foundingDate) textRow('Date de création',
    `${new Date(org.foundingDate).getDate()} ${FR_MONTHS[new Date(org.foundingDate).getMonth()]} ${new Date(org.foundingDate).getFullYear()}`);
  if (org?.activities) {
    y += 4;
    fill(doc, M, y, CW, 20, C.blueL);
    doc.font('Times-Bold').fontSize(9).fillColor(C.blue);
    doc.text('Activités :', M + 8, y + 5, { lineBreak: false });
    y += 22;
    doc.font('Times-Roman').fontSize(10).fillColor(C.text);
    doc.text(org.activities, M + 8, y, { width: CW - 16, lineBreak: true, lineGap: 2 });
    y = doc.y + 10;
  }
  y += 6;

  // ══ 2. MEMBRES ═════════════════════════════════════════════════════════════
  sectionTitle('MEMBRES & ADHÉSION', '👥', C.blue);
  statRow([
    { value: members?.total ?? 0,       label: 'Total adhérents',  bg: C.blueL,   color: C.blue },
    { value: members?.active ?? 0,      label: 'Membres actifs',   bg: C.greenL,  color: C.green },
    { value: members?.board ?? 0,       label: 'Bureau',           bg: C.purpleL, color: C.purple },
    { value: members?.newThisYear ?? 0, label: `Nouveaux ${year}`, bg: C.tealL,   color: C.teal },
  ]);

  // ══ 3. RÉUNIONS ════════════════════════════════════════════════════════════
  sectionTitle('RÉUNIONS & DÉLIBÉRATIONS', '📋', C.teal);
  statRow([
    { value: meetings?.total ?? 0,     label: 'Total réunions',  bg: C.tealL,  color: C.teal },
    { value: meetings?.completed ?? 0, label: 'Tenues',          bg: C.greenL, color: C.green },
    { value: meetings?.scheduled ?? 0, label: 'Programmées',     bg: C.amberL, color: C.amber },
    { value: meetings?.decisions ?? 0, label: 'Décisions',       bg: C.purpleL,color: C.purple },
  ]);

  if (meetings?.recent?.length) {
    fill(doc, M, y, CW, 18, C.tealL);
    doc.font('Times-Bold').fontSize(9).fillColor(C.teal);
    doc.text('Dernières réunions', M + 6, y + 4, { lineBreak: false });
    y += 20;
    meetings.recent.forEach(mt => {
      const d = new Date(mt.date);
      const dStr = `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      fill(doc, M, y, CW, 20, y % 2 === 0 ? '#f8fafc' : C.white);
      doc.font('Times-Roman').fontSize(9).fillColor(C.text);
      doc.text(`${dStr}  —  ${mt.title || mt.type || '—'}`, M + 6, y + 5,
        { width: CW - 80, lineBreak: false });
      doc.font('Times-Bold').fontSize(9).fillColor(C.teal);
      doc.text(`${mt._count?.attendances ?? 0} présents`, W - M - 75, y + 5,
        { width: 70, align: 'right', lineBreak: false });
      y += 22;
    });
    y += 6;
  }

  // ══ 4. FINANCES ════════════════════════════════════════════════════════════
  sectionTitle(`BILAN FINANCIER ${year}`, '💰', C.green);
  const inc = finance?.totalIncome ?? 0;
  const exp = finance?.totalExpenses ?? 0;
  const bal = inc - exp;
  statRow([
    { value: `${inc.toLocaleString('fr-MA')} MAD`, label: 'Recettes',  bg: C.greenL,  color: C.green },
    { value: `${exp.toLocaleString('fr-MA')} MAD`, label: 'Dépenses',  bg: C.redL,    color: C.red },
    { value: `${Math.abs(bal).toLocaleString('fr-MA')} MAD`,
      label: bal >= 0 ? '✓ Solde positif' : '⚠ Solde négatif',
      bg: bal >= 0 ? C.blueL : C.redL, color: bal >= 0 ? C.blue : C.red },
  ]);

  // ══ 5. PROJETS & DEMANDES ══════════════════════════════════════════════════
  sectionTitle('PROJETS & DEMANDES OFFICIELLES', '📁', C.amber);
  statRow([
    { value: projects?.total ?? 0,      label: 'Total projets',   bg: C.amberL,  color: C.amber },
    { value: projects?.completed ?? 0,  label: 'Réalisés',        bg: C.greenL,  color: C.green },
    { value: projects?.inProgress ?? 0, label: 'En cours',        bg: C.blueL,   color: C.blue },
    { value: requests?.total ?? 0,      label: 'Courriers envoyés', bg: C.purpleL, color: C.purple },
  ]);

  // ══ 6. PERSPECTIVES ════════════════════════════════════════════════════════
  sectionTitle('PERSPECTIVES & ORIENTATIONS', '🎯', C.purple);
  const persp = [
    'Renforcement des capacités institutionnelles de l\'association.',
    'Poursuite des projets de développement local et communautaire.',
    'Élargissement du réseau de partenariats et de financements.',
    'Amélioration des services rendus aux membres et aux bénéficiaires.',
  ];
  persp.forEach(p => {
    fill(doc, M, y, 3, 16, C.purple);
    doc.font('Times-Roman').fontSize(10).fillColor(C.text);
    doc.text(p, M + 10, y + 2, { width: CW - 14, lineBreak: false });
    y += 20;
  });
  y += 10;

  // ══ SIGNATURE BLOCK ════════════════════════════════════════════════════════
  const sigY = Math.max(y + 10, H - 110);
  hline(doc, M, W - M, sigY, C.divider);

  const half = CW / 2;
  doc.font('Times-Bold').fontSize(10).fillColor(C.text);
  doc.text('Le Secrétaire Général', M, sigY + 12, { width: half, align: 'center', lineBreak: false });
  doc.text('Le Président de l\'Association', M + half, sigY + 12, { width: half, align: 'center', lineBreak: false });
  doc.font('Times-Roman').fontSize(9).fillColor(C.gray);
  doc.text('Cachet & Signature', M, sigY + 25, { width: half, align: 'center', lineBreak: false });
  doc.text('Cachet & Signature', M + half, sigY + 25, { width: half, align: 'center', lineBreak: false });

  hline(doc, M + 15, M + half - 15, sigY + 62, C.text, 0.7);
  hline(doc, M + half + 15, W - M - 15, sigY + 62, C.text, 0.7);

  // ══ FOOTER ═════════════════════════════════════════════════════════════════
  fill(doc, 0, H - 26, W, 26, C.navy);
  hline(doc, 0, W, H - 26, C.accent, 1.5);
  doc.font('Times-Roman').fontSize(7.5).fillColor('#93c5fd');
  const footerText = [org?.name, org?.city, org?.phone, org?.email].filter(Boolean).join('  |  ');
  doc.text(footerText, M, H - 16, { width: CW, align: 'center', lineBreak: false });
};

// ────────────────────────────────────────────────────────────────────────────
//  ARABIC VERSION
// ────────────────────────────────────────────────────────────────────────────

const arLetter = (doc, data, year) => {
  const { org, members, meetings, finance, projects, requests } = data;
  const W = 595, H = 842, M = 40, CW = W - 2 * M;
  const today = new Date();

  // ══ PAGE 1 — COVER ════════════════════════════════════════════════════════

  fill(doc, 0, 0, W, H, C.navy);
  doc.save()
     .moveTo(0, H * 0.52).lineTo(W, H * 0.43).lineTo(W, H * 0.53).lineTo(0, H * 0.62)
     .fill(C.accent).restore();
  fill(doc, 0, H - 60, W, 60, '#0a1f44');
  hline(doc, 0, W, H - 60, C.accent, 2);

  // Logo
  const lp = logoPath(org);
  fill(doc, W / 2 - 52, 75, 104, 104, C.white + '22');
  if (lp) {
    try { doc.image(lp, W / 2 - 42, 85, { fit: [84, 84] }); } catch (_) {}
  } else {
    doc.font('AR-Bold').fontSize(32).fillColor(C.white);
    const initials = ar((org?.nameAr || org?.name || 'ج').substring(0, 2));
    doc.text(initials, W / 2 - 36, 107, { width: 72, align: 'center', lineBreak: false });
  }

  // Report type label
  doc.font('AR').fontSize(10).fillColor('#7dd3fc');
  doc.text(ar('التقرير الأدبي والأنشطة'), M, 205, { width: CW, align: 'center', lineBreak: false });

  // Org name Arabic
  const orgName = org?.nameAr || org?.name || '';
  doc.font('AR-Bold').fontSize(22).fillColor(C.white);
  doc.text(ar(orgName), M, 222, { width: CW, align: 'center', lineBreak: false });

  if (org?.name) {
    doc.font('AR').fontSize(12).fillColor('#7dd3fc');
    doc.text(org.name, M, doc.y + 4, { width: CW, align: 'center', lineBreak: false });
  }

  // Year badge
  const badgeY = 330;
  fill(doc, W / 2 - 56, badgeY, 112, 38, C.accent);
  doc.font('AR-Bold').fontSize(22).fillColor(C.white);
  doc.text(String(year), W / 2 - 56, badgeY + 8, { width: 112, align: 'center', lineBreak: false });

  const pills = [
    org?.cityAr || org?.city || '',
    org?.foundingDate
      ? ar(`تأسست سنة ${new Date(org.foundingDate).getFullYear()}`)
      : '',
    org?.phone || '',
  ].filter(Boolean);

  let py = 390;
  pills.forEach(p => {
    const pw = Math.min(doc.widthOfString(p, { fontSize: 9 }) + 28, 230);
    fill(doc, W / 2 - pw / 2, py, pw, 22, C.white + '18');
    doc.font('AR').fontSize(9).fillColor('#bae6fd');
    doc.text(p, W / 2 - pw / 2, py + 6, { width: pw, align: 'center', lineBreak: false });
    py += 28;
  });

  doc.font('AR').fontSize(8.5).fillColor('#94a3b8');
  doc.text(ar(`صدر بتاريخ ${fmtAr(today)}`), M, H - 42, { width: CW, align: 'center', lineBreak: false });

  // ══ PAGE 2 — CONTENT ══════════════════════════════════════════════════════
  doc.addPage();
  let y = 0;

  // Header
  fill(doc, 0, 0, W, 72, C.navy);
  fill(doc, 0, 72, W, 3, C.accent);
  fill(doc, 0, 0, 5, 72, C.accent);
  fill(doc, W - 5, 0, 5, 72, C.accent);

  if (lp) { try { doc.image(lp, W - M - 56, 8, { fit: [52, 52] }); } catch (_) {} }
  doc.font('AR-Bold').fontSize(14).fillColor(C.white);
  doc.text(ar(orgName), M, 16, { width: CW - 62, align: 'right', lineBreak: false });
  doc.font('AR').fontSize(8.5).fillColor('#93c5fd');
  doc.text(ar(`التقرير الأدبي ${year}  •  صدر بتاريخ ${fmtAr(today)}`),
    M, 36, { width: CW - 62, align: 'right', lineBreak: false });
  const subInfoAr = [org?.cityAr || org?.city, org?.phone].filter(Boolean).join('  |  ');
  if (subInfoAr) {
    doc.font('AR').fontSize(7.5).fillColor('#bfdbfe');
    doc.text(ar(subInfoAr), M, 52, { width: CW - 62, align: 'right', lineBreak: false });
  }
  y = 90;

  // ── Section helper ─────────────────────────────────────────────────────────
  const sec = (titleAr, color = C.navy) => {
    fill(doc, M, y, CW, 28, color);
    fill(doc, W - M - 5, y, 5, 28, C.white + 'aa');
    doc.font('AR-Bold').fontSize(12).fillColor(C.white);
    doc.text(ar(titleAr), M + 6, y + 8, { width: CW - 14, align: 'right', lineBreak: false });
    y += 36;
  };

  // ── Stat row ───────────────────────────────────────────────────────────────
  const statRow = (items) => {
    const bw = Math.floor(CW / items.length) - 4;
    // Reverse order for RTL feel
    [...items].reverse().forEach((item, i) => {
      const bx = M + i * (bw + 5);
      fill(doc, bx, y, bw, 58, item.bg);
      doc.font('AR-Bold').fontSize(item.value.toString().length > 6 ? 13 : 20).fillColor(item.color);
      doc.text(String(item.value), bx, y + 6, { width: bw, align: 'center', lineBreak: false });
      doc.font('AR').fontSize(8.5).fillColor(item.color);
      doc.text(ar(item.label), bx, y + 34, { width: bw, align: 'center', lineBreak: false });
    });
    y += 66;
  };

  // ── Text row ───────────────────────────────────────────────────────────────
  const rowAr = (labelAr, value, bg = C.grayL) => {
    fill(doc, M, y, CW, 22, bg);
    fill(doc, W - M - 4, y, 4, 22, C.navy + '44');
    doc.font('AR-Bold').fontSize(10).fillColor(C.text);
    doc.text(ar(labelAr), M + 6, y + 6, { width: CW / 2, align: 'right', lineBreak: false });
    doc.font('AR').fontSize(10).fillColor(C.gray);
    doc.text(ar(String(value)), M, y + 6, { width: CW / 2, align: 'left', lineBreak: false });
    y += 24;
  };

  // ══ بسم الله ════════════════════════════════════════════════════════════════
  doc.font('AR-Bold').fontSize(13).fillColor(C.gold);
  doc.text(ar('بسم الله الرحمن الرحيم'), M, y, { width: CW, align: 'center', lineBreak: false });
  y += 20;
  hline(doc, M, W - M, y, C.divider, 1);
  y += 12;

  // ══ 1. تقديم الجمعية ════════════════════════════════════════════════════════
  sec('تقديم الجمعية', C.navy);
  rowAr('الاسم الرسمي', org?.nameAr || org?.name || '—');
  rowAr('المدينة', org?.cityAr || org?.city || '—');
  rowAr('الجهة', org?.regionAr || org?.region || '—');
  if (org?.foundingDate) {
    const fd = new Date(org.foundingDate);
    rowAr('تاريخ التأسيس', `${fd.getDate()} ${AR_MONTHS[fd.getMonth()]} ${fd.getFullYear()}`);
  }
  if (org?.activitiesAr || org?.activities) {
    y += 4;
    fill(doc, M, y, CW, 18, C.blueL);
    doc.font('AR-Bold').fontSize(9).fillColor(C.blue);
    doc.text(ar('الأنشطة:'), M + 6, y + 4, { width: CW - 12, align: 'right', lineBreak: false });
    y += 20;
    doc.font('AR').fontSize(10).fillColor(C.text);
    const actText = org.activitiesAr || org.activities;
    const shaped = arabicReshaper.convertArabic(actText);
    const reversed = shaped.split(' ').reverse().join(' ');
    doc.text(reversed, M, y, { width: CW - 8, align: 'right', lineBreak: true, lineGap: 2 });
    y = doc.y + 10;
  }
  y += 6;

  // ══ 2. الأعضاء ══════════════════════════════════════════════════════════════
  sec('الأعضاء والانخراط', C.blue);
  statRow([
    { value: members?.total ?? 0,       label: 'مجموع الأعضاء',     bg: C.blueL,   color: C.blue },
    { value: members?.active ?? 0,      label: 'الأعضاء النشطون',   bg: C.greenL,  color: C.green },
    { value: members?.board ?? 0,       label: 'أعضاء المكتب',      bg: C.purpleL, color: C.purple },
    { value: members?.newThisYear ?? 0, label: `منخرطون ${year}`,   bg: C.tealL,   color: C.teal },
  ]);

  // ══ 3. الاجتماعات ═══════════════════════════════════════════════════════════
  sec('الاجتماعات والمداولات', C.teal);
  statRow([
    { value: meetings?.total ?? 0,     label: 'مجموع الاجتماعات',   bg: C.tealL,   color: C.teal },
    { value: meetings?.completed ?? 0, label: 'الاجتماعات المنعقدة', bg: C.greenL,  color: C.green },
    { value: meetings?.scheduled ?? 0, label: 'المبرمجة',            bg: C.amberL,  color: C.amber },
    { value: meetings?.decisions ?? 0, label: 'القرارات المتخذة',    bg: C.purpleL, color: C.purple },
  ]);

  if (meetings?.recent?.length) {
    fill(doc, M, y, CW, 18, C.tealL);
    doc.font('AR-Bold').fontSize(9).fillColor(C.teal);
    doc.text(ar('آخر الاجتماعات'), M + 6, y + 4, { width: CW - 12, align: 'right', lineBreak: false });
    y += 20;
    meetings.recent.forEach((mt, idx) => {
      const d = new Date(mt.date);
      const dStr = `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      fill(doc, M, y, CW, 20, idx % 2 === 0 ? '#f8fafc' : C.white);
      doc.font('AR').fontSize(9).fillColor(C.text);
      doc.text(ar(mt.title || mt.type || '—'), M + 6, y + 5,
        { width: CW - 90, align: 'right', lineBreak: false });
      doc.font('AR-Bold').fontSize(9).fillColor(C.teal);
      doc.text(ar(dStr), M, y + 5, { width: 80, align: 'left', lineBreak: false });
      y += 22;
    });
    y += 6;
  }

  // ══ 4. الوضعية المالية ══════════════════════════════════════════════════════
  sec(`الوضعية المالية ${year}`, C.green);
  const inc = finance?.totalIncome ?? 0;
  const exp = finance?.totalExpenses ?? 0;
  const bal = inc - exp;
  statRow([
    { value: `${inc.toLocaleString('fr-MA')} د.م`, label: 'المداخيل',   bg: C.greenL, color: C.green },
    { value: `${exp.toLocaleString('fr-MA')} د.م`, label: 'المصاريف',   bg: C.redL,   color: C.red },
    { value: `${Math.abs(bal).toLocaleString('fr-MA')} د.م`,
      label: bal >= 0 ? 'الرصيد الإيجابي ✓' : 'رصيد سلبي ⚠',
      bg: bal >= 0 ? C.blueL : C.redL, color: bal >= 0 ? C.blue : C.red },
  ]);

  // ══ 5. المشاريع والمراسلات ══════════════════════════════════════════════════
  sec('المشاريع والمراسلات الرسمية', C.amber);
  statRow([
    { value: projects?.total ?? 0,      label: 'المشاريع الكلية',    bg: C.amberL,  color: C.amber },
    { value: projects?.completed ?? 0,  label: 'المنجزة',            bg: C.greenL,  color: C.green },
    { value: projects?.inProgress ?? 0, label: 'قيد الإنجاز',        bg: C.blueL,   color: C.blue },
    { value: requests?.total ?? 0,      label: 'المراسلات المُرسَلة', bg: C.purpleL, color: C.purple },
  ]);

  // ══ 6. التوجهات والآفاق ════════════════════════════════════════════════════
  sec('التوجهات والآفاق المستقبلية', C.purple);
  const orients = [
    'تعزيز القدرات المؤسسية للجمعية وتطوير هياكلها التنظيمية.',
    'مواصلة تنفيذ مشاريع التنمية المحلية وخدمة المجتمع.',
    'توسيع شبكة الشراكات وتنويع مصادر التمويل.',
    'تحسين الخدمات المقدمة للمنخرطين والمستفيدين.',
  ];
  orients.forEach(o => {
    fill(doc, W - M - 4, y, 4, 18, C.purple);
    doc.font('AR').fontSize(10).fillColor(C.text);
    const sh = arabicReshaper.convertArabic(o);
    doc.text(sh.split(' ').reverse().join(' '), M, y + 2,
      { width: CW - 10, align: 'right', lineBreak: false });
    y += 22;
  });
  y += 10;

  // ══ SIGNATURE ══════════════════════════════════════════════════════════════
  const sigY = Math.max(y + 10, H - 115);
  hline(doc, M, W - M, sigY, C.divider);

  const half = CW / 2;
  doc.font('AR-Bold').fontSize(10).fillColor(C.text);
  doc.text(ar('رئيس الجمعية'), M + half, sigY + 12, { width: half, align: 'right', lineBreak: false });
  doc.text(ar('الكاتب العام'), M, sigY + 12, { width: half, align: 'left', lineBreak: false });
  doc.font('AR').fontSize(9).fillColor(C.gray);
  doc.text(ar('الختم والتوقيع'), M + half, sigY + 26, { width: half, align: 'right', lineBreak: false });
  doc.text(ar('الختم والتوقيع'), M, sigY + 26, { width: half, align: 'left', lineBreak: false });

  hline(doc, M + half + 15, W - M - 10, sigY + 62, C.text, 0.7);
  hline(doc, M + 10, M + half - 15, sigY + 62, C.text, 0.7);

  // ══ FOOTER ═════════════════════════════════════════════════════════════════
  fill(doc, 0, H - 26, W, 26, C.navy);
  hline(doc, 0, W, H - 26, C.accent, 1.5);
  doc.font('AR').fontSize(7.5).fillColor('#93c5fd');
  const footerAr = [org?.nameAr || org?.name, org?.cityAr || org?.city, org?.phone].filter(Boolean).join('  |  ');
  doc.text(ar(footerAr), M, H - 16, { width: CW, align: 'center', lineBreak: false });
};

// ────────────────────────────────────────────────────────────────────────────
//  ENTRY POINT
// ────────────────────────────────────────────────────────────────────────────

const generateLiteraryReportPdf = (data, lang, year, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true,
    info: { Title: lang === 'fr' ? `Rapport d'activités ${year}` : `التقرير الأدبي ${year}`,
            Author: data.org?.name || 'Mar E-A.C' } });

  const fontsExist = fs.existsSync(FONT_AR) && fs.existsSync(FONT_BOLD);
  if (fontsExist) {
    doc.registerFont('AR',      FONT_AR);
    doc.registerFont('AR-Bold', FONT_BOLD);
  } else {
    console.warn('[PDF] Arabic fonts missing — fallback Helvetica');
    doc.registerFont('AR',      'Helvetica');
    doc.registerFont('AR-Bold', 'Helvetica-Bold');
  }

  const fname = lang === 'fr'
    ? `rapport-activites-${year}.pdf`
    : `التقرير-الأدبي-${year}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  doc.pipe(res);

  if (lang === 'fr') {
    frLetter(doc, data, year);
  } else {
    arLetter(doc, data, year);
  }

  doc.end();
};

module.exports = { generateLiteraryReportPdf };
