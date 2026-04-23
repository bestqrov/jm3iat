const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const prisma = require('../../config/database');
const { generateToken } = require('../../config/jwt');

const register = async (req, res) => {
  try {
    const {
      orgName, orgEmail, orgPhone, orgCity, orgRegion,
      adminName, adminEmail, password, modules,
    } = req.body;

    if (!orgName || !orgEmail || !adminName || !adminEmail || !password) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    // Check if org email already used
    const existingOrg = await prisma.organization.findUnique({ where: { email: orgEmail } });
    if (existingOrg) return res.status(409).json({ message: 'Organization email already registered' });

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) return res.status(409).json({ message: 'Admin email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 60);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: orgName,
          email: orgEmail,
          phone: orgPhone,
          city: orgCity,
          region: orgRegion,
          trialEndsAt,
          modules: Array.isArray(modules) ? modules : [],
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          organizationId: org.id,
          plan: 'PREMIUM', // full access during trial
          status: 'TRIAL',
          expiresAt: trialEndsAt,
        },
      });

      return { org, user, subscription };
    });

    const token = generateToken({ id: result.user.id, role: result.user.role });

    res.status(201).json({
      message: 'Organization registered successfully',
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
        trialEndsAt: result.org.trialEndsAt,
      },
      subscription: result.subscription,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          include: { subscription: true },
        },
      },
    });

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account disabled' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken({ id: user.id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      organization: user.organization,
      subscription: user.organization?.subscription,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const getMe = async (req, res) => {
  try {
    // Auto-expire trial if past due
    if (req.user.organizationId) {
      await prisma.subscription.updateMany({
        where: { organizationId: req.user.organizationId, status: 'TRIAL', expiresAt: { lt: new Date() } },
        data:  { status: 'EXPIRED' },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
        organization: {
          include: { subscription: true },
        },
      },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const updateData = {};

    if (name) updateData.name = name;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password required' });
      }
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ message: 'Current password incorrect' });
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const {
      name, email, phone, address, city, region, description, foundingDate, activities, adminHistory,
      nameAr, cityAr, regionAr, addressAr, descriptionAr, activitiesAr, adminHistoryAr,
      bankName, bankAccount, bankRib,
      whatsapp, facebook, instagram, tiktok, youtube,
    } = req.body;
    const orgId = req.user.organizationId;

    if (email) {
      const conflict = await prisma.organization.findFirst({ where: { email, id: { not: orgId } } });
      if (conflict) return res.status(409).json({ message: 'Email already used by another organization' });
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        name, phone, address, city, region, description, activities, adminHistory,
        nameAr, cityAr, regionAr, addressAr, descriptionAr, activitiesAr, adminHistoryAr,
        bankName, bankAccount, bankRib,
        whatsapp, facebook, instagram, tiktok, youtube,
        ...(email ? { email } : {}),
        foundingDate: foundingDate ? new Date(foundingDate) : undefined,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const orgId = req.user.organizationId;
    const uploadDir = process.env.UPLOAD_DIR || path.resolve('./uploads');

    // Delete old logo file if it exists
    const current = await prisma.organization.findUnique({ where: { id: orgId }, select: { logo: true } });
    if (current?.logo) {
      const oldPath = path.join(uploadDir, path.basename(current.logo));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const logoUrl = `/uploads/${req.file.filename}`;
    const updated = await prisma.organization.update({ where: { id: orgId }, data: { logo: logoUrl } });
    res.json({ logo: updated.logo });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const upgradeSubscription = async (req, res) => {
  try {
    const { plan } = req.body;
    const VALID_PLANS = ['BASIC', 'STANDARD', 'PREMIUM'];
    if (!VALID_PLANS.includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan' });
    }
    const orgId = req.user.organizationId;

    // Modules allowed per plan level — strip any that exceed the new plan
    const PLAN_ALLOWED_MODULES: Record<string, string[]> = {
      BASIC:    [],
      STANDARD: ['PROJECTS', 'TRANSPORT', 'PRODUCTIVE'],
      PREMIUM:  ['PROJECTS', 'TRANSPORT', 'PRODUCTIVE', 'WATER'],
    };
    const allowed = PLAN_ALLOWED_MODULES[plan];
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { modules: true } });
    const newModules = (org?.modules ?? []).filter((m: string) => allowed.includes(m));
    await prisma.organization.update({ where: { id: orgId }, data: { modules: newModules } });

    // Set expiry 1 year from now for paid activations
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const sub = await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: { plan, status: 'ACTIVE', expiresAt },
      create: { organizationId: orgId, plan, status: 'ACTIVE', expiresAt },
    });

    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email requis' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Aucun compte associé à cet email' });
    if (!user.isActive) return res.status(403).json({ message: 'Compte désactivé' });

    // Generate 8-char temp password
    const tempPassword = Math.random().toString(36).slice(-4).toUpperCase() +
      Math.random().toString(36).slice(-4).toUpperCase();
    const hashed = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    res.json({ tempPassword, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, getMe, updateProfile, updateOrganization, uploadLogo, upgradeSubscription, forgotPassword };
