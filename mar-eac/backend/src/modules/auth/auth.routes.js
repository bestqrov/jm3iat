const router = require('express').Router();
const ctrl = require('./auth.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const upload = require('../../utils/multer');
const multer = require('multer');

// Logo upload uses memory storage — no filesystem dependency (safe on Railway)
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Image only'), false);
  },
});

router.post('/register', ctrl.register);
router.get('/validate-promo', ctrl.validatePromoCode);
router.post('/login', ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.get('/me', auth, ctrl.getMe);
router.put('/profile', auth, ctrl.updateProfile);
router.put('/organization', auth, tenant, ctrl.updateOrganization);
router.post('/organization/logo', auth, tenant, logoUpload.single('logo'), ctrl.uploadLogo);
router.post('/subscription/upgrade', auth, ctrl.upgradeSubscription);
router.post('/subscription/cancel-downgrade', auth, ctrl.cancelDowngrade);
router.post('/addon/toggle', auth, tenant, ctrl.toggleAddon);
router.post('/request-conversion', auth, tenant, ctrl.requestConversion);

module.exports = router;
