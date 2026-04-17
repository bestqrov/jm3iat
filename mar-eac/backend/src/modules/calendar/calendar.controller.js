const prisma = require('../../config/database');

const orgId = (req) => req.organization.id;

const getEvents = async (req, res) => {
  try {
    const { from, to } = req.query;
    const id = orgId(req);
    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const [meetings, reminders, transportAttendances] = await Promise.all([
      prisma.meeting.findMany({
        where: { organizationId: id, ...(from || to ? { date: dateFilter } : {}) },
        select: { id: true, title: true, date: true, location: true, status: true },
      }),
      prisma.reminder.findMany({
        where: { organizationId: id, ...(from || to ? { dueDate: dateFilter } : {}) },
        select: { id: true, title: true, dueDate: true, status: true, priority: true },
      }),
      prisma.transportAttendance.findMany({
        where: { organizationId: id, ...(from || to ? { date: dateFilter } : {}) },
        select: { id: true, date: true, studentId: true, status: true },
        take: 100,
      }),
    ]);

    const events = [
      ...meetings.map(m => ({
        id: m.id, type: 'meeting', title: m.title,
        date: m.date, color: '#4f46e5', link: '/meetings',
        meta: { location: m.location, status: m.status },
      })),
      ...reminders.map(r => ({
        id: r.id, type: 'reminder', title: r.title,
        date: r.dueDate, color: r.priority === 'HIGH' ? '#dc2626' : '#f59e0b', link: '/reminders',
        meta: { status: r.status, priority: r.priority },
      })),
    ];

    res.json({ events, counts: { meetings: meetings.length, reminders: reminders.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getEvents };
