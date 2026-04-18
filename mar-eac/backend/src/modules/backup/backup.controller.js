const prisma = require('../../config/database');

const orgId = (req) => req.organization.id;

// ── Toggle BACKUP extra module ─────────────────────────────────────────────────

const toggleBackup = async (req, res) => {
  try {
    const id = orgId(req);
    const org = await prisma.organization.findUnique({ where: { id }, select: { modules: true } });
    const modules = org.modules || [];
    const hasBackup = modules.includes('BACKUP');
    const updated = hasBackup
      ? modules.filter(m => m !== 'BACKUP')
      : [...modules, 'BACKUP'];

    await prisma.organization.update({ where: { id }, data: { modules: updated } });
    res.json({ enabled: !hasBackup, modules: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Create backup (on-demand) ─────────────────────────────────────────────────

const createBackup = async (req, res) => {
  try {
    const id = orgId(req);

    // Collect all org data in parallel
    const [
      org, members, meetings, transactions, documents,
      projects, requests, waterInstallations, waterRepairs,
      products, productSales, assocClients,
      transportDrivers, transportVehicles, transportStudents, transportRoutes,
      transportSubscriptions, transportPayments, recurringPayments,
    ] = await Promise.all([
      prisma.organization.findUnique({ where: { id } }),
      prisma.member.findMany({ where: { organizationId: id } }),
      prisma.meeting.findMany({ where: { organizationId: id }, include: { decisions: true, attendances: true } }),
      prisma.transaction.findMany({ where: { organizationId: id } }),
      prisma.document.findMany({ where: { organizationId: id } }),
      prisma.project.findMany({ where: { organizationId: id } }),
      prisma.request.findMany({ where: { organizationId: id } }),
      prisma.waterInstallation.findMany({ where: { organizationId: id } }),
      prisma.waterRepair.findMany({ where: { organizationId: id } }),
      prisma.assocProduct.findMany({ where: { organizationId: id } }),
      prisma.assocSale.findMany({ where: { organizationId: id } }),
      prisma.assocClient.findMany({ where: { organizationId: id } }),
      prisma.transportDriver.findMany({ where: { organizationId: id } }),
      prisma.transportVehicle.findMany({ where: { organizationId: id } }),
      prisma.transportStudent.findMany({ where: { organizationId: id } }),
      prisma.transportRoute.findMany({ where: { organizationId: id } }),
      prisma.transportSubscription.findMany({ where: { organizationId: id } }),
      prisma.transportPayment.findMany({ where: { organizationId: id } }),
      prisma.recurringPayment.findMany({ where: { organizationId: id } }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      organization: org,
      members,
      meetings,
      transactions,
      documents,
      projects,
      requests,
      waterInstallations,
      waterRepairs,
      products,
      productSales,
      assocClients,
      transport: { drivers: transportDrivers, vehicles: transportVehicles, students: transportStudents, routes: transportRoutes, subscriptions: transportSubscriptions, payments: transportPayments },
      recurringPayments,
    };

    const json = JSON.stringify(payload);
    const sizeKb = Math.round(Buffer.byteLength(json, 'utf8') / 1024);

    // Save record
    const record = await prisma.backupRecord.create({
      data: {
        organizationId: id,
        createdByName: req.user?.name || null,
        sizeKb,
        status: 'DONE',
      },
    });

    // Stream JSON file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${org.name.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json"`);
    res.setHeader('Content-Length', Buffer.byteLength(json, 'utf8'));
    res.send(json);
  } catch (err) {
    console.error('[backup/create]', err);
    res.status(500).json({ message: 'Erreur lors de la création de la sauvegarde' });
  }
};

// ── List backup records ────────────────────────────────────────────────────────

const listBackups = async (req, res) => {
  try {
    const records = await prisma.backupRecord.findMany({
      where: { organizationId: orgId(req) },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { toggleBackup, createBackup, listBackups };
