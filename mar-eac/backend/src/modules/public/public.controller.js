const prisma = require('../../config/database');
const path   = require('path');
const { push: pushNotification } = require('../notifications/notifications.controller');

const getPublicProfile = async (req, res) => {
  try {
    const { slug } = req.params;
    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { email: { startsWith: slug, mode: 'insensitive' } },
          { name: { equals: slug, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, name: true, nameAr: true, email: true, phone: true,
        city: true, cityAr: true, region: true, regionAr: true,
        address: true, addressAr: true, description: true, descriptionAr: true,
        activities: true, activitiesAr: true, logo: true,
        foundingDate: true, facebook: true, instagram: true,
        whatsapp: true, youtube: true, tiktok: true,
        modules: true, membershipFee: true,
        bankName: true, bankAccount: true, bankRib: true,
        _count: { select: { members: true, meetings: true, projects: true } },
      },
    });
    if (!org) return res.status(404).json({ message: 'Association not found' });
    res.json(org);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const submitJoinRequest = async (req, res) => {
  try {
    const { slug } = req.params;
    const { fullName, phone, email, city, message, paymentReceiptUrl, notifyChannel } = req.body;
    if (!fullName || !phone) return res.status(400).json({ message: 'Nom et téléphone requis' });

    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { email: { startsWith: slug, mode: 'insensitive' } },
          { name: { equals: slug, mode: 'insensitive' } },
        ],
      },
    });
    if (!org) return res.status(404).json({ message: 'Association not found' });

    await prisma.member.create({
      data: {
        organizationId: org.id,
        name: fullName,
        phone,
        email: email || null,
        isActive: false,
        paymentReceiptUrl: paymentReceiptUrl || null,
        notifyChannel: notifyChannel || null,
      },
    });

    await pushNotification({
      organizationId: org.id,
      type: 'INFO',
      title: `New join request: ${fullName}`,
      titleAr: `طلب انضمام جديد: ${fullName}`,
      body: `${phone}${email ? ' — ' + email : ''}${paymentReceiptUrl ? ' — وصل دفع مرفق' : ''}`,
      bodyAr: `${phone}${email ? ' — ' + email : ''}${paymentReceiptUrl ? ' — وصل دفع مرفق' : ''}`,
      link: '/members',
    });

    res.json({ ok: true, message: 'Demande envoyée avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const uploadPaymentReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSupportContact = async (req, res) => {
  try {
    const settings = await prisma.platformSettings.findMany({
      where: { key: { in: ['support_email', 'support_whatsapp'] } },
    });
    const obj = { email: 'support@mar-eac.ma', whatsapp: '' };
    for (const s of settings) {
      if (s.key === 'support_email')    obj.email    = s.value;
      if (s.key === 'support_whatsapp') obj.whatsapp = s.value;
    }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getPublicProfile, submitJoinRequest, uploadPaymentReceipt, getSupportContact };
