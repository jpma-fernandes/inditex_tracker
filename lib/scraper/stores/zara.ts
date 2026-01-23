// ============================================
// Zara Store Parser
// Uses Cheerio for HTML parsing
// ============================================

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Product, SizeStock, StoreParser } from '@/types';
import { parsePrice, parseDiscount, log, logError } from '../utils';

/**
 * CSS Selectors for Zara product pages
 * These may need updates if Zara changes their HTML structure
 */
const SELECTORS = {
  // Product name
  name: [
    '.product-detail-info__header-name',
    '.product-detail-info__name',
    'h1[class*="product-detail"]',
    '[data-qa="product-name"]',
  ],

  // Current price
  currentPrice: [
    '.price-current__amount',
    '.price__amount--current',
    '[data-qa="product-price-current"]',
    '.money-amount__main',
  ],

  // Old/original price (when on sale)
  oldPrice: [
    '.price-old__amount',
    '.price__amount--old',
    '[data-qa="product-price-old"]',
    '.price-old .money-amount__main',
  ],

  // Discount percentage
  discount: [
    '.price-current__discount-percentage',
    '.price__discount',
    '[data-qa="product-discount"]',
  ],

  // Product image
  image: [
    'img.media-image__image',
    '.product-detail-images img',
    'picture img',
    '[data-qa="product-image"] img',
  ],
};

/**
 * Try multiple selectors until one works
 */
function trySelectors($: CheerioAPI, selectors: string[]): ReturnType<CheerioAPI> | null {
  for (const selector of selectors) {
    const element = $(selector);
    if (element.length > 0) {
      return element;
    }
  }
  return null;
}

/**
 * Extract text from first matching selector
 */
function extractText($: CheerioAPI, selectors: string[]): string | null {
  const element = trySelectors($, selectors);
  if (!element) return null;
  return element.first().text().trim() || null;
}

/**
 * Extract sizes and availability from the page
 * Uses data-qa-action attribute on buttons to determine availability:
 * - "size-in-stock" = available
 * - "size-low-on-stock" = available but low stock (shows "Poucas unidades")
 * - "size-out-of-stock" = sold out (shows "Ver similares")
 */
function extractSizes($: CheerioAPI): SizeStock[] {
  const sizes: SizeStock[] = [];

  // Primary selector: each <li> inside the size selector <ul>
  // Structure: ul.size-selector-sizes > li.size-selector-sizes__size > button > div.label
  const sizeItems = $('.size-selector-sizes > li');

  if (sizeItems.length > 0) {
    log('ZARA_PARSER', `Found ${sizeItems.length} size items using .size-selector-sizes > li`);

    sizeItems.each((_, element) => {
      const $item = $(element);
      const $button = $item.find('button');

      // Get size label from the label div inside the button
      const sizeLabel = $button.find('.size-selector-sizes-size__label').first().text().trim();

      if (!sizeLabel) {
        log('ZARA_PARSER', 'Skipping size item - no label found');
        return;
      }

      // Check availability via data-qa-action on the button
      const action = $button.attr('data-qa-action') || '';

      let available = false;
      let lowStock = false;

      if (action === 'size-in-stock') {
        available = true;
      } else if (action === 'size-low-on-stock') {
        // Low stock - still available but limited
        available = true;
        lowStock = true;
      } else if (action === 'size-out-of-stock') {
        available = false;
      } else {
        // Fallback: check for disabled classes
        const isDisabled =
          $item.hasClass('size-selector-sizes__size--disabled') ||
          $item.hasClass('size-selector-sizes-size--unavailable');
        available = !isDisabled && $item.hasClass('size-selector-sizes-size--enabled');
      }

      sizes.push({
        size: sizeLabel,
        available,
        lowStock: lowStock || undefined,
      });
    });
  } else {
    // Fallback: try older selector structure
    log('ZARA_PARSER', 'Primary size selector not found, trying fallback selectors');

    const fallbackItems = $('.size-selector-list__item, [data-qa="size-selector-item"]');

    if (fallbackItems.length > 0) {
      log('ZARA_PARSER', `Found ${fallbackItems.length} size items using fallback selector`);

      fallbackItems.each((_, element) => {
        const $item = $(element);
        const $button = $item.find('button');

        // Try to get label
        let sizeLabel = $item.find('.product-size-info__main-label').text().trim();
        if (!sizeLabel) {
          sizeLabel = $item.find('[data-qa-qualifier="size-selector-sizes-size-label"]').text().trim();
        }
        if (!sizeLabel) {
          sizeLabel = $item.text().trim().split('\n')[0]?.trim() || '';
        }

        if (!sizeLabel) return;

        // Check availability
        const action = $button.attr('data-qa-action') || '';
        const available = action === 'size-in-stock' || action === 'size-low-on-stock';
        const lowStock = action === 'size-low-on-stock';

        sizes.push({
          size: sizeLabel,
          available,
          lowStock: lowStock || undefined,
        });
      });
    }
  }

  log('ZARA_PARSER', `Extracted ${sizes.length} sizes: ${sizes.map(s => `${s.size}(${s.available ? 'ok' : 'out'})`).join(', ')}`);

  return sizes;
}

/**
 * Extract product image URL
 */
function extractImage($: CheerioAPI): string | null {
  for (const selector of SELECTORS.image) {
    const img = $(selector).first();
    if (img.length > 0) {
      // Try different attributes
      const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy');
      if (src && !src.includes('placeholder')) {
        // Ensure full URL
        if (src.startsWith('//')) {
          return `https:${src}`;
        }
        if (src.startsWith('/')) {
          return `https://www.zara.com${src}`;
        }
        return src;
      }
    }
  }
  return null;
}

/**
 * Parse Zara product page HTML and extract product data
 */
export function parseZaraProduct(html: string, url: string): Partial<Product> {
  log('ZARA_PARSER', 'Parsing product page...');

  const $ = cheerio.load(html);

  // Extract product name
  const name = extractText($, SELECTORS.name);
  if (!name) {
    logError('ZARA_PARSER', 'Could not find product name - page structure may have changed');
    // Try to get from title tag as fallback
    const title = $('title').text();
    if (title) {
      log('ZARA_PARSER', `Using title tag as fallback: ${title}`);
    }
  }

  // Extract prices
  const currentPriceText = extractText($, SELECTORS.currentPrice);
  const oldPriceText = extractText($, SELECTORS.oldPrice);
  const discountText = extractText($, SELECTORS.discount);

  const currentPrice = parsePrice(currentPriceText);
  const oldPrice = parsePrice(oldPriceText);
  let discount = parseDiscount(discountText);

  // Calculate discount if we have both prices but no explicit discount
  if (!discount && currentPrice && oldPrice && oldPrice > currentPrice) {
    discount = Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
  }

  // Extract sizes
  const sizes = extractSizes($);

  // Extract image
  const imageUrl = extractImage($);

  // Log extraction results
  log('ZARA_PARSER', `Extracted: name="${name}", price=${currentPrice}, oldPrice=${oldPrice}, discount=${discount}%, sizes=${sizes.length}`);

  return {
    brand: 'zara',
    name: name || 'Unknown Product',
    currentPrice: currentPrice || 0,
    oldPrice,
    discount,
    sizes,
    url,
    imageUrl,
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Check if a URL is a valid Zara product URL
 */
export function isValidZaraUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname.includes('zara.com') &&
      /-p\d+\.html/.test(urlObj.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Zara store parser configuration
 */
export const zaraParser: StoreParser = {
  name: 'zara',
  baseUrl: 'https://www.zara.com',
  parse: parseZaraProduct,
  isValidUrl: isValidZaraUrl,
};

export default zaraParser;
