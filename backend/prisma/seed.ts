/**
 * Prichoy ERP — Database Seeder
 * Run: npx ts-node prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const COURIERS = [
  { name: 'Pathao', website: 'https://pathao.com' },
  { name: 'Steadfast', website: 'https://steadfast.com.bd' },
  { name: 'Paperfly', website: 'https://paperfly.com.bd' },
  { name: 'RedX', website: 'https://redx.com.bd' },
];

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('Admin@123456', 12);
  
  // ── Super Admin ──────────────────────────────────────────────
  const userDelegate = (prisma as any).user || (prisma as any).users;
  if (userDelegate) {
    try {
      await userDelegate.upsert({
        where: { email: 'admin@prichoy.com' },
        update: {
          password: hashedPassword,
          name: 'Super Admin',
          role: 'SUPER_ADMIN',
          phone: '01762647661',
          isActive: true,
        },
        create: {
          email: 'admin@prichoy.com',
          password: hashedPassword,
          name: 'Super Admin',
          role: 'SUPER_ADMIN',
          phone: '01762647661',
          isActive: true,
        },
      });
      console.log('Super admin ensured: admin@prichoy.com');
    } catch (e) {
      console.error('Admin user creation failed. Make sure the database schema has been applied first:', e);
    }
  }

  // ── Default Warehouse ────────────────────────────────────────
  if ((prisma as any).warehouse) {
    try {
      await (prisma as any).warehouse.upsert({
        where: { id: 'default-warehouse' },
        update: {},
        create: {
          id: 'default-warehouse',
          name: 'Main Warehouse',
          location: 'Dhaka, Bangladesh',
          isDefault: true,
        },
      });
      console.log('Default warehouse created');
    } catch (e) {}
  }

  // ── Couriers ─────────────────────────────────────────────────
  if ((prisma as any).courier) {
    for (const courier of COURIERS) {
      try {
        await (prisma as any).courier.upsert({
          where: { id: courier.name.toLowerCase() },
          update: {},
          create: {
            id: courier.name.toLowerCase(),
            name: courier.name,
            website: courier.website,
            isActive: true,
          },
        });
      } catch (e) {}
    }
    console.log('Couriers seeded');
  }

  // ── Categories ───────────────────────────────────────────────
  if ((prisma as any).category) {
    const categories = [
      { name: 'Dresses', slug: 'dresses', gender: 'FEMALE' },
      { name: 'Kurtis', slug: 'kurtis', gender: 'FEMALE' },
      { name: 'Salwar Sets', slug: 'salwar', gender: 'FEMALE' },
      { name: 'Lehenga', slug: 'lehenga', gender: 'FEMALE' },
      { name: 'Shirts', slug: 'shirts', gender: 'MALE' },
      { name: 'Bottoms', slug: 'bottoms', gender: 'MALE' },
      { name: 'Ethnic Wear', slug: 'ethnic', gender: 'MALE' },
      { name: 'Outerwear', slug: 'outerwear', gender: 'MALE' },
    ];
    for (const cat of categories) {
      try {
        await (prisma as any).category.upsert({
          where: { slug: cat.slug },
          update: {},
          create: cat,
        });
      } catch (e) {}
    }
    console.log('Categories seeded');
  }

  // ── Company Settings ─────────────────────────────────────────
  if ((prisma as any).setting) {
    const settings = [
      { key: 'company_name', value: 'Prichoy Clothing', group: 'company' },
      { key: 'company_phone', value: '01762647661', group: 'company' },
      { key: 'company_email', value: 'nayem@mail.com', group: 'company' },
      { key: 'company_address', value: 'Dhaka, Bangladesh', group: 'company' },
      { key: 'currency', value: 'BDT', group: 'general' },
      { key: 'currency_symbol', value: 'BDT', group: 'general' },
      { key: 'delivery_dhaka', value: '80', group: 'shipping' },
      { key: 'delivery_outside', value: '120', group: 'shipping' },
      { key: 'tax_rate', value: '0', group: 'general' },
    ];
    for (const s of settings) {
      try {
        await (prisma as any).setting.upsert({
          where: { key: s.key },
          update: {},
          create: s,
        });
      } catch (e) {}
    }
    console.log('Settings seeded');
  }

  console.log('\nSeeding complete!\n');
  console.log('Login credentials:');
  console.log('  Email:    admin@prichoy.com');
  console.log('  Password: Admin@123456');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });