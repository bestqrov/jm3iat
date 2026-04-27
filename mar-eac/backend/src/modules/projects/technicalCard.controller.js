const prisma  = require('../../config/database');
const { generateTechnicalCardPdf } = require('../../utils/technicalCardPdf');

const getTechnicalCard = async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
      select: { id: true, title: true, location: true, status: true,
                budget: true, generalGoal: true, technicalCard: true },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ ...project, technicalCard: project.technicalCard || {} });
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

    const [project, org] = await Promise.all([
      prisma.project.findFirst({
        where: { id, organizationId: orgId },
        select: { id: true, title: true, location: true, status: true,
                  budget: true, generalGoal: true, technicalCard: true },
      }),
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, nameAr: true, phone: true, address: true,
                  addressAr: true, city: true, cityAr: true, foundingDate: true, logo: true },
      }),
    ]);

    if (!project) return res.status(404).json({ message: 'Project not found' });

    generateTechnicalCardPdf(project, org, res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' });
  }
};

module.exports = { getTechnicalCard, saveTechnicalCard, exportTechnicalCardPdf };
