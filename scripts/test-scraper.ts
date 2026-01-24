#!/usr/bin/env node
// ============================================
// Test Scraper CLI
// Usage: npx tsx scripts/test-scraper.ts <url>
// ============================================

import { scrapeProduct, closeBrowser } from '../lib/scraper';
import { getProducts, exportData } from '../lib/storage';

async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  const headless = !args.includes('--visible');
  const noSave = args.includes('--no-save');
  const showAll = args.includes('--all');
  const exportAll = args.includes('--export');

  // Get URL (first non-flag argument)
  const url = args.find(arg => !arg.startsWith('--'));

  console.log('\n🔍 Inditex Tracker - Scraper Test\n');
  console.log('='.repeat(50));

  // Show all products
  if (showAll) {
    const products = await getProducts();
    if (products.length === 0) {
      console.log('\n📭 No products tracked yet.\n');
    } else {
      console.log(`\n📦 ${products.length} products tracked:\n`);
      products.forEach((p: Awaited<ReturnType<typeof getProducts>>[number], i: number) => {
        const priceInfo = p.oldPrice
          ? `€${p.currentPrice} (was €${p.oldPrice}, -${p.discount}%)`
          : `€${p.currentPrice}`;
        const availableSizes = p.sizes.filter((s: { available: boolean }) => s.available).length;
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   Brand: ${p.brand}`);
        console.log(`   Price: ${priceInfo}`);
        console.log(`   Sizes: ${availableSizes}/${p.sizes.length} available`);
        console.log(`   URL: ${p.url}`);
        console.log(`   Last checked: ${p.lastChecked}`);
        console.log('');
      });
    }
    process.exit(0);
  }

  // Export all data
  if (exportAll) {
    const data = await exportData();
    console.log('\n📤 Exported data:\n');
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }

  // Require URL for scraping
  if (!url) {
    console.log('Usage: npx tsx scripts/test-scraper.ts <url> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --visible    Run browser in visible mode (not headless)');
    console.log('  --no-save    Don\'t save to storage');
    console.log('  --all        Show all tracked products');
    console.log('  --export     Export all data as JSON');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx scripts/test-scraper.ts "https://www.zara.com/pt/pt/casaco-p12345678.html"');
    console.log('  npx tsx scripts/test-scraper.ts --visible "https://www.zara.com/pt/pt/casaco-p12345678.html"');
    console.log('  npx tsx scripts/test-scraper.ts --all');
    console.log('');
    process.exit(1);
  }

  console.log(`\n🌐 URL: ${url}`);
  console.log(`🔧 Headless: ${headless}`);
  console.log(`💾 Save to storage: ${!noSave}`);
  console.log('');
  console.log('Starting scrape...\n');

  const startTime = Date.now();

  try {
    const result = await scrapeProduct(url, {
      headless,
      saveToStorage: !noSave,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.success && result.product) {
      console.log('\n✅ Scrape successful!\n');
      console.log('='.repeat(50));
      console.log('📦 Product Data:');
      console.log('='.repeat(50));
      console.log('');
      console.log(`  ID:       ${result.product.id}`);
      console.log(`  Brand:    ${result.product.brand}`);
      console.log(`  Name:     ${result.product.name}`);
      console.log(`  Price:    €${result.product.currentPrice}`);

      if (result.product.oldPrice) {
        console.log(`  Old Price: €${result.product.oldPrice}`);
        console.log(`  Discount: ${result.product.discount}%`);
      }

      console.log('');
      console.log('  Sizes:');
      if (result.product.sizes.length > 0) {
        result.product.sizes.forEach(size => {
          const status = size.available
            ? (size.lowStock ? '⚠️  Low Stock' : '✅ Available')
            : '❌ Sold Out';
          console.log(`    - ${size.size}: ${status}`);
        });
      } else {
        console.log('    (no sizes found)');
      }

      console.log('');
      console.log(`  Image:    ${result.product.imageUrl || '(not found)'}`);
      console.log(`  URL:      ${result.product.url}`);
      console.log(`  Checked:  ${result.product.lastChecked}`);
      console.log(`  Created:  ${result.product.createdAt}`);
      console.log('');
      console.log('='.repeat(50));
      console.log(`⏱️  Duration: ${duration}s`);
      console.log('');

      if (!noSave) {
        console.log('💾 Product saved to data/products.json');
        console.log('📊 Price history saved to data/price-history.json');
        console.log('📦 Stock status saved to data/stock-status.json');
      }

    } else {
      console.log('\n❌ Scrape failed!\n');
      console.log('='.repeat(50));
      console.log(`Error Code: ${result.errorCode}`);
      console.log(`Error: ${result.error}`);
      console.log('='.repeat(50));
      console.log('');

      if (result.errorCode === 'AKAMAI_BLOCKED') {
        console.log('💡 Suggestions:');
        console.log('   1. Wait 30 minutes before trying again');
        console.log('   2. Delete session file: data/sessions/zara-session.json');
        console.log('   3. Try with --visible flag to see what\'s happening');
        console.log('   4. Consider using a proxy or VPN');
      } else if (result.errorCode === 'AKAMAI_CHALLENGE') {
        console.log('💡 Suggestions:');
        console.log('   1. Run with --visible flag and complete the challenge manually');
        console.log('   2. The session will be saved for future requests');
      } else if (result.errorCode === 'PARSE_ERROR') {
        console.log('💡 Suggestions:');
        console.log('   1. Check if the URL is a valid product page');
        console.log('   2. The page HTML has been saved to data/debug-*.html');
        console.log('   3. The website structure may have changed');
      }

      console.log(`\n⏱️  Duration: ${duration}s\n`);
    }

  } catch (error) {
    console.error('\n💥 Unexpected error:', error);
  } finally {
    await closeBrowser();
  }
}

main().catch(console.error);
