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
  
  // Size list items
  sizeList: [
    '.size-selector-list__item',
    '.product-size-selector__size-list li',
    '[data-qa="size-selector-item"]',
  ],
  
  // Size label within list item
  sizeLabel: [
    '.product-size-info__main-label',
    '.size-selector-sizes__label',
    '[data-qa="size-label"]',
  ],
  
  // Size availability text within list item
  sizeAvailability: [
    '.product-size-info__second-line',
    '.size-selector-sizes__availability',
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
 */
function extractSizes($: CheerioAPI): SizeStock[] {
  const sizes: SizeStock[] = [];
  
  // Try each size list selector
  for (const listSelector of SELECTORS.sizeList) {
    const sizeItems = $(listSelector);
    
    if (sizeItems.length > 0) {
      sizeItems.each((_, element) => {
        const $item = $(element);
        
        // Get size label
        let sizeLabel: string | null = null;
        for (const labelSelector of SELECTORS.sizeLabel) {
          const label = $item.find(labelSelector).text().trim();
          if (label) {
            sizeLabel = label;
            break;
          }
        }
        
        // Fallback: get text directly from item
        if (!sizeLabel) {
          sizeLabel = $item.text().trim().split('\n')[0]?.trim() || null;
        }
        
        if (!sizeLabel) return;
        
        // Determine availability
        // Check for disabled/unavailable classes
        const isDisabled = 
          $item.hasClass('size-selector-list__item--disabled') ||
          $item.hasClass('size-selector-list__item--out-of-stock') ||
          $item.find('[disabled]').length > 0 ||
          $item.attr('aria-disabled') === 'true';
        
        // Check for low stock text
        let lowStock = false;
        let available = !isDisabled;
        
        for (const availSelector of SELECTORS.sizeAvailability) {
          const availText = $item.find(availSelector).text().trim().toLowerCase();
          if (availText) {
            if (availText.includes('pocas unidades') || availText.includes('low stock') || availText.includes('últimas')) {
              lowStock = true;
              available = true;
            }
            if (availText.includes('agotado') || availText.includes('sold out') || availText.includes('ver similares')) {
              available = false;
            }
          }
        }
        
        sizes.push({
          size: sizeLabel,
          available,
          lowStock: lowStock || undefined,
        });
      });
      
      if (sizes.length > 0) break;
    }
  }
  
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
