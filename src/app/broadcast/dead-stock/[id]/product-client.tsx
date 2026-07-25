'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MapPin, MessageCircle, AlertTriangle, ArrowRight, Store, ShieldCheck, Navigation, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import BackButton from '@/components/ui/BackButton';

export function ProductClientView({ product, similarProducts }: { product: any, similarProducts: any[] }) {
  const [activeImage, setActiveImage] = useState(product.images?.[0] || '');
  const [lensPosition, setLensPosition] = useState({ x: 0, y: 0 });
  const [showLens, setShowLens] = useState(false);
  const [mainImgLoading, setMainImgLoading] = useState(true);

  const images = product.images && product.images.length > 0 ? product.images : ['/placeholder.png'];
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setLensPosition({ x, y });
  };

  const shopPhone = product.shop?.contact_number?.replace(/\D/g, '') || '';
  const messageTemplate = encodeURIComponent(`Hi ${product.shop?.shop_name}, I saw your clearance deal for "${product.product_name}" (₹${product.clearance_price}) on True Attendly Dead Stock Marketplace. Is it still available?`);
  const whatsappUrl = `https://wa.me/${shopPhone}?text=${messageTemplate}`;

  // Google Maps URL with location search fallback
  const mapsUrl = product.shop?.google_maps_url || 
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [product.shop?.shop_name, product.shop?.location_address, product.shop?.city, product.shop?.district, product.shop?.state]
        .filter(Boolean)
        .join(', ')
    )}`;

  // Location display string
  const locationString = [product.shop?.city, product.shop?.district].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-[#FAF6F0] font-outfit pb-24 pt-24">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Global Back Navigation */}
        <BackButton href="/broadcast/dead-stock" label="Back to Marketplace" />

        {/* Breadcrumb */}
        <div className="text-xs font-semibold text-slate-500 mb-6 flex items-center gap-2">
          <Link href="/broadcast/dead-stock" className="hover:text-[#5C4033]">Dead Stock</Link>
          <span>/</span>
          <span className="text-[#5C4033]">{product.category}</span>
          <span>/</span>
          <span className="truncate max-w-[200px]">{product.product_name}</span>
        </div>

        {/* DEAD STOCK Disclaimer Banner */}
        <div className="bg-[#1E1B18] text-amber-500 p-4 rounded-xl mb-8 flex items-start sm:items-center gap-4 shadow-lg border border-amber-900/50">
          <AlertTriangle size={24} className="shrink-0 animate-pulse" />
          <div>
            <h4 className="font-black text-sm tracking-widest uppercase">Factory Clearance / Dead Stock</h4>
            <p className="text-xs text-amber-500/80 mt-0.5">This item is heavily discounted to liquidate inventory. Final sale. Contact the merchant directly to secure this deal before it&apos;s gone.</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-[#E5DCD3] p-6 lg:p-10 flex flex-col lg:flex-row gap-12">
          
          {/* Gallery Area */}
          <div className="flex-1">
            <div className="flex flex-col-reverse sm:flex-row gap-4">
              
              {/* Thumbnails */}
              <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto sm:w-24 shrink-0 no-scrollbar">
                {images.map((img: string, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => { setActiveImage(img); setMainImgLoading(true); }}
                    className={`relative w-20 h-20 sm:w-full sm:h-24 rounded-lg overflow-hidden border-2 transition-all ${activeImage === img ? 'border-[#5C4033] shadow-md' : 'border-transparent hover:border-[#E5DCD3]'}`}
                  >
                    {img !== '/placeholder.png' ? (
                       <Image 
                         src={img} 
                         alt={`Thumbnail ${idx + 1}`} 
                         fill 
                         sizes="(max-width: 640px) 80px, 96px"
                         className="object-cover" 
                       />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300"><Store size={24} /></div>
                    )}
                  </button>
                ))}
              </div>

              {/* Main Image with Zoom Lens */}
              <div className="flex-1 relative aspect-square sm:aspect-auto sm:h-[500px] rounded-2xl bg-slate-100 overflow-hidden border border-[#E5DCD3]">
                {/* Discount Badge */}
                <div className="absolute top-4 right-4 z-10 px-4 py-2 bg-rose-500 text-white text-sm font-black rounded-xl shadow-lg tracking-wider">
                  {product.discount_percentage}% OFF
                </div>

                <div 
                  className="w-full h-full relative cursor-crosshair group"
                  onMouseMove={handleMouseMove}
                  onMouseEnter={() => setShowLens(true)}
                  onMouseLeave={() => setShowLens(false)}
                >
                   {activeImage !== '/placeholder.png' ? (
                     <>
                       {/* Blurred Skeleton Placeholder */}
                       {mainImgLoading && (
                         <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
                           <Store size={48} className="text-slate-300 animate-bounce" />
                         </div>
                       )}
                       <Image 
                         src={activeImage} 
                         alt={product.product_name} 
                         fill 
                         priority
                         sizes="(max-width: 1024px) 100vw, 50vw"
                         onLoad={() => setMainImgLoading(false)}
                         className={`object-contain transition-opacity duration-300 ${mainImgLoading ? 'opacity-0' : 'opacity-100'}`} 
                       />
                     </>
                   ) : (
                       <div className="w-full h-full flex items-center justify-center text-slate-300"><Store size={64} /></div>
                   )}
                  
                  {/* Zoom Lens Overlay */}
                  {showLens && activeImage !== '/placeholder.png' && (
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
                      style={{
                        backgroundImage: `url(${activeImage})`,
                        backgroundPosition: `${lensPosition.x}% ${lensPosition.y}%`,
                        backgroundSize: '250%',
                        backgroundRepeat: 'no-repeat'
                      }}
                    />
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Product Details Area */}
          <div className="flex-1 flex flex-col">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#C4A896] mb-2">{product.category}</span>
            <h1 className="text-3xl lg:text-4xl font-bold text-[#2D1E17] leading-tight mb-4">
              {product.product_name}
            </h1>

            <div className="flex items-end gap-4 mb-6">
              <span className="text-5xl font-black text-[#5C4033]">₹{parseFloat(product.clearance_price).toLocaleString()}</span>
              <div className="flex flex-col mb-1">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Original</span>
                <span className="text-lg text-slate-400 line-through">₹{parseFloat(product.original_price).toLocaleString()}</span>
              </div>
            </div>

            <div className="h-px bg-[#E5DCD3] mb-6" />

            {/* Merchant Identity & Store Directions CTA Block */}
            <div className="bg-[#FAF6F0] rounded-2xl p-5 border border-[#E5DCD3] mb-8 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Location Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#5C4033]/10 border border-[#5C4033]/20 rounded-full mb-3">
                    <MapPin size={12} className="text-[#5C4033]" />
                    <span className="text-[11px] font-bold tracking-wider text-[#5C4033] uppercase">
                      {locationString || 'Local Merchant'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#5C4033] mb-1">{product.shop?.shop_name}</h3>
                  {product.shop?.location_address && (
                    <p className="text-xs text-slate-600 mb-3">{product.shop.location_address}</p>
                  )}

                  {/* PROMINENT "GET DIRECTIONS TO STORE" CTA */}
                  <a 
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[#5C4033] hover:bg-[#3E3B36] text-[#FAF6F0] text-xs font-bold tracking-wider uppercase transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <Navigation size={15} className="text-amber-400" />
                    Get Directions to Store
                    <ExternalLink size={13} className="opacity-70 ml-1" />
                  </a>
                </div>
                
                <div className="w-12 h-12 rounded-full bg-white border border-[#E5DCD3] shadow-sm flex items-center justify-center shrink-0 ml-4">
                   <Store size={20} className="text-[#C4A896]" />
                </div>
              </div>
            </div>

            <div className="space-y-6 mb-8 flex-1">
              {product.description && (
                <div>
                  <h4 className="text-sm font-bold text-[#2D1E17] uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
                </div>
              )}
              {product.condition_notes && (
                <div>
                  <h4 className="text-sm font-bold text-[#2D1E17] uppercase tracking-wider mb-2">Condition Notes</h4>
                  <p className="text-sm text-slate-600 leading-relaxed bg-amber-50 p-3 rounded-lg border border-amber-100 italic">{product.condition_notes}</p>
                </div>
              )}
            </div>

            {/* Primary CTA */}
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group block w-full"
            >
              <div className="absolute inset-0 bg-[#25D366] rounded-xl blur opacity-40 group-hover:opacity-70 group-hover:scale-105 transition-all duration-300 animate-pulse" />
              <div className="relative flex items-center justify-center gap-3 w-full py-5 bg-[#25D366] text-white rounded-xl font-bold text-lg tracking-wide shadow-[0_10px_20px_rgba(37,211,102,0.3)] hover:bg-[#20b958] transition-colors">
                <MessageCircle size={24} />
                Contact Shop on WhatsApp
              </div>
            </a>
            <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <ShieldCheck size={14} /> Zero Platform Fees · Direct Deal
            </div>
          </div>
        </div>

        {/* Similar Products Carousel */}
        {similarProducts.length > 0 && (
          <div className="mt-20">
            <h3 className="text-2xl font-bold text-[#5C4033] mb-8 flex items-center gap-3">
              <Store className="text-[#C4A896]" /> Other Hot Clearance Deals in this Shop
            </h3>
            <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar snap-x">
              {similarProducts.map(sp => (
                <Link href={`/broadcast/dead-stock/${sp.id}`} key={sp.id} className="min-w-[280px] w-[280px] snap-start group flex flex-col bg-white rounded-2xl border border-[#E5DCD3] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                  <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-rose-500 text-white text-[10px] font-black rounded-lg shadow-md">
                    {sp.discount_percentage}% OFF
                  </div>
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    {sp.images && sp.images.length > 0 ? (
                      <Image 
                        src={sp.images[0]} 
                        alt={sp.product_name} 
                        fill
                        sizes="280px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-300"><Store size={32} /></div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <span className="text-[9px] tracking-widest uppercase text-slate-400 font-bold mb-1 block">{sp.category}</span>
                    <h4 className="text-sm font-bold text-[#3E3B36] line-clamp-2 leading-snug mb-3 group-hover:text-[#5C4033]">{sp.product_name}</h4>
                    <div className="mt-auto flex items-end gap-2">
                      <span className="text-lg font-black text-[#5C4033]">₹{parseFloat(sp.clearance_price).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 line-through mb-0.5">₹{parseFloat(sp.original_price).toLocaleString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
