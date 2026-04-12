const PDFDocument = require('pdfkit');
const prisma = require('../config/database');
const path = require('path');

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
    income_table: 'Tableau des Recettes',
    expense_table: 'Tableau des Dépenses',
    expense_detail: 'Tableau détaillé des dépenses',
    nature: 'Nature des dépenses',
    date_inv: 'Date facture',
    amount: 'Montant (MAD)',
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
    income_table: 'جدول الإيرادات',
    expense_table: 'جدول المصاريف',
    expense_detail: 'الجدول التفصيلي للمصاريف',
    nature: 'طبيعة المصاريف',
    date_inv: 'تاريخ الفاتورة',
    amount: 'المصاريف بالدرهم',
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

function drawTableRow(doc, cols, values, y, stripe, isAr, fontReg) {
  const rowH = 20;
  if (stripe) drawRect(doc, MARGIN, y, CONTENT_W, rowH, '#f0f4ff');
  drawRect(doc, MARGIN, y, CONTENT_W, rowH, null, COLORS.border);
  if (isAr) {
    let x = MARGIN + CONTENT_W;
    cols.forEach(({ w, align }, i) => {
      x -= w;
      const raw = String(values[i] ?? '');
      const color = values[`_color${i}`] || '#1e293b';
      doc.font(fontReg).fontSize(8.5); // set font BEFORE fitText so widthOfString is accurate
      const val = fitText(doc, raw, w - 8);
      doc.fillColor(color)
        .text(val, x + 3, y + 5, { width: w - 6, align: align || 'right', lineBreak: false });
    });
  } else {
    let x = MARGIN;
    cols.forEach(({ w, align }, i) => {
      const raw = String(values[i] ?? '');
      const color = values[`_color${i}`] || '#1e293b';
      doc.font(fontReg).fontSize(8.5); // set font BEFORE fitText so widthOfString is accurate
      const val = fitText(doc, raw, w - 8);
      doc.fillColor(color)
        .text(val, x + 3, y + 5, { width: w - 6, align: align || 'left', lineBreak: false });
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
  drawRect(doc, logoBoxX + 5, 45, 100, 60, null, '#93c5fd', 0.5);
  doc.font(fontReg).fontSize(8).fillColor('#9ca3af')
    .text(t.logo, logoBoxX + 5, 68, { width: 100, align: 'center', lineBreak: false });

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

  // ── PAGE 2: INFO TABLE + SUMMARY CARDS ────────────────────────────────────────
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
  cy += infoRows.length * 28 + 22;

  // Summary cards
  const cardW = (CONTENT_W - 16) / 3;
  [
    { label: t.total_income, sub: t.total_income_sub, value: `${fmt(totalIncome)} MAD`, color: COLORS.income, bg: '#ecfdf5', border: '#6ee7b7' },
    { label: t.total_expense, sub: t.total_expense_sub, value: `${fmt(totalExpenses)} MAD`, color: COLORS.expense, bg: '#fef2f2', border: '#fca5a5' },
    { label: t.balance, sub: t.balance_sub, value: `${fmt(balance)} MAD`, color: balance >= 0 ? COLORS.income : COLORS.expense, bg: balance >= 0 ? '#eff6ff' : '#fef2f2', border: balance >= 0 ? '#93c5fd' : '#fca5a5' },
  ].forEach(({ label, sub, value, color, bg, border }, i) => {
    const cx = MARGIN + i * (cardW + 8);
    drawRect(doc, cx, cy, cardW, 68, bg, border);
    const align = isAr ? 'right' : 'left';
    doc.font(fontBold).fontSize(9).fillColor(COLORS.neutral)
      .text(fitText(doc, label, cardW - 20), cx + 8, cy + 10, { width: cardW - 16, align, lineBreak: false });
    doc.font(fontAlt).fontSize(8).fillColor(COLORS.neutral)  // fontAlt: sub is always the other language
      .text(fitText(doc, sub, cardW - 20), cx + 8, cy + 22, { width: cardW - 16, align, lineBreak: false });
    doc.font(fontBold).fontSize(13).fillColor(color)
      .text(fitText(doc, value, cardW - 20), cx + 8, cy + 38, { width: cardW - 16, align, lineBreak: false });
  });
  cy += 80;

  // ── INCOME TABLE ──────────────────────────────────────────────────────────────
  cy = checkNewPage(doc, cy, 80);
  cy += 5;
  drawRect(doc, MARGIN, cy, CONTENT_W, 28, '#d1fae5', COLORS.income, 1);
  doc.font(fontBold).fontSize(10).fillColor(COLORS.income)
    .text(fitText(doc, `${t.income_table}  (${incomeList.length} ${t.operations})`, CONTENT_W - 24), MARGIN + 8, cy + 9, { width: CONTENT_W - 16, align: isAr ? 'right' : 'left', lineBreak: false });
  cy += 28;

  const w1 = 60, w2 = 80, w3 = 95, w4 = 90, w5 = 75;
  const w0 = CONTENT_W - w1 - w2 - w3 - w4 - w5;
  const incCols = isAr
    ? [
        { label: t.obs, w: w5 },
        { label: t.doc_ref, w: w4 },
        { label: t.pay_mode, w: w3, align: 'right' },
        { label: t.amount, w: w2, align: 'right' },
        { label: t.date_inv, w: w1, align: 'right' },
        { label: t.nature, w: w0, align: 'right' },
      ]
    : [
        { label: t.nature, w: w0 },
        { label: t.date_inv, w: w1 },
        { label: t.amount, w: w2, align: 'right' },
        { label: t.pay_mode, w: w3 },
        { label: t.doc_ref, w: w4 },
        { label: t.obs, w: w5 },
      ];

  cy = drawTableHeader(doc, incCols, cy, isAr, fontBold, fontReg);

  if (incomeList.length === 0) {
    drawRect(doc, MARGIN, cy, CONTENT_W, 22, COLORS.light, COLORS.border);
    doc.font(fontReg).fontSize(9).fillColor(COLORS.neutral).text(t.no_income, MARGIN + 8, cy + 6, { width: CONTENT_W - 16, align: isAr ? 'right' : 'left', lineBreak: false });
    cy += 22;
  } else {
    incomeList.forEach((tx, i) => {
      cy = checkNewPage(doc, cy, 25);
      const nature = tx.category || '-';
      const obs = tx.description || '-';
      const row = isAr
        ? [obs, tx.reference || '-', getPaymentMode(tx.reference, true), fmt(tx.amount), fmtDate(tx.date), nature]
        : [nature, fmtDate(tx.date), fmt(tx.amount), getPaymentMode(tx.reference, false), tx.reference || '-', obs];
      row[isAr ? '_color3' : '_color2'] = COLORS.income;
      cy = drawTableRow(doc, incCols, row, cy, i % 2 === 1, isAr, fontReg);
    });
  }
  drawRect(doc, MARGIN, cy, CONTENT_W, 22, '#d1fae5', COLORS.income);
  doc.font(fontBold).fontSize(9).fillColor(COLORS.income)
    .text(`${t.total} : ${fmt(totalIncome)} MAD`, MARGIN + 6, cy + 6, { width: CONTENT_W - 12, align: isAr ? 'left' : 'right', lineBreak: false });
  cy += 26;

  // ── PER-CATEGORY EXPENSE TABLES ───────────────────────────────────────────────
  const da = 65, db = 80, dc = 95, dd = 90, de = 70;
  const d0 = CONTENT_W - da - db - dc - dd - de;
  const detCols = isAr
    ? [
        { label: t.obs, w: de },
        { label: t.doc_ref, w: dd },
        { label: t.pay_mode, w: dc, align: 'right' },
        { label: t.amount, w: db, align: 'right' },
        { label: t.date_inv, w: da, align: 'right' },
        { label: t.nature, w: d0, align: 'right' },
      ]
    : [
        { label: t.nature, w: d0 },
        { label: t.date_inv, w: da },
        { label: t.amount, w: db, align: 'right' },
        { label: t.pay_mode, w: dc },
        { label: t.doc_ref, w: dd },
        { label: t.obs, w: de },
      ];

  for (const cat of Object.keys(expCats)) {
    const { items, total } = expCats[cat];
    cy = checkNewPage(doc, cy, 100);
    cy += 6;

    drawRect(doc, MARGIN, cy, CONTENT_W, 28, BLUE_LIGHT, BLUE, 1);
    doc.font(fontBold).fontSize(9.5).fillColor(BLUE)
      .text(fitText(doc, `${t.expense_detail} — ${cat}`, CONTENT_W - 24), MARGIN + 8, cy + 9, { width: CONTENT_W - 16, align: isAr ? 'right' : 'left', lineBreak: false });
    cy += 28;

    cy = drawTableHeader(doc, detCols, cy, isAr, fontBold, fontReg);

    items.forEach((tx, i) => {
      cy = checkNewPage(doc, cy, 25);
      const nature = tx.description || tx.category || '-';
      const obs = tx.description || '-';
      const row = isAr
        ? [obs, tx.reference || '-', getPaymentMode(tx.reference, true), fmt(tx.amount), fmtDate(tx.date), nature]
        : [nature, fmtDate(tx.date), fmt(tx.amount), getPaymentMode(tx.reference, false), tx.reference || '-', obs];
      row[isAr ? '_color3' : '_color2'] = COLORS.expense;
      cy = drawTableRow(doc, detCols, row, cy, i % 2 === 1, isAr, fontReg);
    });

    drawRect(doc, MARGIN, cy, CONTENT_W, 22, '#fee2e2', COLORS.expense);
    doc.font(fontBold).fontSize(9).fillColor(COLORS.expense)
      .text(`${t.subtotal} : ${fmt(total)} MAD`, MARGIN + 6, cy + 6, { width: CONTENT_W - 12, align: isAr ? 'left' : 'right', lineBreak: false });
    cy += 26;
  }

  // ── BUDGET COMPARISON TABLE ───────────────────────────────────────────────────
  cy = checkNewPage(doc, cy, 100);
  cy += 8;
  cy = sectionBar(doc, t.budget_table, cy, fontBold);

  const ca = CONTENT_W - 175 - 110 - 110;
  const cmpCols = isAr
    ? [
        { label: t.solde, w: ca, align: 'right' },
        { label: t.cost_real, w: 110, align: 'right' },
        { label: t.budget_prev, w: 110, align: 'right' },
        { label: t.components, w: 175, align: 'right' },
      ]
    : [
        { label: t.components, w: 175 },
        { label: t.budget_prev, w: 110, align: 'right' },
        { label: t.cost_real, w: 110, align: 'right' },
        { label: t.solde, w: ca, align: 'right' },
      ];

  cy = drawTableHeader(doc, cmpCols, cy, isAr, fontBold, fontReg);

  let cmpIdx = 0;
  Object.entries(incCats).forEach(([cat, amt]) => {
    const row = isAr
      ? ['0.00', fmt(amt), fmt(amt), cat]
      : [cat, fmt(amt), fmt(amt), '0.00'];
    cy = drawTableRow(doc, cmpCols, row, cy, cmpIdx++ % 2 === 1, isAr, fontReg);
  });
  Object.entries(expCats).forEach(([cat, data]) => {
    const budg = incCats[cat] || data.total;
    const sol = budg - data.total;
    const row = isAr
      ? [fmt(sol), fmt(data.total), fmt(budg), cat]
      : [cat, fmt(budg), fmt(data.total), fmt(sol)];
    row[isAr ? '_color0' : '_color3'] = sol >= 0 ? COLORS.income : COLORS.expense;
    cy = drawTableRow(doc, cmpCols, row, cy, cmpIdx++ % 2 === 1, isAr, fontReg);
  });

  const cmpTotVals = isAr
    ? [fmt(balance), fmt(totalExpenses), fmt(totalIncome), t.total]
    : [t.total, fmt(totalIncome), fmt(totalExpenses), fmt(balance)];
  cy = drawTotalRow(doc, cmpCols, cmpTotVals, cy, isAr, fontBold);
  cy += 10;

  // ── EXPENSE REGISTER / سجل المصاريف ──────────────────────────────────────────
  doc.addPage();
  cy = MARGIN + 8;

  drawRect(doc, MARGIN, cy, CONTENT_W, 28, BLUE);
  doc.font(fontBold).fontSize(12).fillColor(COLORS.white)
    .text(fitText(doc, t.register, CONTENT_W - 20), MARGIN + 6, cy + 8, { width: CONTENT_W - 12, align: 'center', lineBreak: false });
  cy += 28;

  // Meta row
  drawRect(doc, MARGIN, cy, CONTENT_W, 32, BLUE_LIGHT, BLUE);
  const mw = CONTENT_W / 2;
  if (isAr) {
    doc.font(fontBold).fontSize(8).fillColor(BLUE)
      .text(`${t.period} : ${year}`, MARGIN + 6, cy + 6, { width: mw - 12, align: 'left', lineBreak: false });
    doc.font(fontBold).fontSize(9).fillColor('#1e293b')
      .text(`${t.init_balance} : ${fmt(totalIncome)} MAD`, MARGIN + 6, cy + 17, { width: mw - 12, align: 'left', lineBreak: false });
    doc.font(fontBold).fontSize(8).fillColor(BLUE)
      .text(fitText(doc, t.assoc_name + ' :', mw - 18), MARGIN + mw + 6, cy + 6, { width: mw - 12, align: 'right', lineBreak: false });
    doc.font(fontBold).fontSize(9).fillColor('#1e293b')
      .text(fitText(doc, org.name || '-', mw - 18), MARGIN + mw + 6, cy + 17, { width: mw - 12, align: 'right', lineBreak: false });
  } else {
    doc.font(fontBold).fontSize(8).fillColor(BLUE)
      .text(`${t.assoc_name} :`, MARGIN + 6, cy + 6, { width: mw - 12, lineBreak: false });
    doc.font(fontBold).fontSize(9).fillColor('#1e293b')
      .text(fitText(doc, org.name || '-', mw - 18), MARGIN + 6, cy + 17, { width: mw - 12, lineBreak: false });
    doc.font(fontBold).fontSize(8).fillColor(BLUE)
      .text(`${t.period} : ${year}`, MARGIN + mw + 6, cy + 6, { width: mw - 12, align: 'right', lineBreak: false });
    doc.font(fontBold).fontSize(9).fillColor('#1e293b')
      .text(`${t.init_balance} : ${fmt(totalIncome)} MAD`, MARGIN + mw + 6, cy + 17, { width: mw - 12, align: 'right', lineBreak: false });
  }
  cy += 40;

  const rW1 = 65, rW3 = 110, rW4 = 105;
  const rW2 = CONTENT_W - rW1 - rW3 - rW4;
  const regCols = isAr
    ? [
        { label: t.expenses_col, w: rW4, align: 'right' },
        { label: t.bank, w: rW3, align: 'right' },
        { label: t.desc, w: rW2, align: 'right' },
        { label: t.date_inv, w: rW1, align: 'right' },
      ]
    : [
        { label: t.date_inv, w: rW1 },
        { label: t.desc, w: rW2 },
        { label: t.bank, w: rW3, align: 'right' },
        { label: t.expenses_col, w: rW4, align: 'right' },
      ];

  cy = drawTableHeader(doc, regCols, cy, isAr, fontBold, fontReg);

  // Initial balance row
  drawRect(doc, MARGIN, cy, CONTENT_W, 22, BLUE_LIGHT, COLORS.border);
  doc.font(fontBold).fontSize(9).fillColor(BLUE);
  if (isAr) {
    doc.text('--', MARGIN + 3, cy + 6, { width: rW4 - 6, align: 'right', lineBreak: false })
      .text(fmt(totalIncome), MARGIN + rW4 + 3, cy + 6, { width: rW3 - 6, align: 'right', lineBreak: false })
      .text(t.init_balance, MARGIN + rW4 + rW3 + 3, cy + 6, { width: rW2 - 6, align: 'right', lineBreak: false })
      .text('', MARGIN + rW4 + rW3 + rW2 + 3, cy + 6, { width: rW1 - 6, align: 'right', lineBreak: false });
  } else {
    doc.text('', MARGIN + 3, cy + 6, { width: rW1 - 6, lineBreak: false })
      .text(t.init_balance, MARGIN + rW1 + 3, cy + 6, { width: rW2 - 6, lineBreak: false })
      .text(fmt(totalIncome), MARGIN + rW1 + rW2 + 3, cy + 6, { width: rW3 - 6, align: 'right', lineBreak: false })
      .text('--', MARGIN + rW1 + rW2 + rW3 + 3, cy + 6, { width: rW4 - 6, align: 'right', lineBreak: false });
  }
  cy += 22;

  let runBal = totalIncome;
  if (expenseList.length === 0) {
    drawRect(doc, MARGIN, cy, CONTENT_W, 22, COLORS.light, COLORS.border);
    doc.font(fontReg).fontSize(9).fillColor(COLORS.neutral)
      .text(t.no_expense, MARGIN + 8, cy + 6, { width: CONTENT_W - 16, align: isAr ? 'right' : 'left', lineBreak: false });
    cy += 22;
  } else {
    expenseList.forEach((tx, i) => {
      cy = checkNewPage(doc, cy, 25);
      runBal -= tx.amount;
      const desc = tx.description || tx.category || '-';
      const row = isAr
        ? [fmt(tx.amount), fmt(runBal), desc, fmtDate(tx.date)]
        : [fmtDate(tx.date), desc, fmt(runBal), fmt(tx.amount)];
      row[isAr ? '_color1' : '_color2'] = runBal >= 0 ? '#374151' : COLORS.expense;
      row[isAr ? '_color0' : '_color3'] = COLORS.expense;
      cy = drawTableRow(doc, regCols, row, cy, i % 2 === 1, isAr, fontReg);
    });
  }

  const regTotVals = isAr
    ? [fmt(totalExpenses), fmt(balance), t.total, '']
    : ['', t.total, fmt(balance), fmt(totalExpenses)];
  cy = drawTotalRow(doc, regCols, regTotVals, cy, isAr, fontBold);
  cy += 12;

  // ── SIGNATURE SECTION ─────────────────────────────────────────────────────────
  cy = checkNewPage(doc, cy, 130);
  cy += 18;

  const sigW = (CONTENT_W - 16) / 3;
  const sigs = [
    { title: t.sig_financial, role: t.sig_role1 },
    { title: t.sig_manage, role: '' },
    { title: t.sig_legal, role: t.sig_role3 },
  ];
  // RTL: reverse order for Arabic
  const sigsOrdered = isAr ? [...sigs].reverse() : sigs;
  sigsOrdered.forEach(({ title, role }, i) => {
    const sx = MARGIN + i * (sigW + 8);
    drawRect(doc, sx, cy, sigW, 100, BLUE_LIGHT, BLUE);
    doc.font(fontBold).fontSize(8.5).fillColor(BLUE)
      .text(fitText(doc, title, sigW - 16), sx + 5, cy + 10, { width: sigW - 10, align: 'center', lineBreak: false });
    if (role) {
      doc.font(fontReg).fontSize(8).fillColor('#6b7280')
        .text(fitText(doc, role, sigW - 16), sx + 5, cy + 26, { width: sigW - 10, align: 'center', lineBreak: false });
    }
    drawRect(doc, sx + 10, cy + 48, sigW - 20, 42, '#ffffff', '#94a3b8');
    doc.font(fontReg).fontSize(7.5).fillColor('#9ca3af')
      .text(fitText(doc, t.sign_cachet, sigW - 24), sx + 10, cy + 78, { width: sigW - 20, align: 'center', lineBreak: false });
  });

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
