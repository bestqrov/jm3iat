const prisma = require('../../config/database');

const orgId = (req) => req.organization.id;

// Log an activity (called internally from other controllers)
const log = async ({ organizationId, userId, userName, userRole, action, entity, entityId, description, metadata }) => {
  try {
    await prisma.activityLog.create({
      data: { organizationId, userId, userName, userRole, action, entity, entityId: entityId || null, description, metadata: metadata || null },
    });
  } catch (e) {
    console.error('[activity log]', e.message);
  }
};

// Middleware that auto-logs from req context
const logActivity = (action, entity, getDescription) => async (req, res, next) => {
  const orig = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      const id = orgId(req);
      const u = req.user;
      const entityId = body?.id || req.params?.id || null;
      const desc = typeof getDescription === 'function' ? getDescription(req, body) : getDescription;
      log({ organizationId: id, userId: u?.id, userName: u?.name, userRole: u?.role, action, entity, entityId, description: desc });
    }
    return orig(body);
  };
  next();
};

const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, entity, action } = req.query;
    const where = { organizationId: orgId(req) };
    if (entity) where.entity = entity;
    if (action) where.action = action;
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.activityLog.count({ where }),
    ]);
    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { log, logActivity, getLogs };
