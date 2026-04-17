const router = require('express').Router();
const ctrl = require('./export.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');

router.use(auth, tenant);
router.get('/members', ctrl.exportMembers);
router.get('/finance', ctrl.exportFinance);
router.get('/transport/students', ctrl.exportTransportStudents);

module.exports = router;
