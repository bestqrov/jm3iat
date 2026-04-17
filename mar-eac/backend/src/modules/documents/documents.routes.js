const router = require('express').Router();
const ctrl = require('./documents.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requireOrgRole } = require('../../middleware/permission');
const upload = require('../../utils/multer');

router.use(auth, tenant, requireOrgRole('SECRETARY'));

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', upload.single('file'), ctrl.upload);
router.delete('/:id', ctrl.remove);
router.get('/:id/download', ctrl.download);

module.exports = router;
