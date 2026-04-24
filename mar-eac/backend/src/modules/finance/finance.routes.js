const router = require('express').Router();
const ctrl = require('./finance.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requirePlan } = require('../../middleware/subscription');
const { requireOrgRole } = require('../../middleware/permission');
const { logActivity } = require('../activity/activity.controller');
const upload = require('../../utils/multer');

router.use(auth, tenant, requirePlan('STANDARD'), requireOrgRole('TREASURER'));

router.get('/summary', ctrl.getSummary);
router.get('/monthly', ctrl.getMonthlySummary);
router.get('/categories', ctrl.getCategories);
router.get('/export/pdf', ctrl.exportPDF);
router.get('/', ctrl.getTransactions);
router.get('/:id', ctrl.getById);
router.post('/',      logActivity('CREATE', 'TRANSACTION', (req, b) => `${b?.type === 'INCOME' ? 'دخل' : 'مصروف'}: ${b?.description || ''} — ${b?.amount || ''} د.م`), ctrl.create);
router.put('/:id',    logActivity('UPDATE', 'TRANSACTION', (req, b) => `تعديل معاملة: ${b?.description || ''}`), ctrl.update);
router.delete('/:id', logActivity('DELETE', 'TRANSACTION', () => `حذف معاملة مالية`), ctrl.remove);
router.post('/:id/receipt', upload.single('receipt'), ctrl.uploadReceipt);
router.get('/:id/invoice', ctrl.exportInvoice);

module.exports = router;
