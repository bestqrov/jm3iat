const prisma = require('../../config/database');
const axios  = require('axios');

const sendWA = async (phone, text, orgInstance) => {
  const rows = await prisma.platformSettings.findMany({
    where: { key: { in: ['evolution_api_url', 'evolution_api_key'] } },
  });
  const m = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const evoUrl = m['evolution_api_url'] || process.env.EVOLUTION_API_URL || '';
  const evoKey = m['evolution_api_key'] || process.env.EVOLUTION_API_KEY || '';
  if (!evoUrl || !evoKey) return; // silently skip if not configured
  const instance = orgInstance || process.env.EVOLUTION_INSTANCE || 'main';
  return axios.post(
    `${evoUrl}/message/sendText/${instance}`,
    { number: phone.replace(/[\s\-\+]/g, ''), textMessage: { text } },
    { headers: { apikey: evoKey, 'Content-Type': 'application/json' }, timeout: 15000 }
  );
};

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

// GET /api/store/best-sellers
const getBestSellers = async (req, res) => {
  try {
    const topItems = await prisma.commerceOrderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 4,
      where: {
        order: {
          source: 'STORE',
          status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
          organization: { modules: { has: 'COMMERCE' } },
        },
      },
    });

    if (topItems.length === 0) return res.json([]);

    const productIds = topItems.map(i => i.productId);
    const products = await prisma.commerceProduct.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: {
        id: true, name: true, nameAr: true, category: true,
        sellingPrice: true, unit: true, imageUrl: true,
        organization: { select: { id: true, name: true, nameAr: true, cityAr: true, logo: true } },
        stockMovements: { select: { type: true, quantity: true } },
      },
    });

    const result = products.map(p => {
      const stock = p.stockMovements.reduce((s, m) => {
        if (m.type === 'IN' || m.type === 'RETURN') return s + m.quantity;
        if (m.type === 'OUT') return s - m.quantity;
        if (m.type === 'ADJUST') return m.quantity;
        return s;
      }, 0);
      const sold = topItems.find(i => i.productId === p.id)?._sum?.quantity ?? 0;
      const { stockMovements, ...rest } = p;
      return { ...rest, stock, sold };
    });

    result.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
    res.json(result);
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

    // WhatsApp: notify client
    if (clientPhone) {
      const clientMsg =
        `✅ وصل طلبك!\n` +
        `رقم الطلب: ${order.orderNumber}\n` +
        `المبلغ: ${order.totalAmount.toFixed(2)} درهم\n` +
        `الدفع: عند الاستلام\n` +
        `سيتواصل معك المورد لتأكيد التسليم.`;
      sendWA(clientPhone, clientMsg, null).catch(() => {});
    }

    // WhatsApp: notify cooperative
    const orgWa = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { phone: true, evolutionInstance: true },
    });
    if (orgWa?.phone) {
      const orgMsg =
        `🛒 طلب جديد من المتجر!\n` +
        `رقم الطلب: ${order.orderNumber}\n` +
        `العميل: ${clientName}\n` +
        `الهاتف: ${clientPhone || '-'}\n` +
        `المبلغ: ${order.totalAmount.toFixed(2)} درهم`;
      sendWA(orgWa.phone, orgMsg, orgWa.evolutionInstance).catch(() => {});
    }

    res.status(201).json({ orderNumber: order.orderNumber, totalAmount: order.totalAmount });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/store/orders/:orderNumber
const getOrderStatus = async (req, res) => {
  try {
    const order = await prisma.commerceOrder.findFirst({
      where: { orderNumber: req.params.orderNumber },
      select: {
        orderNumber: true,
        clientName: true,
        clientPhone: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        trackingNumber: true,
        carrier: true,
        orderDate: true,
        shippedAt: true,
        deliveredAt: true,
        organization: { select: { name: true, nameAr: true, phone: true, cityAr: true } },
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            subtotal: true,
            product: { select: { name: true, nameAr: true, imageUrl: true } },
          },
        },
      },
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getStoreProducts, getStoreProduct, getStoreOrgs, getStoreCategories, getBestSellers, placeStoreOrder, getOrderStatus };
