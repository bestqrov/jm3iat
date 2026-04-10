const prisma = require('../../config/database');
const cron = require('node-cron');

const getAll = async (req, res) => {
  try {
    const { unread } = req.query;
    const where = { organizationId: req.organization.id };
    if (unread === 'true') where.isRead = false;

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(reminders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.reminder.count({
      where: { organizationId: req.organization.id, isRead: false },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const markRead = async (req, res) => {
  try {
    const reminder = await prisma.reminder.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });

    const updated = await prisma.reminder.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const markAllRead = async (req, res) => {
  try {
    await prisma.reminder.updateMany({
      where: { organizationId: req.organization.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All reminders marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const create = async (req, res) => {
  try {
    const { type, title, message, scheduledFor } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });

    const reminder = await prisma.reminder.create({
      data: {
        organizationId: req.organization.id,
        type: type || 'CUSTOM',
        title,
        message,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      },
    });

    res.status(201).json(reminder);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await prisma.reminder.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Reminder not found' });

    await prisma.reminder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Reminder deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Monthly cron job - runs on 1st of every month at 8am
const scheduleMonthlyReminders = () => {
  cron.schedule('0 8 1 * *', async () => {
    console.log('[Cron] Creating monthly reminders for all organizations...');
    try {
      const orgs = await prisma.organization.findMany({
        include: { subscription: true },
      });

      const now = new Date();
      const monthlyReminders = [
        {
          type: 'FUNDING_REQUEST',
          title: 'تقديم طلبات التمويل / Soumettre des demandes de financement',
          message: 'حان وقت تقديم طلبات التمويل للشهر الجديد / Il est temps de soumettre les demandes de financement pour le nouveau mois.',
        },
        {
          type: 'WATER_READING',
          title: 'تسجيل قراءات العدادات / Enregistrer les relevés compteurs',
          message: 'يرجى تسجيل قراءات عدادات المياه لهذا الشهر / Veuillez enregistrer les relevés de compteurs d\'eau pour ce mois.',
        },
        {
          type: 'FINANCE_RECORD',
          title: 'تسجيل العمليات المالية / Enregistrer les opérations financières',
          message: 'تذكير بتسجيل جميع العمليات المالية للشهر السابق / Rappel pour enregistrer toutes les opérations financières du mois précédent.',
        },
        {
          type: 'PROJECT_UPDATE',
          title: 'تحديث حالة المشاريع / Mettre à jour l\'état des projets',
          message: 'يرجى تحديث حالة المشاريع الجارية / Veuillez mettre à jour l\'état des projets en cours.',
        },
      ];

      for (const org of orgs) {
        // Only for active subscriptions
        if (!org.subscription || ['EXPIRED', 'CANCELLED'].includes(org.subscription.status)) {
          continue;
        }

        const data = monthlyReminders.map((r) => ({
          organizationId: org.id,
          type: r.type,
          title: r.title,
          message: r.message,
          scheduledFor: now,
        }));

        await prisma.reminder.createMany({ data });
      }

      console.log(`[Cron] Monthly reminders created for ${orgs.length} organizations`);
    } catch (err) {
      console.error('[Cron] Error creating monthly reminders:', err);
    }
  });

  console.log('[Cron] Monthly reminder scheduler started');
};

module.exports = { getAll, getUnreadCount, markRead, markAllRead, create, remove, scheduleMonthlyReminders };
