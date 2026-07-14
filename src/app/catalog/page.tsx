'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicOffersPage from '../offers/[shopSlug]/page';

function CatalogContent() {
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get('shop') || searchParams.get('slug') || '';
  
  if (!shopSlug) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF6F0] p-6 text-center font-outfit">
        <h1 className="serif-headline text-2xl text-[#5C4033] mb-4">No Shop Specified</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          Please specify a shop slug in the URL query parameter (e.g., ?shop=my-shop) to view the verified merchant catalog.
        </p>
      </div>
    );
  }

  const resolvedParams = Promise.resolve({ shopSlug });

  return <PublicOffersPage params={resolvedParams} />;
}

export default function CatalogPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#FAF6F0]">
        <div className="text-sm text-[#5C4033] font-serif animate-pulse">Loading Catalog...</div>
      </div>
    }>
      <CatalogContent />
    </Suspense>
  );
}
