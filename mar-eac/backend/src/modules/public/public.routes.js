const router = require('express').Router();
const ctrl = require('./public.controller');

// No auth required — public routes
router.get('/contact', ctrl.getSupportContact);
router.get('/:slug', ctrl.getPublicProfile);
router.post('/:slug/join', ctrl.submitJoinRequest);

module.exports = router;
