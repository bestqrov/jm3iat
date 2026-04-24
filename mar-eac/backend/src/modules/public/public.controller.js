const prisma = require('../../config/database');

const getPublicProfile = async (req, res) => {
  try {
    const { slug } = req.params;
    // slug = email prefix or org id suffix
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
        modules: true,
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
    const { fullName, phone, email, cin, city, message } = req.body;
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

    // Create member request as a pending member
    await prisma.member.create({
      data: {
        organizationId: org.id, fullName, phone,
        email: email || null, cin: cin || null, city: city || null,
        status: 'PENDING', notes: message || null,
      },
    });

    res.json({ ok: true, message: 'Demande envoyée avec succès' });
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
      if (s.key === 'support_email')    obj.email     = s.value;
      if (s.key === 'support_whatsapp') obj.whatsapp  = s.value;
    }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getPublicProfile, submitJoinRequest, getSupportContact };
