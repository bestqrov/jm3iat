const prisma = require('../../config/database');

const getAll = async (req, res) => {
  try {
    const { status, type } = req.query;
    const where = { organizationId: req.organization.id };
    if (status) where.status = status;
    if (type) where.type = type;

    const projects = await prisma.project.findMany({
      where,
      include: { funding: { include: { entries: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
      include: {
        funding: { include: { entries: true } },
        requests: true,
        documents: true,
      },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const create = async (req, res) => {
  try {
    const { title, type, description, location, startDate, endDate, code, generalGoal, specificGoals, manager, budget, beneficiaries } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });

    const project = await prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          organizationId: req.organization.id,
          title,
          type: type || 'OTHER',
          description,
          location,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          code,
          generalGoal,
          specificGoals,
          manager,
          budget: budget ? parseFloat(budget) : null,
          beneficiaries,
        },
      });

      // Auto-create funding record
      await tx.funding.create({ data: { projectId: p.id } });

      return tx.project.findUnique({
        where: { id: p.id },
        include: { funding: true },
      });
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const update = async (req, res) => {
  try {
    const { title, type, description, location, status, startDate, endDate, code, generalGoal, specificGoals, manager, budget, beneficiaries } = req.body;
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Project not found' });

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        type: type ?? existing.type,
        description: description ?? existing.description,
        location: location ?? existing.location,
        status: status ?? existing.status,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        endDate: endDate ? new Date(endDate) : existing.endDate,
        code: code !== undefined ? code : existing.code,
        generalGoal: generalGoal !== undefined ? generalGoal : existing.generalGoal,
        specificGoals: specificGoals !== undefined ? specificGoals : existing.specificGoals,
        manager: manager !== undefined ? manager : existing.manager,
        budget: budget !== undefined ? parseFloat(budget) : existing.budget,
        beneficiaries: beneficiaries !== undefined ? beneficiaries : existing.beneficiaries,
      },
      include: { funding: true },
    });

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Project not found' });

    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const [total, planned, inProgress, completed] = await Promise.all([
      prisma.project.count({ where: { organizationId: orgId } }),
      prisma.project.count({ where: { organizationId: orgId, status: 'PLANNED' } }),
      prisma.project.count({ where: { organizationId: orgId, status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { organizationId: orgId, status: 'COMPLETED' } }),
    ]);
    res.json({ total, planned, inProgress, completed });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, remove, getStats };
