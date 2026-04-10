const router = require('express').Router();
const ctrl = require('./reports.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requirePlan } = require('../../middleware/subscription');

router.use(auth, tenant, requirePlan('STANDARD'));

router.get('/literary', ctrl.getLiteraryReport);
router.get('/financial', ctrl.getFinancialReport);
router.get('/literary/export', ctrl.exportLiteraryPDF);
router.get('/financial/export', ctrl.exportFinancialPDF);

module.exports = router;
