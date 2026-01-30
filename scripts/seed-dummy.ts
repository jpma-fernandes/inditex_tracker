// Seed script for dummy_tracker with hardcoded fake products
// Simple script with placeholder data - adjust values as needed

import prisma, { databaseUrl } from '../lib/db/prisma';

// Assure DB is the dummy one
if (databaseUrl !== process.env.DUMMY_DATABASE_URL) {
  console.error('[seed-dummy.ts] This script can only be run against the DUMMY database.');
  console.error('[seed-dummy.ts] Set USE_DUMMY_DB=true before running this script.');
  process.exit(1);
}

console.log('[seed-dummy.ts] Populating DUMMY database with fake products...');

// Clean existing data first
async function cleanDatabase() {
  console.log('[seed-dummy.ts] Cleaning existing data...');
  await prisma.stockSnapshot.deleteMany({});
  await prisma.priceHistory.deleteMany({});
  await prisma.productSize.deleteMany({});
  await prisma.product.deleteMany({});
  console.log('[seed-dummy.ts] Database cleaned.');
}

// ============================================
// HARDCODED DATA - Edit these as needed
// ============================================

const PRODUCTS = [
  {
    brand: 'zara',
    name: 'Calças Wide Leg Cintura Alta',
    url: 'https://www.zara.com/dummy-product-1',
    imageUrl: 'https://via.placeholder.com/400x600?text=ZARA',
    currentPrice: 39.95,
    originalPrice: 49.95,
    discount: 20,
    sizes: [
      { size: '34', available: true },
      { size: '36', available: true },
      { size: '38', available: false },
      { size: '40', available: true },
      { size: '42', available: false },
    ],
    priceHistory: [
      { price: 49.95, daysAgo: 30 },
      { price: 49.95, daysAgo: 20 },
      { price: 39.95, daysAgo: 10 },
      { price: 39.95, daysAgo: 0 },
    ],
  },
  {
    brand: 'zara',
    name: 'Jeans Slim Fit',
    url: 'https://www.zara.com/dummy-product-2',
    imageUrl: 'https://via.placeholder.com/400x600?text=ZARA',
    currentPrice: 39.95,
    originalPrice: 39.95,
    discount: null,
    sizes: [
      { size: '36', available: true },
      { size: '38', available: true },
      { size: '40', available: true },
      { size: '42', available: true },
    ],
    priceHistory: [
      { price: 39.95, daysAgo: 30 },
      { price: 39.95, daysAgo: 0 },
    ],
  },
  {
    brand: 'bershka',
    name: 'Calças Cargo Ripstop',
    url: 'https://www.bershka.com/dummy-product-3',
    imageUrl: 'https://via.placeholder.com/400x600?text=BERSHKA',
    currentPrice: 29.95,
    originalPrice: 45.95,
    discount: 35,
    sizes: [
      { size: 'S', available: false },
      { size: 'M', available: true },
      { size: 'L', available: true },
      { size: 'XL', available: false },
    ],
    priceHistory: [
      { price: 45.95, daysAgo: 60 },
      { price: 45.95, daysAgo: 30 },
      { price: 35.95, daysAgo: 15 },
      { price: 29.95, daysAgo: 0 },
    ],
  },
  {
    brand: 'pullandbear',
    name: 'Blazer Oversize Estruturado',
    url: 'https://www.pullandbear.com/dummy-product-4',
    imageUrl: 'https://via.placeholder.com/400x600?text=PULL%26BEAR',
    currentPrice: 89.95,
    originalPrice: 89.95,
    discount: null,
    sizes: [
      { size: 'XS', available: true },
      { size: 'S', available: true },
      { size: 'M', available: true },
      { size: 'L', available: true },
      { size: 'XL', available: true },
    ],
    priceHistory: [
      { price: 89.95, daysAgo: 30 },
      { price: 89.95, daysAgo: 0 },
    ],
  },
  {
    brand: 'massimodutti',
    name: 'Casaco Acolchoado Capuz',
    url: 'https://www.massimodutti.com/dummy-product-5',
    imageUrl: 'https://via.placeholder.com/400x600?text=MASSIMO',
    currentPrice: 59.95,
    originalPrice: 79.95,
    discount: 25,
    sizes: [
      { size: 'S', available: true },
      { size: 'M', available: false },
      { size: 'L', available: false },
      { size: 'XL', available: true },
    ],
    priceHistory: [
      { price: 79.95, daysAgo: 45 },
      { price: 79.95, daysAgo: 20 },
      { price: 59.95, daysAgo: 5 },
      { price: 59.95, daysAgo: 0 },
    ],
  },
  {
    brand: 'massimodutti',
    name: 'Trench Coat Clássico',
    url: 'https://www.massimodutti.com/dummy-product-6',
    imageUrl: 'https://via.placeholder.com/400x600?text=MASSIMO',
    currentPrice: 119.95,
    originalPrice: 119.95,
    discount: null,
    sizes: [
      { size: 'XS', available: true },
      { size: 'S', available: true },
      { size: 'M', available: true },
      { size: 'L', available: true },
    ],
    priceHistory: [
      { price: 119.95, daysAgo: 30 },
      { price: 119.95, daysAgo: 0 },
    ],
  },
  {
    brand: 'bershka',
    name: 'Blusão Bomber Nylon',
    url: 'https://www.bershka.com/dummy-product-7',
    imageUrl: 'https://via.placeholder.com/400x600?text=BERSHKA',
    currentPrice: 49.95,
    originalPrice: 69.95,
    discount: 29,
    sizes: [
      { size: 'S', available: true },
      { size: 'M', available: true },
      { size: 'L', available: false },
      { size: 'XL', available: true },
    ],
    priceHistory: [
      { price: 69.95, daysAgo: 40 },
      { price: 55.95, daysAgo: 20 },
      { price: 49.95, daysAgo: 0 },
    ],
  },
  {
    brand: 'zara',
    name: 'Botins Tacão Bloco',
    url: 'https://www.zara.com/dummy-product-8',
    imageUrl: 'https://via.placeholder.com/400x600?text=ZARA',
    currentPrice: 59.95,
    originalPrice: 59.95,
    discount: null,
    sizes: [
      { size: '36', available: true },
      { size: '37', available: true },
      { size: '38', available: true },
      { size: '39', available: true },
      { size: '40', available: true },
    ],
    priceHistory: [
      { price: 59.95, daysAgo: 30 },
      { price: 59.95, daysAgo: 0 },
    ],
  },
  {
    brand: 'zara',
    name: 'Ténis Plataforma',
    url: 'https://www.zara.com/dummy-product-9',
    imageUrl: 'https://via.placeholder.com/400x600?text=ZARA',
    currentPrice: 35.95,
    originalPrice: 49.95,
    discount: 28,
    sizes: [
      { size: '36', available: false },
      { size: '37', available: true },
      { size: '38', available: true },
      { size: '39', available: false },
      { size: '40', available: true },
    ],
    priceHistory: [
      { price: 49.95, daysAgo: 50 },
      { price: 42.95, daysAgo: 25 },
      { price: 35.95, daysAgo: 10 },
      { price: 35.95, daysAgo: 0 },
    ],
  },
  {
    brand: 'zara',
    name: 'Mocassins Pele',
    url: 'https://www.zara.com/dummy-product-10',
    imageUrl: 'https://via.placeholder.com/400x600?text=ZARA',
    currentPrice: 69.95,
    originalPrice: 69.95,
    discount: null,
    sizes: [
      { size: '36', available: true },
      { size: '37', available: true },
      { size: '38', available: true },
      { size: '39', available: true },
      { size: '40', available: true },
      { size: '41', available: true },
    ],
    priceHistory: [
      { price: 69.95, daysAgo: 30 },
      { price: 69.95, daysAgo: 0 },
    ],
  },
];

// ============================================
// SEED FUNCTION
// ============================================

async function main() {
  await cleanDatabase();

  const now = new Date();

  // Create products
  console.log('[seed-dummy.ts] Creating products...');
  for (const product of PRODUCTS) {
    const created = await prisma.product.create({
      data: {
        brand: product.brand,
        name: product.name,
        url: product.url,
        imageUrl: product.imageUrl,
        currentPrice: product.currentPrice,
        oldPrice: product.discount ? product.originalPrice : null,
        discount: product.discount,
        lastChecked: now,
        sizes: {
          create: product.sizes.map(s => ({
            size: s.size,
            available: s.available,
          })),
        },
        priceHistory: {
          create: product.priceHistory.map(ph => ({
            price: ph.price,
            timestamp: new Date(now.getTime() - ph.daysAgo * 24 * 60 * 60 * 1000),
          })),
        },
      },
    });

    // Create a stock snapshot for current state
    await prisma.stockSnapshot.create({
      data: {
        productId: created.id,
        timestamp: now,
        sizes: product.sizes,
      },
    });

    console.log(`  ✓ ${product.brand} - ${product.name}`);
  }

  console.log(`[seed-dummy.ts] Done! Created ${PRODUCTS.length} products.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed failed', e);
    process.exit(1);
  });
