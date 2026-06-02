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

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      let activeCount = 0;

      for (const org of orgs) {
        // Only for active subscriptions
        if (!org.subscription || ['EXPIRED', 'CANCELLED'].includes(org.subscription.status)) {
          continue;
        }

        activeCount++;

        // Build per-org reminder list based on existence checks
        const orgReminders = [];

        // FUNDING_REQUEST — always send
        orgReminders.push(monthlyReminders.find((r) => r.type === 'FUNDING_REQUEST'));

        // FINANCE_RECORD — always send
        orgReminders.push(monthlyReminders.find((r) => r.type === 'FINANCE_RECORD'));

        // WATER_READING — only if org has at least 1 water installation
        const waterCount = await prisma.waterInstallation.count({ where: { organizationId: org.id } });
        if (waterCount > 0) {
          orgReminders.push(monthlyReminders.find((r) => r.type === 'WATER_READING'));
        }

        // PROJECT_UPDATE or PROJECT_CREATE depending on whether org has any projects
        const projectCount = await prisma.project.count({ where: { organizationId: org.id } });
        if (projectCount > 0) {
          orgReminders.push(monthlyReminders.find((r) => r.type === 'PROJECT_UPDATE'));
        } else {
          orgReminders.push({
            type: 'PROJECT_CREATE',
            title: 'أنشئ مشروعك الأول / Créez votre premier projet',
            message: "لم تقم بإنشاء أي مشروع بعد. ابدأ الآن بإضافة مشروعك الأول لتتبع التقدم والنتائج. / Vous n'avez pas encore créé de projet. Commencez maintenant en ajoutant votre premier projet.",
          });
        }

        // Send each reminder only if it doesn't already exist this month (deduplication)
        for (const r of orgReminders) {
          if (!r) continue;

          const existing = await prisma.reminder.findFirst({
            where: { organizationId: org.id, type: r.type, createdAt: { gte: startOfMonth } },
          });
          if (existing) continue;

          await prisma.reminder.create({
            data: {
              organizationId: org.id,
              type: r.type,
              title: r.title,
              message: r.message,
              scheduledFor: now,
            },
          });
        }
      }

      console.log(`[Cron] Monthly reminders created for ${activeCount}/${orgs.length} organizations`);
    } catch (err) {
      console.error('[Cron] Error creating monthly reminders:', err);
    }
  });

  console.log('[Cron] Monthly reminder scheduler started');
};

// Bureau expiry cron — every 4 days at 09:00
// Sends a reminder/notification to any org whose bureauCreationDate + mandateDuration years falls within 30 days
const scheduleBureauExpiryReminders = () => {
  cron.schedule('0 9 */4 * *', async () => {
    console.log('[Cron] Checking bureau expiry dates...');
    try {
      const orgs = await prisma.organization.findMany({
        where: { bureauCreationDate: { not: null }, conversionStatus: { not: 'CONVERTED' } },
        include: { subscription: true },
      });

      const now = new Date();

      for (const org of orgs) {
        if (!org.subscription || ['EXPIRED', 'CANCELLED'].includes(org.subscription.status)) continue;

        const termYears = org.mandateDuration || 3;
        const expiry = new Date(org.bureauCreationDate);
        expiry.setFullYear(expiry.getFullYear() + termYears);

        const msLeft = expiry.getTime() - now.getTime();
        const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

        if (daysLeft <= 0 || daysLeft > 30) continue;

        // Avoid duplicates: skip if a bureau-expiry reminder already exists in the last 4 days
        const recent = await prisma.reminder.findFirst({
          where: {
            organizationId: org.id,
            type: 'BUREAU_EXPIRY',
            createdAt: { gte: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
          },
        });
        if (recent) continue;

        const expiryStr = expiry.toLocaleDateString('fr-FR');

        await prisma.reminder.create({
          data: {
            organizationId: org.id,
            type: 'BUREAU_EXPIRY',
            title: `⚠️ انتهاء صلاحية المكتب / Expiration du bureau — ${daysLeft} ${daysLeft === 1 ? 'jour' : 'jours'}`,
            message: `سينتهي مكتب الجمعية ويصبح غير قانوني بعد ${daysLeft} يوم (${expiryStr}). يجب تجديد انتخاب المكتب قبل هذا التاريخ. / Le bureau de l'association deviendra illégal dans ${daysLeft} jour(s) (${expiryStr}). Le bureau doit être renouvelé avant cette date.`,
            scheduledFor: now,
          },
        });

        console.log(`[Cron] Bureau expiry reminder sent for org ${org.id} — ${daysLeft} days left`);
      }
    } catch (err) {
      console.error('[Cron] Error in bureau expiry check:', err);
    }
  });

  console.log('[Cron] Bureau expiry scheduler started');
};

module.exports = { getAll, getUnreadCount, markRead, markAllRead, create, remove, scheduleMonthlyReminders, scheduleBureauExpiryReminders };
