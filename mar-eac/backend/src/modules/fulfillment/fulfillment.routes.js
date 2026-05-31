const router = require('express').Router();
const ctrl   = require('./fulfillment.controller');
const { auth }        = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');

router.use(auth, requireRole('SUPER_ADMIN'));

router.get   ('/orders',       ctrl.getOrders);
router.patch ('/orders/:id',   ctrl.updateOrder);
router.get   ('/stock-alerts', ctrl.getStockAlerts);

module.exports = router;
