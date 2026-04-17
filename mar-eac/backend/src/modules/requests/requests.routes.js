const router = require('express').Router();
const ctrl = require('./requests.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');

router.use(auth, tenant);

router.get('/stats',           ctrl.getStats);
router.get('/templates',       ctrl.getTemplates);
router.get('/',                ctrl.getAll);
router.get('/:id',             ctrl.getById);
router.get('/:id/pdf',         ctrl.generateLetterPdf);
router.post('/',               ctrl.create);
router.post('/:id/send',       ctrl.sendLetter);
router.put('/:id',             ctrl.update);
router.delete('/:id',          ctrl.remove);

module.exports = router;
