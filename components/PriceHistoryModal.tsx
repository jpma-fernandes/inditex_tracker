'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import type { PriceHistory } from '@/types';

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
  productName: string;
}

interface ChartData {
  date: string;
  price: number;
  fullDate: string;
}

export default function PriceHistoryModal({
  isOpen,
  onClose,
  productId,
  productName,
}: PriceHistoryModalProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      fetchPriceHistory();
    }
  }, [isOpen, productId]);

  const fetchPriceHistory = async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productId}/price-history`);
      if (!response.ok) {
        throw new Error('Failed to fetch price history');
      }

      const data = await response.json();
      setPriceHistory(data.priceHistory);
      setCurrentPrice(data.currentPrice);
    } catch (err) {
      setError('Could not load price history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Transform data for the chart
  const chartData: ChartData[] = priceHistory.map((entry) => {
    const date = new Date(entry.timestamp);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      price: entry.price,
    };
  });

  // Calculate stats
  const prices = priceHistory.map((p) => p.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const priceChange = prices.length >= 2 ? prices[prices.length - 1] - prices[0] : 0;
  const priceChangePercent = prices.length >= 2 && prices[0] !== 0 
    ? ((priceChange / prices[0]) * 100).toFixed(1) 
    : '0';

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 shadow-xl">
          <p className="text-gray-400 text-xs mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-white font-bold text-lg">
            €{payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0a0a0a] border-[#2a2a2a] text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Price History
          </DialogTitle>
          <p className="text-gray-400 text-sm mt-1 line-clamp-1">{productName}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <svg className="w-12 h-12 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        ) : priceHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <svg className="w-12 h-12 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>No price history available yet</p>
            <p className="text-sm text-gray-500 mt-1">Price changes will appear here</p>
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Current</p>
                <p className="text-lg font-bold text-white">€{currentPrice?.toFixed(2)}</p>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Lowest</p>
                <p className="text-lg font-bold text-green-400">€{minPrice.toFixed(2)}</p>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Highest</p>
                <p className="text-lg font-bold text-red-400">€{maxPrice.toFixed(2)}</p>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Change</p>
                <p className={`text-lg font-bold ${priceChange < 0 ? 'text-green-400' : priceChange > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {priceChange > 0 ? '+' : ''}{priceChangePercent}%
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2a2a' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2a2a' }}
                    tickFormatter={(value) => `€${value}`}
                    domain={['dataMin - 5', 'dataMax + 5']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#priceGradient)"
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Footer info */}
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <span>{priceHistory.length} price {priceHistory.length === 1 ? 'record' : 'records'}</span>
              <span>
                Tracking since {new Date(priceHistory[0]?.timestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
