const prisma = require('../../config/database');
const ExcelJS = require('exceljs');
const { log } = require('../activity/activity.controller');

const orgId = (req) => req.organization.id;

// ── Brand palette ─────────────────────────────────────────────────────────────
const COLORS = {
  headerBg:     '1E3A5F',   // deep navy
  headerFg:     'FFFFFF',
  subHeaderBg:  '2D6A9F',   // medium blue
  subHeaderFg:  'FFFFFF',
  altRow:       'EBF3FB',   // light blue tint
  borderColor:  'BDD7EE',
  accentGreen:  '1E7E34',
  accentRed:    'C0392B',
  metaBg:       'F0F7FF',   // pale info band
  metaLabel:    '2D6A9F',
  metaValue:    '1A1A2E',
  totalBg:      'D6E4F0',
  totalFg:      '1A1A2E',
};

const thin  = { style: 'thin',  color: { argb: COLORS.borderColor } };
const thick = { style: 'medium', color: { argb: COLORS.headerBg } };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Embed logo from base64 data-URL and return imageId, or null. */
const addLogoToSheet = (workbook, logoDataUrl) => {
  if (!logoDataUrl) return null;
  try {
    const match = logoDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return null;
    const ext = match[1].split('/')[1].replace('jpeg', 'jpg');
    const base64 = match[2];
    return workbook.addImage({ base64, extension: ext });
  } catch { return null; }
};

/** Build the standard 6-row association header band, returns next data row. */
const buildOrgHeader = async (worksheet, workbook, org, title, colCount) => {
  const colLetter = String.fromCharCode(64 + colCount); // e.g. 'G' for 7 cols

  // ── Row 1: Organisation name (big) ──────────────────────────────────────────
  worksheet.mergeCells(`A1:${colLetter}1`);
  const nameCell = worksheet.getCell('A1');
  nameCell.value   = org.name || 'الجمعية';
  nameCell.font    = { bold: true, size: 18, color: { argb: COLORS.headerFg }, name: 'Calibri' };
  nameCell.fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  nameCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 40;

  // ── Row 2: Arabic name (if present) ─────────────────────────────────────────
  worksheet.mergeCells(`A2:${colLetter}2`);
  const nameArCell = worksheet.getCell('A2');
  nameArCell.value     = org.nameAr || '';
  nameArCell.font      = { bold: true, size: 13, color: { argb: COLORS.headerFg }, name: 'Calibri' };
  nameArCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subHeaderBg } };
  nameArCell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rightToLeft' };
  worksheet.getRow(2).height = 26;

  // ── Row 3: Meta info band ────────────────────────────────────────────────────
  const half = Math.floor(colCount / 2);
  const midLetter = String.fromCharCode(64 + half);
  const midNext   = String.fromCharCode(65 + half);

  worksheet.mergeCells(`A3:${midLetter}3`);
  const metaLeft = worksheet.getCell('A3');
  const addr = [org.address || org.addressAr, org.city || org.cityAr].filter(Boolean).join(' — ');
  metaLeft.value     = addr ? `📍  ${addr}` : '';
  metaLeft.font      = { size: 10, color: { argb: COLORS.metaLabel }, name: 'Calibri' };
  metaLeft.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.metaBg } };
  metaLeft.alignment = { horizontal: 'left', vertical: 'middle' };

  worksheet.mergeCells(`${midNext}3:${colLetter}3`);
  const metaRight = worksheet.getCell(`${midNext}3`);
  const contact = [org.phone, org.email].filter(Boolean).join('   |   ');
  metaRight.value     = contact ? `📞  ${contact}` : '';
  metaRight.font      = { size: 10, color: { argb: COLORS.metaLabel }, name: 'Calibri' };
  metaRight.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.metaBg } };
  metaRight.alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getRow(3).height = 22;

  // ── Row 4: Document title ────────────────────────────────────────────────────
  worksheet.mergeCells(`A4:${colLetter}4`);
  const titleCell = worksheet.getCell('A4');
  titleCell.value     = title;
  titleCell.font      = { bold: true, size: 12, color: { argb: COLORS.subHeaderBg }, name: 'Calibri' };
  titleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border    = { bottom: thick };
  worksheet.getRow(4).height = 24;

  // ── Row 5: Date generated ────────────────────────────────────────────────────
  worksheet.mergeCells(`A5:${colLetter}5`);
  const dateCell = worksheet.getCell('A5');
  dateCell.value     = `Généré le : ${new Date().toLocaleDateString('fr-MA', { year:'numeric', month:'long', day:'numeric' })}   |   تاريخ الطباعة: ${new Date().toLocaleDateString('ar-MA')}`;
  dateCell.font      = { size: 9, italic: true, color: { argb: '888888' }, name: 'Calibri' };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(5).height = 18;

  // ── Row 6: spacer ────────────────────────────────────────────────────────────
  worksheet.getRow(6).height = 8;

  // ── Logo top-right ───────────────────────────────────────────────────────────
  const imgId = addLogoToSheet(workbook, org.logo);
  if (imgId !== null) {
    worksheet.addImage(imgId, {
      tl: { col: colCount - 1.8, row: 0 },
      br: { col: colCount - 0.1, row: 1.9 },
      editAs: 'oneCell',
    });
  }

  return 7; // first data row
};

/** Style the column-header row (bold, colored). */
const styleHeaderRow = (worksheet, rowNum, colCount) => {
  const row = worksheet.getRow(rowNum);
  row.height = 20;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font      = { bold: true, size: 11, color: { argb: COLORS.headerFg }, name: 'Calibri' };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = { top: thick, bottom: thick, left: thin, right: thin };
  }
};

/** Style a data row with alternating colours and borders. */
const styleDataRow = (worksheet, rowNum, isAlt, colCount) => {
  const row = worksheet.getRow(rowNum);
  row.height = 18;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    if (isAlt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.altRow } };
    cell.font      = { size: 10, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', wrapText: false };
    cell.border    = { top: thin, bottom: thin, left: thin, right: thin };
  }
};

/** Add a totals row at the bottom. */
const addTotalsRow = (worksheet, rowNum, label, values, colCount) => {
  const row = worksheet.getRow(rowNum);
  row.height = 22;
  row.getCell(1).value = label;
  values.forEach((v, i) => { if (v !== null) row.getCell(i + 1).value = v; });
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font   = { bold: true, size: 11, name: 'Calibri', color: { argb: COLORS.totalFg } };
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
    cell.border = { top: thick, bottom: thick, left: thin, right: thin };
  }
};

/** Send the workbook as an xlsx response. */
const sendXlsx = async (res, workbook, filename) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
};

// ── MEMBERS ───────────────────────────────────────────────────────────────────
const exportMembers = async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId(req) } });
    const members = await prisma.member.findMany({
      where: { organizationId: orgId(req) },
      orderBy: [{ isActive: 'desc' }, { joinDate: 'asc' }],
    });

    const workbook  = new ExcelJS.Workbook();
    workbook.creator = org?.name || 'Jam3iyati';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('المنخرطون — Membres', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      views: [{ showGridLines: false }],
    });

    const HEADERS = ['#', 'الاسم / Nom', 'الهاتف / Téléphone', 'البريد الإلكتروني / Email', 'الدور / Rôle', 'الحالة / Statut', 'تاريخ الانخراط / Date adhésion'];
    ws.columns = [
      { width: 5 },
      { width: 30 },
      { width: 20 },
      { width: 28 },
      { width: 18 },
      { width: 18 },
      { width: 24 },
    ];

    const firstDataRow = await buildOrgHeader(ws, workbook, org, '📋  قائمة المنخرطين — Liste des membres', HEADERS.length);

    HEADERS.forEach((h, i) => ws.getRow(firstDataRow).getCell(i + 1).value = h);
    styleHeaderRow(ws, firstDataRow, HEADERS.length);

    // Data
    members.forEach((m, idx) => {
      const rn = firstDataRow + 1 + idx;
      const row = ws.getRow(rn);
      row.values = [
        idx + 1,
        m.name || '',
        m.phone || '',
        m.email || '',
        m.role || 'MEMBER',
        m.isActive ? 'نشط / Actif' : 'غير نشط / Inactif',
        m.joinDate ? new Date(m.joinDate).toLocaleDateString('fr-MA') : '',
      ];
      styleDataRow(ws, rn, idx % 2 === 1, HEADERS.length);
      // Colour status cell
      const statusCell = row.getCell(6);
      if (m.isActive) {
        statusCell.font = { bold: true, size: 10, color: { argb: COLORS.accentGreen }, name: 'Calibri' };
      } else {
        statusCell.font = { bold: true, size: 10, color: { argb: COLORS.accentRed }, name: 'Calibri' };
      }
    });

    // Totals
    const activeCount   = members.filter(m => m.isActive).length;
    const inactiveCount = members.length - activeCount;
    addTotalsRow(ws, firstDataRow + 1 + members.length,
      `الإجمالي / Total : ${members.length}   |   نشطون : ${activeCount}   |   غير نشطين : ${inactiveCount}`,
      [], HEADERS.length);

    log({ organizationId: orgId(req), userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role, action: 'EXPORT', entity: 'member', description: `Export Excel membres (${members.length})` });
    await sendXlsx(res, workbook, `membres_${org?.name?.replace(/\s+/g, '_') || 'export'}_${Date.now()}.xlsx`);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
};

// ── FINANCE ───────────────────────────────────────────────────────────────────
const exportFinance = async (req, res) => {
  try {
    const { from, to } = req.query;
    const org = await prisma.organization.findUnique({ where: { id: orgId(req) } });

    const where = { organizationId: orgId(req) };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to)   where.date.lte = new Date(to);
    }
    const txs = await prisma.transaction.findMany({ where, orderBy: { date: 'desc' } });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = org?.name || 'Jam3iyati';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('المالية — Finances', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      views: [{ showGridLines: false }],
    });

    const HEADERS = ['#', 'التاريخ / Date', 'النوع / Type', 'الفئة / Catégorie', 'الوصف / Description', 'المبلغ / Montant (MAD)', 'المرجع / Référence'];
    ws.columns = [
      { width: 5 },
      { width: 16 },
      { width: 14 },
      { width: 20 },
      { width: 35 },
      { width: 22 },
      { width: 20 },
    ];

    const periodLabel = from || to
      ? `${from ? 'من ' + new Date(from).toLocaleDateString('fr-MA') : ''}  ${to ? 'إلى ' + new Date(to).toLocaleDateString('fr-MA') : ''}`
      : 'جميع العمليات — Toutes les opérations';

    const firstDataRow = await buildOrgHeader(ws, workbook, org, `💰  السجل المالي — Registre financier   |   ${periodLabel}`, HEADERS.length);

    HEADERS.forEach((h, i) => ws.getRow(firstDataRow).getCell(i + 1).value = h);
    styleHeaderRow(ws, firstDataRow, HEADERS.length);

    let totalIn = 0, totalOut = 0;
    txs.forEach((t, idx) => {
      const rn  = firstDataRow + 1 + idx;
      const row = ws.getRow(rn);
      const isIncome = t.type === 'INCOME' || t.type === 'إيراد';
      row.values = [
        idx + 1,
        new Date(t.date).toLocaleDateString('fr-MA'),
        t.type || '',
        t.category || '',
        t.description || '',
        t.amount,
        t.reference || '',
      ];
      styleDataRow(ws, rn, idx % 2 === 1, HEADERS.length);
      // Colour amount
      const amtCell = row.getCell(6);
      amtCell.numFmt = '#,##0.00 "MAD"';
      amtCell.font   = { bold: true, size: 10, color: { argb: isIncome ? COLORS.accentGreen : COLORS.accentRed }, name: 'Calibri' };
      amtCell.alignment = { horizontal: 'right', vertical: 'middle' };
      if (isIncome) totalIn  += t.amount || 0;
      else          totalOut += t.amount || 0;
    });

    // Totals row
    const balance = totalIn - totalOut;
    const totals  = Array(HEADERS.length).fill(null);
    totals[0]  = `الإجمالي / Total (${txs.length} opérations)`;
    totals[5]  = `↑ ${totalIn.toFixed(2)}  |  ↓ ${totalOut.toFixed(2)}  |  Solde: ${balance >= 0 ? '+' : ''}${balance.toFixed(2)} MAD`;
    addTotalsRow(ws, firstDataRow + 1 + txs.length, totals[0], totals, HEADERS.length);
    const totalCell = ws.getRow(firstDataRow + 1 + txs.length).getCell(6);
    totalCell.value = `↑ ${totalIn.toFixed(2)}  ↓ ${totalOut.toFixed(2)}  =${balance >= 0 ? '+' : ''}${balance.toFixed(2)} MAD`;
    totalCell.font  = { bold: true, size: 10, color: { argb: balance >= 0 ? COLORS.accentGreen : COLORS.accentRed }, name: 'Calibri' };

    log({ organizationId: orgId(req), userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role, action: 'EXPORT', entity: 'transaction', description: `Export Excel finance (${txs.length})` });
    await sendXlsx(res, workbook, `finance_${org?.name?.replace(/\s+/g, '_') || 'export'}_${Date.now()}.xlsx`);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
};

// ── TRANSPORT STUDENTS ────────────────────────────────────────────────────────
const exportTransportStudents = async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId(req) } });
    const students = await prisma.transportStudent.findMany({
      where: { organizationId: orgId(req) },
      include: { route: { select: { name: true } } },
      orderBy: { fullName: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = org?.name || 'Jam3iyati';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('التلاميذ — Élèves', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      views: [{ showGridLines: false }],
    });

    const HEADERS = ['#', 'الاسم الكامل / Nom complet', 'هاتف الولي / Tél. parent', 'المستوى / Niveau', 'الخط / Itinéraire', 'الحالة / Statut'];
    ws.columns = [
      { width: 5 },
      { width: 28 },
      { width: 20 },
      { width: 16 },
      { width: 24 },
      { width: 16 },
    ];

    const firstDataRow = await buildOrgHeader(ws, workbook, org, '🚌  قائمة تلاميذ النقل المدرسي — Liste des élèves', HEADERS.length);

    HEADERS.forEach((h, i) => ws.getRow(firstDataRow).getCell(i + 1).value = h);
    styleHeaderRow(ws, firstDataRow, HEADERS.length);

    students.forEach((s, idx) => {
      const rn  = firstDataRow + 1 + idx;
      const row = ws.getRow(rn);
      row.values = [
        idx + 1,
        s.fullName || '',
        s.parentPhone || '',
        s.level || '',
        s.route?.name || '',
        s.status || 'ACTIVE',
      ];
      styleDataRow(ws, rn, idx % 2 === 1, HEADERS.length);
      const statusCell = row.getCell(6);
      const active = s.status !== 'INACTIVE';
      statusCell.font = { bold: true, size: 10, color: { argb: active ? COLORS.accentGreen : COLORS.accentRed }, name: 'Calibri' };
    });

    addTotalsRow(ws, firstDataRow + 1 + students.length,
      `الإجمالي / Total : ${students.length} تلميذ`, [], HEADERS.length);

    await sendXlsx(res, workbook, `transport_eleves_${org?.name?.replace(/\s+/g, '_') || 'export'}_${Date.now()}.xlsx`);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
};

module.exports = { exportMembers, exportFinance, exportTransportStudents };
