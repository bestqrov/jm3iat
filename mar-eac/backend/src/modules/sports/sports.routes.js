const router = require('express').Router();
const ctrl   = require('./sports.controller');
const { auth }          = require('../../middleware/auth');
const { tenant }        = require('../../middleware/tenant');
const { requireModule } = require('../../middleware/module');

router.use(auth, tenant, requireModule('SPORTS'));

// Stats
router.get('/stats', ctrl.getStats);

// Teams
router.get   ('/teams',     ctrl.getTeams);
router.post  ('/teams',     ctrl.createTeam);
router.put   ('/teams/:id', ctrl.updateTeam);
router.delete('/teams/:id', ctrl.deleteTeam);

// Players
router.get   ('/players',     ctrl.getPlayers);
router.post  ('/players',     ctrl.createPlayer);
router.put   ('/players/:id', ctrl.updatePlayer);
router.delete('/players/:id', ctrl.deletePlayer);

// Trainings
router.get   ('/trainings',     ctrl.getTrainings);
router.post  ('/trainings',     ctrl.createTraining);
router.put   ('/trainings/:id', ctrl.updateTraining);
router.delete('/trainings/:id', ctrl.deleteTraining);
router.post  ('/trainings/attendance', ctrl.markAttendance);

// Matches
router.get   ('/matches',              ctrl.getMatches);
router.post  ('/matches',              ctrl.createMatch);
router.put   ('/matches/:id',          ctrl.updateMatch);
router.delete('/matches/:id',          ctrl.deleteMatch);
router.post  ('/matches/:matchId/stats', ctrl.upsertMatchStat);

module.exports = router;
