const prisma = require('../../config/database');

const getFunding = async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, organizationId: req.organization.id },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const funding = await prisma.funding.findUnique({
      where: { projectId: req.params.projectId },
      include: { entries: { orderBy: { date: 'desc' } } },
    });

    res.json(funding);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateBudget = async (req, res) => {
  try {
    const { totalBudget } = req.body;
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, organizationId: req.organization.id },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const funding = await prisma.funding.update({
      where: { projectId: req.params.projectId },
      data: { totalBudget: parseFloat(totalBudget) },
    });

    res.json(funding);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const addEntry = async (req, res) => {
  try {
    const { source, amount, donor, notes, date } = req.body;
    if (!source || !amount) return res.status(400).json({ message: 'source and amount required' });

    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, organizationId: req.organization.id },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const funding = await prisma.funding.findUnique({
      where: { projectId: req.params.projectId },
    });

    const entry = await prisma.fundingEntry.create({
      data: {
        fundingId: funding.id,
        source,
        amount: parseFloat(amount),
        donor,
        notes,
        date: date ? new Date(date) : new Date(),
      },
    });

    // Recalculate fundedAmount
    const allEntries = await prisma.fundingEntry.findMany({
      where: { fundingId: funding.id },
    });
    const fundedAmount = allEntries.reduce((sum, e) => sum + e.amount, 0);
    await prisma.funding.update({
      where: { id: funding.id },
      data: { fundedAmount },
    });

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteEntry = async (req, res) => {
  try {
    const entry = await prisma.fundingEntry.findUnique({
      where: { id: req.params.entryId },
      include: { funding: { include: { project: true } } },
    });
    if (!entry || entry.funding.project.organizationId !== req.organization.id) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    await prisma.fundingEntry.delete({ where: { id: req.params.entryId } });

    // Recalculate
    const allEntries = await prisma.fundingEntry.findMany({
      where: { fundingId: entry.fundingId },
    });
    const fundedAmount = allEntries.reduce((sum, e) => sum + e.amount, 0);
    await prisma.funding.update({
      where: { id: entry.fundingId },
      data: { fundedAmount },
    });

    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getFunding, updateBudget, addEntry, deleteEntry };
