const nodemailer = require('nodemailer');
const prisma = require('../config/database');

const getSmtpConfig = async () => {
  const rows = await prisma.platformSettings.findMany({
    where: { key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'] } },
  });
  const m = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    host: m['smtp_host'] || process.env.SMTP_HOST || '',
    port: parseInt(m['smtp_port'] || process.env.SMTP_PORT || '587', 10),
    user: m['smtp_user'] || process.env.SMTP_USER || '',
    pass: m['smtp_pass'] || process.env.SMTP_PASS || '',
    from: m['smtp_from'] || process.env.SMTP_FROM || m['smtp_user'] || process.env.SMTP_USER || '',
  };
};

const sendEmail = async (to, subject, html) => {
  const { host, port, user, pass, from } = await getSmtpConfig();
  if (!host || !user || !pass) throw new Error('Email not configured');
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter.sendMail({ from: `Mar E-A.C <${from}>`, to, subject, html });
};

module.exports = { sendEmail, getSmtpConfig };
