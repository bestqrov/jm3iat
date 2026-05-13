const router = require('express').Router();
const ctrl   = require('./commerce.controller');
const { auth, tenant, requireModule } = require('../../middleware');

router.use(auth, tenant, requireModule('COMMERCE'));

router.get('/stats',            ctrl.getStats);

router.get('/products',         ctrl.getProducts);
router.post('/products',        ctrl.createProduct);
router.put('/products/:id',     ctrl.updateProduct);
router.delete('/products/:id',  ctrl.deleteProduct);

router.get('/stock',            ctrl.getStockMovements);
router.post('/stock',           ctrl.addStockMovement);

router.get('/orders',           ctrl.getOrders);
router.post('/orders',          ctrl.createOrder);
router.put('/orders/:id',       ctrl.updateOrderStatus);
router.delete('/orders/:id',    ctrl.deleteOrder);

router.get('/profits',          ctrl.getProfits);

router.get('/payouts',          ctrl.getPayouts);
router.post('/payouts',         ctrl.createPayout);

module.exports = router;
