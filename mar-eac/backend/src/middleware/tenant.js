const tenant = (req, res, next) => {
  if (req.user.role === 'SUPER_ADMIN') return next();

  if (!req.user.organizationId || !req.user.organization) {
    return res.status(403).json({ message: 'No organization assigned' });
  }

  req.organization = req.user.organization;
  req.subscription = req.user.organization.subscription;
  next();
};

module.exports = { tenant };
