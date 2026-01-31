// ============================================
// JSON File Storage Implementation THIS IS DEPRACATED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// ============================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Product, PriceHistory, StockStatus, SizeStock } from '@/types';
import { nanoid } from 'nanoid';

const DATA_DIR = join(process.cwd(), 'data');
const PRODUCTS_FILE = join(DATA_DIR, 'products.json');
const PRICE_HISTORY_FILE = join(DATA_DIR, 'price-history.json');
const STOCK_STATUS_FILE = join(DATA_DIR, 'stock-status.json');

// Ensure data directory and files exist
function ensureDataFiles(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  
  const sessionsDir = join(DATA_DIR, 'sessions');
  if (!existsSync(sessionsDir)) {
    mkdirSync(sessionsDir, { recursive: true });
  }

  if (!existsSync(PRODUCTS_FILE)) {
    writeFileSync(PRODUCTS_FILE, '[]', 'utf-8');
  }
  if (!existsSync(PRICE_HISTORY_FILE)) {
    writeFileSync(PRICE_HISTORY_FILE, '[]', 'utf-8');
  }
  if (!existsSync(STOCK_STATUS_FILE)) {
    writeFileSync(STOCK_STATUS_FILE, '[]', 'utf-8');
  }
}

// Generic read/write helpers
function readJsonFile<T>(filePath: string): T[] {
  ensureDataFiles();
  try {
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch {
    return [];
  }
}

function writeJsonFile<T>(filePath: string, data: T[]): void {
  ensureDataFiles();
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================
// Products CRUD
// ============================================

export function getProducts(): Product[] {
  return readJsonFile<Product>(PRODUCTS_FILE);
}

export function getProductById(id: string): Product | undefined {
  const products = getProducts();
  return products.find(p => p.id === id);
}

export function getProductByUrl(url: string): Product | undefined {
  const products = getProducts();
  // Normalize URL for comparison (remove query params)
  const normalizedUrl = url.split('?')[0];
  return products.find(p => p.url.split('?')[0] === normalizedUrl);
}

export function addProduct(product: Omit<Product, 'id' | 'createdAt'>): Product {
  const products = getProducts();
  
  // Check if product with same URL already exists
  const existingProduct = getProductByUrl(product.url);
  if (existingProduct) {
    return updateProduct(existingProduct.id, product);
  }
  
  const newProduct: Product = {
    ...product,
    id: nanoid(),
    createdAt: new Date().toISOString(),
  };
  
  products.push(newProduct);
  writeJsonFile(PRODUCTS_FILE, products);
  
  // Also add initial price history
  addPriceHistory(newProduct.id, newProduct.currentPrice);
  
  // Also add initial stock status
  addStockStatus(newProduct.id, newProduct.sizes);
  
  return newProduct;
}

export function updateProduct(id: string, data: Partial<Product>): Product {
  const products = getProducts();
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    throw new Error(`Product with id ${id} not found`);
  }
  
  const oldProduct = products[index];
  const updatedProduct: Product = {
    ...oldProduct,
    ...data,
    id: oldProduct.id, // Preserve original ID
    createdAt: oldProduct.createdAt, // Preserve creation date
    lastChecked: new Date().toISOString(),
  };
  
  products[index] = updatedProduct;
  writeJsonFile(PRODUCTS_FILE, products);
  
  // Add price history if price changed
  if (data.currentPrice !== undefined && data.currentPrice !== oldProduct.currentPrice) {
    addPriceHistory(id, data.currentPrice);
  }
  
  // Add stock status if sizes changed
  if (data.sizes !== undefined) {
    addStockStatus(id, data.sizes);
  }
  
  return updatedProduct;
}

export function deleteProduct(id: string): void {
  const products = getProducts();
  const filtered = products.filter(p => p.id !== id);
  writeJsonFile(PRODUCTS_FILE, filtered);
}

// ============================================
// Price History
// ============================================

export function getPriceHistory(productId: string): PriceHistory[] {
  const history = readJsonFile<PriceHistory>(PRICE_HISTORY_FILE);
  return history
    .filter(h => h.productId === productId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function addPriceHistory(productId: string, price: number): PriceHistory {
  const history = readJsonFile<PriceHistory>(PRICE_HISTORY_FILE);
  
  const newEntry: PriceHistory = {
    id: nanoid(),
    productId,
    price,
    timestamp: new Date().toISOString(),
  };
  
  history.push(newEntry);
  writeJsonFile(PRICE_HISTORY_FILE, history);
  
  return newEntry;
}

// ============================================
// Stock Status
// ============================================

export function getStockStatus(productId: string): StockStatus[] {
  const status = readJsonFile<StockStatus>(STOCK_STATUS_FILE);
  return status
    .filter(s => s.productId === productId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function getLatestStockStatus(productId: string): StockStatus | undefined {
  const history = getStockStatus(productId);
  return history[history.length - 1];
}

export function addStockStatus(productId: string, sizes: SizeStock[]): StockStatus {
  const status = readJsonFile<StockStatus>(STOCK_STATUS_FILE);
  
  const newEntry: StockStatus = {
    id: nanoid(),
    productId,
    sizes,
    timestamp: new Date().toISOString(),
  };
  
  status.push(newEntry);
  writeJsonFile(STOCK_STATUS_FILE, status);
  
  return newEntry;
}

// ============================================
// Utility functions
// ============================================

export function clearAllData(): void {
  writeJsonFile(PRODUCTS_FILE, []);
  writeJsonFile(PRICE_HISTORY_FILE, []);
  writeJsonFile(STOCK_STATUS_FILE, []);
}

export function exportData(): { products: Product[]; priceHistory: PriceHistory[]; stockStatus: StockStatus[] } {
  return {
    products: getProducts(),
    priceHistory: readJsonFile<PriceHistory>(PRICE_HISTORY_FILE),
    stockStatus: readJsonFile<StockStatus>(STOCK_STATUS_FILE),
  };
}
