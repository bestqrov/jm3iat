const prisma = require('../../config/database');

const orgId = (req) => req.organization.id;

// ── Stats ─────────────────────────────────────────────────────────────────────

const getStats = async (req, res) => {
  try {
    const id = orgId(req);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const [
      totalStudents, activeStudents, totalVehicles, activeVehicles,
      totalRoutes, paidSubs, unpaidSubs, monthRevenue,
    ] = await Promise.all([
      prisma.transportStudent.count({ where: { organizationId: id } }),
      prisma.transportStudent.count({ where: { organizationId: id, isActive: true } }),
      prisma.transportVehicle.count({ where: { organizationId: id } }),
      prisma.transportVehicle.count({ where: { organizationId: id, status: 'ACTIVE' } }),
      prisma.transportRoute.count({ where: { organizationId: id } }),
      prisma.transportSubscription.count({ where: { organizationId: id, status: 'PAID', month, year } }),
      prisma.transportSubscription.count({ where: { organizationId: id, status: 'UNPAID', month, year } }),
      prisma.transportPayment.aggregate({
        where: { organizationId: id, date: { gte: new Date(year, month - 1, 1) } },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      totalStudents, activeStudents, totalVehicles, activeVehicles,
      totalRoutes, paidSubs, unpaidSubs,
      monthRevenue: monthRevenue._sum.amount || 0,
      currentMonth: month, currentYear: year,
    });
  } catch (err) {
    console.error('[transport/stats]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Vehicles ──────────────────────────────────────────────────────────────────

const getVehicles = async (req, res) => {
  try {
    const vehicles = await prisma.transportVehicle.findMany({
      where: { organizationId: orgId(req) },
      include: {
        _count: { select: { students: true, routes: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createVehicle = async (req, res) => {
  try {
    const { name, plateNumber, capacity, driverName, driverPhone, status, notes } = req.body;
    if (!name || !plateNumber) return res.status(400).json({ message: 'Name and plate number required' });

    const vehicle = await prisma.transportVehicle.create({
      data: {
        organizationId: orgId(req),
        name, plateNumber,
        capacity: parseInt(capacity) || 20,
        driverName, driverPhone, status: status || 'ACTIVE', notes,
      },
    });
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const { name, plateNumber, capacity, driverName, driverPhone, status, notes } = req.body;
    const vehicle = await prisma.transportVehicle.updateMany({
      where: { id: req.params.id, organizationId: orgId(req) },
      data: { name, plateNumber, capacity: parseInt(capacity) || undefined, driverName, driverPhone, status, notes },
    });
    if (!vehicle.count) return res.status(404).json({ message: 'Not found' });
    const updated = await prisma.transportVehicle.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    await prisma.transportVehicle.deleteMany({
      where: { id: req.params.id, organizationId: orgId(req) },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Students ──────────────────────────────────────────────────────────────────

const getStudents = async (req, res) => {
  try {
    const { search, vehicleId, routeId, isActive } = req.query;
    const where = { organizationId: orgId(req) };
    if (search) where.fullName = { contains: search, mode: 'insensitive' };
    if (vehicleId) where.assignedVehicleId = vehicleId;
    if (routeId)   where.routeId = routeId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const students = await prisma.transportStudent.findMany({
      where,
      include: {
        vehicle: { select: { id: true, name: true, plateNumber: true } },
        route:   { select: { id: true, routeName: true } },
      },
      orderBy: { fullName: 'asc' },
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createStudent = async (req, res) => {
  try {
    const { fullName, school, address, phone, parentName, parentPhone, assignedVehicleId, routeId } = req.body;
    if (!fullName) return res.status(400).json({ message: 'Full name required' });

    const student = await prisma.transportStudent.create({
      data: {
        organizationId: orgId(req),
        fullName, school, address, phone, parentName, parentPhone,
        assignedVehicleId: assignedVehicleId || null,
        routeId: routeId || null,
      },
      include: {
        vehicle: { select: { id: true, name: true, plateNumber: true } },
        route:   { select: { id: true, routeName: true } },
      },
    });
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { fullName, school, address, phone, parentName, parentPhone, assignedVehicleId, routeId, isActive } = req.body;
    const r = await prisma.transportStudent.updateMany({
      where: { id: req.params.id, organizationId: orgId(req) },
      data: {
        fullName, school, address, phone, parentName, parentPhone,
        assignedVehicleId: assignedVehicleId || null,
        routeId: routeId || null,
        isActive,
      },
    });
    if (!r.count) return res.status(404).json({ message: 'Not found' });
    const updated = await prisma.transportStudent.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: { select: { id: true, name: true, plateNumber: true } },
        route:   { select: { id: true, routeName: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteStudent = async (req, res) => {
  try {
    await prisma.transportStudent.deleteMany({
      where: { id: req.params.id, organizationId: orgId(req) },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Routes ────────────────────────────────────────────────────────────────────

const getRoutes = async (req, res) => {
  try {
    const routes = await prisma.transportRoute.findMany({
      where: { organizationId: orgId(req) },
      include: {
        vehicle:  { select: { id: true, name: true, plateNumber: true } },
        _count:   { select: { students: true } },
      },
      orderBy: { routeName: 'asc' },
    });
    res.json(routes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createRoute = async (req, res) => {
  try {
    const { routeName, stops, assignedVehicleId, notes } = req.body;
    if (!routeName) return res.status(400).json({ message: 'Route name required' });

    const route = await prisma.transportRoute.create({
      data: {
        organizationId: orgId(req),
        routeName,
        stops: Array.isArray(stops) ? stops : (stops ? stops.split(',').map(s => s.trim()).filter(Boolean) : []),
        assignedVehicleId: assignedVehicleId || null,
        notes,
      },
      include: {
        vehicle: { select: { id: true, name: true, plateNumber: true } },
        _count:  { select: { students: true } },
      },
    });
    res.status(201).json(route);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateRoute = async (req, res) => {
  try {
    const { routeName, stops, assignedVehicleId, notes } = req.body;
    const r = await prisma.transportRoute.updateMany({
      where: { id: req.params.id, organizationId: orgId(req) },
      data: {
        routeName,
        stops: Array.isArray(stops) ? stops : (stops ? stops.split(',').map(s => s.trim()).filter(Boolean) : undefined),
        assignedVehicleId: assignedVehicleId || null,
        notes,
      },
    });
    if (!r.count) return res.status(404).json({ message: 'Not found' });
    const updated = await prisma.transportRoute.findUnique({
      where: { id: req.params.id },
      include: { vehicle: { select: { id: true, name: true, plateNumber: true } }, _count: { select: { students: true } } },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteRoute = async (req, res) => {
  try {
    await prisma.transportRoute.deleteMany({ where: { id: req.params.id, organizationId: orgId(req) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Subscriptions ─────────────────────────────────────────────────────────────

const getSubscriptions = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = parseInt(month) || now.getMonth() + 1;
    const y = parseInt(year)  || now.getFullYear();

    const subs = await prisma.transportSubscription.findMany({
      where: { organizationId: orgId(req), month: m, year: y },
      include: {
        student: {
          select: { id: true, fullName: true, school: true, phone: true, assignedVehicleId: true,
            vehicle: { select: { name: true } } },
        },
      },
      orderBy: { student: { fullName: 'asc' } },
    });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const bulkCreateSubscriptions = async (req, res) => {
  try {
    const { month, year, monthlyFee } = req.body;
    if (!month || !year || !monthlyFee) return res.status(400).json({ message: 'month, year, monthlyFee required' });
    const id = orgId(req);

    const students = await prisma.transportStudent.findMany({ where: { organizationId: id, isActive: true } });
    const created = [];
    for (const s of students) {
      try {
        const sub = await prisma.transportSubscription.upsert({
          where: { studentId_month_year: { studentId: s.id, month: parseInt(month), year: parseInt(year) } },
          create: { organizationId: id, studentId: s.id, monthlyFee: parseFloat(monthlyFee), month: parseInt(month), year: parseInt(year), status: 'UNPAID' },
          update: { monthlyFee: parseFloat(monthlyFee) },
        });
        created.push(sub);
      } catch (_) {}
    }
    res.json({ created: created.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSubscription = async (req, res) => {
  try {
    const { status, monthlyFee, notes } = req.body;
    const data = {};
    if (status) { data.status = status; if (status === 'PAID') data.paidAt = new Date(); }
    if (monthlyFee) data.monthlyFee = parseFloat(monthlyFee);
    if (notes !== undefined) data.notes = notes;

    const r = await prisma.transportSubscription.updateMany({
      where: { id: req.params.id, organizationId: orgId(req) },
      data,
    });
    if (!r.count) return res.status(404).json({ message: 'Not found' });
    const updated = await prisma.transportSubscription.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, fullName: true } } },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Payments ──────────────────────────────────────────────────────────────────

const getPayments = async (req, res) => {
  try {
    const { month, year, studentId } = req.query;
    const where = { organizationId: orgId(req) };
    if (studentId) where.studentId = studentId;
    if (month && year) {
      const m = parseInt(month), y = parseInt(year);
      where.date = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) };
    }
    const payments = await prisma.transportPayment.findMany({
      where,
      include: { student: { select: { id: true, fullName: true, school: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createPayment = async (req, res) => {
  try {
    const { studentId, amount, date, method, notes } = req.body;
    if (!studentId || !amount) return res.status(400).json({ message: 'studentId and amount required' });
    const id = orgId(req);

    // Create payment record
    const payment = await prisma.transportPayment.create({
      data: {
        organizationId: id,
        studentId,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        method: method || 'CASH',
        status: 'PAID',
        notes,
      },
      include: { student: { select: { id: true, fullName: true, school: true } } },
    });

    // Auto-create finance transaction (income)
    try {
      const student = payment.student;
      const tx = await prisma.transaction.create({
        data: {
          organizationId: id,
          type: 'INCOME',
          amount: parseFloat(amount),
          category: 'Transport',
          description: `Abonnement transport — ${student.fullName}`,
          date: date ? new Date(date) : new Date(),
          reference: method || 'CASH',
        },
      });
      await prisma.transportPayment.update({
        where: { id: payment.id },
        data: { transactionId: tx.id },
      });
    } catch (_) {}

    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deletePayment = async (req, res) => {
  try {
    const payment = await prisma.transportPayment.findFirst({
      where: { id: req.params.id, organizationId: orgId(req) },
    });
    if (!payment) return res.status(404).json({ message: 'Not found' });
    if (payment.transactionId) {
      await prisma.transaction.deleteMany({ where: { id: payment.transactionId } });
    }
    await prisma.transportPayment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Attendance ────────────────────────────────────────────────────────────────

const getAttendance = async (req, res) => {
  try {
    const { date, vehicleId } = req.query;
    const id = orgId(req);
    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const dayEnd   = new Date(dayStart.getTime() + 86400000 - 1);

    const studentWhere = { organizationId: id, isActive: true };
    if (vehicleId) studentWhere.assignedVehicleId = vehicleId;
    const students = await prisma.transportStudent.findMany({
      where: studentWhere,
      select: { id: true, fullName: true, school: true, assignedVehicleId: true,
        vehicle: { select: { name: true } } },
      orderBy: { fullName: 'asc' },
    });

    const records = await prisma.transportAttendance.findMany({
      where: { organizationId: id, date: { gte: dayStart, lte: dayEnd } },
    });
    const recordMap = Object.fromEntries(records.map(r => [r.studentId, r]));

    const result = students.map(s => ({
      student: s,
      attendance: recordMap[s.id] || null,
      status: recordMap[s.id]?.status || null,
    }));
    res.json({ date: dayStart, students: result });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const markAttendance = async (req, res) => {
  try {
    const { studentId, date, status } = req.body;
    if (!studentId || !date || !status) return res.status(400).json({ message: 'studentId, date, status required' });
    const id = orgId(req);
    const d  = new Date(date);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const record = await prisma.transportAttendance.upsert({
      where: { studentId_date: { studentId, date: dayStart } },
      create: { organizationId: id, studentId, date: dayStart, status },
      update: { status },
    });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const bulkMarkAttendance = async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) return res.status(400).json({ message: 'date and records[] required' });
    const id = orgId(req);
    const d  = new Date(date);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    for (const { studentId, status } of records) {
      if (!studentId || !status) continue;
      await prisma.transportAttendance.upsert({
        where: { studentId_date: { studentId, date: dayStart } },
        create: { organizationId: id, studentId, date: dayStart, status },
        update: { status },
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Expenses ──────────────────────────────────────────────────────────────────

const getExpenses = async (req, res) => {
  try {
    const expenses = await prisma.transportExpense.findMany({
      where: { organizationId: orgId(req) },
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createExpense = async (req, res) => {
  try {
    const { vehicleId, category, amount, date, description } = req.body;
    if (!category || !amount) return res.status(400).json({ message: 'category and amount required' });
    const id = orgId(req);

    const expense = await prisma.transportExpense.create({
      data: {
        organizationId: id,
        vehicleId: vehicleId || null,
        category,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        description,
      },
    });

    // Auto-create finance transaction (expense)
    try {
      const CATS = { FUEL: 'Carburant', MAINTENANCE: 'Maintenance', INSURANCE: 'Assurance', OTHER: 'Transport' };
      const tx = await prisma.transaction.create({
        data: {
          organizationId: id,
          type: 'EXPENSE',
          amount: parseFloat(amount),
          category: CATS[category] || 'Transport',
          description: description || `Dépense transport — ${category}`,
          date: date ? new Date(date) : new Date(),
        },
      });
      await prisma.transportExpense.update({ where: { id: expense.id }, data: { transactionId: tx.id } });
    } catch (_) {}

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await prisma.transportExpense.findFirst({
      where: { id: req.params.id, organizationId: orgId(req) },
    });
    if (!expense) return res.status(404).json({ message: 'Not found' });
    if (expense.transactionId) {
      await prisma.transaction.deleteMany({ where: { id: expense.transactionId } });
    }
    await prisma.transportExpense.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getStats,
  getVehicles, createVehicle, updateVehicle, deleteVehicle,
  getStudents, createStudent, updateStudent, deleteStudent,
  getRoutes,   createRoute,  updateRoute,  deleteRoute,
  getSubscriptions, bulkCreateSubscriptions, updateSubscription,
  getPayments, createPayment, deletePayment,
  getAttendance, markAttendance, bulkMarkAttendance,
  getExpenses, createExpense, deleteExpense,
};
