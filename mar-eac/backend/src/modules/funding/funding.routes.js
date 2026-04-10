const router = require('express').Router();
const ctrl = require('./funding.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requirePlan } = require('../../middleware/subscription');

router.use(auth, tenant, requirePlan('PREMIUM'));

router.get('/projects/:projectId', ctrl.getFunding);
router.put('/projects/:projectId/budget', ctrl.updateBudget);
router.post('/projects/:projectId/entries', ctrl.addEntry);
router.delete('/entries/:entryId', ctrl.deleteEntry);

module.exports = router;
