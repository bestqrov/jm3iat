const router = require('express').Router();
const ctrl = require('./superadmin.controller');
const { auth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');

router.use(auth, requireRole('SUPER_ADMIN'));

router.get('/stats', ctrl.getStats);
router.get('/organizations', ctrl.getOrganizations);
router.get('/organizations/:id', ctrl.getOrganization);
router.put('/organizations/:id/subscription', ctrl.updateSubscription);
router.delete('/organizations/:id', ctrl.deleteOrganization);
router.get('/users', ctrl.getUsers);
router.put('/users/:userId/toggle', ctrl.toggleUser);
router.post('/users/:userId/reset-password', ctrl.resetUserPassword);

module.exports = router;
