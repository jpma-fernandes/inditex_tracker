// ============================================
// Single Folder API Route
// GET: Get folder with products
// PATCH: Rename folder
// DELETE: Delete folder
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getFolderWithProducts, updateFolder, deleteFolder, getFolderById } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type RouteContext = {
    params: Promise<{ id: string }>;
};

/**
 * GET /api/folders/[id]
 * Returns folder details with its products
 */
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;

        const result = await getFolderWithProducts(id);

        if (!result) {
            return NextResponse.json(
                { error: 'Folder not found' },
                { status: 404 }
            );
        }

        // Enrich products with computed fields
        const enrichedProducts = result.products.map(product => {
            const hasDiscount = product.oldPrice !== null && product.discount !== null;
            const availableSizes = product.sizes.filter(s => s.available);
            const hasLowStock = product.sizes.some(s => s.lowStock);

            return {
                ...product,
                hasDiscount,
                availableSizesCount: availableSizes.length,
                totalSizesCount: product.sizes.length,
                hasLowStock,
                isFullyAvailable: availableSizes.length === product.sizes.length,
                isOutOfStock: availableSizes.length === 0,
            };
        });

        return NextResponse.json({
            folder: result.folder,
            products: enrichedProducts,
            count: enrichedProducts.length,
        });

    } catch (error) {
        console.error('[API] GET /api/folders/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch folder' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/folders/[id]
 * Body: { name: string }
 * Renames a folder
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const body = await request.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Folder name is required' },
                { status: 400 }
            );
        }

        const existingFolder = await getFolderById(id);
        if (!existingFolder) {
            return NextResponse.json(
                { error: 'Folder not found' },
                { status: 404 }
            );
        }

        const folder = await updateFolder(id, name.trim());

        return NextResponse.json({
            success: true,
            folder,
        });

    } catch (error) {
        console.error('[API] PATCH /api/folders/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to update folder' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/folders/[id]
 * Deletes a folder (products are NOT deleted, just unlinked)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;

        const existingFolder = await getFolderById(id);
        if (!existingFolder) {
            return NextResponse.json(
                { error: 'Folder not found' },
                { status: 404 }
            );
        }

        await deleteFolder(id);

        return NextResponse.json({
            success: true,
            message: `Folder "${existingFolder.name}" deleted`,
        });

    } catch (error) {
        console.error('[API] DELETE /api/folders/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to delete folder' },
            { status: 500 }
        );
    }
}
