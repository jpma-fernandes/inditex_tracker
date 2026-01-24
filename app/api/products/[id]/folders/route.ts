// ============================================
// Product Folders API Route
// GET: List folders a product belongs to
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getProductFolders } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[id]/folders
 * Returns all folders that contain this product
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const folders = await getProductFolders(id);

        return NextResponse.json({
            folders,
            count: folders.length,
        });
    } catch (error) {
        console.error('[API] GET /api/products/[id]/folders error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch product folders' },
            { status: 500 }
        );
    }
}
