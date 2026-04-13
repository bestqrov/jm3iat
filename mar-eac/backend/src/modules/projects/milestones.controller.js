const prisma = require('../../config/database');
const { generateProjectReportPDF } = require('../../utils/projectReportPdf');

// ─── Templates per project type ───────────────────────────────────────────────
const PLAN_TEMPLATES = {
  WATER: [
    { title: 'Étude de faisabilité / دراسة الجدوى', pct: 0.06 },
    { title: 'Appel d\'offres / طلب العروض', pct: 0.14 },
    { title: 'Attribution du marché / إسناد الصفقة', pct: 0.20 },
    { title: 'Mobilisation des ressources / تعبئة الموارد', pct: 0.26 },
    { title: 'Travaux phase 1 — Terrassement / أشغال المرحلة 1', pct: 0.40 },
    { title: 'Travaux phase 2 — Canalisation / أشغال المرحلة 2', pct: 0.60 },
    { title: 'Travaux phase 3 — Raccordements / أشغال المرحلة 3', pct: 0.76 },
    { title: 'Tests, essais et mise en service / الاختبار والتشغيل', pct: 0.88 },
    { title: 'Réception provisoire / الاستلام المبدئي', pct: 0.94 },
    { title: 'Rapport final et clôture / التقرير الختامي والإغلاق', pct: 1.0 },
  ],
  ROAD: [
    { title: 'Levé topographique / مسح طبوغرافي', pct: 0.05 },
    { title: 'Étude technique / الدراسة التقنية', pct: 0.12 },
    { title: 'Appel d\'offres / طلب العروض', pct: 0.20 },
    { title: 'Attribution et démarrage / إسناد وانطلاق', pct: 0.26 },
    { title: 'Terrassement et décaissement / الحفر والتسوية', pct: 0.40 },
    { title: 'Sous-couche et fondation / الطبقة الأساسية', pct: 0.58 },
    { title: 'Couche de roulement / طبقة الأسفلت', pct: 0.76 },
    { title: 'Signalisation et finition / الإشارات والتشطيب', pct: 0.88 },
    { title: 'Réception et livraison / الاستلام والتسليم', pct: 1.0 },
  ],
  HEALTH: [
    { title: 'Analyse des besoins / تحليل الاحتياجات', pct: 0.08 },
    { title: 'Plans architecturaux / المخططات المعمارية', pct: 0.18 },
    { title: 'Appel d\'offres / طلب العروض', pct: 0.26 },
    { title: 'Gros œuvre / أشغال البناء الكبرى', pct: 0.50 },
    { title: 'Second œuvre et équipements / التجهيزات', pct: 0.72 },
    { title: 'Inspection sanitaire / التفتيش الصحي', pct: 0.85 },
    { title: 'Formation du personnel / تكوين الكوادر', pct: 0.93 },
    { title: 'Inauguration et rapport / التدشين والتقرير', pct: 1.0 },
  ],
  EDUCATION: [
    { title: 'Diagnostic et besoins / التشخيص والاحتياجات', pct: 0.07 },
    { title: 'Étude et conception / الدراسة والتصميم', pct: 0.16 },
    { title: 'Appel d\'offres / طلب العروض', pct: 0.24 },
    { title: 'Construction / البناء', pct: 0.55 },
    { title: 'Équipement / التجهيز', pct: 0.72 },
    { title: 'Inspection et validation / التفتيش والتصديق', pct: 0.85 },
    { title: 'Inauguration et rapport / التدشين والتقرير', pct: 1.0 },
  ],
  INFRASTRUCTURE: [
    { title: 'Études préliminaires / الدراسات الأولية', pct: 0.08 },
    { title: 'Conception technique / التصميم التقني', pct: 0.17 },
    { title: 'Appel d\'offres / طلب العروض', pct: 0.25 },
    { title: 'Mobilisation et installation de chantier / التجهيز والانطلاق', pct: 0.32 },
    { title: 'Travaux phase 1 / أشغال المرحلة 1', pct: 0.52 },
    { title: 'Travaux phase 2 / أشغال المرحلة 2', pct: 0.72 },
    { title: 'Contrôle qualité / مراقبة الجودة', pct: 0.85 },
    { title: 'Réception et rapport / الاستلام والتقرير', pct: 1.0 },
  ],
  ENVIRONMENT: [
    { title: 'Diagnostic environnemental / التشخيص البيئي', pct: 0.10 },
    { title: 'Plan d\'action / خطة العمل', pct: 0.20 },
    { title: 'Mobilisation des acteurs / تعبئة الأطراف', pct: 0.30 },
    { title: 'Activités terrain phase 1 / أنشطة ميدانية 1', pct: 0.50 },
    { title: 'Activités terrain phase 2 / أنشطة ميدانية 2', pct: 0.70 },
    { title: 'Suivi et évaluation / المتابعة والتقييم', pct: 0.85 },
    { title: 'Rapport final / التقرير النهائي', pct: 1.0 },
  ],
  AGRICULTURE: [
    { title: 'Étude agro-socioéconomique / الدراسة الزراعية', pct: 0.08 },
    { title: 'Sélection des bénéficiaires / اختيار المستفيدين', pct: 0.16 },
    { title: 'Approvisionnement / التزود بالمستلزمات', pct: 0.28 },
    { title: 'Préparation des terres / تحضير الأراضي', pct: 0.40 },
    { title: 'Mise en place des cultures / الزراعة', pct: 0.56 },
    { title: 'Suivi technique / المتابعة التقنية', pct: 0.74 },
    { title: 'Récolte et évaluation / الحصاد والتقييم', pct: 0.88 },
    { title: 'Rapport et capitalisation / التقرير والتوثيق', pct: 1.0 },
  ],
  OTHER: [
    { title: 'Lancement et cadrage / الانطلاق والإطار', pct: 0.08 },
    { title: 'Planification détaillée / التخطيط التفصيلي', pct: 0.18 },
    { title: 'Appel d\'offres / طلب العروض', pct: 0.28 },
    { title: 'Phase de réalisation 1 / مرحلة التنفيذ 1', pct: 0.48 },
    { title: 'Phase de réalisation 2 / مرحلة التنفيذ 2', pct: 0.68 },
    { title: 'Contrôle et ajustements / المراجعة والتعديلات', pct: 0.82 },
    { title: 'Clôture et rapport final / الإغلاق والتقرير', pct: 1.0 },
  ],
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

const getMilestones = async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId: req.params.id },
      orderBy: { order: 'asc' },
    });
    res.json(milestones);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createMilestone = async (req, res) => {
  try {
    const { title, description, plannedDate, actualDate, status, order } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });

    const project = await prisma.project.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const last = await prisma.projectMilestone.findFirst({
      where: { projectId: req.params.id },
      orderBy: { order: 'desc' },
    });

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId: req.params.id,
        title,
        description: description || null,
        plannedDate: plannedDate ? new Date(plannedDate) : null,
        actualDate: actualDate ? new Date(actualDate) : null,
        status: status || 'PENDING',
        order: order !== undefined ? parseInt(order) : (last ? last.order + 1 : 0),
      },
    });
    res.status(201).json(milestone);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateMilestone = async (req, res) => {
  try {
    const { title, description, plannedDate, actualDate, status, order } = req.body;
    const existing = await prisma.projectMilestone.findFirst({
      where: { id: req.params.milestoneId, projectId: req.params.id },
    });
    if (!existing) return res.status(404).json({ message: 'Milestone not found' });

    const milestone = await prisma.projectMilestone.update({
      where: { id: req.params.milestoneId },
      data: {
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        plannedDate: plannedDate !== undefined ? (plannedDate ? new Date(plannedDate) : null) : existing.plannedDate,
        actualDate: actualDate !== undefined ? (actualDate ? new Date(actualDate) : null) : existing.actualDate,
        status: status ?? existing.status,
        order: order !== undefined ? parseInt(order) : existing.order,
      },
    });
    res.json(milestone);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteMilestone = async (req, res) => {
  try {
    const existing = await prisma.projectMilestone.findFirst({
      where: { id: req.params.milestoneId, projectId: req.params.id },
    });
    if (!existing) return res.status(404).json({ message: 'Milestone not found' });
    await prisma.projectMilestone.delete({ where: { id: req.params.milestoneId } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Auto-generate plan ───────────────────────────────────────────────────────

const generatePlan = async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const template = PLAN_TEMPLATES[project.type] || PLAN_TEMPLATES.OTHER;
    const start = project.startDate ? new Date(project.startDate) : new Date();
    const end = project.endDate ? new Date(project.endDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
    const durationMs = end.getTime() - start.getTime();

    // Delete existing milestones first
    await prisma.projectMilestone.deleteMany({ where: { projectId: req.params.id } });

    const milestones = await Promise.all(
      template.map((tpl, idx) => {
        const plannedDate = new Date(start.getTime() + durationMs * tpl.pct);
        return prisma.projectMilestone.create({
          data: {
            projectId: req.params.id,
            title: tpl.title,
            plannedDate,
            status: 'PENDING',
            order: idx,
          },
        });
      })
    );

    res.json(milestones);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── PDF Report ───────────────────────────────────────────────────────────────

const exportReport = (req, res) =>
  generateProjectReportPDF(req, res).catch((err) => {
    console.error('Project PDF error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' });
  });

module.exports = { getMilestones, createMilestone, updateMilestone, deleteMilestone, generatePlan, exportReport };
