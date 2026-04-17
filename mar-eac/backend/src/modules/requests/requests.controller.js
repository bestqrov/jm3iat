const prisma  = require('../../config/database');
const axios   = require('axios');
const { generateRequestLetterPdf } = require('../../utils/requestLetterPdf');

// ─── Evolution API (WhatsApp) ─────────────────────────────────────────────────
const EVO_URL      = process.env.EVOLUTION_API_URL  || '';
const EVO_KEY      = process.env.EVOLUTION_API_KEY  || '';
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || 'main';

const sendWA = async (phone, text) => {
  const url = `${EVO_URL}/message/sendText/${EVO_INSTANCE}`;
  return axios.post(url, { number: phone.replace(/[\s\-\+]/g, ''), textMessage: { text } },
    { headers: { apikey: EVO_KEY, 'Content-Type': 'application/json' }, timeout: 15000 });
};

// ─── Letter templates ─────────────────────────────────────────────────────────
const LETTER_TEMPLATES = [
  {
    id: 'financial_support',
    nameAr: 'طلب دعم مالي',     nameFr: 'Demande de soutien financier',
    descAr: 'طلب دعم مالي من جهة حكومية أو متبرع',
    descFr: 'Solliciter un soutien financier auprès d\'une institution',
    icon: '💰',
    bodyAr: (c) => `تتشرف جمعية "${c.orgName}" بأن تتقدم إليكم بهذا الطلب راجيةً تقديم الدعم المالي اللازم لتمكينها من مواصلة أنشطتها الاجتماعية والتنموية في خدمة المجتمع المحلي.\n\n${c.description ? `التفاصيل: ${c.description}\n\n` : ''}تأمل الجمعية أن تجد طلبها هذا قبولاً لديكم، مؤكدةً التزامها الكامل بتحقيق أهدافها المسطرة وتوظيف كل دعم في وجهته الصحيحة والمشروعة.`,
    bodyFr: (c) => `L'association "${c.orgName}" a l'honneur de vous soumettre la présente demande de soutien financier afin de lui permettre de poursuivre ses activités sociales et de développement au service de la communauté locale.\n\n${c.description ? `Détails : ${c.description}\n\n` : ''}L'association espère que sa demande retiendra votre bienveillante attention, et s'engage à affecter tout soutien à ses objectifs déclarés.`,
  },
  {
    id: 'partnership',
    nameAr: 'طلب شراكة',        nameFr: 'Demande de partenariat',
    descAr: 'طلب إبرام اتفاقية شراكة',
    descFr: 'Proposition de convention de partenariat',
    icon: '🤝',
    bodyAr: (c) => `انطلاقاً من الرغبة المشتركة في تعزيز التعاون وتحقيق التنمية المستدامة، تتقدم جمعية "${c.orgName}" بطلب إبرام اتفاقية شراكة مع جهتكم الكريمة.\n\n${c.description ? `${c.description}\n\n` : ''}إن هذه الشراكة ستمكّن الطرفين من تجميع الموارد والكفاءات لخدمة الأهداف المشتركة، وتحقيق نتائج ملموسة على المستوى المحلي.\n\nنحن على استعداد تام للتشاور معكم لصياغة اتفاقية شراكة تراعي مصالح الجميع.`,
    bodyFr: (c) => `Dans un esprit de coopération et de développement durable, l'association "${c.orgName}" souhaite proposer l'établissement d'un partenariat avec votre institution.\n\n${c.description ? `${c.description}\n\n` : ''}Ce partenariat permettra aux deux parties de mutualiser leurs ressources et compétences pour atteindre des objectifs communs et produire des résultats concrets au niveau local.\n\nNous sommes entièrement disponibles pour toute concertation en vue d'élaborer une convention répondant aux intérêts de tous.`,
  },
  {
    id: 'project_funding',
    nameAr: 'طلب تمويل مشروع',  nameFr: 'Demande de financement de projet',
    descAr: 'طلب تمويل مشروع تنموي أو اجتماعي',
    descFr: 'Financement d\'un projet de développement ou social',
    icon: '🏗️',
    bodyAr: (c) => `تتشرف جمعية "${c.orgName}" بعرض مشروعها التنموي على أنظاركم الكريمة، والمتعلق بـ: "${c.title}"، طالبةً منكم الدعم والتمويل اللازمين لإنجازه.\n\n${c.description ? `${c.description}\n\n` : ''}يستهدف هذا المشروع خدمة الفئات المستفيدة بشكل مباشر، وسيُسهم بشكل فعّال في التنمية الاجتماعية والاقتصادية للمنطقة.\n\nنحن مستعدون لتقديم دراسة مفصلة للمشروع، ووثائق الشفافية المالية، وكل ما يلزم من ضمانات.`,
    bodyFr: (c) => `L'association "${c.orgName}" a l'honneur de vous présenter son projet de développement intitulé : "${c.title}", et sollicite votre soutien et financement pour sa réalisation.\n\n${c.description ? `${c.description}\n\n` : ''}Ce projet vise à bénéficier directement aux populations cibles et contribuera significativement au développement socio-économique de la région.\n\nNous sommes prêts à fournir une étude détaillée du projet, les documents de transparence financière et toutes les garanties nécessaires.`,
  },
  {
    id: 'commune_request',
    nameAr: 'طلب من الجماعة',   nameFr: 'Demande à la commune',
    descAr: 'طلب موجه للجماعة الترابية',
    descFr: 'Demande adressée à la collectivité territoriale',
    icon: '🏛️',
    bodyAr: (c) => `تتقدم جمعية "${c.orgName}" بهذا الطلب إلى السلطة الجماعية المحترمة، راجيةً النظر فيه بعين الاعتبار والمساعدة على تحقيقه.\n\n${c.description ? `${c.description}\n\n` : ''}إن تحقيق هذا الطلب سيعود بالنفع الكبير على ساكنة المنطقة، وسيعزز الثقة المتبادلة بين الجمعية والمجلس الجماعي.\n\nنأمل أن تولوا هذا الطلب الأهمية اللازمة، ونبقى رهن إشارتكم.`,
    bodyFr: (c) => `L'association "${c.orgName}" adresse la présente demande aux autorités communales, sollicitant leur considération et leur aide pour sa réalisation.\n\n${c.description ? `${c.description}\n\n` : ''}La satisfaction de cette demande profitera grandement aux habitants de la région et renforcera la confiance mutuelle entre l'association et le conseil communal.\n\nNous espérons que cette demande recevra toute l'attention qu'elle mérite et restons à votre disposition.`,
  },
  {
    id: 'ministry_request',
    nameAr: 'طلب من وزارة',     nameFr: 'Demande au ministère',
    descAr: 'طلب موجه لوزارة أو مصلحة حكومية',
    descFr: 'Demande adressée à un ministère ou service public',
    icon: '🏢',
    bodyAr: (c) => `تتشرف جمعية "${c.orgName}" بتقديم هذا الطلب إلى وزارتكم الجليلة، إيماناً منها بدور المؤسسات الحكومية في دعم المجتمع المدني وتعزيز العمل الجمعوي.\n\n${c.description ? `${c.description}\n\n` : ''}تأمل الجمعية في أن يحظى هذا الطلب بدراسة إيجابية، مؤكدةً التزامها بجميع الإجراءات القانونية والتنظيمية المعمول بها.`,
    bodyFr: (c) => `L'association "${c.orgName}" a l'honneur de soumettre la présente demande à votre ministère, convaincue du rôle des institutions gouvernementales dans le soutien à la société civile.\n\n${c.description ? `${c.description}\n\n` : ''}L'association espère que cette demande fera l'objet d'une étude favorable, et s'engage à respecter toutes les procédures légales et réglementaires en vigueur.`,
  },
  {
    id: 'equipment',
    nameAr: 'طلب تجهيزات',      nameFr: 'Demande d\'équipements',
    descAr: 'طلب تجهيزات أو مواد أو مقر للجمعية',
    descFr: 'Demande d\'équipements, matériaux ou local',
    icon: '📦',
    bodyAr: (c) => `في إطار تطوير قدراتها وتحسين خدماتها للمواطنين، تتقدم جمعية "${c.orgName}" بطلب الحصول على التجهيزات والوسائل اللازمة لتنفيذ برامجها وأنشطتها.\n\n${c.description ? `${c.description}\n\n` : ''}إن توفير هذه التجهيزات سيُمكّن الجمعية من أداء دورها الاجتماعي والتنموي على أحسن وجه، وتقديم خدمات أفضل للمستفيدين.`,
    bodyFr: (c) => `Dans le cadre du développement de ses capacités et de l'amélioration de ses services aux citoyens, l'association "${c.orgName}" sollicite les équipements et moyens nécessaires à la réalisation de ses programmes et activités.\n\n${c.description ? `${c.description}\n\n` : ''}La mise à disposition de ces équipements permettra à l'association de remplir son rôle social et de développement dans les meilleures conditions.`,
  },
];

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

// ─── GET /requests/templates ──────────────────────────────────────────────────
const getTemplates = (req, res) => {
  res.json(LETTER_TEMPLATES.map(({ id, nameAr, nameFr, descAr, descFr, icon }) =>
    ({ id, nameAr, nameFr, descAr, descFr, icon })));
};

// ─── POST /requests/:id/pdf?templateId=&lang= ─────────────────────────────────
const generateLetterPdf = async (req, res) => {
  try {
    const { templateId = 'financial_support', lang = 'ar' } = req.query;
    const tpl = LETTER_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return res.status(400).json({ message: 'Unknown template' });

    const request = await prisma.request.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const org = await prisma.organization.findUnique({ where: { id: req.organization.id } });

    await generateRequestLetterPdf(org, request, tpl, lang, res);
  } catch (err) {
    console.error('[generateLetterPdf]', err);
    if (!res.headersSent) res.status(500).json({ message: 'PDF generation failed' });
  }
};

// ─── POST /requests/:id/send ──────────────────────────────────────────────────
const sendLetter = async (req, res) => {
  try {
    const { templateId = 'financial_support', channel = 'whatsapp', lang = 'ar' } = req.body;
    const tpl = LETTER_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return res.status(400).json({ message: 'Unknown template' });

    const request = await prisma.request.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const org = await prisma.organization.findUnique({ where: { id: req.organization.id } });

    if (channel === 'whatsapp') {
      if (!EVO_URL || !EVO_KEY) return res.status(502).json({ message: 'WhatsApp not configured' });
      const phone = request.recipient?.match(/^\+?[\d\s\-]{8,}$/) ? request.recipient : org?.phone;
      if (!phone) return res.status(400).json({ message: 'No phone number available' });

      const orgName = org?.nameAr || org?.name || '';
      const msg = lang === 'fr'
        ? `*${tpl.nameFr}*\n\nAssociation : ${orgName}\nObjet : ${request.title}${request.recipient ? `\nDestinataire : ${request.recipient}` : ''}${request.amount ? `\nMontant : ${Number(request.amount).toLocaleString('fr-MA')} MAD` : ''}\n\n${tpl.descFr}`
        : `*${tpl.nameAr}*\n\nالجمعية: ${orgName}\nالموضوع: ${request.title}${request.recipient ? `\nإلى: ${request.recipient}` : ''}${request.amount ? `\nالمبلغ: ${Number(request.amount).toLocaleString('fr-MA')} درهم` : ''}\n\n${tpl.descAr}`;

      await sendWA(phone, msg);
      return res.json({ success: true, channel: 'whatsapp', phone });
    }

    if (channel === 'email') {
      // Email sending placeholder — will integrate nodemailer/sendgrid when configured
      return res.json({ success: true, channel: 'email', note: 'Email service not yet configured — PDF downloaded instead.' });
    }

    res.status(400).json({ message: 'Invalid channel' });
  } catch (err) {
    console.error('[sendLetter]', err);
    res.status(500).json({ message: err.message || 'Send failed' });
  }
};

module.exports = { getAll, getById, create, update, remove, getStats, getTemplates, generateLetterPdf, sendLetter };
