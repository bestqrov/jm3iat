const prisma  = require('../../config/database');
const path    = require('path');
const { generateTechnicalCardPdf } = require('../../utils/technicalCardPdf');

const getTechnicalCard = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const [project, president] = await Promise.all([
      prisma.project.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        select: { id: true, title: true, location: true, status: true,
                  budget: true, generalGoal: true, technicalCard: true },
      }),
      prisma.member.findFirst({
        where: { organizationId: orgId, role: 'PRESIDENT', isActive: true },
        select: { name: true },
      }),
    ]);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const tc = project.technicalCard || {};
    // Inject president name from members if not already overridden in tc
    if (!tc.presidentName && president?.name) {
      tc.presidentName = president.name;
    }
    res.json({ ...project, technicalCard: tc });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const saveTechnicalCard = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId  = req.organization.id;

    const existing = await prisma.project.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ message: 'Project not found' });

    const project = await prisma.project.update({
      where: { id },
      data:  { technicalCard: req.body },
    });
    res.json({ technicalCard: project.technicalCard });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const exportTechnicalCardPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId  = req.organization.id;

    const [project, org, president] = await Promise.all([
      prisma.project.findFirst({
        where: { id, organizationId: orgId },
        select: { id: true, title: true, location: true, status: true,
                  budget: true, generalGoal: true, technicalCard: true },
      }),
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, nameAr: true, phone: true, address: true,
                  addressAr: true, city: true, cityAr: true, region: true, regionAr: true,
                  foundingDate: true, logo: true, mandateDuration: true, bureauCreationDate: true },
      }),
      prisma.member.findFirst({
        where: { organizationId: orgId, role: 'PRESIDENT', isActive: true },
        select: { name: true },
      }),
    ]);

    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Merge president name into tc if not manually overridden
    const tc = project.technicalCard && typeof project.technicalCard === 'object'
      ? { ...project.technicalCard }
      : {};
    if (!tc.presidentName && president?.name) tc.presidentName = president.name;
    project.technicalCard = tc;

    generateTechnicalCardPdf(project, org, res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' });
  }
};

const uploadEtatLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const logoUrl = `/uploads/${req.file.filename}`;
    res.json({ url: logoUrl });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getTechnicalCard, saveTechnicalCard, exportTechnicalCardPdf, uploadEtatLogo };
