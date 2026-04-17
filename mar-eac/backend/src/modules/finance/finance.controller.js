const prisma = require('../../config/database');
const path = require('path');
const fs = require('fs');
const { generateFinancialPDF } = require('../../utils/financePdf');
const { generateInvoicePdf } = require('../../utils/invoicePdf');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('./uploads');

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
    const { type, amount, category, description, date, reference, docRef } = req.body;

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
        docRef,
      },
    });

    res.status(201).json(tx);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const update = async (req, res) => {
  try {
    const { type, amount, category, description, date, reference, docRef } = req.body;
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
        docRef: docRef !== undefined ? docRef : existing.docRef,
      },
    });

    res.json(tx);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Transaction not found' });

    // Delete old receipt file if it exists
    if (existing.receiptUrl) {
      const oldPath = path.join(UPLOAD_DIR, path.basename(existing.receiptUrl));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const receiptUrl = `/uploads/${req.file.filename}`;
    const tx = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { receiptUrl },
    });
    res.json({ receiptUrl: tx.receiptUrl });
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


const exportPDF = (req, res) => generateFinancialPDF(req, res).catch((err) => {
  console.error('PDF export error:', err);
  if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' });
});

const exportInvoice = async (req, res) => {
  try {
    const tx = await prisma.transaction.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    const org = req.organization;
    const buf = await generateInvoicePdf({ org, transaction: tx });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recu_${tx.id.slice(-6)}.pdf"`);
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getTransactions, getById, create, update, remove,
  getSummary, getMonthlySummary, getCategories, exportPDF,
  uploadReceipt, exportInvoice,
};
