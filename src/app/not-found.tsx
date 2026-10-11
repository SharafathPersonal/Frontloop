import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="serif-headline text-4xl md:text-5xl font-light tracking-tight text-[#0F172A]">
          404 - ROUTE UNCHARTED
        </h1>
        <p className="text-[#64748B] text-sm md:text-base max-w-md mx-auto leading-relaxed">
          The resource or destination workspace you are trying to fetch does not exist or has moved permanently.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-[#0AAF76] text-white px-8 py-3 text-sm font-bold tracking-widest uppercase hover:bg-[#089163] transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
