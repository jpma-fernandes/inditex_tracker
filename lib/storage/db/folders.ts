// ============================================
// Folders CRUD Operations
// ============================================

import prisma from '@/lib/db/prisma';
import type { Product } from '@/types';
import { toProduct } from './products';

// Type for Prisma Product with sizes relation
type ProductWithSizes = Awaited<ReturnType<typeof prisma.product.findFirst>> & {
    sizes: { size: string; available: boolean; lowStock: boolean }[];
};

export interface Folder {
    id: string;
    name: string;
    createdAt: string;
    productCount?: number;
}

export async function getFolders(): Promise<Folder[]> {
    const folders = await prisma.folder.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
    });

    return folders.map(f => ({
        id: f.id,
        name: f.name,
        createdAt: f.createdAt.toISOString(),
        productCount: f._count.products,
    }));
}

export async function getFolderById(id: string): Promise<Folder | undefined> {
    const folder = await prisma.folder.findUnique({
        where: { id },
        include: { _count: { select: { products: true } } },
    });

    if (!folder) return undefined;

    return {
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt.toISOString(),
        productCount: folder._count.products,
    };
}

export async function getFolderWithProducts(id: string): Promise<{ folder: Folder; products: Product[] } | undefined> {
    const folder = await prisma.folder.findUnique({
        where: { id },
        include: {
            products: { include: { sizes: true } },
            _count: { select: { products: true } },
        },
    });

    if (!folder) return undefined;

    return {
        folder: {
            id: folder.id,
            name: folder.name,
            createdAt: folder.createdAt.toISOString(),
            productCount: folder._count.products,
        },
        products: folder.products.map(p => toProduct(p as ProductWithSizes)),
    };
}

export async function createFolder(name: string): Promise<Folder> {
    const folder = await prisma.folder.create({
        data: { name },
    });

    return {
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt.toISOString(),
        productCount: 0,
    };
}

export async function updateFolder(id: string, name: string): Promise<Folder> {
    const folder = await prisma.folder.update({
        where: { id },
        data: { name },
        include: { _count: { select: { products: true } } },
    });

    return {
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt.toISOString(),
        productCount: folder._count.products,
    };
}

export async function deleteFolder(id: string): Promise<void> {
    await prisma.folder.delete({ where: { id } });
}

// ============================================
// Product-Folder relationships
// ============================================

export async function addProductsToFolder(folderId: string, productIds: string[]): Promise<void> {
    await prisma.folder.update({
        where: { id: folderId },
        data: {
            products: {
                connect: productIds.map(id => ({ id })),
            },
        },
    });
}

export async function removeProductFromFolder(folderId: string, productId: string): Promise<void> {
    await prisma.folder.update({
        where: { id: folderId },
        data: {
            products: {
                disconnect: { id: productId },
            },
        },
    });
}
