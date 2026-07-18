/**
 * Prichoy ERP — Database Seeder
 * Run: npm run db:seed
 */
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { COURIERS } from '../src/constants';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Super Admin ──────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Admin@123456', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@prichoy.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@prichoy.com',
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      phone: '01762647661',
    },
  });
  console.log('✅ Super admin created:', superAdmin.email);

  // ── Default Warehouse ────────────────────────────────────────
  const warehouse = await prisma.warehouse.upsert({
    where: { id: 'default-warehouse' },
    update: {},
    create: {
      id: 'default-warehouse',
      name: 'Main Warehouse',
      location: 'Dhaka, Bangladesh',
      isDefault: true,
    },
  });
  console.log('✅ Default warehouse created');

  // ── Couriers ─────────────────────────────────────────────────
  for (const courier of COURIERS) {
    await prisma.courier.upsert({
      where: { id: courier.name.toLowerCase() },
      update: {},
      create: {
        id: courier.name.toLowerCase(),
        name: courier.name,
        website: courier.website,
        isActive: true,
      },
    });
  }
  console.log('✅ Couriers seeded');

  // ── Categories ───────────────────────────────────────────────
  const categories = [
    { name: 'Dresses',   slug: 'dresses',   gender: 'FEMALE' as const },
    { name: 'Kurtis',    slug: 'kurtis',    gender: 'FEMALE' as const },
    { name: 'Salwar Sets', slug: 'salwar',  gender: 'FEMALE' as const },
    { name: 'Lehenga',   slug: 'lehenga',   gender: 'FEMALE' as const },
    { name: 'Shirts',    slug: 'shirts',    gender: 'MALE' as const },
    { name: 'Bottoms',   slug: 'bottoms',   gender: 'MALE' as const },
    { name: 'Ethnic Wear', slug: 'ethnic',  gender: 'MALE' as const },
    { name: 'Outerwear', slug: 'outerwear', gender: 'MALE' as const },
  ];
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug }, update: {}, create: cat,
    });
  }
  console.log('✅ Categories seeded');

  // ── Company Settings ─────────────────────────────────────────
  const settings = [
    { key: 'company_name',    value: 'Prichoy Clothing',       group: 'company' },
    { key: 'company_phone',   value: '01762647661',            group: 'company' },
    { key: 'company_email',   value: 'nayem@mail.com',         group: 'company' },
    { key: 'company_address', value: 'Dhaka, Bangladesh',      group: 'company' },
    { key: 'currency',        value: 'BDT',                    group: 'general' },
    { key: 'currency_symbol', value: '৳',                      group: 'general' },
    { key: 'delivery_dhaka',  value: '80',                     group: 'shipping' },
    { key: 'delivery_outside', value: '120',                   group: 'shipping' },
    { key: 'tax_rate',        value: '0',                      group: 'general' },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key }, update: {}, create: s,
    });
  }
  console.log('✅ Settings seeded');

  console.log('\n🎉 Seeding complete!\n');
  console.log('Login credentials:');
  console.log('  Email:    admin@prichoy.com');
  console.log('  Password: Admin@123456');
  console.log('  ⚠️  Change this password immediately after first login.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
