const router = require('express').Router();
const ctrl = require('./auth.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const upload = require('../../utils/multer');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.get('/me', auth, ctrl.getMe);
router.put('/profile', auth, ctrl.updateProfile);
router.put('/organization', auth, tenant, ctrl.updateOrganization);
router.post('/organization/logo', auth, tenant, upload.single('logo'), ctrl.uploadLogo);
router.post('/subscription/upgrade', auth, ctrl.upgradeSubscription);
router.post('/subscription/cancel-downgrade', auth, ctrl.cancelDowngrade);

module.exports = router;
