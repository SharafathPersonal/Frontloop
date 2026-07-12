'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { APP_VERSION } from '@/lib/config';
import { 
  ShieldCheck, Smartphone, Zap, Mail, ArrowRight, XCircle, CheckCircle,
  Database, Wallet, BarChart, Settings, Bot, Users, Contact, Phone, MessageCircle
} from 'lucide-react';

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let lenis: any = null;
    let gsapModule: any = null;

    async function initAnimations() {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);

      gsap.registerPlugin(ScrollTrigger);
      gsapModule = { gsap } as any;

      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time: number) => lenis?.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }

      const header = headerRef.current;
      if (header) {
        ScrollTrigger.create({
          start: 40,
          onEnter: () => header.classList.add('header-scrolled'),
          onLeaveBack: () => header.classList.remove('header-scrolled'),
        });
      }

      if (heroRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const heroEls = heroRef.current.querySelectorAll('.gsap-reveal');
        gsap.fromTo(
          heroEls,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.1 }
        );
      } else if (heroRef.current) {
        heroRef.current.querySelectorAll('.gsap-reveal').forEach((el) => {
          (el as HTMLElement).style.opacity = '1';
          (el as HTMLElement).style.transform = 'none';
        });
      }

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
      <style jsx global>{`
        .header-scrolled {
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(12px) !important;
          box-shadow: 0 1px 0 #E8E3DA !important;
        }
        .header-scrolled .nav-link-light { color: #8B8378 !important; }
        .header-scrolled .nav-link-light:hover { color: #C4A896 !important; }
        .header-scrolled .brand-text { color: #3E3B36 !important; }
        .header-scrolled .signin-link { color: #3E3B36 !important; }
        .header-scrolled .signin-link:hover { color: #C4A896 !important; }
        .header-scrolled .logo-light { opacity: 0 !important; }
        .header-scrolled .logo-dark { opacity: 1 !important; }
      `}</style>

      {/* FIXED HEADER */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 h-20 transition-all duration-300"
        style={{ background: 'transparent' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
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
          <nav className="hidden md:flex items-center gap-8">
            <a href="#solutions" className="nav-link-light text-xs tracking-[0.2em] text-white/80 hover:text-white uppercase transition-colors duration-200">Solutions</a>
            <a href="#architecture" className="nav-link-light text-xs tracking-[0.2em] text-white/80 hover:text-white uppercase transition-colors duration-200">Architecture</a>
            <a href="#contact" className="nav-link-light text-xs tracking-[0.2em] text-white/80 hover:text-white uppercase transition-colors duration-200">Contact</a>
          </nav>
          <Link
            href="/auth/login"
            className="signin-link text-xs tracking-[0.2em] text-white/80 hover:text-white uppercase transition-colors duration-200"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section
        ref={heroRef}
        className="relative min-h-[92vh] flex items-center overflow-hidden pt-32 pb-16"
        style={{ backgroundColor: '#111827' }} // Dark Slate for premium contrast
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 70% 60% at 80% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 20% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 60%)
            `,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Column: Direct Grid View & Copy */}
            <div className="space-y-8 z-10">
              <div className="gsap-reveal">
                <span className="text-xs tracking-[0.2em] uppercase font-bold text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-full border border-blue-400/20">
                  Version {APP_VERSION} Live
                </span>
              </div>
              <div className="gsap-reveal">
                <h1 className="serif-headline text-4xl sm:text-5xl lg:text-[56px] text-white leading-[1.1] tracking-tight">
                  The Omnichannel AI Marketing Platform for High-Retention Retail.
                </h1>
              </div>
              <div className="gsap-reveal">
                <p className="text-lg max-w-xl leading-relaxed text-slate-300 font-light">
                  Stop losing customers to dead channels. Launch official Meta WhatsApp updates, trigger zero-risk in-store QR lead pipelines, save bulk contacts via automated vCard sync, and run premium AI email campaigns—all from one unified ledger.
                </p>
              </div>

              {/* The 4-Feature Hub Display */}
              <div className="gsap-reveal grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex items-start gap-3 hover:bg-slate-800 transition-colors">
                  <ShieldCheck className="text-blue-400 mt-1 shrink-0" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Official Meta API Mode</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">0% Ban Risk. Verified Broadcasts to 100k+ Opt-in Users simultaneously.</p>
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex items-start gap-3 hover:bg-slate-800 transition-colors">
                  <Smartphone className="text-emerald-400 mt-1 shrink-0" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">In-Store QR Inbound Engine</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Instant walk-in lead capture via frictionless Scan & Join mechanics.</p>
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex items-start gap-3 hover:bg-slate-800 transition-colors">
                  <Zap className="text-amber-400 mt-1 shrink-0" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">AI Template Polisher & Spintax</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Automated compliance formatting & unique variation generation to bypass filters.</p>
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex items-start gap-3 hover:bg-slate-800 transition-colors">
                  <Mail className="text-indigo-400 mt-1 shrink-0" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Premium AI Email Suite</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Powered by Resend. Highly responsive corporate templates at just 0.5 credits.</p>
                  </div>
                </div>
              </div>

              <div className="gsap-reveal flex items-center gap-4 pt-4">
                <Link href="/auth/register" className="bg-white text-slate-900 font-semibold px-6 py-3 rounded-lg text-sm tracking-wide hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-lg shadow-white/10">
                  Create Free Workspace <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Right Column: Hero Visual Grid */}
            <div className="gsap-reveal relative h-[600px] w-full hidden lg:block perspective-1000">
              
              {/* Left Grid: Meta Campaign UI */}
              <div className="absolute left-0 top-10 w-[340px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform -rotate-y-12 rotate-z-3 translate-x-4 z-10">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Meta API Dispatcher</span>
                  <span className="bg-blue-100 text-blue-700 text-[9px] uppercase px-2 py-1 rounded font-bold">Verified</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1 bg-blue-50 border border-blue-100 p-2 rounded text-center">
                      <p className="text-[10px] text-blue-600 font-bold uppercase">Sent</p>
                      <p className="text-lg font-black text-slate-800">45,210</p>
                    </div>
                    <div className="flex-1 bg-emerald-50 border border-emerald-100 p-2 rounded text-center">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Delivered</p>
                      <p className="text-lg font-black text-slate-800">44,890</p>
                    </div>
                  </div>
                  <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot size={14} className="text-amber-500" />
                      <span className="text-[10px] font-bold text-slate-700">AI Optimizer Active</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-mono leading-relaxed bg-white p-2 rounded border border-slate-200">
                      Raw: "Hey buy our stuff!" <br/>
                      <span className="text-emerald-500 font-bold">↓ Optimized</span> <br/>
                      "Hi {'{{1}}'}, your exclusive access to {'{{2}}'} is ready."
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Grid: QR Inbound Mobile Journey */}
              <div className="absolute right-0 top-20 w-[280px] bg-slate-900 rounded-[2.5rem] shadow-2xl border-[6px] border-slate-800 overflow-hidden transform rotate-y-12 -rotate-z-3 -translate-x-4 z-20">
                {/* Dynamic Island / Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-800 rounded-b-xl z-30"></div>
                
                {/* Header */}
                <div className="bg-[#075e54] text-white pt-10 pb-3 px-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="font-bold text-sm">TB</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">True Broadcast</p>
                    <p className="text-[9px] text-white/70 uppercase tracking-widest">Official Business Account</p>
                  </div>
                </div>
                
                {/* Chat Body */}
                <div className="bg-[#efeae2] h-[400px] p-4 flex flex-col gap-3 relative" style={{backgroundImage: 'radial-gradient(#d1cbbd 1px, transparent 1px)', backgroundSize: '16px 16px'}}>
                  {/* Step 1: Inbound scan */}
                  <div className="self-end bg-[#dcf8c6] max-w-[85%] rounded-lg rounded-tr-none p-2.5 shadow-sm">
                    <p className="text-[12px] text-[#111B21]">✨ Add me to Broadcast</p>
                  </div>
                  {/* Step 2: vCard Push */}
                  <div className="self-start bg-white max-w-[90%] rounded-lg rounded-tl-none p-3 shadow-sm border-l-4 border-emerald-500 mt-2">
                    <div className="flex items-center gap-3 mb-2 pb-2 border-b border-gray-100">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"><Contact size={16} className="text-slate-600"/></div>
                      <div>
                        <p className="text-[12px] font-bold text-slate-800">True Attendly</p>
                        <p className="text-[10px] text-slate-500">Business Contact</p>
                      </div>
                    </div>
                    <button className="w-full text-center text-[11px] font-bold text-blue-500 py-1">Save Contact</button>
                  </div>
                  {/* Step 3: Welcome Voucher */}
                  <div className="self-start bg-white max-w-[90%] rounded-lg rounded-tl-none p-2.5 shadow-sm mt-1">
                    <p className="text-[12px] text-[#111B21]">Welcome! You've been granted <strong className="text-emerald-600">5 Loyalty Credits</strong>. Show this message at checkout.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PROBLEM VS SOLUTION DEEP DIVE */}
      <section id="solutions" className="py-24 scroll-reveal-section bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
            <h2 className="serif-headline text-3xl sm:text-4xl text-slate-900 mb-6">
              Why Traditional Marketing is Killing Your Retail Margins
            </h2>
            <p className="text-base leading-relaxed text-slate-600">
              The modern customer ignores SMS, scrolls past Instagram ads, and blocks unsolicited spam. To win, you need permission, native formatting, and zero-ban infrastructure.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Trap A vs Solution A */}
            <div className="gsap-reveal bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm">
                  <XCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Problem: The Unofficial Third-Party Ban Trap</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Sending bulk messages manually or via insecure web-scrapers gets your official business number instantly banned by WhatsApp, destroying your brand equity overnight.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Solution: Dual-Engine Safety Pipeline</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Use Official <strong>Meta API</strong> if you have a registered business for absolute zero-ban mass broadcasting. No documents? Use our <strong>In-Store QR Engine</strong> where customers text you first, completely whitelisting your number legally and natively.
                  </p>
                </div>
              </div>
            </div>

            {/* Trap B vs Solution B */}
            <div className="gsap-reveal bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm">
                  <XCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Problem: The Ghost Contact Friction</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Customers rarely type and save your 10-digit number. If they don't save it, broadcast links aren't clickable, and your text gets ignored as "unknown spam."</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Solution: Instant Smart vCard Push</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Upon QR scan, our system automatically drops a formatted <strong>vCard</strong>. One tap saves your merchant contact details as 'C1, C2...' directly into their native phonebook, ensuring maximum downstream read-rates and clickable URLs.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* DUAL-MODE MARKETING ARCHITECTURE SPECS */}
      <section id="architecture" className="py-24 scroll-reveal-section bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 gsap-reveal">
            <h2 className="serif-headline text-3xl sm:text-4xl mb-4">Dual-Mode Marketing Architecture</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Engineered to scale with your business stage. Toggle between architectures instantly from your unified ledger.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 gsap-reveal">
            {/* Feature A */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck size={120} />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-2 block">For GST-Registered Brands</span>
              <h3 className="text-2xl font-bold mb-6">Enterprise Meta Mode</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-sm text-slate-300"><strong>Bulk Excel Manifests:</strong> Upload 100k+ rows effortlessly.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-sm text-slate-300"><strong>Dynamic Parameters Mapping:</strong> Auto-inject {'{{1}}'} Name and {'{{2}}'} specific data points natively.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-sm text-slate-300"><strong>Deep Analytics:</strong> Granular Blue-Tick read analytics charts and delivery tracking.</span>
                </li>
              </ul>
            </div>

            {/* Feature B */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Smartphone size={120} />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-2 block">For Local Shops & SMBs</span>
              <h3 className="text-2xl font-bold mb-6">Small Business QR Mode</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-300"><strong>Zero Meta Setups:</strong> Bypass complex Facebook verifications entirely.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-300"><strong>100% Organic Accumulation:</strong> Capture walk-in foot traffic instantly.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-300"><strong>Anti-Ban Spintax Engine:</strong> Randomized 5 to 12-second transmission delays to emulate human typing perfectly.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CORE OMNICHANNEL EMAIL CORNERSTONE */}
      <section className="py-24 scroll-reveal-section bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 gsap-reveal">
              <h2 className="serif-headline text-3xl sm:text-4xl text-slate-900 mb-6">
                Core Omnichannel Email Cornerstone
              </h2>
              <p className="text-base leading-relaxed text-slate-600 mb-8">
                Diversify your outreach. Our built-in AI Email Engine is powered by <strong>Resend</strong>, delivering lightning-fast corporate templates directly to primary inboxes. Best of all? It consumes only <strong>0.5 wallet credits</strong> per send.
              </p>
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-xl">🪄</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">AI Polish for Subject Lines</h4>
                    <p className="text-xs text-slate-500 mt-1">Maximize open rates with perfectly engineered hooks.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-xl">🤖</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Ask AI to Write (Failover Engine)</h4>
                    <p className="text-xs text-slate-500 mt-1">Multi-model intelligence utilizing Gemini and Groq failovers.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Tag-Based Segment Targeting</h4>
                    <p className="text-xs text-slate-500 mt-1">Filter audiences by [VIP], [Regular], or [New] with one click.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 w-full gsap-reveal relative h-[500px] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col">
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <div className="ml-4 text-xs font-mono text-slate-500 bg-white px-2 py-1 rounded shadow-sm">new_campaign.html</div>
              </div>
              <div className="p-8 flex-1 flex flex-col justify-center items-center text-center bg-slate-50 relative overflow-hidden">
                <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px'}}></div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 z-10 w-full max-w-sm">
                  <div className="w-full h-32 bg-slate-100 rounded-lg mb-4 flex items-center justify-center text-slate-400 border border-slate-200 border-dashed">
                    [Premium Hero Image]
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Exclusive VIP Invitation</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">You have been selected to preview our latest collection before public release. Secure your reservation today.</p>
                  <button className="bg-slate-900 text-white w-full py-2.5 rounded text-xs font-bold uppercase tracking-wider">Reserve Access</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE 6-COLUMN REENGINEERED REVENUE RETAIL GRID */}
      <section className="py-24 scroll-reveal-section bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 gsap-reveal">
            <h2 className="serif-headline text-3xl sm:text-4xl text-slate-900 mb-4">The 6-Column Revenue Grid</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">A completely reengineered retail workflow. Total control over every stage of your broadcasting lifecycle.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 gsap-reveal mb-16">
            {[
              { num: '01', title: 'Campaign Editorial Workspace', icon: <Bot size={20}/> },
              { num: '02', title: 'Ingestion Spreadsheet Parser', icon: <Database size={20}/> },
              { num: '03', title: 'Transparent Credit Wallet Economy', icon: <Wallet size={20}/> },
              { num: '04', title: 'Delivery Analytics Ledger', icon: <BarChart size={20}/> },
              { num: '05', title: 'Advanced Infinite-Scroll Terminal', icon: <Users size={20}/> },
              { num: '06', title: 'Dynamic Cashfree Gateways', icon: <Zap size={20}/> },
            ].map(block => (
              <div key={block.num} className="p-6 border border-slate-200 rounded-xl hover:border-blue-400 transition-colors bg-slate-50 group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 group-hover:text-blue-500 transition-colors">{block.num}</span>
                  <div className="text-slate-400 group-hover:text-blue-500 transition-colors">{block.icon}</div>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{block.title}</h3>
              </div>
            ))}
          </div>

          {/* Technical Infrastructure Markers */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 gsap-reveal border-t border-slate-200 pt-10">
            <div className="flex items-center gap-3 text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Idempotency Conflict Security</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
              <Database size={16} className="text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Zero-CLS Structural Skeletons</span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED SIGN OFF & FOUNDER DIRECT HUD */}
      <section id="contact" className="py-32 scroll-reveal-section bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="gsap-reveal mb-8">
            <h2 className="serif-headline text-4xl md:text-5xl mb-6">Ready to Scale Your Retail Pipeline?</h2>
            <p className="text-lg text-slate-400 font-light mb-10">Join the omnichannel revolution. Prevent bans, automate vCards, and convert ghost traffic into revenue today.</p>
            <Link href="/auth/register" className="inline-flex items-center justify-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-sm tracking-widest uppercase hover:bg-slate-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)]">
              Create Free Workspace <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER PRIORITIES */}
      <footer className="bg-black text-slate-400 py-12 border-t border-slate-800 text-sm">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 relative opacity-70 hover:opacity-100 transition-opacity">
                <Image src="/images/logo-dark.png" alt="Logo" fill className="object-contain filter invert" />
              </div>
              <span className="serif-headline text-white tracking-wide">Attendly</span>
            </Link>
            <p className="text-xs leading-relaxed max-w-xs">
              <strong>Head Office:</strong> Aykarapadi, Malappuram, Kerala, India.<br/>
              Developed & Maintained by Founder: <strong>Sharafath</strong>
            </p>
          </div>
          <div className="flex flex-col md:items-end gap-3 text-xs">
            <p className="font-bold text-white uppercase tracking-widest mb-1">Direct Operational Links</p>
            <a href="mailto:trueattendly@gmail.com" className="hover:text-white transition-colors flex items-center gap-2"><Mail size={14}/> trueattendly@gmail.com</a>
            <a href="#" className="hover:text-white transition-colors flex items-center gap-2"><Phone size={14}/> +91 Business Line</a>
            <a href="#" className="hover:text-white transition-colors flex items-center gap-2"><MessageCircle size={14}/> WhatsApp Help Desk</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-[10px] tracking-widest uppercase">
          <p>© {new Date().getFullYear()} True Attendly Broadcast. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
