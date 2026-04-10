const prisma = require('../../config/database');

const getStats = async (req, res) => {
  try {
    const [
      totalOrgs, totalUsers, trialOrgs, activeOrgs,
      basicCount, standardCount, premiumCount,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { plan: 'BASIC' } }),
      prisma.subscription.count({ where: { plan: 'STANDARD' } }),
      prisma.subscription.count({ where: { plan: 'PREMIUM' } }),
    ]);

    res.json({
      totalOrgs,
      totalUsers,
      trialOrgs,
      activeOrgs,
      planDistribution: { BASIC: basicCount, STANDARD: standardCount, PREMIUM: premiumCount },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getOrganizations = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
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

    res.json({ data: orgs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
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
    const { plan, status, expiresAt } = req.body;
    const orgId = req.params.id;

    const sub = await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: {
        plan: plan || undefined,
        status: status || undefined,
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

module.exports = { getStats, getOrganizations, getOrganization, updateSubscription, getUsers, toggleUser, deleteOrganization };
