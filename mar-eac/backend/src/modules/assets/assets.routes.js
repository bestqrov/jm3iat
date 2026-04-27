const router = require('express').Router();
const ctrl   = require('./assets.controller');
const { auth }        = require('../../middleware/auth');
const { tenant }      = require('../../middleware/tenant');
const { logActivity } = require('../activity/activity.controller');

router.use(auth, tenant);

router.get('/stats', ctrl.getStats);
router.get('/',      ctrl.getAll);
router.get('/:id',   ctrl.getById);
router.post('/',     logActivity('CREATE', 'ASSET', (req, b) => `إضافة ممتلك: ${b?.name || ''}`), ctrl.create);
router.put('/:id',   logActivity('UPDATE', 'ASSET', (req, b) => `تعديل ممتلك: ${b?.name || ''}`), ctrl.update);
router.delete('/:id',logActivity('DELETE', 'ASSET', () => `حذف ممتلك`),                            ctrl.remove);

module.exports = router;
