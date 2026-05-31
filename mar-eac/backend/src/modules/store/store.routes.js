const router = require('express').Router();
const ctrl   = require('./store.controller');

// No auth — fully public storefront
router.get('/products',              ctrl.getStoreProducts);
router.get('/products/:id',          ctrl.getStoreProduct);
router.get('/orgs',                  ctrl.getStoreOrgs);
router.get('/categories',            ctrl.getStoreCategories);
router.get('/orders/:orderNumber',   ctrl.getOrderStatus);
router.post('/orders',               ctrl.placeStoreOrder);

module.exports = router;
