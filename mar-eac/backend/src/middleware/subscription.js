const PLAN_LEVELS = { BASIC: 1, STANDARD: 2, PREMIUM: 3 };

const requirePlan = (minPlan) => (req, res, next) => {
  const sub = req.subscription;

  if (!sub) {
    return res.status(403).json({ message: 'No active subscription' });
  }

  // Check if trial expired
  if (sub.status === 'TRIAL' && req.organization.trialEndsAt) {
    const now = new Date();
    if (now > req.organization.trialEndsAt) {
      return res.status(403).json({ message: 'Trial period expired. Please upgrade your plan.' });
    }
  }

  if (sub.status === 'EXPIRED' || sub.status === 'CANCELLED') {
    return res.status(403).json({ message: 'Subscription expired. Please renew.' });
  }

  const userLevel = PLAN_LEVELS[sub.plan] || 0;
  const requiredLevel = PLAN_LEVELS[minPlan] || 0;

  if (userLevel < requiredLevel) {
    return res.status(403).json({
      message: `This feature requires the ${minPlan} plan or higher.`,
      requiredPlan: minPlan,
      currentPlan: sub.plan,
    });
  }

  next();
};

module.exports = { requirePlan };
