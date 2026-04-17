const router = require('express').Router();
const ctrl = require('./reports.controller');
const assocCtrl = require('./assoc-reports.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requirePlan } = require('../../middleware/subscription');
const { requireOrgRole } = require('../../middleware/permission');

router.use(auth, tenant, requirePlan('STANDARD'), requireOrgRole('TREASURER', 'SECRETARY'));

router.get('/literary', ctrl.getLiteraryReport);
router.get('/financial', ctrl.getFinancialReport);
router.get('/literary/export', ctrl.exportLiteraryPDF);
router.get('/financial/export', ctrl.exportFinancialPDF);

// Association-specific reports
router.get('/assoc/literary', assocCtrl.getAssocLiterary);
router.get('/assoc/financial', assocCtrl.getAssocFinancial);
router.get('/assoc/advanced', requirePlan('PREMIUM'), assocCtrl.getAssocAdvanced);
router.get('/assoc/literary/export', assocCtrl.exportAssocLiteraryPDF);
router.get('/assoc/financial/export', assocCtrl.exportAssocFinancialPDF);

module.exports = router;
