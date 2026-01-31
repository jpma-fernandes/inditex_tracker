// ============================================
// Price History API Route
// GET: Get price history for a product
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getPriceHistory, getProductById } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[id]/price-history
 * Returns the price history for a specific product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if product exists
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get price history
    const priceHistory = await getPriceHistory(id);

    return NextResponse.json({
      productId: id,
      productName: product.name,
      currentPrice: product.currentPrice,
      priceHistory,
    });

  } catch (error) {
    console.error('[API] GET /api/products/[id]/price-history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    );
  }
}
