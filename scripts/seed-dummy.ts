// Seed script for dummy_tracker with 10 fake products
// Generates 6 months of price history (360 points) at 12-hour cadence
// and correlated stock history snapshots.

import prisma, { databaseUrl } from '../lib/db/prisma';

// Assure DB is the dummy one
if (databaseUrl !== process.env.DUMMY_DATABASE_URL) {
  console.error('[seed-dummy.ts] This script can only be run against the DUMMY database.');
  console.error('[seed-dummy.ts] Prisma is pointing to:', databaseUrl);
  console.error('[seed-dummy.ts] Expected: DUMMY_DATABASE_URL');
  console.error('[seed-dummy.ts] Set USE_DUMMY_DB=true before running this script.');
  process.exit(1);
}

console.log('[seed-dummy.ts] Populating DUMMY database with fake products and history...');

// Clean existing data first
async function cleanDatabase() {
  console.log('[seed-dummy.ts] Cleaning existing data...');
  await prisma.stockSnapshot.deleteMany({});
  await prisma.priceHistory.deleteMany({});
  await prisma.productSize.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.folder.deleteMany({});
  console.log('[seed-dummy.ts] Database cleaned.');
}

type SizeLabel = string;

type ProductSeed = {
  brand: string;
  name: string;
  originalPrice: number;
  sizes: SizeLabel[];
};

// Simple deterministic RNG for reproducibility
function createRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return (s >>> 0) / 4294967296;
  };
}

async function main() {
  // Clean database first
  await cleanDatabase();

  // 1) Define 10 fake products (Calças, Casacos, Sapatos)
  const seeds: ProductSeed[] = [
    { brand: 'zara', name: 'Calças Wide Leg Cintura Alta', originalPrice: 49.95, sizes: ['34','36','38','40','42','44'] },
    { brand: 'zara', name: 'Jeans Slim Fit', originalPrice: 39.95, sizes: ['36','38','40','42','44'] },
    { brand: 'bershka', name: 'Calças Cargo Ripstop', originalPrice: 45.95, sizes: ['34','36','38','40','42'] },
    { brand: 'pullandbear', name: 'Blazer Oversize Estruturado', originalPrice: 89.95, sizes: ['XS','S','M','L','XL'] },
    { brand: 'massimodutti', name: 'Casaco Acolchoado Capuz', originalPrice: 79.95, sizes: ['S','M','L','XL'] },
    { brand: 'massimodutti', name: 'Trench Coat Clássico', originalPrice: 119.95, sizes: ['XS','S','M','L','XL'] },
    { brand: 'bershka', name: 'Blusão Bomber Nylon', originalPrice: 69.95, sizes: ['S','M','L','XL'] },
    { brand: 'zara', name: 'Botins Tacão Bloco', originalPrice: 59.95, sizes: ['35','36','37','38','39','40'] },
    { brand: 'zara', name: 'Ténis Plataforma', originalPrice: 49.95, sizes: ['36','37','38','39','40'] },
    { brand: 'zara', name: 'Mocassins Pele', originalPrice: 69.95, sizes: ['35','36','37','38','39','40','41'] },
  ];

  // 2) Seed each product and generate 360 price/stock snapshots
  const startDate = new Date();
  // go back 6 months (approx)
  const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6;
  const baseDate = new Date(startDate.getTime() - sixMonthsMs);
  const stepMs = 1000 * 60 * 60 * 12; // 12 hours
  const steps = Math.floor((startDate.getTime() - baseDate.getTime()) / stepMs);

  for (let idx = 0; idx < seeds.length; idx++) {
    const s = seeds[idx];
    // Generate unique dummy URL for each product
    const dummyUrl = `https://www.${s.brand}.com/dummy-product-${idx + 1}`;
    // create product with initial data
    const created = await prisma.product.create({
      data: {
        brand: s.brand,
        name: s.name,
        currentPrice: s.originalPrice,
        //originalPrice: s.originalPrice,
        url: dummyUrl,
        imageUrl: `https://via.placeholder.com/400x600?text=${s.brand.toUpperCase()}`,
        lastChecked: new Date(),
        sizes: {
          create: s.sizes.map(sz => ({ size: sz, available: true })),
        },
        priceHistory: {
          create: {
            price: s.originalPrice,
            timestamp: baseDate,
          },
        },
      },
    });

    // seed initial stock snapshot for the base state
    await prisma.stockSnapshot.create({
      data: {
        productId: created.id,
        timestamp: baseDate,
        sizes: s.sizes.map(sz => ({ size: sz, available: true })),
      },
    });

    // Prepare discount events (1-3 per product)
    const rng = createRng(1000 + idx * 97);
    const nEvents = 1 + Math.floor(rng() * 2); // 1 or 2; we'll add a third if lucky
    const events: { start: number; end: number; discount: number }[] = [];
    for (let e = 0; e < nEvents; e++) {
      const start = Math.floor(((e + 1) * steps) / (nEvents + 1)) + Math.floor(rng() * 20) - 10;
      const duration = Math.floor(steps * (0.08 + rng() * 0.08)); // ~8-16% of timeline
      const end = Math.min(steps - 1, start + duration);
      // distribute discount tiers across events
      const tier = e; // 0,1,2
      const discount = tier === 0 ? 0.18 + rng() * 0.12 : tier === 1 ? 0.30 + rng() * 0.20 : 0.50 + rng() * 0.20;
      events.push({ start: Math.max(0, start), end, discount: Math.min(discount, 0.75) });
    }

    // Generate history entries for 360 steps (6 months at 12h cadence)
    for (let t = 0; t < steps; t++) {
      const timestamp = new Date(baseDate.getTime() + t * stepMs);
      // determine max discount active at this step
      let activeDiscount = 0;
      for (const ev of events) {
        if (t >= ev.start && t <= ev.end) {
          activeDiscount = Math.max(activeDiscount, ev.discount);
        }
      }
      const price = parseFloat((s.originalPrice * (1 - activeDiscount)).toFixed(2));

      // insert price history
      await prisma.priceHistory.create({
        data: {
          productId: created.id,
          price,
          timestamp,
        },
      });

      // seeded stock snapshot - correlates with discounts
      const sizesStatus = s.sizes.map((sz, si) => {
        const idSeed = idx * 9973 + si * 131 + t * 17;
        const localRng = createRng(idSeed);
        const inDiscount = activeDiscount > 0;
        const available = inDiscount ? localRng() > 0.25 : localRng() > 0.05;
        const lowStock = inDiscount ? localRng() > 0.6 : localRng() > 0.95;
        return { size: sz, available, lowStock };
      });

      await prisma.stockSnapshot.create({
        data: {
          productId: created.id,
          timestamp,
          sizes: sizesStatus,
        },
      });
    }
  }

  console.log('[seed-dummy.ts] Dummy seed completed. 10 products with 6 months of history generated.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed failed', e);
    process.exit(1);
  });
