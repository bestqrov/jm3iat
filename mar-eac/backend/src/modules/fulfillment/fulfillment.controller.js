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

// ── Cross-org product management (SUPER_ADMIN + STORE_MANAGER) ───────────────

// GET /api/fulfillment/products?search=&category=&orgId=&status=&page=1&limit=20
const getProducts = async (req, res) => {
  try {
    const { search = '', category = '', orgId = '', status = '', page = '1', limit = '20' } = req.query;
    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

    const where = { organization: { modules: { has: 'COMMERCE' } } };
    if (orgId)    where.organizationId = orgId;
    if (category) where.category = category;
    if (status === 'active')   where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where.OR = [
        { name:   { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search } },
        { sku:    { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.commerceProduct.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true, nameAr: true } },
          stockMovements: { select: { type: true, quantity: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.commerceProduct.count({ where }),
    ]);

    const products = items.map(p => {
      const stock = p.stockMovements.reduce((s, m) => {
        if (m.type === 'IN' || m.type === 'RETURN') return s + m.quantity;
        if (m.type === 'OUT') return s - m.quantity;
        if (m.type === 'ADJUST') return m.quantity;
        return s;
      }, 0);
      const { stockMovements, ...rest } = p;
      return { ...rest, stock };
    });

    res.json({ products, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/fulfillment/products
const createProduct = async (req, res) => {
  try {
    const { organizationId, name, nameAr, description, category, sku, costPrice, sellingPrice, commission, unit, imageUrl, isActive, initialStock } = req.body;
    if (!organizationId || !name || !sellingPrice) {
      return res.status(400).json({ message: 'organizationId, name, sellingPrice requis' });
    }
    const product = await prisma.commerceProduct.create({
      data: {
        organizationId,
        name, nameAr: nameAr || null,
        description: description || null,
        category: category || null,
        sku: sku || null,
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice),
        commission: parseFloat(commission) || 0,
        unit: unit || 'pièce',
        imageUrl: imageUrl || null,
        isActive: isActive !== false,
      },
    });
    if (initialStock && parseInt(initialStock) > 0) {
      await prisma.commerceStockMovement.create({
        data: {
          organizationId,
          productId: product.id,
          type: 'IN',
          quantity: parseInt(initialStock),
          reference: 'INITIAL',
        },
      });
    }
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/fulfillment/products/:id
const updateProduct = async (req, res) => {
  try {
    const { name, nameAr, description, category, sku, costPrice, sellingPrice, commission, unit, imageUrl, isActive, organizationId } = req.body;
    const data = {};
    if (name        !== undefined) data.name        = name;
    if (nameAr      !== undefined) data.nameAr      = nameAr || null;
    if (description !== undefined) data.description = description || null;
    if (category    !== undefined) data.category    = category || null;
    if (sku         !== undefined) data.sku         = sku || null;
    if (costPrice   !== undefined) data.costPrice   = parseFloat(costPrice) || 0;
    if (sellingPrice !== undefined) data.sellingPrice = parseFloat(sellingPrice);
    if (commission  !== undefined) data.commission  = parseFloat(commission) || 0;
    if (unit        !== undefined) data.unit        = unit;
    if (imageUrl    !== undefined) data.imageUrl    = imageUrl || null;
    if (isActive    !== undefined) data.isActive    = Boolean(isActive);
    if (organizationId !== undefined) data.organizationId = organizationId;

    const product = await prisma.commerceProduct.update({ where: { id: req.params.id }, data });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/fulfillment/products/:id
const deleteProduct = async (req, res) => {
  try {
    await prisma.commerceProduct.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/fulfillment/products/:id/toggle
const toggleProduct = async (req, res) => {
  try {
    const product = await prisma.commerceProduct.findUnique({ where: { id: req.params.id }, select: { isActive: true } });
    if (!product) return res.status(404).json({ message: 'Not found' });
    const updated = await prisma.commerceProduct.update({
      where: { id: req.params.id },
      data: { isActive: !product.isActive },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/fulfillment/stock-movements?productId=&orgId=&page=1
const getStockMovements = async (req, res) => {
  try {
    const { productId = '', orgId = '', page = '1' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const where = {};
    if (productId) where.productId = productId;
    if (orgId)     where.organizationId = orgId;

    const [items, total] = await Promise.all([
      prisma.commerceStockMovement.findMany({
        where,
        include: {
          product: { select: { name: true, nameAr: true, unit: true } },
          organization: { select: { name: true, nameAr: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * 30,
        take: 30,
      }),
      prisma.commerceStockMovement.count({ where }),
    ]);
    res.json({ movements: items, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/fulfillment/stock-movements
const addStockMovement = async (req, res) => {
  try {
    const { organizationId, productId, type, quantity, reference, notes } = req.body;
    if (!organizationId || !productId || !type || !quantity) {
      return res.status(400).json({ message: 'organizationId, productId, type, quantity requis' });
    }
    const movement = await prisma.commerceStockMovement.create({
      data: { organizationId, productId, type, quantity: parseInt(quantity), reference: reference || null, notes: notes || null },
    });
    res.status(201).json(movement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/fulfillment/commerce-orgs
const getCommerceOrgs = async (req, res) => {
  try {
    const orgs = await prisma.organization.findMany({
      where: { modules: { has: 'COMMERCE' } },
      select: { id: true, name: true, nameAr: true, cityAr: true },
      orderBy: { name: 'asc' },
    });
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Category management (stored in PlatformSettings key: store_categories) ──────

const CATS_KEY = 'store_categories';

const getCategories = async (req, res) => {
  try {
    const setting = await prisma.platformSettings.findUnique({ where: { key: CATS_KEY } });
    const saved = setting ? JSON.parse(setting.value) : [];

    // Merge with distinct categories that already exist on products
    const products = await prisma.commerceProduct.findMany({
      where: { category: { not: null } },
      select: { category: true },
    });
    const fromProducts = [...new Set(products.map(p => p.category).filter(Boolean))];

    // Union: predefined + from products, deduplicated
    const all = [...new Set([...saved, ...fromProducts])].sort((a, b) => a.localeCompare(b, 'ar'));

    // Get category images
    let images = {};
    try {
      const imgSetting = await prisma.platformSettings.findFirst({ where: { key: 'store_category_images' } });
      if (imgSetting) {
        images = typeof imgSetting.value === 'string' ? JSON.parse(imgSetting.value) : imgSetting.value;
      }
    } catch { images = {}; }

    res.json({ categories: all, predefined: saved, images });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'name requis' });
    const trimmed = String(name).trim();

    const setting = await prisma.platformSettings.findUnique({ where: { key: CATS_KEY } });
    const existing = setting ? JSON.parse(setting.value) : [];
    if (existing.includes(trimmed)) return res.status(409).json({ message: 'Catégorie déjà existante' });

    const updated = [...existing, trimmed];
    await prisma.platformSettings.upsert({
      where: { key: CATS_KEY },
      update: { value: JSON.stringify(updated) },
      create: { key: CATS_KEY, value: JSON.stringify(updated), category: 'GENERAL' },
    });
    res.status(201).json({ categories: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const renameCategory = async (req, res) => {
  try {
    const oldName = decodeURIComponent(req.params.name);
    const { name: newName } = req.body;
    if (!newName || !String(newName).trim()) return res.status(400).json({ message: 'name requis' });
    const trimmed = String(newName).trim();
    if (trimmed === oldName) return res.json({ ok: true });

    // 1. Update PlatformSettings list
    const setting = await prisma.platformSettings.findUnique({ where: { key: CATS_KEY } });
    const existing = setting ? JSON.parse(setting.value) : [];
    const updated = existing.map(c => c === oldName ? trimmed : c);
    await prisma.platformSettings.upsert({
      where: { key: CATS_KEY },
      update: { value: JSON.stringify(updated) },
      create: { key: CATS_KEY, value: JSON.stringify(updated), category: 'GENERAL' },
    });

    // 2. Bulk update all products with old category name
    await prisma.commerceProduct.updateMany({
      where: { category: oldName },
      data:  { category: trimmed },
    });

    // Move image to new name if exists
    try {
      const imgSetting = await prisma.platformSettings.findFirst({ where: { key: 'store_category_images' } });
      if (imgSetting) {
        let images = typeof imgSetting.value === 'string' ? JSON.parse(imgSetting.value) : imgSetting.value;
        if (images[oldName]) {
          images[trimmed] = images[oldName];
          delete images[oldName];
          await prisma.platformSettings.update({ where: { id: imgSetting.id }, data: { value: JSON.stringify(images) } });
        }
      }
    } catch { /* silent */ }

    res.json({ ok: true, categories: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const setting = await prisma.platformSettings.findUnique({ where: { key: CATS_KEY } });
    const existing = setting ? JSON.parse(setting.value) : [];
    const updated = existing.filter(c => c !== name);
    await prisma.platformSettings.upsert({
      where: { key: CATS_KEY },
      update: { value: JSON.stringify(updated) },
      create: { key: CATS_KEY, value: JSON.stringify(updated), category: 'GENERAL' },
    });
    res.json({ categories: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateCategoryImage = async (req, res) => {
  try {
    const { name } = req.params;
    const { image } = req.body; // base64 data URL or null to remove

    const decodedName = decodeURIComponent(name);

    // Get or create the images settings entry
    let setting = await prisma.platformSettings.findFirst({
      where: { key: 'store_category_images' },
    });

    let images = {};
    if (setting) {
      try { images = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value; } catch { images = {}; }
    }

    if (image) {
      images[decodedName] = image;
    } else {
      delete images[decodedName];
    }

    const jsonValue = JSON.stringify(images);

    if (setting) {
      await prisma.platformSettings.update({
        where: { id: setting.id },
        data: { value: jsonValue },
      });
    } else {
      await prisma.platformSettings.create({
        data: { key: 'store_category_images', value: jsonValue },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getOrders, updateOrder, getStockAlerts,
  getProducts, createProduct, updateProduct, deleteProduct, toggleProduct,
  getStockMovements, addStockMovement, getCommerceOrgs,
  getCategories, addCategory, renameCategory, deleteCategory, updateCategoryImage,
};
