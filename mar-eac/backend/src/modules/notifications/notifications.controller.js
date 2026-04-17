const prisma = require('../../config/database');

const orgId = (req) => req.organization.id;

// Internal helper to push a notification
const push = async ({ organizationId, userId, type = 'INFO', title, titleAr, body, bodyAr, link }) => {
  try {
    await prisma.notification.create({
      data: { organizationId, userId: userId || null, type, title, titleAr: titleAr || null, body: body || null, bodyAr: bodyAr || null, link: link || null },
    });
  } catch (e) {
    console.error('[notification push]', e.message);
  }
};

const getAll = async (req, res) => {
  try {
    const where = { organizationId: orgId(req) };
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);
    res.json({ notifications, unread });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'all') {
      await prisma.notification.updateMany({ where: { organizationId: orgId(req) }, data: { isRead: true } });
    } else {
      await prisma.notification.updateMany({ where: { id, organizationId: orgId(req) }, data: { isRead: true } });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.notification.deleteMany({ where: { id: req.params.id, organizationId: orgId(req) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { push, getAll, markRead, remove };
