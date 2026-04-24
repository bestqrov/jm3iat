const router = require('express').Router();
const ctrl = require('./members.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { logActivity } = require('../activity/activity.controller');

router.use(auth, tenant);

router.get('/stats', ctrl.getStats);
router.get('/board', ctrl.getBoardMembers);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/',      logActivity('CREATE', 'MEMBER', (req, b) => `إضافة منخرط: ${b?.name || ''}`),  ctrl.create);
router.put('/:id',    logActivity('UPDATE', 'MEMBER', (req, b) => `تعديل منخرط: ${b?.name || ''}`),  ctrl.update);
router.delete('/:id', logActivity('DELETE', 'MEMBER', ()       => `حذف منخرط`),                       ctrl.remove);

module.exports = router;
