const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Super Admin
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@mareac.ma';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';

  const existingSuperAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!existingSuperAdmin) {
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: await bcrypt.hash(superAdminPassword, 12),
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log(`✅ Super Admin created: ${superAdminEmail}`);
  } else {
    console.log(`ℹ️  Super Admin already exists: ${superAdminEmail}`);
  }

  // Create sample organization
  const sampleOrgEmail = 'assoc@example.ma';
  const existingOrg = await prisma.organization.findUnique({ where: { email: sampleOrgEmail } });

  if (!existingOrg) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 3);

    const org = await prisma.organization.create({
      data: {
        name: 'جمعية النور للتنمية المحلية',
        email: sampleOrgEmail,
        phone: '0612345678',
        city: 'تارودانت',
        region: 'سوس-ماسة',
        description: 'جمعية تعنى بالتنمية المحلية ومشاريع الماء والطرق',
        trialEndsAt,
      },
    });

    const adminUser = await prisma.user.create({
      data: {
        organizationId: org.id,
        name: 'أحمد بنعلي',
        email: 'admin@example.ma',
        password: await bcrypt.hash('Admin@123', 12),
        role: 'ADMIN',
      },
    });

    await prisma.subscription.create({
      data: {
        organizationId: org.id,
        plan: 'PREMIUM',
        status: 'TRIAL',
        expiresAt: trialEndsAt,
      },
    });

    // Add sample members
    const members = [
      { name: 'محمد الأمين', role: 'PRESIDENT', phone: '0661234567' },
      { name: 'فاطمة الزهراء', role: 'VICE_PRESIDENT', phone: '0662345678' },
      { name: 'يوسف المالكي', role: 'TREASURER', phone: '0663456789' },
      { name: 'عائشة بنسعيد', role: 'SECRETARY', phone: '0664567890' },
      { name: 'حسن الإدريسي', role: 'MEMBER', phone: '0665678901' },
      { name: 'خديجة الأمين', role: 'MEMBER', phone: '0666789012' },
    ];

    await prisma.member.createMany({
      data: members.map((m) => ({ ...m, organizationId: org.id })),
    });

    // Add sample transactions
    await prisma.transaction.createMany({
      data: [
        { organizationId: org.id, type: 'INCOME', amount: 5000, category: 'اشتراكات', description: 'اشتراكات الأعضاء', date: new Date() },
        { organizationId: org.id, type: 'INCOME', amount: 10000, category: 'تبرعات', description: 'تبرع من جماعة تارودانت', date: new Date() },
        { organizationId: org.id, type: 'EXPENSE', amount: 2000, category: 'لوازم مكتبية', description: 'أدوات مكتب', date: new Date() },
      ],
    });

    // Add welcome reminder
    await prisma.reminder.create({
      data: {
        organizationId: org.id,
        type: 'CUSTOM',
        title: 'مرحباً بكم في منصة Mar E-A.C',
        message: 'يمكنكم الآن إدارة أنشطة جمعيتكم بكل سهولة. ابدأوا بإضافة الأعضاء وتسجيل الاجتماعات.',
        scheduledFor: new Date(),
      },
    });

    console.log(`✅ Sample organization created: ${org.name}`);
    console.log(`   Admin: ${adminUser.email} / Admin@123`);
  } else {
    console.log(`ℹ️  Sample organization already exists`);
  }

  // ── Default Packs ─────────────────────────────────────────────────────────
  const existingPacks = await prisma.pack.count();
  if (existingPacks === 0) {
    const defaultPacks = [
      {
        name: 'Starter — Association classique',
        nameAr: 'ستارتر — جمعية عادية',
        description: 'Idéal pour les petites associations avec des besoins basiques.',
        descriptionAr: 'مثالي للجمعيات الصغيرة ذات الاحتياجات الأساسية.',
        price: 99,
        currency: 'MAD',
        billingCycle: 'MONTHLY',
        assocType: 'REGULAR',
        size: 'SMALL',
        features: ['Gestion des membres (50 max)', 'Réunions illimitées', 'Documents (1 Go)', 'Rappels automatiques', 'Support email'],
        featuresAr: ['إدارة الأعضاء (50 كحد أقصى)', 'اجتماعات غير محدودة', 'مستندات (1 جيجا)', 'تذكيرات تلقائية', 'دعم بريدي'],
        limits: { members: 50, storage: 1 },
        trialDays: 15,
        isActive: true,
      },
      {
        name: 'Pro — Association classique',
        nameAr: 'برو — جمعية عادية',
        description: 'Pour les associations en croissance avec plus de membres.',
        descriptionAr: 'للجمعيات المتنامية التي تضم عدداً أكبر من الأعضاء.',
        price: 199,
        currency: 'MAD',
        billingCycle: 'MONTHLY',
        assocType: 'REGULAR',
        size: 'MEDIUM',
        features: ['Membres illimités', 'Réunions illimitées', 'Documents (5 Go)', 'Rapports avancés', 'Rappels WhatsApp', 'Support prioritaire'],
        featuresAr: ['أعضاء غير محدودين', 'اجتماعات غير محدودة', 'مستندات (5 جيجا)', 'تقارير متقدمة', 'تذكيرات واتساب', 'دعم ذو أولوية'],
        limits: { members: -1, storage: 5 },
        trialDays: 15,
        isActive: true,
      },
      {
        name: 'Starter — Gestion de l\'eau',
        nameAr: 'ستارتر — جمعية الماء',
        description: 'Pour les associations gérant un réseau d\'eau potable.',
        descriptionAr: 'لجمعيات إدارة شبكة مياه الشرب.',
        price: 249,
        currency: 'MAD',
        billingCycle: 'MONTHLY',
        assocType: 'WATER',
        size: 'SMALL',
        features: ['Suivi des compteurs', 'Facturation eau', 'Gestion des installations', 'Rapports de consommation', 'Membres (100 max)'],
        featuresAr: ['متابعة العدادات', 'فواتير الماء', 'إدارة المنشآت', 'تقارير الاستهلاك', 'أعضاء (100 كحد أقصى)'],
        limits: { members: 100, storage: 2 },
        trialDays: 15,
        isActive: true,
      },
      {
        name: 'Pro — Gestion de l\'eau',
        nameAr: 'برو — جمعية الماء',
        description: 'Solution complète pour les associations d\'eau de grande taille.',
        descriptionAr: 'حل متكامل لجمعيات الماء الكبيرة.',
        price: 399,
        currency: 'MAD',
        billingCycle: 'MONTHLY',
        assocType: 'WATER',
        size: 'LARGE',
        features: ['Membres illimités', 'Suivi compteurs avancé', 'Facturation automatique', 'Alertes de fuite', 'API d\'intégration', 'Support dédié'],
        featuresAr: ['أعضاء غير محدودين', 'متابعة عدادات متقدمة', 'فوترة تلقائية', 'تنبيهات التسرب', 'API للتكامل', 'دعم مخصص'],
        limits: { members: -1, storage: 20 },
        trialDays: 15,
        isActive: true,
      },
      {
        name: 'Starter — Association productive',
        nameAr: 'ستارتر — جمعية إنتاجية',
        description: 'Pour les coopératives et associations à activité productive.',
        descriptionAr: 'للتعاونيات والجمعيات ذات النشاط الإنتاجي.',
        price: 249,
        currency: 'MAD',
        billingCycle: 'MONTHLY',
        assocType: 'PRODUCTIVE',
        size: 'SMALL',
        features: ['Gestion des productions', 'Suivi des stocks', 'Projets illimités', 'Rapports financiers', 'Membres (80 max)'],
        featuresAr: ['إدارة الإنتاج', 'متابعة المخزون', 'مشاريع غير محدودة', 'تقارير مالية', 'أعضاء (80 كحد أقصى)'],
        limits: { members: 80, storage: 3 },
        trialDays: 15,
        isActive: true,
      },
      {
        name: 'Pro — Association productive',
        nameAr: 'برو — جمعية إنتاجية',
        description: 'Toutes les fonctionnalités productives sans limites.',
        descriptionAr: 'جميع مزايا الإنتاج بدون قيود.',
        price: 449,
        currency: 'MAD',
        billingCycle: 'MONTHLY',
        assocType: 'PRODUCTIVE',
        size: 'LARGE',
        features: ['Membres illimités', 'Productions illimitées', 'Gestion des ventes', 'Intégration comptable', 'Rapports BI', 'Support dédié'],
        featuresAr: ['أعضاء غير محدودين', 'إنتاج غير محدود', 'إدارة المبيعات', 'تكامل محاسبي', 'تقارير BI', 'دعم مخصص'],
        limits: { members: -1, storage: 20 },
        trialDays: 15,
        isActive: true,
      },
      {
        name: 'Pro — Productive + Eau',
        nameAr: 'برو — إنتاجية + ماء',
        description: 'La solution tout-en-un pour les associations mixtes.',
        descriptionAr: 'الحل الشامل للجمعيات المختلطة الإنتاجية والمائية.',
        price: 599,
        currency: 'MAD',
        billingCycle: 'MONTHLY',
        assocType: 'PRODUCTIVE_WATER',
        size: 'LARGE',
        features: ['Toutes les fonctionnalités Eau', 'Toutes les fonctionnalités Productives', 'Membres illimités', 'Tableau de bord unifié', 'Support dédié 24/7'],
        featuresAr: ['جميع مزايا الماء', 'جميع مزايا الإنتاج', 'أعضاء غير محدودين', 'لوحة تحكم موحدة', 'دعم مخصص 24/7'],
        limits: { members: -1, storage: 50 },
        trialDays: 15,
        isActive: true,
      },
      {
        name: 'Starter — Association avec projets',
        nameAr: 'ستارتر — جمعية مع مشاريع',
        description: 'Pour les associations gérant des projets de développement.',
        descriptionAr: 'لجمعيات إدارة مشاريع التنمية.',
        price: 149,
        currency: 'MAD',
        billingCycle: 'MONTHLY',
        assocType: 'PROJECTS',
        size: 'SMALL',
        features: ['Gestion de projets', 'Suivi des tâches', 'Rapports d\'avancement', 'Documents projets', 'Membres (60 max)'],
        featuresAr: ['إدارة المشاريع', 'متابعة المهام', 'تقارير التقدم', 'مستندات المشاريع', 'أعضاء (60 كحد أقصى)'],
        limits: { members: 60, storage: 2 },
        trialDays: 15,
        isActive: true,
      },
    ];

    for (const pack of defaultPacks) {
      await prisma.pack.create({ data: pack });
    }
    console.log(`✅ ${defaultPacks.length} default packs seeded`);
  } else {
    console.log(`ℹ️  Packs already exist (${existingPacks}), skipping`);
  }

  console.log('\n✨ Seeding complete!\n');
  console.log('📌 Login credentials:');
  console.log(`   Super Admin: ${superAdminEmail} / ${superAdminPassword}`);
  console.log('   Sample Admin: admin@example.ma / Admin@123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
