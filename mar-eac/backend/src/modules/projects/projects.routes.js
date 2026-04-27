const router = require('express').Router();
const ctrl = require('./projects.controller');
const ms   = require('./milestones.controller');
const tc   = require('./technicalCard.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requireModule } = require('../../middleware/module');
const { logActivity } = require('../activity/activity.controller');

router.use(auth, tenant, requireModule('PROJECTS'));

router.get('/stats', ctrl.getStats);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/',      logActivity('CREATE', 'PROJECT', (req, b) => `إنشاء مشروع: ${b?.name || b?.title || ''}`), ctrl.create);
router.put('/:id',    logActivity('UPDATE', 'PROJECT', (req, b) => `تعديل مشروع: ${b?.name || b?.title || ''}`), ctrl.update);
router.delete('/:id', logActivity('DELETE', 'PROJECT', () => `حذف مشروع`), ctrl.remove);

// Milestones
router.get('/:id/milestones', ms.getMilestones);
router.post('/:id/milestones', ms.createMilestone);
router.post('/:id/milestones/generate', ms.generatePlan);
router.put('/:id/milestones/:milestoneId', ms.updateMilestone);
router.delete('/:id/milestones/:milestoneId', ms.deleteMilestone);

// Report PDF
router.get('/:id/report', ms.exportReport);

// Technical Card
router.get('/:id/technical-card',        tc.getTechnicalCard);
router.put('/:id/technical-card',        tc.saveTechnicalCard);
router.get('/:id/technical-card/pdf',    tc.exportTechnicalCardPdf);

module.exports = router;
