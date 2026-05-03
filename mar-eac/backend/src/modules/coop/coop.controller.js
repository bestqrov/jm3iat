const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── helpers ───────────────────────────────────────────────────────────────────

const orgId = (req) => req.user.organizationId;

// Compute current stock level for each product
async function computeStock(organizationId) {
  const movements = await prisma.coopStockMovement.findMany({ where: { organizationId } });
  const stock = {};
  for (const m of movements) {
    if (!stock[m.productId]) stock[m.productId] = 0;
    if (m.type === 'IN') stock[m.productId] += m.quantity;
    else if (m.type === 'OUT') stock[m.productId] -= m.quantity;
    else stock[m.productId] = m.quantity; // ADJUST
  }
  return stock;
}

// Auto-increment invoice number per org + type
async function nextInvoiceNumber(organizationId, type) {
  const last = await prisma.coopInvoice.findFirst({
    where: { organizationId, type },
    orderBy: { createdAt: 'desc' },
  });
  const prefix = type === 'DEVIS' ? 'DV' : type === 'BL' ? 'BL' : 'FA';
  const year = new Date().getFullYear();
  if (!last) return `${prefix}-${year}-001`;
  const parts = last.number.split('-');
  const seq = (parseInt(parts[parts.length - 1]) || 0) + 1;
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
  try {
    const id = orgId(req);
    const [products, movements, shares, invoices, members] = await Promise.all([
      prisma.coopStockProduct.findMany({ where: { organizationId: id, isActive: true } }),
      prisma.coopStockMovement.findMany({ where: { organizationId: id } }),
      prisma.coopMemberShare.findMany({ where: { organizationId: id } }),
      prisma.coopInvoice.findMany({ where: { organizationId: id } }),
      prisma.member.findMany({ where: { organizationId: id, isActive: true } }),
    ]);

    const stockMap = {};
    for (const m of movements) {
      if (!stockMap[m.productId]) stockMap[m.productId] = 0;
      if (m.type === 'IN') stockMap[m.productId] += m.quantity;
      else if (m.type === 'OUT') stockMap[m.productId] -= m.quantity;
      else stockMap[m.productId] = m.quantity;
    }

    const totalShares = shares.reduce((s, x) => s + x.sharesCount, 0);
    const paidShares  = shares.reduce((s, x) => s + x.sharesPaid, 0);
    const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0);
    const pendingRevenue = invoices.filter(i => ['DRAFT','SENT'].includes(i.status)).reduce((s, i) => s + i.totalAmount, 0);
    const org = await prisma.organization.findUnique({ where: { id }, select: { partsValeur: true, capitalSocial: true } });

    res.json({
      activeProducts: products.length,
      membersWithShares: shares.length,
      totalMembers: members.length,
      totalShares,
      paidShares,
      shareValue: org?.partsValeur || 0,
      capitalSocial: org?.capitalSocial || 0,
      totalRevenue,
      pendingRevenue,
      invoiceCount: invoices.length,
      lowStockProducts: products.filter(p => (stockMap[p.id] || 0) <= 0).length,
      stockSummary: products.map(p => ({ id: p.id, name: p.name, stock: stockMap[p.id] || 0, unit: p.unit })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Stock Products ────────────────────────────────────────────────────────────

exports.getProducts = async (req, res) => {
  try {
    const products = await prisma.coopStockProduct.findMany({
      where: { organizationId: orgId(req) },
      orderBy: { createdAt: 'desc' },
    });
    const stockMap = await computeStock(orgId(req));
    res.json(products.map(p => ({ ...p, currentStock: stockMap[p.id] || 0 })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, nameAr, unit, category, description } = req.body;
    if (!name) return res.status(400).json({ message: 'name required' });
    const product = await prisma.coopStockProduct.create({
      data: { organizationId: orgId(req), name, nameAr, unit: unit || 'unité', category, description },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, nameAr, unit, category, description, isActive } = req.body;
    const product = await prisma.coopStockProduct.update({
      where: { id: req.params.id },
      data: { name, nameAr, unit, category, description, isActive },
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await prisma.coopStockProduct.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Stock Movements ───────────────────────────────────────────────────────────

exports.getMovements = async (req, res) => {
  try {
    const { productId } = req.query;
    const where = { organizationId: orgId(req) };
    if (productId) where.productId = productId;
    const movements = await prisma.coopStockMovement.findMany({
      where,
      include: { product: { select: { name: true, unit: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(movements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createMovement = async (req, res) => {
  try {
    const { productId, type, quantity, unitPrice, date, reference, notes } = req.body;
    if (!productId || !type || !quantity) return res.status(400).json({ message: 'productId, type, quantity required' });
    const movement = await prisma.coopStockMovement.create({
      data: {
        organizationId: orgId(req),
        productId,
        type,
        quantity: parseFloat(quantity),
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        date: date ? new Date(date) : new Date(),
        reference,
        notes,
      },
    });
    res.status(201).json(movement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteMovement = async (req, res) => {
  try {
    await prisma.coopStockMovement.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Member Shares ─────────────────────────────────────────────────────────────

exports.getMemberShares = async (req, res) => {
  try {
    const shares = await prisma.coopMemberShare.findMany({
      where: { organizationId: orgId(req) },
      orderBy: { memberName: 'asc' },
    });
    res.json(shares);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.upsertMemberShare = async (req, res) => {
  try {
    const { memberId, memberName, sharesCount, sharesPaid, paidAt, notes } = req.body;
    if (!memberId || !memberName) return res.status(400).json({ message: 'memberId and memberName required' });
    const share = await prisma.coopMemberShare.upsert({
      where: { organizationId_memberId: { organizationId: orgId(req), memberId } },
      update: {
        memberName,
        sharesCount: parseFloat(sharesCount) || 0,
        sharesPaid:  parseFloat(sharesPaid)  || 0,
        paidAt:  paidAt ? new Date(paidAt) : null,
        notes,
      },
      create: {
        organizationId: orgId(req),
        memberId,
        memberName,
        sharesCount: parseFloat(sharesCount) || 0,
        sharesPaid:  parseFloat(sharesPaid)  || 0,
        paidAt:  paidAt ? new Date(paidAt) : null,
        notes,
      },
    });
    res.json(share);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteMemberShare = async (req, res) => {
  try {
    await prisma.coopMemberShare.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Invoices / Devis / BL ─────────────────────────────────────────────────────

exports.getInvoices = async (req, res) => {
  try {
    const { type, status } = req.query;
    const where = { organizationId: orgId(req) };
    if (type) where.type = type;
    if (status) where.status = status;
    const invoices = await prisma.coopInvoice.findMany({
      where,
      include: { items: { include: { product: { select: { name: true, unit: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const { type = 'FACTURE', clientName, clientPhone, clientAddress, date, dueDate, notes, items = [] } = req.body;
    if (!clientName) return res.status(400).json({ message: 'clientName required' });
    const number = await nextInvoiceNumber(orgId(req), type);
    const totalAmount = items.reduce((s, item) => s + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);
    const invoice = await prisma.coopInvoice.create({
      data: {
        organizationId: orgId(req),
        type,
        number,
        clientName,
        clientPhone,
        clientAddress,
        totalAmount,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        items: {
          create: items.map(item => ({
            productId:   item.productId || null,
            description: item.description,
            quantity:    parseFloat(item.quantity),
            unitPrice:   parseFloat(item.unitPrice),
            subtotal:    parseFloat(item.quantity) * parseFloat(item.unitPrice),
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const { clientName, clientPhone, clientAddress, status, date, dueDate, notes, items } = req.body;
    const data = { clientName, clientPhone, clientAddress, status, notes };
    if (date) data.date = new Date(date);
    if (dueDate) data.dueDate = new Date(dueDate);
    if (items !== undefined) {
      data.totalAmount = items.reduce((s, i) => s + (parseFloat(i.quantity) * parseFloat(i.unitPrice)), 0);
      await prisma.coopInvoiceItem.deleteMany({ where: { invoiceId: req.params.id } });
      data.items = {
        create: items.map(item => ({
          productId:   item.productId || null,
          description: item.description,
          quantity:    parseFloat(item.quantity),
          unitPrice:   parseFloat(item.unitPrice),
          subtotal:    parseFloat(item.quantity) * parseFloat(item.unitPrice),
        })),
      };
    }
    const invoice = await prisma.coopInvoice.update({
      where: { id: req.params.id },
      data,
      include: { items: true },
    });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    await prisma.coopInvoice.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Reports ───────────────────────────────────────────────────────────────────

exports.getReports = async (req, res) => {
  try {
    const id = orgId(req);
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [movements, invoices, shares] = await Promise.all([
      prisma.coopStockMovement.findMany({ where: { organizationId: id }, include: { product: true } }),
      prisma.coopInvoice.findMany({ where: { organizationId: id, createdAt: { gte: startOfYear } } }),
      prisma.coopMemberShare.findMany({ where: { organizationId: id } }),
    ]);

    // Monthly revenue from paid invoices this year
    const monthlyRevenue = Array(12).fill(0);
    invoices.filter(i => i.status === 'PAID').forEach(i => {
      monthlyRevenue[new Date(i.date).getMonth()] += i.totalAmount;
    });

    // Stock value: IN - OUT
    const stockMap = {};
    const valueMap = {};
    for (const m of movements) {
      if (!stockMap[m.productId]) { stockMap[m.productId] = 0; valueMap[m.productId] = 0; }
      if (m.type === 'IN')  { stockMap[m.productId] += m.quantity; valueMap[m.productId] += m.quantity * (m.unitPrice || 0); }
      if (m.type === 'OUT') { stockMap[m.productId] -= m.quantity; valueMap[m.productId] -= m.quantity * (m.unitPrice || 0); }
      if (m.type === 'ADJUST') stockMap[m.productId] = m.quantity;
    }

    const org = await prisma.organization.findUnique({ where: { id }, select: { partsValeur: true } });
    const partsValeur = org?.partsValeur || 0;
    const totalCapital = shares.reduce((s, x) => s + x.sharesCount * partsValeur, 0);
    const paidCapital  = shares.reduce((s, x) => s + x.sharesPaid  * partsValeur, 0);

    res.json({
      monthlyRevenue,
      totalRevenue: invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0),
      pendingRevenue: invoices.filter(i => ['DRAFT','SENT'].includes(i.status)).reduce((s, i) => s + i.totalAmount, 0),
      invoicesByStatus: {
        DRAFT:     invoices.filter(i => i.status === 'DRAFT').length,
        SENT:      invoices.filter(i => i.status === 'SENT').length,
        PAID:      invoices.filter(i => i.status === 'PAID').length,
        CANCELLED: invoices.filter(i => i.status === 'CANCELLED').length,
      },
      totalCapital,
      paidCapital,
      totalShares: shares.reduce((s, x) => s + x.sharesCount, 0),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
