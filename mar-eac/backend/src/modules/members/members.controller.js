const prisma = require('../../config/database');

const UNIQUE_ROLES = ['PRESIDENT', 'TREASURER'];

const getAll = async (req, res) => {
  try {
    const { role, search, isActive } = req.query;
    const orgId = req.organization.id;

    const where = { organizationId: orgId };
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const members = await prisma.member.findMany({
      where,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    res.json(members);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const member = await prisma.member.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const create = async (req, res) => {
  try {
    const { name, phone, email, role, joinDate } = req.body;
    const orgId = req.organization.id;

    if (!name) return res.status(400).json({ message: 'Name is required' });

    // Enforce unique roles
    if (role && UNIQUE_ROLES.includes(role)) {
      const existing = await prisma.member.findFirst({
        where: { organizationId: orgId, role, isActive: true },
      });
      if (existing) {
        return res.status(400).json({
          message: `A ${role.toLowerCase()} already exists in this organization`,
        });
      }
    }

    const member = await prisma.member.create({
      data: {
        organizationId: orgId,
        name,
        phone,
        email,
        role: role || 'MEMBER',
        joinDate: joinDate ? new Date(joinDate) : new Date(),
      },
    });

    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const update = async (req, res) => {
  try {
    const { name, phone, email, role, isActive, joinDate } = req.body;
    const orgId = req.organization.id;
    const memberId = req.params.id;

    const existing = await prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!existing) return res.status(404).json({ message: 'Member not found' });

    // Enforce unique roles (exclude current member)
    if (role && UNIQUE_ROLES.includes(role) && role !== existing.role) {
      const conflict = await prisma.member.findFirst({
        where: { organizationId: orgId, role, isActive: true, id: { not: memberId } },
      });
      if (conflict) {
        return res.status(400).json({
          message: `A ${role.toLowerCase()} already exists in this organization`,
        });
      }
    }

    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        name: name ?? existing.name,
        phone: phone ?? existing.phone,
        email: email ?? existing.email,
        role: role ?? existing.role,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        joinDate: joinDate ? new Date(joinDate) : existing.joinDate,
      },
    });

    res.json(member);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const remove = async (req, res) => {
  try {
    const member = await prisma.member.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    await prisma.member.delete({ where: { id: req.params.id } });
    res.json({ message: 'Member deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getBoardMembers = async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      where: {
        organizationId: req.organization.id,
        role: { not: 'MEMBER' },
        isActive: true,
      },
      orderBy: { role: 'asc' },
    });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const [total, active, board] = await Promise.all([
      prisma.member.count({ where: { organizationId: orgId } }),
      prisma.member.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.member.count({ where: { organizationId: orgId, role: { not: 'MEMBER' }, isActive: true } }),
    ]);
    res.json({ total, active, inactive: total - active, board });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, remove, getBoardMembers, getStats };
