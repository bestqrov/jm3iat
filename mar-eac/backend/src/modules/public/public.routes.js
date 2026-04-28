const router = require('express').Router();
const ctrl   = require('./public.controller');
const upload = require('../../utils/multer');

// No auth required — public routes
router.get('/contact',              ctrl.getSupportContact);
router.get('/:slug',                ctrl.getPublicProfile);
router.post('/:slug/join',          ctrl.submitJoinRequest);
router.post('/:slug/receipt',       upload.single('receipt'), ctrl.uploadPaymentReceipt);

module.exports = router;
