// ============================================
// Cron API Route
// GET: Refresh all tracked products
// Designed to be called by cron jobs
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/storage';
import { scrapeProducts, closeBrowser } from '@/lib/scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 5 minutes for batch scraping

/**
 * GET /api/cron
 * Refreshes all tracked products
 * 
 * Optional query params:
 * - secret: Authorization secret for cron jobs
 * - limit: Max number of products to refresh (default: all)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Optional: Check authorization secret
    const secret = searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get products to refresh
    const products = await getProducts();

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No products to refresh',
        refreshed: 0,
        failed: 0,
      });
    }

    // Apply limit if specified
    const limit = searchParams.get('limit');
    const maxProducts = limit ? parseInt(limit, 10) : products.length;
    const productsToRefresh = products.slice(0, maxProducts);

    console.log(`[CRON] Starting refresh for ${productsToRefresh.length} products`);

    // Scrape all products
    const urls = productsToRefresh.map(p => p.url);
    const results = await scrapeProducts(urls, {
      headless: true,
      saveToStorage: true,
      delayBetween: { min: 5000, max: 15000 }, // 5-15 seconds between requests
    });

    // Close browser
    await closeBrowser();

    // Summarize results
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    const summary = results.map((result, index) => ({
      url: urls[index],
      success: result.success,
      name: result.product?.name,
      error: result.error,
      errorCode: result.errorCode,
    }));

    // Check for price drops or stock changes
    const priceDrops = results
      .filter(r => r.success && r.product?.discount)
      .map(r => ({
        name: r.product!.name,
        discount: r.product!.discount,
        currentPrice: r.product!.currentPrice,
        oldPrice: r.product!.oldPrice,
      }));

    const stockAlerts = results
      .filter(r => r.success && r.product?.sizes.some(s => s.available))
      .map(r => ({
        name: r.product!.name,
        availableSizes: r.product!.sizes.filter(s => s.available).map(s => s.size),
        lowStockSizes: r.product!.sizes.filter(s => s.lowStock).map(s => s.size),
      }));

    console.log(`[CRON] Refresh complete: ${successCount}/${productsToRefresh.length} successful`);

    return NextResponse.json({
      success: true,
      message: `Refreshed ${successCount}/${productsToRefresh.length} products`,
      refreshed: successCount,
      failed: failedCount,
      summary,
      alerts: {
        priceDrops,
        stockAlerts,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[CRON] Refresh error:', error);

    // Ensure browser is closed on error
    try {
      await closeBrowser();
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh products',
      },
      { status: 500 }
    );
  }
}
