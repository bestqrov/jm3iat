const router = require('express').Router();
const ctrl = require('./coop.controller');
const { auth }          = require('../../middleware/auth');
const { tenant }        = require('../../middleware/tenant');
const { requireModule } = require('../../middleware/module');

router.use(auth, tenant, requireModule('COOP'));

// Stats
router.get('/stats', ctrl.getStats);

// Stock Products
router.get('/products',          ctrl.getProducts);
router.post('/products',         ctrl.createProduct);
router.put('/products/:id',      ctrl.updateProduct);
router.delete('/products/:id',   ctrl.deleteProduct);

// Stock Movements
router.get('/movements',         ctrl.getMovements);
router.post('/movements',        ctrl.createMovement);
router.delete('/movements/:id',  ctrl.deleteMovement);

// Member Shares (parts sociales)
router.get('/shares',            ctrl.getMemberShares);
router.post('/shares',           ctrl.upsertMemberShare);
router.delete('/shares/:id',     ctrl.deleteMemberShare);

// Invoices / Devis / BL
router.get('/invoices',          ctrl.getInvoices);
router.post('/invoices',         ctrl.createInvoice);
router.put('/invoices/:id',      ctrl.updateInvoice);
router.delete('/invoices/:id',   ctrl.deleteInvoice);

// Reports
router.get('/reports',           ctrl.getReports);

// Board meetings (مجلس الإدارة)
router.get('/board-meetings',                              ctrl.getBoardMeetings);
router.post('/board-meetings',                             ctrl.createBoardMeeting);
router.put('/board-meetings/:id',                          ctrl.updateBoardMeeting);
router.delete('/board-meetings/:id',                       ctrl.deleteBoardMeeting);
router.post('/board-meetings/:id/decisions',               ctrl.addBoardDecision);
router.put('/board-meetings/:id/decisions/:decisionId',    ctrl.updateBoardDecision);

// Projects & partnerships (المشاريع والشراكات)
router.get('/projects',          ctrl.getCoopProjects);
router.post('/projects',         ctrl.createCoopProject);
router.get('/projects/:id',      ctrl.getCoopProject);
router.put('/projects/:id',      ctrl.updateCoopProject);
router.delete('/projects/:id',   ctrl.deleteCoopProject);

// Production (دورات الإنتاج)
router.get('/productions',        ctrl.getProductions);
router.post('/productions',       ctrl.createProduction);
router.put('/productions/:id',    ctrl.updateProduction);
router.delete('/productions/:id', ctrl.deleteProduction);

// Clients
router.get('/clients',        ctrl.getClients);
router.post('/clients',       ctrl.createClient);
router.put('/clients/:id',    ctrl.updateClient);
router.delete('/clients/:id', ctrl.deleteClient);

// Sales / Ventes
router.get('/sales',        ctrl.getSales);
router.get('/sales/stats',  ctrl.getSalesStats);
router.post('/sales',       ctrl.createSale);
router.put('/sales/:id',    ctrl.updateSale);
router.delete('/sales/:id', ctrl.deleteSale);

module.exports = router;
