'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { APP_VERSION } from '@/lib/config';
import { Phone, MessageCircle } from 'lucide-react';

// ──────────────────────────────────────────────────────────────────
// LANDING PAGE — True Attendly Broadcast
// Premium Editorial B2B SaaS Marketing Page
// ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let lenis: import('lenis').default | null = null;
    let gsapModule: typeof import('gsap') | null = null;

    async function initAnimations() {
      // Dynamic imports for client-only libs
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);

      gsap.registerPlugin(ScrollTrigger);
      gsapModule = { gsap } as typeof import('gsap');

      // ── Lenis Smooth Scroll ────────────────────────────────────
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        lenis = new Lenis({ lerp: 0.08, smoothWheel: true });

        lenis.on('scroll', ScrollTrigger.update);

        gsap.ticker.add((time) => lenis?.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }

      // ── Header scroll state ────────────────────────────────────
      const header = headerRef.current;
      if (header) {
        ScrollTrigger.create({
          start: 40,
          onEnter: () => header.classList.add('header-scrolled'),
          onLeaveBack: () => header.classList.remove('header-scrolled'),
        });
      }

      // ── Hero entrance animation ────────────────────────────────
      if (heroRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const heroEls = heroRef.current.querySelectorAll('.gsap-reveal');
        gsap.fromTo(
          heroEls,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.12,
            ease: 'power3.out',
            delay: 0.1,
          }
        );
      } else if (heroRef.current) {
        heroRef.current.querySelectorAll('.gsap-reveal').forEach((el) => {
          (el as HTMLElement).style.opacity = '1';
          (el as HTMLElement).style.transform = 'none';
        });
      }

      // ── Section scroll reveals ─────────────────────────────────
      const sections = document.querySelectorAll('.scroll-reveal-section');
      sections.forEach((section) => {
        const els = section.querySelectorAll('.gsap-reveal');
        if (els.length === 0) return;

        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          ScrollTrigger.create({
            trigger: section,
            start: 'top 85%',
            once: true,
            onEnter: () => {
              gsap.fromTo(
                els,
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
              );
            },
          });
        } else {
          els.forEach((el) => {
            (el as HTMLElement).style.opacity = '1';
            (el as HTMLElement).style.transform = 'none';
          });
        }
      });
    }

    initAnimations();

    return () => {
      lenis?.destroy();
    };
  }, []);

  return (
    <>
      {/* ── Injected header scroll styles ─────────────────────── */}
      <style jsx global>{`
        .header-scrolled {
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(12px) !important;
          box-shadow: 0 1px 0 #E8E3DA !important;
        }
        .header-scrolled .nav-link-light {
          color: #8B8378 !important;
        }
        .header-scrolled .nav-link-light:hover {
          color: #C4A896 !important;
        }
        .header-scrolled .brand-text {
          color: #3E3B36 !important;
        }
        .header-scrolled .signin-link {
          color: #3E3B36 !important;
        }
        .header-scrolled .signin-link:hover {
          color: #C4A896 !important;
        }
        .header-scrolled .logo-light {
          opacity: 0 !important;
        }
        .header-scrolled .logo-dark {
          opacity: 1 !important;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1 — FIXED HEADER
      ══════════════════════════════════════════════════════════ */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 h-20 transition-all duration-300"
        style={{ background: 'transparent' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="relative w-10 h-10 flex-shrink-0">
              <Image 
                src="/images/logo-light.png"
                alt="Attendly"
                fill
                sizes="40px"
                className="object-contain logo-light transition-opacity duration-300" 
              />
              <Image 
                src="/images/logo-dark.png"
                alt="Attendly"
                fill
                sizes="40px"
                className="object-contain logo-dark opacity-0 transition-opacity duration-300 absolute inset-0" 
              />
            </div>
            <span className="brand-text serif-headline text-white text-base transition-colors duration-300">
              Attendly Broadcast
            </span>
          </Link>

          {/* Center Nav (desktop only) */}
          <nav className="hidden md:flex items-center gap-8">
            {['About', 'Services', 'Contact'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="nav-link-light text-xs tracking-[0.2em] text-white/80 hover:text-white uppercase transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Sign In */}
          <Link
            href="/auth/login"
            className="signin-link text-xs tracking-[0.2em] text-white/80 hover:text-white uppercase transition-colors duration-200"
          >
            Sign In
          </Link>

        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2 — HERO (Dark Full-Bleed)
      ══════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[92vh] flex items-center overflow-hidden"
        style={{ backgroundColor: '#3E3B36' }}
      >
        {/* Ambient glow layers */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 70% 20%, rgba(139, 123, 168, 0.30) 0%, transparent 70%),
              radial-gradient(ellipse 60% 50% at 10% 80%, rgba(196, 168, 150, 0.30) 0%, transparent 70%)
            `,
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* ── Left Column ──────────────────────────────────── */}
            <div className="space-y-7">

              <div className="gsap-reveal">
                <span
                  className="text-xs tracking-[0.2em] uppercase font-medium"
                  style={{ color: '#C4A896' }}
                >
                  Attendly Broadcast
                </span>
              </div>

              <div className="gsap-reveal">
                <h1
                  className="serif-headline text-4xl sm:text-5xl lg:text-[52px] text-white leading-[1.1]"
                >
                  The Editorial WhatsApp Marketing Platform for High-Retention Retail.
                </h1>
              </div>

              <div className="gsap-reveal">
                <p
                  className="text-base max-w-lg leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                >
                  Transform passive buyers into lifetime patrons. Launch high-converting story updates,
                  broadcast dynamic offers, and manage credit-driven pipelines with sub-second global execution.
                </p>
              </div>

              {/* CTA Row */}
              <div className="gsap-reveal flex items-center gap-4 flex-wrap pb-4">
                <Link href="/auth/register" className="btn-primary rounded-sm">
                  Start Broadcasting
                </Link>
                <a href="#services" className="btn-secondary-dark rounded-sm">
                  See How It Works
                </a>
              </div>

              {/* USP Bullets */}
              <div className="gsap-reveal space-y-2.5">
                {[
                  'Zero monthly subscriptions — pay only per message sent',
                  'Real-time credit deduction with wallet transparency',
                  'CSV-based contact management for instant list loading',
                  'Anti-spam throttle engine protects your sender numbers',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#C4A896' }}
                    />
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                    >
                      {point}
                    </p>
                  </div>
                ))}
              </div>

              {/* Advanced Tech Tags */}
              <div className="gsap-reveal flex flex-col gap-2 pt-4 mt-2 border-t border-white/10">
                <p className="tracking-[0.2em] text-xs text-[#8B8378] uppercase font-medium">Multi-Tier AI Engine Failover Protection (Gemini/Groq Powered)</p>
                <p className="tracking-[0.2em] text-xs text-[#8B8378] uppercase font-medium">Real-Time Local Connection Packet Intercept Guard</p>
              </div>

            </div>

            {/* ── Right Column — Logo Mockup Card (desktop only) ── */}
            <div className="hidden lg:flex items-center justify-center gsap-reveal">
              <div
                className="w-48 h-48 rounded-2xl flex flex-col items-center justify-center gap-5"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  className="relative w-28 h-28 rounded-xl flex items-center justify-center p-4"
                  style={{ background: 'rgba(255,255,255,0.10)' }}
                >
                  <Image src="/images/logo-light.png" alt="Attendly Logo" fill sizes="112px" className="object-contain p-4" />
                </div>
                <p
                  className="text-[10px] tracking-[0.25em] uppercase"
                  style={{ color: 'rgba(255,255,255,0.50)' }}
                >
                  Attendly Broadcast
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3 — FEATURES GRID (Light Cream)
      ══════════════════════════════════════════════════════════ */}
      <section
        id="about"
        className="py-24 scroll-reveal-section"
        style={{ backgroundColor: '#F5F1EA' }}
      >
        <div className="max-w-6xl mx-auto px-6">

          <div className="max-w-2xl mb-16 gsap-reveal">
            <p
              className="text-xs tracking-[0.25em] uppercase mb-4"
              style={{ color: '#C4A896' }}
            >
              Platform
            </p>
            <h2
              className="serif-headline text-3xl sm:text-4xl mb-4"
              style={{ color: '#3E3B36' }}
            >
              Reengineered to Drive Foot Traffic.
            </h2>
            <p style={{ color: '#8B8378' }} className="text-base leading-relaxed">
              Every feature built with one purpose: converting your contact list into a reliable revenue stream.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: '◆',
                title: 'AI-Powered Message Polisher',
                desc: 'Draft raw offers in any tone and let our multi-tier failover AI (Gemini/Groq) refine it into premium marketing copy instantly. Automatically injects Meta standard tokens ({{1}} and {{2}}) for flawless conversion and compliance.',
              },
              {
                icon: '◎',
                title: 'Throttled Dispatches',
                desc: 'Safeguard your retail phone lines. Built-in dynamic timing delays protect sender numbers from network spam flags.',
              },
              {
                icon: '◈',
                title: 'Pay-As-You-Send Ledger',
                desc: 'Zero subscription locks. Purchase pre-paid credits seamlessly; exactly 1 credit is deducted per successful text dispatch.',
              },
              {
                icon: '◉',
                title: 'Unified CSV & Excel Parser',
                desc: 'Ingest massive retail contact lists using our high-speed spreadsheet parser. Supports both CSV and raw .xlsx Excel manifests with automatic 10-digit phone regex masking and serverless-safe duplicate upsert filtering.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="gsap-reveal group bg-white rounded-xl p-6 border transition-colors duration-300"
                style={{ borderColor: '#E8E3DA' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(196,168,150,0.6)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E8E3DA')}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 text-lg transition-colors duration-300"
                  style={{ backgroundColor: 'rgba(232,227,218,0.6)', color: '#8B8378' }}
                >
                  {card.icon}
                </div>
                <h3
                  className="lexend-subheading text-sm font-medium mb-3"
                  style={{ color: '#3E3B36' }}
                >
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8B8378' }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4 — SERVICES & CONFIGURATIONS
      ══════════════════════════════════════════════════════════ */}
      <section
        id="services"
        className="py-24 scroll-reveal-section"
        style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E8E3DA', borderBottom: '1px solid #E8E3DA' }}
      >
        <div className="max-w-6xl mx-auto px-6">

          {/* Header row */}
          <div className="flex items-end justify-between mb-14 gsap-reveal">
            <div>
              <p
                className="text-xs tracking-[0.25em] uppercase mb-3"
                style={{ color: '#C4A896' }}
              >
                Services
              </p>
              <h2
                className="serif-headline text-3xl sm:text-4xl"
                style={{ color: '#3E3B36' }}
              >
                Everything You Need<br />to Broadcast at Scale.
              </h2>
            </div>
            <a
              href="#contact"
              className="hidden sm:flex items-center gap-1.5 text-xs tracking-[0.2em] uppercase transition-colors duration-200"
              style={{ color: '#8B8378' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#C4A896')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8B8378')}
            >
              Request a Demo →
            </a>
          </div>

          {/* 2×2 service grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-[#E8E3DA] rounded-xl overflow-hidden">
            {[
              {
                label: '01',
                title: 'Campaign Management',
                desc: 'Create, schedule, and monitor WhatsApp broadcast campaigns with a full editorial workspace. Draft messages, attach media, and track delivery in real time.',
              },
              {
                label: '02',
                title: 'Contact Intelligence',
                desc: 'Drop in massive retail manifests directly using our high-speed .csv and .xlsx Excel engine. The platform automatically applies 10-digit regex validation and executes duplicate-safe upsert pipelines instantly.',
              },
              {
                label: '03',
                title: 'Credit Economy',
                desc: 'Purchase credits in flexible bundles. One credit per message ensures full cost transparency with zero hidden fees or subscription surprises.',
              },
              {
                label: '04',
                title: 'Delivery Analytics',
                desc: 'Audit every campaign dispatch with a full delivery ledger. Track status transitions from pending to completed, with timestamped logs.',
              },
              {
                label: '05',
                title: 'Advanced Database Terminal',
                desc: 'Segment your retail buyers instantly with our high-performance infinite scroll architecture. Filter by saved customer tags (VIP, Regular, New) using PostgreSQL array rules, search via omni-search, and clear registries in a single transactional stroke.',
              },
              {
                label: '06',
                title: 'Dynamic Pricing & Autonomous Ledger',
                desc: 'Enjoy an entirely synchronized pricing grid mapped straight from our master administrative engine. Package tiers (50, 100, 200, or 500 Credits) refresh dynamically via Cashfree Payment Gateway checkout routines with success-only row-by-row deductions.',
              },
            ].map((service, i) => (
              <div
                key={service.title}
                className="gsap-reveal p-8 transition-colors duration-200 cursor-default"
                style={{
                  borderRight: i % 2 === 0 ? '1px solid #E8E3DA' : 'none',
                  borderBottom: i < 2 ? '1px solid #E8E3DA' : 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(245,241,234,0.5)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
              >
                <p
                  className="text-[10px] tracking-[0.25em] uppercase mb-5"
                  style={{ color: '#C4A896' }}
                >
                  {service.label}
                </p>
                <h3
                  className="lexend-subheading text-base font-medium mb-3"
                  style={{ color: '#3E3B36' }}
                >
                  {service.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8B8378' }}>
                  {service.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4.5 — INFRASTRUCTURE SAFETY
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-[#F5F1EA] border-y border-[#E8E3DA] py-16 scroll-reveal-section">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12 gsap-reveal">
            <p className="uppercase tracking-[0.25em] text-[#8B8378] text-xs mb-3 font-medium">INFRASTRUCTURE</p>
            <h2 className="serif-headline text-xl text-[#3E3B36]">Hardened against failures. Built for high volumes.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 gsap-reveal">
            <div>
              <h3 className="lexend-subheading text-sm font-medium mb-3 text-[#3E3B36]">Idempotency Conflict Security</h3>
              <p className="text-sm leading-relaxed text-[#8B8378]">Our API blocks multi-click accidental duplicate dispatches within a 5-minute threshold using cryptographic safety tokens, ensuring your wallet is never double-charged for the same payload.</p>
            </div>
            <div>
              <h3 className="lexend-subheading text-sm font-medium mb-3 text-[#3E3B36]">Zero-CLS Structural Skeletons</h3>
              <p className="text-sm leading-relaxed text-[#8B8378]">We guarantee absolute visual stability. From native route skeleton barriers to client-side React Error Boundaries (error.tsx) and real-time offline network listeners, every core operation is safeguarded.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 5 — BOTTOM CTA (Dark)
      ══════════════════════════════════════════════════════════ */}
      <section
        id="contact"
        className="py-28 scroll-reveal-section"
        style={{ backgroundColor: '#3E3B36' }}
      >
        <div className="max-w-lg mx-auto px-6 text-center space-y-7">

          <div className="gsap-reveal">
            <p
              className="text-xs tracking-[0.25em] uppercase mb-5"
              style={{ color: '#C4A896' }}
            >
              Get Started Today
            </p>
            <h2
              className="serif-headline text-3xl sm:text-4xl text-white leading-tight"
            >
              Your Customers Are Waiting for Your Next Message.
            </h2>
          </div>

          <div className="gsap-reveal">
            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
              Join retail brands using Attendly Broadcast to stay connected, drive repeat purchases,
              and build loyal communities — one WhatsApp message at a time.
            </p>
          </div>

          <div className="gsap-reveal flex items-center justify-center gap-4 flex-wrap pt-2">
            <Link href="/auth/register" className="btn-primary rounded-sm">
              Create Free Workspace
            </Link>
            <Link href="/auth/login" className="btn-secondary-dark rounded-sm">
              Sign In →
            </Link>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 5.5 — OWNER CONTACT & SUPPORT
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-[#F5F1EA] py-12 scroll-reveal-section border-t border-[#E8E3DA]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row gsap-reveal">
            
            <div className="p-10 md:w-1/2 flex flex-col justify-center border-b md:border-b-0 md:border-r border-[#E8E3DA]">
              <p className="uppercase tracking-[0.2em] text-[10px] text-[#C4A896] font-bold mb-3">Priority Access</p>
              <h2 className="serif-headline text-3xl text-[#3E3B36] mb-4">24/7 Concierge Support.</h2>
              <p className="text-sm leading-relaxed text-[#8B8378] mb-6">
                Have an urgent dispatch issue or billing question? Our founding team is available around the clock to keep your retail pipelines running smoothly.
              </p>
              <div className="text-xs text-[#3E3B36] space-y-1.5 font-medium border-t border-[#E8E3DA] pt-4">
                <p>Founder: <span className="font-semibold text-[#C4A896]">Sharafath</span></p>
                <p>Head Office: Aykarapadi, Malappuram, Kerala, India</p>
              </div>
            </div>

            <div className="p-10 md:w-1/2 bg-[#FCFCFC] flex flex-col justify-center space-y-4">
              <a 
                href="tel:+916282560928" 
                className="flex items-center justify-center gap-2 w-full py-5 border border-[#3E3B36] text-[#3E3B36] hover:bg-[#3E3B36] hover:text-[#FFFFFF] transition-colors rounded-lg text-xs font-semibold tracking-[0.15em] uppercase"
              >
                <Phone size={16} />
                DIRECT VOICE LINE
              </a>
              <a 
                href="https://wa.me/916282560928?text=Hello%20Sharafath,%20I%20am%20interested%20in%20Attendly%20Broadcast." 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center gap-2 w-full py-5 bg-[#25D366] hover:bg-[#1DA851] text-white transition-colors rounded-lg text-xs font-semibold tracking-[0.15em] uppercase"
              >
                <MessageCircle size={16} />
                WHATSAPP DISPATCH HELP
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 6 — FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer
        className="py-12"
        style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E8E3DA' }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

            {/* Logo */}
            <div className="flex items-center gap-2">
              <div
                className="relative w-8 h-8 rounded-sm flex items-center justify-center"
              >
                <Image src="/images/logo-dark.png" alt="Attendly Logo" fill sizes="32px" className="object-contain" />
              </div>
            </div>

            {/* Center */}
            <p
              className="text-[10px] tracking-[0.25em] uppercase"
              style={{ color: '#8B8378' }}
            >
              True Attendly Broadcast · broadcast.trueattendly.online
            </p>

            {/* Right Side container */}
            <div className="flex items-center gap-6">
              {/* Nav Links */}
              <div className="hidden md:flex items-center gap-6">
                {['About', 'Services', 'Contact', 'Sign In'].map((item) => (
                  <a
                    key={item}
                    href={item === 'Sign In' ? '/auth/login' : `#${item.toLowerCase()}`}
                    className="text-[10px] tracking-[0.15em] uppercase transition-colors duration-200"
                    style={{ color: '#8B8378' }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#C4A896')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#8B8378')}
                  >
                    {item}
                  </a>
                ))}
              </div>
              
              {/* Version Badge */}
              <div className="border border-[#E8E3DA] bg-transparent py-1 px-3 rounded-md">
                <span className="text-[10px] tracking-[0.15em] text-[#C4A896] font-mono">
                  {APP_VERSION}
                </span>
              </div>
            </div>

          </div>
        </div>
      </footer>
    </>
  );
}
