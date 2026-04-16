const router = require('express').Router();
const ctrl   = require('./marketing.controller');
const { auth }        = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');

// All marketing routes require authentication.
// Only SUPER_ADMIN and ADMIN can send campaigns.
router.use(auth);

// ── Campaign actions ──────────────────────────────────────────────────────────
router.post('/send',                requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.send);
router.get('/campaigns',            requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.getCampaigns);
router.delete('/campaigns/:id',     requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.deleteCampaign);

// ── Utilities (read-only — any authenticated user) ───────────────────────────
router.get('/templates',            ctrl.getTemplates);
router.post('/preview-segment',     requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.previewSegment);

module.exports = router;
