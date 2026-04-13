const prisma = require('../../config/database');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { generateWaterBillPDF } = require('../../utils/waterBillPdf');

// Helper: extra filter when logged-in user is a WATER_READER
const readerInstFilter = (req) =>
  req.user.role === 'WATER_READER' ? { readerId: req.user.id } : {};

// ─── Installations ────────────────────────────────────────────────────────────

const getInstallations = async (req, res) => {
  try {
    const { isActive } = req.query;
    const where = { organizationId: req.organization.id, ...readerInstFilter(req) };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const installations = await prisma.waterInstallation.findMany({
      where,
      include: {
        _count: { select: { readings: true, invoices: true, repairs: true } },
        readings: { orderBy: { readingDate: 'desc' }, take: 1 },
        invoices: {
          where: { isPaid: false },
          select: { amount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(installations);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getInstallation = async (req, res) => {
  try {
    const installation = await prisma.waterInstallation.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
      include: {
        readings: {
          include: { invoice: { include: { payment: true } } },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
        invoices: {
          include: { payment: true },
          orderBy: { createdAt: 'desc' },
        },
        repairs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!installation) return res.status(404).json({ message: 'Installation not found' });
    res.json(installation);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createInstallation = async (req, res) => {
  try {
    const { householdName, phone, address, meterNumber, pricePerUnit, installDate, readerId } = req.body;
    if (!householdName || !meterNumber) {
      return res.status(400).json({ message: 'householdName and meterNumber required' });
    }

    const installation = await prisma.waterInstallation.create({
      data: {
        organizationId: req.organization.id,
        householdName,
        phone,
        address,
        meterNumber,
        pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : 5.0,
        installDate: installDate ? new Date(installDate) : new Date(),
        readerId: readerId || null,
      },
    });

    res.status(201).json(installation);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Meter number already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

const updateInstallation = async (req, res) => {
  try {
    const { householdName, phone, address, pricePerUnit, isActive, readerId } = req.body;
    const existing = await prisma.waterInstallation.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Installation not found' });

    const installation = await prisma.waterInstallation.update({
      where: { id: req.params.id },
      data: {
        householdName: householdName ?? existing.householdName,
        phone: phone !== undefined ? phone : existing.phone,
        address: address !== undefined ? address : existing.address,
        pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : existing.pricePerUnit,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        readerId: readerId !== undefined ? (readerId || null) : existing.readerId,
      },
    });

    res.json(installation);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteInstallation = async (req, res) => {
  try {
    const existing = await prisma.waterInstallation.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Installation not found' });
    await prisma.waterInstallation.delete({ where: { id: req.params.id } });
    res.json({ message: 'Installation deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Readings ─────────────────────────────────────────────────────────────────

const addReading = async (req, res) => {
  try {
    const { currentReading, readingDate, month, year, notes } = req.body;
    const installationId = req.params.id;

    if (!currentReading || !month || !year) {
      return res.status(400).json({ message: 'currentReading, month, and year required' });
    }

    const installation = await prisma.waterInstallation.findFirst({
      where: { id: installationId, organizationId: req.organization.id, ...readerInstFilter(req) },
    });
    if (!installation) return res.status(404).json({ message: 'Installation not found' });

    const lastReading = await prisma.meterReading.findFirst({
      where: { installationId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const previousReading = lastReading ? lastReading.currentReading : 0;
    const consumption = Math.max(0, parseFloat(currentReading) - previousReading);
    const amount = consumption * installation.pricePerUnit;
    const dueDate = new Date(parseInt(year), parseInt(month), 15);

    const reading = await prisma.$transaction(async (tx) => {
      const r = await tx.meterReading.create({
        data: {
          installationId,
          readingDate: readingDate ? new Date(readingDate) : new Date(),
          previousReading,
          currentReading: parseFloat(currentReading),
          consumption,
          month: parseInt(month),
          year: parseInt(year),
          notes,
        },
      });

      await tx.waterInvoice.create({
        data: { readingId: r.id, installationId, amount, dueDate },
      });

      return tx.meterReading.findUnique({
        where: { id: r.id },
        include: { invoice: true },
      });
    });

    res.status(201).json(reading);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Reading already exists for this month' });
    res.status(500).json({ message: 'Server error' });
  }
};

const getReadings = async (req, res) => {
  try {
    const installation = await prisma.waterInstallation.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!installation) return res.status(404).json({ message: 'Installation not found' });

    const readings = await prisma.meterReading.findMany({
      where: { installationId: req.params.id },
      include: { invoice: { include: { payment: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json(readings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllReadings = async (req, res) => {
  try {
    const { installationId, month, year } = req.query;
    const where = { installation: { organizationId: req.organization.id, ...readerInstFilter(req) } };
    if (installationId) where.installationId = installationId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const readings = await prisma.meterReading.findMany({
      where,
      include: {
        installation: { select: { householdName: true, meterNumber: true, phone: true } },
        invoice: { include: { payment: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(readings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

const getInvoices = async (req, res) => {
  try {
    const { isPaid, installationId } = req.query;
    const where = { installation: { organizationId: req.organization.id, ...readerInstFilter(req) } };
    if (isPaid !== undefined) where.isPaid = isPaid === 'true';
    if (installationId) where.installationId = installationId;

    const invoices = await prisma.waterInvoice.findMany({
      where,
      include: {
        installation: { select: { householdName: true, meterNumber: true, phone: true } },
        reading: { select: { month: true, year: true, consumption: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const markPaid = async (req, res) => {
  try {
    const { method, notes, reference } = req.body;
    const invoice = await prisma.waterInvoice.findFirst({
      where: {
        id: req.params.invoiceId,
        installation: { organizationId: req.organization.id, ...readerInstFilter(req) },
      },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.isPaid) return res.status(409).json({ message: 'Invoice already paid' });

    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.waterInvoice.update({
        where: { id: req.params.invoiceId },
        data: { isPaid: true, paidAt: new Date() },
      });
      await tx.waterPayment.create({
        data: {
          invoiceId: req.params.invoiceId,
          amount: invoice.amount,
          method: method || 'CASH',
          reference: reference || null,
          notes,
        },
      });
      return inv;
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Repairs ─────────────────────────────────────────────────────────────────

const getRepairs = async (req, res) => {
  try {
    const { status } = req.query;
    const where = { organizationId: req.organization.id };
    if (status) where.status = status;

    // WATER_READER sees only repairs linked to their installations
    if (req.user.role === 'WATER_READER') {
      where.installation = { readerId: req.user.id };
    }

    const repairs = await prisma.waterRepair.findMany({
      where,
      include: {
        installation: { select: { householdName: true, meterNumber: true, readerId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(repairs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createRepair = async (req, res) => {
  try {
    const {
      title, type, description, location, installationId, cost, reportedDate,
      technicianName, technicianAmount, partsNeeded, workDetails, deadline,
    } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });

    // If WATER_READER, verify installation belongs to them
    if (req.user.role === 'WATER_READER' && installationId) {
      const inst = await prisma.waterInstallation.findFirst({
        where: { id: installationId, readerId: req.user.id },
      });
      if (!inst) return res.status(403).json({ message: 'Access denied' });
    }

    const repair = await prisma.waterRepair.create({
      data: {
        organizationId: req.organization.id,
        title,
        type: type || 'REPARATION',
        description,
        location,
        installationId: installationId || null,
        cost: cost ? parseFloat(cost) : null,
        reportedDate: reportedDate ? new Date(reportedDate) : new Date(),
        technicianName: technicianName || null,
        technicianAmount: technicianAmount ? parseFloat(technicianAmount) : null,
        partsNeeded: partsNeeded || null,
        workDetails: workDetails || null,
        deadline: deadline ? new Date(deadline) : null,
      },
      include: {
        installation: { select: { householdName: true, meterNumber: true } },
      },
    });

    res.status(201).json(repair);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateRepair = async (req, res) => {
  try {
    const {
      title, type, description, location, status, cost,
      technicianName, technicianAmount, partsNeeded, workDetails, deadline,
    } = req.body;
    const existing = await prisma.waterRepair.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Repair not found' });

    const repair = await prisma.waterRepair.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        type: type ?? existing.type,
        description: description !== undefined ? description : existing.description,
        location: location !== undefined ? location : existing.location,
        status: status ?? existing.status,
        cost: cost !== undefined ? parseFloat(cost) : existing.cost,
        resolvedDate: status === 'FIXED' && !existing.resolvedDate ? new Date() : existing.resolvedDate,
        technicianName: technicianName !== undefined ? technicianName : existing.technicianName,
        technicianAmount: technicianAmount !== undefined ? parseFloat(technicianAmount) : existing.technicianAmount,
        partsNeeded: partsNeeded !== undefined ? partsNeeded : existing.partsNeeded,
        workDetails: workDetails !== undefined ? workDetails : existing.workDetails,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : existing.deadline,
      },
    });

    res.json(repair);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteRepair = async (req, res) => {
  try {
    const existing = await prisma.waterRepair.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!existing) return res.status(404).json({ message: 'Repair not found' });
    await prisma.waterRepair.delete({ where: { id: req.params.id } });
    res.json({ message: 'Repair deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Summary & Reports ────────────────────────────────────────────────────────

const getSummary = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const instFilter = req.user.role === 'WATER_READER'
      ? { organizationId: orgId, readerId: req.user.id }
      : { organizationId: orgId };

    const [
      totalInstallations, activeInstallations,
      invoices, monthReadings, openRepairs,
    ] = await Promise.all([
      prisma.waterInstallation.count({ where: instFilter }),
      prisma.waterInstallation.count({ where: { ...instFilter, isActive: true } }),
      prisma.waterInvoice.findMany({
        where: { installation: instFilter },
        select: { amount: true, isPaid: true },
      }),
      prisma.meterReading.findMany({
        where: { installation: instFilter, readingDate: { gte: startOfMonth } },
        select: { consumption: true },
      }),
      prisma.waterRepair.count({
        where: {
          organizationId: orgId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          ...(req.user.role === 'WATER_READER' ? { installation: { readerId: req.user.id } } : {}),
        },
      }),
    ]);

    const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
    const totalPaid = invoices.filter((i) => i.isPaid).reduce((s, i) => s + i.amount, 0);
    const unpaidCount = invoices.filter((i) => !i.isPaid).length;

    res.json({
      totalInstallations,
      activeInstallations,
      totalBilled,
      totalPaid,
      outstanding: totalBilled - totalPaid,
      unpaidCount,
      openRepairs,
      totalConsumptionThisMonth: monthReadings.reduce((s, r) => s + r.consumption, 0),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getReports = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const now = new Date();

    // Build last 12 months list
    const monthLabels = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }

    // Fetch all readings and invoices for this org (last 12 months window)
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const [allReadings, allInvoices, allInstallations, allRepairs] = await Promise.all([
      prisma.meterReading.findMany({
        where: {
          installation: { organizationId: orgId },
          readingDate: { gte: startDate },
        },
        include: {
          installation: { select: { householdName: true, meterNumber: true } },
        },
      }),
      prisma.waterInvoice.findMany({
        where: {
          installation: { organizationId: orgId },
          createdAt: { gte: startDate },
        },
        include: {
          reading: { select: { month: true, year: true } },
          payment: true,
        },
      }),
      prisma.waterInstallation.findMany({
        where: { organizationId: orgId },
        include: {
          _count: { select: { readings: true } },
          readings: { select: { consumption: true, year: true } },
          invoices: { select: { amount: true, isPaid: true } },
        },
      }),
      prisma.waterRepair.findMany({
        where: { organizationId: orgId },
        select: { status: true, cost: true, createdAt: true },
      }),
    ]);

    // Monthly aggregation
    const monthly = monthLabels.map(({ month, year }) => {
      const readings = allReadings.filter((r) => r.month === month && r.year === year);
      const invoices = allInvoices.filter((i) => i.reading?.month === month && i.reading?.year === year);
      return {
        label: `${String(month).padStart(2, '0')}/${year}`,
        month,
        year,
        totalConsumption: readings.reduce((s, r) => s + r.consumption, 0),
        totalBilled: invoices.reduce((s, i) => s + i.amount, 0),
        totalPaid: invoices.filter((i) => i.isPaid).reduce((s, i) => s + i.amount, 0),
        subscriberCount: readings.length,
      };
    });

    // Per-installation summary (this year)
    const installationSummary = allInstallations
      .map((inst) => {
        const yearReadings = inst.readings.filter((r) => r.year === now.getFullYear());
        return {
          id: inst.id,
          householdName: inst.householdName,
          meterNumber: inst.meterNumber,
          isActive: inst.isActive,
          totalConsumption: yearReadings.reduce((s, r) => s + r.consumption, 0),
          totalBilled: inst.invoices.reduce((s, i) => s + i.amount, 0),
          totalPaid: inst.invoices.filter((i) => i.isPaid).reduce((s, i) => s + i.amount, 0),
          readingCount: inst._count.readings,
        };
      })
      .sort((a, b) => b.totalConsumption - a.totalConsumption);

    // Repairs breakdown
    const repairsByStatus = { PENDING: 0, IN_PROGRESS: 0, FIXED: 0 };
    let totalRepairCost = 0;
    allRepairs.forEach((r) => {
      repairsByStatus[r.status] = (repairsByStatus[r.status] || 0) + 1;
      if (r.status === 'FIXED' && r.cost) totalRepairCost += r.cost;
    });

    res.json({
      monthly,
      installations: installationSummary,
      repairs: { byStatus: repairsByStatus, totalRepairCost, total: allRepairs.length },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadPaymentReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const invoice = await prisma.waterInvoice.findFirst({
      where: { id: req.params.invoiceId, installation: { organizationId: req.organization.id } },
      include: { payment: true },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (!invoice.payment) return res.status(404).json({ message: 'Payment not found' });

    const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('./uploads');
    if (invoice.payment.receiptUrl) {
      const old = path.join(UPLOAD_DIR, path.basename(invoice.payment.receiptUrl));
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    const receiptUrl = `/uploads/${req.file.filename}`;
    const payment = await prisma.waterPayment.update({
      where: { id: invoice.payment.id },
      data: { receiptUrl },
    });
    res.json({ receiptUrl: payment.receiptUrl });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const exportInvoicePDF = (req, res) => generateWaterBillPDF(req, res).catch((err) => {
  console.error('Invoice PDF error:', err);
  if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' });
});

// ─── Reader Analytics ─────────────────────────────────────────────────────────

const getReaderAnalytics = async (req, res) => {
  try {
    const orgId = req.organization.id;
    const readerId = req.user.id;

    const [unpaidInvoices, openRepairs, installations] = await Promise.all([
      prisma.waterInvoice.findMany({
        where: {
          isPaid: false,
          installation: { organizationId: orgId, readerId },
        },
        include: {
          installation: { select: { householdName: true, meterNumber: true, phone: true } },
          reading: { select: { month: true, year: true, consumption: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.waterRepair.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          installation: { readerId },
        },
        include: {
          installation: { select: { householdName: true, meterNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.waterInstallation.findMany({
        where: { organizationId: orgId, readerId },
        select: { id: true, householdName: true, meterNumber: true, isActive: true, phone: true },
      }),
    ]);

    res.json({ unpaidInvoices, openRepairs, installations });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Reader (Lecteur) Management ─────────────────────────────────────────────

const getReaders = async (req, res) => {
  try {
    const readers = await prisma.user.findMany({
      where: { organizationId: req.organization.id, role: 'WATER_READER' },
      select: {
        id: true, name: true, email: true, isActive: true, createdAt: true,
        _count: { select: { organization: false } },
      },
    });

    // Attach installation count per reader
    const readersWithCount = await Promise.all(
      readers.map(async (r) => {
        const count = await prisma.waterInstallation.count({
          where: { organizationId: req.organization.id, readerId: r.id },
        });
        return { ...r, installationCount: count };
      })
    );

    res.json(readersWithCount);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createReader = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password required' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const reader = await prisma.user.create({
      data: {
        organizationId: req.organization.id,
        name,
        email,
        password: hashed,
        role: 'WATER_READER',
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    res.status(201).json(reader);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteReader = async (req, res) => {
  try {
    const reader = await prisma.user.findFirst({
      where: { id: req.params.readerId, organizationId: req.organization.id, role: 'WATER_READER' },
    });
    if (!reader) return res.status(404).json({ message: 'Reader not found' });

    // Unlink installations
    await prisma.waterInstallation.updateMany({
      where: { organizationId: req.organization.id, readerId: reader.id },
      data: { readerId: null },
    });

    await prisma.user.delete({ where: { id: reader.id } });
    res.json({ message: 'Reader deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getInstallations, getInstallation, createInstallation, updateInstallation, deleteInstallation,
  addReading, getReadings, getAllReadings,
  getInvoices, markPaid, uploadPaymentReceipt, exportInvoicePDF,
  getRepairs, createRepair, updateRepair, deleteRepair,
  getSummary, getReports, getReaderAnalytics,
  getReaders, createReader, deleteReader,
};
