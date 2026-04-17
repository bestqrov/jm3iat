const router = require('express').Router();
const { getLogs } = require('./activity.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');

router.use(auth, tenant);
router.get('/', getLogs);

module.exports = router;
