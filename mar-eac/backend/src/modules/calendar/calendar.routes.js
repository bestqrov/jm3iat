const router = require('express').Router();
const { getEvents } = require('./calendar.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');

router.use(auth, tenant);
router.get('/', getEvents);

module.exports = router;
