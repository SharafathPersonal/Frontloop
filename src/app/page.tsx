'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { APP_VERSION } from '@/lib/config';
import { Phone, MessageCircle, XCircle, CheckCircle, ArrowRight, Mail, Smartphone, ShieldCheck, Bot, Contact } from 'lucide-react';

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
              radial-gradient(ellipse 80% 60% at 70% 20%, rgba(196, 168, 150, 0.15) 0%, transparent 70%),
              radial-gradient(ellipse 60% 50% at 10% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 70%)
            `,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* ── Left Column ──────────────────────────────────── */}
            <div className="space-y-8 z-10">

              <div className="gsap-reveal">
                <span className="text-xs tracking-[0.2em] uppercase font-bold px-3 py-1.5 rounded-full border border-[#C4A896]/20" style={{ color: '#C4A896', backgroundColor: 'rgba(196,168,150,0.1)' }}>
                  Version {APP_VERSION} Live
                </span>
              </div>

              <div className="gsap-reveal">
                <h1 className="serif-headline text-4xl sm:text-5xl lg:text-[52px] text-white leading-[1.1] tracking-tight">
                  The Omnichannel AI Marketing Platform for High-Retention Retail.
                </h1>
              </div>

              <div className="gsap-reveal">
                <p className="text-base max-w-xl leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Stop losing customers to dead channels. Launch official Meta WhatsApp updates, trigger zero-risk in-store QR lead pipelines, save bulk contacts via automated vCard sync, and run premium AI email campaigns—all from one unified ledger.
                </p>
              </div>

              {/* The 4-Feature Hub Display */}
              <div className="gsap-reveal grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-xl flex items-start gap-3 transition-colors border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <ShieldCheck style={{ color: '#C4A896' }} className="mt-1 shrink-0" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Official Meta API Mode</h3>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>0% Ban Risk. Verified Broadcasts to GST Brands.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl flex items-start gap-3 transition-colors border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <Smartphone style={{ color: '#C4A896' }} className="mt-1 shrink-0" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">In-Store QR Engine</h3>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>Instant walk-in lead capture via Scan & Join mechanics.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl flex items-start gap-3 transition-colors border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <Bot style={{ color: '#C4A896' }} className="mt-1 shrink-0" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">AI Template Polisher</h3>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>Automated compliance formatting & unique spintax variations.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl flex items-start gap-3 transition-colors border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <Mail style={{ color: '#C4A896' }} className="mt-1 shrink-0" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Premium AI Email Suite</h3>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>Powered by Resend with luxury responsive layouts.</p>
                  </div>
                </div>
              </div>

              <div className="gsap-reveal flex items-center gap-4 flex-wrap pt-4">
                <Link href="/auth/register" className="btn-primary rounded-sm shadow-lg border border-[#C4A896]/30">
                  Create Free Workspace
                </Link>
                <a href="#solutions" className="btn-secondary-dark rounded-sm">
                  Explore Architecture
                </a>
              </div>

            </div>

            {/* ── Right Column — Dual Mockup Grid ── */}
            <div className="hidden lg:block gsap-reveal relative w-full h-[540px] perspective-1000">
              
              {/* Left Mockup: Meta API Dashboard & Email Editor */}
              <div className="absolute left-0 top-12 w-[340px] bg-[#F5F1EA] rounded-2xl shadow-2xl border-[4px] border-[#E8E3DA] overflow-hidden transform -rotate-y-6 rotate-z-2 translate-x-4 z-10 flex flex-col">
                <div className="bg-white px-4 py-3 border-b border-[#E8E3DA] flex justify-between items-center">
                  <span className="text-xs font-bold text-[#3E3B36]">Campaign Dashboard</span>
                  <span className="bg-emerald-100 text-emerald-700 text-[9px] uppercase px-2 py-1 rounded font-bold">Meta API</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white border border-[#E8E3DA] p-3 rounded-lg text-center shadow-sm">
                      <p className="text-[10px] text-[#8B8378] font-bold uppercase tracking-wider mb-1">Sent</p>
                      <p className="text-xl font-black text-[#3E3B36]">45,210</p>
                    </div>
                    <div className="flex-1 bg-white border border-[#E8E3DA] p-3 rounded-lg text-center shadow-sm">
                      <p className="text-[10px] text-[#8B8378] font-bold uppercase tracking-wider mb-1">Delivered</p>
                      <p className="text-xl font-black text-[#10B981]">44,890</p>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#E8E3DA] shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot size={14} style={{ color: '#C4A896' }} />
                      <span className="text-[10px] font-bold text-[#3E3B36] uppercase tracking-wider">AI Email Editor</span>
                    </div>
                    <div className="h-20 bg-[#F5F1EA] rounded border border-[#E8E3DA] border-dashed flex items-center justify-center">
                      <span className="text-[10px] text-[#8B8378]">Visual Layout Engine</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Mockup: Smartphone QR Journey */}
              <div className="absolute right-0 top-4 w-[260px] h-[480px] bg-[#EFEAE2] rounded-[2.5rem] shadow-2xl border-[8px] border-[#1f2937] overflow-hidden flex flex-col transform rotate-y-12 -rotate-z-3 -translate-x-2 z-20">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1f2937] rounded-b-xl z-30"></div>
                <div className="bg-[#075e54] text-white pt-10 pb-3 px-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="font-bold text-sm">TB</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">True Broadcast</p>
                    <p className="text-[9px] text-white/70 uppercase tracking-widest">Business Account</p>
                  </div>
                </div>
                <div className="flex-1 p-4 flex flex-col gap-3 relative" style={{backgroundImage: 'radial-gradient(#d1cbbd 1px, transparent 1px)', backgroundSize: '16px 16px'}}>
                  <div className="self-end bg-[#dcf8c6] max-w-[85%] rounded-lg rounded-tr-none p-2.5 shadow-sm mt-2">
                    <p className="text-[12px] text-[#111B21]">✨ Add me to Broadcast</p>
                  </div>
                  <div className="self-start bg-white max-w-[90%] rounded-lg rounded-tl-none p-3 shadow-sm border-l-4 border-emerald-500 mt-2">
                    <div className="flex items-center gap-3 mb-2 pb-2 border-b border-gray-100">
                      <div className="w-8 h-8 bg-[#F5F1EA] rounded-full flex items-center justify-center"><Contact size={16} className="text-[#3E3B36]"/></div>
                      <div>
                        <p className="text-[12px] font-bold text-[#3E3B36]">True Attendly</p>
                        <p className="text-[10px] text-[#8B8378]">Business Contact</p>
                      </div>
                    </div>
                    <button className="w-full text-center text-[11px] font-bold text-blue-500 py-1">Save Contact</button>
                  </div>
                  <div className="self-start bg-white max-w-[90%] rounded-lg rounded-tl-none p-2.5 shadow-sm mt-1">
                    <p className="text-[12px] text-[#111B21]">Welcome! You've been granted <strong className="text-emerald-600">5 Loyalty Credits</strong>.</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2.5 — PROBLEM VS SOLUTION MATRIX
      ══════════════════════════════════════════════════════════ */}
      <section id="solutions" className="py-24 scroll-reveal-section bg-white border-b border-[#E8E3DA]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
            <p className="text-xs tracking-[0.25em] uppercase mb-4" style={{ color: '#C4A896' }}>The Industry Trap</p>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#3E3B36] mb-6">
              Why Traditional Marketing is Killing Your Retail Margins
            </h2>
            <p className="text-base leading-relaxed text-[#8B8378]">
              The modern customer ignores SMS and blocks unsolicited spam. To win, you need permission, native formatting, and zero-ban infrastructure.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Trap A vs Solution A */}
            <div className="gsap-reveal bg-[#F5F1EA] rounded-2xl p-8 border border-[#E8E3DA]">
              <div className="flex items-start gap-4 mb-6 pb-6 border-b border-[#E8E3DA]">
                <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm">
                  <XCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#3E3B36] mb-2">Problem: The Unofficial Third-Party Ban Trap</h3>
                  <p className="text-sm text-[#8B8378] leading-relaxed">Sending bulk messages manually or via insecure web-scrapers gets your official business number instantly banned by WhatsApp, destroying your brand equity overnight.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#3E3B36] mb-2">Solution: Dual-Engine Safety Pipeline</h3>
                  <p className="text-sm text-[#8B8378] leading-relaxed">
                    Use Official <strong>Meta API</strong> if you have a registered business for absolute zero-ban mass broadcasting. No documents? Use our <strong>In-Store QR Engine</strong> where customers text you first, completely whitelisting your number legally and natively.
                  </p>
                </div>
              </div>
            </div>

            {/* Trap B vs Solution B */}
            <div className="gsap-reveal bg-[#F5F1EA] rounded-2xl p-8 border border-[#E8E3DA]">
              <div className="flex items-start gap-4 mb-6 pb-6 border-b border-[#E8E3DA]">
                <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm">
                  <XCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#3E3B36] mb-2">Problem: The Ghost Contact Friction</h3>
                  <p className="text-sm text-[#8B8378] leading-relaxed">Customers rarely type and save your 10-digit number. If they don't save it, broadcast links aren't clickable, and your text gets ignored as "unknown spam."</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#3E3B36] mb-2">Solution: Instant Smart vCard Push</h3>
                  <p className="text-sm text-[#8B8378] leading-relaxed">
                    Upon QR scan, our system automatically drops a formatted <strong>vCard</strong>. One tap saves your merchant contact details directly into their native phonebook, ensuring maximum downstream read-rates and clickable URLs.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2.5 — SEE IT IN ACTION
      ══════════════════════════════════════════════════════════ */}
      <section className="py-24 scroll-reveal-section bg-white border-b border-[#E8E3DA]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-16 gsap-reveal">
            <p className="text-xs tracking-[0.25em] uppercase mb-4" style={{ color: '#C4A896' }}>
              See It In Action
            </p>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#3E3B36] mb-4">
              Engage Customers Instantly.
            </h2>
            <p className="text-base leading-relaxed text-[#8B8378]">
              Preview how your messages appear on your customers&apos; devices. High-converting layouts tailored for every industry.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Retail (E-commerce) Twin Block */}
            <div className="flex flex-col gap-6">
              <div className="gsap-reveal group bg-[#EFEAE2] rounded-[2rem] border-[6px] border-[#3E3B36] p-4 shadow-xl overflow-hidden relative transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl flex flex-col justify-end min-h-[360px]">
                <div className="absolute inset-0 bg-[#EFEAE2] opacity-50 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#C4A896 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                <div className="bg-white rounded-lg shadow-sm p-1 flex flex-col relative max-w-[100%] mx-auto mt-4 rounded-tl-sm z-10 w-full">
                  <div className="relative w-full h-40 rounded-t-md overflow-hidden bg-gray-100">
                    <Image src="/images/showcase-1.png" alt="E-commerce Showcase" fill className="object-cover" />
                  </div>
                  <div className="px-2 pt-2 pb-1 relative">
                    <p className="text-[13px] text-[#111B21] leading-[18px]">
                      <strong>*Exclusive Drop!*</strong><br/>
                      Get 20% off on our limited edition series today. Reply BUY to order.
                    </p>
                    <div className="float-right flex items-center gap-1 mt-1 ml-2 pb-0.5">
                      <span className="text-[10px] text-[#667781]">10:42 AM</span>
                      <svg viewBox="0 0 16 15" width="16" height="15" className="text-[#53bdeb] fill-current"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.346.125.467-.025l6.236-8.083a.362.362 0 0 0-.011-.485z"></path><path d="M10.151 3.316l-.478-.372a.365.365 0 0 0-.51.063L3.806 9.879a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.346.125.467-.025l6.236-8.083a.362.362 0 0 0-.011-.485z"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
              {/* Email Twin */}
              <div className="gsap-reveal group bg-white rounded-xl border border-[#E8E3DA] shadow-sm overflow-hidden relative transition-all duration-500 hover:scale-[1.03] hover:shadow-xl flex flex-col h-[320px]">
                <div className="bg-[#F5F1EA] px-4 py-2 border-b border-[#E8E3DA] flex items-center justify-between text-[10px] text-[#8B8378] uppercase tracking-widest font-semibold">
                  <span>Inbox</span><span className="text-[9px]">10:42 AM</span>
                </div>
                <div className="px-4 py-3 border-b border-[#E8E3DA] bg-white">
                   <p className="text-xs font-semibold text-[#3E3B36] truncate">🎁 Exclusive Eid Drop: 20% Off Just For You!</p>
                </div>
                <div className="flex-1 p-4 flex flex-col items-center justify-center text-center bg-[#F9F7F4] relative">
                   <div className="w-full h-24 bg-gray-200 rounded-md mb-3 overflow-hidden relative shadow-sm">
                      <Image src="/images/showcase-1.png" alt="Email Banner" fill className="object-cover" />
                   </div>
                   <p className="text-[11px] text-[#3E3B36] leading-relaxed mb-3">Dear Valued VIP Customer, our limited-edition festival series is live. Premium quality, crafted just for you.</p>
                   <button className="bg-[#3E3B36] text-white text-[9px] uppercase tracking-widest px-4 py-2 rounded-md font-medium">Shop Collection Now</button>
                </div>
              </div>
            </div>

            {/* Card 2: Real Estate Twin Block */}
            <div className="flex flex-col gap-6">
              <div className="gsap-reveal group bg-[#EFEAE2] rounded-[2rem] border-[6px] border-[#3E3B36] p-4 shadow-xl overflow-hidden relative transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl flex flex-col justify-end min-h-[360px]" style={{ transitionDelay: '100ms' }}>
                <div className="absolute inset-0 bg-[#EFEAE2] opacity-50 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#C4A896 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                <div className="bg-white rounded-lg shadow-sm p-1 flex flex-col relative max-w-[100%] mx-auto mt-4 rounded-tl-sm z-10 w-full">
                  <div className="relative w-full h-40 rounded-t-md overflow-hidden bg-gray-100">
                    <Image src="/images/showcase-2.png" alt="Real Estate Showcase" fill className="object-cover" />
                  </div>
                  <div className="px-2 pt-2 pb-1 relative">
                    <p className="text-[13px] text-[#111B21] leading-[18px]">
                      <strong>*New Property Alert!*</strong><br/>
                      3 BHK luxury villas available at Prime Location. Click below to download the brochure.
                    </p>
                    <div className="float-right flex items-center gap-1 mt-1 ml-2 pb-0.5">
                      <span className="text-[10px] text-[#667781]">11:15 AM</span>
                      <svg viewBox="0 0 16 15" width="16" height="15" className="text-[#53bdeb] fill-current"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.346.125.467-.025l6.236-8.083a.362.362 0 0 0-.011-.485z"></path><path d="M10.151 3.316l-.478-.372a.365.365 0 0 0-.51.063L3.806 9.879a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.346.125.467-.025l6.236-8.083a.362.362 0 0 0-.011-.485z"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
              {/* Email Twin */}
              <div className="gsap-reveal group bg-white rounded-xl border border-[#E8E3DA] shadow-sm overflow-hidden relative transition-all duration-500 hover:scale-[1.03] hover:shadow-xl flex flex-col h-[320px]" style={{ transitionDelay: '100ms' }}>
                <div className="bg-[#F5F1EA] px-4 py-2 border-b border-[#E8E3DA] flex items-center justify-between text-[10px] text-[#8B8378] uppercase tracking-widest font-semibold">
                  <span>Inbox</span><span className="text-[9px]">11:15 AM</span>
                </div>
                <div className="px-4 py-3 border-b border-[#E8E3DA] bg-white">
                   <p className="text-xs font-semibold text-[#3E3B36] truncate">✨ New Luxury Property Alert: Prime 3 BHK Villas Selection</p>
                </div>
                <div className="flex-1 p-4 flex flex-col items-center justify-center text-center bg-[#F9F7F4] relative">
                   <div className="w-full h-24 bg-gray-200 rounded-md mb-3 overflow-hidden relative shadow-sm">
                      <Image src="/images/showcase-2.png" alt="Email Banner" fill className="object-cover" />
                   </div>
                   <p className="text-[11px] text-[#3E3B36] leading-relaxed mb-3">Presented by True Realities. View architectural blueprints and flexible pricing structures attached inside.</p>
                   <button className="bg-[#3E3B36] text-white text-[9px] uppercase tracking-widest px-4 py-2 rounded-md font-medium">Download Brochure (PDF)</button>
                </div>
              </div>
            </div>

            {/* Card 3: Retail Feast Twin Block */}
            <div className="flex flex-col gap-6">
              <div className="gsap-reveal group bg-[#EFEAE2] rounded-[2rem] border-[6px] border-[#3E3B36] p-4 shadow-xl overflow-hidden relative transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl flex flex-col justify-end min-h-[360px]" style={{ transitionDelay: '200ms' }}>
                <div className="absolute inset-0 bg-[#EFEAE2] opacity-50 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#C4A896 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                <div className="bg-white rounded-lg shadow-sm p-1 flex flex-col relative max-w-[100%] mx-auto mt-4 rounded-tl-sm z-10 w-full">
                  <div className="relative w-full h-40 rounded-t-md overflow-hidden bg-gray-100">
                    <Image src="/images/showcase-3.png" alt="Restaurant Showcase" fill className="object-cover" />
                  </div>
                  <div className="px-2 pt-2 pb-1 relative">
                    <p className="text-[13px] text-[#111B21] leading-[18px]">
                      <strong>*Weekend Feast!*</strong><br/>
                      Buy 1 Get 1 Free on all premium items. Valid till Sunday midnight.
                    </p>
                    <div className="float-right flex items-center gap-1 mt-1 ml-2 pb-0.5">
                      <span className="text-[10px] text-[#667781]">01:30 PM</span>
                      <svg viewBox="0 0 16 15" width="16" height="15" className="text-[#53bdeb] fill-current"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.346.125.467-.025l6.236-8.083a.362.362 0 0 0-.011-.485z"></path><path d="M10.151 3.316l-.478-.372a.365.365 0 0 0-.51.063L3.806 9.879a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.346.125.467-.025l6.236-8.083a.362.362 0 0 0-.011-.485z"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
              {/* Email Twin */}
              <div className="gsap-reveal group bg-white rounded-xl border border-[#E8E3DA] shadow-sm overflow-hidden relative transition-all duration-500 hover:scale-[1.03] hover:shadow-xl flex flex-col h-[320px]" style={{ transitionDelay: '200ms' }}>
                <div className="bg-[#F5F1EA] px-4 py-2 border-b border-[#E8E3DA] flex items-center justify-between text-[10px] text-[#8B8378] uppercase tracking-widest font-semibold">
                  <span>Inbox</span><span className="text-[9px]">01:30 PM</span>
                </div>
                <div className="px-4 py-3 border-b border-[#E8E3DA] bg-white">
                   <p className="text-xs font-semibold text-[#3E3B36] truncate">🍕 Weekend Feast Active: Buy 1 Get 1 Free Tonight!</p>
                </div>
                <div className="flex-1 p-4 flex flex-col items-center justify-center text-center bg-[#F9F7F4] relative">
                   <div className="w-full h-24 bg-gray-200 rounded-md mb-3 overflow-hidden relative shadow-sm">
                      <Image src="/images/showcase-3.png" alt="Email Banner" fill className="object-cover" />
                   </div>
                   <p className="text-[11px] text-[#3E3B36] leading-relaxed mb-3">Order any of our signature wood-fired pizzas and get the second free. Valid till Sunday midnight.</p>
                   <button className="bg-[#3E3B36] text-white text-[9px] uppercase tracking-widest px-4 py-2 rounded-md font-medium">Claim Free Pizza</button>
                </div>
              </div>
            </div>

            {/* Card 4: Education Twin Block */}
            <div className="flex flex-col gap-6">
              <div className="gsap-reveal group bg-[#EFEAE2] rounded-[2rem] border-[6px] border-[#3E3B36] p-4 shadow-xl overflow-hidden relative transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl flex flex-col justify-end min-h-[360px]" style={{ transitionDelay: '300ms' }}>
                <div className="absolute inset-0 bg-[#EFEAE2] opacity-50 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#C4A896 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                <div className="bg-white rounded-lg shadow-sm p-1 flex flex-col relative max-w-[100%] mx-auto mt-4 rounded-tl-sm z-10 w-full">
                  <div className="relative w-full h-40 rounded-t-md overflow-hidden bg-gray-100">
                    <Image src="/images/showcase-4.png" alt="Event Showcase" fill className="object-cover" />
                  </div>
                  <div className="px-2 pt-2 pb-1 relative">
                    <p className="text-[13px] text-[#111B21] leading-[18px]">
                      <strong>*Seat Confirmed!*</strong><br/>
                      Your masterclass starts tomorrow at 7 PM. Click the link to join the live stream.
                    </p>
                    <div className="float-right flex items-center gap-1 mt-1 ml-2 pb-0.5">
                      <span className="text-[10px] text-[#667781]">04:45 PM</span>
                      <svg viewBox="0 0 16 15" width="16" height="15" className="text-[#53bdeb] fill-current"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.346.125.467-.025l6.236-8.083a.362.362 0 0 0-.011-.485z"></path><path d="M10.151 3.316l-.478-.372a.365.365 0 0 0-.51.063L3.806 9.879a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.346.125.467-.025l6.236-8.083a.362.362 0 0 0-.011-.485z"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
              {/* Email Twin */}
              <div className="gsap-reveal group bg-white rounded-xl border border-[#E8E3DA] shadow-sm overflow-hidden relative transition-all duration-500 hover:scale-[1.03] hover:shadow-xl flex flex-col h-[320px]" style={{ transitionDelay: '300ms' }}>
                <div className="bg-[#F5F1EA] px-4 py-2 border-b border-[#E8E3DA] flex items-center justify-between text-[10px] text-[#8B8378] uppercase tracking-widest font-semibold">
                  <span>Inbox</span><span className="text-[9px]">04:45 PM</span>
                </div>
                <div className="px-4 py-3 border-b border-[#E8E3DA] bg-white">
                   <p className="text-xs font-semibold text-[#3E3B36] truncate">🚀 Masterclass Confirmed: Your Live Access Link Inside</p>
                </div>
                <div className="flex-1 p-4 flex flex-col items-center justify-center text-center bg-[#F9F7F4] relative">
                   <div className="w-full h-24 bg-gray-200 rounded-md mb-3 overflow-hidden relative shadow-sm">
                      <Image src="/images/showcase-4.png" alt="Email Banner" fill className="object-cover" />
                   </div>
                   <p className="text-[11px] text-[#3E3B36] leading-relaxed mb-3">Your seats are locked for tomorrow's exclusive scale-up session at 7 PM. Join 10 minutes early.</p>
                   <button className="bg-[#3E3B36] text-white text-[9px] uppercase tracking-widest px-4 py-2 rounded-md font-medium">Join Live Stream</button>
                </div>
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
              {
                icon: '🎯',
                title: 'Capture Foot Traffic Instantly with Dynamic QR Leads',
                desc: "Turn physical visitors into digital leads with zero setup friction. When customers scan your dynamic QR code and send a quick WhatsApp message, their profile is instantly captured and added to your dashboard in seconds. Backed by advanced real-time search, robust sorting, and ultra-smooth infinite scrolling, managing your shop's growth has never been this simple.",
              },
              {
                icon: '📇',
                title: 'Smart vCard Address Book Push',
                desc: "Automatically push native vCard (VCF) payloads upon the initial QR inbound message. Legally whitelist your official contact number inside their local phonebook for optimal future campaign read rates.",
              },
              {
                icon: '📊',
                title: 'Omnichannel Analytics Ledger',
                desc: "Unified tracking dashboards bridging Meta WhatsApp receipts and Resend Email telemetry. Instantly view delivery metrics, deep-link click rates, and failure cascades across multiple campaigns from one single source of truth.",
              },
              {
                icon: '💳',
                title: 'Automated Loyalty Engine & Cashfree Gateways',
                desc: "Instantly drop 5 dynamic Loyalty Credits into a new prospect's account upon QR scan. Top-up global wallets seamlessly via our dynamic Cashfree integration, enabling transparent, pay-as-you-go broadcasting.",
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
          SECTION 3.5 — WASTE VS. WEALTH MATRIX
      ══════════════════════════════════════════════════════════ */}
      <section className="py-24 scroll-reveal-section bg-[#F5F1EA] border-t border-[#E8E3DA]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-16 gsap-reveal">
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#3E3B36] mb-4">
              Stop Wasting Money on Ghost Impressions.
            </h2>
            <p className="text-base leading-relaxed text-[#8B8378]">
              Traditional ads eat your budget and get scrolled past. True Attendly Broadcast delivers your message straight to their hands with a 98% open rate. Pay only for what actually sends.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            
            {/* Card 1 */}
            <div className="gsap-reveal bg-white border border-[#E8E3DA] rounded-xl p-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-6">
                <XCircle size={24} />
              </div>
              <h3 className="lexend-subheading text-base font-semibold text-[#3E3B36] mb-2">Social Media Ads (Meta/IG)</h3>
              <p className="text-lg font-bold text-[#C4A896] mb-4">~15% Viewability Rate</p>
              <p className="text-sm text-[#8B8378] leading-relaxed">
                High daily budgets, shrinking reach, and users swipe away in 0.5 seconds. You pay for impressions, not sales.
              </p>
            </div>

            {/* Card 2 */}
            <div className="gsap-reveal bg-white border border-[#E8E3DA] rounded-xl p-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-6">
                <XCircle size={24} />
              </div>
              <h3 className="lexend-subheading text-base font-semibold text-[#3E3B36] mb-2">Traditional Media</h3>
              <p className="text-lg font-bold text-[#C4A896] mb-4">Dynamic Zero Tracking</p>
              <p className="text-sm text-[#8B8378] leading-relaxed">
                Extremely expensive to print and distribute. You have zero data on who read it, who ignored it, or if it hit the trash bin.
              </p>
            </div>

            {/* Card 3 */}
            <div className="gsap-reveal bg-[#3E3B36] border border-[#3E3B36] rounded-xl p-8 flex flex-col items-center text-center transform md:-translate-y-4 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-[#F5F1EA] text-[#3E3B36] flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(245,241,234,0.3)]">
                <CheckCircle size={24} />
              </div>
              <h3 className="lexend-subheading text-base font-semibold text-[#F5F1EA] mb-2">True Attendly Broadcast</h3>
              <p className="text-lg font-bold text-[#C4A896] mb-4">98% Guaranteed Read Rate</p>
              <p className="text-sm text-[rgba(245,241,234,0.8)] leading-relaxed">
                Guaranteed High-Impact Inbox Reach: Delivered straight as a personal WhatsApp notification or an AI-polished premium corporate email. Customers see it, open it, and engage instantly.
              </p>
            </div>

          </div>

          <div className="gsap-reveal flex justify-center">
            <div className="inline-flex items-center gap-3 bg-white border border-[#E8E3DA] rounded-full px-5 py-2.5 shadow-sm">
              <span className="flex h-2 w-2 relative flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C4A896] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C4A896]"></span>
              </span>
              <p className="text-[10px] md:text-xs font-semibold tracking-wide text-[#3E3B36] uppercase text-left">
                Retail Reality Check: A customer might ignore a billboard, but they NEVER leave a WhatsApp notification unread.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3.8 — OMNICHANNEL INFRASTRUCTURE ARCHITECTURE
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-white py-24 scroll-reveal-section border-t border-[#E8E3DA]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
             <p className="text-xs tracking-[0.25em] uppercase mb-4" style={{ color: '#C4A896' }}>
              Omnichannel Routing Infrastructure
            </p>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#3E3B36] mb-4">
              Three Powerful Broadcast Engines. One Unified Dashboard.
            </h2>
            <p className="text-base leading-relaxed text-[#8B8378]">
              Whether you represent an Enterprise brand needing guaranteed delivery at scale, a local shop looking for a quick, template-free setup, or an Omnichannel presence requiring AI-polished emails, our Tri-Channel Architecture adapts instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto gsap-reveal">
            {/* Premium In-Store QR Lead Engine */}
            <div className="border border-[#E8E3DA] rounded-2xl p-8 bg-white flex flex-col justify-between hover:border-[#10B981]/50 transition-colors shadow-sm">
              <div>
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 bg-[#10B981] text-[#FFFFFF] rounded-xl flex items-center justify-center">
                     <Smartphone size={20} />
                   </div>
                   <div>
                     <h3 className="lexend-subheading text-lg font-bold text-[#3E3B36]">Feature A: Premium In-Store QR Lead Engine</h3>
                     <p className="text-[10px] tracking-[0.1em] text-[#8B8378] uppercase">Zero Meta Approvals, Zero Number Bans</p>
                   </div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#3E3B36] leading-relaxed"><strong>100% Safe Intake:</strong> Uses inbound customer texts ("Add me to Broadcast") to safely whitelist numbers instantly.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#3E3B36] leading-relaxed"><strong>Zero Meta Approvals:</strong> No cumbersome template reviews. Instant local activation via QR.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#3E3B36] leading-relaxed"><strong>Automated Vouchers:</strong> Cloud hooks automatically reply with a Welcome Promo (10 Credits per lead).</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#3E3B36] leading-relaxed"><strong>Risk-Free Sender Safety:</strong> Eliminate web-socket scraping and ban hazards entirely.</p>
                  </li>
                </ul>
              </div>
            </div>

            {/* White-Label Branded Email Campaigns */}
            <div className="border border-[#E8E3DA] rounded-2xl p-8 bg-[#F9F7F4] flex flex-col justify-between hover:border-[#6366f1]/30 transition-colors">
              <div>
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 bg-[#6366f1] text-[#FFFFFF] rounded-xl flex items-center justify-center">
                     <Mail size={20} />
                   </div>
                   <div>
                     <h3 className="lexend-subheading text-lg font-bold text-[#3E3B36]">Feature B: White-Label Email Campaigns</h3>
                     <p className="text-[10px] tracking-[0.1em] text-[#8B8378] uppercase">Powered By Resend (0.5 Credits)</p>
                   </div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#3E3B36] leading-relaxed"><strong>Premium Corporate Styling:</strong> Clean, minimalistic HTML templates customized to your brand identity.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#3E3B36] leading-relaxed"><strong>Ultra-Low Cost Structure:</strong> Dispatch thousands of emails seamlessly for only 0.5 wallet credits per recipient.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#3E3B36] leading-relaxed"><strong>AI-Assisted Drafting:</strong> Leverage cutting-edge language models to write high-converting copy in seconds.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#3E3B36] leading-relaxed"><strong>Dynamic CSV Parsing:</strong> Instant 10k+ audience generation and list segmentation uploads.</p>
                  </li>
                </ul>
              </div>
            </div>

            {/* Meta Official WhatsApp Campaign */}
            <div className="border border-[#E8E3DA] rounded-2xl p-8 bg-[#F5F1EA] flex flex-col justify-between hover:border-[#3b82f6]/40 transition-colors shadow-sm">
              <div>
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 bg-[#3b82f6] text-[#FFFFFF] rounded-xl flex items-center justify-center">
                     <ShieldCheck size={20} />
                   </div>
                   <div>
                     <h3 className="lexend-subheading text-lg font-bold text-[#3E3B36]">Feature C: Official Meta API Broadcasts</h3>
                     <p className="text-[10px] tracking-[0.1em] text-[#8B8378] uppercase">Zero Risk, Verified Enterprise Architecture</p>
                   </div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#3E3B36] leading-relaxed"><strong>Verified Brand Trust:</strong> Connect your official WhatsApp Business API to broadcast to tens of thousands of contacts seamlessly with 0% risk of bans.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#3E3B36] leading-relaxed"><strong>AI Template Polisher:</strong> Automatically draft, format, and push your dynamic message templates directly to Meta for instant approval.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#3E3B36] leading-relaxed"><strong>Dynamic Variables:</strong> Seamlessly inject personalized names and custom fields using Meta's robust native token system.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#3E3B36] leading-relaxed"><strong>Granular Analytics:</strong> Track real-time Sent, Delivered, and Read receipts explicitly verified and synced from Meta's global webhooks.</p>
                  </li>
                </ul>
              </div>
            </div>

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
          SECTION 4.8 — ADVANCED CAPABILITIES (Pure CSS Mockups)
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-white py-24 scroll-reveal-section">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 gsap-reveal text-center max-w-2xl mx-auto">
            <p className="uppercase tracking-[0.25em] text-[#C4A896] text-xs mb-3 font-medium">Platform Deep Dive</p>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#3E3B36]">Advanced Capabilities.</h2>
          </div>
          
          <div className="space-y-24">
            {/* Feature 1: Bulk Campaign Broadcasting */}
            <div className="flex flex-col lg:flex-row items-center gap-12 gsap-reveal">
              <div className="lg:w-1/2 space-y-4">
                <h3 className="lexend-subheading text-xl font-medium text-[#3E3B36]">Bulk Campaign Broadcasting</h3>
                <p className="text-sm leading-relaxed text-[#8B8378]">Broadcast Offers to 100k+ Opt-In Users instantly. Upload massive CSV or XLSX spreadsheets with zero processing lag. Set dynamic attributes like <code className="bg-[#F5F1EA] text-[#C4A896] px-1 rounded mx-0.5">{'{{1}}'}</code> and <code className="bg-[#F5F1EA] text-[#C4A896] px-1 rounded mx-0.5">{'{{2}}'}</code> to personalize each message.</p>
              </div>
              <div className="lg:w-1/2 w-full p-8 bg-[#F5F1EA] rounded-2xl flex items-center justify-center">
                <div className="w-full max-w-md bg-[#FFFFFF] rounded-xl border border-[#E8E3DA] overflow-hidden shadow-sm">
                  <div className="flex px-5 py-3 bg-[#F5F1EA]/50 border-b border-[#E8E3DA] text-[9px] text-[#8B8378] uppercase tracking-widest font-semibold">
                    <div className="w-1/3">Customer Name</div><div className="w-1/3">Phone</div><div className="w-1/3 text-right">Tag</div>
                  </div>
                  <div className="flex px-5 py-4 border-b border-[#E8E3DA] text-xs text-[#3E3B36] items-center">
                    <div className="w-1/3 font-medium truncate">Aliya K.</div><div className="w-1/3 font-mono text-[#8B8378] text-[11px]">919876543210</div><div className="w-1/3 text-right"><span className="px-2.5 py-1 bg-[#F5F1EA] border border-[#E8E3DA] rounded-full text-[9px] font-bold tracking-wider">VIP</span></div>
                  </div>
                  <div className="flex px-5 py-4 text-xs text-[#3E3B36] items-center">
                    <div className="w-1/3 font-medium truncate">Rahul M.</div><div className="w-1/3 font-mono text-[#8B8378] text-[11px]">919876543211</div><div className="w-1/3 text-right"><span className="px-2.5 py-1 bg-[#F5F1EA] border border-[#E8E3DA] rounded-full text-[9px] font-bold tracking-wider">NEW</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Enterprise Meta Mode: Smart Template Polish AI */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12 gsap-reveal">
              <div className="lg:w-1/2 space-y-4">
                <h3 className="lexend-subheading text-xl font-medium text-[#3E3B36]">Enterprise Meta Mode: Smart Template Polish AI</h3>
                <p className="text-sm leading-relaxed text-[#8B8378]">Turn raw business notes into luxury customer copy designed specifically for official Meta approvals. Our AI optimizes spacing, tone, and grammar while strictly preserving essential compliance placeholders like <code className="bg-[#F5F1EA] text-[#C4A896] px-1 rounded mx-0.5">{'{{1}}'}</code> and <code className="bg-[#F5F1EA] text-[#C4A896] px-1 rounded mx-0.5">{'{{2}}'}</code>.</p>
              </div>
              <div className="lg:w-1/2 w-full p-8 bg-[#F5F1EA] rounded-2xl flex items-center justify-center">
                <div className="w-full max-w-md flex flex-col sm:flex-row gap-3">
                  <div className="w-full sm:w-1/2 p-4 bg-white rounded-xl border-2 border-dashed border-[#C4A896]/40 flex flex-col justify-center relative group hover:border-[#C4A896] transition-colors">
                    <span className="absolute top-2 left-3 text-[8px] uppercase tracking-widest font-bold text-[#C4A896]">Raw Input</span>
                    <p className="text-xs text-[#8B8378] font-mono leading-relaxed mt-4">hi sir we have new stock pls buy come to shop.</p>
                  </div>
                  <div className="hidden sm:flex items-center justify-center">
                    <ArrowRight size={16} className="text-[#C4A896]" />
                  </div>
                  <div className="w-full sm:w-1/2 p-4 bg-[#FFFFFF] rounded-xl border border-[#C4A896] shadow-sm relative">
                    <span className="absolute top-2 left-3 text-[8px] uppercase tracking-widest font-bold text-[#C4A896]">Polished (Meta API)</span>
                    <p className="text-xs text-[#3E3B36] font-medium leading-relaxed mt-4">Hi <span className="text-[#C4A896]">{'{{1}}'}</span>! Exclusive new stock has just arrived at <span className="text-[#C4A896]">{'{{2}}'}</span>. Visit us today to secure yours before it&apos;s gone. ✨</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: Small Business QR Mode: AI Ready-For-You Mode */}
            <div className="flex flex-col lg:flex-row items-center gap-12 gsap-reveal">
              <div className="lg:w-1/2 space-y-4">
                <h3 className="lexend-subheading text-xl font-medium text-[#3E3B36]">Small Business QR Mode: AI Ready-For-You Generator</h3>
                <p className="text-sm leading-relaxed text-[#8B8378]">Maximize inbox delivery with built-in Anti-Ban Spintax technology. Write one broadcast message, and our AI dynamically spins it into hundreds of unique variations sent across the QR bridge—all safeguarded by our dynamic human-like anti-ban delay safety configurations (5 to 12-second randomized throttling).</p>
              </div>
              <div className="lg:w-1/2 w-full p-8 bg-[#F5F1EA] rounded-2xl flex items-center justify-center">
                <div className="w-full max-w-md p-6 bg-white rounded-xl border border-[#E8E3DA] shadow-sm relative">
                    <span className="absolute top-3 left-4 text-[9px] uppercase tracking-widest font-bold text-[#10B981] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse"></span> Anti-Ban Spintax Engine
                    </span>
                    <div className="mt-6 space-y-3">
                      <div className="p-3 bg-[#F9F7F4] border border-[#E8E3DA] rounded-lg text-[11px] text-[#3E3B36]">
                        <span className="text-[#C4A896] font-mono">"{'{'}Hello|Hi|Hey{'}'}"</span> Aliya! We missed you.
                      </div>
                      <div className="p-3 bg-[#F9F7F4] border border-[#E8E3DA] rounded-lg text-[11px] text-[#3E3B36]">
                        <span className="text-[#C4A896] font-mono">"{'{'}Greetings|Welcome back{'}'}"</span> Rahul! Check out our new stock.
                      </div>
                    </div>
                </div>
              </div>
            </div>

            {/* Feature 4: Deep Real-Time Analytics Dashboard */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12 gsap-reveal">
              <div className="lg:w-1/2 space-y-4">
                <h3 className="lexend-subheading text-xl font-medium text-[#3E3B36]">Deep Real-Time Analytics Dashboard</h3>
                <p className="text-sm leading-relaxed text-[#8B8378]">Track Sent, Delivered (Double-Tick), and Read (Blue-Tick) status logs in absolute real-time. Know exactly who read your campaign and optimize your retail marketing spend with high-performance charts.</p>
              </div>
              <div className="lg:w-1/2 w-full p-8 bg-[#F5F1EA] rounded-2xl flex items-center justify-center">
                <div className="w-full max-w-md p-6 bg-white rounded-xl border border-[#E8E3DA] shadow-sm">
                  <div className="flex items-end justify-between mb-3">
                    <span className="lexend-subheading text-sm font-semibold text-[#3E3B36]">Read Rate</span>
                    <span className="text-lg font-bold text-[#10B981]">85%</span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#F5F1EA]">
                    <div className="bg-[#10B981] h-full" style={{ width: '85%' }} />
                    <div className="bg-[#6366F1] h-full" style={{ width: '12%' }} />
                    <div className="bg-[#F43F5E] h-full" style={{ width: '3%' }} />
                  </div>
                  <div className="flex justify-between mt-5 text-[9px] uppercase tracking-widest text-[#8B8378] font-medium">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[2px] bg-[#10B981]"></span>Read (85%)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[2px] bg-[#6366F1]"></span>Delivered (12%)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[2px] bg-[#F43F5E]"></span>Failed (3%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4.9 — EMAIL CAMPAIGN + AI POLISH SHOWCASE
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-[#F5F1EA] border-t border-[#E8E3DA] py-24 scroll-reveal-section">
        <div className="max-w-6xl mx-auto px-6">

          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
            <p className="text-xs tracking-[0.25em] uppercase mb-4" style={{ color: '#6366f1' }}>
              New · Email Marketing
            </p>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#3E3B36] mb-4">
              Now Broadcast via Email — With AI That Writes For You.
            </h2>
            <p className="text-base leading-relaxed text-[#8B8378]">
              Launch full-scale email campaigns to your segmented audience. Our built-in AI Polish engine transforms rough drafts into premium, conversion-optimised copy in a single click.
            </p>
          </div>

          {/* Two-column: mockup left, features right */}
          <div className="flex flex-col lg:flex-row items-stretch gap-8 gsap-reveal">

            {/* LEFT — Email Composer Mockup */}
            <div className="lg:w-1/2 w-full">
              <div className="bg-white rounded-2xl border border-[#E8E3DA] shadow-lg overflow-hidden h-full flex flex-col">

                {/* Fake browser chrome */}
                <div className="bg-[#F5F1EA] border-b border-[#E8E3DA] px-4 py-3 flex items-center gap-2 flex-shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#f43f5e]/60" />
                    <div className="w-3 h-3 rounded-full bg-[#f59e0b]/60" />
                    <div className="w-3 h-3 rounded-full bg-[#10b981]/60" />
                  </div>
                  <div className="flex-1 mx-3 bg-white border border-[#E8E3DA] rounded-md px-3 py-1">
                    <p className="text-[10px] text-[#8B8378] font-mono">dashboard/email/create</p>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col gap-4">
                  {/* Campaign Title & Banner Area */}
                  <div>
                    <p className="text-[9px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Banner Image Preview</p>
                    <div className="w-full h-16 bg-[#F9F7F4] border-2 border-dashed border-[#E8E3DA] rounded-lg flex items-center justify-center">
                       <span className="text-[10px] text-[#8B8378]">Attach Header Banner Area</span>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <p className="text-[9px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5 flex justify-between">
                       <span>Subject Line</span>
                       <span className="text-[#6366f1] font-bold">🪄 AI Polish</span>
                    </p>
                    <div className="w-full bg-[#F5F1EA] border border-[#E8E3DA] rounded-md px-3 py-2 text-xs text-[#3E3B36]">
                      🎁 Exclusive Offer Just For You — Limited Stock!
                    </div>
                  </div>

                  {/* AI Polish Before/After */}
                  <div>
                    <p className="text-[9px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5 flex justify-between">
                       <span>Email Body</span>
                       <span className="text-[#6366f1] font-bold">🤖 Ask AI to Write (Gemini/Groq)</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Before */}
                      <div className="p-3 bg-[#F9F7F4] border-2 border-dashed border-[#E8E3DA] rounded-lg relative">
                        <span className="absolute -top-2 left-2 bg-[#F9F7F4] px-1.5 text-[8px] uppercase tracking-widest font-bold text-[#8B8378]">Raw Draft</span>
                        <p className="text-[10px] text-[#8B8378] font-mono leading-relaxed">
                          hi customer we have sale going on. come and buy. very good quality.
                        </p>
                      </div>
                      {/* After */}
                      <div className="p-3 bg-white border-2 border-[#6366f1]/30 rounded-lg relative shadow-sm">
                        <span className="absolute -top-2 left-2 bg-white px-1.5 text-[8px] uppercase tracking-widest font-bold text-[#6366f1]">✦ AI Polished</span>
                        <p className="text-[10px] text-[#3E3B36] font-medium leading-relaxed">
                          Dear valued customer, our exclusive Eid collection is here — premium quality, limited pieces. Shop now before it sells out. ✨
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Audience tags */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[9px] text-[#8B8378] tracking-widest uppercase">Targeting Segment:</p>
                    {['VIP', 'Regular', 'New'].map((t, i) => (
                      <span key={t} className={`text-[9px] px-2.5 py-1 ${i < 2 ? 'bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20' : 'bg-gray-100 text-gray-500 border border-gray-200'} rounded-full font-semibold tracking-wide`}>
                        {t}
                      </span>
                    ))}
                    <span className="ml-auto text-[9px] text-[#8B8378]">1,240 recipients</span>
                  </div>

                  {/* Dispatch button */}
                  <div className="flex items-center justify-between bg-[#3E3B36] rounded-xl px-4 py-3 mt-auto">
                    <div>
                      <p className="text-[10px] text-white font-semibold">Ready to send to 1,240 recipients</p>
                      <p className="text-[9px] text-white/50 uppercase tracking-wider">1 credit per email</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#6366f1] px-3 py-1.5 rounded-lg text-white text-[10px] font-bold tracking-wider uppercase">
                      <Mail size={11} /> Dispatch
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — Feature Pillars */}
            <div className="lg:w-1/2 w-full flex flex-col gap-4">

              {[
                {
                  icon: '✦',
                  color: '#6366f1',
                  bg: 'rgba(99,102,241,0.08)',
                  title: 'Layout & Ask AI to Write Framework',
                  desc: 'Attach a top banner preview, write a dynamic subject line with the "🪄 AI Polish" controller, and use the Email Body Rich textarea reinforced by our "🤖 Ask AI to Write (Gemini/Groq Failover Engine)" capability to instantly generate premium copy.',
                },
                {
                  icon: '◎',
                  color: '#10b981',
                  bg: 'rgba(16,185,129,0.08)',
                  title: 'Tag-Based Audience Targeting',
                  desc: 'Trigger precision sends using dynamic targeting tags for VIP, Regular, and New segments. Recipient counts update instantly as you refine your audience.',
                },
                {
                  icon: '◈',
                  color: '#C4A896',
                  bg: 'rgba(196,168,150,0.12)',
                  title: 'Dedicated History & Analytics Routing',
                  desc: 'Access a specialized History Routing page with an aggregate block (Total Sent | Success Ratio | Delivered | Failed) at the top, equipped with Search, Sort, Filtering, and Infinite Scrolling.',
                },
                {
                  icon: '⬇',
                  color: '#8B7BA8',
                  bg: 'rgba(139,123,168,0.08)',
                  title: 'Dual-Mode Exporting Manifests',
                  desc: 'Instantly download your intelligence with two side-by-side mechanisms: "Export All Data" or "Export Filtered View" for instant CSV/Excel manifests—configured on both WhatsApp and Email histories.',
                },
                {
                  icon: '🛡️',
                  color: '#f43f5e',
                  bg: 'rgba(244,63,94,0.08)',
                  title: 'Safety Transaction Popup Modal',
                  desc: 'Operate with zero fear. A mandatory secure firewall popup requires manual user verification before triggering any dispatch loop, eliminating accidental launches.',
                },
              ].map(f => (
                <div
                  key={f.title}
                  className="bg-white rounded-xl border border-[#E8E3DA] p-4 flex items-start gap-4 hover:border-[#E8E3DA] transition-colors group"
                  style={{ '--hover-border': f.color } as React.CSSProperties}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = f.color + '50')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#E8E3DA')}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base font-bold"
                    style={{ backgroundColor: f.bg, color: f.color }}
                  >
                    {f.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="lexend-subheading text-sm font-semibold text-[#3E3B36] mb-1.5" style={{ color: '#3E3B36' }}>
                      {f.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#8B8378]">{f.desc}</p>
                  </div>
                </div>
              ))}

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
              and build loyal communities - one WhatsApp message at a time.
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
                href="mailto:trueattendly@gmail.com"
                className="flex items-center justify-center gap-2 w-full py-5 border border-[#3E3B36] text-[#3E3B36] hover:bg-[#3E3B36] hover:text-[#FFFFFF] transition-colors rounded-lg text-xs font-semibold tracking-[0.15em] uppercase"
              >
                <Mail size={16} />
                trueattendly@gmail.com
              </a>
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
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">

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
              className="text-[10px] tracking-[0.25em] uppercase text-center"
              style={{ color: '#8B8378' }}
            >
              True Attendly Broadcast · broadcast.trueattendly.online
            </p>

            {/* Version Badge */}
            <div className="border border-[#E8E3DA] bg-transparent py-1 px-3 rounded-md hidden md:block">
              <span className="text-[10px] tracking-[0.15em] text-[#C4A896] font-mono">
                {APP_VERSION}
              </span>
            </div>

          </div>

          <div className="border-t border-[#E8E3DA] pt-8 flex flex-col md:flex-row items-center justify-center md:justify-between gap-6">
            {/* Nav & Compliance Links */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-5">
              {[
                { label: 'About', href: '#about' },
                { label: 'Pricing', href: '#services' },
                { label: 'Contact', href: '#contact' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Refund Policy', href: '/refund-policy' },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-[10px] tracking-[0.15em] uppercase transition-colors duration-200"
                  style={{ color: '#8B8378' }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#C4A896')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#8B8378')}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            
            <div className="flex items-center gap-5">
              <Link
                href="/auth/login"
                className="text-[10px] tracking-[0.15em] uppercase transition-colors duration-200 font-semibold"
                style={{ color: '#3E3B36' }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#C4A896')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#3E3B36')}
              >
                Sign In →
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
