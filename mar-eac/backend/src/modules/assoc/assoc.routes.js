const router = require('express').Router();
const ctrl = require('./assoc.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requirePlan } = require('../../middleware/subscription');

router.use(auth, tenant, requirePlan('STANDARD'));

router.get('/stats', ctrl.getStats);
router.get('/stock', ctrl.getStock);

// Products
router.get('/products', ctrl.getProducts);
router.post('/products', ctrl.createProduct);
router.put('/products/:id', ctrl.updateProduct);
router.delete('/products/:id', ctrl.deleteProduct);

// Productions
router.get('/productions', ctrl.getProductions);
router.post('/productions', ctrl.createProduction);
router.delete('/productions/:id', ctrl.deleteProduction);

// Sales
router.get('/sales', ctrl.getSales);
router.post('/sales', ctrl.createSale);
router.delete('/sales/:id', ctrl.deleteSale);

module.exports = router;
