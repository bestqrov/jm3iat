const router = require('express').Router();
const ctrl = require('./voting.controller');
const { auth } = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');

router.use(auth, tenant);

router.get('/meetings/:meetingId/sessions', ctrl.getSessions);
router.post('/meetings/:meetingId/sessions', ctrl.createSession);
router.post('/sessions/:sessionId/vote', ctrl.castVote);
router.put('/sessions/:sessionId/close', ctrl.closeSession);
router.get('/sessions/:sessionId/results', ctrl.getResults);

module.exports = router;
