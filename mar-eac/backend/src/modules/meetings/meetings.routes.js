const router = require('express').Router();
const ctrl = require('./meetings.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requireOrgRole } = require('../../middleware/permission');
const { logActivity } = require('../activity/activity.controller');
const upload = require('../../utils/multer');

router.use(auth, tenant, requireOrgRole('SECRETARY'));

router.get('/stats', ctrl.getStats);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/',      logActivity('CREATE', 'MEETING',  (req, b) => `إنشاء اجتماع: ${b?.title || ''}`),   ctrl.create);
router.put('/:id',    logActivity('UPDATE', 'MEETING',  (req, b) => `تعديل اجتماع: ${b?.title || ''}`),   ctrl.update);
router.delete('/:id', logActivity('DELETE', 'MEETING',  ()       => `حذف اجتماع`),                         ctrl.remove);
router.post('/:id/attendees', ctrl.addAttendees);
router.put('/:id/attendance', ctrl.markAttendance);
router.post('/:id/decisions', logActivity('CREATE', 'DECISION', (req, b) => `إضافة قرار: ${b?.description?.slice(0,40) || ''}`), ctrl.addDecision);
router.put('/:id/decisions/:decisionId', ctrl.updateDecision);
router.post('/:id/pv/upload', upload.single('file'), ctrl.uploadPV);
router.get('/:id/pv/generate', ctrl.generatePV);

module.exports = router;
