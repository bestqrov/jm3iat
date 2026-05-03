const express = require('express');
const router = express.Router();
const { authenticate, requireModule } = require('../../middleware/auth');
const ctrl = require('./coop.controller');

router.use(authenticate);
router.use(requireModule('COOP'));

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

module.exports = router;
