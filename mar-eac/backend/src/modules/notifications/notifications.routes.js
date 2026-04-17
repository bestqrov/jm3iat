const router = require('express').Router();
const ctrl = require('./notifications.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');

router.use(auth, tenant);
router.get('/', ctrl.getAll);
router.put('/:id/read', ctrl.markRead);
router.delete('/:id', ctrl.remove);

module.exports = router;
