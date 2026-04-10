const router = require('express').Router();
const ctrl = require('./reminders.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');

router.use(auth, tenant);

router.get('/count', ctrl.getUnreadCount);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/read-all', ctrl.markAllRead);
router.put('/:id/read', ctrl.markRead);
router.delete('/:id', ctrl.remove);

module.exports = router;
