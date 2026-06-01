const router  = require('express').Router();
const ctrl    = require('./store.controller');
const { auth }        = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');

// Public routes
router.get('/products',              ctrl.getStoreProducts);
router.get('/products/:id',          ctrl.getStoreProduct);
router.get('/orgs',                  ctrl.getStoreOrgs);
router.get('/categories',            ctrl.getStoreCategories);
router.get('/best-sellers',          ctrl.getBestSellers);
router.get('/bundles',               ctrl.getBundles);
router.get('/orders/:orderNumber',   ctrl.getOrderStatus);
router.post('/orders',               ctrl.placeStoreOrder);

// Protected — super admin only
router.post  ('/bundles',     auth, requireRole('SUPER_ADMIN', 'STORE_MANAGER'), ctrl.createBundle);
router.put   ('/bundles/:id', auth, requireRole('SUPER_ADMIN', 'STORE_MANAGER'), ctrl.updateBundle);
router.delete('/bundles/:id', auth, requireRole('SUPER_ADMIN', 'STORE_MANAGER'), ctrl.deleteBundle);

module.exports = router;
