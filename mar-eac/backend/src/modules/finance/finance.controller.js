const prisma = require('../../config/database');
const PDFDocument = require('pdfkit');

const getTransactions = async (req, res) => {
  try {
    const { type, category, dateFrom, dateTo } = req.query;
    const where = { organizationId: req.organization.id };

    if (type) where.type = type;
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const tx = await prisma.transaction.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const create = async (req, res) => {
  try {
    const { type, amount, category, description, date, reference } = req.body;

    if (!type || !amount || !category) {
      return res.status(400).json({ message: 'type, amount, and category are required' });
    }
    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ message: 'type must be INCOME or EXPENSE' });
    }

    const tx = await prisma.transaction.create({
      data: {
        organizationId: req.organization.id,
        type,
        amount: parseFloat(amount),
        category,
        description,
        date: date ? new Date(date) : new Date(),
        reference,
      },
    });

    res.status(201).json(tx);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const update = async (req, res) => {
  try {
    const { type, amount, category, description, date, reference } = req.body;
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Transaction not found' });

    const tx = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        type: type ?? existing.type,
        amount: amount ? parseFloat(amount) : existing.amount,
        category: category ?? existing.category,
        description: description ?? existing.description,
        date: date ? new Date(date) : existing.date,
        reference: reference ?? existing.reference,
      },
    });

    res.json(tx);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Transaction not found' });

    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getSummary = async (req, res) => {
  try {
    const orgId = req.organization.id;

    const [incomeResult, expenseResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: { organizationId: orgId, type: 'INCOME' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { organizationId: orgId, type: 'EXPENSE' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalIncome = incomeResult._sum.amount || 0;
    const totalExpenses = expenseResult._sum.amount || 0;

    res.json({
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      incomeCount: incomeResult._count,
      expenseCount: expenseResult._count,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getMonthlySummary = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: { organizationId: orgId, date: { gte: startDate, lte: endDate } },
      select: { type: true, amount: true, date: true },
    });

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expenses: 0,
      balance: 0,
    }));

    transactions.forEach((tx) => {
      const month = new Date(tx.date).getMonth();
      if (tx.type === 'INCOME') monthly[month].income += tx.amount;
      else monthly[month].expenses += tx.amount;
    });

    monthly.forEach((m) => { m.balance = m.income - m.expenses; });

    res.json(monthly);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.transaction.findMany({
      where: { organizationId: req.organization.id },
      select: { category: true },
      distinct: ['category'],
    });
    res.json(categories.map((c) => c.category));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── PDF helpers ────────────────────────────────────────────────────────────────

const fmt = (n) => Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

const COLORS = {
  primary: '#1d4ed8',
  primaryDark: '#1e3a8a',
  income: '#059669',
  expense: '#dc2626',
  neutral: '#6b7280',
  light: '#f8fafc',
  border: '#e2e8f0',
  white: '#ffffff',
  headerBg: '#1e40af',
  sectionBg: '#eff6ff',
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

function drawRect(doc, x, y, w, h, fill, stroke) {
  doc.save();
  if (fill) doc.fillColor(fill);
  if (stroke) doc.strokeColor(stroke);
  doc.rect(x, y, w, h);
  if (fill && stroke) doc.fillAndStroke();
  else if (fill) doc.fill();
  else if (stroke) doc.stroke();
  doc.restore();
}

function sectionTitle(doc, title, y) {
  drawRect(doc, MARGIN, y, CONTENT_W, 26, COLORS.sectionBg, COLORS.border);
  doc.fontSize(11).fillColor(COLORS.primaryDark).font('Helvetica-Bold')
    .text(title, MARGIN + 10, y + 7, { width: CONTENT_W - 20 });
  return y + 34;
}

function tableHeader(doc, cols, y) {
  const rowH = 22;
  drawRect(doc, MARGIN, y, CONTENT_W, rowH, COLORS.headerBg);
  let x = MARGIN;
  cols.forEach(({ label, w, align }) => {
    doc.fontSize(9).fillColor(COLORS.white).font('Helvetica-Bold')
      .text(label, x + 4, y + 6, { width: w - 8, align: align || 'left' });
    x += w;
  });
  return y + rowH;
}

function tableRow(doc, cols, values, y, stripe) {
  const rowH = 20;
  if (stripe) drawRect(doc, MARGIN, y, CONTENT_W, rowH, '#f1f5f9');
  drawRect(doc, MARGIN, y, CONTENT_W, rowH, null, COLORS.border);
  let x = MARGIN;
  cols.forEach(({ w, align }, i) => {
    const val = String(values[i] ?? '');
    const color = values[`_color${i}`] || '#374151';
    doc.fontSize(9).fillColor(color).font('Helvetica')
      .text(val, x + 4, y + 5, { width: w - 8, align: align || 'left', lineBreak: false });
    x += w;
  });
  return y + rowH;
}

function checkNewPage(doc, y, needed = 60) {
  if (y + needed > PAGE_H - 60) {
    doc.addPage();
    return MARGIN + 20;
  }
  return y;
}

// ── Payment mode detector ──────────────────────────────────────────────────────

function getPaymentMode(ref) {
  if (!ref) return 'Especes';
  const r = ref.toLowerCase();
  if (r.includes('virement') || r.includes('avis') || r.includes('transfert')) return 'Virement bancaire';
  if (r.includes('cheque') || r.includes('chèque')) return 'Cheque';
  if (r.includes('espece') || r.includes('caisse') || r.includes('cash')) return 'Especes';
  return 'Virement bancaire';
}

// ── Main export ────────────────────────────────────────────────────────────────

const exportPDF = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const org = req.organization;
    const year = parseInt(req.query.year) || new Date().getFullYear();
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

    const incomeList = transactions.filter((t) => t.type === 'INCOME');
    const expenseList = transactions.filter((t) => t.type === 'EXPENSE');

    // Group expenses by category
    const expCats = {};
    expenseList.forEach((tx) => {
      const cat = tx.category || 'Autres';
      if (!expCats[cat]) expCats[cat] = { items: [], total: 0 };
      expCats[cat].items.push(tx);
      expCats[cat].total += tx.amount;
    });

    // Group income by category
    const incCats = {};
    incomeList.forEach((tx) => {
      const cat = tx.category || 'Recettes';
      incCats[cat] = (incCats[cat] || 0) + tx.amount;
    });

    const BLUE = '#1a3a6b';
    const BLUE_LIGHT = '#e8eef7';

    // ── Build PDF ──────────────────────────────────────────────────────────────
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport_financier_${year}.pdf"`);
    doc.pipe(res);

    // ─── PAGE 1: Cover (matching reference layout) ────────────────────────────
    // Association name box (top left) — like reference
    doc.rect(40, 40, 240, 80).strokeColor(BLUE).lineWidth(2).stroke();
    const nameSize = (org.name || '').length > 25 ? 12 : (org.name || '').length > 15 ? 15 : 18;
    doc.fontSize(nameSize).fillColor(BLUE).font('Helvetica-Bold')
      .text(org.name || 'Association', 50, 55, { width: 220, align: 'center' });

    // Logo placeholder box (top right) — user can replace with actual logo
    doc.rect(PAGE_W - 150, 40, 110, 80).strokeColor(BLUE).lineWidth(1).stroke();
    doc.rect(PAGE_W - 145, 45, 100, 60).strokeColor('#93c5fd').lineWidth(0.5).dash(3).stroke();
    doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
      .text('Logo', PAGE_W - 125, 62, { width: 60, align: 'center' });
    doc.fontSize(7).fillColor('#9ca3af')
      .text('Association', PAGE_W - 125, 74, { width: 60, align: 'center' });

    // Center rounded box with title — like reference
    doc.roundedRect(70, 170, PAGE_W - 140, 160, 10).strokeColor(BLUE).lineWidth(1.5).stroke();
    doc.fontSize(22).fillColor(BLUE).font('Helvetica-Bold')
      .text('التقرير المالي', 70, 196, { width: PAGE_W - 140, align: 'center' });
    doc.fontSize(16).fillColor('#374151').font('Helvetica')
      .text('Rapport Financier', 70, 232, { width: PAGE_W - 140, align: 'center' });
    doc.fontSize(14).fillColor(BLUE).font('Helvetica-Bold')
      .text(`Exercice ${year}`, 70, 268, { width: PAGE_W - 140, align: 'center' });
    doc.fontSize(10).fillColor('#6b7280').font('Helvetica')
      .text(`01/01/${year}  -  31/12/${year}`, 70, 300, { width: PAGE_W - 140, align: 'center' });

    // Org name bottom of cover
    doc.fontSize(13).fillColor('#374151').font('Helvetica')
      .text(org.name || '', MARGIN, 380, { width: CONTENT_W, align: 'center' });
    if (org.city) {
      doc.fontSize(11).fillColor('#6b7280').font('Helvetica')
        .text(org.city, MARGIN, 400, { width: CONTENT_W, align: 'center' });
    }

    // ─── PAGE 2: Association info + financial summary ─────────────────────────
    doc.addPage();
    let cy = MARGIN + 10;

    // Info table (like reference page 2 table)
    const col1W = 190;
    const col2W = CONTENT_W - col1W;
    const infoRows = [
      ['Nom de l\'association / اسم الجمعية', org.name || '-'],
      ['Ville / Région / المدينة', org.city || '-'],
      ['Email', org.email || '-'],
      ['Periode couverte / الفترة', `01/01/${year} - 31/12/${year}`],
      ['Date d\'emission / تاريخ الإصدار', fmtDate(new Date())],
    ];
    infoRows.forEach(([label, value], i) => {
      const rh = 30;
      const ry = cy + i * rh;
      const bgLabel = i % 2 === 0 ? BLUE : '#234580';
      drawRect(doc, MARGIN, ry, col1W, rh, bgLabel, BLUE);
      doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold')
        .text(label, MARGIN + 6, ry + 10, { width: col1W - 12 });
      drawRect(doc, MARGIN + col1W, ry, col2W, rh, i % 2 === 0 ? '#ffffff' : '#f8fafc', BLUE);
      doc.fontSize(10).fillColor('#1e293b').font('Helvetica-Bold')
        .text(value, MARGIN + col1W + 8, ry + 10, { width: col2W - 16 });
    });
    cy += infoRows.length * 30 + 25;

    // Financial summary cards
    const cardW = (CONTENT_W - 20) / 3;
    const cards = [
      { label: 'Total Recettes', sub: 'مجموع الإيرادات', value: `${fmt(totalIncome)} MAD`, color: COLORS.income, bg: '#ecfdf5', border: '#6ee7b7' },
      { label: 'Total Depenses', sub: 'مجموع المصاريف', value: `${fmt(totalExpenses)} MAD`, color: COLORS.expense, bg: '#fef2f2', border: '#fca5a5' },
      { label: 'Solde net', sub: 'الرصيد', value: `${fmt(balance)} MAD`, color: balance >= 0 ? COLORS.income : COLORS.expense, bg: balance >= 0 ? '#eff6ff' : '#fef2f2', border: balance >= 0 ? '#93c5fd' : '#fca5a5' },
    ];
    cards.forEach(({ label, sub, value, color, bg, border }, i) => {
      const cx = MARGIN + i * (cardW + 10);
      drawRect(doc, cx, cy, cardW, 70, bg, border);
      doc.fontSize(9).fillColor(COLORS.neutral).font('Helvetica').text(label, cx + 10, cy + 10, { width: cardW - 20 });
      doc.fontSize(8).fillColor(COLORS.neutral).font('Helvetica').text(sub, cx + 10, cy + 22, { width: cardW - 20 });
      doc.fontSize(13).fillColor(color).font('Helvetica-Bold').text(value, cx + 10, cy + 38, { width: cardW - 20 });
    });
    cy += 86;

    // ─── INCOME TABLE ─────────────────────────────────────────────────────────
    cy = checkNewPage(doc, cy, 80);
    cy += 6;
    drawRect(doc, MARGIN, cy, CONTENT_W, 28, '#d1fae5', COLORS.income);
    doc.fontSize(10).fillColor(COLORS.income).font('Helvetica-Bold')
      .text(`Tableau des Recettes / جدول الإيرادات  (${incomeList.length} operations)`, MARGIN + 8, cy + 9, { width: CONTENT_W - 16 });
    cy += 28;

    const incCols = [
      { label: 'Nature / الفئة', w: 150 },
      { label: 'Date', w: 70 },
      { label: 'Montant MAD\nالمبلغ بالدرهم', w: 90, align: 'right' },
      { label: 'Mode paiement\nطريقة الأداء', w: 100 },
      { label: 'N° Document\nوثيقة الأداء', w: 80 },
      { label: 'Observations / ملاحظات', w: CONTENT_W - 150 - 70 - 90 - 100 - 80 },
    ];
    cy = tableHeader(doc, incCols, cy);

    if (incomeList.length === 0) {
      drawRect(doc, MARGIN, cy, CONTENT_W, 22, COLORS.light, COLORS.border);
      doc.fontSize(9).fillColor(COLORS.neutral).font('Helvetica').text('Aucune recette enregistree pour cette periode.', MARGIN + 10, cy + 6);
      cy += 22;
    } else {
      incomeList.forEach((tx, i) => {
        cy = checkNewPage(doc, cy, 25);
        const row = [
          (tx.category || '-').substring(0, 25),
          fmtDate(tx.date),
          fmt(tx.amount),
          getPaymentMode(tx.reference),
          (tx.reference || '-').substring(0, 18),
          (tx.description || '-').substring(0, 30),
        ];
        row['_color2'] = COLORS.income;
        cy = tableRow(doc, incCols, row, cy, i % 2 === 1);
      });
    }
    drawRect(doc, MARGIN, cy, CONTENT_W, 22, '#d1fae5', COLORS.income);
    doc.fontSize(9).fillColor(COLORS.income).font('Helvetica-Bold')
      .text(`Total recettes / مجموع الإيرادات : ${fmt(totalIncome)} MAD`, MARGIN + 6, cy + 6, { width: CONTENT_W - 12, align: 'right' });
    cy += 28;

    // ─── PER-CATEGORY EXPENSE TABLES (reference pages 7-9) ───────────────────
    const expCatNames = Object.keys(expCats);
    for (let ci = 0; ci < expCatNames.length; ci++) {
      const cat = expCatNames[ci];
      const { items, total } = expCats[cat];

      cy = checkNewPage(doc, cy, 100);
      cy += 8;

      // Category header — matches reference "الجدول التفصيلي للمصاريف" style
      drawRect(doc, MARGIN, cy, CONTENT_W, 28, BLUE_LIGHT, BLUE);
      doc.fontSize(10).fillColor(BLUE).font('Helvetica-Bold')
        .text(`Tableau detaille des depenses / الجدول التفصيلي للمصاريف — ${cat}`, MARGIN + 8, cy + 9, { width: CONTENT_W - 16 });
      cy += 28;

      // Reference-matching columns: طبيعة المصاريف | تاريخ الفاتورة | المصاريف بالدرهم | طريقة الأداء | وثيقة الأداء | ملاحظات
      const detCols = [
        { label: 'Nature des depenses\nطبيعة المصاريف', w: 145 },
        { label: 'Date facture\nتاريخ الفاتورة', w: 68 },
        { label: 'Montant MAD\nالمصاريف بالدرهم', w: 88, align: 'right' },
        { label: 'Mode paiement\nطريقة الأداء', w: 100 },
        { label: 'N° Document\nوثيقة الأداء', w: 82 },
        { label: 'Observations / ملاحظات', w: CONTENT_W - 145 - 68 - 88 - 100 - 82 },
      ];
      cy = tableHeader(doc, detCols, cy);

      items.forEach((tx, i) => {
        cy = checkNewPage(doc, cy, 25);
        const row = [
          (tx.description || tx.category || '-').substring(0, 28),
          fmtDate(tx.date),
          fmt(tx.amount),
          getPaymentMode(tx.reference),
          (tx.reference || '-').substring(0, 18),
          (tx.description || '-').substring(0, 28),
        ];
        row['_color2'] = COLORS.expense;
        cy = tableRow(doc, detCols, row, cy, i % 2 === 1);
      });

      // Subtotal row
      drawRect(doc, MARGIN, cy, CONTENT_W, 22, '#fee2e2', COLORS.expense);
      doc.fontSize(9).fillColor(COLORS.expense).font('Helvetica-Bold')
        .text(`Sous-total / المجموع : ${fmt(total)} MAD`, MARGIN + 6, cy + 6, { width: CONTENT_W - 12, align: 'right' });
      cy += 28;
    }

    // ─── BUDGET COMPARISON TABLE (reference page 10) ──────────────────────────
    cy = checkNewPage(doc, cy, 100);
    cy += 10;
    drawRect(doc, MARGIN, cy, CONTENT_W, 28, BLUE_LIGHT, BLUE);
    doc.fontSize(11).fillColor(BLUE).font('Helvetica-Bold')
      .text('Tableau comparatif Budget / Realisation / الجدول التفصيلي المقارن', MARGIN + 8, cy + 9, { width: CONTENT_W - 16 });
    cy += 28;

    // Columns: مكونات المشروع | الميزانية المتوقعة | تكلفة الإنجاز | الرصيد
    const cmpCols = [
      { label: 'Composantes / المكونات', w: 175 },
      { label: 'Budget prevu (MAD)\nالميزانية المتوقعة', w: 110, align: 'right' },
      { label: 'Cout realisation (MAD)\nتكلفة الإنجاز', w: 110, align: 'right' },
      { label: 'Solde (MAD)\nالرصيد', w: CONTENT_W - 175 - 110 - 110, align: 'right' },
    ];
    cy = tableHeader(doc, cmpCols, cy);

    let cmpIdx = 0;
    // Income rows
    Object.entries(incCats).forEach(([cat, amt]) => {
      const row = [cat, fmt(amt), fmt(amt), '0.00'];
      cy = tableRow(doc, cmpCols, row, cy, cmpIdx++ % 2 === 1);
    });
    // Expense rows
    Object.entries(expCats).forEach(([cat, data]) => {
      const budg = incCats[cat] || data.total;
      const sol = budg - data.total;
      const row = [cat, fmt(budg), fmt(data.total), fmt(sol)];
      row['_color3'] = sol >= 0 ? COLORS.income : COLORS.expense;
      cy = tableRow(doc, cmpCols, row, cy, cmpIdx++ % 2 === 1);
    });

    // Totals
    drawRect(doc, MARGIN, cy, CONTENT_W, 26, BLUE);
    doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold');
    const cmpX = [MARGIN, MARGIN + 175, MARGIN + 285, MARGIN + 395];
    const cmpW = [171, 106, 106, CONTENT_W - 395];
    ['Total / المجموع', fmt(totalIncome), fmt(totalExpenses), fmt(balance)].forEach((v, i) => {
      doc.text(v, cmpX[i] + 4, cy + 8, { width: cmpW[i] - 8, align: i === 0 ? 'left' : 'right' });
    });
    cy += 34;

    // ─── EXPENSE REGISTER / سجل المصاريف (reference page 11) ─────────────────
    doc.addPage();
    cy = MARGIN + 10;

    // Header info block — matches reference meta table
    drawRect(doc, MARGIN, cy, CONTENT_W, 26, BLUE);
    doc.fontSize(12).fillColor('#ffffff').font('Helvetica-Bold')
      .text('REGISTRE DES DEPENSES / سجل المصاريف', MARGIN + 6, cy + 7, { width: CONTENT_W - 12, align: 'center' });
    cy += 26;

    // Meta row (اسم الجمعية | رمز المشروع | الشطر)
    drawRect(doc, MARGIN, cy, CONTENT_W, 30, BLUE_LIGHT, BLUE);
    const mw = CONTENT_W / 2;
    doc.fontSize(8).fillColor(BLUE).font('Helvetica-Bold')
      .text('Nom de l\'association / اسم الجمعية :', MARGIN + 6, cy + 5, { width: mw - 12 });
    doc.fontSize(9).fillColor('#1e293b').font('Helvetica-Bold')
      .text(org.name || '-', MARGIN + 6, cy + 16, { width: mw - 12 });
    doc.fontSize(8).fillColor(BLUE).font('Helvetica-Bold')
      .text(`Periode / الفترة : ${year}`, MARGIN + mw + 6, cy + 5, { width: mw - 12 });
    doc.fontSize(9).fillColor('#1e293b').font('Helvetica-Bold')
      .text(`Solde initial / الرصيد الأولي : ${fmt(totalIncome)} MAD`, MARGIN + mw + 6, cy + 16, { width: mw - 12 });
    cy += 38;

    // Register columns: التاريخ | وصف العملية | الحساب البنكي | المصاريف بالدرهم
    const regW3 = 115;
    const regW4 = 105;
    const regW1 = 72;
    const regW2 = CONTENT_W - regW1 - regW3 - regW4;
    const regCols = [
      { label: 'Date / التاريخ', w: regW1 },
      { label: 'Description / وصف العملية', w: regW2 },
      { label: 'Solde bancaire (MAD)\nالحساب البنكي', w: regW3, align: 'right' },
      { label: 'Depenses (MAD)\nالمصاريف بالدرهم', w: regW4, align: 'right' },
    ];
    cy = tableHeader(doc, regCols, cy);

    // Initial balance row
    drawRect(doc, MARGIN, cy, CONTENT_W, 22, BLUE_LIGHT, COLORS.border);
    doc.fontSize(9).fillColor(BLUE).font('Helvetica-Bold')
      .text('', MARGIN + 4, cy + 6, { width: regW1 - 8 })
      .text('Solde initial / الرصيد الأولي', MARGIN + regW1 + 4, cy + 6, { width: regW2 - 8 })
      .text(fmt(totalIncome), MARGIN + regW1 + regW2 + 4, cy + 6, { width: regW3 - 8, align: 'right' })
      .text('--', MARGIN + regW1 + regW2 + regW3 + 4, cy + 6, { width: regW4 - 8, align: 'right' });
    cy += 22;

    let runBal = totalIncome;
    expenseList.forEach((tx, i) => {
      cy = checkNewPage(doc, cy, 25);
      runBal -= tx.amount;
      const desc = (tx.description || tx.category || '-').substring(0, 50);
      const row = [fmtDate(tx.date), desc, fmt(runBal), fmt(tx.amount)];
      row['_color2'] = runBal >= 0 ? '#374151' : COLORS.expense;
      row['_color3'] = COLORS.expense;
      cy = tableRow(doc, regCols, row, cy, i % 2 === 1);
    });

    if (expenseList.length === 0) {
      drawRect(doc, MARGIN, cy, CONTENT_W, 22, COLORS.light, COLORS.border);
      doc.fontSize(9).fillColor(COLORS.neutral).font('Helvetica').text('Aucune depense enregistree.', MARGIN + 10, cy + 6);
      cy += 22;
    }

    // Total row
    drawRect(doc, MARGIN, cy, CONTENT_W, 26, BLUE);
    doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold')
      .text('Total / المجموع', MARGIN + 4, cy + 8, { width: regW1 + regW2 - 8 })
      .text(fmt(balance), MARGIN + regW1 + regW2 + 4, cy + 8, { width: regW3 - 8, align: 'right' })
      .text(fmt(totalExpenses), MARGIN + regW1 + regW2 + regW3 + 4, cy + 8, { width: regW4 - 8, align: 'right' });
    cy += 34;

    // ─── SIGNATURE SECTION (reference pages 4 & 12) ───────────────────────────
    cy = checkNewPage(doc, cy, 130);
    cy += 20;

    // 3-column signature table — matches reference exactly
    const sigW = (CONTENT_W - 20) / 3;
    const sigDefs = [
      { fr: 'Responsable financier du projet', ar: 'المسؤول المالي عن المشروع', sub: 'Tresorier' },
      { fr: 'Responsable de gestion du projet', ar: 'المسؤول عن تdbir المشروع', sub: '' },
      { fr: 'Représentant légal', ar: 'الممثل القانوني للشريك', sub: 'Président(e)' },
    ];
    sigDefs.forEach(({ fr, ar, sub }, i) => {
      const sx = MARGIN + i * (sigW + 10);
      drawRect(doc, sx, cy, sigW, 100, BLUE_LIGHT, BLUE);
      doc.fontSize(8).fillColor(BLUE).font('Helvetica-Bold')
        .text(fr, sx + 5, cy + 8, { width: sigW - 10, align: 'center' });
      doc.fontSize(8).fillColor(BLUE).font('Helvetica')
        .text(ar, sx + 5, cy + 22, { width: sigW - 10, align: 'center' });
      if (sub) {
        doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
          .text(sub, sx + 5, cy + 36, { width: sigW - 10, align: 'center' });
      }
      // Signature area (empty box)
      doc.rect(sx + 10, cy + 50, sigW - 20, 40).strokeColor('#94a3b8').lineWidth(0.5).stroke();
    });
    cy += 110;

    // ─── FOOTERS on every page ────────────────────────────────────────────────
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      drawRect(doc, 0, PAGE_H - 28, PAGE_W, 28, BLUE);
      doc.fontSize(8).fillColor('#bfdbfe').font('Helvetica')
        .text(`${org.name || 'Association'}  —  Rapport Financier ${year}`, MARGIN, PAGE_H - 18, { width: CONTENT_W - 80 })
        .text(`Page ${i + 1} / ${pageCount}`, MARGIN, PAGE_H - 18, { width: CONTENT_W, align: 'right' });
    }

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' });
  }
};

module.exports = {
  getTransactions, getById, create, update, remove,
  getSummary, getMonthlySummary, getCategories, exportPDF,
};
