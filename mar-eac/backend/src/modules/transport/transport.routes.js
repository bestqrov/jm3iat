const router = require('express').Router();
const ctrl   = require('./transport.controller');
const { auth }   = require('../../middleware/auth');
const { tenant } = require('../../middleware/tenant');
const { requireModule } = require('../../middleware/module');

router.use(auth, tenant, requireModule('TRANSPORT'));

// Stats
router.get('/stats', ctrl.getStats);

// Drivers
router.get   ('/drivers',     ctrl.getDrivers);
router.post  ('/drivers',     ctrl.createDriver);
router.put   ('/drivers/:id', ctrl.updateDriver);
router.delete('/drivers/:id', ctrl.deleteDriver);

// Vehicles
router.get   ('/vehicles',     ctrl.getVehicles);
router.post  ('/vehicles',     ctrl.createVehicle);
router.put   ('/vehicles/:id', ctrl.updateVehicle);
router.delete('/vehicles/:id', ctrl.deleteVehicle);

// Students
router.get   ('/students',     ctrl.getStudents);
router.post  ('/students',     ctrl.createStudent);
router.put   ('/students/:id', ctrl.updateStudent);
router.delete('/students/:id', ctrl.deleteStudent);

// Routes
router.get   ('/routes',     ctrl.getRoutes);
router.post  ('/routes',     ctrl.createRoute);
router.put   ('/routes/:id', ctrl.updateRoute);
router.delete('/routes/:id', ctrl.deleteRoute);

// Subscriptions
router.get ('/subscriptions',      ctrl.getSubscriptions);
router.post('/subscriptions/bulk', ctrl.bulkCreateSubscriptions);
router.put ('/subscriptions/:id',  ctrl.updateSubscription);

// Payments
router.get   ('/payments',     ctrl.getPayments);
router.post  ('/payments',     ctrl.createPayment);
router.delete('/payments/:id', ctrl.deletePayment);

// Attendance
router.get ('/attendance',      ctrl.getAttendance);
router.post('/attendance',      ctrl.markAttendance);
router.post('/attendance/bulk', ctrl.bulkMarkAttendance);

// Expenses
router.get   ('/expenses',     ctrl.getExpenses);
router.post  ('/expenses',     ctrl.createExpense);
router.delete('/expenses/:id', ctrl.deleteExpense);

module.exports = router;
