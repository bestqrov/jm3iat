const PDFDocument = require('pdfkit');
const prisma = require('../config/database');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('./uploads');

// ── Fonts ──────────────────────────────────────────────────────────────────────
const FONT_DIR = path.join(__dirname, '../assets/fonts');
const FONT_AR = path.join(FONT_DIR, 'Amiri-Regular.ttf');
const FONT_AR_BOLD = path.join(FONT_DIR, 'Amiri-Bold.ttf');

// ── Constants ──────────────────────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 38;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BLUE = '#1a3a6b';
const BLUE_LIGHT = '#e8eef7';

const COLORS = {
  income: '#059669',
  expense: '#dc2626',
  neutral: '#6b7280',
  light: '#f8fafc',
  border: '#d1d5db',
  white: '#ffffff',
};

// ── Translations ───────────────────────────────────────────────────────────────
const T = {
  fr: {
    cover_title: 'Rapport Financier',
    cover_sub: 'التقرير المالي',
    exercise: 'Exercice',
    period: 'Période',
    from: 'Du',
    to: 'au',
    assoc_name: "Nom de l'association",
    city: 'Ville',
    email: 'Email',
    period_covered: 'Période couverte',
    emit_date: "Date d'émission",
    total_income: 'Total Recettes',
    total_income_sub: 'مجموع الإيرادات',
    total_expense: 'Total Dépenses',
    total_expense_sub: 'مجموع المصاريف',
    balance: 'Solde net',
    balance_sub: 'الرصيد',
    income_detail: 'Tableau détaillé des Recettes',
    expense_detail: 'Tableau détaillé des Dépenses',
    nature: 'Nature',
    date_inv: 'Date',
    amount: 'Montant',
    pay_mode: 'Mode paiement',
    doc_ref: 'N° Document',
    obs: 'Observations',
    subtotal: 'Sous-total',
    total: 'TOTAL',
    budget_table: 'Tableau comparatif Budget / Réalisation',
    components: 'Composantes',
    budget_prev: 'Budget prévu (MAD)',
    cost_real: 'Coût réalisation (MAD)',
    solde: 'Solde (MAD)',
    register: 'REGISTRE DES DÉPENSES',
    init_balance: 'Solde initial',
    desc: 'Description / Opération',
    bank: 'Solde bancaire (MAD)',
    expenses_col: 'Dépenses (MAD)',
    sig_financial: 'Responsable financier',
    sig_manage: 'Responsable de gestion',
    sig_legal: 'Représentant légal',
    sig_role1: 'Trésorier(e)',
    sig_role3: 'Président(e)',
    no_income: 'Aucune recette enregistrée pour cette période.',
    no_expense: 'Aucune dépense enregistrée.',
    operations: 'opérations',
    logo: 'Logo',
    footer_report: 'Rapport Financier',
    page: 'Page',
    of: '/',
    sign_cachet: 'Signature & Cachet',
  },
  ar: {
    cover_title: 'التقرير المالي',
    cover_sub: 'Rapport Financier',
    exercise: 'السنة المالية',
    period: 'الفترة',
    from: 'من',
    to: 'إلى',
    assoc_name: 'اسم الجمعية',
    city: 'المدينة',
    email: 'البريد الإلكتروني',
    period_covered: 'الفترة المشمولة',
    emit_date: 'تاريخ الإصدار',
    total_income: 'مجموع الإيرادات',
    total_income_sub: 'Total Recettes',
    total_expense: 'مجموع المصاريف',
    total_expense_sub: 'Total Dépenses',
    balance: 'الرصيد الصافي',
    balance_sub: 'Solde net',
    income_detail: 'الجدول التفصيلي للإيرادات',
    expense_detail: 'الجدول التفصيلي للمصاريف',
    nature: 'الطبيعة',
    date_inv: 'التاريخ',
    amount: 'المبلغ',
    pay_mode: 'طريقة الأداء',
    doc_ref: 'وثيقة الأداء',
    obs: 'ملاحظات',
    subtotal: 'المجموع الفرعي',
    total: 'المجموع',
    budget_table: 'الجدول المقارن: الميزانية / الإنجاز',
    components: 'المكونات',
    budget_prev: 'الميزانية المتوقعة (د.م)',
    cost_real: 'تكلفة الإنجاز (د.م)',
    solde: 'الرصيد (د.م)',
    register: 'سجل المصاريف',
    init_balance: 'الرصيد الأولي',
    desc: 'وصف العملية',
    bank: 'الحساب البنكي (د.م)',
    expenses_col: 'المصاريف بالدرهم',
    sig_financial: 'المسؤول المالي عن المشروع',
    sig_manage: 'المسؤول عن تدبير المشروع',
    sig_legal: 'الممثل القانوني',
    sig_role1: 'أمين الصندوق',
    sig_role3: 'الرئيس(ة)',
    no_income: 'لا توجد إيرادات مسجلة لهذه الفترة.',
    no_expense: 'لا توجد مصاريف مسجلة.',
    operations: 'عملية',
    logo: 'الشعار',
    footer_report: 'التقرير المالي',
    page: 'صفحة',
    of: '/',
    sign_cachet: 'التوقيع والختم',
  },
};

// ── Category bilingual mapping ─────────────────────────────────────────────────
const CAT_MAP = [
  { fr: 'Cotisations',        ar: 'اشتراكات' },
  { fr: 'Dons',               ar: 'تبرعات' },
  { fr: 'Subventions',        ar: 'منح' },
  { fr: 'Fournitures de bureau', ar: 'لوازم مكتبية' },
  { fr: 'Fournitures',        ar: 'لوازم مكتبية' },
  { fr: 'Transport',          ar: 'نقل' },
  { fr: 'Salaires',           ar: 'رواتب' },
  { fr: 'Loyer',              ar: 'إيجار' },
  { fr: 'Communication',      ar: 'تواصل' },
  { fr: 'Formation',          ar: 'تكوين' },
  { fr: 'Autres',             ar: 'أخرى' },
  { fr: 'Autre',              ar: 'أخرى' },
];

function translateCategory(cat, isAr) {
  if (!cat) return isAr ? 'أخرى' : 'Autres';
  // Legacy combined format "اشتراكات/Cotisations"
  if (cat.includes('/')) {
    const parts = cat.split('/');
    return isAr ? parts[0] : parts[1];
  }
  for (const m of CAT_MAP) {
    if (cat === m.fr) return isAr ? m.ar : m.fr;
    if (cat === m.ar) return isAr ? m.ar : m.fr;
  }
  return cat; // unknown category — return as stored
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

function getPaymentMode(ref, isAr) {
  if (!ref) return isAr ? 'صندوق' : 'Espèces';
  const r = ref.toLowerCase();
  if (r.includes('virement') || r.includes('avis') || r.includes('transfert') || r.includes('تحويل'))
    return isAr ? 'تحويل بنكي' : 'Virement bancaire';
  if (r.includes('cheque') || r.includes('chèque') || r.includes('شيك'))
    return isAr ? 'شيك' : 'Chèque';
  if (r.includes('espece') || r.includes('caisse') || r.includes('cash') || r.includes('صندوق'))
    return isAr ? 'صندوق' : 'Espèces';
  return isAr ? 'تحويل بنكي' : 'Virement bancaire';
}

function drawRect(doc, x, y, w, h, fill, stroke, lw = 0.5) {
  doc.save();
  if (fill) doc.fillColor(fill);
  if (stroke) doc.strokeColor(stroke).lineWidth(lw);
  doc.rect(x, y, w, h);
  if (fill && stroke) doc.fillAndStroke();
  else if (fill) doc.fill();
  else if (stroke) doc.stroke();
  doc.restore();
}

function checkNewPage(doc, y, needed = 60) {
  if (y + needed > PAGE_H - 55) {
    doc.addPage();
    return MARGIN + 10;
  }
  return y;
}

// Fit text into a column width — truncate with ellipsis if needed
function fitText(doc, text, maxW) {
  if (!text) return '';
  let s = String(text);
  if (doc.widthOfString(s) <= maxW) return s;
  while (s.length > 1 && doc.widthOfString(s + '…') > maxW) s = s.slice(0, -1);
  return s + '…';
}

// ── Table drawing (works for both LTR and RTL) ────────────────────────────────

function drawTableHeader(doc, cols, y, isAr, fontBold, fontReg) {
  const rowH = 24;
  drawRect(doc, MARGIN, y, CONTENT_W, rowH, BLUE);
  if (isAr) {
    // RTL: draw columns right-to-left
    let x = MARGIN + CONTENT_W;
    cols.forEach(({ label, w, align }) => {
      x -= w;
      doc.font(fontBold).fontSize(8.5).fillColor(COLORS.white)
        .text(fitText(doc, label, w - 8), x + 3, y + 7, { width: w - 6, align: align || 'right', lineBreak: false });
    });
  } else {
    let x = MARGIN;
    cols.forEach(({ label, w, align }) => {
      doc.font(fontBold).fontSize(8.5).fillColor(COLORS.white)
        .text(fitText(doc, label, w - 8), x + 3, y + 7, { width: w - 6, align: align || 'left', lineBreak: false });
      x += w;
    });
  }
  return y + rowH;
}

// Compute actual row height — wrap:true columns drive the height
function calcRowH(doc, cols, values, fontReg) {
  const PAD = 5;
  let rowH = 22;
  doc.font(fontReg).fontSize(8.5);
  cols.forEach(({ w, wrap }, i) => {
    if (!wrap) return;
    const text = String(values[i] ?? '');
    if (!text || text === '-') return;
    rowH = Math.max(rowH, doc.heightOfString(text, { width: w - 8 }) + PAD * 2);
  });
  return rowH;
}

function drawTableRow(doc, cols, values, y, stripe, isAr, fontReg) {
  const PAD = 5;
  const rowH = calcRowH(doc, cols, values, fontReg);

  if (stripe) drawRect(doc, MARGIN, y, CONTENT_W, rowH, '#f0f4ff');
  drawRect(doc, MARGIN, y, CONTENT_W, rowH, null, COLORS.border);

  if (isAr) {
    let x = MARGIN + CONTENT_W;
    cols.forEach(({ w, align, wrap }, i) => {
      x -= w;
      const raw = String(values[i] ?? '');
      const color = values[`_color${i}`] || '#1e293b';
      doc.font(fontReg).fontSize(8.5).fillColor(color);
      if (wrap) {
        doc.text(raw || '-', x + 4, y + PAD, { width: w - 8, align: align || 'right', lineBreak: true });
      } else {
        const val = fitText(doc, raw, w - 8);
        doc.text(val, x + 4, y + PAD, { width: w - 6, align: align || 'right', lineBreak: false });
      }
    });
  } else {
    let x = MARGIN;
    cols.forEach(({ w, align, wrap }, i) => {
      const raw = String(values[i] ?? '');
      const color = values[`_color${i}`] || '#1e293b';
      doc.font(fontReg).fontSize(8.5).fillColor(color);
      if (wrap) {
        doc.text(raw || '-', x + 4, y + PAD, { width: w - 8, align: align || 'left', lineBreak: true });
      } else {
        const val = fitText(doc, raw, w - 8);
        doc.text(val, x + 4, y + PAD, { width: w - 6, align: align || 'left', lineBreak: false });
      }
      x += w;
    });
  }
  return y + rowH;
}

function drawTotalRow(doc, cols, values, y, isAr, fontBold) {
  const rowH = 24;
  drawRect(doc, MARGIN, y, CONTENT_W, rowH, BLUE);
  if (isAr) {
    let x = MARGIN + CONTENT_W;
    cols.forEach(({ w, align }, i) => {
      x -= w;
      doc.font(fontBold).fontSize(8.5).fillColor(COLORS.white)
        .text(String(values[i] ?? ''), x + 3, y + 7, { width: w - 6, align: align || 'right', lineBreak: false });
    });
  } else {
    let x = MARGIN;
    cols.forEach(({ w, align }, i) => {
      doc.font(fontBold).fontSize(8.5).fillColor(COLORS.white)
        .text(String(values[i] ?? ''), x + 3, y + 7, { width: w - 6, align: align || 'left', lineBreak: false });
      x += w;
    });
  }
  return y + rowH;
}

function sectionBar(doc, text, y, fontBold) {
  drawRect(doc, MARGIN, y, CONTENT_W, 26, BLUE_LIGHT, BLUE, 1);
  doc.font(fontBold).fontSize(10).fillColor(BLUE)
    .text(fitText(doc, text, CONTENT_W - 24), MARGIN + 8, y + 8, { width: CONTENT_W - 16, align: 'center', lineBreak: false });
  return y + 32;
}

// ── Main generator ─────────────────────────────────────────────────────────────

async function generateFinancialPDF(req, res) {
  const orgId = req.organization.id;
  const org = req.organization;
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const lang = req.query.lang === 'ar' ? 'ar' : 'fr';
  const isAr = lang === 'ar';
  const t = T[lang];

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  const [transactions, allIncome, allExpenses] = await Promise.all([
    prisma.transaction.findMany({
      where: { organizationId: orgId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    }),
    prisma.transaction.aggregate({
      where: { organizationId: orgId, type: 'INCOME', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { organizationId: orgId, type: 'EXPENSE', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = allIncome._sum.amount || 0;
  const totalExpenses = allExpenses._sum.amount || 0;
  const balance = totalIncome - totalExpenses;
  const incomeList = transactions.filter((x) => x.type === 'INCOME');
  const expenseList = transactions.filter((x) => x.type === 'EXPENSE');

  const expCats = {};
  expenseList.forEach((tx) => {
    const cat = tx.category || (isAr ? 'أخرى' : 'Autres');
    if (!expCats[cat]) expCats[cat] = { items: [], total: 0 };
    expCats[cat].items.push(tx);
    expCats[cat].total += tx.amount;
  });
  const incCats = {};
  incomeList.forEach((tx) => {
    const cat = tx.category || (isAr ? 'إيرادات' : 'Recettes');
    incCats[cat] = (incCats[cat] || 0) + tx.amount;
  });

  // Register fonts
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
  doc.registerFont('AR', FONT_AR);
  doc.registerFont('AR-Bold', FONT_AR_BOLD);

  const fontReg = isAr ? 'AR' : 'Helvetica';
  const fontBold = isAr ? 'AR-Bold' : 'Helvetica-Bold';
  const fontAlt = isAr ? 'Helvetica' : 'AR';       // opposite-language font for bilingual content
  const fontAltBold = isAr ? 'Helvetica-Bold' : 'AR-Bold';

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="rapport_financier_${year}.pdf"`);
  doc.pipe(res);

  // ── PAGE 1: COVER ─────────────────────────────────────────────────────────────
  const nameBoxX = isAr ? PAGE_W - 40 - 240 : 40;
  const logoBoxX = isAr ? 40 : PAGE_W - 150;

  // Association name box
  drawRect(doc, nameBoxX, 40, 240, 80, null, BLUE, 2);
  const nameSize = (org.name || '').length > 25 ? 10 : (org.name || '').length > 15 ? 13 : 16;
  doc.font(fontBold).fontSize(nameSize).fillColor(BLUE)
    .text(fitText(doc, org.name || 'Association', 222), nameBoxX + 5, 62, { width: 230, align: 'center', lineBreak: false });

  // Logo box
  drawRect(doc, logoBoxX, 40, 110, 80, null, BLUE, 1);
  const logoFilePath = org.logo ? path.join(UPLOAD_DIR, path.basename(org.logo)) : null;
  if (logoFilePath && fs.existsSync(logoFilePath)) {
    try {
      doc.image(logoFilePath, logoBoxX + 5, 45, { width: 100, height: 60, fit: [100, 60], align: 'center', valign: 'center' });
    } catch { /* fall back to placeholder if image is corrupt */ }
  } else {
    drawRect(doc, logoBoxX + 5, 45, 100, 60, null, '#93c5fd', 0.5);
    doc.font(fontReg).fontSize(8).fillColor('#9ca3af')
      .text(t.logo, logoBoxX + 5, 68, { width: 100, align: 'center', lineBreak: false });
  }

  // Center rounded title box
  const titleBoxW = PAGE_W - 130;
  doc.roundedRect(65, 168, titleBoxW, 165, 10).strokeColor(BLUE).lineWidth(1.5).stroke();
  doc.font(fontBold).fontSize(22).fillColor(BLUE)
    .text(fitText(doc, t.cover_title, titleBoxW - 20), 65, 192, { width: titleBoxW, align: 'center', lineBreak: false });
  doc.font(fontAlt).fontSize(14).fillColor('#374151')
    .text(fitText(doc, t.cover_sub, titleBoxW - 20), 65, 228, { width: titleBoxW, align: 'center', lineBreak: false });
  doc.font(fontBold).fontSize(13).fillColor(BLUE)
    .text(fitText(doc, `${t.exercise} ${year}`, titleBoxW - 20), 65, 264, { width: titleBoxW, align: 'center', lineBreak: false });
  doc.font(fontReg).fontSize(10).fillColor('#6b7280')
    .text(`01/01/${year}  —  31/12/${year}`, 65, 296, { width: titleBoxW, align: 'center', lineBreak: false });

  doc.font(fontBold).fontSize(13).fillColor('#374151')
    .text(fitText(doc, org.name || '', CONTENT_W - 20), MARGIN, 380, { width: CONTENT_W, align: 'center', lineBreak: false });
  if (org.city) {
    doc.font(fontReg).fontSize(11).fillColor('#6b7280')
      .text(fitText(doc, org.city, CONTENT_W - 20), MARGIN, 400, { width: CONTENT_W, align: 'center', lineBreak: false });
  }

  // ── PAGE 2: INFO TABLE ────────────────────────────────────────────────────────
  doc.addPage();
  let cy = MARGIN + 10;

  const col1W = 195;
  const col2W = CONTENT_W - col1W;
  const infoRows = [
    [t.assoc_name, org.name || '-'],
    [t.city, org.city || '-'],
    [t.email, org.email || '-'],
    [t.period_covered, `01/01/${year} - 31/12/${year}`],
    [t.emit_date, fmtDate(new Date())],
  ];
  infoRows.forEach(([label, value], i) => {
    const rh = 28;
    const ry = cy + i * rh;
    const labelBg = i % 2 === 0 ? BLUE : '#234580';
    drawRect(doc, MARGIN, ry, col1W, rh, labelBg, BLUE);
    drawRect(doc, MARGIN + col1W, ry, col2W, rh, i % 2 === 0 ? '#ffffff' : '#f8fafc', BLUE);
    if (isAr) {
      doc.font(fontBold).fontSize(9).fillColor('#ffffff')
        .text(label, MARGIN + 5, ry + 9, { width: col1W - 10, align: 'right', lineBreak: false });
      doc.font(fontBold).fontSize(9).fillColor('#1e293b')
        .text(fitText(doc, value, col2W - 14), MARGIN + col1W + 7, ry + 9, { width: col2W - 14, align: 'right', lineBreak: false });
    } else {
      doc.font(fontBold).fontSize(9).fillColor('#ffffff')
        .text(label, MARGIN + 7, ry + 9, { width: col1W - 14, lineBreak: false });
      doc.font(fontBold).fontSize(9).fillColor('#1e293b')
        .text(fitText(doc, value, col2W - 14), MARGIN + col1W + 7, ry + 9, { width: col2W - 14, lineBreak: false });
    }
  });
  cy += infoRows.length * 28 + 28;

  // ── SHARED COLUMN LAYOUT ──────────────────────────────────────────────────────
  // cW0=Nature  cW1=Date  cW2=Montant  cW3=Mode  cW4=Réf  cW5=Observations(wrap)
  const cW1 = 52, cW2 = 62, cW3 = 82, cW4 = 62;
  const cW5 = 130; // observations — wide, wraps freely
  const cW0 = CONTENT_W - cW1 - cW2 - cW3 - cW4 - cW5; // Nature gets the rest (~131)
  const txCols = isAr
    ? [
        { label: t.obs,      w: cW5, wrap: true },
        { label: t.doc_ref,  w: cW4 },
        { label: t.pay_mode, w: cW3, align: 'right' },
        { label: t.amount,   w: cW2, align: 'right' },
        { label: t.date_inv, w: cW1, align: 'right' },
        { label: t.nature,   w: cW0, align: 'right' },
      ]
    : [
        { label: t.nature,   w: cW0 },
        { label: t.date_inv, w: cW1 },
        { label: t.amount,   w: cW2, align: 'right' },
        { label: t.pay_mode, w: cW3 },
        { label: t.doc_ref,  w: cW4 },
        { label: t.obs,      w: cW5, wrap: true },
      ];

  // ── TABLEAU DÉTAILLÉ DES RECETTES ─────────────────────────────────────────────
  cy = checkNewPage(doc, cy, 80);
  drawRect(doc, MARGIN, cy, CONTENT_W, 28, '#d1fae5', COLORS.income, 1);
  doc.font(fontBold).fontSize(10).fillColor(COLORS.income)
    .text(fitText(doc, `${t.income_detail}  (${incomeList.length} ${t.operations})`, CONTENT_W - 24),
      MARGIN + 8, cy + 9, { width: CONTENT_W - 16, align: isAr ? 'right' : 'left', lineBreak: false });
  cy += 28;

  cy = drawTableHeader(doc, txCols, cy, isAr, fontBold, fontReg);

  if (incomeList.length === 0) {
    drawRect(doc, MARGIN, cy, CONTENT_W, 22, COLORS.light, COLORS.border);
    doc.font(fontReg).fontSize(9).fillColor(COLORS.neutral)
      .text(t.no_income, MARGIN + 8, cy + 6, { width: CONTENT_W - 16, align: isAr ? 'right' : 'left', lineBreak: false });
    cy += 22;
  } else {
    incomeList.forEach((tx, i) => {
      const nature = translateCategory(tx.category, isAr);
      const obs = tx.description || '-';
      const row = isAr
        ? [obs, tx.reference || '-', getPaymentMode(tx.reference, true),  fmt(tx.amount), fmtDate(tx.date), nature]
        : [nature, fmtDate(tx.date), fmt(tx.amount), getPaymentMode(tx.reference, false), tx.reference || '-', obs];
      row[isAr ? '_color3' : '_color2'] = COLORS.income;
      cy = checkNewPage(doc, cy, calcRowH(doc, txCols, row, fontReg) + 4);
      cy = drawTableRow(doc, txCols, row, cy, i % 2 === 1, isAr, fontReg);
    });
  }
  drawRect(doc, MARGIN, cy, CONTENT_W, 22, '#d1fae5', COLORS.income);
  doc.font(fontBold).fontSize(9).fillColor(COLORS.income)
    .text(`${t.total} : ${fmt(totalIncome)} MAD`, MARGIN + 6, cy + 6,
      { width: CONTENT_W - 12, align: isAr ? 'left' : 'right', lineBreak: false });
  cy += 30;

  // ── TABLEAU DÉTAILLÉ DES DÉPENSES ─────────────────────────────────────────────
  cy = checkNewPage(doc, cy, 80);
  drawRect(doc, MARGIN, cy, CONTENT_W, 28, '#fee2e2', COLORS.expense, 1);
  doc.font(fontBold).fontSize(10).fillColor(COLORS.expense)
    .text(fitText(doc, `${t.expense_detail}  (${expenseList.length} ${t.operations})`, CONTENT_W - 24),
      MARGIN + 8, cy + 9, { width: CONTENT_W - 16, align: isAr ? 'right' : 'left', lineBreak: false });
  cy += 28;

  cy = drawTableHeader(doc, txCols, cy, isAr, fontBold, fontReg);

  if (expenseList.length === 0) {
    drawRect(doc, MARGIN, cy, CONTENT_W, 22, COLORS.light, COLORS.border);
    doc.font(fontReg).fontSize(9).fillColor(COLORS.neutral)
      .text(t.no_expense, MARGIN + 8, cy + 6, { width: CONTENT_W - 16, align: isAr ? 'right' : 'left', lineBreak: false });
    cy += 22;
  } else {
    expenseList.forEach((tx, i) => {
      const nature = translateCategory(tx.category, isAr);
      const obs = tx.description || '-';
      const row = isAr
        ? [obs, tx.reference || '-', getPaymentMode(tx.reference, true),  fmt(tx.amount), fmtDate(tx.date), nature]
        : [nature, fmtDate(tx.date), fmt(tx.amount), getPaymentMode(tx.reference, false), tx.reference || '-', obs];
      row[isAr ? '_color3' : '_color2'] = COLORS.expense;
      cy = checkNewPage(doc, cy, calcRowH(doc, txCols, row, fontReg) + 4);
      cy = drawTableRow(doc, txCols, row, cy, i % 2 === 1, isAr, fontReg);
    });
  }
  drawRect(doc, MARGIN, cy, CONTENT_W, 22, '#fee2e2', COLORS.expense);
  doc.font(fontBold).fontSize(9).fillColor(COLORS.expense)
    .text(`${t.total} : ${fmt(totalExpenses)} MAD`, MARGIN + 6, cy + 6,
      { width: CONTENT_W - 12, align: isAr ? 'left' : 'right', lineBreak: false });
  cy += 30;

  // ── SOLDE NET ─────────────────────────────────────────────────────────────────
  cy = checkNewPage(doc, cy, 50);
  cy += 6;
  const netColor = balance >= 0 ? COLORS.income : COLORS.expense;
  const netBg    = balance >= 0 ? '#ecfdf5' : '#fef2f2';
  const netBorder = balance >= 0 ? '#6ee7b7' : '#fca5a5';
  drawRect(doc, MARGIN, cy, CONTENT_W, 36, netBg, netBorder, 1.5);
  const netLabel = isAr
    ? `${fmt(balance)} MAD  :${t.balance}`
    : `${t.balance} :  ${fmt(balance)} MAD`;
  doc.font(fontBold).fontSize(13).fillColor(netColor)
    .text(netLabel, MARGIN + 10, cy + 11, { width: CONTENT_W - 20, align: 'center', lineBreak: false });
  cy += 36;

  // ── FOOTERS ───────────────────────────────────────────────────────────────────
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    drawRect(doc, 0, PAGE_H - 26, PAGE_W, 26, BLUE);
    const footerOrg = fitText(doc, org.name || 'Association', CONTENT_W - 80);
    if (isAr) {
      doc.font(fontReg).fontSize(8).fillColor('#bfdbfe')
        .text(`${t.page} ${i + 1} ${t.of} ${pageCount}`, MARGIN, PAGE_H - 17, { width: CONTENT_W, align: 'left', lineBreak: false });
      doc.font(fontBold).fontSize(8).fillColor('#bfdbfe')
        .text(`${footerOrg}  —  ${t.footer_report} ${year}`, MARGIN, PAGE_H - 17, { width: CONTENT_W, align: 'right', lineBreak: false });
    } else {
      doc.font(fontBold).fontSize(8).fillColor('#bfdbfe')
        .text(`${footerOrg}  —  ${t.footer_report} ${year}`, MARGIN, PAGE_H - 17, { width: CONTENT_W - 80, lineBreak: false });
      doc.font(fontReg).fontSize(8).fillColor('#bfdbfe')
        .text(`${t.page} ${i + 1} ${t.of} ${pageCount}`, MARGIN, PAGE_H - 17, { width: CONTENT_W, align: 'right', lineBreak: false });
    }
  }

  doc.end();
}

module.exports = { generateFinancialPDF };
