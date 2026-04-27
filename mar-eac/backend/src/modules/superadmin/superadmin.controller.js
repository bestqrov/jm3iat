const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const axios  = require('axios');

// ─── Evolution API (WhatsApp) helper ─────────────────────────────────────────

const EVO_URL      = process.env.EVOLUTION_API_URL      || '';
const EVO_KEY      = process.env.EVOLUTION_API_KEY      || '';
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE     || 'main';

// Normalize phone: strip spaces/dashes/+, Evolution expects "212XXXXXXXXX"
const normalizePhone = (phone) =>
  phone.replace(/[\s\-\+]/g, '');

/**
 * Send a text message via Evolution API.
 * Docs: POST {EVO_URL}/message/sendText/{instance}
 * Headers: { apikey: EVO_KEY }
 * Body:   { number, textMessage: { text } }
 */
const callEvolutionAPI = async (toPhone, messageText) => {
  if (!EVO_URL || !EVO_KEY) {
    throw new Error('Evolution API not configured (EVOLUTION_API_URL / EVOLUTION_API_KEY missing)');
  }
  const url = `${EVO_URL}/message/sendText/${EVO_INSTANCE}`;
  const resp = await axios.post(
    url,
    {
      number: normalizePhone(toPhone),
      textMessage: { text: messageText },
    },
    {
      headers: {
        apikey: EVO_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );
  return resp.data;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAssocTypeKey = (modules) => {
  const m = Array.isArray(modules) ? modules : [];
  const hasProd      = m.includes('PRODUCTIVE');
  const hasWater     = m.includes('WATER');
  const hasProj      = m.includes('PROJECTS');
  const hasTransport = m.includes('TRANSPORT');
  if (hasProd && hasWater) return 'PRODUCTIVE_WATER';
  if (hasProd)      return 'PRODUCTIVE';
  if (hasWater)     return 'WATER';
  if (hasProj)      return 'PROJECTS';
  if (hasTransport) return 'TRANSPORT';
  return 'REGULAR';
};

const ASSOC_TYPE_PLAN = {
  REGULAR:          'BASIC',
  PROJECTS:         'STANDARD',
  WATER:            'PREMIUM',
  PRODUCTIVE:       'PREMIUM',
  PRODUCTIVE_WATER: 'PREMIUM',
  TRANSPORT:        'STANDARD',
};

const ASSOC_TYPE_MODULES = {
  REGULAR:          [],
  PROJECTS:         ['PROJECTS'],
  WATER:            ['WATER'],
  PRODUCTIVE:       ['PRODUCTIVE'],
  PRODUCTIVE_WATER: ['PRODUCTIVE', 'WATER'],
  TRANSPORT:        ['TRANSPORT'],
};

const TYPE_PRICES = {
  REGULAR:          99,
  PROJECTS:         149,
  WATER:            199,
  PRODUCTIVE:       199,
  PRODUCTIVE_WATER: 299,
  TRANSPORT:        179,
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
    const [waterOrgs, productiveOrgs, projectOrgs, transportOrgs, meetingCounts, waterInstallations, productions, meetings] = await Promise.all([
      prisma.organization.count({ where: { modules: { has: 'WATER' } } }),
      prisma.organization.count({ where: { modules: { has: 'PRODUCTIVE' } } }),
      prisma.organization.count({ where: { modules: { has: 'PROJECTS' } } }),
      prisma.organization.count({ where: { modules: { has: 'TRANSPORT' } } }),
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
      { module: 'WATER',      count: waterOrgs,      label: 'Eau',       labelAr: 'الماء' },
      { module: 'PRODUCTIVE', count: productiveOrgs, label: 'Productif', labelAr: 'الإنتاجي' },
      { module: 'PROJECTS',   count: projectOrgs,    label: 'Projets',   labelAr: 'المشاريع' },
      { module: 'TRANSPORT',  count: transportOrgs,  label: 'Transport', labelAr: 'النقل المدرسي' },
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
    const id = req.params.id;
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    // Collect intermediate IDs needed for nested deletes
    const [meetings, projects, installations, products, sales, students] = await Promise.all([
      prisma.meeting.findMany({ where: { organizationId: id }, select: { id: true } }),
      prisma.project.findMany({ where: { organizationId: id }, select: { id: true } }),
      prisma.waterInstallation.findMany({ where: { organizationId: id }, select: { id: true } }),
      prisma.assocProduct.findMany({ where: { organizationId: id }, select: { id: true } }),
      prisma.assocSale.findMany({ where: { organizationId: id }, select: { id: true } }),
      prisma.transportStudent.findMany({ where: { organizationId: id }, select: { id: true } }),
    ]);

    const meetingIds       = meetings.map(m => m.id);
    const projectIds       = projects.map(p => p.id);
    const installationIds  = installations.map(i => i.id);
    const productIds       = products.map(p => p.id);
    const saleIds          = sales.map(s => s.id);
    const studentIds       = students.map(s => s.id);

    // Collect funding IDs for FundingEntry deletion
    const fundings = projectIds.length
      ? await prisma.funding.findMany({ where: { projectId: { in: projectIds } }, select: { id: true } })
      : [];
    const fundingIds = fundings.map(f => f.id);

    // Collect invoice IDs for WaterPayment deletion
    const invoices = installationIds.length
      ? await prisma.waterInvoice.findMany({ where: { installationId: { in: installationIds } }, select: { id: true } })
      : [];
    const invoiceIds = invoices.map(i => i.id);

    // Collect voting session IDs for Vote deletion
    const sessions = meetingIds.length
      ? await prisma.votingSession.findMany({ where: { meetingId: { in: meetingIds } }, select: { id: true } })
      : [];
    const sessionIds = sessions.map(s => s.id);

    // Delete deepest dependents first
    await Promise.all([
      sessionIds.length    && prisma.vote.deleteMany({ where: { votingSessionId: { in: sessionIds } } }),
      invoiceIds.length    && prisma.waterPayment.deleteMany({ where: { invoiceId: { in: invoiceIds } } }),
      fundingIds.length    && prisma.fundingEntry.deleteMany({ where: { fundingId: { in: fundingIds } } }),
      saleIds.length       && prisma.assocSaleItem.deleteMany({ where: { saleId: { in: saleIds } } }),
    ]);

    await Promise.all([
      meetingIds.length      && prisma.votingSession.deleteMany({ where: { meetingId: { in: meetingIds } } }),
      meetingIds.length      && prisma.meetingAttendance.deleteMany({ where: { meetingId: { in: meetingIds } } }),
      meetingIds.length      && prisma.decision.deleteMany({ where: { meetingId: { in: meetingIds } } }),
      installationIds.length && prisma.waterInvoice.deleteMany({ where: { installationId: { in: installationIds } } }),
      installationIds.length && prisma.meterReading.deleteMany({ where: { installationId: { in: installationIds } } }),
      projectIds.length      && prisma.funding.deleteMany({ where: { projectId: { in: projectIds } } }),
      projectIds.length      && prisma.projectMilestone.deleteMany({ where: { projectId: { in: projectIds } } }),
      productIds.length      && prisma.assocProduction.deleteMany({ where: { productId: { in: productIds } } }),
      studentIds.length      && prisma.transportSubscription.deleteMany({ where: { studentId: { in: studentIds } } }),
      studentIds.length      && prisma.transportPayment.deleteMany({ where: { studentId: { in: studentIds } } }),
      studentIds.length      && prisma.transportAttendance.deleteMany({ where: { studentId: { in: studentIds } } }),
    ]);

    // Delete direct org children
    await Promise.all([
      prisma.meeting.deleteMany({ where: { organizationId: id } }),
      prisma.document.deleteMany({ where: { organizationId: id } }),
      prisma.request.deleteMany({ where: { organizationId: id } }),
      prisma.project.deleteMany({ where: { organizationId: id } }),
      prisma.waterRepair.deleteMany({ where: { organizationId: id } }),
      prisma.waterInstallation.deleteMany({ where: { organizationId: id } }),
      prisma.waterTariff.deleteMany({ where: { organizationId: id } }),
      prisma.assocSale.deleteMany({ where: { organizationId: id } }),
      prisma.assocProduct.deleteMany({ where: { organizationId: id } }),
      prisma.assocClient.deleteMany({ where: { organizationId: id } }),
      prisma.assocProduction.deleteMany({ where: { organizationId: id } }),
      prisma.assocEvent.deleteMany({ where: { organizationId: id } }),
      prisma.transportStudent.deleteMany({ where: { organizationId: id } }),
      prisma.transportRoute.deleteMany({ where: { organizationId: id } }),
      prisma.transportVehicle.deleteMany({ where: { organizationId: id } }),
      prisma.transportDriver.deleteMany({ where: { organizationId: id } }),
      prisma.transportExpense.deleteMany({ where: { organizationId: id } }),
      prisma.transaction.deleteMany({ where: { organizationId: id } }),
      prisma.member.deleteMany({ where: { organizationId: id } }),
      prisma.reminder.deleteMany({ where: { organizationId: id } }),
      prisma.notification.deleteMany({ where: { organizationId: id } }),
      prisma.activityLog.deleteMany({ where: { organizationId: id } }),
      prisma.recurringPayment.deleteMany({ where: { organizationId: id } }),
      prisma.backupRecord.deleteMany({ where: { organizationId: id } }),
      prisma.payment.deleteMany({ where: { organizationId: id } }),
      prisma.subscription.deleteMany({ where: { organizationId: id } }),
      prisma.user.updateMany({ where: { organizationId: id }, data: { organizationId: null } }),
    ]);

    await prisma.organization.delete({ where: { id } });
    res.json({ message: 'Organization and all related data deleted' });
  } catch (err) {
    console.error('deleteOrganization error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
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

const DEFAULT_PACKS = [
  {
    name: 'Starter — Association classique', nameAr: 'ستارتر — جمعية عادية',
    description: 'Idéal pour les petites associations avec des besoins basiques.',
    descriptionAr: 'مثالي للجمعيات الصغيرة ذات الاحتياجات الأساسية.',
    price: 99,  currency: 'MAD', billingCycle: 'MONTHLY', assocType: 'REGULAR', size: 'SMALL',
    features:   ['Gestion des membres (50 max)', 'Réunions illimitées', 'Documents (1 Go)', 'Rappels automatiques', 'Support email'],
    featuresAr: ['إدارة الأعضاء (50 كحد أقصى)', 'اجتماعات غير محدودة', 'مستندات (1 جيجا)', 'تذكيرات تلقائية', 'دعم بريدي'],
    limits: { members: 50, storage: 1 }, trialDays: 60, isActive: true,
  },
  {
    name: 'Pro — Association classique', nameAr: 'برو — جمعية عادية',
    description: 'Pour les associations en croissance avec plus de membres.',
    descriptionAr: 'للجمعيات المتنامية التي تضم عدداً أكبر من الأعضاء.',
    price: 199, currency: 'MAD', billingCycle: 'MONTHLY', assocType: 'REGULAR', size: 'MEDIUM',
    features:   ['Membres illimités', 'Réunions illimitées', 'Documents (5 Go)', 'Rapports avancés', 'Rappels WhatsApp', 'Support prioritaire'],
    featuresAr: ['أعضاء غير محدودين', 'اجتماعات غير محدودة', 'مستندات (5 جيجا)', 'تقارير متقدمة', 'تذكيرات واتساب', 'دعم ذو أولوية'],
    limits: { members: -1, storage: 5 }, trialDays: 60, isActive: true,
  },
  {
    name: 'Starter — Gestion de l\'eau', nameAr: 'ستارتر — جمعية الماء',
    description: 'Pour les associations gérant un réseau d\'eau potable.',
    descriptionAr: 'لجمعيات إدارة شبكة مياه الشرب.',
    price: 249, currency: 'MAD', billingCycle: 'MONTHLY', assocType: 'WATER', size: 'SMALL',
    features:   ['Suivi des compteurs', 'Facturation eau', 'Gestion des installations', 'Rapports de consommation', 'Membres (100 max)'],
    featuresAr: ['متابعة العدادات', 'فواتير الماء', 'إدارة المنشآت', 'تقارير الاستهلاك', 'أعضاء (100 كحد أقصى)'],
    limits: { members: 100, storage: 2 }, trialDays: 60, isActive: true,
  },
  {
    name: 'Pro — Gestion de l\'eau', nameAr: 'برو — جمعية الماء',
    description: 'Solution complète pour les associations d\'eau de grande taille.',
    descriptionAr: 'حل متكامل لجمعيات الماء الكبيرة.',
    price: 399, currency: 'MAD', billingCycle: 'MONTHLY', assocType: 'WATER', size: 'LARGE',
    features:   ['Membres illimités', 'Suivi compteurs avancé', 'Facturation automatique', 'Alertes de fuite', 'API d\'intégration', 'Support dédié'],
    featuresAr: ['أعضاء غير محدودين', 'متابعة عدادات متقدمة', 'فوترة تلقائية', 'تنبيهات التسرب', 'API للتكامل', 'دعم مخصص'],
    limits: { members: -1, storage: 20 }, trialDays: 60, isActive: true,
  },
  {
    name: 'Starter — Association productive', nameAr: 'ستارتر — جمعية إنتاجية',
    description: 'Pour les coopératives et associations à activité productive.',
    descriptionAr: 'للتعاونيات والجمعيات ذات النشاط الإنتاجي.',
    price: 249, currency: 'MAD', billingCycle: 'MONTHLY', assocType: 'PRODUCTIVE', size: 'SMALL',
    features:   ['Gestion des productions', 'Suivi des stocks', 'Projets illimités', 'Rapports financiers', 'Membres (80 max)'],
    featuresAr: ['إدارة الإنتاج', 'متابعة المخزون', 'مشاريع غير محدودة', 'تقارير مالية', 'أعضاء (80 كحد أقصى)'],
    limits: { members: 80, storage: 3 }, trialDays: 60, isActive: true,
  },
  {
    name: 'Pro — Association productive', nameAr: 'برو — جمعية إنتاجية',
    description: 'Toutes les fonctionnalités productives sans limites.',
    descriptionAr: 'جميع مزايا الإنتاج بدون قيود.',
    price: 449, currency: 'MAD', billingCycle: 'MONTHLY', assocType: 'PRODUCTIVE', size: 'LARGE',
    features:   ['Membres illimités', 'Productions illimitées', 'Gestion des ventes', 'Intégration comptable', 'Rapports BI', 'Support dédié'],
    featuresAr: ['أعضاء غير محدودين', 'إنتاج غير محدود', 'إدارة المبيعات', 'تكامل محاسبي', 'تقارير BI', 'دعم مخصص'],
    limits: { members: -1, storage: 20 }, trialDays: 60, isActive: true,
  },
  {
    name: 'Pro — Productive + Eau', nameAr: 'برو — إنتاجية + ماء',
    description: 'La solution tout-en-un pour les associations mixtes.',
    descriptionAr: 'الحل الشامل للجمعيات المختلطة.',
    price: 599, currency: 'MAD', billingCycle: 'MONTHLY', assocType: 'PRODUCTIVE_WATER', size: 'LARGE',
    features:   ['Toutes les fonctionnalités Eau', 'Toutes les fonctionnalités Productives', 'Membres illimités', 'Tableau de bord unifié', 'Support dédié 24/7'],
    featuresAr: ['جميع مزايا الماء', 'جميع مزايا الإنتاج', 'أعضاء غير محدودين', 'لوحة تحكم موحدة', 'دعم مخصص 24/7'],
    limits: { members: -1, storage: 50 }, trialDays: 60, isActive: true,
  },
  {
    name: 'Starter — Association avec projets', nameAr: 'ستارتر — جمعية مع مشاريع',
    description: 'Pour les associations gérant des projets de développement.',
    descriptionAr: 'لجمعيات إدارة مشاريع التنمية.',
    price: 149, currency: 'MAD', billingCycle: 'MONTHLY', assocType: 'PROJECTS', size: 'SMALL',
    features:   ['Gestion de projets', 'Suivi des tâches', 'Rapports d\'avancement', 'Documents projets', 'Membres (60 max)'],
    featuresAr: ['إدارة المشاريع', 'متابعة المهام', 'تقارير التقدم', 'مستندات المشاريع', 'أعضاء (60 كحد أقصى)'],
    limits: { members: 60, storage: 2 }, trialDays: 60, isActive: true,
  },
];

const seedDefaultPacks = async (req, res) => {
  try {
    const existing = await prisma.pack.count();
    if (existing > 0) {
      return res.status(409).json({ message: `${existing} pack(s) already exist. Delete them first to reseed.` });
    }
    const created = [];
    for (const pack of DEFAULT_PACKS) {
      created.push(await prisma.pack.create({ data: pack }));
    }
    res.status(201).json({ message: `${created.length} default packs created`, packs: created });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

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
        trialDays: parseInt(trialDays) || 60,
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

    let status = 'FAILED';
    let waError = null;

    try {
      await callEvolutionAPI(phone, message);
      status = 'SENT';
    } catch (apiErr) {
      waError = apiErr?.response?.data || apiErr.message;
      status = 'FAILED';
    }

    const msg = await prisma.whatsAppMessage.create({
      data: {
        phone,
        message,
        organizationId: organizationId || null,
        type: trigger ? 'AUTOMATED' : 'MANUAL',
        trigger: trigger || null,
        status,
        sentAt: status === 'SENT' ? new Date() : null,
      },
    });

    if (status === 'FAILED') {
      return res.status(502).json({ message: 'WhatsApp delivery failed', error: waError, record: msg });
    }

    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const sendBulkWhatsApp = async (req, res) => {
  try {
    const { targetGroup, message, trigger } = req.body;

    const where = {};
    if (targetGroup === 'TRIAL')   where.subscription = { status: 'TRIAL' };
    if (targetGroup === 'EXPIRED') where.subscription = { status: 'EXPIRED' };
    if (targetGroup === 'ACTIVE')  where.subscription = { status: 'ACTIVE' };

    const orgs = await prisma.organization.findMany({
      where,
      select: { id: true, phone: true, name: true },
    });

    const targets = orgs.filter(o => o.phone);

    let sent = 0;
    let failed = 0;

    for (const org of targets) {
      let status = 'FAILED';
      try {
        await callEvolutionAPI(org.phone, message);
        status = 'SENT';
        sent++;
      } catch {
        failed++;
      }

      await prisma.whatsAppMessage.create({
        data: {
          phone: org.phone,
          message,
          organizationId: org.id,
          type: 'AUTOMATED',
          trigger: trigger || 'PROMOTION',
          status,
          sentAt: status === 'SENT' ? new Date() : null,
        },
      });
    }

    res.json({ sent, failed, total: targets.length, message: `${sent}/${targets.length} messages sent` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
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

// ─── Automation: resolve target organizations per trigger ─────────────────────

const resolveAutomationTargets = async (trigger) => {
  const now = new Date();

  const baseInclude = {
    subscription: true,
    users: { where: { role: 'ADMIN' }, take: 1, select: { email: true, name: true } },
  };

  switch (trigger) {
    case 'TRIAL_EXPIRED': {
      return prisma.organization.findMany({
        where: {
          OR: [
            { subscription: { status: 'TRIAL', expiresAt: { lt: now } } },
            { trialEndsAt: { lt: now }, subscription: null },
          ],
        },
        include: baseInclude,
      });
    }
    case 'PAYMENT_OVERDUE': {
      return prisma.organization.findMany({
        where: { subscription: { status: 'EXPIRED' } },
        include: baseInclude,
      });
    }
    case 'INACTIVE_30D': {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return prisma.organization.findMany({
        where: { updatedAt: { lt: cutoff } },
        include: baseInclude,
      });
    }
    case 'INACTIVE_60D': {
      const cutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      return prisma.organization.findMany({
        where: { updatedAt: { lt: cutoff } },
        include: baseInclude,
      });
    }
    case 'SUBSCRIPTION_EXPIRING': {
      const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return prisma.organization.findMany({
        where: {
          subscription: {
            status: { in: ['ACTIVE', 'TRIAL'] },
            expiresAt: { gt: now, lt: in7days },
          },
        },
        include: baseInclude,
      });
    }
    default:
      return [];
  }
};

// ─── Automation: execute actions for one organization ─────────────────────────

const executeActionsForOrg = async (actions, org) => {
  const results = [];
  const phone   = org.phone ? normalizePhone(org.phone) : null;
  const adminEmail = org.users?.[0]?.email || org.email;

  for (const action of actions) {
    const type = typeof action === 'string' ? action : action.type;

    try {
      switch (type) {
        case 'WHATSAPP': {
          if (!phone) {
            results.push({ type, orgId: org.id, status: 'SKIPPED', reason: 'no phone' });
            break;
          }
          if (!EVO_URL || !EVO_KEY) {
            results.push({ type, orgId: org.id, status: 'SKIPPED', reason: 'Evolution API not configured' });
            break;
          }
          const msgBody = buildAutoMessage(action.template || 'default', org, 'fr');
          await callEvolutionAPI(phone, msgBody);
          results.push({ type, orgId: org.id, status: 'SENT' });
          break;
        }

        case 'EMAIL': {
          // Create an in-app reminder as email notification substitute
          await prisma.reminder.create({
            data: {
              organizationId: org.id,
              type: 'CUSTOM',
              title: `[Automation] Action requise — ${org.name}`,
              message: `Un rappel automatique a été déclenché pour l'organisation ${org.name} (${adminEmail}).`,
              scheduledFor: new Date(),
            },
          });
          results.push({ type, orgId: org.id, status: 'REMINDER_CREATED' });
          break;
        }

        case 'SUSPEND': {
          if (org.subscription) {
            await prisma.subscription.update({
              where: { organizationId: org.id },
              data: { status: 'SUSPENDED' },
            });
          }
          results.push({ type, orgId: org.id, status: 'SUSPENDED' });
          break;
        }

        case 'NOTIFY_ADMIN': {
          // Log to console — visible in Railway/server logs
          console.log(`[Automation NOTIFY_ADMIN] Org: ${org.name} | Email: ${adminEmail} | Trigger hit`);
          results.push({ type, orgId: org.id, status: 'LOGGED' });
          break;
        }

        default:
          results.push({ type, orgId: org.id, status: 'UNKNOWN_ACTION' });
      }
    } catch (err) {
      results.push({ type, orgId: org.id, status: 'ERROR', error: err.message });
    }
  }

  return results;
};

// ─── Automation: build message text per template ──────────────────────────────

const buildAutoMessage = (template, org, lang = 'fr') => {
  const name = lang === 'ar' ? (org.nameAr || org.name) : org.name;
  const messages = {
    trial_expired:      `Bonjour ${name},\nVotre période d'essai a expiré. Abonnez-vous pour continuer à utiliser Mar E-A.C.`,
    payment_reminder:   `Bonjour ${name},\nVotre paiement est en retard. Merci de régulariser votre situation.`,
    reactivation:       `Bonjour ${name},\nVous nous manquez ! Reconnectez-vous sur Mar E-A.C pour gérer vos activités.`,
    subscription_expiring: `Bonjour ${name},\nVotre abonnement expire bientôt. Renouvelez-le pour éviter toute interruption.`,
    default:            `Bonjour ${name},\nNotification automatique de la plateforme Mar E-A.C.`,
  };
  return messages[template] || messages.default;
};

// ─── Core: execute one rule against its targets ───────────────────────────────

const executeRule = async (rule) => {
  const targets = await resolveAutomationTargets(rule.trigger);
  const actions = Array.isArray(rule.actions) ? rule.actions : [];

  const allResults = [];
  for (const org of targets) {
    const orgResults = await executeActionsForOrg(actions, org);
    allResults.push(...orgResults);
  }

  await prisma.automationRule.update({
    where: { id: rule.id },
    data: { lastRun: new Date(), runCount: { increment: 1 } },
  });

  return { targetCount: targets.length, results: allResults };
};

// ─── Controller: run rule manually ───────────────────────────────────────────

const runAutomationRule = async (req, res) => {
  try {
    const rule = await prisma.automationRule.findUnique({ where: { id: req.params.ruleId } });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    const { targetCount, results } = await executeRule(rule);

    const updated = await prisma.automationRule.findUnique({ where: { id: rule.id } });
    res.json({
      ...updated,
      execution: { targetCount, results },
      message: `Règle "${rule.name}" exécutée sur ${targetCount} organisation(s).`,
    });
  } catch (err) {
    console.error('[runAutomationRule]', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
};

// ─── Cron: process all active automation rules (called daily) ─────────────────

const processAutomationRules = async () => {
  try {
    const activeRules = await prisma.automationRule.findMany({ where: { isActive: true } });
    console.log(`[automation cron] Processing ${activeRules.length} active rule(s)`);
    for (const rule of activeRules) {
      try {
        const { targetCount, results } = await executeRule(rule);
        const errors = results.filter(r => r.status === 'ERROR').length;
        console.log(`[automation cron] Rule "${rule.name}" → ${targetCount} targets, ${errors} errors`);
      } catch (err) {
        console.error(`[automation cron] Rule "${rule.name}" failed:`, err.message);
      }
    }
  } catch (err) {
    console.error('[automation cron] Fatal error:', err.message);
  }
};

// ─── Cron: send daily WhatsApp reminders to orgs with ≤5 trial days left ──────

const sendTrialExpiryReminders = async () => {
  try {
    const now   = new Date();
    const in5   = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const orgs = await prisma.organization.findMany({
      where: {
        trialEndsAt: { gte: now, lte: in5 },
        subscription: { status: 'TRIAL' },
      },
      select: { id: true, name: true, nameAr: true, phone: true, trialEndsAt: true },
    });

    console.log(`[trial-reminder cron] Found ${orgs.length} org(s) with ≤5 trial days`);

    for (const org of orgs) {
      try {
        if (!org.phone) continue;

        // Skip if we already sent a reminder today for this org
        const alreadySent = await prisma.whatsAppMessage.findFirst({
          where: {
            organizationId: org.id,
            trigger: 'TRIAL_EXPIRY',
            createdAt: { gte: todayStart, lt: todayEnd },
          },
        });
        if (alreadySent) continue;

        const daysLeft = Math.ceil((new Date(org.trialEndsAt) - now) / (1000 * 60 * 60 * 24));
        const name = org.nameAr || org.name;
        const msg = `مرحباً ${name}،\nتنتهي فترتك التجريبية خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}.\nاشترك الآن لمواصلة استخدام منصة Mar E-A.C وتجنب فقدان بياناتك.`;

        let status = 'SENT';
        try {
          await callEvolutionAPI(org.phone, msg);
        } catch (waErr) {
          console.error(`[trial-reminder cron] WhatsApp failed for ${org.name}:`, waErr.message);
          status = 'FAILED';
        }

        await prisma.whatsAppMessage.create({
          data: {
            organizationId: org.id,
            phone: org.phone,
            message: msg,
            type: 'AUTOMATED',
            trigger: 'TRIAL_EXPIRY',
            status,
            sentAt: status === 'SENT' ? new Date() : null,
          },
        });

        console.log(`[trial-reminder cron] ${status} → ${org.name} (${daysLeft}d left)`);
      } catch (err) {
        console.error(`[trial-reminder cron] Error for org ${org.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[trial-reminder cron] Fatal error:', err.message);
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
      trial_duration_days: { value: '60', category: 'GENERAL' },
      default_currency: { value: 'MAD', category: 'BILLING' },
      support_email:     { value: 'support@mar-eac.ma', category: 'GENERAL' },
      support_whatsapp:  { value: '', category: 'GENERAL' },
      evolution_api_url: { value: process.env.EVOLUTION_API_URL || '', category: 'INTEGRATIONS' },
      evolution_api_key: { value: process.env.EVOLUTION_API_KEY || '', category: 'INTEGRATIONS' },
      whatsapp_api_key: { value: '', category: 'INTEGRATIONS' },
      whatsapp_phone_id: { value: '', category: 'INTEGRATIONS' },
      smtp_host: { value: process.env.SMTP_HOST || 'smtp.gmail.com', category: 'INTEGRATIONS' },
      smtp_port: { value: process.env.SMTP_PORT || '587', category: 'INTEGRATIONS' },
      smtp_user: { value: process.env.SMTP_USER || '', category: 'INTEGRATIONS' },
      smtp_pass: { value: process.env.SMTP_PASS || '', category: 'INTEGRATIONS' },
      smtp_from: { value: process.env.SMTP_FROM || process.env.SMTP_USER || '', category: 'INTEGRATIONS' },
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

// ─── Marketing Campaigns (unified) ───────────────────────────────────────────

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/marketing';

const CAMPAIGN_TEMPLATES = {
  trial_reminder: {
    fr: "Bonjour {{name}} ! Votre période d'essai sur Mar E-A.C se termine bientôt. Profitez de toutes les fonctionnalités avant qu'il ne soit trop tard. Souscrivez maintenant 👉",
    ar: "مرحباً {{name}}! تنتهي فترة تجربتك على Mar E-A.C قريباً. استفد من جميع المميزات قبل فوات الأوان. اشترك الآن 👉",
  },
  payment_reminder: {
    fr: "Bonjour {{name}}, un paiement est en attente sur votre compte Mar E-A.C. Régularisez votre situation pour éviter l'interruption de service.",
    ar: "مرحباً {{name}}، يوجد مبلغ معلق في حسابك على Mar E-A.C. يرجى تسوية وضعك لتجنب انقطاع الخدمة.",
  },
  promo: {
    fr: "🎉 Offre spéciale ! Profitez de -20% sur l'abonnement annuel Mar E-A.C. Valable jusqu'à la fin du mois. Contactez-nous maintenant !",
    ar: "🎉 عرض خاص! استفد من خصم 20% على اشتراك Mar E-A.C السنوي. صالح حتى نهاية الشهر. تواصل معنا الآن!",
  },
  renewal: {
    fr: "Bonjour {{name}}, votre abonnement Mar E-A.C expire dans 7 jours. Renouvelez maintenant pour continuer à gérer votre association sans interruption.",
    ar: "مرحباً {{name}}، ينتهي اشتراكك في Mar E-A.C خلال 7 أيام. جدد الآن لمواصلة إدارة جمعيتك دون انقطاع.",
  },
  reactivation: {
    fr: "Nous avons remarqué votre absence, {{name}} ! Revenez sur Mar E-A.C et découvrez les nouvelles fonctionnalités. Un mois offert pour votre retour 🎁",
    ar: "لاحظنا غيابك، {{name}}! عد إلى Mar E-A.C واكتشف الميزات الجديدة. شهر مجاني كهدية لعودتك 🎁",
  },
};

const buildSegmentWhere = (segmentation = []) => {
  if (!segmentation.length || segmentation.includes('all')) return {};
  const ors = [];
  if (segmentation.includes('water_users'))    ors.push({ modules: { has: 'WATER' } });
  if (segmentation.includes('productive_orgs')) ors.push({ modules: { has: 'PRODUCTIVE' } });
  if (segmentation.includes('trial_expired'))  ors.push({ subscription: { status: 'EXPIRED' } });
  if (segmentation.includes('inactive_users')) ors.push({ subscription: { status: 'CANCELLED' } });
  return ors.length ? { OR: ors } : {};
};

const getMarketingCampaigns = async (req, res) => {
  try {
    const campaigns = await prisma.marketingCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createMarketingCampaign = async (req, res) => {
  try {
    const {
      campaignType = 'no_template',
      sendType = 'bulk',
      segmentation = [],
      messageContent,
      scheduleType = 'now',
      scheduleDate,
      tracking = { sent: false, opened: false, clicked: false },
      automationEnabled = false,
      automationTrigger,
      channel = 'whatsapp',
    } = req.body;

    if (!messageContent || !messageContent.trim()) {
      return res.status(400).json({ message: 'messageContent is required' });
    }
    if (scheduleType === 'scheduled' && !scheduleDate) {
      return res.status(400).json({ message: 'scheduleDate is required when scheduleType is scheduled' });
    }

    const status = scheduleType === 'scheduled' ? 'SCHEDULED' : 'DRAFT';

    const campaign = await prisma.marketingCampaign.create({
      data: {
        campaignType,
        sendType,
        segmentation,
        messageContent,
        scheduleType,
        scheduleDate: scheduleDate ? new Date(scheduleDate) : null,
        tracking,
        automationEnabled,
        automationTrigger: automationEnabled ? (automationTrigger || null) : null,
        channel,
        status,
      },
    });

    // Fire immediately if scheduleType === 'now'
    if (scheduleType === 'now') {
      // Count targets
      const where = buildSegmentWhere(segmentation);
      const orgs = await prisma.organization.findMany({ where, select: { id: true, phone: true, email: true, name: true } });
      const recipientCount = sendType === 'manual' ? 1 : orgs.filter(o => o.phone || o.email).length;

      // POST to n8n asynchronously (don't block the response)
      const payload = {
        campaignId: campaign.id,
        campaignType,
        sendType,
        segmentation,
        messageContent,
        channel,
        tracking,
        automationEnabled,
        automationTrigger,
        recipients: orgs.map(o => ({ id: o.id, phone: o.phone, email: o.email, name: o.name })),
      };

      axios.post(N8N_WEBHOOK_URL, payload, { timeout: 10000 })
        .then(async () => {
          await prisma.marketingCampaign.update({
            where: { id: campaign.id },
            data: { status: 'SENT', sentAt: new Date(), recipientCount },
          });
        })
        .catch(async (err) => {
          console.error('[n8n webhook error]', err?.response?.data || err.message);
          await prisma.marketingCampaign.update({
            where: { id: campaign.id },
            data: { status: 'FAILED' },
          });
        });

      // Return immediately with SENT optimistically
      return res.status(201).json({
        ...campaign,
        status: 'SENT',
        recipientCount,
        _note: 'Dispatched to n8n',
      });
    }

    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteMarketingCampaign = async (req, res) => {
  try {
    await prisma.marketingCampaign.delete({ where: { id: req.params.campaignId } });
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getTemplateMessages = async (req, res) => {
  res.json(CAMPAIGN_TEMPLATES);
};

// ─── Downgrade Requests ───────────────────────────────────────────────────────

const { applyPlanChange } = require('../auth/auth.controller');

const getDowngradeRequests = async (req, res) => {
  try {
    const subs = await prisma.subscription.findMany({
      where: { pendingPlan: { not: null } },
      include: {
        organization: { select: { id: true, name: true, email: true, modules: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const approveDowngrade = async (req, res) => {
  try {
    const { orgId } = req.params;
    const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } });
    if (!sub?.pendingPlan) return res.status(400).json({ message: 'No pending downgrade' });

    const updated = await applyPlanChange(orgId, sub.pendingPlan);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const rejectDowngrade = async (req, res) => {
  try {
    const { orgId } = req.params;
    const sub = await prisma.subscription.update({
      where: { organizationId: orgId },
      data:  { pendingPlan: null },
    });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getStats, getAnalytics, getFeatureUsage, getAIInsights,
  getOrganizations, getOrganization, updateSubscription, deleteOrganization,
  getPayments, createPayment, uploadPaymentReceipt, deletePayment,
  getUsers, toggleUser, resetUserPassword,
  seedDefaultPacks, getPacks, createPack, updatePack, deletePack,
  getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode,
  getEmailCampaigns, createEmailCampaign, sendEmailCampaign, deleteEmailCampaign,
  getWhatsAppMessages, sendWhatsAppMessage, sendBulkWhatsApp,
  getAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule, runAutomationRule,
  processAutomationRules, sendTrialExpiryReminders,
  getPlatformSettings, updatePlatformSettings,
  getSubscriptions,
  getDowngradeRequests, approveDowngrade, rejectDowngrade,
  getMarketingCampaigns, createMarketingCampaign, deleteMarketingCampaign, getTemplateMessages,
};
