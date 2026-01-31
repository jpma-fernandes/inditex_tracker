'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Product } from '@/types';
import ProductCard from './ProductCard';
import AddToFolderModal from './AddToFolderModal';
import PriceHistoryModal from './PriceHistoryModal';
import FolderGrid from './FolderGrid';

interface EnrichedProduct extends Product {
  hasDiscount: boolean;
  availableSizesCount: number;
  totalSizesCount: number;
  hasLowStock: boolean;
  isFullyAvailable: boolean;
  isOutOfStock: boolean;
}

interface ProductListProps {
  refreshTrigger?: number;
  folderId?: string;  // If provided, fetch products from this folder
  searchQuery?: string;  // Filter products by name
}

interface FolderItem {
  id: string;
  name: string;
  productCount: number;
}

export default function ProductList({ refreshTrigger, folderId, searchQuery = '' }: ProductListProps) {
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState<{ productId: string; productName: string } | null>(null);
  const [priceHistoryModal, setPriceHistoryModal] = useState<{ productId: string; productName: string } | null>(null);

  const handleAddToFolder = (productId: string, productName: string) => {
    setFolderModal({ productId, productName });
  };

  const handleViewPriceHistory = (productId: string, productName: string) => {
    setPriceHistoryModal({ productId, productName });
  };

  const handleFolderModalSuccess = () => {
    // Refresh products list after adding to folder (product will disappear from main list)
    fetchProducts();
  };

  const fetchProducts = useCallback(async () => {
    try {
      // Fetch from folder API or main products API
      const url = folderId
        ? `/api/folders/${folderId}`
        : '/api/products';

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }

      setProducts(data.products || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [folderId]);

  const fetchFolders = useCallback(async () => {
    if (folderId) return; // Don't fetch folders if we are inside a folder

    try {
      const res = await fetch('/api/folders');
      const data = await res.json();
      if (res.ok) {
        setFolders(data.folders || []);
      }
    } catch (err) {
      console.error('Failed to fetch folders', err);
    }
  }, [folderId]);

  useEffect(() => {
    fetchProducts();
    fetchFolders();
  }, [fetchProducts, fetchFolders, refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this product from tracking?')) return;

    try {
      const response = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete product');
      }

      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const handleRefresh = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    setRefreshingId(id);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: product.url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to refresh product');
      }

      // Reload products
      await fetchProducts();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to refresh product');
    } finally {
      setRefreshingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="spinner w-8 h-8 mb-4"></div>
        <p className="text-gray-500">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/30 border border-red-800 rounded-lg text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchProducts}
          className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg transition-colors"
          title="Try Again"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    // If on homepage and no products but has folders, show folder grid
    if (!folderId && folders.length > 0) {
      return <FolderGrid folders={folders} />;
    }

    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-300 mb-2">No products tracked yet</h3>
        <p className="text-gray-500 mb-6 font-[family-name:var(--font-geist-sans)]">Add a product URL above to start tracking prices and stock.</p>
      </div>
    );
  }

  // Filter products by search query (case-insensitive)
  const filteredProducts = searchQuery
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  // Sort: discounted first, then by last checked
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (a.hasDiscount && !b.hasDiscount) return -1;
    if (!a.hasDiscount && b.hasDiscount) return 1;
    return new Date(b.lastChecked).getTime() - new Date(a.lastChecked).getTime();
  });

  return (
    <div>
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <div className="px-3 py-1.5 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
          <span className="text-gray-500">Tracking:</span>{' '}
          <span className="text-white font-medium">{products.length}</span>
        </div>
        <div className="px-3 py-1.5 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
          <span className="text-gray-500">On sale:</span>{' '}
          <span className="text-green-400 font-medium">
            {products.filter(p => p.hasDiscount).length}
          </span>
        </div>
        <div className="px-3 py-1.5 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
          <span className="text-gray-500">Low stock:</span>{' '}
          <span className="text-yellow-400 font-medium">
            {products.filter(p => p.hasLowStock).length}
          </span>
        </div>
        {searchQuery && (
          <div className="px-3 py-1.5 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <span className="text-gray-500">Results:</span>{' '}
            <span className="text-blue-400 font-medium">{filteredProducts.length}</span>
          </div>
        )}
      </div>

      {/* No search results */}
      {searchQuery && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No products found</h3>
          <p className="text-gray-500">No products match &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {/* Product grid */}
      {sortedProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProducts.map(product => (
            <div key={product.id} className={refreshingId === product.id ? 'opacity-50' : ''}>
              <ProductCard
                product={product}
                onDelete={handleDelete}
                onRefresh={refreshingId ? undefined : handleRefresh}
                onAddToFolder={!folderId ? handleAddToFolder : undefined}
                onViewPriceHistory={handleViewPriceHistory}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add to Folder Modal */}
      {folderModal && (
        <AddToFolderModal
          productId={folderModal.productId}
          productName={folderModal.productName}
          isOpen={true}
          onClose={() => setFolderModal(null)}
          onSuccess={handleFolderModalSuccess}
        />
      )}

      {/* Price History Modal */}
      <PriceHistoryModal
        isOpen={!!priceHistoryModal}
        onClose={() => setPriceHistoryModal(null)}
        productId={priceHistoryModal?.productId ?? null}
        productName={priceHistoryModal?.productName ?? ''}
      />
    </div>
  );
}
