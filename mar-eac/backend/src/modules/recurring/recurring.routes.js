const router = require('express').Router();
const ctrl = require('./recurring.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requireOrgRole } = require('../../middleware/permission');

router.use(auth, tenant, requireOrgRole('TREASURER'));
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
