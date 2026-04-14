const prisma = require('../../config/database');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const FONT_DIR = path.join(__dirname, '../../assets/fonts');
const FONT_AR = path.join(FONT_DIR, 'Amiri-Regular.ttf');
const FONT_AR_BOLD = path.join(FONT_DIR, 'Amiri-Bold.ttf');

// ─── Date filter helper ────────────────────────────────────────────────────────

function buildDateFilter(from, to, field = 'date') {
  const f = {};
  if (from) f.gte = new Date(from);
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    f.lte = d;
  }
  return Object.keys(f).length ? { [field]: f } : {};
}

// ─── Literary Report ───────────────────────────────────────────────────────────

const getAssocLiterary = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const { from, to } = req.query;
    const datef = buildDateFilter(from, to);
    const base = { organizationId: orgId };
    const dated = { ...base, ...datef };

    const [
      productCount, activeProductCount,
      productionCount, prodAgg,
      salesCount, saleAgg,
      clientCount,
      eventCount, exhibitionCount, cateringCount,
      products, recentProductions, recentSales, recentEvents,
    ] = await Promise.all([
      prisma.assocProduct.count({ where: base }),
      prisma.assocProduct.count({ where: { ...base, isActive: true } }),
      prisma.assocProduction.count({ where: dated }),
      prisma.assocProduction.aggregate({ where: dated, _sum: { quantityProduced: true, productionCost: true } }),
      prisma.assocSale.count({ where: dated }),
      prisma.assocSale.aggregate({ where: dated, _sum: { totalAmount: true } }),
      prisma.assocClient.count({ where: base }),
      prisma.assocEvent.count({ where: dated }),
      prisma.assocEvent.count({ where: { ...dated, type: 'EXHIBITION' } }),
      prisma.assocEvent.count({ where: { ...dated, type: 'CATERING' } }),
      prisma.assocProduct.findMany({ where: base, orderBy: { name: 'asc' } }),
      prisma.assocProduction.findMany({
        where: dated, orderBy: { date: 'desc' }, take: 8,
        include: { product: { select: { name: true, unit: true } } },
      }),
      prisma.assocSale.findMany({
        where: dated, orderBy: { date: 'desc' }, take: 8,
        include: {
          client: { select: { name: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      }),
      prisma.assocEvent.findMany({ where: dated, orderBy: { date: 'desc' }, take: 8 }),
    ]);

    // Compute stock per product
    const productStats = await Promise.all(products.map(async (p) => {
      const [pr, sa] = await Promise.all([
        prisma.assocProduction.aggregate({ where: { productId: p.id, ...datef }, _sum: { quantityProduced: true } }),
        prisma.assocSaleItem.aggregate({ where: { productId: p.id, sale: datef }, _sum: { quantity: true, subtotal: true } }),
      ]);
      return {
        ...p,
        produced: pr._sum.quantityProduced || 0,
        sold: sa._sum.quantity || 0,
        revenue: sa._sum.subtotal || 0,
        stock: (pr._sum.quantityProduced || 0) - (sa._sum.quantity || 0),
      };
    }));

    res.json({
      period: { from: from || null, to: to || null },
      products: {
        total: productCount, active: activeProductCount, list: productStats,
      },
      production: {
        batches: productionCount,
        totalQuantity: prodAgg._sum.quantityProduced || 0,
        totalCost: prodAgg._sum.productionCost || 0,
        recent: recentProductions,
      },
      sales: {
        total: salesCount, totalRevenue: saleAgg._sum.totalAmount || 0,
        clientCount, recent: recentSales,
      },
      events: {
        total: eventCount, exhibitions: exhibitionCount, catering: cateringCount,
        other: eventCount - exhibitionCount - cateringCount,
        recent: recentEvents,
      },
      generatedAt: new Date(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Financial Report ──────────────────────────────────────────────────────────

const getAssocFinancial = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const { from, to } = req.query;
    const datef = buildDateFilter(from, to);
    const base = { organizationId: orgId };
    const dated = { ...base, ...datef };

    const [prodAgg, salesAgg, eventsAgg, generalIncome, generalExpense] = await Promise.all([
      prisma.assocProduction.aggregate({ where: dated, _sum: { productionCost: true } }),
      prisma.assocSale.aggregate({ where: dated, _sum: { totalAmount: true }, _count: { id: true } }),
      prisma.assocEvent.aggregate({ where: dated, _sum: { revenue: true, cost: true } }),
      prisma.transaction.aggregate({
        where: { ...base, type: 'INCOME', ...datef },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...base, type: 'EXPENSE', ...datef },
        _sum: { amount: true },
      }),
    ]);

    const productionCost = prodAgg._sum.productionCost || 0;
    const salesRevenue = salesAgg._sum.totalAmount || 0;
    const eventRevenue = eventsAgg._sum.revenue || 0;
    const eventCost = eventsAgg._sum.cost || 0;
    const totalIncome = generalIncome._sum.amount || 0;
    const totalExpense = generalExpense._sum.amount || 0;

    // Assoc-specific profit = sales + eventRevenue - productionCost - eventCost
    const assocProfit = salesRevenue + eventRevenue - productionCost - eventCost;

    // Monthly chart for current or filtered year
    const year = from ? new Date(from).getFullYear() : new Date().getFullYear();
    const monthlyFrom = new Date(year, 0, 1);
    const monthlyTo = new Date(year, 11, 31, 23, 59, 59);

    const [monthlySales, monthlyProd, monthlyEvents] = await Promise.all([
      prisma.assocSale.findMany({
        where: { ...base, date: { gte: monthlyFrom, lte: monthlyTo } },
        select: { date: true, totalAmount: true },
      }),
      prisma.assocProduction.findMany({
        where: { ...base, date: { gte: monthlyFrom, lte: monthlyTo } },
        select: { date: true, productionCost: true },
      }),
      prisma.assocEvent.findMany({
        where: { ...base, date: { gte: monthlyFrom, lte: monthlyTo } },
        select: { date: true, revenue: true, cost: true },
      }),
    ]);

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: new Date(year, i, 1).toLocaleString('fr-MA', { month: 'short' }),
      salesRevenue: 0, productionCost: 0, eventRevenue: 0, eventCost: 0, profit: 0,
    }));

    monthlySales.forEach(s => {
      const m = new Date(s.date).getMonth();
      monthly[m].salesRevenue += s.totalAmount;
    });
    monthlyProd.forEach(p => {
      const m = new Date(p.date).getMonth();
      monthly[m].productionCost += p.productionCost;
    });
    monthlyEvents.forEach(e => {
      const m = new Date(e.date).getMonth();
      monthly[m].eventRevenue += e.revenue;
      monthly[m].eventCost += e.cost;
    });
    monthly.forEach(m => {
      m.profit = m.salesRevenue + m.eventRevenue - m.productionCost - m.eventCost;
    });

    // Category breakdown from transactions
    const categoryStats = await prisma.transaction.groupBy({
      by: ['category', 'type'],
      where: { ...base, ...datef },
      _sum: { amount: true },
      _count: true,
    });

    res.json({
      period: { from: from || null, to: to || null, year },
      assoc: {
        productionCost,
        salesRevenue,
        salesCount: salesAgg._count.id || 0,
        eventRevenue,
        eventCost,
        assocProfit,
        totalIncome: salesRevenue + eventRevenue,
        totalCost: productionCost + eventCost,
      },
      general: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      },
      monthly,
      categoryStats,
      generatedAt: new Date(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Advanced Report (Premium) ─────────────────────────────────────────────────

const getAssocAdvanced = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const { from, to } = req.query;
    const datef = buildDateFilter(from, to);
    const base = { organizationId: orgId };
    const dated = { ...base, ...datef };

    // Top products by revenue
    const products = await prisma.assocProduct.findMany({ where: base });
    const productRevenue = await Promise.all(products.map(async (p) => {
      const agg = await prisma.assocSaleItem.aggregate({
        where: { productId: p.id, ...(Object.keys(datef).length ? { sale: datef } : {}) },
        _sum: { quantity: true, subtotal: true },
        _count: { id: true },
      });
      return {
        id: p.id, name: p.name, unit: p.unit, price: p.price,
        totalRevenue: agg._sum.subtotal || 0,
        totalSold: agg._sum.quantity || 0,
        salesCount: agg._count.id || 0,
      };
    }));

    const topProducts = productRevenue
      .filter(p => p.totalRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Best clients
    const clients = await prisma.assocClient.findMany({ where: base });
    const clientStats = await Promise.all(clients.map(async (c) => {
      const agg = await prisma.assocSale.aggregate({
        where: { clientId: c.id, ...datef },
        _sum: { totalAmount: true },
        _count: { id: true },
      });
      return {
        id: c.id, name: c.name, phone: c.phone,
        totalSpent: agg._sum.totalAmount || 0,
        purchaseCount: agg._count.id || 0,
      };
    }));

    const topClients = clientStats
      .filter(c => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Weekly sales trend (last 12 weeks)
    const weeksAgo12 = new Date();
    weeksAgo12.setDate(weeksAgo12.getDate() - 84);
    const recentSales = await prisma.assocSale.findMany({
      where: { ...base, date: { gte: weeksAgo12 } },
      select: { date: true, totalAmount: true },
      orderBy: { date: 'asc' },
    });

    const weekly: Record<string, number> = {};
    recentSales.forEach(s => {
      const d = new Date(s.date);
      const week = `${d.getFullYear()}-W${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7).toString().padStart(2, '0')}`;
      weekly[week] = (weekly[week] || 0) + s.totalAmount;
    });

    // Production efficiency (cost per unit produced)
    const prodEfficiency = await Promise.all(products.slice(0, 10).map(async (p) => {
      const [prodA, saleA] = await Promise.all([
        prisma.assocProduction.aggregate({ where: { productId: p.id, ...datef }, _sum: { quantityProduced: true, productionCost: true } }),
        prisma.assocSaleItem.aggregate({ where: { productId: p.id }, _sum: { subtotal: true } }),
      ]);
      const produced = prodA._sum.quantityProduced || 0;
      const cost = prodA._sum.productionCost || 0;
      const revenue = saleA._sum.subtotal || 0;
      return {
        name: p.name, produced, cost,
        costPerUnit: produced > 0 ? cost / produced : 0,
        salePrice: p.price,
        margin: p.price > 0 && cost > 0 ? ((p.price - cost / Math.max(produced, 1)) / p.price) * 100 : 0,
        revenue,
      };
    }));

    // Event performance
    const events = await prisma.assocEvent.findMany({ where: dated, orderBy: { revenue: 'desc' } });
    const eventPerf = events.map(e => ({
      name: e.name, type: e.type, date: e.date,
      revenue: e.revenue, cost: e.cost, profit: e.revenue - e.cost,
    }));

    res.json({
      topProducts,
      topClients,
      weeklyTrend: Object.entries(weekly).map(([week, revenue]) => ({ week, revenue })),
      prodEfficiency: prodEfficiency.filter(p => p.produced > 0),
      eventPerformance: eventPerf,
      generatedAt: new Date(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── PDF Export: Literary ──────────────────────────────────────────────────────

const exportAssocLiteraryPDF = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const org = req.organization;
    const { from, to } = req.query;
    const datef = buildDateFilter(from, to);
    const base = { organizationId: orgId };
    const dated = { ...base, ...datef };

    const [productCount, productionCount, prodAgg, salesCount, salesAgg, eventCount, exhibCount, cateringCount] = await Promise.all([
      prisma.assocProduct.count({ where: base }),
      prisma.assocProduction.count({ where: dated }),
      prisma.assocProduction.aggregate({ where: dated, _sum: { quantityProduced: true } }),
      prisma.assocSale.count({ where: dated }),
      prisma.assocSale.aggregate({ where: dated, _sum: { totalAmount: true } }),
      prisma.assocEvent.count({ where: dated }),
      prisma.assocEvent.count({ where: { ...dated, type: 'EXHIBITION' } }),
      prisma.assocEvent.count({ where: { ...dated, type: 'CATERING' } }),
    ]);

    const hasFonts = fs.existsSync(FONT_AR) && fs.existsSync(FONT_AR_BOLD);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rapport_association_litteraire.pdf"');
    doc.pipe(res);

    if (hasFonts) doc.registerFont('AR', FONT_AR).registerFont('AR-Bold', FONT_AR_BOLD);

    const title = (txt) => doc.font(hasFonts ? 'AR-Bold' : 'Helvetica-Bold').fontSize(14).fillColor('#1a3a6b').text(txt).moveDown(0.3);
    const row = (label, value) => {
      doc.font(hasFonts ? 'AR' : 'Helvetica').fontSize(11).fillColor('#374151')
        .text(`${label}: `, { continued: true })
        .font(hasFonts ? 'AR-Bold' : 'Helvetica-Bold').text(String(value));
    };

    // Header
    doc.font(hasFonts ? 'AR-Bold' : 'Helvetica-Bold').fontSize(18).fillColor('#1a3a6b').text(org.name, { align: 'center' });
    doc.fontSize(14).fillColor('#374151').text('Rapport Littéraire — Association Productive', { align: 'center' });
    doc.fontSize(10).fillColor('#6b7280').text(`Généré le ${new Date().toLocaleDateString('fr-MA')}`, { align: 'center' });
    if (from || to) doc.text(`Période: ${from || '...'} → ${to || '...'}`, { align: 'center' });
    doc.moveDown(1.5);

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#d1d5db').stroke().moveDown(0.5);

    // Production
    title('Activités de Production / أنشطة الإنتاج');
    row('Nombre de produits créés', productCount);
    row('Lots de production', productionCount);
    row('Quantité totale produite', `${(prodAgg._sum.quantityProduced || 0).toFixed(2)} unités`);
    doc.moveDown(0.8);

    // Sales
    title('Ventes & Clients / المبيعات والزبائن');
    row('Nombre de ventes', salesCount);
    row('Chiffre d\'affaires', `${(salesAgg._sum.totalAmount || 0).toFixed(2)} DH`);
    doc.moveDown(0.8);

    // Events
    title('Événements & Participations / الفعاليات والمشاركات');
    row('Total événements', eventCount);
    row('Participations aux expositions', exhibCount);
    row('Activités de restauration', cateringCount);
    row('Autres événements', eventCount - exhibCount - cateringCount);
    doc.moveDown(0.8);

    // Economic achievements
    title('Réalisations Économiques / الإنجازات الاقتصادية');
    const profit = (salesAgg._sum.totalAmount || 0);
    row('Recettes totales générées', `${profit.toFixed(2)} DH`);
    doc.moveDown(2);

    doc.font(hasFonts ? 'AR' : 'Helvetica').fontSize(10).fillColor('#6b7280').text('Cachet et signature / الختم والتوقيع:', { underline: true });
    doc.moveDown(0.5);
    doc.text('Président(e) / الرئيس(ة): ____________________');

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' });
  }
};

// ─── PDF Export: Financial ─────────────────────────────────────────────────────

const exportAssocFinancialPDF = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const org = req.organization;
    const { from, to } = req.query;
    const datef = buildDateFilter(from, to);
    const base = { organizationId: orgId };
    const dated = { ...base, ...datef };

    const [prodAgg, salesAgg, eventsAgg] = await Promise.all([
      prisma.assocProduction.aggregate({ where: dated, _sum: { productionCost: true } }),
      prisma.assocSale.aggregate({ where: dated, _sum: { totalAmount: true }, _count: { id: true } }),
      prisma.assocEvent.aggregate({ where: dated, _sum: { revenue: true, cost: true } }),
    ]);

    const productionCost = prodAgg._sum.productionCost || 0;
    const salesRevenue = salesAgg._sum.totalAmount || 0;
    const eventRevenue = eventsAgg._sum.revenue || 0;
    const eventCost = eventsAgg._sum.cost || 0;
    const profit = salesRevenue + eventRevenue - productionCost - eventCost;

    const hasFonts = fs.existsSync(FONT_AR) && fs.existsSync(FONT_AR_BOLD);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rapport_association_financier.pdf"');
    doc.pipe(res);

    if (hasFonts) doc.registerFont('AR', FONT_AR).registerFont('AR-Bold', FONT_AR_BOLD);

    const fmt = (n) => `${n.toFixed(2)} DH`;
    const sectionTitle = (txt, color = '#1a3a6b') =>
      doc.font(hasFonts ? 'AR-Bold' : 'Helvetica-Bold').fontSize(13).fillColor(color).text(txt).moveDown(0.3);
    const finRow = (label, value, color = '#374151') => {
      const yBefore = doc.y;
      doc.font(hasFonts ? 'AR' : 'Helvetica').fontSize(11).fillColor('#6b7280').text(label, 50, doc.y, { continued: true, width: 300 });
      doc.font(hasFonts ? 'AR-Bold' : 'Helvetica-Bold').fillColor(color).text(value, { align: 'right' });
    };

    // Header
    doc.font(hasFonts ? 'AR-Bold' : 'Helvetica-Bold').fontSize(18).fillColor('#1a3a6b').text(org.name, { align: 'center' });
    doc.fontSize(14).fillColor('#374151').text('Rapport Financier — Association Productive', { align: 'center' });
    doc.fontSize(10).fillColor('#6b7280').text(`Généré le ${new Date().toLocaleDateString('fr-MA')}`, { align: 'center' });
    if (from || to) doc.text(`Période: ${from || '...'} → ${to || '...'}`, { align: 'center' });
    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#d1d5db').stroke().moveDown(0.8);

    // Income section
    sectionTitle('Recettes / الإيرادات', '#059669');
    finRow('Chiffre d\'affaires (ventes)', fmt(salesRevenue), '#059669');
    finRow(`Recettes événements`, fmt(eventRevenue), '#059669');
    finRow('Total recettes', fmt(salesRevenue + eventRevenue), '#059669');
    doc.moveDown(0.8);

    // Expense section
    sectionTitle('Charges / المصاريف', '#dc2626');
    finRow('Coûts de production', fmt(productionCost), '#dc2626');
    finRow('Charges événements', fmt(eventCost), '#dc2626');
    finRow('Total charges', fmt(productionCost + eventCost), '#dc2626');
    doc.moveDown(0.8);

    // Result
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#d1d5db').stroke().moveDown(0.5);
    sectionTitle('Résultat Net / صافي الربح', profit >= 0 ? '#1a3a6b' : '#dc2626');
    finRow('Bénéfice net = Recettes − Charges', fmt(profit), profit >= 0 ? '#059669' : '#dc2626');
    doc.moveDown(2);

    doc.font(hasFonts ? 'AR' : 'Helvetica').fontSize(10).fillColor('#6b7280').text('Cachet et signature / الختم والتوقيع:', { underline: true });
    doc.moveDown(0.5).text('Trésorier(e) / أمين الخزينة: ____________________');

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' });
  }
};

module.exports = {
  getAssocLiterary,
  getAssocFinancial,
  getAssocAdvanced,
  exportAssocLiteraryPDF,
  exportAssocFinancialPDF,
};
