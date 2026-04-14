const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAssocTypeKey = (modules) => {
  const m = Array.isArray(modules) ? modules : [];
  const hasProd  = m.includes('PRODUCTIVE');
  const hasWater = m.includes('WATER');
  const hasProj  = m.includes('PROJECTS');
  if (hasProd && hasWater) return 'PRODUCTIVE_WATER';
  if (hasProd)  return 'PRODUCTIVE';
  if (hasWater) return 'WATER';
  if (hasProj)  return 'PROJECTS';
  return 'REGULAR';
};

const ASSOC_TYPE_PLAN = {
  REGULAR:          'BASIC',
  PROJECTS:         'STANDARD',
  WATER:            'PREMIUM',
  PRODUCTIVE:       'PREMIUM',
  PRODUCTIVE_WATER: 'PREMIUM',
};

const ASSOC_TYPE_MODULES = {
  REGULAR:          [],
  PROJECTS:         ['PROJECTS'],
  WATER:            ['WATER'],
  PRODUCTIVE:       ['PRODUCTIVE'],
  PRODUCTIVE_WATER: ['PRODUCTIVE', 'WATER'],
};

// Monthly price per association type (MAD)
const TYPE_PRICES = {
  REGULAR:          99,
  PROJECTS:         149,
  WATER:            199,
  PRODUCTIVE:       199,
  PRODUCTIVE_WATER: 299,
};

// ─── Stats ────────────────────────────────────────────────────────────────────

const getStats = async (req, res) => {
  try {
    const [totalOrgs, totalUsers, trialOrgs, activeOrgs, allOrgs] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.organization.findMany({ select: { modules: true } }),
    ]);

    const typeDistribution = { REGULAR: 0, PROJECTS: 0, WATER: 0, PRODUCTIVE: 0, PRODUCTIVE_WATER: 0 };
    for (const org of allOrgs) {
      typeDistribution[getAssocTypeKey(org.modules)]++;
    }

    res.json({ totalOrgs, totalUsers, trialOrgs, activeOrgs, typeDistribution });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Analytics ────────────────────────────────────────────────────────────────

const getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allOrgsWithSubs, expiringSubs, recentOrgs, recentPayments] = await Promise.all([
      prisma.organization.findMany({
        select: {
          id: true,
          modules: true,
          subscription: { select: { plan: true, status: true } },
        },
      }),
      prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { gte: now, lte: thirtyDaysFromNow },
        },
        include: {
          organization: { select: { id: true, name: true, email: true, modules: true } },
        },
        orderBy: { expiresAt: 'asc' },
      }),
      prisma.organization.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
      prisma.payment.findMany({
        orderBy: { paidAt: 'desc' },
        take: 5,
        include: { organization: { select: { name: true } } },
      }),
    ]);

    // Monthly signups last 6 months
    const monthlySignups = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = recentOrgs.filter(o => o.createdAt >= start && o.createdAt < end).length;
      monthlySignups.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        count,
      });
    }

    // MRR estimate — sum prices of all ACTIVE orgs
    let mrrEstimate = 0;
    for (const org of allOrgsWithSubs) {
      if (org.subscription?.status === 'ACTIVE') {
        mrrEstimate += TYPE_PRICES[getAssocTypeKey(org.modules)] || 99;
      }
    }

    // Trial orgs MRR potential (if converted)
    let potentialMrr = 0;
    for (const org of allOrgsWithSubs) {
      if (org.subscription?.status === 'TRIAL') {
        potentialMrr += TYPE_PRICES[getAssocTypeKey(org.modules)] || 99;
      }
    }

    // Payments collected
    const allPaymentsThisMonth = await prisma.payment.findMany({
      where: { paidAt: { gte: startOfMonth } },
      select: { amount: true },
    });
    const allPaymentsTotal = await prisma.payment.aggregate({ _sum: { amount: true } });
    const paymentsThisMonth = allPaymentsThisMonth.reduce((s, p) => s + p.amount, 0);
    const totalCollected = allPaymentsTotal._sum.amount || 0;

    res.json({
      monthlySignups,
      expiringSoon: expiringSubs.map(s => ({
        ...s.organization,
        expiresAt: s.expiresAt,
        daysLeft: Math.ceil((new Date(s.expiresAt) - now) / (1000 * 60 * 60 * 24)),
      })),
      mrrEstimate,
      potentialMrr,
      paymentsThisMonth,
      totalCollected,
      recentPayments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Organizations ────────────────────────────────────────────────────────────

const getOrganizations = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }
    // type filter applied in-memory after fetch (modules is an array field)
    if (status) {
      where.subscription = { status };
    }

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          subscription: true,
          _count: { select: { users: true, members: true, meetings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.organization.count({ where }),
    ]);

    // Filter by assoc type if requested
    const filtered = type ? orgs.filter(o => getAssocTypeKey(o.modules) === type) : orgs;

    res.json({ data: filtered, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getOrganization = async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: {
        subscription: true,
        users: { select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } },
        _count: { select: { members: true, meetings: true, projects: true, transactions: true } },
        payments: { orderBy: { paidAt: 'desc' }, take: 10 },
      },
    });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json(org);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSubscription = async (req, res) => {
  try {
    const { assocType, status, expiresAt } = req.body;
    const orgId = req.params.id;

    const plan    = assocType ? (ASSOC_TYPE_PLAN[assocType]    || 'BASIC') : undefined;
    const modules = assocType ? (ASSOC_TYPE_MODULES[assocType] || [])       : undefined;

    if (modules !== undefined) {
      await prisma.organization.update({ where: { id: orgId }, data: { modules } });
    }

    const sub = await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: {
        ...(plan   ? { plan }   : {}),
        ...(status ? { status } : {}),
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
      create: {
        organizationId: orgId,
        plan: plan || 'BASIC',
        status: status || 'ACTIVE',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteOrganization = async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({ where: { id: req.params.id } });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    await prisma.organization.delete({ where: { id: req.params.id } });
    res.json({ message: 'Organization and all related data deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Payments ─────────────────────────────────────────────────────────────────

const getPayments = async (req, res) => {
  try {
    const { orgId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = orgId ? { organizationId: orgId } : {};

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { organization: { select: { id: true, name: true } } },
        orderBy: { paidAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({ data: payments, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createPayment = async (req, res) => {
  try {
    const { organizationId, amount, method, reference, note, paidAt } = req.body;
    if (!organizationId || !amount) {
      return res.status(400).json({ message: 'organizationId and amount are required' });
    }

    const payment = await prisma.payment.create({
      data: {
        organizationId,
        amount: parseFloat(amount),
        method: method || 'CASH',
        reference: reference || null,
        note: note || null,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
      include: { organization: { select: { id: true, name: true } } },
    });

    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deletePayment = async (req, res) => {
  try {
    await prisma.payment.delete({ where: { id: req.params.paymentId } });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Users ────────────────────────────────────────────────────────────────────

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { role: { not: 'SUPER_ADMIN' } };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
          organization: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data: users, total });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const toggleUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user || user.role === 'SUPER_ADMIN') {
      return res.status(404).json({ message: 'User not found' });
    }
    const updated = await prisma.user.update({
      where: { id: req.params.userId },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, email: true, isActive: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user || user.role === 'SUPER_ADMIN') return res.status(404).json({ message: 'User not found' });

    const tempPassword = Math.random().toString(36).slice(-4).toUpperCase() +
      Math.random().toString(36).slice(-4).toUpperCase();
    const hashed = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ tempPassword, name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getStats, getAnalytics,
  getOrganizations, getOrganization, updateSubscription, deleteOrganization,
  getPayments, createPayment, deletePayment,
  getUsers, toggleUser, resetUserPassword,
};
