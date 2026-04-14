const router = require('express').Router();
const ctrl = require('./projects.controller');
const ms = require('./milestones.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requireModule } = require('../../middleware/module');

router.use(auth, tenant, requireModule('PROJECTS'));

router.get('/stats', ctrl.getStats);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// Milestones
router.get('/:id/milestones', ms.getMilestones);
router.post('/:id/milestones', ms.createMilestone);
router.post('/:id/milestones/generate', ms.generatePlan);
router.put('/:id/milestones/:milestoneId', ms.updateMilestone);
router.delete('/:id/milestones/:milestoneId', ms.deleteMilestone);

// Report PDF
router.get('/:id/report', ms.exportReport);

module.exports = router;
