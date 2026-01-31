'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SizeStock } from '@/types';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
  productName: string;
  sizes: SizeStock[];
}

export default function StockHistoryModal({ isOpen, onClose, productId, productName, sizes }: StockHistoryModalProps) {
  const [size, setSize] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ timestamp: string; available: boolean; lowStock?: boolean }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      setSize(sizes?.[0]?.size ?? null);
    }
  }, [isOpen, productId, sizes]);

  useEffect(() => {
    if (isOpen && productId && size) fetchHistory();
  }, [isOpen, productId, size]);

  const fetchHistory = async () => {
    if (!productId || !size) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${productId}/stock-history?size=${encodeURIComponent(size)}`);
      if (!res.ok) throw new Error('Failed to fetch stock history');
      const data = await res.json();
      setHistory(data.history.map((h: any) => ({ timestamp: h.timestamp, available: h.available, lowStock: h.lowStock })));
    } catch (err) {
      console.error(err);
      setError('Could not load stock history');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data: map availability to 1/0
  // Build chart data with three series: available, lowStock, soldOut
  // Use weighted values so green > yellow > gray (3 > 2 > 1)
  const chartData = history.map(h => {
    const status = h.lowStock ? 'low' : h.available ? 'available' : 'soldout';
    return {
      date: new Date(h.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: new Date(h.timestamp).toLocaleString(),
      available: status === 'available' ? 3 : 0,
      low: status === 'low' ? 2 : 0,
      soldout: status === 'soldout' ? 1 : 0,
      _status: status,
    };
  });

  const hasVaried = history.length > 1 && history.some(h => {
    const st = h.lowStock ? 'low' : h.available ? 'available' : 'soldout';
    const st0 = history[0].lowStock ? 'low' : history[0].available ? 'available' : 'soldout';
    return st !== st0;
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const v = data._status === 'available' ? 'Available' : data._status === 'low' ? 'Low stock' : 'Sold out';
      return (
        <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 shadow-xl">
          <p className="text-gray-400 text-xs mb-1">{data.fullDate}</p>
          <p className="text-white font-bold">{v}</p>
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
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9 6 9-6" />
            </svg>
            Stock History
          </DialogTitle>
          <p className="text-gray-400 text-sm mt-1 line-clamp-1">{productName}</p>
        </DialogHeader>

        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-400">Size:</label>
            <select value={size ?? ''} onChange={e => setSize(e.target.value)} className="bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 rounded">
              {sizes.map(s => (
                <option key={s.size} value={s.size}>{s.size}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
            </div>
          ) : error ? (
            <div className="text-gray-400">{error}</div>
          ) : history.length === 0 ? (
            <div className="text-gray-400">No stock history available for this size.</div>
          ) : !hasVaried ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#252525] border border-[#333] rounded-2xl p-8 mb-6 shadow-2xl shadow-blue-500/5">
                <div className="bg-blue-400/10 rounded-full p-5 mb-5 ring-2 ring-blue-500/20 ring-offset-2 ring-offset-[#0a0a0a]">
                  <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-white mb-2">{history[history.length-1].available ? 'Available' : 'Unavailable'}</p>
                <div className="flex items-center justify-center gap-2 text-blue-400 text-sm font-medium">
                  <span>{history.length} checks recorded</span>
                </div>
              </div>

              <h3 className="text-white font-semibold text-xl mb-3">Stock hasn't changed</h3>
              <p className="text-gray-400">This size has remained {history[0].available ? 'available' : 'unavailable'} since {new Date(history[0].timestamp).toLocaleDateString()}</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} ticks={[0,1,2,3]} domain={[0,3]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="soldout" stackId="a" fill="#6b7280" />
                  <Bar dataKey="low" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="available" stackId="a" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
