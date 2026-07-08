import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#3E3B36] flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="serif-headline text-4xl md:text-5xl font-light tracking-tight text-[#2C2A26]">
          404 - ROUTE UNCHARTED
        </h1>
        <p className="text-[#8B8378] text-sm md:text-base max-w-md mx-auto leading-relaxed">
          The resource or destination workspace you are trying to fetch does not exist or has moved permanently.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-sm bg-[#3E3B36] text-[#F5F1EA] px-8 py-3 text-sm font-semibold tracking-widest uppercase hover:bg-black transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
