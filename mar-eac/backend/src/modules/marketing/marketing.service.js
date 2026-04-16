/**
 * marketing.service.js
 *
 * Pure business logic — no req/res here.
 * Responsible for:
 *   1. Resolving recipients from segmentation
 *   2. Firing the n8n webhook
 *   3. Persisting campaign records
 */

const axios  = require('axios');
const prisma  = require('../../config/database');

// ─── Config ──────────────────────────────────────────────────────────────────

const N8N_URL    = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/marketing';
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || '';   // optional HMAC / bearer

// ─── Segmentation resolver ───────────────────────────────────────────────────

/**
 * Returns a Prisma `where` clause and the matching organizations.
 * Each segment maps to a concrete DB filter.
 */
const resolveSegmentation = async (segmentation = []) => {
  const segs = Array.isArray(segmentation) ? segmentation : [segmentation];

  if (!segs.length || segs.includes('all')) {
    return prisma.organization.findMany({
      select: { id: true, name: true, phone: true, email: true, modules: true },
    });
  }

  const conditions = [];

  if (segs.includes('trial_expired')) {
    conditions.push({ subscription: { status: 'EXPIRED' } });
  }
  if (segs.includes('inactive_users')) {
    // Orgs whose subscription is CANCELLED or have had no activity
    conditions.push({ subscription: { status: 'CANCELLED' } });
  }
  if (segs.includes('water_users')) {
    conditions.push({ modules: { has: 'WATER' } });
  }
  if (segs.includes('productive_orgs')) {
    conditions.push({ modules: { has: 'PRODUCTIVE' } });
  }
  if (segs.includes('trial_active')) {
    conditions.push({ subscription: { status: 'TRIAL' } });
  }
  if (segs.includes('active')) {
    conditions.push({ subscription: { status: 'ACTIVE' } });
  }
  if (segs.includes('by_pack')) {
    // by_pack without a packId = all orgs with any subscription
    conditions.push({ subscription: { isNot: null } });
  }

  const where = conditions.length === 1 ? conditions[0] : { OR: conditions };

  return prisma.organization.findMany({
    where,
    select: { id: true, name: true, phone: true, email: true, modules: true },
  });
};

// ─── n8n dispatcher ──────────────────────────────────────────────────────────

/**
 * Sends campaign payload to n8n webhook.
 * Returns { ok: true } on success or { ok: false, error } on failure.
 */
const dispatchToN8n = async (payload) => {
  const headers = { 'Content-Type': 'application/json' };
  if (N8N_SECRET) headers['Authorization'] = `Bearer ${N8N_SECRET}`;

  try {
    const res = await axios.post(N8N_URL, payload, { headers, timeout: 15000 });
    return { ok: true, status: res.status, data: res.data };
  } catch (err) {
    const detail = err?.response?.data || err.message;
    return { ok: false, error: detail };
  }
};

// ─── Persist campaign ─────────────────────────────────────────────────────────

const persistCampaign = (data) =>
  prisma.marketingCampaign.create({ data });

const updateCampaignStatus = (id, status, extra = {}) =>
  prisma.marketingCampaign.update({ where: { id }, data: { status, ...extra } });

// ─── Core service functions ───────────────────────────────────────────────────

/**
 * sendNow — resolve recipients, fire n8n, persist, return result.
 */
const sendNow = async ({
  campaignType,
  segmentation,
  messageContent,
  channel,
  sendType,
  phoneManual,
  tracking,
  automationEnabled,
  automationTrigger,
  organizationId,   // optional: scope to a single org
}) => {
  // 1. Resolve target list
  let recipients = [];
  if (sendType === 'manual' && phoneManual) {
    recipients = [{ id: null, name: null, phone: phoneManual, email: null }];
  } else {
    recipients = await resolveSegmentation(segmentation);
    // If scoped to one org, filter
    if (organizationId) {
      recipients = recipients.filter(r => r.id === organizationId);
    }
  }

  const recipientCount = recipients.length;

  // 2. Persist as DRAFT first (we get an ID to track)
  const campaign = await persistCampaign({
    campaignType:      campaignType || 'no_template',
    sendType:          sendType     || 'bulk',
    channel:           channel      || 'whatsapp',
    segmentation:      segmentation || [],
    messageContent,
    scheduleType:      'now',
    automationEnabled: automationEnabled || false,
    automationTrigger: automationEnabled ? (automationTrigger || null) : null,
    tracking:          tracking || { sent: false, opened: false, clicked: false },
    status:            'DRAFT',
    recipientCount,
  });

  // 3. Build n8n payload
  const n8nPayload = {
    campaignId:        campaign.id,
    campaignType,
    segmentation,
    message:           messageContent,
    channel:           channel || 'whatsapp',
    organizationId:    organizationId || null,
    recipients:        recipients.map(r => ({
      id:    r.id,
      name:  r.name,
      phone: r.phone,
      email: r.email,
    })),
    tracking:          tracking || { sent: false, opened: false, clicked: false },
    automationEnabled: automationEnabled || false,
    automationTrigger: automationTrigger || null,
    sentAt:            new Date().toISOString(),
  };

  // 4. Fire n8n (non-blocking — we update status in background)
  const n8nResult = await dispatchToN8n(n8nPayload);

  if (n8nResult.ok) {
    await updateCampaignStatus(campaign.id, 'SENT', { sentAt: new Date(), recipientCount });
    return { success: true, campaign: { ...campaign, status: 'SENT', recipientCount }, n8n: n8nResult };
  } else {
    await updateCampaignStatus(campaign.id, 'FAILED');
    return { success: false, campaign: { ...campaign, status: 'FAILED' }, n8nError: n8nResult.error };
  }
};

/**
 * schedule — persist for later processing (cron / job queue picks it up).
 */
const schedule = async ({
  campaignType,
  segmentation,
  messageContent,
  channel,
  sendType,
  scheduleDate,
  tracking,
  automationEnabled,
  automationTrigger,
}) => {
  const campaign = await persistCampaign({
    campaignType:      campaignType || 'no_template',
    sendType:          sendType     || 'bulk',
    channel:           channel      || 'whatsapp',
    segmentation:      segmentation || [],
    messageContent,
    scheduleType:      'scheduled',
    scheduleDate:      new Date(scheduleDate),
    automationEnabled: automationEnabled || false,
    automationTrigger: automationEnabled ? (automationTrigger || null) : null,
    tracking:          tracking || { sent: false, opened: false, clicked: false },
    status:            'SCHEDULED',
    recipientCount:    0,   // will be resolved at send time
  });

  return { success: true, campaign };
};

/**
 * processScheduled — called by cron; dispatches campaigns whose scheduleDate has passed.
 */
const processScheduled = async () => {
  const due = await prisma.marketingCampaign.findMany({
    where: {
      status:       'SCHEDULED',
      scheduleDate: { lte: new Date() },
    },
  });

  const results = [];
  for (const c of due) {
    const result = await sendNow({
      campaignType:      c.campaignType,
      segmentation:      c.segmentation,
      messageContent:    c.messageContent,
      channel:           c.channel,
      sendType:          c.sendType,
      tracking:          c.tracking,
      automationEnabled: c.automationEnabled,
      automationTrigger: c.automationTrigger,
    });
    results.push({ id: c.id, ...result });
  }

  return results;
};

module.exports = { sendNow, schedule, processScheduled, resolveSegmentation };
