#!/usr/bin/env node
// ============================================
// Local Cron Job Simulator
// Usage: npx tsx scripts/cron-local.ts
// 
// This script simulates a cron job that refreshes
// all tracked products at random intervals (30-45 min)
// ============================================

import cron from 'node-cron';
import { refreshAllProducts, closeBrowser } from '../lib/scraper';
import { getProducts } from '../lib/storage';

const MIN_INTERVAL_MINUTES = 30;
const MAX_INTERVAL_MINUTES = 45;

// Generate random jitter in milliseconds
function getRandomInterval(): number {
  const minutes = Math.floor(
    Math.random() * (MAX_INTERVAL_MINUTES - MIN_INTERVAL_MINUTES + 1)
  ) + MIN_INTERVAL_MINUTES;
  return minutes * 60 * 1000;
}

// Format duration for logging
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// Run refresh job
async function runRefresh(): Promise<void> {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log(`[CRON] Starting refresh at ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  try {
    const products = getProducts();
    
    if (products.length === 0) {
      console.log('[CRON] No products to refresh');
      return;
    }
    
    console.log(`[CRON] Found ${products.length} products to refresh`);
    
    const results = await refreshAllProducts();
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    console.log('\n[CRON] Results:');
    results.forEach((result, index) => {
      const product = products[index];
      if (result.success && result.product) {
        const priceInfo = result.product.oldPrice 
          ? `€${result.product.currentPrice} (was €${result.product.oldPrice}, -${result.product.discount}%)`
          : `€${result.product.currentPrice}`;
        console.log(`  ✅ ${result.product.name} - ${priceInfo}`);
      } else {
        console.log(`  ❌ ${product?.name || 'Unknown'} - ${result.error}`);
      }
    });
    
    const duration = Date.now() - startTime;
    console.log(`\n[CRON] Completed: ${successCount}/${products.length} successful (${formatDuration(duration)})`);
    
    // Check for notable changes
    const discountedProducts = results.filter(r => r.success && r.product?.discount);
    if (discountedProducts.length > 0) {
      console.log('\n🏷️  DISCOUNTS DETECTED:');
      discountedProducts.forEach(r => {
        console.log(`   ${r.product!.name}: -${r.product!.discount}% (€${r.product!.currentPrice})`);
      });
    }
    
  } catch (error) {
    console.error('[CRON] Refresh failed:', error);
  } finally {
    await closeBrowser();
  }
}

// Schedule next run with jitter
function scheduleNextRun(): void {
  const interval = getRandomInterval();
  console.log(`\n[CRON] Next refresh in ${formatDuration(interval)}`);
  
  setTimeout(async () => {
    await runRefresh();
    scheduleNextRun();
  }, interval);
}

// Main
async function main(): Promise<void> {
  console.log('\n🔄 Inditex Tracker - Local Cron Job');
  console.log('=' .repeat(60));
  console.log(`Refresh interval: ${MIN_INTERVAL_MINUTES}-${MAX_INTERVAL_MINUTES} minutes (randomized)`);
  console.log('Press Ctrl+C to stop');
  console.log('=' .repeat(60));
  
  const products = getProducts();
  console.log(`\n📦 Currently tracking ${products.length} products`);
  
  if (products.length === 0) {
    console.log('\nNo products to track. Add products using:');
    console.log('  npx tsx scripts/test-scraper.ts "<product-url>"');
    console.log('\nWaiting for products...');
  }
  
  // Run immediately on start
  if (products.length > 0) {
    console.log('\n[CRON] Running initial refresh...');
    await runRefresh();
  }
  
  // Schedule subsequent runs with jitter
  scheduleNextRun();
  
  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\n\n[CRON] Shutting down...');
    await closeBrowser();
    process.exit(0);
  });
}

main().catch(console.error);
