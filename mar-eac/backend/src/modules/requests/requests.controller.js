const prisma = require('../../config/database');

const getAll = async (req, res) => {
  try {
    const { status, type } = req.query;
    const where = { organizationId: req.organization.id };
    if (status) where.status = status;
    if (type) where.type = type;

    const requests = await prisma.request.findMany({
      where,
      include: { project: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const request = await prisma.request.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
      include: { project: true },
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const create = async (req, res) => {
  try {
    const { title, type, description, recipient, amount, projectId } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });

    const request = await prisma.request.create({
      data: {
        organizationId: req.organization.id,
        title,
        type: type || 'COMMUNE',
        description,
        recipient,
        amount: amount ? parseFloat(amount) : null,
        projectId: projectId || null,
      },
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const update = async (req, res) => {
  try {
    const { title, type, description, recipient, amount, status, notes, projectId } = req.body;
    const existing = await prisma.request.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Request not found' });

    const data = {
      title: title ?? existing.title,
      type: type ?? existing.type,
      description: description ?? existing.description,
      recipient: recipient ?? existing.recipient,
      amount: amount ? parseFloat(amount) : existing.amount,
      status: status ?? existing.status,
      notes: notes ?? existing.notes,
      projectId: projectId !== undefined ? (projectId || null) : existing.projectId,
    };

    if (status && status !== existing.status) {
      data.respondedAt = new Date();
    }

    const request = await prisma.request.update({ where: { id: req.params.id }, data });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await prisma.request.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Request not found' });

    await prisma.request.delete({ where: { id: req.params.id } });
    res.json({ message: 'Request deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.request.count({ where: { organizationId: orgId } }),
      prisma.request.count({ where: { organizationId: orgId, status: 'PENDING' } }),
      prisma.request.count({ where: { organizationId: orgId, status: 'APPROVED' } }),
      prisma.request.count({ where: { organizationId: orgId, status: 'REJECTED' } }),
    ]);
    res.json({ total, pending, approved, rejected });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, remove, getStats };
