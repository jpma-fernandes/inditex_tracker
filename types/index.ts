// ============================================
// Inditex Tracker - Type Definitions
// ============================================

export type Brand = 'zara' | 'bershka' | 'pullandbear' | 'massimodutti';

export interface SizeStock {
  size: string;
  available: boolean;
  lowStock?: boolean;
}

export interface Product {
  id: string;
  brand: Brand;
  name: string;
  currentPrice: number;
  oldPrice: number | null;
  discount: number | null; // percentage (e.g., 20 for 20%)
  sizes: SizeStock[];
  url: string;
  imageUrl: string | null;
  lastChecked: string; // ISO timestamp
  createdAt: string; // ISO timestamp
}

export interface PriceHistory {
  id: string;
  productId: string;
  price: number;
  timestamp: string; // ISO timestamp
}

export interface StockStatus {
  id: string;
  productId: string;
  sizes: SizeStock[];
  timestamp: string; // ISO timestamp
}

// Scraper types
export interface ScraperResult {
  success: boolean;
  product?: Product;
  error?: string;
  errorCode?: 'AKAMAI_BLOCKED' | 'AKAMAI_CHALLENGE' | 'TIMEOUT' | 'PARSE_ERROR' | 'UNKNOWN';
}

export interface StoreParser {
  name: Brand;
  baseUrl: string;
  parse: (html: string, url: string) => Partial<Product>;
  isValidUrl: (url: string) => boolean;
}

// Storage types
export interface StorageData {
  products: Product[];
  priceHistory: PriceHistory[];
  stockStatus: StockStatus[];
}
