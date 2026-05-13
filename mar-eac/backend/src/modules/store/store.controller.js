const prisma = require('../../config/database');

// Helper: compute current stock for a product
async function getStock(productId) {
  const moves = await prisma.commerceStockMovement.findMany({
    where: { productId },
    select: { type: true, quantity: true },
  });
  return moves.reduce((sum, m) => {
    if (m.type === 'IN' || m.type === 'RETURN') return sum + m.quantity;
    if (m.type === 'OUT') return sum - m.quantity;
    if (m.type === 'ADJUST') return m.quantity; // absolute
    return sum;
  }, 0);
}

// GET /api/store/products
const getStoreProducts = async (req, res) => {
  try {
    const { search, orgId, category, minPrice, maxPrice } = req.query;

    const where = {
      isActive: true,
      organization: { modules: { has: 'COMMERCE' } },
    };
    if (orgId)    where.organizationId = orgId;
    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (search)   where.OR = [
      { name:   { contains: search, mode: 'insensitive' } },
      { nameAr: { contains: search, mode: 'insensitive' } },
    ];
    if (minPrice || maxPrice) {
      where.sellingPrice = {};
      if (minPrice) where.sellingPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.sellingPrice.lte = parseFloat(maxPrice);
    }

    const products = await prisma.commerceProduct.findMany({
      where,
      select: {
        id: true, name: true, nameAr: true, description: true,
        category: true, sellingPrice: true, unit: true, imageUrl: true,
        organizationId: true,
        organization: { select: { id: true, name: true, nameAr: true, city: true, cityAr: true, logo: true } },
        stockMovements: { select: { type: true, quantity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = products.map(p => {
      const stock = p.stockMovements.reduce((sum, m) => {
        if (m.type === 'IN' || m.type === 'RETURN') return sum + m.quantity;
        if (m.type === 'OUT') return sum - m.quantity;
        if (m.type === 'ADJUST') return m.quantity;
        return sum;
      }, 0);
      const { stockMovements, ...rest } = p;
      return { ...rest, stock };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/store/products/:id
const getStoreProduct = async (req, res) => {
  try {
    const product = await prisma.commerceProduct.findFirst({
      where: { id: req.params.id, isActive: true, organization: { modules: { has: 'COMMERCE' } } },
      select: {
        id: true, name: true, nameAr: true, description: true,
        category: true, sellingPrice: true, unit: true, imageUrl: true,
        organizationId: true,
        organization: { select: { id: true, name: true, nameAr: true, city: true, cityAr: true, logo: true, phone: true } },
        stockMovements: { select: { type: true, quantity: true } },
      },
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    const stock = product.stockMovements.reduce((sum, m) => {
      if (m.type === 'IN' || m.type === 'RETURN') return sum + m.quantity;
      if (m.type === 'OUT') return sum - m.quantity;
      if (m.type === 'ADJUST') return m.quantity;
      return sum;
    }, 0);
    const { stockMovements, ...rest } = product;
    res.json({ ...rest, stock });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/store/orgs  — cooperatives that have COMMERCE enabled
const getStoreOrgs = async (req, res) => {
  try {
    const orgs = await prisma.organization.findMany({
      where: { modules: { has: 'COMMERCE' } },
      select: { id: true, name: true, nameAr: true, city: true, cityAr: true, logo: true },
      orderBy: { name: 'asc' },
    });
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/store/categories
const getStoreCategories = async (req, res) => {
  try {
    const products = await prisma.commerceProduct.findMany({
      where: { isActive: true, category: { not: null }, organization: { modules: { has: 'COMMERCE' } } },
      select: { category: true },
      distinct: ['category'],
    });
    res.json(products.map(p => p.category).filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/store/orders  — public order placement (no auth)
const placeStoreOrder = async (req, res) => {
  try {
    const { clientName, clientPhone, clientAddress, items, organizationId } = req.body;

    if (!clientName || !clientPhone || !items?.length || !organizationId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate org has COMMERCE module
    const org = await prisma.organization.findFirst({
      where: { id: organizationId, modules: { has: 'COMMERCE' } },
    });
    if (!org) return res.status(400).json({ message: 'Organization not found' });

    // Validate products and stock
    const productIds = items.map(i => i.productId);
    const products = await prisma.commerceProduct.findMany({
      where: { id: { in: productIds }, organizationId, isActive: true },
      include: { stockMovements: { select: { type: true, quantity: true } } },
    });

    const productMap = {};
    for (const p of products) {
      const stock = p.stockMovements.reduce((sum, m) => {
        if (m.type === 'IN' || m.type === 'RETURN') return sum + m.quantity;
        if (m.type === 'OUT') return sum - m.quantity;
        if (m.type === 'ADJUST') return m.quantity;
        return sum;
      }, 0);
      productMap[p.id] = { ...p, stock };
    }

    for (const item of items) {
      const p = productMap[item.productId];
      if (!p) return res.status(400).json({ message: `Product ${item.productId} not found` });
      if (p.stock < item.quantity) return res.status(400).json({ message: `Insufficient stock for ${p.name}` });
    }

    // Create order number
    const count = await prisma.commerceOrder.count({ where: { organizationId } });
    const orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`;

    const totalAmount = items.reduce((sum, item) => {
      const p = productMap[item.productId];
      return sum + p.sellingPrice * item.quantity;
    }, 0);

    const order = await prisma.commerceOrder.create({
      data: {
        organizationId,
        orderNumber,
        clientName,
        clientPhone,
        clientAddress: clientAddress || '',
        totalAmount,
        codAmount: totalAmount,
        shippingCost: 0,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        source: 'STORE',
        orderItems: {
          create: items.map(item => {
            const p = productMap[item.productId];
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: p.sellingPrice,
              costPrice: p.costPrice,
              subtotal: p.sellingPrice * item.quantity,
            };
          }),
        },
      },
    });

    // Deduct stock
    for (const item of items) {
      await prisma.commerceStockMovement.create({
        data: {
          organizationId,
          productId: item.productId,
          type: 'OUT',
          quantity: item.quantity,
          reference: order.orderNumber,
        },
      });
    }

    res.status(201).json({ orderNumber: order.orderNumber, totalAmount: order.totalAmount });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getStoreProducts, getStoreProduct, getStoreOrgs, getStoreCategories, placeStoreOrder };
