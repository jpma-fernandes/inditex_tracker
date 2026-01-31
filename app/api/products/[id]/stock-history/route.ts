// ============================================
// Stock History API Route
// GET: Get stock (size) history for a product and size
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getStockHistoryBySize, getProductById } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check product exists
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const size = url.searchParams.get('size');

    if (!size) {
      return NextResponse.json({ error: 'Size query param required' }, { status: 400 });
    }

    const history = await getStockHistoryBySize(id, size);

    return NextResponse.json({
      productId: id,
      productName: product.name,
      size,
      history,
    });

  } catch (error) {
    console.error('[API] GET /api/products/[id]/stock-history error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock history' }, { status: 500 });
  }
}
