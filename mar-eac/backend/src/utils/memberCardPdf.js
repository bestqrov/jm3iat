const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { PassThrough } = require('stream');
const arabicReshaper = require('arabic-reshaper');

const FONT_AR      = path.join(__dirname, '../assets/fonts/Amiri-Regular.ttf');
const FONT_AR_BOLD = path.join(__dirname, '../assets/fonts/Amiri-Bold.ttf');
const hasFont = fs.existsSync(FONT_AR);

const reshape = (text) => {
  if (!text) return '';
  const shaped = arabicReshaper.convertArabic(String(text));
  return shaped.split(' ').reverse().join(' ');
};

const CW = 270;  // card width  (pt)
const CH = 400;  // card height (pt)

// Network dot positions for the decorative pattern
const DOTS = [
  [38, 55], [78, 28], [132, 48], [192, 38], [228, 78],
  [58, 102], [162, 88], [208, 118], [28, 152], [102, 138],
  [242, 58], [152, 18], [20, 80], [250, 140],
];
const CONNS = [
  [0,1],[1,2],[2,3],[3,4],[4,6],[5,6],[6,7],
  [0,5],[8,9],[3,11],[2,11],[10,4],[12,0],[7,13],
];

async function _render(member, org, lang, outStream) {
  const isAr = lang === 'ar' && hasFont;
  const regularFont = isAr ? FONT_AR      : 'Helvetica';
  const boldFont    = isAr ? (fs.existsSync(FONT_AR_BOLD) ? FONT_AR_BOLD : FONT_AR) : 'Helvetica-Bold';
  const t = (text) => isAr ? reshape(String(text || '')) : String(text || '');

  const doc = new PDFDocument({ size: [CW, CH], margin: 0, info: { Title: 'Member Card' } });
  doc.pipe(outStream);

  // ── Deep gradient background ──────────────────────────────────────────────
  const bgGrad = doc.linearGradient(0, 0, CW, CH);
  bgGrad.stop(0,   '#050d2a');
  bgGrad.stop(0.45,'#0f1b5c');
  bgGrad.stop(1,   '#09082e');
  doc.rect(0, 0, CW, CH).fill(bgGrad);

  // Secondary diagonal glow (purple haze)
  const glowGrad = doc.linearGradient(CW * 0.3, CH * 0.2, CW * 0.9, CH * 0.7);
  glowGrad.stop(0, '#2a0a5e');
  glowGrad.stop(1, '#050d2a');
  doc.circle(CW * 0.62, CH * 0.45, 120).fill(glowGrad);

  // ── Network dot decoration ────────────────────────────────────────────────
  doc.save();
  doc.strokeColor('#3a5acc').lineWidth(0.4).opacity(0.35);
  CONNS.forEach(([a, b]) => {
    if (DOTS[a] && DOTS[b]) {
      doc.moveTo(DOTS[a][0], DOTS[a][1]).lineTo(DOTS[b][0], DOTS[b][1]).stroke();
    }
  });
  DOTS.forEach(([x, y], i) => {
    doc.opacity(i % 3 === 0 ? 0.7 : 0.4).circle(x, y, i % 4 === 0 ? 2.5 : 1.8).fill('#6888ee');
  });
  doc.restore();

  // ── Glowing ring (logo area) ──────────────────────────────────────────────
  const lcx = CW / 2, lcy = 98;
  // Outer glow rings
  doc.save().opacity(0.2).circle(lcx, lcy, 56).lineWidth(1).strokeColor('#7090ff').stroke().restore();
  doc.save().opacity(0.35).circle(lcx, lcy, 50).lineWidth(1).strokeColor('#5070ee').stroke().restore();
  // Inner filled circle
  const logoGrad = doc.radialGradient(lcx - 8, lcy - 8, 5, lcx, lcy, 42);
  logoGrad.stop(0, '#1e3a9e');
  logoGrad.stop(1, '#0c1d60');
  doc.circle(lcx, lcy, 42).fill(logoGrad);

  // Org logo or initials
  const orgDisplayName = (lang === 'ar' && org.nameAr) ? org.nameAr : org.name;
  if (org.logo) {
    const logoPath = path.join(__dirname, '../../uploads', path.basename(org.logo));
    if (fs.existsSync(logoPath)) {
      try {
        doc.save().circle(lcx, lcy, 38).clip();
        doc.image(logoPath, lcx - 38, lcy - 38, { width: 76, height: 76 });
        doc.restore();
      } catch (_) { _drawInitials(doc, boldFont, orgDisplayName, lcx, lcy); }
    } else {
      _drawInitials(doc, boldFont, orgDisplayName, lcx, lcy);
    }
  } else {
    _drawInitials(doc, boldFont, orgDisplayName, lcx, lcy);
  }

  // ── Org name ─────────────────────────────────────────────────────────────
  doc.fillColor('#a0b8ff').font(regularFont).fontSize(9).opacity(1);
  doc.text(t(orgDisplayName), 0, 150, { width: CW, align: 'center' });

  // ── Thin separator ────────────────────────────────────────────────────────
  const sepGrad = doc.linearGradient(CW * 0.15, 167, CW * 0.85, 167);
  sepGrad.stop(0, '#050d2a');
  sepGrad.stop(0.5, '#4060cc');
  sepGrad.stop(1, '#050d2a');
  doc.moveTo(CW * 0.15, 167).lineTo(CW * 0.85, 167).lineWidth(0.7).strokeColor('#4060cc').stroke();

  // ── Member name ──────────────────────────────────────────────────────────
  doc.fillColor('white').font(boldFont).fontSize(22).opacity(1);
  doc.text(t(member.name), 16, 178, { width: CW - 32, align: 'center' });

  // ── Details ──────────────────────────────────────────────────────────────
  let detailY = 210;
  doc.fillColor('#8aaae0').font(regularFont).fontSize(8.5).opacity(0.9);

  if (member.phone) {
    doc.text(member.phone, 0, detailY, { width: CW, align: 'center' });
    detailY += 14;
  }
  if (member.email) {
    doc.text(member.email, 0, detailY, { width: CW, align: 'center' });
    detailY += 14;
  }
  if (member.joinDate) {
    const joinLabel = lang === 'ar'
      ? `تاريخ الانخراط: ${new Date(member.joinDate).toLocaleDateString('fr-MA')}`
      : `Adhésion : ${new Date(member.joinDate).toLocaleDateString('fr-MA')}`;
    doc.text(t(joinLabel), 0, detailY, { width: CW, align: 'center' });
    detailY += 14;
  }

  // Card number
  const cardNum = `N° ${member.id.slice(0, 8).toUpperCase()}`;
  doc.fillColor('#4a6aaa').font(regularFont).fontSize(7.5).opacity(0.8);
  doc.text(cardNum, 0, detailY + 2, { width: CW, align: 'center' });

  // ── Bottom role band ─────────────────────────────────────────────────────
  const bandY = CH - 72;
  const bandGrad = doc.linearGradient(0, bandY, CW, bandY + 72);
  bandGrad.stop(0, '#1030bb');
  bandGrad.stop(1, '#4a0a99');
  doc.rect(0, bandY, CW, 72).fill(bandGrad).opacity(1);

  // Top edge of band — thin highlight
  doc.moveTo(0, bandY).lineTo(CW, bandY).lineWidth(0.8).strokeColor('#6080ff').stroke();

  // ── QR code — always on the left ─────────────────────────────────────────
  const qrData = member.email || member.phone || `MAR-EAC:${member.id}`;
  const qrBuffer = await QRCode.toBuffer(qrData, {
    type: 'png',
    width: 58,
    margin: 1,
    color: { dark: '#ffffff', light: '#00000000' },
  });
  doc.image(qrBuffer, 8, bandY + 8, { width: 56 });

  // Role text — centered in the remaining space (after QR)
  const roleLabel = lang === 'ar' ? 'منخرط' : 'MEMBRE';
  doc.fillColor('white').font(boldFont).fontSize(24).opacity(1);
  doc.text(t(roleLabel), 64, bandY + 20, { width: CW - 64, align: 'center' });

  doc.end();
}

function _drawInitials(doc, boldFont, name, cx, cy) {
  const words = (name || '').split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  doc.fillColor('white').font(boldFont).fontSize(20).opacity(1);
  const iw = doc.widthOfString(initials);
  doc.text(initials, cx - iw / 2, cy - 13, { lineBreak: false });
}

// Returns a Buffer — used for email attachment
const buildMemberCard = (member, org, lang = 'ar') => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const pass = new PassThrough();
    pass.on('data', c => chunks.push(c));
    pass.on('end',  () => resolve(Buffer.concat(chunks)));
    pass.on('error', reject);
    _render(member, org, lang, pass).catch(reject);
  });
};

// Express handler — streams directly to response
const generateMemberCard = async (req, res) => {
  try {
    const prisma = require('../config/database');
    const orgId  = req.organization.id;
    const { id } = req.params;
    const lang   = req.query.lang || 'ar';

    const member = await prisma.member.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, nameAr: true, logo: true },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="card-${id}.pdf"`);

    await _render(member, org, lang, res);
  } catch (err) {
    console.error('[memberCard]', err);
    if (!res.headersSent) res.status(500).json({ message: 'Card generation failed' });
  }
};

module.exports = { generateMemberCard, buildMemberCard };
