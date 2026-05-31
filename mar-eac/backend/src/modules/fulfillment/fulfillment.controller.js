const prisma = require('../../config/database');

// GET /api/fulfillment/orders — all STORE orders, newest first
const getOrders = async (req, res) => {
  try {
    const orders = await prisma.commerceOrder.findMany({
      where: { source: 'STORE' },
      include: {
        organization: { select: { name: true, nameAr: true } },
        items: {
          include: { product: { select: { name: true, nameAr: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/fulfillment/orders/:id — update status + optional trackingNumber
const updateOrder = async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    const data = {};
    if (status) data.status = status;
    if (trackingNumber) data.trackingNumber = trackingNumber;
    if (status === 'SHIPPED') data.shippedAt = new Date();
    if (status === 'DELIVERED') data.deliveredAt = new Date();
    const order = await prisma.commerceOrder.update({ where: { id: req.params.id }, data });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/fulfillment/stock-alerts — products with stock <= 10
const getStockAlerts = async (req, res) => {
  try {
    const products = await prisma.commerceProduct.findMany({
      where: { isActive: true, organization: { modules: { has: 'COMMERCE' } } },
      select: {
        id: true, name: true, nameAr: true,
        organization: { select: { name: true, nameAr: true } },
        stockMovements: { select: { type: true, quantity: true } },
      },
    });
    const alerts = products
      .map(p => {
        const stock = p.stockMovements.reduce((s, m) => {
          if (m.type === 'IN' || m.type === 'RETURN') return s + m.quantity;
          if (m.type === 'OUT') return s - m.quantity;
          if (m.type === 'ADJUST') return m.quantity;
          return s;
        }, 0);
        const { stockMovements, ...rest } = p;
        return { ...rest, stock };
      })
      .filter(p => p.stock <= 10)
      .sort((a, b) => a.stock - b.stock);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getOrders, updateOrder, getStockAlerts };
