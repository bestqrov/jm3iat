const prisma = require('../../config/database');

// ─── Products ─────────────────────────────────────────────────────────────────

const getProducts = async (req, res) => {
  try {
    const products = await prisma.assocProduct.findMany({
      where: { organizationId: req.organization.id },
      orderBy: { name: 'asc' },
    });
    // Attach computed stock to each product
    const withStock = await Promise.all(products.map(async (p) => {
      const [prodAgg, saleAgg] = await Promise.all([
        prisma.assocProduction.aggregate({ where: { productId: p.id }, _sum: { quantityProduced: true } }),
        prisma.assocSale.aggregate({ where: { productId: p.id }, _sum: { quantity: true } }),
      ]);
      const stock = (prodAgg._sum.quantityProduced || 0) - (saleAgg._sum.quantity || 0);
      return { ...p, stock };
    }));
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
    const production = await prisma.assocProduction.create({
      data: {
        organizationId: req.organization.id,
        productId,
        quantityProduced: parseFloat(quantityProduced),
        productionCost: parseFloat(productionCost) || 0,
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
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
    await prisma.assocProduction.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Sales ────────────────────────────────────────────────────────────────────

const getSales = async (req, res) => {
  try {
    const { productId } = req.query;
    const where = { organizationId: req.organization.id };
    if (productId) where.productId = productId;
    const sales = await prisma.assocSale.findMany({
      where,
      include: { product: { select: { name: true, unit: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createSale = async (req, res) => {
  try {
    const { productId, quantity, unitPrice, date, customer, notes } = req.body;
    if (!productId || !quantity || !unitPrice) return res.status(400).json({ message: 'productId, quantity and unitPrice required' });

    const product = await prisma.assocProduct.findFirst({
      where: { id: productId, organizationId: req.organization.id },
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Check stock availability
    const [prodAgg, saleAgg] = await Promise.all([
      prisma.assocProduction.aggregate({ where: { productId }, _sum: { quantityProduced: true } }),
      prisma.assocSale.aggregate({ where: { productId }, _sum: { quantity: true } }),
    ]);
    const currentStock = (prodAgg._sum.quantityProduced || 0) - (saleAgg._sum.quantity || 0);
    if (parseFloat(quantity) > currentStock) {
      return res.status(400).json({ message: `Stock insuffisant. Stock actuel: ${currentStock} ${product.unit}` });
    }

    const sale = await prisma.assocSale.create({
      data: {
        organizationId: req.organization.id,
        productId,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        totalAmount: parseFloat(quantity) * parseFloat(unitPrice),
        date: date ? new Date(date) : new Date(),
        customer: customer || null,
        notes: notes || null,
      },
      include: { product: { select: { name: true, unit: true } } },
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
    await prisma.assocSale.delete({ where: { id: req.params.id } });
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
      const [prodAgg, saleAgg, costAgg] = await Promise.all([
        prisma.assocProduction.aggregate({ where: { productId: p.id }, _sum: { quantityProduced: true, productionCost: true } }),
        prisma.assocSale.aggregate({ where: { productId: p.id }, _sum: { quantity: true, totalAmount: true } }),
        prisma.assocProduction.aggregate({ where: { productId: p.id }, _sum: { productionCost: true } }),
      ]);
      const totalProduced = prodAgg._sum.quantityProduced || 0;
      const totalSold = saleAgg._sum.quantity || 0;
      const currentStock = totalProduced - totalSold;
      const totalRevenue = saleAgg._sum.totalAmount || 0;
      const totalCost = costAgg._sum.productionCost || 0;
      const level = currentStock <= 0 ? 'empty' : currentStock <= p.lowStockAlert ? 'low' : currentStock <= p.lowStockAlert * 3 ? 'normal' : 'high';
      return { ...p, currentStock, totalProduced, totalSold, totalRevenue, totalCost, level };
    }));
    res.json(stock);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const [productCount, prodAgg, saleAgg] = await Promise.all([
      prisma.assocProduct.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.assocProduction.aggregate({ where: { organizationId: orgId }, _sum: { productionCost: true } }),
      prisma.assocSale.aggregate({ where: { organizationId: orgId }, _sum: { totalAmount: true, quantity: true } }),
    ]);
    res.json({
      productCount,
      totalProductionCost: prodAgg._sum.productionCost || 0,
      totalRevenue: saleAgg._sum.totalAmount || 0,
      totalSold: saleAgg._sum.quantity || 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProducts, createProduct, updateProduct, deleteProduct,
  getProductions, createProduction, deleteProduction,
  getSales, createSale, deleteSale,
  getStock, getStats,
};
