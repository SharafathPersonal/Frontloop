'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { MapPin, Phone, MessageCircle, ChevronLeft, ChevronRight, AlertTriangle, Package, ArrowRight, ZoomIn, ExternalLink, Tag, Store } from 'lucide-react';

interface ShopJoin {
  id: string;
  shop_name: string;
  location_address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  contact_number: string | null;
  owner_phone: string;
  logo_url: string | null;
  google_maps_url: string | null;
}

interface DeadStockProduct {
  id: string;
  product_name: string;
  original_price: number;
  clearance_price: number;
  discount_percentage: number;
  category: string;
  images: string[];
  description: string;
  condition_notes: string;
  is_cleared: boolean;
  created_at: string;
  shop: ShopJoin;
}

interface RelatedProduct {
  id: string;
  product_name: string;
  original_price: number;
  clearance_price: number;
  discount_percentage: number;
  images: string[];
  category: string;
  is_cleared: boolean;
  shop: { shop_name: string; city: string | null };
}

export default function DeadStockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<DeadStockProduct | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ backgroundPosition: '0% 0%' });
  const mainImgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/dead-stock/${id}`);
        const data = await res.json();
        setProduct(data.product);
        setRelated(data.related || []);
      } catch (err) {
        console.error('Failed to load product', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainImgRef.current) return;
    const rect = mainImgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomStyle({ backgroundPosition: `${x}% ${y}%` });
  };

  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cardWidth = 220; // approximate width of item + gap
    const scrollAmount = direction === 'left' ? -cardWidth * 2 : cardWidth * 2;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-32 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-3">
                <div className="aspect-square bg-slate-100 rounded-2xl" />
                <div className="grid grid-cols-4 gap-2">
                  {[1,2,3,4].map(i => <div key={i} className="aspect-square bg-slate-100 rounded-xl" />)}
                </div>
              </div>
              <div className="space-y-4">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-6 bg-slate-100 rounded w-full" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center gap-4">
        <Package size={40} className="text-slate-300" />
        <p className="text-slate-500 font-semibold">Product not found or has been cleared.</p>
        <Link href="/broadcast/dead-stock" className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
          Browse All Listings
        </Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];
  const disc = product.discount_percentage || Math.round(((product.original_price - product.clearance_price) / product.original_price) * 100);
  const locationStr = [product.shop?.city, product.shop?.district, product.shop?.state].filter(Boolean).join(', ');
  // Prefer contact_number for WhatsApp; fall back to owner_phone
  const waPhone = (product.shop?.contact_number ?? product.shop?.owner_phone ?? '').replace(/\D/g, '');
  const waMessage = encodeURIComponent(`Hi ${product.shop?.shop_name}, I am interested in buying the Dead Stock item: ${product.product_name} listed on trueattendenly.online.`);
  const waUrl = `https://wa.me/${waPhone}?text=${waMessage}`;

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/broadcast/dead-stock" className="flex items-center gap-1 hover:text-slate-900 transition-colors font-medium">
            <ChevronLeft size={14} />Dead Stock Marketplace
          </Link>
          <span>/</span>
          <span className="text-slate-400">{product.category}</span>
          <span>/</span>
          <span className="text-slate-700 font-semibold truncate max-w-xs">{product.product_name}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* === LEFT: Image Gallery === */}
          <div className="space-y-3 lg:sticky lg:top-4">
            {/* Main Image with Zoom */}
            <div
              ref={mainImgRef}
              className="relative aspect-square bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden cursor-zoom-in select-none"
              onMouseEnter={() => images[activeImage] && setZoomActive(true)}
              onMouseLeave={() => setZoomActive(false)}
              onMouseMove={handleMouseMove}
            >
              {images[activeImage] ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={images[activeImage]}
                    alt={product.product_name}
                    className={`w-full h-full object-contain transition-opacity duration-200 ${zoomActive ? 'opacity-0' : 'opacity-100'}`}
                  />
                  {zoomActive && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${images[activeImage]})`,
                        backgroundSize: '250%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: zoomStyle.backgroundPosition,
                      }}
                    />
                  )}
                  <div className="absolute top-3 right-3 pointer-events-none">
                    <ZoomIn size={16} className="text-slate-400" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <Package size={48} className="text-slate-300" />
                  <span className="text-sm text-slate-400">No Image Available</span>
                </div>
              )}

              {/* Badges overlay */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-black tracking-[0.15em] uppercase shadow-lg border border-red-500">
                  <AlertTriangle size={11} className="text-white fill-white shrink-0" /> DEAD STOCK
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-black tracking-[0.15em] uppercase shadow-lg border border-amber-400">
                  CLEARANCE SALE
                </span>
              </div>
              <div className="absolute bottom-3 right-3">
                <span className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-black shadow-lg">{disc}% OFF</span>
              </div>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`relative shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${activeImage === idx ? 'border-slate-900 ring-2 ring-slate-900/20' : 'border-slate-200 hover:border-slate-400'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Product view ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* === RIGHT: Product Details === */}
          <div className="space-y-6">

            {/* Disclaimer Banner */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle size={15} className="text-red-600 shrink-0" />
              <span className="text-xs font-bold text-red-800 tracking-wide uppercase">EXPLICIT DEAD STOCK clearance sale — Final Sale, No Returns, No Exchanges</span>
            </div>

            {/* Category + Title */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={11} className="text-slate-400" />
                <span className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-semibold">{product.category}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{product.product_name}</h1>
            </div>

            {/* Price Block */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl font-black text-slate-900">₹{product.clearance_price.toLocaleString('en-IN')}</span>
                <span className="inline-block px-3 py-1 rounded-xl bg-rose-500 text-white text-sm font-black">{disc}% OFF</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Original Price:</span>
                <span className="text-base text-slate-500 line-through font-medium">₹{product.original_price.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  You save <span className="font-bold text-emerald-700">₹{(product.original_price - product.clearance_price).toLocaleString('en-IN')}</span> on this clearance item.
                </p>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Product Description</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Condition Notes */}
            {product.condition_notes && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1">
                <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Condition Notes</h3>
                <p className="text-sm text-blue-800">{product.condition_notes}</p>
              </div>
            )}

            {/* Merchant CTA Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Store size={18} className="text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-semibold mb-0.5">Sold By</p>
                  <p className="font-bold text-slate-900 text-base">{product.shop?.shop_name}</p>
                  {product.shop?.location_address && (
                    <p className="text-xs text-slate-500 mt-1">{product.shop.location_address}</p>
                  )}
                  {locationStr && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500">{locationStr}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* View Location */}
              {product.shop?.google_maps_url && (
                <a
                  href={product.shop.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink size={12} />
                  View Location on Google Maps
                </a>
              )}

              {/* WhatsApp CTA */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex items-center justify-center gap-2.5 w-full py-4 rounded-xl bg-[#25D366] text-white font-bold text-sm tracking-wide shadow-lg hover:bg-[#20BD5C] transition-all hover:shadow-xl hover:-translate-y-0.5 group overflow-hidden"
              >
                <span className="absolute inset-0 rounded-xl animate-ping bg-[#25D366]/30 group-hover:animate-none" />
                <MessageCircle size={18} className="relative z-10" />
                <span className="relative z-10">Contact Shop on WhatsApp</span>
              </a>
            </div>

            {/* Phone (if different from whatsapp) */}
            {waPhone && (
              <a
                href={`tel:${waPhone}`}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                <Phone size={13} />
                Call: {product.shop?.contact_number ?? product.shop?.owner_phone}
              </a>
            )}
          </div>
        </div>

        {/* Related Products Section */}
        {related.length > 0 && (
          <div className="mt-16 relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Other Hot Clearance Deals in this Shop</h2>
                <p className="text-sm text-slate-500 mt-1">Exclusive factory outlet liquidation offers</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollCarousel('left')}
                  className="p-2 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => scrollCarousel('right')}
                  className="p-2 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Carousel Container */}
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none scroll-smooth"
            >
              {related.map(rel => (
                <Link
                  key={rel.id}
                  href={`/broadcast/dead-stock/${rel.id}`}
                  className="group snap-start shrink-0 w-[200px]"
                >
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col h-full">
                    <div className="relative h-32 bg-slate-50 overflow-hidden">
                      {rel.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rel.images[0]}
                          alt={rel.product_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={24} className="text-slate-300" />
                        </div>
                      )}
                      
                      <div className="absolute top-1.5 left-1.5">
                        <span className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-black tracking-wider rounded uppercase">
                          DEAD STOCK
                        </span>
                      </div>

                      {rel.discount_percentage > 0 && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-lg shadow-sm">
                          {rel.discount_percentage}%
                        </span>
                      )}
                    </div>
                    <div className="p-3.5 flex flex-col flex-grow">
                      <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug mb-2 group-hover:text-amber-700 transition-colors flex-grow">
                        {rel.product_name}
                      </p>
                      <div className="flex items-baseline gap-1.5 mt-auto">
                        <span className="text-sm font-black text-slate-900">
                          ₹{rel.clearance_price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400 line-through">
                          ₹{rel.original_price.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 truncate mt-1">{rel.shop?.shop_name}</p>
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
