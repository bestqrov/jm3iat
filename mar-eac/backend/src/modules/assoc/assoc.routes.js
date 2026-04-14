const router = require('express').Router();
const ctrl = require('./assoc.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requireModule } = require('../../middleware/module');

router.use(auth, tenant, requireModule('PRODUCTIVE'));

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

// Clients
router.get('/clients', ctrl.getClients);
router.post('/clients', ctrl.createClient);
router.put('/clients/:id', ctrl.updateClient);
router.delete('/clients/:id', ctrl.deleteClient);
router.get('/clients/:id/history', ctrl.getClientHistory);

// Sales
router.get('/sales', ctrl.getSales);
router.post('/sales', ctrl.createSale);
router.delete('/sales/:id', ctrl.deleteSale);

// Events
router.get('/events', ctrl.getEvents);
router.post('/events', ctrl.createEvent);
router.put('/events/:id', ctrl.updateEvent);
router.delete('/events/:id', ctrl.deleteEvent);

module.exports = router;
