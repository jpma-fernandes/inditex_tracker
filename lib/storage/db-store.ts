// ============================================
// PostgreSQL Storage Implementation with Prisma
// ============================================

import prisma from '@/lib/db/prisma';
import type { Product, PriceHistory, SizeStock } from '@/types';

// Type for Prisma Product with sizes relation
type ProductWithSizes = Awaited<ReturnType<typeof prisma.product.findFirst>> & {
    sizes: { size: string; available: boolean; lowStock: boolean }[];
};

// Convert Prisma Product to our Product type
function toProduct(dbProduct: ProductWithSizes): Product {
    return {
        id: dbProduct!.id,
        brand: dbProduct!.brand as Product['brand'],
        name: dbProduct!.name,
        currentPrice: dbProduct!.currentPrice,
        originalPrice: dbProduct!.originalPrice,
        oldPrice: dbProduct!.oldPrice,
        discount: dbProduct!.discount,
        url: dbProduct!.url,
        imageUrl: dbProduct!.imageUrl,
        lastChecked: dbProduct!.lastChecked.toISOString(),
        createdAt: dbProduct!.createdAt.toISOString(),
        sizes: dbProduct!.sizes.map(s => ({
            size: s.size,
            available: s.available,
            lowStock: s.lowStock,
        })),
    };
}

// ============================================
// Products CRUD
// ============================================

export async function getProducts(options?: { unassignedOnly?: boolean }): Promise<Product[]> {
    const products = await prisma.product.findMany({
        where: options?.unassignedOnly ? {
            folders: { none: {} }  // Products with no folders
        } : undefined,
        include: { sizes: true },
        orderBy: { createdAt: 'desc' },
    });
    return products.map(p => toProduct(p as ProductWithSizes));
}

export async function getProductById(id: string): Promise<Product | undefined> {
    const product = await prisma.product.findUnique({
        where: { id },
        include: { sizes: true },
    });
    return product ? toProduct(product as ProductWithSizes) : undefined;
}

export async function getProductByUrl(url: string): Promise<Product | undefined> {
    // Normalize URL for comparison (remove query params)
    const normalizedUrl = url.split('?')[0];

    const product = await prisma.product.findFirst({
        where: { url: { startsWith: normalizedUrl } },
        include: { sizes: true },
    });
    return product ? toProduct(product as ProductWithSizes) : undefined;
}

export async function addProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    // Check if product with same URL already exists
    const existingProduct = await getProductByUrl(product.url);
    if (existingProduct) {
        return updateProduct(existingProduct.id, product);
    }

    const newProduct = await prisma.product.create({
        data: {
            brand: product.brand,
            name: product.name,
            currentPrice: product.currentPrice,
            originalPrice: product.originalPrice,
            oldPrice: product.oldPrice,
            discount: product.discount,
            url: product.url,
            imageUrl: product.imageUrl,
            lastChecked: new Date(product.lastChecked),
            sizes: {
                create: product.sizes.map(s => ({
                    size: s.size,
                    available: s.available,
                    lowStock: s.lowStock ?? false,
                })),
            },
        },
        include: { sizes: true },
    });

    // Add initial price history
    await addPriceHistory(newProduct.id, newProduct.currentPrice);

    // Add initial stock snapshot
    await addStockSnapshot(newProduct.id, product.sizes);

    return toProduct(newProduct as ProductWithSizes);
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const oldProduct = await prisma.product.findUnique({
        where: { id },
        include: { sizes: true },
    });

    if (!oldProduct) {
        throw new Error(`Product with id ${id} not found`);
    }

    // Update product and sizes
    const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
            ...(data.brand && { brand: data.brand }),
            ...(data.name && { name: data.name }),
            ...(data.currentPrice !== undefined && { currentPrice: data.currentPrice }),
            ...(data.originalPrice !== undefined && { originalPrice: data.originalPrice }),
            ...(data.oldPrice !== undefined && { oldPrice: data.oldPrice }),
            ...(data.discount !== undefined && { discount: data.discount }),
            ...(data.url && { url: data.url }),
            ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
            lastChecked: new Date(),
        },
        include: { sizes: true },
    });

    // Update sizes if provided
    if (data.sizes) {
        // Delete existing sizes and create new ones
        await prisma.productSize.deleteMany({ where: { productId: id } });
        await prisma.productSize.createMany({
            data: data.sizes.map(s => ({
                productId: id,
                size: s.size,
                available: s.available,
                lowStock: s.lowStock ?? false,
            })),
        });
    }

    // Add price history if price changed
    if (data.currentPrice !== undefined && data.currentPrice !== oldProduct.currentPrice) {
        await addPriceHistory(id, data.currentPrice);
    }

    // Add stock snapshot if sizes changed
    if (data.sizes) {
        await addStockSnapshot(id, data.sizes);
    }

    // Refetch with updated sizes
    const finalProduct = await prisma.product.findUnique({
        where: { id },
        include: { sizes: true },
    });

    return toProduct(finalProduct as ProductWithSizes);
}

export async function deleteProduct(id: string): Promise<void> {
    await prisma.product.delete({ where: { id } });
}

// ============================================
// Price History
// ============================================

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

// ============================================
// Stock Snapshots
// ============================================

export async function getStockSnapshots(productId: string) {
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

export async function getLatestStockSnapshot(productId: string) {
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

export async function addStockSnapshot(productId: string, sizes: SizeStock[]) {
    const entry = await prisma.stockSnapshot.create({
        data: {
            productId,
            sizes: sizes as any, // Prisma Json type
        },
    });

    return {
        id: entry.id,
        productId: entry.productId,
        sizes: entry.sizes as unknown as SizeStock[],
        timestamp: entry.timestamp.toISOString(),
    };
}

// ============================================
// Utility functions
// ============================================

export async function clearAllData(): Promise<void> {
    await prisma.stockSnapshot.deleteMany();
    await prisma.priceHistory.deleteMany();
    await prisma.productSize.deleteMany();
    await prisma.product.deleteMany();
}

export async function exportData() {
    const products = await getProducts();
    const allHistory = await prisma.priceHistory.findMany();
    const allSnapshots = await prisma.stockSnapshot.findMany();

    return {
        products,
        priceHistory: allHistory.map(h => ({
            id: h.id,
            productId: h.productId,
            price: h.price,
            timestamp: h.timestamp.toISOString(),
        })),
        stockSnapshots: allSnapshots.map(s => ({
            id: s.id,
            productId: s.productId,
            sizes: s.sizes,
            timestamp: s.timestamp.toISOString(),
        })),
    };
}

// ============================================
// Folders CRUD
// ============================================

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

export async function getProductFolders(productId: string): Promise<Folder[]> {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { folders: true },
    });

    if (!product) return [];

    return product.folders.map(f => ({
        id: f.id,
        name: f.name,
        createdAt: f.createdAt.toISOString(),
    }));
}

