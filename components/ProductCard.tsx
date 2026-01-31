'use client';

import type { Product, SizeStock } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  onAddToFolder?: (id: string, name: string) => void;
  onViewPriceHistory?: (id: string, name: string) => void;
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

export default function ProductCard({ product, onDelete, onRefresh, onAddToFolder, onViewPriceHistory }: ProductCardProps) {
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
      {/* Product Image */}
      {product.imageUrl ? (
        <div className="relative aspect-[3/4] overflow-hidden bg-[#0a0a0a] group">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1a1a1a] to-transparent" />

          {/* Brand badge over image */}
          <div className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md bg-gradient-to-r ${brandColors[product.brand]} text-white shadow-lg backdrop-blur-sm`}>
            {product.brand}
          </div>

          {/* Discount badge over image */}
          {product.hasDiscount && product.discount && (
            <div className="absolute top-3 right-3 px-2.5 py-1 bg-green-600 text-white text-sm font-bold rounded-md shadow-lg animate-pulse-green">
              -{product.discount}%
            </div>
          )}
        </div>
      ) : (
        /* Header with brand and badges (only if no image) */
        <div className="p-4 border-b border-[#2a2a2a]">
          <div className="flex items-start justify-between gap-4">
            <div className={`inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-gradient-to-r ${brandColors[product.brand]} text-white`}>
              {product.brand}
            </div>

            {/* Discount badge */}
            {product.hasDiscount && product.discount && (
              <div className="flex-shrink-0 px-2 py-1 bg-green-600 text-white text-sm font-bold rounded animate-pulse-green">
                -{product.discount}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product name section */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <h3 className="font-medium text-white line-clamp-2" title={product.name}>
          {product.name}
        </h3>
      </div>

      {/* Price section */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-2xl font-bold text-white">
            €{product.currentPrice.toFixed(2)}
          </span>
          {product.oldPrice && (
            <span className="text-lg text-gray-500 line-through">
              €{product.oldPrice.toFixed(2)}
            </span>
          )}
          {product.originalPrice && (
            <span className="text-lg text-gray-700 line-through">
              €{product.originalPrice.toFixed(2)}
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

        <div className="flex items-center justify-between gap-3">
          {/* Size badges */}
          {product.sizes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 flex-1">
              {product.sizes.map((size, index) => (
                <SizeBadge key={`${size.size}-${index}`} size={size} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 flex-1">No size information</p>
          )}

          {/* Stock alerts */}
          {product.isOutOfStock && (
            <div className="px-2 py-1 bg-red-900/30 border border-red-800 rounded text-red-400 text-xs font-medium whitespace-nowrap">
              Sold Out
            </div>
          )}
          {product.hasLowStock && !product.isOutOfStock && (
            <div className="px-2 py-1 bg-yellow-900/30 border border-yellow-800 rounded text-yellow-400 text-xs font-medium whitespace-nowrap">
              Low stock
            </div>
          )}
        </div>
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
              className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors cursor-pointer"
              title="Refresh product"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {/* Delete button */}
          {onDelete && (
            <button
              onClick={() => onDelete(product.id)}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
              title="Remove from tracking"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors cursor-pointer"
                title="More actions"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#2a2a2a]">
              {onViewPriceHistory && (
                <DropdownMenuItem
                  onClick={() => onViewPriceHistory(product.id, product.name)}
                  className="text-gray-300 hover:text-white focus:text-white focus:bg-[#2a2a2a] cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  View price history
                </DropdownMenuItem>
              )}
              {onAddToFolder && (
                <DropdownMenuItem
                  onClick={() => onAddToFolder(product.id, product.name)}
                  className="text-gray-300 hover:text-white focus:text-white focus:bg-[#2a2a2a] cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Add to folder
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => window.open(product.url, '_blank', 'noopener,noreferrer')}
                className="text-gray-300 hover:text-white focus:text-white focus:bg-[#2a2a2a] cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on site
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
