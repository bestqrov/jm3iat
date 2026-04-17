const router  = require('express').Router();
const ctrl    = require('./staff.controller');
const { auth }   = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requireAdmin } = require('../../middleware/permission');

// Only org ADMIN can manage staff accounts
router.use(auth, tenant, requireAdmin);

router.get   ('/',     ctrl.getStaff);
router.post  ('/',     ctrl.createStaff);
router.put   ('/:id',  ctrl.updateStaff);
router.delete('/:id',  ctrl.deleteStaff);

module.exports = router;
