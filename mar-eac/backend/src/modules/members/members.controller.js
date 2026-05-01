const prisma      = require('../../config/database');
const axios       = require('axios');
const cron        = require('node-cron');
const { sendEmail } = require('../../utils/mailer');
const { generateMemberCard, buildMemberCard } = require('../../utils/memberCardPdf');

const UNIQUE_ROLES = ['PRESIDENT', 'TREASURER'];

// ── WhatsApp helper (Evolution API) ─────────────────────────────────────────
const sendWA = async (phone, text, orgInstance) => {
  const rows = await prisma.platformSettings.findMany({
    where: { key: { in: ['evolution_api_url', 'evolution_api_key'] } },
  });
  const m = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const evoUrl = m['evolution_api_url'] || process.env.EVOLUTION_API_URL || '';
  const evoKey = m['evolution_api_key'] || process.env.EVOLUTION_API_KEY || '';
  if (!evoUrl) throw new Error('EVOLUTION_API_URL not set');
  const instance = orgInstance || process.env.EVOLUTION_INSTANCE || 'main';
  return axios.post(`${evoUrl}/message/sendText/${instance}`,
    { number: phone.replace(/[\s\-\+]/g, ''), textMessage: { text } },
    { headers: { apikey: evoKey, 'Content-Type': 'application/json' }, timeout: 15000 });
};

const getAll = async (req, res) => {
  try {
    const { role, search, isActive } = req.query;
    const orgId = req.organization.id;

    const where = { organizationId: orgId };
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const members = await prisma.member.findMany({
      where,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    res.json(members);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const member = await prisma.member.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const create = async (req, res) => {
  try {
    const { name, phone, email, role, joinDate } = req.body;
    const orgId = req.organization.id;

    if (!name) return res.status(400).json({ message: 'Name is required' });

    // Enforce unique roles
    if (role && UNIQUE_ROLES.includes(role)) {
      const existing = await prisma.member.findFirst({
        where: { organizationId: orgId, role, isActive: true },
      });
      if (existing) {
        return res.status(400).json({
          message: `A ${role.toLowerCase()} already exists in this organization`,
        });
      }
    }

    const member = await prisma.member.create({
      data: {
        organizationId: orgId,
        name,
        phone,
        email,
        role: role || 'MEMBER',
        joinDate: joinDate ? new Date(joinDate) : new Date(),
      },
    });

    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const update = async (req, res) => {
  try {
    const { name, phone, email, role, isActive, joinDate } = req.body;
    const orgId = req.organization.id;
    const memberId = req.params.id;

    const existing = await prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!existing) return res.status(404).json({ message: 'Member not found' });

    // Enforce unique roles (exclude current member)
    if (role && UNIQUE_ROLES.includes(role) && role !== existing.role) {
      const conflict = await prisma.member.findFirst({
        where: { organizationId: orgId, role, isActive: true, id: { not: memberId } },
      });
      if (conflict) {
        return res.status(400).json({
          message: `A ${role.toLowerCase()} already exists in this organization`,
        });
      }
    }

    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        name: name ?? existing.name,
        phone: phone ?? existing.phone,
        email: email ?? existing.email,
        role: role ?? existing.role,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        joinDate: joinDate ? new Date(joinDate) : existing.joinDate,
      },
    });

    res.json(member);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const remove = async (req, res) => {
  try {
    const member = await prisma.member.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    await prisma.member.delete({ where: { id: req.params.id } });
    res.json({ message: 'Member deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getBoardMembers = async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      where: {
        organizationId: req.organization.id,
        role: { not: 'MEMBER' },
        isActive: true,
      },
      orderBy: { role: 'asc' },
    });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const [total, active, board] = await Promise.all([
      prisma.member.count({ where: { organizationId: orgId } }),
      prisma.member.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.member.count({ where: { organizationId: orgId, role: { not: 'MEMBER' }, isActive: true } }),
    ]);
    res.json({ total, active, inactive: total - active, board });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Approve a pending join request ───────────────────────────────────────────
const approve = async (req, res) => {
  try {
    const orgId    = req.organization.id;
    const memberId = req.params.id;

    const member = await prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (member.isActive) return res.status(400).json({ message: 'Already active' });

    // Activate the member
    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { isActive: true, joinDate: new Date() },
    });

    // Fetch org for name + fee + whatsapp instance
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, nameAr: true, membershipFee: true, evolutionInstance: true, email: true },
    });

    const feeText = org?.membershipFee
      ? `\n💰 الاشتراك السنوي المدفوع: ${org.membershipFee} درهم`
      : '';
    const feeFr = org?.membershipFee
      ? `\n💰 Cotisation annuelle réglée : ${org.membershipFee} MAD`
      : '';

    const msgAr =
      `✅ تهانينا ${member.name}!\n` +
      `تم قبول طلب انضمامك إلى جمعية "${org?.nameAr || org?.name}".\n` +
      feeText +
      `\nمرحباً بك في عائلة الجمعية 🎉`;

    const msgFr =
      `✅ Félicitations ${member.name} !\n` +
      `Votre demande d'adhésion à l'association "${org?.name}" a été acceptée.` +
      feeFr +
      `\nBienvenue dans la famille de l'association 🎉`;

    const receiptHtml = `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="background:#4f46e5;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">${org?.nameAr || org?.name}</h1>
          <p style="color:#c7d2fe;margin:6px 0 0;font-size:13px">وصل انخراط / Reçu d'adhésion</p>
        </div>
        <div style="padding:24px">
          <p style="margin:0 0 16px;font-size:15px;color:#111827">السلام عليكم <strong>${member.name}</strong>،</p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151">
            يسعدنا إعلامكم بقبول طلب انضمامكم رسمياً إلى الجمعية.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151">
            <tr style="background:#f9fafb"><td style="padding:10px 14px;font-weight:600">الاسم / Nom</td><td style="padding:10px 14px">${member.name}</td></tr>
            ${member.phone ? `<tr><td style="padding:10px 14px;font-weight:600">الهاتف / Tél</td><td style="padding:10px 14px">${member.phone}</td></tr>` : ''}
            <tr style="background:#f9fafb"><td style="padding:10px 14px;font-weight:600">تاريخ الانخراط</td><td style="padding:10px 14px">${new Date().toLocaleDateString('fr-MA')}</td></tr>
            ${org?.membershipFee ? `<tr><td style="padding:10px 14px;font-weight:600">مبلغ الاشتراك</td><td style="padding:10px 14px;color:#16a34a;font-weight:700">${org.membershipFee} درهم / MAD ✅</td></tr>` : ''}
          </table>
          <p style="margin:20px 0 0;font-size:13px;color:#6b7280;text-align:center">
            شكراً لثقتكم · Merci pour votre confiance
          </p>
        </div>
      </div>`;

    // Build e-card buffer (best-effort)
    let cardBuffer = null;
    try {
      cardBuffer = await buildMemberCard(updated, org, 'ar');
    } catch (e) {
      console.warn('[approve] Card generation failed:', e.message);
    }

    // Send via chosen channel — best-effort (don't fail the approval if sending fails)
    if (member.notifyChannel === 'whatsapp' && member.phone) {
      sendWA(member.phone, msgAr, org?.evolutionInstance).catch(e =>
        console.warn('[approve] WA send failed:', e.message));
    } else if (member.email) {
      const attachments = cardBuffer
        ? [{ filename: 'carte-adherent.pdf', content: cardBuffer, contentType: 'application/pdf' }]
        : [];
      sendEmail(
        member.email,
        `✅ تم قبول انخراطك — ${org?.nameAr || org?.name}`,
        receiptHtml,
        attachments,
      ).catch(e => console.warn('[approve] Email send failed:', e.message));
    } else if (member.phone) {
      sendWA(member.phone, msgAr, org?.evolutionInstance).catch(() => {});
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Download member e-card ───────────────────────────────────────────────────
const getCard = (req, res) => generateMemberCard(req, res);

// ── Renew member subscription for current year ───────────────────────────────
const renewMember = async (req, res) => {
  try {
    const orgId    = req.organization.id;
    const memberId = req.params.id;
    const currentYear = new Date().getFullYear();

    const member = await prisma.member.findFirst({ where: { id: memberId, organizationId: orgId } });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { lastRenewalYear: currentYear, lastRenewalDate: new Date(), isActive: true },
    });

    // Fetch org info for notification
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, nameAr: true, membershipFee: true, evolutionInstance: true, email: true },
    });

    const feeAr = org?.membershipFee ? `\n💰 الاشتراك: ${org.membershipFee} درهم` : '';
    const msgAr =
      `✅ تم تجديد انخراطك في جمعية "${org?.nameAr || org?.name}" لسنة ${currentYear}.\n` +
      `مرحباً بك من جديد 🎉${feeAr}`;
    const msgFr =
      `✅ Votre adhésion à l'association "${org?.name}" a été renouvelée pour l'année ${currentYear}.\n` +
      `Bienvenue à nouveau 🎉` +
      (org?.membershipFee ? `\n💰 Cotisation : ${org.membershipFee} MAD` : '');

    if (member.phone) {
      sendWA(member.phone, msgAr, org?.evolutionInstance).catch(() => {});
    } else if (member.email) {
      const html = `<div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="background:#4f46e5;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">${org?.nameAr || org?.name}</h1>
          <p style="color:#c7d2fe;margin:6px 0 0;font-size:13px">تجديد الانخراط — ${currentYear}</p>
        </div>
        <div style="padding:24px">
          <p style="font-size:15px">السلام عليكم <strong>${member.name}</strong>،</p>
          <p style="font-size:14px;color:#374151">تم تجديد انخراطكم بنجاح لسنة <strong>${currentYear}</strong>.</p>
          ${org?.membershipFee ? `<p style="color:#16a34a;font-weight:700;font-size:15px">💰 الاشتراك: ${org.membershipFee} درهم ✅</p>` : ''}
          <p style="font-size:13px;color:#6b7280;text-align:center;margin-top:20px">شكراً لثقتكم · Merci pour votre confiance</p>
        </div>
      </div>`;
      sendEmail(member.email, `✅ تجديد الانخراط ${currentYear} — ${org?.nameAr || org?.name}`, html).catch(() => {});
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Weekly renewal reminder cron ─────────────────────────────────────────────
// Runs every Monday at 09:00. For any org that has members who have NOT renewed
// for the current year, send them a WhatsApp (or email fallback) reminder.
// Tracks `renewalRemindedAt` to avoid double-sending in the same week.
const scheduleRenewalReminders = () => {
  cron.schedule('0 9 * * 1', async () => {
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      // Find all active members who haven't renewed this year and haven't been reminded in the last 7 days
      const members = await prisma.member.findMany({
        where: {
          isActive: true,
          OR: [
            { lastRenewalYear: null },
            { lastRenewalYear: { lt: currentYear } },
          ],
          OR: [
            { renewalRemindedAt: null },
            { renewalRemindedAt: { lt: oneWeekAgo } },
          ],
        },
        include: { organization: { select: { name: true, nameAr: true, evolutionInstance: true, membershipFee: true } } },
      });

      for (const member of members) {
        const org = member.organization;
        const feeAr = org?.membershipFee ? `\n💰 الاشتراك السنوي: ${org.membershipFee} درهم` : '';
        const daysLeft = Math.ceil((new Date(currentYear, 11, 31) - now) / (1000 * 60 * 60 * 24));
        const msgAr =
          `🔔 تذكير: تجديد الانخراط في جمعية "${org?.nameAr || org?.name}".\n` +
          `سنة ${currentYear} لم يتجدد انخراطك بعد.${feeAr}\n` +
          `تبقّى ${daysLeft} يوماً على نهاية السنة — جدد الآن قبل فوات الأوان!`;
        const msgFr =
          `🔔 Rappel : Renouvellement de votre adhésion à "${org?.name}".\n` +
          `Votre adhésion pour ${currentYear} n'a pas encore été renouvelée.` +
          (org?.membershipFee ? `\n💰 Cotisation : ${org.membershipFee} MAD` : '') +
          `\nIl reste ${daysLeft} jour(s) — renouvelez avant la fin de l'année !`;

        try {
          if (member.phone) {
            await sendWA(member.phone, msgAr, org?.evolutionInstance);
          } else if (member.email) {
            const html = `<div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #fbbf24;border-radius:12px;overflow:hidden">
              <div style="background:#f59e0b;padding:20px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:18px">🔔 تذكير تجديد الانخراط</h1>
                <p style="color:#fef9c3;margin:4px 0 0;font-size:13px">${org?.nameAr || org?.name} — ${currentYear}</p>
              </div>
              <div style="padding:24px">
                <p style="font-size:15px">السلام عليكم <strong>${member.name}</strong>،</p>
                <p style="font-size:14px;color:#374151">لم يتجدد انخراطك لسنة <strong>${currentYear}</strong> بعد.</p>
                ${org?.membershipFee ? `<p style="color:#d97706;font-weight:700">💰 الاشتراك: ${org.membershipFee} درهم</p>` : ''}
                <p style="color:#dc2626;font-size:13px">⏳ تبقّى ${daysLeft} يوماً على نهاية السنة. جدد الآن!</p>
                <p style="font-size:12px;color:#6b7280;margin-top:16px;text-align:center">شكراً — ${org?.name}</p>
              </div>
            </div>`;
            await sendEmail(member.email, `🔔 تذكير تجديد الانخراط ${currentYear}`, html);
          }
          // Update remindedAt timestamp
          await prisma.member.update({ where: { id: member.id }, data: { renewalRemindedAt: now } });
        } catch (e) {
          console.warn(`[renewal-cron] Failed to remind member ${member.id}:`, e.message);
        }
      }
      console.log(`[renewal-cron] Sent renewal reminders to ${members.length} member(s).`);
    } catch (err) {
      console.error('[renewal-cron] Error:', err.message);
    }
  });
  console.log('[Cron] Renewal reminder scheduler started (every Monday 09:00)');
};

module.exports = { getAll, getById, create, update, remove, getBoardMembers, getStats, approve, getCard, renewMember, scheduleRenewalReminders };
