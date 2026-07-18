'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Filter, AlertTriangle, ArrowDownAZ, ArrowUpZA, Store } from 'lucide-react';
import { getDeadStockProducts, getActiveShops } from './actions';

function DeadStockDirectory() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialShopId = searchParams.get('shopId');

  const [products, setProducts] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedShop, setSelectedShop] = useState(initialShopId || 'ALL');
  const [sortOrder, setSortOrder] = useState<'LOW_TO_HIGH' | 'HIGH_TO_LOW'>('LOW_TO_HIGH');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [fetchedProducts, fetchedShops] = await Promise.all([
        getDeadStockProducts(),
        getActiveShops()
      ]);
      setProducts(fetchedProducts);
      setShops(fetchedShops);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Update URL parameters when shop filter changes
  useEffect(() => {
    if (selectedShop !== 'ALL') {
      router.push(`/broadcast/dead-stock?shopId=${selectedShop}`, { scroll: false });
    } else if (searchParams.get('shopId')) {
      router.push('/broadcast/dead-stock', { scroll: false });
    }
  }, [selectedShop, router, searchParams]);

  // Derived categories
  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtering and Sorting
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
    const matchesShop = selectedShop === 'ALL' || product.shop_id === selectedShop;
    return matchesSearch && matchesCategory && matchesShop;
  }).sort((a, b) => {
    const priceA = parseFloat(a.clearance_price);
    const priceB = parseFloat(b.clearance_price);
    return sortOrder === 'LOW_TO_HIGH' ? priceA - priceB : priceB - priceA;
  });

  return (
    <main className="min-h-screen bg-[#FAF6F0] font-outfit pb-24">
      {/* Header */}
      <header className="bg-[#5C4033] text-[#FAF6F0] pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 text-rose-300 text-xs font-bold tracking-widest uppercase rounded-full mb-4 border border-rose-500/30">
            <AlertTriangle size={14} /> Factory Clearance
          </span>
          <h1 className="serif-headline text-4xl md:text-5xl lg:text-6xl mb-6">
            Hyper-Local Dead Stock
          </h1>
          <p className="max-w-2xl mx-auto text-[#C4A896] text-sm md:text-base leading-relaxed">
            Discover massive discounts on unsold inventory from premium local merchants. 
            No middlemen. No shipping waits. Contact directly via WhatsApp and pick up today.
          </p>
        </div>
      </header>

      {/* Control Panel */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg border border-[#E5DCD3] p-4 md:p-6 flex flex-col md:flex-row gap-4">
          
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products, brands, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#FAF6F0] border border-[#E5DCD3] rounded-xl text-sm focus:outline-none focus:border-[#5C4033] focus:ring-1 focus:ring-[#5C4033] transition-all"
            />
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-4">
            {/* Shop Filter */}
            <div className="relative flex-1 md:flex-none md:w-48">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select 
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-[#FAF6F0] border border-[#E5DCD3] rounded-xl text-sm appearance-none focus:outline-none focus:border-[#5C4033] cursor-pointer"
              >
                <option value="ALL">All Shops</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.shop_name} ({shop.city})</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="relative flex-1 md:flex-none md:w-40">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-[#FAF6F0] border border-[#E5DCD3] rounded-xl text-sm appearance-none focus:outline-none focus:border-[#5C4033] cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat === 'ALL' ? 'All Categories' : cat}</option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(prev => prev === 'LOW_TO_HIGH' ? 'HIGH_TO_LOW' : 'LOW_TO_HIGH')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FAF6F0] border border-[#E5DCD3] rounded-xl text-sm font-semibold text-[#5C4033] hover:bg-[#E5DCD3] transition-colors"
            >
              {sortOrder === 'LOW_TO_HIGH' ? <ArrowDownAZ size={16} /> : <ArrowUpZA size={16} />}
              <span className="hidden sm:inline">Price Sort</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(selectedShop !== 'ALL' || selectedCategory !== 'ALL' || searchQuery) && (
        <div className="max-w-7xl mx-auto px-6 mt-6 flex flex-wrap gap-2">
          {selectedShop !== 'ALL' && (
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1 border border-amber-200">
              Shop Filter Active
            </span>
          )}
          {selectedCategory !== 'ALL' && (
            <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-full flex items-center gap-1">
              Category: {selectedCategory}
            </span>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 mt-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-4 border-[#C4A896] border-t-transparent rounded-full animate-spin mb-4" />
            <p>Loading inventory...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#E5DCD3] shadow-sm">
            <AlertTriangle className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No Dead Stock Found</h3>
            <p className="text-slate-500">Try adjusting your filters or checking back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Link href={`/broadcast/dead-stock/${product.id}`} key={product.id} className="group flex flex-col bg-white rounded-2xl border border-[#E5DCD3] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                
                {/* Discount Badge */}
                <div className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-rose-500 text-white text-[10px] font-black rounded-lg shadow-md tracking-wider">
                  {product.discount_percentage}% OFF
                </div>
                
                {/* Image Area */}
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.product_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                      <Store size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                     <span className="text-white text-xs font-semibold flex items-center gap-1">
                        View Details <ArrowDownAZ className="rotate-[-90deg]" size={14} />
                     </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <span className="text-[9px] tracking-widest uppercase text-slate-400 font-bold mb-1 block">
                    {product.category}
                  </span>
                  <h3 className="text-base font-bold text-[#3E3B36] line-clamp-2 leading-snug mb-3 group-hover:text-[#5C4033] transition-colors">
                    {product.product_name}
                  </h3>
                  
                  <div className="mt-auto">
                    <div className="flex items-end gap-2 mb-4">
                      <span className="text-xl font-black text-[#5C4033]">₹{parseFloat(product.clearance_price).toLocaleString()}</span>
                      <span className="text-xs text-slate-400 line-through mb-1">₹{parseFloat(product.original_price).toLocaleString()}</span>
                    </div>
                    
                    <div className="h-px bg-[#E5DCD3] mb-3" />
                    
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#FAF6F0] border border-[#E5DCD3] flex items-center justify-center shrink-0">
                        <MapPin size={10} className="text-[#5C4033]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#5C4033] truncate">{product.shop?.shop_name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{product.shop?.city}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function DeadStockPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#5C4033] border-t-transparent rounded-full animate-spin" /></div>}>
      <DeadStockDirectory />
    </Suspense>
  );
}
