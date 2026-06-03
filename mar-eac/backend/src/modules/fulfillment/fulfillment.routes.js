const router = require('express').Router();
const ctrl   = require('./fulfillment.controller');
const { auth }        = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');

router.use(auth, requireRole('SUPER_ADMIN', 'STORE_MANAGER'));

// Orders
router.get   ('/orders',              ctrl.getOrders);
router.patch ('/orders/:id',          ctrl.updateOrder);

// Stock alerts
router.get   ('/stock-alerts',        ctrl.getStockAlerts);

// Products (cross-org)
router.get   ('/products',            ctrl.getProducts);
router.post  ('/products',            ctrl.createProduct);
router.put   ('/products/:id',        ctrl.updateProduct);
router.delete('/products/:id',        ctrl.deleteProduct);
router.patch ('/products/:id/toggle', ctrl.toggleProduct);

// Stock movements (cross-org)
router.get   ('/stock-movements',     ctrl.getStockMovements);
router.post  ('/stock-movements',     ctrl.addStockMovement);

// Org list for product form selector
router.get   ('/commerce-orgs',       ctrl.getCommerceOrgs);

// Category management
router.get   ('/categories',                    ctrl.getCategories);
router.post  ('/categories',                    ctrl.addCategory);
router.put   ('/categories/:name',              ctrl.renameCategory);
router.delete('/categories/:name',              ctrl.deleteCategory);
router.put   ('/categories/:name/image',        ctrl.updateCategoryImage);

module.exports = router;
