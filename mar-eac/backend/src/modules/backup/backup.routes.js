const router = require('express').Router();
const ctrl   = require('./backup.controller');
const { auth }   = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');

router.use(auth, tenant);

router.post  ('/toggle',  ctrl.toggleBackup);
router.get   ('/',        ctrl.listBackups);
router.post  ('/create',  ctrl.createBackup);

module.exports = router;
