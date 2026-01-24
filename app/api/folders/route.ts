// ============================================
// Folders API Route
// GET: List all folders
// POST: Create a new folder
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getFolders, createFolder } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/folders
 * Returns all folders with product counts
 */
export async function GET() {
    try {
        const folders = await getFolders();

        return NextResponse.json({
            folders,
            count: folders.length,
        });

    } catch (error) {
        console.error('[API] GET /api/folders error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch folders' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/folders
 * Body: { name: string }
 * Creates a new folder
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Folder name is required' },
                { status: 400 }
            );
        }

        const folder = await createFolder(name.trim());

        return NextResponse.json({
            success: true,
            folder,
        });

    } catch (error) {
        console.error('[API] POST /api/folders error:', error);
        return NextResponse.json(
            { error: 'Failed to create folder' },
            { status: 500 }
        );
    }
}
