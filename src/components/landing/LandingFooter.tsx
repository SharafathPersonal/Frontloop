'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail } from 'lucide-react';
import { APP_VERSION } from '@/lib/config';

export function LandingFooter() {
  return (
    <footer className="bg-[#2D1E17] text-white pt-24 pb-12 font-outfit border-t border-[#5C4033]/40">
      <div className="max-w-7xl mx-auto px-6">
        {/* Final Call to Action */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
          <h2 className="serif-headline text-3xl sm:text-4xl font-light text-[#FAF6F0]">
            Elevate Your Checkout Flow and Boost Customer Retention.
          </h2>
          <p className="text-sm text-[#C4A896] leading-relaxed max-w-xl mx-auto">
            Start capturing walk-in customer leads, whitelisting contacts automatically, and dispatching premium marketing campaigns today.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap pt-4">
            <Link
              href="/auth/register"
              className="bg-[#C4A896] hover:bg-[#FAF6F0] hover:text-[#5C4033] text-[#FAF6F0] font-bold uppercase py-3 px-6 text-xs tracking-wider transition-all duration-300"
            >
              Create Free Workspace
            </Link>
            <Link
              href="/auth/login"
              className="border border-[#FAF6F0]/30 hover:border-white hover:bg-white/5 text-white font-bold uppercase py-3 px-6 text-xs tracking-wider transition-all duration-300"
            >
              Sign In →
            </Link>
          </div>
        </div>

        {/* Concierge support */}
        <div className="border-t border-[#5C4033]/30 pt-12 pb-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="text-left">
            <span className="bg-[#5C4033]/50 text-[#C4A896] border border-[#C4A896]/35 text-[9px] font-bold px-3 py-1 uppercase tracking-widest rounded-full mb-3 inline-block">
              Priority Concierge Support
            </span>
            <h3 className="serif-headline text-2xl text-white font-medium mb-3">24/7 Operations Coverage</h3>
            <p className="text-xs text-[#C4A896]/80 leading-relaxed">
              Have an urgent broadcast concern or custom template routing configuration query? Our founding operations team is available around the clock to keep your retail campaign channels active.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="mailto:trueattendly@gmail.com"
              className="flex items-center justify-center gap-2 py-4 bg-[#5C4033]/30 border border-[#5C4033]/60 hover:border-white transition-colors rounded-lg text-xs font-semibold tracking-wider uppercase text-white"
            >
              <Mail size={14} className="text-[#C4A896]" />
              trueattendly@gmail.com
            </a>
            <span className="flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-lg text-xs font-semibold tracking-wider uppercase border border-emerald-500">
              Counter Portal Support
            </span>
          </div>
        </div>

        {/* Metadata baseline */}
        <div className="border-t border-[#5C4033]/30 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 min-w-[32px] min-h-[32px]">
              <Image
                src="/images/logo-dark-v2.png"
                alt="True Attendly Logo"
                fill
                sizes="32px"
                className="object-contain bg-white p-1 rounded-lg transition-transform duration-200"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">True Attendly Broadcast · Retail Growth Suite</span>
          </div>

          <div className="text-center md:text-right text-[10px] text-[#C4A896]/60 space-y-1 font-mono">
            <p>Founder: Sharafath</p>
            <p>Head Office: Aykarapadi, Malappuram, Kerala, India</p>
            <p>Support Contact: trueattendly@gmail.com</p>
            <p className="text-slate-500 mt-1">Version Track: {APP_VERSION} · broadcast.trueattendly.online</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
