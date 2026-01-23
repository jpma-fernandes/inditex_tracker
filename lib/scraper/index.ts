// ============================================
// Main Scraper Orchestrator
// ============================================

import type { Product, ScraperResult, Brand } from '@/types';
import { getBrowser, createContext, createPage, navigateWithStealth, closeContext, closeBrowser } from './browser';
import { detectStore, log, logError, randomDelay } from './utils';
import { parseZaraProduct, isValidZaraUrl } from './stores/zara';
import { addProduct, updateProduct, getProductByUrl } from '@/lib/storage';

/**
 * Store-specific parsers registry
 */
const PARSERS: Record<Brand, {
  parse: (html: string, url: string) => Partial<Product>;
  isValidUrl: (url: string) => boolean;
  waitForSelector?: string;
  clickToOpenSizes?: string;  // Button to click to open size selector
}> = {
  zara: {
    parse: parseZaraProduct,
    isValidUrl: isValidZaraUrl,
    clickToOpenSizes: '[data-qa-action="add-to-cart"]',  // Click "Adicionar" button to open size modal
    waitForSelector: '.size-selector-sizes',  // Wait for sizes to load after click
  },
  bershka: {
    parse: () => ({ brand: 'bershka', name: 'Not implemented' }),
    isValidUrl: () => false,
  },
  pullandbear: {
    parse: () => ({ brand: 'pullandbear', name: 'Not implemented' }),
    isValidUrl: () => false,
  },
  massimodutti: {
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

    // Click button to open size selector (if defined for this store)
    if (parser.clickToOpenSizes) {
      try {
        log('SCRAPER', `Clicking "${parser.clickToOpenSizes}" to open size selector...`);
        await page.waitForSelector(parser.clickToOpenSizes, { timeout: 10000 });
        await page.click(parser.clickToOpenSizes);
        log('SCRAPER', 'Clicked add button, waiting for size selector...');

        // Wait for size selector to appear after clicking
        if (parser.waitForSelector) {
          await page.waitForSelector(parser.waitForSelector, { timeout: 10000 });
          log('SCRAPER', `Size selector found: ${parser.waitForSelector}`);
        }
      } catch (error) {
        log('SCRAPER', `Could not open size selector: ${error instanceof Error ? error.message : 'unknown'}`);
      }
    }

    // Get page HTML
    const html = await page.content();

    // Parse HTML
    const productData = parser.parse(html, url);

    // Debug: save HTML if sizes not found
    if (!productData.sizes || productData.sizes.length === 0) {
      const debugPath = `data/debug-sizes-${Date.now()}.html`;
      const fs = require('fs');
      fs.writeFileSync(debugPath, html, 'utf-8');
      log('SCRAPER', `No sizes found - saved debug HTML to ${debugPath}`);
    }

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
      const existingProduct = getProductByUrl(url);
      if (existingProduct) {
        savedProduct = updateProduct(existingProduct.id, fullProduct);
        log('SCRAPER', `Updated existing product: ${savedProduct.id}`);
      } else {
        savedProduct = addProduct(fullProduct);
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
  const products = getProducts();

  if (products.length === 0) {
    log('SCRAPER', 'No products to refresh');
    return [];
  }

  const urls = products.map(p => p.url);
  return scrapeProducts(urls);
}

// Re-export utilities
export { detectStore, parsePrice, parseDiscount } from './utils';
export { closeBrowser } from './browser';
