// ============================================
// Price History CRUD Operations
// ============================================

import prisma from '@/lib/db/prisma';
import type { PriceHistory } from '@/types';

export async function getPriceHistory(productId: string): Promise<PriceHistory[]> {
    const history = await prisma.priceHistory.findMany({
        where: { productId },
        orderBy: { timestamp: 'asc' },
    });

    return history.map(h => ({
        id: h.id,
        productId: h.productId,
        price: h.price,
        timestamp: h.timestamp.toISOString(),
    }));
}

export async function addPriceHistory(productId: string, price: number): Promise<PriceHistory> {
    const entry = await prisma.priceHistory.create({
        data: { productId, price },
    });

    return {
        id: entry.id,
        productId: entry.productId,
        price: entry.price,
        timestamp: entry.timestamp.toISOString(),
    };
}

export async function getAllPriceHistory(): Promise<PriceHistory[]> {
    const history = await prisma.priceHistory.findMany({
        orderBy: { timestamp: 'asc' },
    });

    return history.map(h => ({
        id: h.id,
        productId: h.productId,
        price: h.price,
        timestamp: h.timestamp.toISOString(),
    }));
}
