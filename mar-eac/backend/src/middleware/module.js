// Module-based access control
// Each org selects modules at registration: WATER, PRODUCTIVE, PROJECTS
// Legacy orgs (modules=[]) fall back to plan-based gating for backward compat.

const LEGACY_PLAN_GRANTS = {
  WATER:      ['PREMIUM'],
  PROJECTS:   ['STANDARD', 'PREMIUM'],
  PRODUCTIVE: ['PREMIUM'],
  TRANSPORT:  ['STANDARD', 'PREMIUM'],
};

const requireModule = (mod) => (req, res, next) => {
  const org = req.organization;
  const sub = req.subscription;

  if (!org || !sub) {
    return res.status(403).json({ message: 'No organization context' });
  }

  // Block expired / cancelled subscriptions
  if (sub.status === 'EXPIRED' || sub.status === 'CANCELLED') {
    return res.status(403).json({ message: 'Subscription expired. Please renew.' });
  }

  const modules = Array.isArray(org.modules) ? org.modules : [];

  // New orgs: check explicit modules list
  if (modules.length > 0) {
    if (modules.includes(mod)) return next();
    return res.status(403).json({
      message: `Module "${mod}" is not enabled for your organization.`,
      requiredModule: mod,
      enabledModules: modules,
    });
  }

  // Legacy orgs (no modules set): fall back to plan level
  const allowedPlans = LEGACY_PLAN_GRANTS[mod] || [];
  if (allowedPlans.includes(sub.plan)) return next();

  return res.status(403).json({
    message: `Module "${mod}" requires a higher plan or explicit activation.`,
    requiredModule: mod,
  });
};

module.exports = { requireModule };
