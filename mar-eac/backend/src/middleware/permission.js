// ── Role-based permission middleware ─────────────────────────────────────────
//
// ADMIN    — org owner (registered via /register), full access
// PRESIDENT— created by ADMIN, full access
// TREASURER— أمين المال: finance + reports only
// SECRETARY— الكاتب: documents + reports + requests + meetings
//
// Usage:  requireOrgRole('TREASURER', 'SECRETARY')
//         → passes ADMIN, PRESIDENT + the listed roles; blocks everyone else

const FULL_ACCESS_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PRESIDENT'];

const requireOrgRole = (...allowedRoles) => (req, res, next) => {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ message: 'Unauthenticated' });
  if (FULL_ACCESS_ROLES.includes(role)) return next();
  if (allowedRoles.includes(role)) return next();
  return res.status(403).json({ message: 'Accès refusé — permissions insuffisantes' });
};

// Shorthand: only org ADMIN (and SUPER_ADMIN) — used for staff management
const requireAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return next();
  return res.status(403).json({ message: 'Réservé à l\'administrateur' });
};

module.exports = { requireOrgRole, requireAdmin };
