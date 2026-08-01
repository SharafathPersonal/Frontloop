'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Phone,
  MessageCircle,
  Share2,
  ExternalLink,
  Tag,
  Store,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default function DeadStockDetailPage({ params }: ProductPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/dead-stock/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Clearance item not found or has been sold.');
          } else {
            setError('Failed to load clearance item details.');
          }
          return;
        }
        const data = await res.json();
        setProduct(data.product);
        setRelated(data.related || []);
      } catch (err) {
        console.error('Fetch dead stock item error:', err);
        setError('An unexpected error occurred while fetching details.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.product_name || 'Dead Stock Clearance Deal',
          text: `Check out this clearance deal: ${product?.product_name} at ₹${product?.clearance_price}!`,
          url: window.location.href,
        });
      } catch (e) {
        console.log('Share canceled', e);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center items-center p-6">
        <Loader2 className="w-10 h-10 text-[#5C4033] animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-widest text-[#3E3B36] uppercase">
          Loading Clearance Deal...
        </p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-[#E5DCD3] max-w-md w-full text-center shadow-lg">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <AlertCircle className="w-7 h-7 text-amber-700" />
          </div>
          <h2 className="text-xl font-bold text-[#3E3B36] mb-2">Deal Unavailable</h2>
          <p className="text-xs text-slate-500 mb-6">{error || 'This product is no longer active.'}</p>
          <Link
            href="/broadcast/dead-stock"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#5C4033] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#3E3B36] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Clearance Directory
          </Link>
        </div>
      </div>
    );
  }

  const images: string[] = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : ['/images/placeholder-product.png'];

  const shop = product.shop || {};
  const shopPhone = shop.owner_phone || shop.contact_number || '';
  const formattedPhone = shopPhone.replace(/\D/g, '');
  const whatsappUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
        `Hi ${shop.shop_name || 'Store'}, I am interested in purchasing your clearance item: ${product.product_name} listed at ₹${product.clearance_price}. Is it still available?`
      )}`
    : null;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#3E3B36] font-sans pb-16">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#E5DCD3] px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/broadcast/dead-stock')}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5C4033] hover:text-[#3E3B36] transition-colors"
          >
            <ArrowLeft size={16} /> Directory
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#E5DCD3] text-[#3E3B36] border border-[#E5DCD3] rounded-xl text-xs font-semibold transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
              <span>{copied ? 'Copied Link!' : 'Share Deal'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-8 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-square w-full bg-white border border-[#E5DCD3] rounded-3xl overflow-hidden shadow-sm flex items-center justify-center">
              {images[activeImageIndex] ? (
                <Image
                  src={images[activeImageIndex]}
                  alt={product.product_name}
                  fill
                  className="object-contain p-4"
                  priority
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <Tag size={48} strokeWidth={1.2} />
                  <span className="text-xs mt-2">No Image Provided</span>
                </div>
              )}

              {/* Clearance Discount Badge */}
              {product.discount_percentage > 0 && (
                <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-md tracking-wider uppercase flex items-center gap-1">
                  <Zap size={14} className="fill-amber-300 stroke-amber-300" />
                  <span>{product.discount_percentage}% OFF</span>
                </div>
              )}

              {product.is_cleared && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                  <span className="bg-rose-600 text-white px-6 py-2 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl">
                    SOLD OUT / CLEARED
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Selector */}
            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-20 rounded-2xl border-2 overflow-hidden shrink-0 bg-white transition-all ${
                      activeImageIndex === idx ? 'border-[#5C4033] scale-95 shadow-md' : 'border-[#E5DCD3] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image src={img} alt={`Thumbnail ${idx}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Pricing & Purchase Call to Actions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E5DCD3] shadow-sm space-y-6">
              
              {/* Category & Status */}
              <div className="flex items-center justify-between text-xs">
                <span className="px-3 py-1 bg-[#FAF7F2] border border-[#E5DCD3] rounded-lg font-bold text-[#5C4033] tracking-wider uppercase">
                  {product.category || 'General Clearance'}
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck size={14} /> Verified Store Offer
                </span>
              </div>

              {/* Product Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3E3B36] tracking-tight leading-snug">
                {product.product_name}
              </h1>

              {/* Price Breakdown Matrix */}
              <div className="p-4 bg-[#FAF7F2] border border-[#E5DCD3] rounded-2xl flex items-baseline justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Clearance Deal Price</p>
                  <p className="text-3xl font-black text-[#5C4033] tracking-tight">
                    ₹{product.clearance_price?.toLocaleString('en-IN')}
                  </p>
                </div>
                {product.original_price && product.original_price > product.clearance_price && (
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Original Price</p>
                    <p className="text-sm font-semibold text-slate-400 line-through">
                      ₹{product.original_price?.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="text-xs font-bold text-[#3E3B36] uppercase tracking-wider mb-2">Item Description</h3>
                  <p className="text-xs text-slate-600 leading-relaxed bg-[#FAF7F2]/50 p-4 rounded-xl border border-slate-100">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Contact Merchant Action Buttons */}
              <div className="space-y-3 pt-2">
                {whatsappUrl && !product.is_cleared && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                  >
                    <MessageCircle size={18} className="fill-white/20" />
                    <span>Inquire via WhatsApp</span>
                  </a>
                )}

                {shopPhone && !product.is_cleared && (
                  <a
                    href={`tel:${shopPhone}`}
                    className="w-full py-3.5 bg-[#5C4033] hover:bg-[#3E3B36] text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Phone size={16} />
                    <span>Call Merchant Directly</span>
                  </a>
                )}
              </div>
            </div>

            {/* Merchant Identity Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5DCD3] shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 bg-[#FAF7F2] rounded-2xl border border-[#E5DCD3] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {shop.logo_url ? (
                    <Image src={shop.logo_url} alt={shop.shop_name} width={48} height={48} className="object-contain" />
                  ) : (
                    <Store className="w-6 h-6 text-[#5C4033]" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#3E3B36]">{shop.shop_name || 'Local Store Merchant'}</h4>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin size={12} className="text-[#5C4033]" />
                    {[shop.city, shop.state].filter(Boolean).join(', ') || 'Merchant Location'}
                  </p>
                </div>
              </div>

              {shop.location_address && (
                <p className="text-xs text-slate-600 font-medium">
                  {shop.location_address}
                </p>
              )}

              {shop.google_maps_url && (
                <a
                  href={shop.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5C4033] hover:underline uppercase tracking-wider"
                >
                  <ExternalLink size={14} /> Open Store Location in Google Maps
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Related Deals Section */}
        {related.length > 0 && (
          <div className="space-y-6 pt-8 border-t border-[#E5DCD3]">
            <h2 className="text-lg font-extrabold text-[#3E3B36] uppercase tracking-wider">
              More Clearance Deals from this Merchant & Category
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/broadcast/dead-stock/${item.id}`}
                  className="group bg-white rounded-3xl border border-[#E5DCD3] overflow-hidden hover:border-[#5C4033] transition-all hover:shadow-xl flex flex-col justify-between"
                >
                  <div className="relative aspect-square bg-[#FAF7F2] p-4 flex items-center justify-center">
                    {Array.isArray(item.images) && item.images[0] ? (
                      <Image
                        src={item.images[0]}
                        alt={item.product_name}
                        fill
                        className="object-contain p-2 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Tag className="w-12 h-12 text-slate-300" />
                    )}

                    {item.discount_percentage > 0 && (
                      <div className="absolute top-3 left-3 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl">
                        {item.discount_percentage}% OFF
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-sm text-[#3E3B36] group-hover:text-[#5C4033] transition-colors line-clamp-1">
                      {item.product_name}
                    </h3>
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-extrabold text-[#5C4033]">
                        ₹{item.clearance_price?.toLocaleString('en-IN')}
                      </span>
                      {item.original_price && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹{item.original_price?.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
