const router = require('express').Router();
const ctrl = require('./meetings.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requireOrgRole } = require('../../middleware/permission');
const upload = require('../../utils/multer');

router.use(auth, tenant, requireOrgRole('SECRETARY'));

router.get('/stats', ctrl.getStats);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/attendees', ctrl.addAttendees);
router.put('/:id/attendance', ctrl.markAttendance);
router.post('/:id/decisions', ctrl.addDecision);
router.put('/:id/decisions/:decisionId', ctrl.updateDecision);
router.post('/:id/pv/upload', upload.single('file'), ctrl.uploadPV);
router.get('/:id/pv/generate', ctrl.generatePV);

module.exports = router;
