const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const arabicReshaper = require('arabic-reshaper');

const FONT_DIR  = path.join(__dirname, '../assets/fonts');
const FONT_AR   = path.join(FONT_DIR, 'Amiri-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'Amiri-Bold.ttf');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('./uploads');

const ar = (t) => {
  if (!t) return '';
  const shaped = arabicReshaper.convertArabic(String(t));
  return shaped.split(' ').reverse().join(' ');
};

const logoPath = (org) => {
  if (!org?.logo) return null;
  if (org.logo.startsWith('data:')) {
    try { return Buffer.from(org.logo.split(',')[1], 'base64'); } catch (_) { return null; }
  }
  return [
    path.join(UPLOAD_DIR, path.basename(org.logo)),
    path.join(process.cwd(), 'uploads', path.basename(org.logo)),
  ].find(p => fs.existsSync(p)) || null;
};

const FR_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const fmtDate = (d = new Date()) => `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/**
 * Generate an invoice/receipt PDF
 * @param {object} opts
 * @param {object} opts.org - Organization record
 * @param {object} opts.transaction - Transaction record
 * @param {string} opts.memberName - Optional member name
 * @returns {Promise<Buffer>}
 */
const generateInvoicePdf = ({ org, transaction, memberName }) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 595, H = 842;
    const PL = 50, PR = W - 50;
    const hasAr = fs.existsSync(FONT_AR);

    // ── Header band ──
    doc.save().rect(0, 0, W, 100).fill('#0d2b5e').restore();

    // Logo
    const lp = logoPath(org);
    if (lp) {
      try { doc.image(lp, 50, 15, { height: 70, fit: [70, 70] }); } catch {}
    }

    // Org name (white)
    doc.font(hasAr ? FONT_BOLD : 'Helvetica-Bold').fontSize(16).fillColor('#ffffff');
    doc.text(org?.name || 'Association', 135, 28, { width: 310 });
    if (org?.city) {
      doc.font(hasAr ? FONT_AR : 'Helvetica').fontSize(10).fillColor('#bfdbfe');
      doc.text(org.city, 135, 50, { width: 310 });
    }

    // Invoice label (top right)
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#60a5fa');
    doc.text('REÇU', W - 140, 30, { width: 90, align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor('#bfdbfe');
    const invoiceNum = `#${String(transaction.id || '').slice(-6).toUpperCase()}`;
    doc.text(invoiceNum, W - 140, 58, { width: 90, align: 'right' });

    // ── Body ──
    let y = 130;

    // Date + Type band
    doc.save().rect(PL, y, W - 100, 1).fill('#e5e7eb').restore();
    y += 10;

    const typeColor = transaction.type === 'INCOME' ? '#15803d' : '#b91c1c';
    const typeLabel = transaction.type === 'INCOME' ? 'REVENU / دخل' : 'DÉPENSE / مصروف';

    doc.font('Helvetica-Bold').fontSize(11).fillColor(typeColor);
    doc.text(typeLabel, PL, y);
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
    doc.text(`Date: ${fmtDate(new Date(transaction.date || Date.now()))}`, PL, y, { align: 'right', width: W - 100 });
    y += 30;

    // Info table
    const row = (label, value, yp) => {
      doc.save().rect(PL, yp, W - 100, 28).fill('#f9fafb').restore();
      doc.font('Helvetica').fontSize(10).fillColor('#374151');
      doc.text(label, PL + 10, yp + 8, { width: 150 });
      doc.font('Helvetica-Bold').fillColor('#111827');
      doc.text(String(value || '—'), PL + 170, yp + 8, { width: W - 280 });
    };

    row('Bénéficiaire / المستفيد', memberName || org?.name || '—', y); y += 32;
    row('Catégorie / الفئة', transaction.category || '—', y); y += 32;
    row('Description', transaction.description || '—', y); y += 32;
    if (transaction.reference) { row('Référence', transaction.reference, y); y += 32; }

    y += 10;

    // Amount box
    doc.save().rect(PL, y, W - 100, 56).fill('#0d2b5e').restore();
    doc.font('Helvetica').fontSize(11).fillColor('#bfdbfe');
    doc.text('MONTANT TOTAL / المبلغ الإجمالي', PL + 16, y + 8);
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff');
    doc.text(`${Number(transaction.amount || 0).toLocaleString('fr-MA')} MAD`, PL + 16, y + 24);
    y += 76;

    // Arabic note
    if (hasAr) {
      y += 10;
      doc.font(FONT_AR).fontSize(10).fillColor('#6b7280');
      const arNote = ar('هذا الوصل يُعدّ إثباتاً رسمياً للمعاملة المالية');
      doc.text(arNote, PL, y, { width: W - 100, align: 'right' });
      y += 20;
    }

    // Footer
    doc.save().rect(0, H - 60, W, 60).fill('#f3f4f6').restore();
    doc.font('Helvetica').fontSize(9).fillColor('#9ca3af');
    doc.text(`Généré par Mar E-A.C • ${fmtDate()} • ${org?.email || ''}`, 0, H - 38, { width: W, align: 'center' });

    doc.end();
  });
};

module.exports = { generateInvoicePdf };
