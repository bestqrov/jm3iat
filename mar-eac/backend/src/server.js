require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
const allowedOrigins = [
  'https://mareac.digima.cloud',
  'http://localhost:3000',
  'http://localhost:5173',
];
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach(o => {
    const trimmed = o.trim();
    if (!allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed);
  });
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(uploadDir)));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), service: 'Mar E-A.C API' });
});

// Routes
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/members', require('./modules/members/members.routes'));
app.use('/api/meetings', require('./modules/meetings/meetings.routes'));
app.use('/api/voting', require('./modules/voting/voting.routes'));
app.use('/api/finance', require('./modules/finance/finance.routes'));
app.use('/api/documents', require('./modules/documents/documents.routes'));
app.use('/api/reports', require('./modules/reports/reports.routes'));
app.use('/api/projects', require('./modules/projects/projects.routes'));
app.use('/api/funding', require('./modules/funding/funding.routes'));
app.use('/api/requests', require('./modules/requests/requests.routes'));
app.use('/api/water', require('./modules/water/water.routes'));
app.use('/api/reminders', require('./modules/reminders/reminders.routes'));
app.use('/api/assoc', require('./modules/assoc/assoc.routes'));
app.use('/api/superadmin', require('./modules/superadmin/superadmin.routes'));
app.use('/api/marketing',  require('./modules/marketing/marketing.routes'));
app.use('/api/whatsapp',   require('./modules/whatsapp/whatsapp.routes'));
app.use('/api/transport',  require('./modules/transport/transport.routes'));
app.use('/api/settings/staff', require('./modules/settings/staff.routes'));
app.use('/api/activity',       require('./modules/activity/activity.routes'));
app.use('/api/notifications',  require('./modules/notifications/notifications.routes'));
app.use('/api/recurring',      require('./modules/recurring/recurring.routes'));
app.use('/api/export',         require('./modules/export/export.routes'));
app.use('/api/calendar',       require('./modules/calendar/calendar.routes'));
app.use('/api/public',         require('./modules/public/public.routes'));

// Serve frontend static files (single-service deployment)
const possibleDists = [
  path.join(__dirname, '../frontend-dist'),        // /app/backend/frontend-dist
  path.join(__dirname, '../../frontend/dist'),     // /app/frontend/dist
  path.join(process.cwd(), 'frontend-dist'),       // cwd/frontend-dist
  path.join(process.cwd(), '../frontend/dist'),    // cwd/../frontend/dist
];

console.log('Looking for frontend dist in:', possibleDists);
const frontendDist = possibleDists.find(p => fs.existsSync(p));
console.log('Frontend dist found at:', frontendDist || 'NOT FOUND');

if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// Start cron jobs
const { scheduleMonthlyReminders } = require('./modules/reminders/reminders.controller');
scheduleMonthlyReminders();

// Process automation rules + trial expiry reminders every day at 09:00
const { processAutomationRules, sendTrialExpiryReminders } = require('./modules/superadmin/superadmin.controller');
const cron = require('node-cron');

cron.schedule('0 9 * * *', async () => {
  try { await processAutomationRules(); } catch (err) { console.error('[automation cron] error:', err.message); }
  try { await sendTrialExpiryReminders(); } catch (err) { console.error('[trial-reminder cron] error:', err.message); }
});

// Process recurring payments daily at 08:00
const { processDue: processRecurring } = require('./modules/recurring/recurring.controller');
cron.schedule('0 8 * * *', async () => {
  try { await processRecurring(); } catch (err) { console.error('[recurring cron] error:', err.message); }
});

// Process scheduled marketing campaigns every 5 minutes
const { processScheduled } = require('./modules/marketing/marketing.service');
setInterval(async () => {
  try {
    const results = await processScheduled();
    if (results.length) console.log(`[marketing cron] processed ${results.length} scheduled campaign(s)`);
  } catch (err) {
    console.error('[marketing cron] error:', err.message);
  }
}, 5 * 60 * 1000); // every 5 min

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Mar E-A.C API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
});

module.exports = app;
