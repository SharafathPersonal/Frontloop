'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LandingHeaderProps {
  headerRef: React.RefObject<HTMLElement | null>;
  isScrolled: boolean;
}

export function LandingHeader({ headerRef, isScrolled }: LandingHeaderProps) {
  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 z-50 h-20 transition-all duration-300 font-outfit"
      style={{ background: 'transparent' }}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image
              src={isScrolled ? "/images/logo-dark.png" : "/images/logo-light.png"}
              alt="True Attendly Broadcast Logo"
              fill
              sizes="32px"
              className="object-contain transition-all duration-300"
              priority
            />
          </div>
          <span className="brand-text serif-headline text-white text-lg font-bold transition-colors duration-300">
            True Attendly
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#trinity-matrix" className="nav-link-light text-xs font-semibold tracking-widest text-white/80 hover:text-white uppercase transition-colors duration-200">
            Features
          </a>
          <a href="#ledger" className="nav-link-light text-xs font-semibold tracking-widest text-white/80 hover:text-white uppercase transition-colors duration-200">
            Ledger
          </a>
          <a href="#technical-matrix" className="nav-link-light text-xs font-semibold tracking-widest text-white/80 hover:text-white uppercase transition-colors duration-200">
            System Tech
          </a>
          <a href="#comparison" className="nav-link-light text-xs font-semibold tracking-widest text-white/80 hover:text-white uppercase transition-colors duration-200">
            Reality Check
          </a>
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="signin-link text-xs font-semibold tracking-widest text-white/80 hover:text-white uppercase transition-colors duration-200"
          >
            Sign In →
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex bg-[#FAF6F0] hover:bg-[#E5DCD3] text-[#5C4033] font-bold text-xs tracking-wider uppercase px-4 py-2.5 rounded shadow transition-colors"
          >
            Create Free Workspace
          </Link>
        </div>
      </div>
    </header>
  );
}
