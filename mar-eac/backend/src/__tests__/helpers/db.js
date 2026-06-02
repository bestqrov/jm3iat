const prisma = require('../../config/database');

const cleanDb = async () => {
  const collections = [
    'reminder', 'notification', 'whatsAppMessage', 'activityLog',
    'transaction', 'transactionCategory', 'member',
    'meetingAttendee', 'meetingDecision', 'meeting',
    'milestone', 'project', 'subscription',
    'user', 'organization',
  ];

  for (const col of collections) {
    try {
      await prisma[col].deleteMany();
    } catch (_) {
      // collection may not exist or may be embedded — skip silently
    }
  }
};

module.exports = { cleanDb };
