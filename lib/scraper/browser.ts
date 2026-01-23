// ============================================
// Playwright Browser Setup with Stealth Plugin
// ============================================

import { chromium, type Browser, type BrowserContext, type Page, type BrowserContextOptions } from 'playwright';
import type { Brand } from '@/types';
import { loadSession, saveSession } from './session';
import { getRealisticHeaders, log, logError, randomDelay } from './utils';

// Browser instance singleton
let browserInstance: Browser | null = null;

/**
 * Browser configuration options
 */
export interface BrowserOptions {
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: BrowserOptions = {
  headless: true,
  slowMo: 50, // Slow down actions slightly
  timeout: 60000, // 60 second default timeout
};

/**
 * Get or create a browser instance
 */
export async function getBrowser(options: BrowserOptions = {}): Promise<Browser> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  
  log('BROWSER', 'Launching new browser instance...');
  
  browserInstance = await chromium.launch({
    headless: opts.headless,
    slowMo: opts.slowMo,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-web-security',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });
  
  log('BROWSER', 'Browser launched successfully');
  return browserInstance;
}

/**
 * Create a new browser context with stealth settings and optional session
 */
export async function createContext(
  browser: Browser,
  store?: Brand,
  options: BrowserOptions = {}
): Promise<BrowserContext> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Try to load existing session
  const storageState = store ? loadSession(store) : undefined;
  
  log('BROWSER', `Creating context for ${store || 'generic'}${storageState ? ' with existing session' : ''}`);
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    geolocation: { latitude: 38.7223, longitude: -9.1393 }, // Lisbon
    permissions: ['geolocation'],
    extraHTTPHeaders: getRealisticHeaders(),
    storageState: storageState as BrowserContextOptions['storageState'],
    // Stealth settings
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    javaScriptEnabled: true,
  });
  
  // Set default timeout
  context.setDefaultTimeout(opts.timeout || 60000);
  context.setDefaultNavigationTimeout(opts.timeout || 60000);
  
  // Add stealth scripts to every page
  await context.addInitScript(() => {
    // Override webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    
    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    
    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['pt-PT', 'pt', 'en-US', 'en'],
    });
    
    // Override platform
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
    });
    
    // Override hardware concurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
    });
    
    // Override device memory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
    });
    
    // Override Chrome runtime
    (window as unknown as Record<string, unknown>).chrome = {
      runtime: {},
    };
    
    // Override permissions query
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: PermissionDescriptor) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: 'denied' } as PermissionStatus);
      }
      return originalQuery.call(window.navigator.permissions, parameters);
    };
  });
  
  return context;
}

/**
 * Create a new page with stealth settings
 */
export async function createPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  
  // Block unnecessary resources to speed up loading
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    const url = route.request().url();
    
    // Block tracking and analytics
    if (
      url.includes('google-analytics') ||
      url.includes('googletagmanager') ||
      url.includes('facebook') ||
      url.includes('doubleclick') ||
      url.includes('hotjar') ||
      url.includes('analytics')
    ) {
      return route.abort();
    }
    
    // Block fonts and some images to speed up (keep product images)
    if (resourceType === 'font') {
      return route.abort();
    }
    
    return route.continue();
  });
  
  return page;
}

/**
 * Navigate to a URL with human-like behavior
 */
export async function navigateWithStealth(
  page: Page,
  url: string,
  options: { waitForSelector?: string } = {}
): Promise<{ success: boolean; status: number; error?: string }> {
  try {
    log('BROWSER', `Navigating to: ${url}`);
    
    // Random delay before navigation
    await randomDelay(500, 1500);
    
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    
    if (!response) {
      return { success: false, status: 0, error: 'No response received' };
    }
    
    const status = response.status();
    log('BROWSER', `Response status: ${status}`);
    
    // Check for Akamai block
    if (status === 403) {
      logError('BROWSER', 'Akamai block detected (403) - IP may be flagged');
      logError('BROWSER', 'Suggestions: wait 30min, clear session, use proxy');
      return { success: false, status: 403, error: 'AKAMAI_BLOCKED' };
    }
    
    // Wait for page to stabilize
    await randomDelay(1000, 2000);
    
    // Check for Akamai challenge page
    const html = await page.content();
    if (html.includes('bm-verify') || html.includes('akam-logo') || html.includes('_sec/verify')) {
      logError('BROWSER', 'Akamai challenge detected - session may be cold');
      
      // Try to wait for challenge to complete
      log('BROWSER', 'Waiting for challenge to complete...');
      await page.waitForTimeout(5000);
      
      // Check again
      const newHtml = await page.content();
      if (newHtml.includes('bm-verify') || newHtml.includes('akam-logo')) {
        return { success: false, status: 403, error: 'AKAMAI_CHALLENGE' };
      }
    }
    
    // Wait for optional selector
    if (options.waitForSelector) {
      try {
        await page.waitForSelector(options.waitForSelector, { timeout: 15000 });
      } catch {
        log('BROWSER', `Selector "${options.waitForSelector}" not found, continuing anyway`);
      }
    }
    
    return { success: true, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('timeout')) {
      logError('BROWSER', 'Navigation timeout - possible block');
      return { success: false, status: 0, error: 'TIMEOUT' };
    }
    
    logError('BROWSER', 'Navigation failed', error);
    return { success: false, status: 0, error: message };
  }
}

/**
 * Save session and close context
 */
export async function closeContext(context: BrowserContext, store?: Brand): Promise<void> {
  if (store) {
    await saveSession(store, context);
  }
  await context.close();
  log('BROWSER', 'Context closed');
}

/**
 * Close browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    log('BROWSER', 'Browser closed');
  }
}
