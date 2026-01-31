// ============================================
// Products CRUD Operations
// ============================================

import prisma from '@/lib/db/prisma';
import type { Product, SizeStock } from '@/types';
import { addPriceHistory } from './price-history';
import { addStockSnapshot } from './stock-snapshots';

// Type for Prisma Product with sizes relation
type ProductWithSizes = Awaited<ReturnType<typeof prisma.product.findFirst>> & {
    sizes: { size: string; available: boolean; lowStock: boolean }[];
};

// Convert Prisma Product to our Product type
export function toProduct(dbProduct: ProductWithSizes): Product {
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

export async function getProducts(options?: { unassignedOnly?: boolean }): Promise<Product[]> {
    const products = await prisma.product.findMany({
        where: options?.unassignedOnly ? {
            folders: { none: {} }
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
    const normalizedUrl = url.split('?')[0];

    const product = await prisma.product.findFirst({
        where: { url: { startsWith: normalizedUrl } },
        include: { sizes: true },
    });
    return product ? toProduct(product as ProductWithSizes) : undefined;
}

export async function addProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
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

    await addPriceHistory(newProduct.id, newProduct.currentPrice);
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

    await prisma.product.update({
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

    if (data.sizes) {
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

    if (data.currentPrice !== undefined && data.currentPrice !== oldProduct.currentPrice) {
        await addPriceHistory(id, data.currentPrice);
    }

    if (data.sizes) {
        await addStockSnapshot(id, data.sizes);
    }

    const finalProduct = await prisma.product.findUnique({
        where: { id },
        include: { sizes: true },
    });

    return toProduct(finalProduct as ProductWithSizes);
}

export async function deleteProduct(id: string): Promise<void> {
    await prisma.product.delete({ where: { id } });
}

export async function getProductFolders(productId: string) {
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
