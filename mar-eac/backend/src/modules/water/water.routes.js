const router = require('express').Router();
const ctrl = require('./water.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requirePlan } = require('../../middleware/subscription');

router.use(auth, tenant, requirePlan('PREMIUM'));

// Summary & Reports
router.get('/summary', ctrl.getSummary);
router.get('/reports', ctrl.getReports);

// Invoices
router.get('/invoices', ctrl.getInvoices);
router.put('/invoices/:invoiceId/pay', ctrl.markPaid);
router.get('/invoices/:invoiceId/pdf', ctrl.exportInvoicePDF);

// Readings (all)
router.get('/readings', ctrl.getAllReadings);

// Repairs
router.get('/repairs', ctrl.getRepairs);
router.post('/repairs', ctrl.createRepair);
router.put('/repairs/:id', ctrl.updateRepair);
router.delete('/repairs/:id', ctrl.deleteRepair);

// Installations
router.get('/', ctrl.getInstallations);
router.post('/', ctrl.createInstallation);
router.get('/:id', ctrl.getInstallation);
router.put('/:id', ctrl.updateInstallation);
router.delete('/:id', ctrl.deleteInstallation);

// Per-installation readings
router.get('/:id/readings', ctrl.getReadings);
router.post('/:id/readings', ctrl.addReading);

module.exports = router;
