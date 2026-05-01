const PDFDocument = require('pdfkit');
const prisma = require('../config/database');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('./uploads');

// ── Fonts ──────────────────────────────────────────────────────────────────────
const FONT_DIR     = path.join(__dirname, '../assets/fonts');
const FONT_AR      = path.join(FONT_DIR, 'Amiri-Regular.ttf');   // body text
const FONT_AR_BOLD = path.join(FONT_DIR, 'Amiri-Bold.ttf');      // headings / labels
const FONT_AR_TITLE= path.join(FONT_DIR, 'Line.ttf');            // decorative — cover only

// ── Page geometry ──────────────────────────────────────────────────────────────
const PAGE_W   = 595.28;
const PAGE_H   = 841.89;
const MARGIN   = 38;
const CONTENT_W= PAGE_W - MARGIN * 2;

// ── Palette ────────────────────────────────────────────────────────────────────
const NAVY       = '#1a3a6b';
const NAVY_LIGHT = '#e8eef7';
const NAVY_MID   = '#2d5fa6';
const C = {
  income:  '#059669',
  expense: '#dc2626',
  neutral: '#6b7280',
  light:   '#f8fafc',
  border:  '#d1d5db',
  white:   '#ffffff',
  rowAlt:  '#f0f4ff',
};

// ── PDFKit RTL helper ──────────────────────────────────────────────────────────
// PDFKit renders every string strictly LTR. Reversing word order makes Arabic
// multi-word strings display in correct reading order for RTL readers.
// Numbers and Latin words are naturally LTR so they stay readable after reversal.
const arw = (str, isAr) => {
  if (!isAr || !str) return String(str || '');
  return String(str).split(' ').reverse().join(' ');
};

// ── Translations ───────────────────────────────────────────────────────────────
const T = {
  fr: {
    cover_title: 'Rapport Financier',
    cover_sub:   'التقرير المالي',
    exercise:    'Exercice',
    assoc_name:  "Nom de l'association",
    city:        'Ville',
    email:       'Email',
    period_covered: 'Période couverte',
    emit_date:   "Date d'émission",
    total_income:  'Total Recettes',
    total_expense: 'Total Dépenses',
    balance:       'Solde net',
    income_detail: 'Tableau détaillé des Recettes',
    expense_detail:'Tableau détaillé des Dépenses',
    nature:   'Nature / Catégorie',
    date_inv: 'Date',
    amount:   'Montant (MAD)',
    pay_mode: 'Mode paiement',
    doc_ref:  'N° Document',
    obs:      'Observations',
    subtotal: 'Sous-total',
    total:    'TOTAL',
    no_income:  'Aucune recette enregistrée pour cette période.',
    no_expense: 'Aucune dépense enregistrée.',
    operations: 'opérations',
    logo:        'Logo',
    footer_report:'Rapport Financier',
    page: 'Page',
    of:   '/',
    sign_title:   'Signatures & Cachets',
    treasurer:    'Trésorier(e)',
    president:    'Président(e)',
    prod_title:    'Activité Productive & Ventes',
    prod_sales:    'Chiffre d\'affaires (Ventes)',
    prod_cost:     'Coût de production',
    prod_margin:   'Marge brute',
    prod_events:   'Recettes Événements',
    prod_evcost:   'Coûts Événements',
    prod_evnet:    'Net Événements',
    prod_sales_count: 'Nombre de ventes',
    prod_prod_count: 'Lots produits',
    prod_ev_count:  'Événements',
    recurring_title: 'Paiements Récurrents',
    rec_desc:     'Description',
    rec_amount:   'Montant (MAD)',
    rec_freq:     'Fréquence',
    rec_next:     'Prochaine échéance',
    rec_type:     'Type',
    rec_none:     'Aucun paiement récurrent enregistré.',
    freq_daily:   'Quotidien',
    freq_weekly:  'Hebdomadaire',
    freq_monthly: 'Mensuel',
    freq_quarterly:'Trimestriel',
    freq_yearly:  'Annuel',
  },
  ar: {
    cover_title:   'التقرير المالي',
    cover_sub:     'Rapport Financier',
    exercise:      'السنة المالية',
    assoc_name:    'اسم الجمعية',
    city:          'المدينة',
    email:         'البريد الإلكتروني',
    period_covered:'الفترة المشمولة',
    emit_date:     'تاريخ الإصدار',
    total_income:  'مجموع الإيرادات',
    total_expense: 'مجموع المصاريف',
    balance:       'الرصيد الصافي',
    income_detail: 'الجدول التفصيلي للإيرادات',
    expense_detail:'الجدول التفصيلي للمصاريف',
    nature:   'الطبيعة / الفئة',
    date_inv: 'التاريخ',
    amount:   'المبلغ ب:د.م',
    pay_mode: 'طريقة الأداء',
    doc_ref:  'وثيقة الأداء',
    obs:      'ملاحظات',
    subtotal: 'المجموع الفرعي',
    total:    'المجموع',
    no_income:  'لا توجد إيرادات مسجلة لهذه الفترة.',
    no_expense: 'لا توجد مصاريف مسجلة.',
    operations: 'عملية',
    logo:        'الشعار',
    footer_report:'التقرير المالي',
    page: 'صفحة',
    of:   '/',
    sign_title:   'التوقيعات والأختام',
    treasurer:    'أمين الصندوق',
    president:    'الرئيس',
    prod_title:    'النشاط الإنتاجي والمبيعات',
    prod_sales:    'رقم الأعمال (المبيعات)',
    prod_cost:     'تكلفة الإنتاج',
    prod_margin:   'هامش الربح الإجمالي',
    prod_events:   'إيرادات الفعاليات',
    prod_evcost:   'تكاليف الفعاليات',
    prod_evnet:    'صافي الفعاليات',
    prod_sales_count: 'عدد البيوعات',
    prod_prod_count: 'دفعات الإنتاج',
    prod_ev_count:  'الفعاليات',
    recurring_title: 'الدفعات المتكررة',
    rec_desc:     'الوصف',
    rec_amount:   'المبلغ ب:د.م',
    rec_freq:     'التكرار',
    rec_next:     'الاستحقاق القادم',
    rec_type:     'النوع',
    rec_none:     'لا توجد دفعات متكررة مسجلة.',
    freq_daily:   'يومي',
    freq_weekly:  'أسبوعي',
    freq_monthly: 'شهري',
    freq_quarterly:'ربع سنوي',
    freq_yearly:  'سنوي',
  },
};

// ── Category mapping ───────────────────────────────────────────────────────────
const CAT_MAP = [
  { fr: 'Cotisations',           ar: 'اشتراكات' },
  { fr: 'Dons',                  ar: 'تبرعات' },
  { fr: 'Subventions',           ar: 'منح' },
  { fr: 'Fournitures de bureau', ar: 'لوازم مكتبية' },
  { fr: 'Fournitures',           ar: 'لوازم' },
  { fr: 'Transport',             ar: 'نقل' },
  { fr: 'Salaires',              ar: 'رواتب' },
  { fr: 'Loyer',                 ar: 'إيجار' },
  { fr: 'Communication',         ar: 'تواصل' },
  { fr: 'Formation',             ar: 'تكوين' },
  { fr: 'Autres',                ar: 'أخرى' },
  { fr: 'Autre',                 ar: 'أخرى' },
];
function translateCat(cat, isAr) {
  if (!cat) return isAr ? 'أخرى' : 'Autres';
  if (cat.includes('/')) { const p = cat.split('/'); return isAr ? p[0] : p[1]; }
  for (const m of CAT_MAP) {
    if (cat === m.fr) return isAr ? m.ar : m.fr;
    if (cat === m.ar) return isAr ? m.ar : m.fr;
  }
  return cat;
}
function payMode(ref, isAr) {
  if (!ref) return isAr ? 'صندوق' : 'Espèces';
  const r = ref.toLowerCase();
  if (r.includes('virement') || r.includes('transfert') || r.includes('تحويل')) return isAr ? 'تحويل بنكي' : 'Virement';
  if (r.includes('cheque') || r.includes('chèque') || r.includes('شيك')) return isAr ? 'شيك' : 'Chèque';
  return isAr ? 'صندوق' : 'Espèces';
}

// ── Formatting ─────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

// ── Low-level drawing ──────────────────────────────────────────────────────────
function rect(doc, x, y, w, h, fill, stroke, lw = 0.5) {
  doc.save();
  if (fill)   doc.fillColor(fill);
  if (stroke) doc.strokeColor(stroke).lineWidth(lw);
  doc.rect(x, y, w, h);
  if (fill && stroke) doc.fillAndStroke();
  else if (fill) doc.fill();
  else if (stroke) doc.stroke();
  doc.restore();
}
function checkPage(doc, y, needed = 60) {
  if (y + needed > PAGE_H - 60) { doc.addPage(); return MARGIN + 10; }
  return y;
}
function fitText(doc, text, maxW) {
  let s = String(text || '');
  if (doc.widthOfString(s) <= maxW) return s;
  while (s.length > 1 && doc.widthOfString(s + '…') > maxW) s = s.slice(0, -1);
  return s + '…';
}

// ── Section bar ────────────────────────────────────────────────────────────────
// Blue-tinted bar used as a visual section separator with a title inside.
function sectionBar(doc, text, y, fontBold, isAr) {
  rect(doc, MARGIN, y, CONTENT_W, 28, NAVY_LIGHT, NAVY, 1);
  doc.font(fontBold).fontSize(11).fillColor(NAVY)
    .text(fitText(doc, text, CONTENT_W - 24), MARGIN + 10, y + 8,
      { width: CONTENT_W - 20, align: isAr ? 'right' : 'left', lineBreak: false });
  return y + 34;
}

// ── Table helpers ──────────────────────────────────────────────────────────────
function tableHeader(doc, cols, y, fontBold, isAr) {
  const H = 24;
  rect(doc, MARGIN, y, CONTENT_W, H, NAVY);
  if (isAr) {
    let x = MARGIN + CONTENT_W;
    cols.forEach(({ label, w }) => {
      x -= w;
      doc.font(fontBold).fontSize(8.5).fillColor(C.white)
        .text(fitText(doc, label, w - 6), x + 3, y + 7, { width: w - 6, align: 'right', lineBreak: false });
    });
  } else {
    let x = MARGIN;
    cols.forEach(({ label, w }) => {
      doc.font(fontBold).fontSize(8.5).fillColor(C.white)
        .text(fitText(doc, label, w - 6), x + 3, y + 7, { width: w - 6, align: 'left', lineBreak: false });
      x += w;
    });
  }
  return y + H;
}

function calcRowH(doc, cols, vals, fontReg) {
  let h = 22;
  doc.font(fontReg).fontSize(8.5);
  cols.forEach(({ w, wrap }, i) => {
    if (!wrap) return;
    const s = String(vals[i] ?? '');
    if (!s || s === '-') return;
    h = Math.max(h, doc.heightOfString(s, { width: w - 8 }) + 10);
  });
  return h;
}

function tableRow(doc, cols, vals, y, stripe, fontReg, isAr) {
  const PAD = 5;
  const h = calcRowH(doc, cols, vals, fontReg);
  if (stripe) rect(doc, MARGIN, y, CONTENT_W, h, C.rowAlt);
  rect(doc, MARGIN, y, CONTENT_W, h, null, C.border, 0.4);

  if (isAr) {
    let x = MARGIN + CONTENT_W;
    cols.forEach(({ w, wrap }, i) => {
      x -= w;
      const raw = String(vals[i] ?? '');
      const color = vals[`_c${i}`] || '#1e293b';
      doc.font(fontReg).fontSize(8.5).fillColor(color);
      if (wrap) doc.text(raw || '-', x + 4, y + PAD, { width: w - 8, align: 'right', lineBreak: true });
      else      doc.text(fitText(doc, raw, w - 8), x + 4, y + PAD, { width: w - 6, align: 'right', lineBreak: false });
    });
  } else {
    let x = MARGIN;
    cols.forEach(({ w, wrap }, i) => {
      const raw = String(vals[i] ?? '');
      const color = vals[`_c${i}`] || '#1e293b';
      doc.font(fontReg).fontSize(8.5).fillColor(color);
      if (wrap) doc.text(raw || '-', x + 4, y + PAD, { width: w - 8, align: 'left', lineBreak: true });
      else      doc.text(fitText(doc, raw, w - 8), x + 4, y + PAD, { width: w - 6, align: 'left', lineBreak: false });
      x += w;
    });
  }
  return y + h;
}

function totalRow(doc, cols, vals, y, fontBold, isAr) {
  const H = 24;
  rect(doc, MARGIN, y, CONTENT_W, H, NAVY);
  if (isAr) {
    let x = MARGIN + CONTENT_W;
    cols.forEach(({ w }, i) => {
      x -= w;
      doc.font(fontBold).fontSize(8.5).fillColor(C.white)
        .text(String(vals[i] ?? ''), x + 3, y + 7, { width: w - 6, align: 'right', lineBreak: false });
    });
  } else {
    let x = MARGIN;
    cols.forEach(({ w }, i) => {
      doc.font(fontBold).fontSize(8.5).fillColor(C.white)
        .text(String(vals[i] ?? ''), x + 3, y + 7, { width: w - 6, align: 'left', lineBreak: false });
      x += w;
    });
  }
  return y + H;
}

// ── Main generator ─────────────────────────────────────────────────────────────
async function generateFinancialPDF(req, res) {
  const orgId = req.organization.id;
  const org   = req.organization;
  const year  = parseInt(req.query.year) || new Date().getFullYear();
  const lang  = req.query.lang === 'ar' ? 'ar' : 'fr';
  const isAr  = lang === 'ar';
  const t     = T[lang];

  // Convenience: wrap arw with isAr already bound
  const ar = (str) => arw(str, isAr);

  const start = new Date(year, 0, 1);
  const end   = new Date(year, 11, 31, 23, 59, 59);

  const [transactions, aggIncome, aggExpense, recurringAll, salesAgg, prodAgg, eventsAll] = await Promise.all([
    prisma.transaction.findMany({ where: { organizationId: orgId, date: { gte: start, lte: end } }, orderBy: { date: 'asc' } }),
    prisma.transaction.aggregate({ where: { organizationId: orgId, type: 'INCOME',  date: { gte: start, lte: end } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { organizationId: orgId, type: 'EXPENSE', date: { gte: start, lte: end } }, _sum: { amount: true } }),
    prisma.recurringPayment.findMany({ where: { organizationId: orgId }, orderBy: { nextDueDate: 'asc' } }),
    prisma.assocSale.aggregate({ where: { organizationId: orgId, date: { gte: start, lte: end } }, _sum: { totalAmount: true }, _count: { id: true } }).catch(() => null),
    prisma.assocProduction.aggregate({ where: { organizationId: orgId, date: { gte: start, lte: end } }, _sum: { productionCost: true }, _count: { id: true } }).catch(() => null),
    prisma.assocEvent.findMany({ where: { organizationId: orgId, date: { gte: start, lte: end } }, orderBy: { date: 'asc' } }).catch(() => []),
  ]);

  const totalIncome   = aggIncome._sum.amount  || 0;
  const totalExpenses = aggExpense._sum.amount || 0;
  const balance       = totalIncome - totalExpenses;
  const incomeList    = transactions.filter(x => x.type === 'INCOME');
  const expenseList   = transactions.filter(x => x.type === 'EXPENSE');

  // ── PDFDocument ───────────────────────────────────────────────────────────────
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
  doc.registerFont('AR',       FONT_AR);
  doc.registerFont('AR-Bold',  FONT_AR_BOLD);
  doc.registerFont('AR-Title', FONT_AR_TITLE);

  // Org display fields (Arabic → French fallback)
  const orgName    = isAr ? (org.nameAr    || org.name    || '') : (org.name    || '');
  const orgCity    = isAr ? (org.cityAr    || org.city    || '') : (org.city    || '');
  const orgAddress = isAr ? (org.addressAr || org.address || '') : (org.address || '');

  // Typography tokens — strict hierarchy
  // fontTitle  → decorative Line.ttf — COVER MAIN TITLE only
  // fontBold   → Amiri-Bold  — section headers, labels, column titles
  // fontReg    → Amiri-Regular — all body / data text
  const fontTitle = isAr ? 'AR-Title' : 'Helvetica-Bold';
  const fontBold  = isAr ? 'AR-Bold'  : 'Helvetica-Bold';
  const fontReg   = isAr ? 'AR'       : 'Helvetica';
  const fontAlt   = isAr ? 'Helvetica': 'AR';         // secondary language label

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="rapport_financier_${year}.pdf"`);
  doc.pipe(res);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════════════════════════════════════

  // Header band (full width)
  rect(doc, 0, 0, PAGE_W, 120, NAVY);

  // Logo area (left in LTR, right in RTL)
  const logoX = isAr ? PAGE_W - 120 : 0;
  let logoSrc = null;
  if (org.logo) {
    if (org.logo.startsWith('data:')) {
      try { logoSrc = Buffer.from(org.logo.split(',')[1], 'base64'); } catch (_) {}
    } else {
      const lp = path.join(UPLOAD_DIR, path.basename(org.logo));
      if (fs.existsSync(lp)) logoSrc = lp;
    }
  }
  if (logoSrc) {
    try { doc.image(logoSrc, logoX + 10, 15, { width: 90, height: 90, fit: [90, 90], align: 'center', valign: 'center' }); } catch (_) {}
  }

  // Org name + city in header
  const nameAreaX = isAr ? MARGIN : 120;
  const nameAreaW = CONTENT_W - 90;
  const nameSize  = orgName.length > 28 ? 11 : orgName.length > 18 ? 14 : 17;
  doc.font(fontBold).fontSize(nameSize).fillColor(C.white)
    .text(fitText(doc, ar(orgName) || ar('الجمعية'), nameAreaW - 10), nameAreaX, 28,
      { width: nameAreaW, align: isAr ? 'right' : 'left', lineBreak: false });
  if (orgCity || orgAddress) {
    const sub = [orgCity, orgAddress].filter(Boolean).join(' — ');
    doc.font(fontReg).fontSize(9).fillColor('#bfdbfe')
      .text(fitText(doc, ar(sub), nameAreaW - 10), nameAreaX, 52,
        { width: nameAreaW, align: isAr ? 'right' : 'left', lineBreak: false });
  }
  doc.font(fontReg).fontSize(8.5).fillColor('#93c5fd')
    .text(org.email || '', nameAreaX, 70,
      { width: nameAreaW, align: isAr ? 'right' : 'left', lineBreak: false });

  // Central title box
  const boxY = 148;
  const boxH = 170;
  doc.roundedRect(MARGIN + 20, boxY, CONTENT_W - 40, boxH, 12)
    .strokeColor(NAVY).lineWidth(1.5).stroke();
  rect(doc, MARGIN + 20, boxY, CONTENT_W - 40, 6, NAVY);      // top accent strip

  // Main title — decorative font (fontTitle) for the Arabic cover title
  doc.font(fontTitle).fontSize(26).fillColor(NAVY)
    .text(fitText(doc, ar(t.cover_title), CONTENT_W - 80), MARGIN + 20, boxY + 26,
      { width: CONTENT_W - 40, align: 'center', lineBreak: false });

  // Sub-title in the other language
  doc.font(fontAlt).fontSize(13).fillColor(NAVY_MID)
    .text(fitText(doc, t.cover_sub, CONTENT_W - 80), MARGIN + 20, boxY + 68,
      { width: CONTENT_W - 40, align: 'center', lineBreak: false });

  // Year — bold Amiri (not decorative)
  const yearLabel = isAr ? `${year}  ${ar(t.exercise)}` : `${t.exercise}  ${year}`;
  doc.font(fontBold).fontSize(14).fillColor(NAVY)
    .text(yearLabel, MARGIN + 20, boxY + 104,
      { width: CONTENT_W - 40, align: 'center', lineBreak: false });

  // Date range
  doc.font(fontReg).fontSize(10).fillColor(C.neutral)
    .text(`01/01/${year}  —  31/12/${year}`, MARGIN + 20, boxY + 128,
      { width: CONTENT_W - 40, align: 'center', lineBreak: false });

  // ── Summary KPI cards (income / expense / balance) ─────────────────────────
  const cardY  = 350;
  const cardW  = (CONTENT_W - 20) / 3;
  const cards  = [
    { label: t.total_income,   value: `${fmt(totalIncome)} MAD`,   bg: '#ecfdf5', border: C.income,  text: C.income  },
    { label: t.total_expense,  value: `${fmt(totalExpenses)} MAD`, bg: '#fef2f2', border: C.expense, text: C.expense },
    { label: t.balance,        value: `${fmt(balance)} MAD`,       bg: balance >= 0 ? '#eff6ff' : '#fef2f2', border: balance >= 0 ? NAVY_MID : C.expense, text: balance >= 0 ? NAVY : C.expense },
  ];
  cards.forEach((card, i) => {
    const cx = isAr
      ? MARGIN + (2 - i) * (cardW + 10)
      : MARGIN + i * (cardW + 10);
    rect(doc, cx, cardY, cardW, 80, card.bg, card.border, 1);
    // Label
    doc.font(fontBold).fontSize(9).fillColor(card.text)
      .text(fitText(doc, ar(card.label), cardW - 16), cx + 8, cardY + 12,
        { width: cardW - 16, align: isAr ? 'right' : 'left', lineBreak: false });
    // Value
    doc.font(fontBold).fontSize(15).fillColor(card.text)
      .text(card.value, cx + 8, cardY + 32,
        { width: cardW - 16, align: 'center', lineBreak: false });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — INFO TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  let cy = MARGIN + 10;

  // Page title
  rect(doc, MARGIN, cy, CONTENT_W, 30, NAVY);
  doc.font(fontBold).fontSize(12).fillColor(C.white)
    .text(fitText(doc, ar(t.cover_title) + `  ${year}`, CONTENT_W - 20), MARGIN + 10, cy + 9,
      { width: CONTENT_W - 20, align: isAr ? 'right' : 'left', lineBreak: false });
  cy += 38;

  // Info rows
  const col1W = 190;
  const col2W = CONTENT_W - col1W;
  const infoRows = [
    [t.assoc_name,     ar(orgName) || '-'],
    [t.city,           ar(orgCity) || '-'],
    [t.email,          org.email   || '-'],
    [t.period_covered, `01/01/${year} — 31/12/${year}`],
    [t.emit_date,      fmtDate(new Date())],
  ];
  infoRows.forEach(([label, value], i) => {
    const rh  = 28;
    const ry  = cy + i * rh;
    const bgL = i % 2 === 0 ? NAVY : NAVY_MID;
    const bgV = i % 2 === 0 ? C.white : '#f8fafc';
    if (isAr) {
      // RTL: label on the RIGHT, value on the LEFT
      rect(doc, MARGIN,          ry, col2W, rh, bgV, NAVY, 0.4);
      rect(doc, MARGIN + col2W,  ry, col1W, rh, bgL, NAVY, 0.4);
      doc.font(fontReg).fontSize(9).fillColor('#1e293b')
        .text(fitText(doc, value, col2W - 14), MARGIN + 6, ry + 9,
          { width: col2W - 12, align: 'right', lineBreak: false });
      doc.font(fontBold).fontSize(9).fillColor(C.white)
        .text(fitText(doc, ar(label), col1W - 10), MARGIN + col2W + 4, ry + 9,
          { width: col1W - 8, align: 'right', lineBreak: false });
    } else {
      rect(doc, MARGIN,          ry, col1W, rh, bgL, NAVY, 0.4);
      rect(doc, MARGIN + col1W,  ry, col2W, rh, bgV, NAVY, 0.4);
      doc.font(fontBold).fontSize(9).fillColor(C.white)
        .text(fitText(doc, label, col1W - 14), MARGIN + 6, ry + 9,
          { width: col1W - 12, lineBreak: false });
      doc.font(fontReg).fontSize(9).fillColor('#1e293b')
        .text(fitText(doc, value, col2W - 14), MARGIN + col1W + 6, ry + 9,
          { width: col2W - 12, lineBreak: false });
    }
  });
  cy += infoRows.length * 28 + 32;

  // ── Column layout for transaction tables ────────────────────────────────────
  const cW1 = 50, cW2 = 64, cW3 = 80, cW4 = 60, cW5 = 120;
  const cW0 = CONTENT_W - cW1 - cW2 - cW3 - cW4 - cW5;
  // RTL columns: rightmost = first logical column (التاريخ), then الطبيعة, etc.
  const txCols = isAr
    ? [
        { label: ar(t.date_inv), w: cW1 },
        { label: ar(t.nature),   w: cW0 },
        { label: ar(t.amount),   w: cW2 },
        { label: ar(t.pay_mode), w: cW3 },
        { label: ar(t.doc_ref),  w: cW4 },
        { label: ar(t.obs),      w: cW5, wrap: true },
      ]
    : [
        { label: t.nature,   w: cW0 },
        { label: t.date_inv, w: cW1 },
        { label: t.amount,   w: cW2 },
        { label: t.pay_mode, w: cW3 },
        { label: t.doc_ref,  w: cW4 },
        { label: t.obs,      w: cW5, wrap: true },
      ];

  // ── INCOME section ──────────────────────────────────────────────────────────
  cy = checkPage(doc, cy, 90);
  const incTitle = isAr ? ar(t.income_detail) : t.income_detail;
  cy = sectionBar(doc, incTitle, cy, fontBold, isAr);

  cy = tableHeader(doc, txCols, cy, fontBold, isAr);

  if (incomeList.length === 0) {
    rect(doc, MARGIN, cy, CONTENT_W, 24, C.light, C.border, 0.4);
    doc.font(fontReg).fontSize(9).fillColor(C.neutral)
      .text(ar(t.no_income), MARGIN + 8, cy + 7,
        { width: CONTENT_W - 16, align: isAr ? 'right' : 'left', lineBreak: false });
    cy += 24;
  } else {
    incomeList.forEach((tx, i) => {
      const row = isAr
        ? [fmtDate(tx.date), ar(translateCat(tx.category, true)), fmt(tx.amount), ar(payMode(tx.reference, true)), tx.reference || '-', tx.description || '-']
        : [translateCat(tx.category, false), fmtDate(tx.date), fmt(tx.amount), payMode(tx.reference, false), tx.reference || '-', tx.description || '-'];
      row['_c2'] = C.income;
      cy = checkPage(doc, cy, calcRowH(doc, txCols, row, fontReg) + 4);
      cy = tableRow(doc, txCols, row, cy, i % 2 === 1, fontReg, isAr);
    });
  }
  // Income total bar
  rect(doc, MARGIN, cy, CONTENT_W, 24, '#d1fae5', C.income, 1);
  const incTotalText = isAr
    ? `MAD ${fmt(totalIncome)}  :${ar(t.total)}`
    : `${t.total} :  ${fmt(totalIncome)} MAD`;
  doc.font(fontBold).fontSize(10).fillColor(C.income)
    .text(incTotalText, MARGIN + 8, cy + 7,
      { width: CONTENT_W - 16, align: isAr ? 'right' : 'right', lineBreak: false });
  cy += 30;

  // ── EXPENSE section ─────────────────────────────────────────────────────────
  cy = checkPage(doc, cy, 90);
  const expTitle = isAr ? ar(t.expense_detail) : t.expense_detail;
  cy = sectionBar(doc, expTitle, cy, fontBold, isAr);

  cy = tableHeader(doc, txCols, cy, fontBold, isAr);

  if (expenseList.length === 0) {
    rect(doc, MARGIN, cy, CONTENT_W, 24, C.light, C.border, 0.4);
    doc.font(fontReg).fontSize(9).fillColor(C.neutral)
      .text(ar(t.no_expense), MARGIN + 8, cy + 7,
        { width: CONTENT_W - 16, align: isAr ? 'right' : 'left', lineBreak: false });
    cy += 24;
  } else {
    expenseList.forEach((tx, i) => {
      const row = isAr
        ? [fmtDate(tx.date), ar(translateCat(tx.category, true)), fmt(tx.amount), ar(payMode(tx.reference, true)), tx.reference || '-', tx.description || '-']
        : [translateCat(tx.category, false), fmtDate(tx.date), fmt(tx.amount), payMode(tx.reference, false), tx.reference || '-', tx.description || '-'];
      row['_c2'] = C.expense;
      cy = checkPage(doc, cy, calcRowH(doc, txCols, row, fontReg) + 4);
      cy = tableRow(doc, txCols, row, cy, i % 2 === 1, fontReg, isAr);
    });
  }
  // Expense total bar
  rect(doc, MARGIN, cy, CONTENT_W, 24, '#fee2e2', C.expense, 1);
  const expTotalText = isAr
    ? `MAD ${fmt(totalExpenses)}  :${ar(t.total)}`
    : `${t.total} :  ${fmt(totalExpenses)} MAD`;
  doc.font(fontBold).fontSize(10).fillColor(C.expense)
    .text(expTotalText, MARGIN + 8, cy + 7,
      { width: CONTENT_W - 16, align: 'right', lineBreak: false });
  cy += 32;

  // ── NET BALANCE ─────────────────────────────────────────────────────────────
  cy = checkPage(doc, cy, 56);
  const netColor  = balance >= 0 ? C.income  : C.expense;
  const netBg     = balance >= 0 ? '#ecfdf5' : '#fef2f2';
  const netBorder = balance >= 0 ? '#6ee7b7' : '#fca5a5';
  rect(doc, MARGIN, cy, CONTENT_W, 42, netBg, netBorder, 1.5);
  // Label line
  doc.font(fontBold).fontSize(11).fillColor(netColor)
    .text(ar(t.balance), MARGIN + 12, cy + 7,
      { width: CONTENT_W - 24, align: isAr ? 'right' : 'left', lineBreak: false });
  // Value line (numbers stay LTR)
  const balSign = balance >= 0 ? '+' : '';
  doc.font(fontBold).fontSize(14).fillColor(netColor)
    .text(`${balSign}${fmt(balance)} MAD`, MARGIN + 12, cy + 22,
      { width: CONTENT_W - 24, align: 'center', lineBreak: false });
  cy += 50;

  // ── PRODUCTION & SALES SECTION ──────────────────────────────────────────────
  const hasProdData = salesAgg || prodAgg || (eventsAll && eventsAll.length > 0);
  if (hasProdData) {
    const totalSalesRev  = salesAgg?._sum?.totalAmount || 0;
    const salesCount     = salesAgg?._count?.id || 0;
    const totalProdCost  = prodAgg?._sum?.productionCost || 0;
    const prodCount      = prodAgg?._count?.id || 0;
    const grossMargin    = totalSalesRev - totalProdCost;
    const totalEvRev     = (eventsAll || []).reduce((s, e) => s + (e.revenue || 0), 0);
    const totalEvCost    = (eventsAll || []).reduce((s, e) => s + (e.cost || 0), 0);
    const netEvents      = totalEvRev - totalEvCost;

    cy = checkPage(doc, cy, 100);
    cy += 8;
    cy = sectionBar(doc, isAr ? ar(t.prod_title) : t.prod_title, cy, fontBold, isAr);

    // KPI row — 3 or 6 cells
    const kpiDefs = [
      { label: t.prod_sales,       value: `${fmt(totalSalesRev)} MAD`,  color: C.income,  count: `${salesCount}` },
      { label: t.prod_cost,        value: `${fmt(totalProdCost)} MAD`,  color: C.expense, count: `${prodCount}` },
      { label: t.prod_margin,      value: `${fmt(grossMargin)} MAD`,    color: grossMargin >= 0 ? C.income : C.expense },
    ];
    if (eventsAll && eventsAll.length > 0) {
      kpiDefs.push(
        { label: t.prod_events,  value: `${fmt(totalEvRev)} MAD`,   color: C.income  },
        { label: t.prod_evcost,  value: `${fmt(totalEvCost)} MAD`,  color: C.expense },
        { label: t.prod_evnet,   value: `${fmt(netEvents)} MAD`,    color: netEvents >= 0 ? C.income : C.expense },
      );
    }
    const kpiCols = kpiDefs.length;
    const kpiW = CONTENT_W / kpiCols;
    kpiDefs.forEach((k, i) => {
      const kx = isAr ? MARGIN + (kpiCols - 1 - i) * kpiW : MARGIN + i * kpiW;
      rect(doc, kx, cy, kpiW, 56, C.light, C.border, 0.4);
      doc.font(fontBold).fontSize(8).fillColor(k.color)
        .text(fitText(doc, isAr ? ar(k.label) : k.label, kpiW - 12), kx + 6, cy + 7,
          { width: kpiW - 12, align: isAr ? 'right' : 'left', lineBreak: false });
      doc.font(fontBold).fontSize(12).fillColor(k.color)
        .text(k.value, kx + 6, cy + 22, { width: kpiW - 12, align: 'center', lineBreak: false });
      if (k.count !== undefined) {
        doc.font(fontReg).fontSize(7.5).fillColor(C.neutral)
          .text(k.count + ' ' + (isAr ? ar(t.prod_sales_count) : t.prod_sales_count), kx + 6, cy + 42,
            { width: kpiW - 12, align: isAr ? 'right' : 'left', lineBreak: false });
      }
    });
    cy += 64;

    // Events detail table (if any)
    if (eventsAll && eventsAll.length > 0) {
      cy = checkPage(doc, cy, 50);
      const evCols = isAr
        ? [
            { label: ar(isAr ? 'الفعالية' : 'Événement'), w: 160, wrap: true },
            { label: ar(isAr ? 'النوع' : 'Type'),          w: 60 },
            { label: ar(isAr ? 'التاريخ' : 'Date'),        w: 60 },
            { label: ar(isAr ? 'الإيراد' : 'Recettes'),    w: 70 },
            { label: ar(isAr ? 'التكلفة' : 'Coûts'),       w: 70 },
            { label: ar(isAr ? 'الصافي' : 'Net'),          w: CONTENT_W - 160 - 60 - 60 - 70 - 70 },
          ]
        : [
            { label: 'Événement',  w: 160, wrap: true },
            { label: 'Type',       w: 60 },
            { label: 'Date',       w: 60 },
            { label: 'Recettes',   w: 70 },
            { label: 'Coûts',      w: 70 },
            { label: 'Net',        w: CONTENT_W - 160 - 60 - 60 - 70 - 70 },
          ];
      cy = tableHeader(doc, evCols, cy, fontBold, isAr);
      eventsAll.forEach((ev, i) => {
        const net = (ev.revenue || 0) - (ev.cost || 0);
        const evTypeMap = { EVENT: isAr ? 'فعالية' : 'Événement', CATERING: isAr ? 'تقديم طعام' : 'Traiteur', EXHIBITION: isAr ? 'معرض' : 'Exposition' };
        const row = isAr
          ? [ar(ev.name), ar(evTypeMap[ev.type] || ev.type), fmtDate(ev.date), fmt(ev.revenue || 0), fmt(ev.cost || 0), fmt(net)]
          : [ev.name, evTypeMap[ev.type] || ev.type, fmtDate(ev.date), fmt(ev.revenue || 0), fmt(ev.cost || 0), fmt(net)];
        row['_c3'] = C.income;
        row['_c4'] = C.expense;
        row['_c5'] = net >= 0 ? C.income : C.expense;
        cy = checkPage(doc, cy, 30);
        cy = tableRow(doc, evCols, row, cy, i % 2 === 1, fontReg, isAr);
      });
      cy += 8;
    }
  }

  // ── RECURRING PAYMENTS SECTION ──────────────────────────────────────────────
  cy = checkPage(doc, cy, 90);
  cy += 8;
  const recTitle = isAr ? ar(t.recurring_title) : t.recurring_title;
  cy = sectionBar(doc, recTitle, cy, fontBold, isAr);

  const freqLabel = (f) => {
    const map = { DAILY: t.freq_daily, WEEKLY: t.freq_weekly, MONTHLY: t.freq_monthly, QUARTERLY: t.freq_quarterly, YEARLY: t.freq_yearly };
    return map[f] || f;
  };

  // Columns: Description | Type | Amount | Frequency | Next due date
  const rW0 = 160, rW1 = 55, rW2 = 70, rW3 = 80, rW4 = CONTENT_W - 160 - 55 - 70 - 80;
  const recCols = isAr
    ? [
        { label: ar(t.rec_desc),   w: rW0, wrap: true },
        { label: ar(t.rec_type),   w: rW1 },
        { label: ar(t.rec_amount), w: rW2 },
        { label: ar(t.rec_freq),   w: rW3 },
        { label: ar(t.rec_next),   w: rW4 },
      ]
    : [
        { label: t.rec_desc,   w: rW0, wrap: true },
        { label: t.rec_type,   w: rW1 },
        { label: t.rec_amount, w: rW2 },
        { label: t.rec_freq,   w: rW3 },
        { label: t.rec_next,   w: rW4 },
      ];

  cy = tableHeader(doc, recCols, cy, fontBold, isAr);

  if (recurringAll.length === 0) {
    rect(doc, MARGIN, cy, CONTENT_W, 24, C.light, C.border, 0.4);
    doc.font(fontReg).fontSize(9).fillColor(C.neutral)
      .text(ar(t.rec_none), MARGIN + 8, cy + 7,
        { width: CONTENT_W - 16, align: isAr ? 'right' : 'left', lineBreak: false });
    cy += 24;
  } else {
    recurringAll.forEach((rp, i) => {
      const isInc = rp.type === 'INCOME';
      const typeLabel = isInc ? (isAr ? 'إيراد' : 'Recette') : (isAr ? 'مصروف' : 'Dépense');
      const row = isAr
        ? [ar(rp.description || '-'), ar(typeLabel), fmt(rp.amount), ar(freqLabel(rp.frequency)), fmtDate(rp.nextDueDate)]
        : [rp.description || '-', typeLabel, fmt(rp.amount), freqLabel(rp.frequency), fmtDate(rp.nextDueDate)];
      row['_c2'] = isInc ? C.income : C.expense;
      row['_c1'] = isInc ? C.income : C.expense;
      cy = checkPage(doc, cy, calcRowH(doc, recCols, row, fontReg) + 4);
      cy = tableRow(doc, recCols, row, cy, i % 2 === 1, fontReg, isAr);
    });
  }
  cy += 16;

  // ── SIGNATURE BLOCK ─────────────────────────────────────────────────────────
  cy = checkPage(doc, cy, 90);
  cy += 10;
  cy = sectionBar(doc, ar(t.sign_title), cy, fontBold, isAr);
  const sigW = (CONTENT_W - 20) / 2;
  [[t.treasurer, isAr ? MARGIN : MARGIN],
   [t.president, isAr ? MARGIN + sigW + 20 : MARGIN + sigW + 20]].forEach(([role, x]) => {
    rect(doc, x, cy, sigW, 60, '#fafafa', C.border, 0.5);
    doc.font(fontBold).fontSize(9).fillColor(NAVY)
      .text(ar(role), x + 8, cy + 8, { width: sigW - 16, align: isAr ? 'right' : 'left', lineBreak: false });
    doc.font(fontReg).fontSize(8).fillColor(C.neutral)
      .text(ar(t.sign_title), x + 8, cy + 22, { width: sigW - 16, align: isAr ? 'right' : 'left', lineBreak: false });
    // Signature line
    doc.moveTo(x + 16, cy + 50).lineTo(x + sigW - 16, cy + 50)
      .strokeColor(C.border).lineWidth(0.6).stroke();
  });
  cy += 70;

  // ── FOOTERS (all pages) ─────────────────────────────────────────────────────
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    rect(doc, 0, PAGE_H - 28, PAGE_W, 28, NAVY);
    const footerName = fitText(doc, ar(orgName) || '', CONTENT_W - 100);
    const footerReport = ar(t.footer_report);
    const pageNum = isAr
      ? `${pageCount} ${ar(t.of)} ${i + 1} ${ar(t.page)}`
      : `${t.page} ${i + 1} ${t.of} ${pageCount}`;
    if (isAr) {
      doc.font(fontReg).fontSize(7.5).fillColor('#93c5fd')
        .text(pageNum, MARGIN, PAGE_H - 18, { width: CONTENT_W, align: 'left', lineBreak: false });
      doc.font(fontBold).fontSize(7.5).fillColor('#bfdbfe')
        .text(`${footerName}  —  ${footerReport} ${year}`, MARGIN, PAGE_H - 18,
          { width: CONTENT_W, align: 'right', lineBreak: false });
    } else {
      doc.font(fontBold).fontSize(7.5).fillColor('#bfdbfe')
        .text(`${footerName}  —  ${footerReport} ${year}`, MARGIN, PAGE_H - 18,
          { width: CONTENT_W - 80, lineBreak: false });
      doc.font(fontReg).fontSize(7.5).fillColor('#93c5fd')
        .text(pageNum, MARGIN, PAGE_H - 18,
          { width: CONTENT_W, align: 'right', lineBreak: false });
    }
  }

  doc.end();
}

module.exports = { generateFinancialPDF };
