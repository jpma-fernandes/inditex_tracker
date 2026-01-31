// ============================================
// Stock Snapshots CRUD Operations
// ============================================

import prisma from '@/lib/db/prisma';
import type { SizeStock } from '@/types';

export interface StockSnapshot {
    id: string;
    productId: string;
    sizes: SizeStock[];
    timestamp: string;
}

export async function getStockSnapshots(productId: string): Promise<StockSnapshot[]> {
    const snapshots = await prisma.stockSnapshot.findMany({
        where: { productId },
        orderBy: { timestamp: 'asc' },
    });

    return snapshots.map(s => ({
        id: s.id,
        productId: s.productId,
        sizes: s.sizes as unknown as SizeStock[],
        timestamp: s.timestamp.toISOString(),
    }));
}

export async function getLatestStockSnapshot(productId: string): Promise<StockSnapshot | undefined> {
    const snapshot = await prisma.stockSnapshot.findFirst({
        where: { productId },
        orderBy: { timestamp: 'desc' },
    });

    if (!snapshot) return undefined;

    return {
        id: snapshot.id,
        productId: snapshot.productId,
        sizes: snapshot.sizes as unknown as SizeStock[],
        timestamp: snapshot.timestamp.toISOString(),
    };
}

export async function addStockSnapshot(productId: string, sizes: SizeStock[]): Promise<StockSnapshot> {
    const entry = await prisma.stockSnapshot.create({
        data: {
            productId,
            sizes: sizes as any,
        },
    });

    return {
        id: entry.id,
        productId: entry.productId,
        sizes: entry.sizes as unknown as SizeStock[],
        timestamp: entry.timestamp.toISOString(),
    };
}

export async function getAllStockSnapshots(): Promise<StockSnapshot[]> {
    const snapshots = await prisma.stockSnapshot.findMany({
        orderBy: { timestamp: 'asc' },
    });

    return snapshots.map(s => ({
        id: s.id,
        productId: s.productId,
        sizes: s.sizes as unknown as SizeStock[],
        timestamp: s.timestamp.toISOString(),
    }));
}
