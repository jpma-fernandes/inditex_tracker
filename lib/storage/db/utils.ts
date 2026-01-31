// ============================================
// Database Utility Functions
// ============================================

import prisma from '@/lib/db/prisma';
import { getProducts } from './products';
import { getAllPriceHistory } from './price-history';
import { getAllStockSnapshots } from './stock-snapshots';

export async function clearAllData(): Promise<void> {
    await prisma.stockSnapshot.deleteMany();
    await prisma.priceHistory.deleteMany();
    await prisma.productSize.deleteMany();
    await prisma.product.deleteMany();
    await prisma.folder.deleteMany();
}

export async function exportData() {
    const products = await getProducts();
    const priceHistory = await getAllPriceHistory();
    const stockSnapshots = await getAllStockSnapshots();

    return {
        products,
        priceHistory,
        stockSnapshots,
    };
}
