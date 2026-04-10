const router = require('express').Router();
const ctrl = require('./auth.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', auth, ctrl.getMe);
router.put('/profile', auth, ctrl.updateProfile);
router.put('/organization', auth, tenant, ctrl.updateOrganization);
router.post('/subscription/upgrade', auth, ctrl.upgradeSubscription);

module.exports = router;
