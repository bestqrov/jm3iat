const router = require('express').Router();
const ctrl   = require('./whatsapp.controller');
const { auth }   = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');

router.use(auth, tenant);

router.get('/status',       ctrl.getStatus);
router.get('/qr',           ctrl.getQr);
router.post('/confirm',     ctrl.confirmConnected);
router.delete('/disconnect', ctrl.disconnect);

module.exports = router;
