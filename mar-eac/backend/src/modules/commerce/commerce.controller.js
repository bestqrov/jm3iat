const prisma = require('../../config/database');

const orgId = (req) => req.organization.id;

// ── helpers ───────────────────────────────────────────────────────────────────

async function computeStock(organizationId) {
  const movements = await prisma.commerceStockMovement.findMany({ where: { organizationId } });
  const stock = {};
  for (const m of movements) {
    if (!stock[m.productId]) stock[m.productId] = 0;
    if (m.type === 'IN') stock[m.productId] += m.quantity;
    else if (m.type === 'OUT') stock[m.productId] -= m.quantity;
    else if (m.type === 'RETURN') stock[m.productId] += m.quantity;
    else stock[m.productId] = m.quantity; // ADJUST
  }
  return stock;
}

async function nextOrderNumber(organizationId) {
  const last = await prisma.commerceOrder.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
  const year = new Date().getFullYear();
  if (!last) return `CMD-${year}-001`;
  const parts = last.orderNumber.split('-');
  const seq = (parseInt(parts[parts.length - 1]) || 0) + 1;
  return `CMD-${year}-${String(seq).padStart(3, '0')}`;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
  try {
    const id = orgId(req);
    const [products, orders, profits, payouts] = await Promise.all([
      prisma.commerceProduct.findMany({ where: { organizationId: id, isActive: true } }),
      prisma.commerceOrder.findMany({ where: { organizationId: id } }),
      prisma.commerceOrderProfit.findMany({ where: { organizationId: id } }),
      prisma.commercePayout.findMany({ where: { organizationId: id } }),
    ]);

    const stock = await computeStock(id);
    const delivered = orders.filter(o => o.status === 'DELIVERED');
    const pending   = orders.filter(o => ['PENDING', 'CONFIRMED'].includes(o.status));
    const shipped   = orders.filter(o => o.status === 'SHIPPED');
    const returned  = orders.filter(o => o.status === 'RETURNED');

    const totalRevenue  = delivered.reduce((s, o) => s + o.totalAmount, 0);
    const totalProfit   = profits.reduce((s, p) => s + p.netProfit, 0);
    const unpaidProfit  = profits.filter(p => !p.isPaidOut).reduce((s, p) => s + p.netProfit, 0);
    const codPending    = orders.filter(o => o.paymentStatus === 'UNPAID' && o.status === 'DELIVERED').reduce((s, o) => s + o.codAmount, 0);

    res.json({
      totalProducts: products.length,
      lowStockProducts: products.filter(p => (stock[p.id] || 0) <= 0).length,
      totalOrders: orders.length,
      pendingOrders: pending.length,
      shippedOrders: shipped.length,
      deliveredOrders: delivered.length,
      returnedOrders: returned.length,
      totalRevenue,
      totalProfit,
      unpaidProfit,
      codPending,
      totalPayouts: payouts.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Products ──────────────────────────────────────────────────────────────────

exports.getProducts = async (req, res) => {
  try {
    const id = orgId(req);
    const products = await prisma.commerceProduct.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: 'desc' },
    });
    const stock = await computeStock(id);
    const result = products.map(p => ({ ...p, stock: stock[p.id] || 0 }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, nameAr, description, category, sku, costPrice, sellingPrice, commission, unit, imageUrl } = req.body;
    const product = await prisma.commerceProduct.create({
      data: {
        organizationId: orgId(req),
        name, nameAr, description, category, sku,
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        commission: parseFloat(commission) || 0,
        unit: unit || 'pièce',
        imageUrl,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, nameAr, description, category, sku, costPrice, sellingPrice, commission, unit, isActive, imageUrl } = req.body;
    const product = await prisma.commerceProduct.updateMany({
      where: { id: req.params.id, organizationId: orgId(req) },
      data: {
        name, nameAr, description, category, sku,
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        commission: parseFloat(commission) || 0,
        unit, isActive, imageUrl,
      },
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await prisma.commerceProduct.updateMany({
      where: { id: req.params.id, organizationId: orgId(req) },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Warehouse / Stock ─────────────────────────────────────────────────────────

exports.getStockMovements = async (req, res) => {
  try {
    const id = orgId(req);
    const movements = await prisma.commerceStockMovement.findMany({
      where: { organizationId: id },
      include: { product: { select: { name: true, unit: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(movements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addStockMovement = async (req, res) => {
  try {
    const { productId, type, quantity, unitCost, reference, notes, date } = req.body;
    const movement = await prisma.commerceStockMovement.create({
      data: {
        organizationId: orgId(req),
        productId,
        type,
        quantity: parseFloat(quantity),
        unitCost: unitCost ? parseFloat(unitCost) : null,
        reference,
        notes,
        date: date ? new Date(date) : new Date(),
      },
    });
    res.status(201).json(movement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Orders ────────────────────────────────────────────────────────────────────

exports.getOrders = async (req, res) => {
  try {
    const id = orgId(req);
    const { status } = req.query;
    const where = { organizationId: id };
    if (status) where.status = status;
    const orders = await prisma.commerceOrder.findMany({
      where,
      include: {
        items: { include: { product: { select: { name: true, unit: true } } } },
        profit: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const id = orgId(req);
    const { clientName, clientPhone, clientAddress, clientCity, shippingCost, notes, carrier, items } = req.body;

    if (!items || !items.length) return res.status(400).json({ message: 'يجب إضافة منتج واحد على الأقل' });

    const orderNumber = await nextOrderNumber(id);
    let totalAmount = 0;
    let totalCogs = 0;

    const itemsData = [];
    for (const item of items) {
      const product = await prisma.commerceProduct.findFirst({
        where: { id: item.productId, organizationId: id },
      });
      if (!product) continue;
      const qty = parseFloat(item.quantity);
      const subtotal = qty * product.sellingPrice;
      totalAmount += subtotal;
      totalCogs += qty * product.costPrice;
      itemsData.push({
        productId: item.productId,
        quantity: qty,
        unitPrice: product.sellingPrice,
        costPrice: product.costPrice,
        subtotal,
      });
    }

    const shipping = parseFloat(shippingCost) || 0;
    const codAmount = totalAmount + shipping;
    const platformFee = itemsData.reduce((s, i) => {
      // commission stored on product, get it back
      return s;
    }, 0);
    const netProfit = totalAmount - totalCogs - shipping;

    const order = await prisma.commerceOrder.create({
      data: {
        organizationId: id,
        orderNumber,
        clientName, clientPhone, clientAddress, clientCity,
        totalAmount,
        codAmount,
        shippingCost: shipping,
        carrier,
        notes,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    // Create profit record
    await prisma.commerceOrderProfit.create({
      data: {
        organizationId: id,
        orderId: order.id,
        revenue: totalAmount,
        cogs: totalCogs,
        shippingCost: shipping,
        platformFee: 0,
        netProfit,
      },
    });

    // Deduct stock
    for (const item of itemsData) {
      await prisma.commerceStockMovement.create({
        data: {
          organizationId: id,
          productId: item.productId,
          type: 'OUT',
          quantity: item.quantity,
          reference: orderNumber,
          notes: `طلب ${orderNumber}`,
        },
      });
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus, trackingNumber, carrier } = req.body;
    const data = {};
    if (status) {
      data.status = status;
      if (status === 'SHIPPED') data.shippedAt = new Date();
      if (status === 'DELIVERED') data.deliveredAt = new Date();
      if (status === 'RETURNED') {
        // Return stock
        const order = await prisma.commerceOrder.findFirst({
          where: { id: req.params.id, organizationId: orgId(req) },
          include: { items: true },
        });
        if (order) {
          for (const item of order.items) {
            await prisma.commerceStockMovement.create({
              data: {
                organizationId: orgId(req),
                productId: item.productId,
                type: 'RETURN',
                quantity: item.quantity,
                reference: order.orderNumber,
                notes: `إرجاع ${order.orderNumber}`,
              },
            });
          }
        }
      }
    }
    if (paymentStatus) data.paymentStatus = paymentStatus;
    if (trackingNumber) data.trackingNumber = trackingNumber;
    if (carrier) data.carrier = carrier;

    await prisma.commerceOrder.updateMany({
      where: { id: req.params.id, organizationId: orgId(req) },
      data,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const id = orgId(req);
    const order = await prisma.commerceOrder.findFirst({
      where: { id: req.params.id, organizationId: id },
    });
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (!['PENDING', 'CANCELLED'].includes(order.status)) {
      return res.status(400).json({ message: 'لا يمكن حذف طلب في حالة متقدمة' });
    }
    await prisma.commerceOrderProfit.deleteMany({ where: { orderId: req.params.id } });
    await prisma.commerceOrder.deleteMany({ where: { id: req.params.id, organizationId: id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Profits / COD ─────────────────────────────────────────────────────────────

exports.getProfits = async (req, res) => {
  try {
    const id = orgId(req);
    const profits = await prisma.commerceOrderProfit.findMany({
      where: { organizationId: id },
      include: {
        order: { select: { orderNumber: true, clientName: true, status: true, paymentStatus: true, orderDate: true, codAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(profits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Payouts ───────────────────────────────────────────────────────────────────

exports.getPayouts = async (req, res) => {
  try {
    const payouts = await prisma.commercePayout.findMany({
      where: { organizationId: orgId(req) },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createPayout = async (req, res) => {
  try {
    const id = orgId(req);
    const { amount, method, reference, notes, periodStart, periodEnd, orderIds } = req.body;

    const payout = await prisma.commercePayout.create({
      data: {
        organizationId: id,
        amount: parseFloat(amount),
        ordersCount: orderIds?.length || 0,
        method: method || 'BANK_TRANSFER',
        reference,
        notes,
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    if (orderIds?.length) {
      await prisma.commerceOrderProfit.updateMany({
        where: { orderId: { in: orderIds }, organizationId: id },
        data: { isPaidOut: true, payoutId: payout.id },
      });
    }

    res.status(201).json(payout);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
