'use client';

import { useState, useCallback } from 'react';
import AddProductForm from '@/components/AddProductForm';
import ProductList from '@/components/ProductList';
import FolderSidebar from '@/components/FolderSidebar';
import SearchInput from '@/components/SearchInput';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const handleProductAdded = () => {
    // Trigger refresh of product list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <section className="text-center py-8">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Track Prices & Stock
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto">
          Monitor products from Zara and other Inditex stores. Get notified when prices drop or stock becomes available.
        </p>
      </section>

      {/* Add product form */}
      <section className="max-w-2xl mx-auto">
        <AddProductForm onProductAdded={handleProductAdded} />
      </section>

      {/* Products list */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Tracked Products</h3>
          <div className="flex items-center gap-3">
            <FolderSidebar onFolderCreated={() => setRefreshTrigger(prev => prev + 1)} />
            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="mb-6 max-w-md">
          <SearchInput onSearch={handleSearch} placeholder="Search by product name..." />
        </div>

        <ProductList refreshTrigger={refreshTrigger} searchQuery={searchQuery} />
      </section>
    </div>
  );
}
