// ============================================
// Scraper Utility Functions
// ============================================

import type { Brand } from '@/types';

/**
 * Random delay between actions to mimic human behavior
 * @param min Minimum delay in milliseconds
 * @param max Maximum delay in milliseconds
 */
export async function randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Parse price string to float
 * Handles formats like: "19,99 EUR", "€19.99", "19.99€", "19,99 €"
 * @param priceString The price string to parse
 * @returns The price as a float, or null if parsing failed
 */
export function parsePrice(priceString: string | null | undefined): number | null {
  if (!priceString) return null;
  
  // Remove currency symbols, spaces, and normalize
  let cleaned = priceString
    .replace(/[€$£]/g, '')
    .replace(/EUR|USD|GBP/gi, '')
    .replace(/\s+/g, '')
    .trim();
  
  // Handle European format (comma as decimal separator)
  // Check if we have format like "1.234,56" (European thousands separator)
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/,\d{2}$/.test(cleaned)) {
    // Simple European decimal: "19,99"
    cleaned = cleaned.replace(',', '.');
  }
  
  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
}

/**
 * Parse discount percentage from string
 * Handles formats like: "-20%", "20%", "20% OFF"
 * @param discountString The discount string to parse
 * @returns The discount as a number (e.g., 20 for 20%), or null
 */
export function parseDiscount(discountString: string | null | undefined): number | null {
  if (!discountString) return null;
  
  const match = discountString.match(/-?\d+/);
  if (!match) return null;
  
  const discount = Math.abs(parseInt(match[0], 10));
  return discount > 0 && discount <= 100 ? discount : null;
}

/**
 * Detect which store a URL belongs to
 * @param url The product URL
 * @returns The brand name, or null if not recognized
 */
export function detectStore(url: string): Brand | null {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('zara.com')) return 'zara';
  if (lowerUrl.includes('bershka.com')) return 'bershka';
  if (lowerUrl.includes('pullandbear.com')) return 'pullandbear';
  if (lowerUrl.includes('massimodutti.com')) return 'massimodutti';
  
  return null;
}

/**
 * Validate if a URL is a valid product URL
 * @param url The URL to validate
 * @returns True if the URL appears to be a valid product page
 */
export function isValidProductUrl(url: string): boolean {
  const store = detectStore(url);
  if (!store) return false;
  
  try {
    const urlObj = new URL(url);
    
    // Zara product URLs contain "-p" followed by product ID
    if (store === 'zara') {
      return /-p\d+\.html/.test(urlObj.pathname);
    }
    
    // Generic check for other stores
    return urlObj.pathname.length > 1;
  } catch {
    return false;
  }
}

/**
 * Extract product ID from URL
 * @param url The product URL
 * @returns The product ID, or null if not found
 */
export function extractProductId(url: string): string | null {
  const store = detectStore(url);
  if (!store) return null;
  
  if (store === 'zara') {
    // Zara: casaco-estrutura-p02753752.html -> 02753752
    const match = url.match(/-p(\d+)\.html/);
    return match ? match[1] : null;
  }
  
  return null;
}

/**
 * Get realistic browser headers
 * @returns Headers object for requests
 */
export function getRealisticHeaders(): Record<string, string> {
  return {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };
}

/**
 * Log with timestamp and category
 */
export function log(category: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${category}]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Log error with timestamp and category
 */
export function logError(category: string, message: string, error?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${category}] [ERROR]`;
  
  console.error(`${prefix} ${message}`);
  if (error instanceof Error) {
    console.error(`${prefix} Stack:`, error.stack);
  } else if (error) {
    console.error(`${prefix} Details:`, error);
  }
}
