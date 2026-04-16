/**
 * marketing.controller.js
 *
 * HTTP layer only — validate input, delegate to service, shape response.
 */

const svc = require('./marketing.service');
const prisma = require('../../config/database');

// ─── POST /api/marketing/send ────────────────────────────────────────────────

const send = async (req, res) => {
  try {
    const {
      campaignType,
      segmentation,
      messageContent,
      scheduleType,
      scheduleDate,
      channel,
      sendType,
      manualOrganizationId,   // ID of org selected in manual picker
      tracking,
      automationEnabled,
      automationTrigger,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!messageContent || !String(messageContent).trim()) {
      return res.status(400).json({ message: 'messageContent is required' });
    }
    if (!scheduleType || !['now', 'scheduled'].includes(scheduleType)) {
      return res.status(400).json({ message: 'scheduleType must be "now" or "scheduled"' });
    }
    if (scheduleType === 'scheduled' && !scheduleDate) {
      return res.status(400).json({ message: 'scheduleDate is required when scheduleType is "scheduled"' });
    }
    if (scheduleType === 'scheduled' && new Date(scheduleDate) <= new Date()) {
      return res.status(400).json({ message: 'scheduleDate must be in the future' });
    }
    if (sendType === 'manual' && !manualOrganizationId) {
      return res.status(400).json({ message: 'manualOrganizationId is required for manual send' });
    }

    // ── organizationId from token (non-superadmin scoping) ──────────────────
    const organizationId = req.user?.role === 'SUPER_ADMIN'
      ? (req.body.organizationId || null)
      : (req.user?.organizationId || null);

    // ── Dispatch ────────────────────────────────────────────────────────────
    if (scheduleType === 'now') {
      const result = await svc.sendNow({
        campaignType,
        segmentation,
        messageContent,
        channel,
        sendType,
        manualOrganizationId: sendType === 'manual' ? manualOrganizationId : null,
        tracking,
        automationEnabled,
        automationTrigger,
        organizationId,
      });

      if (!result.success) {
        return res.status(502).json({
          message: 'Campaign saved but n8n delivery failed',
          campaign: result.campaign,
          n8nError: result.n8nError,
        });
      }

      return res.status(201).json({
        message: 'Campaign sent successfully',
        campaign: result.campaign,
        recipientCount: result.campaign.recipientCount,
      });
    }

    // scheduleType === 'scheduled'
    const result = await svc.schedule({
      campaignType,
      segmentation,
      messageContent,
      channel,
      sendType,
      scheduleDate,
      tracking,
      automationEnabled,
      automationTrigger,
    });

    return res.status(201).json({
      message: 'Campaign scheduled successfully',
      campaign: result.campaign,
    });

  } catch (err) {
    console.error('[marketing/send]', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// ─── GET /api/marketing/campaigns ────────────────────────────────────────────

const getCampaigns = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = status ? { status } : {};

    const [data, total] = await Promise.all([
      prisma.marketingCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.marketingCampaign.count({ where }),
    ]);

    return res.json({ data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /api/marketing/campaigns/:id ─────────────────────────────────────

const deleteCampaign = async (req, res) => {
  try {
    await prisma.marketingCampaign.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Campaign deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /api/marketing/templates ────────────────────────────────────────────

const getTemplates = (_req, res) => {
  const templates = {
    trial_reminder: {
      fr: "Bonjour {{name}} ! Votre période d'essai sur Mar E-A.C se termine bientôt. Souscrivez maintenant pour continuer 👉",
      ar: "مرحباً {{name}}! تنتهي فترة تجربتك على Mar E-A.C قريباً. اشترك الآن لمواصلة الاستخدام 👉",
    },
    payment_reminder: {
      fr: "Bonjour {{name}}, un paiement est en attente sur Mar E-A.C. Régularisez pour éviter toute interruption de service.",
      ar: "مرحباً {{name}}، يوجد مبلغ معلق في حسابك على Mar E-A.C. يرجى الدفع لتجنب انقطاع الخدمة.",
    },
    promo: {
      fr: "🎉 Offre spéciale ! -20% sur l'abonnement annuel Mar E-A.C. Valable jusqu'à fin du mois !",
      ar: "🎉 عرض خاص! خصم 20% على الاشتراك السنوي في Mar E-A.C. صالح حتى نهاية الشهر!",
    },
    renewal: {
      fr: "Bonjour {{name}}, votre abonnement Mar E-A.C expire dans 7 jours. Renouvelez maintenant pour continuer sans interruption.",
      ar: "مرحباً {{name}}، ينتهي اشتراكك في Mar E-A.C خلال 7 أيام. جدد الآن لمواصلة الخدمة.",
    },
    reactivation: {
      fr: "Nous avons remarqué votre absence, {{name}} ! Revenez sur Mar E-A.C — un mois offert pour votre retour 🎁",
      ar: "لاحظنا غيابك يا {{name}}! عد إلى Mar E-A.C — شهر مجاني كهدية لعودتك 🎁",
    },
  };
  res.json(templates);
};

// ─── POST /api/marketing/preview-segment ─────────────────────────────────────
// Returns recipient count for a given segmentation — used for UI preview.

const previewSegment = async (req, res) => {
  try {
    const { segmentation } = req.body;
    if (!Array.isArray(segmentation)) {
      return res.status(400).json({ message: 'segmentation must be an array' });
    }
    const recipients = await svc.resolveSegmentation(segmentation);
    return res.json({
      count: recipients.length,
      sample: recipients.slice(0, 5).map(r => ({ name: r.name, phone: r.phone || null })),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /api/marketing/organizations ────────────────────────────────────────
// Returns all saved organizations that have a phone number — used for manual picker.

const getOrganizations = async (req, res) => {
  try {
    const { q } = req.query; // optional search query

    const orgs = await prisma.organization.findMany({
      where: {
        phone: { not: null },
        ...(q ? {
          OR: [
            { name:  { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id:    true,
        name:  true,
        phone: true,
        email: true,
        modules: true,
        subscription: { select: { status: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    });

    return res.json(orgs);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { send, getCampaigns, deleteCampaign, getTemplates, previewSegment, getOrganizations };
