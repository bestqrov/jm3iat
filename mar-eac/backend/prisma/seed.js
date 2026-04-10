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
