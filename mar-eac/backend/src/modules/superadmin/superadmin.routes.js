const router = require('express').Router();
const ctrl   = require('./superadmin.controller');
const { auth }        = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const upload          = require('../../utils/multer');

router.use(auth, requireRole('SUPER_ADMIN'));

// ── Stats & analytics ──────────────────────────────────────────────────────────
router.get('/stats',         ctrl.getStats);
router.get('/analytics',     ctrl.getAnalytics);
router.get('/feature-usage', ctrl.getFeatureUsage);
router.get('/ai-insights',   ctrl.getAIInsights);

// ── Organizations ──────────────────────────────────────────────────────────────
router.get('/organizations',                          ctrl.getOrganizations);
router.get('/organizations/:id',                      ctrl.getOrganization);
router.put('/organizations/:id/subscription',         ctrl.updateSubscription);
router.delete('/organizations/:id',                   ctrl.deleteOrganization);

// ── Subscriptions ──────────────────────────────────────────────────────────────
router.get('/subscriptions',                          ctrl.getSubscriptions);

// ── Downgrade Requests (pending superadmin approval) ──────────────────────────
router.get('/downgrade-requests',                             ctrl.getDowngradeRequests);
router.post('/downgrade-requests/:orgId/approve',             ctrl.approveDowngrade);
router.post('/downgrade-requests/:orgId/reject',              ctrl.rejectDowngrade);

// ── Payments ──────────────────────────────────────────────────────────────────
router.get('/payments',                               ctrl.getPayments);
router.post('/payments',  upload.single('receipt'),   ctrl.createPayment);
router.post('/payments/:paymentId/receipt', upload.single('receipt'), ctrl.uploadPaymentReceipt);
router.delete('/payments/:paymentId',                 ctrl.deletePayment);

// ── Users ──────────────────────────────────────────────────────────────────────
router.get('/users',                                  ctrl.getUsers);
router.put('/users/:userId/toggle',                   ctrl.toggleUser);
router.post('/users/:userId/reset-password',          ctrl.resetUserPassword);

// ── Packs ──────────────────────────────────────────────────────────────────────
router.get('/packs',                                  ctrl.getPacks);
router.post('/packs/seed-defaults',                   ctrl.seedDefaultPacks);
router.post('/packs',                                 ctrl.createPack);
router.put('/packs/:packId',                          ctrl.updatePack);
router.delete('/packs/:packId',                       ctrl.deletePack);

// ── Promo Codes ────────────────────────────────────────────────────────────────
router.get('/promo-codes',                            ctrl.getPromoCodes);
router.post('/promo-codes',                           ctrl.createPromoCode);
router.put('/promo-codes/:promoId',                   ctrl.updatePromoCode);
router.delete('/promo-codes/:promoId',                ctrl.deletePromoCode);

// ── Email Campaigns ────────────────────────────────────────────────────────────
router.get('/campaigns',                              ctrl.getEmailCampaigns);
router.post('/campaigns',                             ctrl.createEmailCampaign);
router.post('/campaigns/:campaignId/send',            ctrl.sendEmailCampaign);
router.delete('/campaigns/:campaignId',               ctrl.deleteEmailCampaign);

// ── WhatsApp ───────────────────────────────────────────────────────────────────
router.get('/whatsapp',                               ctrl.getWhatsAppMessages);
router.post('/whatsapp/send',                         ctrl.sendWhatsAppMessage);
router.post('/whatsapp/bulk',                         ctrl.sendBulkWhatsApp);

// ── Automation Rules ───────────────────────────────────────────────────────────
router.get('/automation',                             ctrl.getAutomationRules);
router.post('/automation',                            ctrl.createAutomationRule);
router.put('/automation/:ruleId',                     ctrl.updateAutomationRule);
router.delete('/automation/:ruleId',                  ctrl.deleteAutomationRule);
router.post('/automation/:ruleId/run',                ctrl.runAutomationRule);

// ── Platform Settings ──────────────────────────────────────────────────────────
router.get('/settings',                               ctrl.getPlatformSettings);
router.put('/settings',                               ctrl.updatePlatformSettings);

// ── Marketing Campaigns (unified) ─────────────────────────────────────────────
router.get('/marketing-campaigns',                    ctrl.getMarketingCampaigns);
router.post('/marketing-campaigns',                   ctrl.createMarketingCampaign);
router.delete('/marketing-campaigns/:campaignId',     ctrl.deleteMarketingCampaign);
router.get('/marketing-templates',                    ctrl.getTemplateMessages);

module.exports = router;
