const prisma = require('../../config/database');

// ─── Helper: compute stock for a product ──────────────────────────────────────

async function computeStock(productId) {
  const [prodAgg, saleAgg] = await Promise.all([
    prisma.assocProduction.aggregate({ where: { productId }, _sum: { quantityProduced: true } }),
    prisma.assocSaleItem.aggregate({ where: { productId }, _sum: { quantity: true } }),
  ]);
  return (prodAgg._sum.quantityProduced || 0) - (saleAgg._sum.quantity || 0);
}

// ─── Products ─────────────────────────────────────────────────────────────────

const getProducts = async (req, res) => {
  try {
    const products = await prisma.assocProduct.findMany({
      where: { organizationId: req.organization.id },
      orderBy: { name: 'asc' },
    });
    const withStock = await Promise.all(products.map(async (p) => ({
      ...p,
      stock: await computeStock(p.id),
    })));
    res.json(withStock);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, nameAr, category, unit, price, lowStockAlert, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const product = await prisma.assocProduct.create({
      data: {
        organizationId: req.organization.id,
        name,
        nameAr: nameAr || null,
        category: category || null,
        unit: unit || 'unité',
        price: parseFloat(price) || 0,
        lowStockAlert: parseFloat(lowStockAlert) || 10,
        description: description || null,
      },
    });
    res.status(201).json({ ...product, stock: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const existing = await prisma.assocProduct.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Product not found' });
    const { name, nameAr, category, unit, price, lowStockAlert, description, isActive } = req.body;
    const product = await prisma.assocProduct.update({
      where: { id: req.params.id },
      data: {
        name: name ?? existing.name,
        nameAr: nameAr !== undefined ? nameAr : existing.nameAr,
        category: category !== undefined ? category : existing.category,
        unit: unit ?? existing.unit,
        price: price !== undefined ? parseFloat(price) : existing.price,
        lowStockAlert: lowStockAlert !== undefined ? parseFloat(lowStockAlert) : existing.lowStockAlert,
        description: description !== undefined ? description : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const existing = await prisma.assocProduct.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Product not found' });
    await prisma.assocProduct.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Production ───────────────────────────────────────────────────────────────

const getProductions = async (req, res) => {
  try {
    const { productId } = req.query;
    const where = { organizationId: req.organization.id };
    if (productId) where.productId = productId;
    const productions = await prisma.assocProduction.findMany({
      where,
      include: { product: { select: { name: true, unit: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(productions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createProduction = async (req, res) => {
  try {
    const { productId, quantityProduced, productionCost, date, notes } = req.body;
    if (!productId || !quantityProduced) return res.status(400).json({ message: 'productId and quantityProduced required' });

    const product = await prisma.assocProduct.findFirst({
      where: { id: productId, organizationId: req.organization.id },
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const cost = parseFloat(productionCost) || 0;
    const prodDate = date ? new Date(date) : new Date();

    // Auto-create finance expense transaction if there's a cost
    let transactionId = null;
    if (cost > 0) {
      const tx = await prisma.transaction.create({
        data: {
          organizationId: req.organization.id,
          type: 'EXPENSE',
          amount: cost,
          description: `Coût de production: ${product.name} (${parseFloat(quantityProduced)} ${product.unit})`,
          date: prodDate,
          category: 'Production',
        },
      });
      transactionId = tx.id;
    }

    const production = await prisma.assocProduction.create({
      data: {
        organizationId: req.organization.id,
        productId,
        quantityProduced: parseFloat(quantityProduced),
        productionCost: cost,
        date: prodDate,
        notes: notes || null,
        transactionId,
      },
      include: { product: { select: { name: true, unit: true } } },
    });
    res.status(201).json(production);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteProduction = async (req, res) => {
  try {
    const existing = await prisma.assocProduction.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    // Delete linked finance transaction
    if (existing.transactionId) {
      await prisma.transaction.deleteMany({ where: { id: existing.transactionId } });
    }
    await prisma.assocProduction.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Clients ──────────────────────────────────────────────────────────────────

const getClients = async (req, res) => {
  try {
    const clients = await prisma.assocClient.findMany({
      where: { organizationId: req.organization.id },
      orderBy: { name: 'asc' },
    });
    // Attach purchase stats
    const withStats = await Promise.all(clients.map(async (c) => {
      const agg = await prisma.assocSale.aggregate({
        where: { clientId: c.id },
        _sum: { totalAmount: true },
        _count: { id: true },
      });
      return {
        ...c,
        totalPurchases: agg._count.id || 0,
        totalSpent: agg._sum.totalAmount || 0,
      };
    }));
    res.json(withStats);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createClient = async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const client = await prisma.assocClient.create({
      data: {
        organizationId: req.organization.id,
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
      },
    });
    res.status(201).json({ ...client, totalPurchases: 0, totalSpent: 0 });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateClient = async (req, res) => {
  try {
    const existing = await prisma.assocClient.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const { name, phone, email, address, notes } = req.body;
    const client = await prisma.assocClient.update({
      where: { id: req.params.id },
      data: {
        name: name ?? existing.name,
        phone: phone !== undefined ? phone : existing.phone,
        email: email !== undefined ? email : existing.email,
        address: address !== undefined ? address : existing.address,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteClient = async (req, res) => {
  try {
    const existing = await prisma.assocClient.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    await prisma.assocClient.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getClientHistory = async (req, res) => {
  try {
    const client = await prisma.assocClient.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!client) return res.status(404).json({ message: 'Not found' });
    const sales = await prisma.assocSale.findMany({
      where: { clientId: req.params.id },
      include: { items: { include: { product: { select: { name: true, unit: true } } } } },
      orderBy: { date: 'desc' },
    });
    res.json({ client, sales });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Sales (multi-product) ────────────────────────────────────────────────────

const getSales = async (req, res) => {
  try {
    const sales = await prisma.assocSale.findMany({
      where: { organizationId: req.organization.id },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { name: true, unit: true } } } },
      },
      orderBy: { date: 'desc' },
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createSale = async (req, res) => {
  try {
    const { clientId, items, date, notes } = req.body;
    // items: [{ productId, quantity, unitPrice }]
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array required' });
    }

    const saleDate = date ? new Date(date) : new Date();
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const { productId, quantity, unitPrice } = item;
      if (!productId || !quantity || !unitPrice) {
        return res.status(400).json({ message: 'Each item needs productId, quantity, unitPrice' });
      }
      const product = await prisma.assocProduct.findFirst({
        where: { id: productId, organizationId: req.organization.id },
      });
      if (!product) return res.status(404).json({ message: `Product not found: ${productId}` });

      const stock = await computeStock(productId);
      if (parseFloat(quantity) > stock) {
        return res.status(400).json({
          message: `Stock insuffisant pour "${product.name}". Stock actuel: ${stock} ${product.unit}`,
        });
      }
      const subtotal = parseFloat(quantity) * parseFloat(unitPrice);
      totalAmount += subtotal;
      validatedItems.push({ productId, quantity: parseFloat(quantity), unitPrice: parseFloat(unitPrice), subtotal });
    }

    // Auto-create income transaction
    const tx = await prisma.transaction.create({
      data: {
        organizationId: req.organization.id,
        type: 'INCOME',
        amount: totalAmount,
        description: `Vente produits association (${validatedItems.length} article(s))`,
        date: saleDate,
        category: 'Ventes',
      },
    });

    const sale = await prisma.assocSale.create({
      data: {
        organizationId: req.organization.id,
        clientId: clientId || null,
        totalAmount,
        date: saleDate,
        notes: notes || null,
        transactionId: tx.id,
        items: {
          create: validatedItems,
        },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { name: true, unit: true } } } },
      },
    });
    res.status(201).json(sale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteSale = async (req, res) => {
  try {
    const existing = await prisma.assocSale.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    // Delete linked income transaction
    if (existing.transactionId) {
      await prisma.transaction.deleteMany({ where: { id: existing.transactionId } });
    }
    await prisma.assocSale.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Events ───────────────────────────────────────────────────────────────────

const getEvents = async (req, res) => {
  try {
    const events = await prisma.assocEvent.findMany({
      where: { organizationId: req.organization.id },
      orderBy: { date: 'desc' },
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createEvent = async (req, res) => {
  try {
    const { name, type, date, location, description, revenue, cost } = req.body;
    if (!name || !date) return res.status(400).json({ message: 'name and date required' });

    const eventDate = new Date(date);
    const rev = parseFloat(revenue) || 0;
    const cos = parseFloat(cost) || 0;

    let incomeTransId = null;
    let expenseTransId = null;

    if (rev > 0) {
      const tx = await prisma.transaction.create({
        data: {
          organizationId: req.organization.id,
          type: 'INCOME',
          amount: rev,
          description: `Recette événement: ${name}`,
          date: eventDate,
          category: 'Événements',
        },
      });
      incomeTransId = tx.id;
    }

    if (cos > 0) {
      const tx = await prisma.transaction.create({
        data: {
          organizationId: req.organization.id,
          type: 'EXPENSE',
          amount: cos,
          description: `Coût événement: ${name}`,
          date: eventDate,
          category: 'Événements',
        },
      });
      expenseTransId = tx.id;
    }

    const event = await prisma.assocEvent.create({
      data: {
        organizationId: req.organization.id,
        name,
        type: type || 'EVENT',
        date: eventDate,
        location: location || null,
        description: description || null,
        revenue: rev,
        cost: cos,
        incomeTransId,
        expenseTransId,
      },
    });
    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const existing = await prisma.assocEvent.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const { name, type, date, location, description, revenue, cost } = req.body;
    const event = await prisma.assocEvent.update({
      where: { id: req.params.id },
      data: {
        name: name ?? existing.name,
        type: type ?? existing.type,
        date: date ? new Date(date) : existing.date,
        location: location !== undefined ? location : existing.location,
        description: description !== undefined ? description : existing.description,
        revenue: revenue !== undefined ? parseFloat(revenue) : existing.revenue,
        cost: cost !== undefined ? parseFloat(cost) : existing.cost,
      },
    });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const existing = await prisma.assocEvent.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    // Delete linked transactions
    const txIds = [existing.incomeTransId, existing.expenseTransId].filter(Boolean);
    if (txIds.length) {
      await prisma.transaction.deleteMany({ where: { id: { in: txIds } } });
    }
    await prisma.assocEvent.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Stock ────────────────────────────────────────────────────────────────────

const getStock = async (req, res) => {
  try {
    const products = await prisma.assocProduct.findMany({
      where: { organizationId: req.organization.id, isActive: true },
      orderBy: { name: 'asc' },
    });
    const stock = await Promise.all(products.map(async (p) => {
      const [prodAgg, saleAgg] = await Promise.all([
        prisma.assocProduction.aggregate({ where: { productId: p.id }, _sum: { quantityProduced: true, productionCost: true } }),
        prisma.assocSaleItem.aggregate({ where: { productId: p.id }, _sum: { quantity: true, subtotal: true } }),
      ]);
      const totalProduced = prodAgg._sum.quantityProduced || 0;
      const totalSold = saleAgg._sum.quantity || 0;
      const currentStock = totalProduced - totalSold;
      const totalRevenue = saleAgg._sum.subtotal || 0;
      const totalCost = prodAgg._sum.productionCost || 0;
      const level = currentStock <= 0 ? 'empty' : currentStock <= p.lowStockAlert ? 'low' : currentStock <= p.lowStockAlert * 3 ? 'normal' : 'high';
      return { ...p, currentStock, totalProduced, totalSold, totalRevenue, totalCost, level };
    }));
    res.json(stock);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Stats ────────────────────────────────────────────────────────────────────

const getStats = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const [productCount, prodAgg, saleAgg, clientCount, eventAgg] = await Promise.all([
      prisma.assocProduct.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.assocProduction.aggregate({ where: { organizationId: orgId }, _sum: { productionCost: true } }),
      prisma.assocSale.aggregate({ where: { organizationId: orgId }, _sum: { totalAmount: true }, _count: { id: true } }),
      prisma.assocClient.count({ where: { organizationId: orgId } }),
      prisma.assocEvent.aggregate({ where: { organizationId: orgId }, _sum: { revenue: true, cost: true }, _count: { id: true } }),
    ]);
    res.json({
      productCount,
      clientCount,
      totalProductionCost: prodAgg._sum.productionCost || 0,
      totalRevenue: saleAgg._sum.totalAmount || 0,
      totalSales: saleAgg._count.id || 0,
      eventCount: eventAgg._count.id || 0,
      eventRevenue: eventAgg._sum.revenue || 0,
      eventCost: eventAgg._sum.cost || 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProducts, createProduct, updateProduct, deleteProduct,
  getProductions, createProduction, deleteProduction,
  getClients, createClient, updateClient, deleteClient, getClientHistory,
  getSales, createSale, deleteSale,
  getEvents, createEvent, updateEvent, deleteEvent,
  getStock, getStats,
};
