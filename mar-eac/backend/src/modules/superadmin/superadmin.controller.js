const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');

// Derive association type key from modules array
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

// Map association type to subscription plan tier
const ASSOC_TYPE_PLAN = {
  REGULAR:          'BASIC',
  PROJECTS:         'STANDARD',
  WATER:            'PREMIUM',
  PRODUCTIVE:       'PREMIUM',
  PRODUCTIVE_WATER: 'PREMIUM',
};

// Map association type to modules array
const ASSOC_TYPE_MODULES = {
  REGULAR:          [],
  PROJECTS:         ['PROJECTS'],
  WATER:            ['WATER'],
  PRODUCTIVE:       ['PRODUCTIVE'],
  PRODUCTIVE_WATER: ['PRODUCTIVE', 'WATER'],
};

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
        // modules is a scalar field, included automatically
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
    const { assocType, status, expiresAt } = req.body;
    const orgId = req.params.id;

    const plan    = assocType ? (ASSOC_TYPE_PLAN[assocType]    || 'BASIC') : undefined;
    const modules = assocType ? (ASSOC_TYPE_MODULES[assocType] || [])       : undefined;

    // Update org modules if assocType provided
    if (modules !== undefined) {
      await prisma.organization.update({ where: { id: orgId }, data: { modules } });
    }

    const sub = await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: {
        ...(plan   ? { plan }                           : {}),
        ...(status ? { status }                         : {}),
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

module.exports = { getStats, getOrganizations, getOrganization, updateSubscription, getUsers, toggleUser, deleteOrganization, resetUserPassword };
