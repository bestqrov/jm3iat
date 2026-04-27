const prisma = require('../../config/database');

const getAll = async (req, res) => {
  try {
    const { type, status, search } = req.query;
    const orgId = req.organization.id;

    const where = { organizationId: orgId };
    if (type)   where.type   = type;
    if (status) where.status = status;
    if (search) where.name   = { contains: search, mode: 'insensitive' };

    const assets = await prisma.asset.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const orgId = req.organization.id;

    const [all, byStatus, byType] = await Promise.all([
      prisma.asset.findMany({ where: { organizationId: orgId }, select: { acquisitionValue: true, currentValue: true, status: true, type: true } }),
      prisma.asset.groupBy({ by: ['status'], where: { organizationId: orgId }, _count: true }),
      prisma.asset.groupBy({ by: ['type'],   where: { organizationId: orgId }, _count: true }),
    ]);

    const totalAcquisitionValue = all.reduce((s, a) => s + (a.acquisitionValue || 0), 0);
    const totalCurrentValue     = all.reduce((s, a) => s + (a.currentValue     || 0), 0);

    res.json({
      total: all.length,
      totalAcquisitionValue,
      totalCurrentValue,
      byStatus: Object.fromEntries(byStatus.map(r => [r.status, r._count])),
      byType:   Object.fromEntries(byType.map(r => [r.type, r._count])),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    res.json(asset);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const create = async (req, res) => {
  try {
    const { name, type, description, reference, location, acquisitionDate, acquisitionValue, currentValue, status, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const asset = await prisma.asset.create({
      data: {
        organizationId: req.organization.id,
        name,
        type: type || 'OTHER',
        description,
        reference,
        location,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        acquisitionValue: acquisitionValue != null ? parseFloat(acquisitionValue) : null,
        currentValue:     currentValue     != null ? parseFloat(currentValue)     : null,
        status: status || 'ACTIVE',
        notes,
      },
    });

    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const update = async (req, res) => {
  try {
    const { name, type, description, reference, location, acquisitionDate, acquisitionValue, currentValue, status, notes } = req.body;
    const orgId = req.organization.id;

    const existing = await prisma.asset.findFirst({ where: { id: req.params.id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ message: 'Asset not found' });

    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data: {
        ...(name        !== undefined && { name }),
        ...(type        !== undefined && { type }),
        ...(description !== undefined && { description }),
        ...(reference   !== undefined && { reference }),
        ...(location    !== undefined && { location }),
        ...(acquisitionDate  !== undefined && { acquisitionDate:  acquisitionDate ? new Date(acquisitionDate) : null }),
        ...(acquisitionValue !== undefined && { acquisitionValue: acquisitionValue != null ? parseFloat(acquisitionValue) : null }),
        ...(currentValue     !== undefined && { currentValue:     currentValue     != null ? parseFloat(currentValue)     : null }),
        ...(status !== undefined && { status }),
        ...(notes  !== undefined && { notes }),
      },
    });

    res.json(asset);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await prisma.asset.findFirst({ where: { id: req.params.id, organizationId: req.organization.id } });
    if (!existing) return res.status(404).json({ message: 'Asset not found' });

    await prisma.asset.delete({ where: { id: req.params.id } });
    res.json({ message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAll, getStats, getById, create, update, remove };
