// ============================================
// Folder Products API Route
// POST: Add products to folder
// DELETE: Remove product from folder
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { addProductsToFolder, removeProductFromFolder, getFolderById, getProductById } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type RouteContext = {
    params: Promise<{ id: string }>;
};

/**
 * POST /api/folders/[id]/products
 * Body: { productIds: string[] }
 * Adds products to a folder
 */
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id: folderId } = await context.params;
        const body = await request.json();
        const { productIds } = body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json(
                { error: 'productIds array is required' },
                { status: 400 }
            );
        }

        const folder = await getFolderById(folderId);
        if (!folder) {
            return NextResponse.json(
                { error: 'Folder not found' },
                { status: 404 }
            );
        }

        await addProductsToFolder(folderId, productIds);

        return NextResponse.json({
            success: true,
            message: `Added ${productIds.length} product(s) to "${folder.name}"`,
        });

    } catch (error) {
        console.error('[API] POST /api/folders/[id]/products error:', error);
        return NextResponse.json(
            { error: 'Failed to add products to folder' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/folders/[id]/products?productId=xxx
 * Removes a product from a folder
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id: folderId } = await context.params;
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json(
                { error: 'productId query param is required' },
                { status: 400 }
            );
        }

        const folder = await getFolderById(folderId);
        if (!folder) {
            return NextResponse.json(
                { error: 'Folder not found' },
                { status: 404 }
            );
        }

        const product = await getProductById(productId);
        if (!product) {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
            );
        }

        await removeProductFromFolder(folderId, productId);

        return NextResponse.json({
            success: true,
            message: `Removed "${product.name}" from "${folder.name}"`,
        });

    } catch (error) {
        console.error('[API] DELETE /api/folders/[id]/products error:', error);
        return NextResponse.json(
            { error: 'Failed to remove product from folder' },
            { status: 500 }
        );
    }
}
