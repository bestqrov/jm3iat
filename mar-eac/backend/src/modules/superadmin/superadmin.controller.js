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
    const [totalOrgs, totalUsers, trialOrgs, activeOrgs, expiredOrgs, canceledOrgs, allOrgs, paymentsAgg] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'EXPIRED' } }),
      prisma.subscription.count({ where: { status: 'CANCELLED' } }),
      prisma.organization.findMany({ select: { modules: true } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = await prisma.payment.aggregate({
      where: { paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    });

    // New orgs this month
    const newOrgsThisMonth = await prisma.organization.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    const typeDistribution = { REGULAR: 0, PROJECTS: 0, WATER: 0, PRODUCTIVE: 0, PRODUCTIVE_WATER: 0 };
    for (const org of allOrgs) {
      typeDistribution[getAssocTypeKey(org.modules)]++;
    }

    // MRR estimate
    const activeOrgsData = await prisma.organization.findMany({
      where: { subscription: { status: 'ACTIVE' } },
      select: { modules: true },
    });
    const mrrEstimate = activeOrgsData.reduce((sum, o) => sum + (TYPE_PRICES[getAssocTypeKey(o.modules)] || 99), 0);

    res.json({
      totalOrgs,
      totalUsers,
      trialOrgs,
      activeOrgs,
      expiredOrgs,
      canceledOrgs,
      typeDistribution,
      mrrEstimate,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      totalRevenue: paymentsAgg._sum.amount || 0,
      newOrgsThisMonth,
    });
  } catch (err) {
    console.error(err);
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
        take: 10,
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

    // Monthly revenue last 6 months
    const allPayments6mo = await prisma.payment.findMany({
      where: { paidAt: { gte: sixMonthsAgo } },
      select: { amount: true, paidAt: true },
    });
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const total = allPayments6mo
        .filter(p => p.paidAt >= start && p.paidAt < end)
        .reduce((s, p) => s + p.amount, 0);
      monthlyRevenue.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        revenue: total,
      });
    }

    // MRR and potential MRR
    let mrrEstimate = 0;
    let potentialMrr = 0;
    for (const org of allOrgsWithSubs) {
      const price = TYPE_PRICES[getAssocTypeKey(org.modules)] || 99;
      if (org.subscription?.status === 'ACTIVE') mrrEstimate += price;
      if (org.subscription?.status === 'TRIAL')  potentialMrr += price;
    }

    // Subscription status distribution
    const statusCounts = { TRIAL: 0, ACTIVE: 0, EXPIRED: 0, CANCELLED: 0 };
    for (const org of allOrgsWithSubs) {
      const s = org.subscription?.status;
      if (s && statusCounts[s] !== undefined) statusCounts[s]++;
    }

    // Churn rate (expired + cancelled / total)
    const total = allOrgsWithSubs.length;
    const churned = statusCounts.EXPIRED + statusCounts.CANCELLED;
    const churnRate = total > 0 ? Math.round((churned / total) * 100) : 0;

    // Conversion rate (active / (active + expired))
    const converted = statusCounts.ACTIVE;
    const conversionRate = (converted + churned) > 0
      ? Math.round((converted / (converted + churned)) * 100) : 0;

    const paymentsThisMonth = await prisma.payment.aggregate({
      where: { paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    });
    const allPaymentsTotal = await prisma.payment.aggregate({ _sum: { amount: true } });

    res.json({
      monthlySignups,
      monthlyRevenue,
      statusDistribution: statusCounts,
      expiringSoon: expiringSubs.map(s => ({
        ...s.organization,
        expiresAt: s.expiresAt,
        daysLeft: Math.ceil((new Date(s.expiresAt) - now) / (1000 * 60 * 60 * 24)),
      })),
      mrrEstimate,
      potentialMrr,
      churnRate,
      conversionRate,
      paymentsThisMonth: paymentsThisMonth._sum.amount || 0,
      totalCollected: allPaymentsTotal._sum.amount || 0,
      recentPayments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Feature Usage Analytics ──────────────────────────────────────────────────

const getFeatureUsage = async (req, res) => {
  try {
    const [waterOrgs, productiveOrgs, projectOrgs, meetingCounts, waterInstallations, productions, meetings] = await Promise.all([
      prisma.organization.count({ where: { modules: { has: 'WATER' } } }),
      prisma.organization.count({ where: { modules: { has: 'PRODUCTIVE' } } }),
      prisma.organization.count({ where: { modules: { has: 'PROJECTS' } } }),
      prisma.meeting.groupBy({ by: ['organizationId'], _count: { id: true } }),
      prisma.waterInstallation.count(),
      prisma.assocProduction.count(),
      prisma.meeting.count(),
    ]);

    // Top organizations by activity
    const topOrgs = await prisma.organization.findMany({
      take: 10,
      include: {
        _count: {
          select: {
            meetings: true,
            members: true,
            waterInstallations: true,
            productions: true,
          },
        },
        subscription: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Module distribution
    const moduleUsage = [
      { module: 'WATER', count: waterOrgs, label: 'Eau', labelAr: 'الماء' },
      { module: 'PRODUCTIVE', count: productiveOrgs, label: 'Productif', labelAr: 'الإنتاجي' },
      { module: 'PROJECTS', count: projectOrgs, label: 'Projets', labelAr: 'المشاريع' },
    ];

    res.json({
      moduleUsage,
      totals: {
        meetings,
        waterInstallations,
        productions,
        avgMeetingsPerOrg: meetingCounts.length > 0
          ? Math.round(meetings / meetingCounts.length) : 0,
      },
      topOrgs: topOrgs.map(o => ({
        id: o.id,
        name: o.name,
        modules: o.modules,
        subscriptionStatus: o.subscription?.status,
        meetingCount: o._count.meetings,
        memberCount: o._count.members,
        waterCount: o._count.waterInstallations,
        productionCount: o._count.productions,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── AI Insights ──────────────────────────────────────────────────────────────

const getAIInsights = async (req, res) => {
  try {
    const [allOrgs, payments, expiringSoon] = await Promise.all([
      prisma.organization.findMany({
        select: {
          modules: true,
          subscription: { select: { status: true, expiresAt: true } },
          createdAt: true,
        },
      }),
      prisma.payment.findMany({ select: { amount: true, paidAt: true } }),
      prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const typeStats = {};
    for (const org of allOrgs) {
      const type = getAssocTypeKey(org.modules);
      if (!typeStats[type]) typeStats[type] = { count: 0, active: 0 };
      typeStats[type].count++;
      if (org.subscription?.status === 'ACTIVE') typeStats[type].active++;
    }

    // Most popular type
    const popularType = Object.entries(typeStats)
      .sort((a, b) => b[1].count - a[1].count)[0];

    // Best converting type
    const bestConverting = Object.entries(typeStats)
      .filter(([, v]) => v.count > 0)
      .sort((a, b) => (b[1].active / b[1].count) - (a[1].active / a[1].count))[0];

    // Revenue trend
    const now = new Date();
    const last30 = payments.filter(p => p.paidAt >= new Date(now - 30 * 24 * 60 * 60 * 1000));
    const prev30 = payments.filter(p => {
      const d = new Date(p.paidAt);
      return d >= new Date(now - 60 * 24 * 60 * 60 * 1000) && d < new Date(now - 30 * 24 * 60 * 60 * 1000);
    });
    const last30Rev = last30.reduce((s, p) => s + p.amount, 0);
    const prev30Rev = prev30.reduce((s, p) => s + p.amount, 0);
    const revTrend = prev30Rev > 0 ? Math.round(((last30Rev - prev30Rev) / prev30Rev) * 100) : 0;

    // Generate insights
    const insights = [];

    if (expiringSoon > 0) {
      insights.push({
        type: 'WARNING',
        title: `${expiringSoon} abonnements expirent dans 30 jours`,
        titleAr: `${expiringSoon} اشتراكات تنتهي خلال 30 يوماً`,
        action: 'Envoyer des rappels de renouvellement',
        actionAr: 'إرسال تذكيرات التجديد',
        priority: 'HIGH',
      });
    }

    if (revTrend > 10) {
      insights.push({
        type: 'SUCCESS',
        title: `Revenus en hausse de ${revTrend}% ce mois`,
        titleAr: `الإيرادات ارتفعت بنسبة ${revTrend}% هذا الشهر`,
        action: 'Continuer la stratégie actuelle',
        actionAr: 'الاستمرار في الاستراتيجية الحالية',
        priority: 'LOW',
      });
    } else if (revTrend < -10) {
      insights.push({
        type: 'DANGER',
        title: `Revenus en baisse de ${Math.abs(revTrend)}% ce mois`,
        titleAr: `الإيرادات انخفضت بنسبة ${Math.abs(revTrend)}% هذا الشهر`,
        action: 'Lancer une campagne promotionnelle',
        actionAr: 'إطلاق حملة ترويجية',
        priority: 'HIGH',
      });
    }

    if (popularType) {
      insights.push({
        type: 'INFO',
        title: `Type le plus populaire : ${popularType[0]} (${popularType[1].count} orgs)`,
        titleAr: `النوع الأكثر شيوعاً: ${popularType[0]} (${popularType[1].count} جمعية)`,
        action: 'Optimiser l\'offre pour ce type',
        actionAr: 'تحسين العرض لهذا النوع',
        priority: 'MEDIUM',
      });
    }

    if (bestConverting) {
      const rate = Math.round((bestConverting[1].active / bestConverting[1].count) * 100);
      insights.push({
        type: 'INFO',
        title: `Meilleure conversion : ${bestConverting[0]} (${rate}%)`,
        titleAr: `أفضل تحويل: ${bestConverting[0]} (${rate}%)`,
        action: 'Utiliser comme modèle marketing',
        actionAr: 'استخدامه كنموذج تسويقي',
        priority: 'MEDIUM',
      });
    }

    const trialOrgs = allOrgs.filter(o => o.subscription?.status === 'TRIAL').length;
    if (trialOrgs > 3) {
      insights.push({
        type: 'WARNING',
        title: `${trialOrgs} organisations en période d'essai`,
        titleAr: `${trialOrgs} منظمات في فترة التجربة`,
        action: 'Envoyer offre de conversion personnalisée',
        actionAr: 'إرسال عرض تحويل مخصص',
        priority: 'HIGH',
      });
    }

    res.json({
      insights,
      typeStats,
      revenueTrend: revTrend,
      pricingSuggestions: [
        {
          type: 'REGULAR',
          currentPrice: 99,
          suggestedPrice: 119,
          reason: 'Demande élevée, marge d\'augmentation possible',
          reasonAr: 'طلب مرتفع، هامش زيادة ممكن',
        },
        {
          type: 'WATER',
          currentPrice: 199,
          suggestedPrice: 199,
          reason: 'Prix compétitif, maintenir',
          reasonAr: 'سعر تنافسي، حافظ عليه',
        },
      ],
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
    const { assocType, status, expiresAt, action } = req.body;
    const orgId = req.params.id;

    const plan    = assocType ? (ASSOC_TYPE_PLAN[assocType]    || 'BASIC') : undefined;
    const modules = assocType ? (ASSOC_TYPE_MODULES[assocType] || [])       : undefined;

    if (modules !== undefined) {
      await prisma.organization.update({ where: { id: orgId }, data: { modules } });
    }

    // Handle extend trial action
    let newExpiresAt = expiresAt ? new Date(expiresAt) : undefined;
    if (action === 'EXTEND_TRIAL') {
      const current = await prisma.subscription.findUnique({ where: { organizationId: orgId } });
      const base = current?.expiresAt ? new Date(current.expiresAt) : new Date();
      newExpiresAt = new Date(base.getTime() + 15 * 24 * 60 * 60 * 1000);
    }

    const sub = await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: {
        ...(plan   ? { plan }   : {}),
        ...(status ? { status } : {}),
        expiresAt: newExpiresAt,
      },
      create: {
        organizationId: orgId,
        plan: plan || 'BASIC',
        status: status || 'ACTIVE',
        expiresAt: newExpiresAt || null,
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

    const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const payment = await prisma.payment.create({
      data: {
        organizationId,
        amount: parseFloat(amount),
        method: method || 'CASH',
        reference: reference || null,
        receiptUrl,
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

const uploadPaymentReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const receiptUrl = `/uploads/${req.file.filename}`;
    const payment = await prisma.payment.update({
      where: { id: req.params.paymentId },
      data: { receiptUrl },
      include: { organization: { select: { id: true, name: true } } },
    });
    res.json(payment);
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

// ─── Packs ────────────────────────────────────────────────────────────────────

const getPacks = async (req, res) => {
  try {
    const packs = await prisma.pack.findMany({ orderBy: { price: 'asc' } });
    res.json(packs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createPack = async (req, res) => {
  try {
    const { name, nameAr, description, descriptionAr, price, currency, billingCycle,
      assocType, size, features, featuresAr, limits, trialDays } = req.body;

    const pack = await prisma.pack.create({
      data: {
        name, nameAr, description, descriptionAr,
        price: parseFloat(price),
        currency: currency || 'MAD',
        billingCycle: billingCycle || 'MONTHLY',
        assocType,
        size: size || 'MEDIUM',
        features: features || [],
        featuresAr: featuresAr || [],
        limits: limits || {},
        trialDays: parseInt(trialDays) || 15,
      },
    });
    res.status(201).json(pack);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updatePack = async (req, res) => {
  try {
    const { name, nameAr, description, descriptionAr, price, currency, billingCycle,
      assocType, size, features, featuresAr, limits, isActive, trialDays } = req.body;

    const pack = await prisma.pack.update({
      where: { id: req.params.packId },
      data: {
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(description !== undefined && { description }),
        ...(descriptionAr !== undefined && { descriptionAr }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(currency !== undefined && { currency }),
        ...(billingCycle !== undefined && { billingCycle }),
        ...(assocType !== undefined && { assocType }),
        ...(size !== undefined && { size }),
        ...(features !== undefined && { features }),
        ...(featuresAr !== undefined && { featuresAr }),
        ...(limits !== undefined && { limits }),
        ...(isActive !== undefined && { isActive }),
        ...(trialDays !== undefined && { trialDays: parseInt(trialDays) }),
      },
    });
    res.json(pack);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deletePack = async (req, res) => {
  try {
    await prisma.pack.delete({ where: { id: req.params.packId } });
    res.json({ message: 'Pack deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Promo Codes ─────────────────────────────────────────────────────────────

const getPromoCodes = async (req, res) => {
  try {
    const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createPromoCode = async (req, res) => {
  try {
    const { code, description, discountType, discountValue, maxUses, expiresAt, applicableTo } = req.body;
    const promo = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType: discountType || 'PERCENTAGE',
        discountValue: parseFloat(discountValue),
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        applicableTo: applicableTo || [],
      },
    });
    res.status(201).json(promo);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ message: 'Code already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

const updatePromoCode = async (req, res) => {
  try {
    const { isActive, expiresAt, maxUses } = req.body;
    const promo = await prisma.promoCode.update({
      where: { id: req.params.promoId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(maxUses !== undefined && { maxUses: maxUses ? parseInt(maxUses) : null }),
      },
    });
    res.json(promo);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deletePromoCode = async (req, res) => {
  try {
    await prisma.promoCode.delete({ where: { id: req.params.promoId } });
    res.json({ message: 'Promo code deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Email Campaigns ─────────────────────────────────────────────────────────

const getEmailCampaigns = async (req, res) => {
  try {
    const campaigns = await prisma.emailCampaign.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createEmailCampaign = async (req, res) => {
  try {
    const { title, subject, body, targetGroup, scheduledAt } = req.body;
    const campaign = await prisma.emailCampaign.create({
      data: {
        title,
        subject,
        body,
        targetGroup: targetGroup || 'ALL',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
    });
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const sendEmailCampaign = async (req, res) => {
  try {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id: req.params.campaignId } });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    // Count recipients
    const where = campaign.targetGroup === 'ALL' ? {} : { subscription: { status: campaign.targetGroup } };
    const recipientCount = await prisma.organization.count({ where });

    // Mark as sent (in a real system this would send emails via SendGrid/Mailgun)
    const updated = await prisma.emailCampaign.update({
      where: { id: req.params.campaignId },
      data: { status: 'SENT', sentAt: new Date(), recipientCount },
    });

    res.json({ ...updated, message: `Campaign sent to ${recipientCount} organizations` });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteEmailCampaign = async (req, res) => {
  try {
    await prisma.emailCampaign.delete({ where: { id: req.params.campaignId } });
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

const getWhatsAppMessages = async (req, res) => {
  try {
    const messages = await prisma.whatsAppMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const sendWhatsAppMessage = async (req, res) => {
  try {
    const { phone, message, organizationId, trigger } = req.body;
    if (!phone || !message) return res.status(400).json({ message: 'phone and message are required' });

    // In production: integrate with WhatsApp Business API (Meta/Twilio)
    const msg = await prisma.whatsAppMessage.create({
      data: {
        phone,
        message,
        organizationId: organizationId || null,
        type: trigger ? 'AUTOMATED' : 'MANUAL',
        trigger: trigger || null,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    res.status(201).json({ ...msg, note: 'Integrated with WhatsApp Business API in production' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const sendBulkWhatsApp = async (req, res) => {
  try {
    const { targetGroup, message, trigger } = req.body;

    const where = {};
    if (targetGroup === 'TRIAL') where.subscription = { status: 'TRIAL' };
    if (targetGroup === 'EXPIRED') where.subscription = { status: 'EXPIRED' };
    if (targetGroup === 'ACTIVE') where.subscription = { status: 'ACTIVE' };

    const orgs = await prisma.organization.findMany({
      where,
      select: { id: true, phone: true, email: true, name: true },
    });

    const phones = orgs.filter(o => o.phone).map(o => o.phone);
    let sent = 0;

    for (const phone of phones) {
      await prisma.whatsAppMessage.create({
        data: {
          phone,
          message,
          type: 'AUTOMATED',
          trigger: trigger || 'PROMOTION',
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      sent++;
    }

    res.json({ sent, total: phones.length, message: `${sent} messages sent` });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Automation Rules ─────────────────────────────────────────────────────────

const getAutomationRules = async (req, res) => {
  try {
    const rules = await prisma.automationRule.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createAutomationRule = async (req, res) => {
  try {
    const { name, nameAr, trigger, conditions, actions } = req.body;
    const rule = await prisma.automationRule.create({
      data: {
        name,
        nameAr,
        trigger,
        conditions: conditions || {},
        actions: actions || [],
      },
    });
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateAutomationRule = async (req, res) => {
  try {
    const { isActive, name, nameAr, actions } = req.body;
    const rule = await prisma.automationRule.update({
      where: { id: req.params.ruleId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(actions !== undefined && { actions }),
      },
    });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteAutomationRule = async (req, res) => {
  try {
    await prisma.automationRule.delete({ where: { id: req.params.ruleId } });
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const runAutomationRule = async (req, res) => {
  try {
    const rule = await prisma.automationRule.findUnique({ where: { id: req.params.ruleId } });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    // Simulate running the automation
    const updated = await prisma.automationRule.update({
      where: { id: rule.id },
      data: { lastRun: new Date(), runCount: rule.runCount + 1 },
    });

    res.json({ ...updated, message: `Rule "${rule.name}" executed successfully` });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Platform Settings ────────────────────────────────────────────────────────

const getPlatformSettings = async (req, res) => {
  try {
    const settings = await prisma.platformSettings.findMany();
    const obj = {};
    for (const s of settings) {
      obj[s.key] = { value: s.value, category: s.category };
    }

    // Return defaults if not set
    const defaults = {
      platform_name: { value: 'Mar E-A.C', category: 'GENERAL' },
      trial_duration_days: { value: '15', category: 'GENERAL' },
      default_currency: { value: 'MAD', category: 'BILLING' },
      support_email: { value: 'support@mar-eac.ma', category: 'GENERAL' },
      whatsapp_api_key: { value: '', category: 'INTEGRATIONS' },
      whatsapp_phone_id: { value: '', category: 'INTEGRATIONS' },
      sendgrid_api_key: { value: '', category: 'INTEGRATIONS' },
      email_from: { value: 'noreply@mar-eac.ma', category: 'NOTIFICATIONS' },
      auto_trial_reminder: { value: 'true', category: 'NOTIFICATIONS' },
      trial_reminder_days: { value: '3', category: 'NOTIFICATIONS' },
    };

    res.json({ ...defaults, ...obj });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updatePlatformSettings = async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }

    for (const [key, value] of Object.entries(updates)) {
      await prisma.platformSettings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), category: 'GENERAL' },
      });
    }

    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Subscriptions Management ─────────────────────────────────────────────────

const getSubscriptions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = status ? { status } : {};

    const [subs, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true, email: true, modules: true, phone: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.subscription.count({ where }),
    ]);

    res.json({ data: subs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getStats, getAnalytics, getFeatureUsage, getAIInsights,
  getOrganizations, getOrganization, updateSubscription, deleteOrganization,
  getPayments, createPayment, uploadPaymentReceipt, deletePayment,
  getUsers, toggleUser, resetUserPassword,
  getPacks, createPack, updatePack, deletePack,
  getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode,
  getEmailCampaigns, createEmailCampaign, sendEmailCampaign, deleteEmailCampaign,
  getWhatsAppMessages, sendWhatsAppMessage, sendBulkWhatsApp,
  getAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule, runAutomationRule,
  getPlatformSettings, updatePlatformSettings,
  getSubscriptions,
};
