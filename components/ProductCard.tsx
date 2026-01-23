'use client';

import type { Product, SizeStock } from '@/types';

interface ProductCardProps {
  product: Product & {
    hasDiscount?: boolean;
    availableSizesCount?: number;
    totalSizesCount?: number;
    hasLowStock?: boolean;
    isOutOfStock?: boolean;
  };
  onDelete?: (id: string) => void;
  onRefresh?: (id: string) => void;
}

function SizeBadge({ size }: { size: SizeStock }) {
  const baseClasses = "px-2 py-1 text-xs font-medium rounded";
  
  if (!size.available) {
    return (
      <span className={`${baseClasses} bg-gray-800 text-gray-500 line-through`}>
        {size.size}
      </span>
    );
  }
  
  if (size.lowStock) {
    return (
      <span className={`${baseClasses} bg-yellow-900/50 text-yellow-400 border border-yellow-700`}>
        {size.size}
      </span>
    );
  }
  
  return (
    <span className={`${baseClasses} bg-green-900/50 text-green-400 border border-green-700`}>
      {size.size}
    </span>
  );
}

export default function ProductCard({ product, onDelete, onRefresh }: ProductCardProps) {
  const brandColors: Record<string, string> = {
    zara: 'from-gray-600 to-gray-800',
    bershka: 'from-orange-600 to-orange-800',
    pullandbear: 'from-blue-600 to-blue-800',
    massimodutti: 'from-amber-700 to-amber-900',
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-[#3a3a3a] transition-colors animate-slide-up">
      {/* Header with brand and badges */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Brand badge */}
            <div className={`inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-gradient-to-r ${brandColors[product.brand]} text-white mb-2`}>
              {product.brand}
            </div>
            
            {/* Product name */}
            <h3 className="font-medium text-white truncate" title={product.name}>
              {product.name}
            </h3>
          </div>
          
          {/* Discount badge */}
          {product.hasDiscount && product.discount && (
            <div className="flex-shrink-0 px-2 py-1 bg-green-600 text-white text-sm font-bold rounded animate-pulse-green">
              -{product.discount}%
            </div>
          )}
        </div>
      </div>
      
      {/* Price section */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-white">
            {product.currentPrice.toFixed(2)}
          </span>
          {product.oldPrice && (
            <span className="text-lg text-gray-500 line-through">
              {product.oldPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
      
      {/* Sizes section */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Sizes</span>
          <span className="text-xs text-gray-500">
            {product.availableSizesCount ?? product.sizes.filter(s => s.available).length}/
            {product.totalSizesCount ?? product.sizes.length} available
          </span>
        </div>
        
        {product.sizes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {product.sizes.map((size, index) => (
              <SizeBadge key={`${size.size}-${index}`} size={size} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No size information</p>
        )}
        
        {/* Stock alerts */}
        {product.isOutOfStock && (
          <div className="mt-3 p-2 bg-red-900/30 border border-red-800 rounded text-red-400 text-xs">
            All sizes sold out
          </div>
        )}
        {product.hasLowStock && !product.isOutOfStock && (
          <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-800 rounded text-yellow-400 text-xs">
            Low stock on some sizes
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Updated {formatDate(product.lastChecked)}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={() => onRefresh(product.id)}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
              title="Refresh product"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          
          {/* View on site button */}
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
            title="View on site"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          
          {/* Delete button */}
          {onDelete && (
            <button
              onClick={() => onDelete(product.id)}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
              title="Remove from tracking"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
