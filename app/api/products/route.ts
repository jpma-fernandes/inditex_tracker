// ============================================
// Products API Route
// GET: List all products
// POST: Add a new product (triggers scrape)
// DELETE: Remove a product
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getProducts, getProductById, deleteProduct, getPriceHistory, getLatestStockStatus } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products
 * Returns all tracked products with optional details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    const productId = searchParams.get('id');
    
    // Single product
    if (productId) {
      const product = getProductById(productId);
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      
      const response: Record<string, unknown> = { product };
      
      if (includeHistory) {
        response.priceHistory = getPriceHistory(productId);
        response.latestStock = getLatestStockStatus(productId);
      }
      
      return NextResponse.json(response);
    }
    
    // All products
    const products = getProducts();
    
    // Enrich with computed fields
    const enrichedProducts = products.map(product => {
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
      products: enrichedProducts,
      count: products.length,
    });
    
  } catch (error) {
    console.error('[API] GET /api/products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products?id=xxx
 * Removes a product from tracking
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    const product = getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    deleteProduct(productId);
    
    return NextResponse.json({
      success: true,
      message: `Product "${product.name}" removed from tracking`,
    });
    
  } catch (error) {
    console.error('[API] DELETE /api/products error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
