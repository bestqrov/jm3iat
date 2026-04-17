const prisma = require('../../config/database');
const { push } = require('../notifications/notifications.controller');
const { log } = require('../activity/activity.controller');

const orgId = (req) => req.organization.id;

const getAll = async (req, res) => {
  try {
    const items = await prisma.recurringPayment.findMany({
      where: { organizationId: orgId(req) }, orderBy: { nextDueDate: 'asc' },
    });
    res.json(items);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const create = async (req, res) => {
  try {
    const { description, amount, category, type, frequency, startDate, autoCreate, notes } = req.body;
    const item = await prisma.recurringPayment.create({
      data: {
        organizationId: orgId(req), description, amount: parseFloat(amount),
        category, type: type || 'INCOME', frequency: frequency || 'MONTHLY',
        startDate: new Date(startDate), nextDueDate: new Date(startDate),
        autoCreate: autoCreate !== false, notes: notes || null,
      },
    });
    log({ organizationId: orgId(req), userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role, action: 'CREATE', entity: 'recurring', entityId: item.id, description: `Paiement récurrent créé: ${description}` });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const update = async (req, res) => {
  try {
    const item = await prisma.recurringPayment.updateMany({
      where: { id: req.params.id, organizationId: orgId(req) }, data: req.body,
    });
    res.json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const remove = async (req, res) => {
  try {
    await prisma.recurringPayment.deleteMany({ where: { id: req.params.id, organizationId: orgId(req) } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Called by cron daily — process all due recurring payments
const processDue = async () => {
  const now = new Date();
  const due = await prisma.recurringPayment.findMany({
    where: { isActive: true, autoCreate: true, nextDueDate: { lte: now } },
    include: { organization: true },
  });

  for (const rp of due) {
    try {
      await prisma.transaction.create({
        data: {
          organizationId: rp.organizationId,
          type: rp.type,
          amount: rp.amount,
          category: rp.category,
          description: `[Auto] ${rp.description}`,
          date: new Date(),
        },
      });

      // Advance nextDueDate
      const next = new Date(rp.nextDueDate);
      if (rp.frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1);
      else if (rp.frequency === 'QUARTERLY') next.setMonth(next.getMonth() + 3);
      else if (rp.frequency === 'YEARLY') next.setFullYear(next.getFullYear() + 1);

      await prisma.recurringPayment.update({
        where: { id: rp.id },
        data: { lastRunDate: now, nextDueDate: next },
      });

      await push({
        organizationId: rp.organizationId,
        type: rp.type === 'INCOME' ? 'SUCCESS' : 'WARNING',
        title: `Paiement automatique: ${rp.description}`,
        titleAr: `دفعة تلقائية: ${rp.description}`,
        body: `Montant: ${rp.amount} MAD`,
        bodyAr: `المبلغ: ${rp.amount} درهم`,
        link: '/finance',
      });
    } catch (e) {
      console.error('[recurring cron] error for', rp.id, e.message);
    }
  }
  console.log(`[recurring cron] processed ${due.length} recurring payment(s)`);
};

module.exports = { getAll, create, update, remove, processDue };
