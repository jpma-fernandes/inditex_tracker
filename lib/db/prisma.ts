// ============================================
// Prisma Client Singleton
// ============================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Choose database URL based on USE_DUMMY_DB flag
const useDummyDb = process.env.USE_DUMMY_DB === 'true';
const databaseUrl = useDummyDb
    ? process.env.DUMMY_DATABASE_URL
    : process.env.DATABASE_URL;

// Log which database is being used (only in development)
if (process.env.NODE_ENV !== 'production' && useDummyDb) {
    console.log('🧪 Using DUMMY database (dummy_tracker)');
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl,
        },
    },
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
