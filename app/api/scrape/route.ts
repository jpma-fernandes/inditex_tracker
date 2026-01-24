// ============================================
// Scrape API Route
// POST: Trigger scraping for a URL
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { scrapeProduct, closeBrowser } from '@/lib/scraper';
import { detectStore } from '@/lib/scraper/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for scraping

/**
 * POST /api/scrape
 * Body: { url: string }
 * Scrapes a product URL and adds/updates it in storage
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    const store = detectStore(url);
    if (!store) {
      return NextResponse.json(
        {
          error: 'Invalid store URL',
          message: 'Supported stores: Zara, Bershka, Pull&Bear, Massimo Dutti'
        },
        { status: 400 }
      );
    }

    console.log(`[API] Starting scrape for: ${url}`);

    // Perform scrape
    const result = await scrapeProduct(url, {
      headless: true,
      saveToStorage: true,
    });

    // Close browser after scrape
    await closeBrowser();

    if (!result.success) {
      // Determine appropriate status code
      let statusCode = 500;
      let suggestions: string[] = [];

      switch (result.errorCode) {
        case 'AKAMAI_BLOCKED':
          statusCode = 403;
          suggestions = [
            'Wait 30 minutes before trying again',
            'The IP may be temporarily blocked',
            'Try using a VPN or proxy',
          ];
          break;
        case 'AKAMAI_CHALLENGE':
          statusCode = 403;
          suggestions = [
            'The session needs to be warmed up',
            'Try running the CLI scraper with --visible flag',
            'Complete the challenge manually to save the session',
          ];
          break;
        case 'TIMEOUT':
          statusCode = 504;
          suggestions = [
            'The page took too long to load',
            'Check your internet connection',
            'The site may be experiencing issues',
          ];
          break;
        case 'PARSE_ERROR':
          statusCode = 422;
          suggestions = [
            'The page structure may have changed',
            'Check if the URL is a valid product page',
            'Check the debug HTML file for more info',
          ];
          break;
        default:
          statusCode = 500;
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          suggestions,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      product: result.product,
      message: `Successfully scraped: ${result.product?.name}`,
    });

  } catch (error) {
    console.error('[API] POST /api/scrape error:', error);

    // Ensure browser is closed on error
    try {
      await closeBrowser();
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape product',
        errorCode: 'UNKNOWN',
      },
      { status: 500 }
    );
  }
}
