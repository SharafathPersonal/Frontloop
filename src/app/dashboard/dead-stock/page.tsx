'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Shop } from '@/types/broadcast';
import Link from 'next/link';
import {
  Package,
  Settings,
  TrendingUp,
  Download,
  Sparkles,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { getDashboardInventoryStats, getLatestInventoryItems } from './actions';

export default function DeadStockHubPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [stats, setStats] = useState({ liveCount: 0, clearedCount: 0, totalLiquidationValue: 0 });
  const [latestItems, setLatestItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: shopData } = await supabase
      .from('shops')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (shopData) setShop(shopData);

    // Two lean queries instead of fetching entire inventory
    const [inventoryStats, items] = await Promise.all([
      getDashboardInventoryStats(user.id),
      getLatestInventoryItems(user.id, 5),
    ]);

    setStats(inventoryStats);
    setLatestItems(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trueattendenly.online';
  const portalUrl = shop?.id ? `${appUrl}/broadcast/dead-stock?shopId=${shop.id}` : null;
  const qrSrc = portalUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
        portalUrl
      )}&color=3E3B36`
    : null;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-[#E8E3DA]/60 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#E8E3DA]/60 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-[#E8E3DA]/60 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-outfit">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Dead Stock Hub</h1>
          <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mt-1">
            Clearance &amp; Liquidation Network
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/dashboard/dead-stock/manage"
            className="flex-1 sm:flex-none text-center bg-[#3E3B36] text-[#F5F1EA] px-6 py-3 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-[#2A2825] transition-colors flex items-center justify-center gap-2"
          >
            <Settings size={14} /> Manage Dead Stock
          </Link>
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
            <ShieldCheck size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Live Items</p>
            <p className="serif-headline text-2xl text-[#3E3B36] leading-tight">
              {stats.liveCount}
            </p>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
            <CheckCircle size={16} className="text-[#8B8378]" />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Cleared Items</p>
            <p className="serif-headline text-2xl text-[#3E3B36] leading-tight">
              {stats.clearedCount}
            </p>
          </div>
        </div>
        <div className="bg-[#F5F1EA] border border-[#E8E3DA] rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
            <TrendingUp size={16} className="text-[#C4A896]" />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">
              Liquidation Value
            </p>
            <p className="serif-headline text-2xl text-[#3E3B36] leading-tight">
              ₹{stats.totalLiquidationValue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── QR Section ───────────────────────────────────────────────────────── */}
      {portalUrl && (
        <div className="bg-white border border-[#E8E3DA] rounded-xl p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="bg-white p-3 rounded-xl border border-[#E8E3DA] shadow-sm flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc!} alt="Dead Stock QR" width={140} height={140} className="object-contain" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-[#3E3B36] mb-1 flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles size={14} className="text-[#C4A896]" /> Scan to view your Public Dead Stock
              Listing!
            </p>
            <p className="text-[11px] text-[#8B8378] mb-3 break-all font-mono">{portalUrl}</p>
            <a
              href={qrSrc!}
              download={`dead-stock-qr-${shop?.id}.png`}
              className="inline-flex items-center gap-2 bg-[#F5F1EA] border border-[#E8E3DA] text-[#3E3B36] px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase hover:bg-[#E8E3DA] transition-colors"
            >
              <Download size={14} /> Download QR PDF
            </a>
          </div>
        </div>
      )}

      {/* ── Latest 5 Items ────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E3DA] pb-2">
          <h2 className="text-xs font-bold text-[#8B8378] uppercase tracking-[0.15em]">
            Latest 5 Dead Stock Items
          </h2>
          {stats.liveCount + stats.clearedCount > 5 && (
            <Link
              href="/dashboard/dead-stock/manage"
              className="text-xs font-bold text-[#C4A896] hover:text-[#b09482] uppercase tracking-wider"
            >
              View All {stats.liveCount + stats.clearedCount} Items →
            </Link>
          )}
        </div>

        {latestItems.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#E8E3DA] rounded-xl bg-white">
            <Package size={32} className="mx-auto text-[#E8E3DA] mb-3" />
            <p className="text-sm text-[#8B8378]">No inventory found.</p>
            <Link
              href="/dashboard/dead-stock/manage"
              className="inline-block mt-3 text-xs text-[#C4A896] font-bold uppercase tracking-wider hover:text-[#b09482]"
            >
              Add your first item
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#E8E3DA] rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F5F1EA] border-b border-[#E8E3DA]">
                <tr>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">
                    Product
                  </th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">
                    Pricing
                  </th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium">
                    Status
                  </th>
                  <th className="px-5 py-3 text-[10px] tracking-[0.2em] text-[#8B8378] uppercase font-medium text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {latestItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-[#E8E3DA]/60 last:border-0 hover:bg-[#F5F1EA]/30 transition-colors ${
                      item.is_cleared ? 'opacity-50 grayscale' : ''
                    }`}
                  >
                    <td className="px-5 py-4 w-[40%]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg border border-[#E8E3DA] overflow-hidden bg-[#FAFAF8] flex items-center justify-center shrink-0">
                          {item.images?.[0] ? (
                            <img
                              src={item.images[0]}
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package size={20} className="text-[#E8E3DA]" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#3E3B36]">{item.product_name}</h4>
                          <p className="text-[10px] font-semibold tracking-wider uppercase text-[#8B8378] mt-0.5">
                            {item.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 w-[25%]">
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-emerald-600">
                            ₹{parseFloat(item.clearance_price).toLocaleString()}
                          </span>
                          <span className="text-xs text-[#8B8378] line-through">
                            ₹{parseFloat(item.original_price).toLocaleString()}
                          </span>
                        </div>
                        <span className="inline-block text-[9px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100">
                          {item.discount_percentage}% OFF
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 w-[20%]">
                      {item.is_cleared ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle size={10} /> Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                          <ShieldCheck size={10} /> Live Now
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right w-[15%]">
                      <Link
                        href="/dashboard/dead-stock/manage"
                        className="inline-block px-4 py-2 border border-[#E8E3DA] rounded-lg bg-white text-[#8B8378] text-[10px] font-bold tracking-wider uppercase hover:text-[#C4A896] transition-colors"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
