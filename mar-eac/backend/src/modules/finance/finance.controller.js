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

// ── Main export ────────────────────────────────────────────────────────────────

const exportPDF = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const org = req.organization;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const [transactions, allIncome, allExpenses, monthlyTx] = await Promise.all([
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
      prisma.transaction.findMany({
        where: { organizationId: orgId, date: { gte: startDate, lte: endDate } },
        select: { type: true, amount: true, date: true },
      }),
    ]);

    const totalIncome = allIncome._sum.amount || 0;
    const totalExpenses = allExpenses._sum.amount || 0;
    const balance = totalIncome - totalExpenses;

    const incomeList = transactions.filter((t) => t.type === 'INCOME');
    const expenseList = transactions.filter((t) => t.type === 'EXPENSE');

    // Monthly aggregation
    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i, income: 0, expenses: 0 }));
    monthlyTx.forEach((tx) => {
      const m = new Date(tx.date).getMonth();
      if (tx.type === 'INCOME') monthly[m].income += tx.amount;
      else monthly[m].expenses += tx.amount;
    });
    const MONTH_NAMES = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

    // ── Build PDF ──────────────────────────────────────────────────────────────
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport_financier_${year}.pdf"`);
    doc.pipe(res);

    // ─── PAGE 1: Cover ────────────────────────────────────────────────────────
    // Top bar
    drawRect(doc, 0, 0, PAGE_W, 140, COLORS.headerBg);
    doc.fontSize(22).fillColor(COLORS.white).font('Helvetica-Bold')
      .text(org.name || 'Association', MARGIN, 38, { width: CONTENT_W, align: 'center' });
    doc.fontSize(14).fillColor('#bfdbfe').font('Helvetica')
      .text('RAPPORT FINANCIER ANNUEL', MARGIN, 70, { width: CONTENT_W, align: 'center' });
    doc.fontSize(13).fillColor(COLORS.white).font('Helvetica-Bold')
      .text(`Exercice ${year}`, MARGIN, 95, { width: CONTENT_W, align: 'center' });

    // Meta info row
    drawRect(doc, MARGIN, 155, CONTENT_W, 50, COLORS.light, COLORS.border);
    const metaItems = [
      ['Ville', org.city || '-'],
      ['Date de génération', fmtDate(new Date())],
      ['Période', `01/01/${year} – 31/12/${year}`],
    ];
    const metaW = CONTENT_W / 3;
    metaItems.forEach(([label, val], i) => {
      const mx = MARGIN + i * metaW;
      doc.fontSize(8).fillColor(COLORS.neutral).font('Helvetica')
        .text(label, mx + 8, 163, { width: metaW - 16 });
      doc.fontSize(10).fillColor('#1e293b').font('Helvetica-Bold')
        .text(val, mx + 8, 175, { width: metaW - 16 });
    });

    // Summary cards
    let cy = 225;
    doc.fontSize(11).fillColor(COLORS.primaryDark).font('Helvetica-Bold')
      .text('RESUME FINANCIER', MARGIN, cy);
    cy += 20;

    const cardW = (CONTENT_W - 20) / 3;
    const cardItems = [
      { label: 'Total Recettes', value: `${fmt(totalIncome)} MAD`, color: COLORS.income, bg: '#ecfdf5', border: '#6ee7b7' },
      { label: 'Total Depenses', value: `${fmt(totalExpenses)} MAD`, color: COLORS.expense, bg: '#fef2f2', border: '#fca5a5' },
      { label: 'Solde Net', value: `${fmt(balance)} MAD`, color: balance >= 0 ? COLORS.income : COLORS.expense, bg: balance >= 0 ? '#eff6ff' : '#fef2f2', border: balance >= 0 ? '#93c5fd' : '#fca5a5' },
    ];
    cardItems.forEach(({ label, value, color, bg, border }, i) => {
      const cx = MARGIN + i * (cardW + 10);
      drawRect(doc, cx, cy, cardW, 64, bg, border);
      doc.fontSize(9).fillColor(COLORS.neutral).font('Helvetica')
        .text(label, cx + 10, cy + 10, { width: cardW - 20 });
      doc.fontSize(14).fillColor(color).font('Helvetica-Bold')
        .text(value, cx + 10, cy + 28, { width: cardW - 20 });
    });
    cy += 80;

    // ─── Monthly summary table ────────────────────────────────────────────────
    cy = sectionTitle(doc, 'RECAPITULATIF MENSUEL', cy + 10);
    const mCols = [
      { label: 'Mois', w: 80 },
      { label: 'Recettes (MAD)', w: 130, align: 'right' },
      { label: 'Depenses (MAD)', w: 130, align: 'right' },
      { label: 'Solde (MAD)', w: 110, align: 'right' },
      { label: 'Variation', w: 65, align: 'center' },
    ];
    cy = tableHeader(doc, mCols, cy);
    monthly.forEach((m, idx) => {
      const sol = m.income - m.expenses;
      const row = [
        MONTH_NAMES[m.month],
        fmt(m.income),
        fmt(m.expenses),
        fmt(sol),
        sol >= 0 ? '▲' : '▼',
      ];
      row['_color3'] = sol >= 0 ? COLORS.income : COLORS.expense;
      row['_color4'] = sol >= 0 ? COLORS.income : COLORS.expense;
      cy = tableRow(doc, mCols, row, cy, idx % 2 === 1);
    });

    // Totals row
    drawRect(doc, MARGIN, cy, CONTENT_W, 22, COLORS.primaryDark);
    doc.fontSize(9).fillColor(COLORS.white).font('Helvetica-Bold');
    const totalsX = [MARGIN, MARGIN + 80, MARGIN + 210, MARGIN + 340, MARGIN + 450];
    ['TOTAL', fmt(totalIncome), fmt(totalExpenses), fmt(balance), ''].forEach((v, i) => {
      const align = i === 0 ? 'left' : 'right';
      doc.text(v, totalsX[i] + 4, cy + 6, { width: mCols[i].w - 8, align });
    });
    cy += 22;

    // ─── PAGE 2: Transactions ─────────────────────────────────────────────────
    doc.addPage();
    cy = MARGIN + 10;

    // Income table
    cy = sectionTitle(doc, `RECETTES - ${year}  (${incomeList.length} operations)`, cy);
    const txCols = [
      { label: 'Date', w: 70 },
      { label: 'Categorie', w: 110 },
      { label: 'Description', w: 200 },
      { label: 'Reference', w: 80 },
      { label: 'Montant (MAD)', w: 55, align: 'right' },
    ];
    cy = tableHeader(doc, txCols, cy);

    if (incomeList.length === 0) {
      drawRect(doc, MARGIN, cy, CONTENT_W, 22, COLORS.light, COLORS.border);
      doc.fontSize(9).fillColor(COLORS.neutral).font('Helvetica').text('Aucune recette pour cette periode', MARGIN + 10, cy + 6);
      cy += 22;
    } else {
      incomeList.forEach((tx, idx) => {
        cy = checkNewPage(doc, cy);
        const row = [fmtDate(tx.date), tx.category || '-', tx.description || '-', tx.reference || '-', fmt(tx.amount)];
        row['_color4'] = COLORS.income;
        cy = tableRow(doc, txCols, row, cy, idx % 2 === 1);
      });
    }

    // Income subtotal
    drawRect(doc, MARGIN, cy, CONTENT_W, 22, '#d1fae5');
    doc.fontSize(9).fillColor(COLORS.income).font('Helvetica-Bold')
      .text(`Sous-total Recettes : ${fmt(totalIncome)} MAD`, MARGIN + 8, cy + 6, { width: CONTENT_W - 16, align: 'right' });
    cy += 30;

    // Expense table
    cy = checkNewPage(doc, cy, 80);
    cy = sectionTitle(doc, `DEPENSES - ${year}  (${expenseList.length} operations)`, cy);
    cy = tableHeader(doc, txCols, cy);

    if (expenseList.length === 0) {
      drawRect(doc, MARGIN, cy, CONTENT_W, 22, COLORS.light, COLORS.border);
      doc.fontSize(9).fillColor(COLORS.neutral).font('Helvetica').text('Aucune depense pour cette periode', MARGIN + 10, cy + 6);
      cy += 22;
    } else {
      expenseList.forEach((tx, idx) => {
        cy = checkNewPage(doc, cy);
        const row = [fmtDate(tx.date), tx.category || '-', tx.description || '-', tx.reference || '-', fmt(tx.amount)];
        row['_color4'] = COLORS.expense;
        cy = tableRow(doc, txCols, row, cy, idx % 2 === 1);
      });
    }

    // Expense subtotal
    drawRect(doc, MARGIN, cy, CONTENT_W, 22, '#fee2e2');
    doc.fontSize(9).fillColor(COLORS.expense).font('Helvetica-Bold')
      .text(`Sous-total Depenses : ${fmt(totalExpenses)} MAD`, MARGIN + 8, cy + 6, { width: CONTENT_W - 16, align: 'right' });
    cy += 30;

    // ─── PAGE 3: Running ledger + Signatures ──────────────────────────────────
    cy = checkNewPage(doc, cy, 100);
    if (cy < MARGIN + 50) cy = MARGIN + 10;

    cy = sectionTitle(doc, `REGISTRE DES OPERATIONS - ${year}`, cy);
    const ledgerCols = [
      { label: 'N°', w: 35 },
      { label: 'Date', w: 70 },
      { label: 'Description', w: 180 },
      { label: 'Type', w: 70, align: 'center' },
      { label: 'Debit (MAD)', w: 90, align: 'right' },
      { label: 'Credit (MAD)', w: 90, align: 'right' },
      { label: 'Solde (MAD)', w: CONTENT_W - 35 - 70 - 180 - 70 - 90 - 90, align: 'right' },
    ];
    cy = tableHeader(doc, ledgerCols, cy);

    let runningBalance = 0;
    transactions.forEach((tx, idx) => {
      cy = checkNewPage(doc, cy);
      const isIncome = tx.type === 'INCOME';
      if (isIncome) runningBalance += tx.amount;
      else runningBalance -= tx.amount;

      const row = [
        String(idx + 1),
        fmtDate(tx.date),
        tx.description || tx.category || '-',
        isIncome ? 'Recette' : 'Depense',
        isIncome ? '-' : fmt(tx.amount),
        isIncome ? fmt(tx.amount) : '-',
        fmt(runningBalance),
      ];
      row['_color3'] = isIncome ? COLORS.income : COLORS.expense;
      row['_color4'] = COLORS.expense;
      row['_color5'] = COLORS.income;
      row['_color6'] = runningBalance >= 0 ? COLORS.income : COLORS.expense;
      cy = tableRow(doc, ledgerCols, row, cy, idx % 2 === 1);
    });

    if (transactions.length === 0) {
      drawRect(doc, MARGIN, cy, CONTENT_W, 22, COLORS.light, COLORS.border);
      doc.fontSize(9).fillColor(COLORS.neutral).font('Helvetica').text('Aucune operation enregistree', MARGIN + 10, cy + 6);
      cy += 22;
    }

    // Final balance banner
    cy += 10;
    cy = checkNewPage(doc, cy, 40);
    drawRect(doc, MARGIN, cy, CONTENT_W, 32, balance >= 0 ? '#dcfce7' : '#fee2e2', balance >= 0 ? '#86efac' : '#fca5a5');
    doc.fontSize(11).fillColor(balance >= 0 ? COLORS.income : COLORS.expense).font('Helvetica-Bold')
      .text(`SOLDE FINAL : ${fmt(balance)} MAD`, MARGIN + 10, cy + 10, { width: CONTENT_W - 20, align: 'center' });
    cy += 50;

    // ─── Signature section ────────────────────────────────────────────────────
    cy = checkNewPage(doc, cy, 120);
    cy += 10;
    doc.fontSize(10).fillColor(COLORS.primaryDark).font('Helvetica-Bold')
      .text('SIGNATURES ET APPROBATION', MARGIN, cy);
    cy += 20;

    const sigW = (CONTENT_W - 40) / 3;
    const sigLabels = ['Le Responsable Financier', 'Le Responsable de Gestion', 'Le Representant Legal'];
    sigLabels.forEach((label, i) => {
      const sx = MARGIN + i * (sigW + 20);
      drawRect(doc, sx, cy, sigW, 80, COLORS.light, COLORS.border);
      doc.fontSize(9).fillColor(COLORS.primaryDark).font('Helvetica-Bold')
        .text(label, sx + 5, cy + 8, { width: sigW - 10, align: 'center' });
      // signature line
      doc.moveTo(sx + 15, cy + 65).lineTo(sx + sigW - 15, cy + 65).strokeColor(COLORS.neutral).lineWidth(0.5).stroke();
      doc.fontSize(8).fillColor(COLORS.neutral).font('Helvetica')
        .text('Signature & Cachet', sx + 5, cy + 68, { width: sigW - 10, align: 'center' });
    });
    cy += 90;

    // Footer on each page
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      drawRect(doc, 0, PAGE_H - 30, PAGE_W, 30, COLORS.headerBg);
      doc.fontSize(8).fillColor('#bfdbfe').font('Helvetica')
        .text(`${org.name || 'Association'} — Rapport Financier ${year}`, MARGIN, PAGE_H - 20, { width: CONTENT_W - 80 })
        .text(`Page ${i + 1} / ${pageCount}`, MARGIN, PAGE_H - 20, { width: CONTENT_W, align: 'right' });
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
