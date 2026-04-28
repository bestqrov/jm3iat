const router = require('express').Router();
const ctrl = require('./water.controller');
const ocr  = require('./water-ocr');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requireModule } = require('../../middleware/module');
const upload = require('../../utils/multer');

router.use(auth, tenant, requireModule('WATER'));

// Smart meter OCR scan (requires SMART_METER addon)
router.post('/ocr-reading', ocr.scanMeterReading);

// Summary & Reports
router.get('/summary', ctrl.getSummary);
router.get('/reports', ctrl.getReports);

// Tariff
router.get('/tariff', ctrl.getTariff);
router.put('/tariff', ctrl.updateTariff);

// Reader analytics (for WATER_READER role)
router.get('/reader-analytics', ctrl.getReaderAnalytics);

// Readers (Lecteurs) — admin only
router.get('/readers', ctrl.getReaders);
router.post('/readers', ctrl.createReader);
router.delete('/readers/:readerId', ctrl.deleteReader);

// Invoices
router.get('/invoices', ctrl.getInvoices);
router.put('/invoices/:invoiceId/pay', ctrl.markPaid);
router.get('/invoices/:invoiceId/pdf', ctrl.exportInvoicePDF);
router.post('/invoices/:invoiceId/receipt', upload.single('receipt'), ctrl.uploadPaymentReceipt);

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
