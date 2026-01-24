// ============================================
// Main Scraper Orchestrator
// ============================================

import type { Product, ScraperResult, Brand, StoreParser } from '@/types';
import { getBrowser, createContext, createPage, navigateWithStealth, closeContext, closeBrowser } from './browser';
import { detectStore, log, logError, randomDelay } from './utils';
import { zaraParser } from './stores/zara';
import { addProduct, updateProduct, getProductByUrl } from '@/lib/storage';

/**
 * Store-specific parsers registry
 */
const PARSERS: Record<Brand, StoreParser> = {
  zara: zaraParser,
  bershka: {
    name: 'bershka',
    baseUrl: 'https://www.bershka.com',
    parse: () => ({ brand: 'bershka', name: 'Not implemented' }),
    isValidUrl: () => false,
  },
  pullandbear: {
    name: 'pullandbear',
    baseUrl: 'https://www.pullandbear.com',
    parse: () => ({ brand: 'pullandbear', name: 'Not implemented' }),
    isValidUrl: () => false,
  },
  massimodutti: {
    name: 'massimodutti',
    baseUrl: 'https://www.massimodutti.com',
    parse: () => ({ brand: 'massimodutti', name: 'Not implemented' }),
    isValidUrl: () => false,
  },
};

/**
 * Scrape a product URL and return structured data
 * @param url The product URL to scrape
 * @param options Scraping options
 * @returns ScraperResult with product data or error
 */
export async function scrapeProduct(
  url: string,
  options: {
    headless?: boolean;
    saveToStorage?: boolean;
    timeout?: number;
  } = {}
): Promise<ScraperResult> {
  const { headless = true, saveToStorage = true, timeout = 60000 } = options;

  log('SCRAPER', `Starting scrape for: ${url}`);

  // Detect store
  const store = detectStore(url);
  if (!store) {
    return {
      success: false,
      error: 'Unrecognized store URL. Supported stores: Zara, Bershka, Pull&Bear, Massimo Dutti',
      errorCode: 'UNKNOWN',
    };
  }

  log('SCRAPER', `Detected store: ${store}`);

  // Get parser for store
  const parser = PARSERS[store];
  if (!parser) {
    return {
      success: false,
      error: `Parser for ${store} is not implemented yet`,
      errorCode: 'UNKNOWN',
    };
  }

  // Validate URL
  if (!parser.isValidUrl(url)) {
    return {
      success: false,
      error: `Invalid ${store} product URL. Expected format: product page URL`,
      errorCode: 'UNKNOWN',
    };
  }

  let browser = null;
  let context = null;

  try {
    // Launch browser
    browser = await getBrowser({ headless, timeout });

    // Create context with session persistence
    context = await createContext(browser, store, { timeout });

    // Create page
    const page = await createPage(context);

    // Navigate with stealth measures (don't wait for size selector yet)
    const navResult = await navigateWithStealth(page, url, {});

    if (!navResult.success) {
      await closeContext(context, store); // Still save session on failure
      return {
        success: false,
        error: navResult.error || 'Navigation failed',
        errorCode: navResult.error === 'AKAMAI_BLOCKED'
          ? 'AKAMAI_BLOCKED'
          : navResult.error === 'AKAMAI_CHALLENGE'
            ? 'AKAMAI_CHALLENGE'
            : navResult.error === 'TIMEOUT'
              ? 'TIMEOUT'
              : 'UNKNOWN',
      };
    }

    // Prepare page for scraping (store-specific interaction, e.g., opening size selector)
    if (parser.preparePage) {
      await parser.preparePage(page);
    }

    // Get page HTML
    const html = await page.content();

    // Parse HTML
    const productData = parser.parse(html, url);

    // Validate parsed data
    if (!productData.name || productData.name === 'Unknown Product') {
      logError('SCRAPER', 'Failed to parse product name - page structure may have changed');

      // Save HTML for debugging
      const debugPath = `data/debug-${Date.now()}.html`;
      const fs = require('fs');
      fs.writeFileSync(debugPath, html, 'utf-8');
      log('SCRAPER', `Saved debug HTML to ${debugPath}`);

      return {
        success: false,
        error: 'Could not extract product data. The page structure may have changed.',
        errorCode: 'PARSE_ERROR',
      };
    }

    // Close context and save session
    await closeContext(context, store);
    context = null;

    // Build full product object
    const now = new Date().toISOString();
    const fullProduct: Omit<Product, 'id' | 'createdAt'> = {
      brand: store,
      name: productData.name,
      currentPrice: productData.currentPrice || 0,
      originalPrice: productData.originalPrice || null,
      oldPrice: productData.oldPrice || null,
      discount: productData.discount || null,
      sizes: productData.sizes || [],
      url: url,
      imageUrl: productData.imageUrl || null,
      lastChecked: now,
    };

    // Save to storage if requested
    let savedProduct: Product | undefined;
    if (saveToStorage) {
      const existingProduct = await getProductByUrl(url);
      if (existingProduct) {
        savedProduct = await updateProduct(existingProduct.id, fullProduct);
        log('SCRAPER', `Updated existing product: ${savedProduct.id}`);
      } else {
        savedProduct = await addProduct(fullProduct);
        log('SCRAPER', `Added new product: ${savedProduct.id}`);
      }
    }

    log('SCRAPER', `Scrape completed successfully for: ${productData.name}`);

    return {
      success: true,
      product: savedProduct || { ...fullProduct, id: 'temp', createdAt: now } as Product,
    };

  } catch (error) {
    logError('SCRAPER', 'Scrape failed with exception', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'UNKNOWN',
    };

  } finally {
    // Clean up
    if (context) {
      try {
        await closeContext(context, store);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Scrape multiple products
 * @param urls Array of product URLs
 * @param options Scraping options
 * @returns Array of ScraperResults
 */
export async function scrapeProducts(
  urls: string[],
  options: {
    headless?: boolean;
    saveToStorage?: boolean;
    delayBetween?: { min: number; max: number };
  } = {}
): Promise<ScraperResult[]> {
  const { delayBetween = { min: 5000, max: 10000 } } = options;
  const results: ScraperResult[] = [];

  log('SCRAPER', `Starting batch scrape for ${urls.length} products`);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    log('SCRAPER', `Processing ${i + 1}/${urls.length}: ${url}`);

    const result = await scrapeProduct(url, options);
    results.push(result);

    // Delay between requests (except for last one)
    if (i < urls.length - 1) {
      await randomDelay(delayBetween.min, delayBetween.max);
    }
  }

  // Close browser after batch
  await closeBrowser();

  const successCount = results.filter(r => r.success).length;
  log('SCRAPER', `Batch complete: ${successCount}/${urls.length} successful`);

  return results;
}

/**
 * Refresh all tracked products
 * @returns Array of ScraperResults
 */
export async function refreshAllProducts(): Promise<ScraperResult[]> {
  const { getProducts } = await import('@/lib/storage');
  const products = await getProducts();

  if (products.length === 0) {
    log('SCRAPER', 'No products to refresh');
    return [];
  }

  const urls = products.map((p: Product) => p.url);
  return scrapeProducts(urls);
}

// Re-export utilities
export { detectStore, parsePrice, parseDiscount } from './utils';
export { closeBrowser } from './browser';
