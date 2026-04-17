const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../../config/jwt');

const ALLOWED_STAFF_ROLES = ['PRESIDENT', 'TREASURER', 'SECRETARY'];

// ── List all staff accounts for this org (excludes ADMIN self) ────────────────
const getStaff = async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: {
        organizationId: req.organization.id,
        role: { in: ALLOWED_STAFF_ROLES },
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Create a staff account ────────────────────────────────────────────────────
const createStaff = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password, role required' });
    }
    if (!ALLOWED_STAFF_ROLES.includes(role)) {
      return res.status(400).json({ message: `role must be one of: ${ALLOWED_STAFF_ROLES.join(', ')}` });
    }

    // Only one account per role per org
    const existing = await prisma.user.findFirst({
      where: { organizationId: req.organization.id, role },
    });
    if (existing) {
      return res.status(409).json({ message: `Un compte ${role} existe déjà pour cette organisation` });
    }

    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) return res.status(409).json({ message: 'Email déjà utilisé' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        organizationId: req.organization.id,
        name, email,
        password: hashed,
        role,
        isActive: true,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error('[staff/create]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Update staff (name, email, password, isActive) ───────────────────────────
const updateStaff = async (req, res) => {
  try {
    const { name, email, password, isActive } = req.body;
    const data = {};
    if (name)     data.name = name;
    if (email)    data.email = email;
    if (password) data.password = await bcrypt.hash(password, 10);
    if (isActive !== undefined) data.isActive = isActive;

    const result = await prisma.user.updateMany({
      where: { id: req.params.id, organizationId: req.organization.id, role: { in: ALLOWED_STAFF_ROLES } },
      data,
    });
    if (!result.count) return res.status(404).json({ message: 'Staff not found' });

    const updated = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Delete staff account ──────────────────────────────────────────────────────
const deleteStaff = async (req, res) => {
  try {
    const result = await prisma.user.deleteMany({
      where: { id: req.params.id, organizationId: req.organization.id, role: { in: ALLOWED_STAFF_ROLES } },
    });
    if (!result.count) return res.status(404).json({ message: 'Staff not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getStaff, createStaff, updateStaff, deleteStaff };
