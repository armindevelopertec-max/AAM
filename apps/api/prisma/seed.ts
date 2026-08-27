import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  await prisma.sequence.deleteMany();
  await prisma.user.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.product.deleteMany();
  await prisma.client.deleteMany();
  await prisma.store.deleteMany();

  const store = await prisma.store.create({
    data: {
      name: 'Tienda Principal',
      currency: 'MXN',
      taxRate: 0,
      lowStockThreshold: 5,
    },
  });

  await prisma.user.create({
    data: {
      storeId: store.id,
      name: 'Admin Demo',
      email: 'admin@demo.mx',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'admin',
    },
  });

  await prisma.product.createMany({
    data: [
      {
        storeId: store.id,
        name: 'Laptop 14"',
        sku: 'ELC-0001',
        category: 'Electrónica',
        costPrice: 3500,
        price: 5000,
        stock: 8,
      },
      {
        storeId: store.id,
        name: 'Mouse inalámbrico',
        sku: 'ELC-0002',
        category: 'Accesorios',
        costPrice: 60,
        price: 100,
        stock: 3,
      },
      {
        storeId: store.id,
        name: 'Cable HDMI 2m',
        sku: 'ACC-0003',
        category: 'Cables',
        costPrice: 40,
        price: 85,
        stock: 25,
      },
      {
        storeId: store.id,
        name: 'Taladro 1/2" 600W',
        sku: 'FER-0004',
        category: 'Herramientas',
        costPrice: 750,
        price: 1250,
        stock: 6,
      },
      {
        storeId: store.id,
        name: 'Tornillos 4x40mm (bolsa 100)',
        sku: 'FER-0005',
        category: 'Ferretería',
        costPrice: 25,
        price: 55,
        stock: 40,
      },
      {
        storeId: store.id,
        name: 'Filtro de aire motor',
        sku: 'REP-0006',
        category: 'Repuestos',
        costPrice: 180,
        price: 320,
        stock: 12,
      },
    ],
  });

  await prisma.client.createMany({
    data: [
      {
        storeId: store.id,
        name: 'Ana García',
        email: 'ana.garcia@example.com',
        phone: '555-0101',
      },
      {
        storeId: store.id,
        name: 'Luis Pérez',
        email: 'luis.perez@example.com',
        phone: '555-0102',
      },
      {
        storeId: store.id,
        name: 'Mecánica Don Chuy',
        email: 'contacto@donchuy.mx',
        phone: '555-0103',
      },
    ],
  });

  console.log('Seed completado');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());