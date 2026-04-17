const prisma = require('../../config/database');
const XLSX = require('xlsx');
const { log } = require('../activity/activity.controller');

const orgId = (req) => req.organization.id;

const sendXlsx = (res, workbook, filename) => {
  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
};

const exportMembers = async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      where: { organizationId: orgId(req) }, orderBy: { createdAt: 'desc' },
    });
    const rows = members.map(m => ({
      'Nom / الاسم': m.fullName || '',
      'Téléphone / الهاتف': m.phone || '',
      'Email': m.email || '',
      'CIN': m.cin || '',
      'Ville / المدينة': m.city || '',
      'Statut / الحالة': m.status || '',
      'Date adhésion': m.joinDate ? new Date(m.joinDate).toLocaleDateString('fr-MA') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Membres');
    log({ organizationId: orgId(req), userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role, action: 'EXPORT', entity: 'member', description: `Export Excel membres (${members.length} lignes)` });
    sendXlsx(res, wb, `membres_${Date.now()}.xlsx`);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const exportFinance = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { organizationId: orgId(req) };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    const txs = await prisma.transaction.findMany({ where, orderBy: { date: 'desc' } });
    const rows = txs.map(t => ({
      'Date': new Date(t.date).toLocaleDateString('fr-MA'),
      'Type': t.type,
      'Catégorie / الفئة': t.category || '',
      'Description': t.description || '',
      'Montant / المبلغ': t.amount,
      'Référence': t.reference || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    log({ organizationId: orgId(req), userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role, action: 'EXPORT', entity: 'transaction', description: `Export Excel finance (${txs.length} lignes)` });
    sendXlsx(res, wb, `finance_${Date.now()}.xlsx`);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const exportTransportStudents = async (req, res) => {
  try {
    const students = await prisma.transportStudent.findMany({
      where: { organizationId: orgId(req) },
      include: { route: { select: { name: true } } },
    });
    const rows = students.map(s => ({
      'Nom / الاسم': s.fullName || '',
      'Téléphone parent': s.parentPhone || '',
      'Niveau': s.level || '',
      'Itinéraire / الخط': s.route?.name || '',
      'Statut': s.status || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Élèves');
    sendXlsx(res, wb, `transport_eleves_${Date.now()}.xlsx`);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { exportMembers, exportFinance, exportTransportStudents };
