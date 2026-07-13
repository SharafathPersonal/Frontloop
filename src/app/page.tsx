'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { APP_VERSION } from '@/lib/config';
import {
  Phone, MessageCircle, XCircle, CheckCircle, ArrowRight, Mail,
  Smartphone, ShieldCheck, Bot, Contact, Zap, Wand2, Upload,
  Image as ImageIcon, AlertTriangle, X, Search, Loader2, Plus,
  Trash2, Download, Eye, Check, RefreshCw, HelpCircle, ArrowUpRight,
  Settings, ChevronRight, Copy, Database, FileText, Lock, Sparkles,
  CreditCard, TrendingUp, Sliders, Layers
} from 'lucide-react';


// Preset Shop Branding Colors for Demo
const BRAND_PRESET_COLORS = [
  { name: 'Classic Amber', hex: '#B45309', bg: 'bg-amber-700' },
  { name: 'Emerald Forest', hex: '#047857', bg: 'bg-emerald-700' },
  { name: 'Imperial Crimson', hex: '#B91C1C', bg: 'bg-red-700' },
  { name: 'Sleek Indigo', hex: '#4338CA', bg: 'bg-indigo-700' },
  { name: 'Charcoal Noir', hex: '#374151', bg: 'bg-gray-700' }
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);


  // ──────────────────────────────────────────────────────────────────
  // 1. DYNAMIC PREVIEW & POS TERMINAL STATE
  // ──────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState([
    { id: 1, name: 'Pure Cotton Summer Shirt', price: 1299, qty: 1 },
    { id: 2, name: 'Organic Linen Trousers', price: 1899, qty: 1 }
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [qrTotal, setQrTotal] = useState(3198); // Matches subtotal initially
  const [brandColor, setBrandColor] = useState('#B45309');
  const [selectedPresetColor, setSelectedPresetColor] = useState('#B45309');
  const [invoiceFooterNote, setInvoiceFooterNote] = useState('Thank you for visiting! Please come again. ✨');
  const [showBillModal, setShowBillModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  // Add Item to POS Cart
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price <= 0) return;

    const newId = cart.length > 0 ? Math.max(...cart.map(i => i.id)) + 1 : 1;
    setCart([...cart, { id: newId, name: newItemName, price, qty: 1 }]);
    setNewItemName('');
    setNewItemPrice('');
    triggerScanFlash();
  };

  const triggerScanFlash = () => {
    setScanSuccess(true);
    setTimeout(() => setScanSuccess(false), 800);
  };

  const removeItem = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // ──────────────────────────────────────────────────────────────────
  // 2. AI TEMPLATE POLISHER STATE
  // ──────────────────────────────────────────────────────────────────
  const [roughText, setRoughText] = useState('hey buyer we got new clothes in our shop 20% discount if you visit this sunday');
  const [polishedOutput, setPolishedOutput] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);

  const handlePolishText = () => {
    setIsPolishing(true);
    setPolishedOutput('');
    setTimeout(() => {
      setIsPolishing(false);
      setPolishedOutput(
        `Hi {{1}}! Exclusive new collections are now available at {{2}}. Enjoy an exclusive 20% privilege savings when you visit us this Sunday. View Catalog: {{3}} 🌿`
      );
    }, 1200);
  };

  // ──────────────────────────────────────────────────────────────────
  // 3. COHORT EMAIL CAMPAIGN STATE
  // ──────────────────────────────────────────────────────────────────
  const [emailSubject, setEmailSubject] = useState('🎁 Private Access: 20% Off Our New Collection');
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>(['DIGITAL_BILL', 'VIP']);
  const cohortCounts: Record<string, number> = {
    'DIGITAL_BILL': 1240,
    'VIP': 650,
    'NEW': 420,
    'REGULAR': 890
  };

  const toggleCohort = (cohort: string) => {
    if (selectedCohorts.includes(cohort)) {
      setSelectedCohorts(selectedCohorts.filter(c => c !== cohort));
    } else {
      setSelectedCohorts([...selectedCohorts, cohort]);
    }
  };

  // 1 Wallet Credit per Email (Standard platform parameter)
  const totalEmailsCount = selectedCohorts.reduce((sum, c) => sum + (cohortCounts[c] || 0), 0);
  const creditsDeducted = totalEmailsCount * 1; // 1 credit per email dispatch

  // ──────────────────────────────────────────────────────────────────
  // 4. DUAL-STATE TRANSACTION LEDGER (infinite cursor simulation)
  // ──────────────────────────────────────────────────────────────────
  const [activeLedgerTab, setActiveLedgerTab] = useState<'purchases' | 'usages'>('usages');
  const [ledgerUsages, setLedgerUsages] = useState<any[]>([]);
  const [isLoadingMoreUsages, setIsLoadingMoreUsages] = useState(false);
  const [hasMoreUsages, setHasMoreUsages] = useState(true);

  // Initial 20 records for usages cursor matrix (strict 20-row cursor matrix)
  const generateInitialUsages = () => [
    { id: 'u-1', type: 'Digital Invoice Dispatch', desc: 'INV-1002', date: 'Just now', credits: '1.0 Credit', status: 'delivered' },
    { id: 'u-2', type: 'WhatsApp Campaign', desc: 'Weekend Feast BOGO Launch', date: '12 mins ago', credits: '1,420.0 Credits', status: 'delivered' },
    { id: 'u-3', type: 'Email Marketing', desc: 'Eid Collection VIP Drop', date: '45 mins ago', credits: '650.0 Credits', status: 'delivered' },
    { id: 'u-4', type: 'Digital Invoice Dispatch', desc: 'INV-1001', date: '1 hour ago', credits: '1.0 Credit', status: 'delivered' },
    { id: 'u-5', type: 'WhatsApp Campaign', desc: 'VIP Special Cohort A', date: '2 hours ago', credits: '310.0 Credits', status: 'delivered' },
    { id: 'u-6', type: 'Email Marketing', desc: 'Weekly Retention Newsletter v2.1', date: '4 hours ago', credits: '890.0 Credits', status: 'delivered' },
    { id: 'u-7', type: 'Digital Invoice Dispatch', desc: 'INV-1000', date: '6 hours ago', credits: '1.0 Credit', status: 'delivered' },
    { id: 'u-8', type: 'WhatsApp Campaign', desc: 'Flash Sale Alert Segment B', date: '8 hours ago', credits: '500.0 Credits', status: 'delivered' },
    { id: 'u-9', type: 'Email Marketing', desc: 'Welcome Series Cohort New Users', date: '12 hours ago', credits: '420.0 Credits', status: 'delivered' },
    { id: 'u-10', type: 'Digital Invoice Dispatch', desc: 'INV-0999', date: '14 hours ago', credits: '1.0 Credit', status: 'delivered' },
    { id: 'u-11', type: 'WhatsApp Campaign', desc: 'Mid-Season Clearance Sale', date: '1 day ago', credits: '850.0 Credits', status: 'delivered' },
    { id: 'u-12', type: 'Email Marketing', desc: 'Product Restock Alert', date: '1 day ago', credits: '1,240.0 Credits', status: 'delivered' },
    { id: 'u-13', type: 'Digital Invoice Dispatch', desc: 'INV-0998', date: '1 day ago', credits: '1.0 Credit', status: 'delivered' },
    { id: 'u-14', type: 'WhatsApp Campaign', desc: 'Festival Special Promo', date: '2 days ago', credits: '920.0 Credits', status: 'delivered' },
    { id: 'u-15', type: 'Email Marketing', desc: 'Abandoned Cart Recovery Loop', date: '2 days ago', credits: '15.0 Credits', status: 'delivered' },
    { id: 'u-16', type: 'Digital Invoice Dispatch', desc: 'INV-0997', date: '2 days ago', credits: '1.0 Credit', status: 'delivered' },
    { id: 'u-17', type: 'WhatsApp Campaign', desc: 'Loyalty Tier Top Up Broadcast', date: '3 days ago', credits: '200.0 Credits', status: 'delivered' },
    { id: 'u-18', type: 'Email Marketing', desc: 'Re-engagement Cohort D', date: '3 days ago', credits: '180.0 Credits', status: 'delivered' },
    { id: 'u-19', type: 'Digital Invoice Dispatch', desc: 'INV-0996', date: '3 days ago', credits: '1.0 Credit', status: 'delivered' },
    { id: 'u-20', type: 'WhatsApp Campaign', desc: 'Weekend Special Coupon Loop', date: '4 days ago', credits: '350.0 Credits', status: 'delivered' },
  ];

  useEffect(() => {
    setLedgerUsages(generateInitialUsages());
  }, []);

  const handleLoadMoreUsages = () => {
    if (isLoadingMoreUsages || !hasMoreUsages) return;
    setIsLoadingMoreUsages(true);

    setTimeout(() => {
      const nextBatch = [
        { id: 'u-21', type: 'Digital Invoice Dispatch', desc: 'INV-0995', date: '5 days ago', credits: '1.0 Credit', status: 'delivered' },
        { id: 'u-22', type: 'Email Marketing', desc: 'Holiday Collection Announcement', date: '6 days ago', credits: '1,420.0 Credits', status: 'delivered' },
        { id: 'u-23', type: 'WhatsApp Campaign', desc: 'Store Anniversary VIP Invite', date: '1 week ago', credits: '650.0 Credits', status: 'delivered' },
        { id: 'u-24', type: 'Digital Invoice Dispatch', desc: 'INV-0994', date: '1 week ago', credits: '1.0 Credit', status: 'delivered' },
        { id: 'u-25', type: 'WhatsApp Campaign', desc: 'Black Friday Broadcast Opt-in', date: '1 week ago', credits: '2,200.0 Credits', status: 'delivered' },
      ];
      setLedgerUsages(prev => [...prev, ...nextBatch]);
      setIsLoadingMoreUsages(false);
      setHasMoreUsages(false); // End of demo list
    }, 1500);
  };

  // Mock Cashfree Topup Logs (Tab A)
  const cashfreeLogs = [
    { id: 'CF-TXN-90231', date: 'Jul 12, 2026', tokens: '10,000 Tokens', amount: '₹10,000.00', status: 'Success' },
    { id: 'CF-TXN-88421', date: 'Jun 28, 2026', tokens: '5,000 Tokens', amount: '₹5,000.00', status: 'Success' },
    { id: 'CF-TXN-85102', date: 'May 15, 2026', tokens: '10,000 Tokens', amount: '₹10,000.00', status: 'Success' },
    { id: 'CF-TXN-81190', date: 'Apr 02, 2026', tokens: '2,500 Tokens', amount: '₹2,500.00', status: 'Success' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // 5. SECURITY BARRIER: MANDATORY MULTI-CLICK POPUP STATE
  // ──────────────────────────────────────────────────────────────────
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [securityClickCount, setSecurityClickCount] = useState(0);
  const [securityPayloadType, setSecurityPayloadType] = useState<'email' | 'whatsapp'>('email');
  const [dispatchStatus, setDispatchStatus] = useState<'idle' | 'broadcasting' | 'completed'>('idle');

  const triggerSecurityModal = (type: 'email' | 'whatsapp') => {
    setSecurityPayloadType(type);
    setSecurityModalOpen(true);
    setSecurityClickCount(0);
    setDispatchStatus('idle');
  };

  const handleSecurityVerification = () => {
    if (securityClickCount === 0) {
      setSecurityClickCount(1);
    } else if (securityClickCount === 1) {
      setSecurityClickCount(2);
      setDispatchStatus('broadcasting');

      // Simulate broadcast loop
      setTimeout(() => {
        setDispatchStatus('completed');
        // Add new usage to top of ledger view to show live sync
        const newRecord = {
          id: `u-new-${Date.now()}`,
          type: securityPayloadType === 'email' ? 'Email Marketing' : 'WhatsApp Campaign',
          desc: securityPayloadType === 'email' ? emailSubject : 'AI Polished Custom Broadcast',
          date: 'Just now',
          credits: securityPayloadType === 'email' ? `${creditsDeducted.toLocaleString()}.0 Credits` : '1,240.0 Credits',
          status: 'delivered'
        };
        setLedgerUsages(prev => [newRecord, ...prev]);
        setTimeout(() => {
          setSecurityModalOpen(false);
          setSecurityClickCount(0);
        }, 1500);
      }, 2000);
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // 6. ANTI-BAN SPINTAX ENGINE STATE
  // ──────────────────────────────────────────────────────────────────
  const [spintaxInput, setSpintaxInput] = useState('{Hello|Hi|Hey} customer! {Thanks|Thank you} for visiting us today.');
  const [spintaxVariations, setSpintaxVariations] = useState<string[]>([]);
  const [simulatedDelay, setSimulatedDelay] = useState(0);

  const generateSpintaxVariations = () => {
    const regex = /\{([^}]+)\}/g;
    const variants: string[] = [];

    for (let i = 0; i < 3; i++) {
      let output = spintaxInput;
      let match;

      // Simple parse for demo
      while ((match = regex.exec(spintaxInput)) !== null) {
        const choices = match[1].split('|');
        const selected = choices[Math.floor(Math.random() * choices.length)];
        output = output.replace(match[0], selected);
      }

      // If no spintax brackets matched, add generic response
      if (output === spintaxInput) {
        output = `${output} [Variant ${i + 1}]`;
      }
      variants.push(output);
    }

    setSpintaxVariations(variants);
    setSimulatedDelay(Math.floor(Math.random() * 8) + 5); // 5 to 12-second intervals
  };

  useEffect(() => {
    generateSpintaxVariations();
  }, [spintaxInput]);

  // ──────────────────────────────────────────────────────────────────
  // 7. UNIFIED MANIFEST PARSER STATE (CSV/Excel Drag & Drop)
  // ──────────────────────────────────────────────────────────────────
  const [csvStatus, setCsvStatus] = useState<'idle' | 'uploading' | 'parsed'>('idle');
  const [parsedRowsCount, setParsedRowsCount] = useState(0);
  const [parsedContacts, setParsedContacts] = useState<any[]>([]);

  const handleSimulatedCsvUpload = () => {
    setCsvStatus('uploading');
    setTimeout(() => {
      setCsvStatus('parsed');
      setParsedRowsCount(6);
      setParsedContacts([
        { name: 'K. Sharafath', rawPhone: '916282560928', maskedPhone: '+91 62825 ••••8', status: 'DIGITAL_BILL' },
        { name: 'A. Rahul', rawPhone: '919876543210', maskedPhone: '+91 98765 ••••0', status: 'DIGITAL_BILL' },
        { name: 'M. Priya', rawPhone: '918887776660', maskedPhone: '+91 88877 ••••0', status: 'DIGITAL_BILL' },
        { name: 'John Doe', rawPhone: '917776665552', maskedPhone: '+91 77766 ••••2', status: 'DIGITAL_BILL' },
        { name: 'Fathima R.', rawPhone: '919445556661', maskedPhone: '+91 94455 ••••1', status: 'DIGITAL_BILL' },
        { name: 'S. Suresh', rawPhone: '919998887774', maskedPhone: '+91 99988 ••••4', status: 'DIGITAL_BILL' },
      ]);
    }, 1500);
  };

  // ──────────────────────────────────────────────────────────────────
  // LENIS & GSAP INTEGRATION
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let lenis: import('lenis').default | null = null;

    async function initAnimations() {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);

      gsap.registerPlugin(ScrollTrigger);

      // Smooth scroll (Lenis)
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis?.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }

      // Header scrolled state
      const header = headerRef.current;
      if (header) {
        ScrollTrigger.create({
          start: 40,
          onEnter: () => {
            header.classList.add('header-scrolled');
            setIsScrolled(true);
          },
          onLeaveBack: () => {
            header.classList.remove('header-scrolled');
            setIsScrolled(false);
          },
        });
      }

      // Hero entrance animations
      if (heroRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const heroEls = heroRef.current.querySelectorAll('.hero-animate');
        gsap.from(heroEls, {
          opacity: 0,
          y: 35,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          delay: 0.1,
        });
      }

      // Section scroll reveals
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

  // Preset Color selection trigger
  const selectPresetColor = (hex: string) => {
    setSelectedPresetColor(hex);
    setBrandColor(hex);
  };

  const handleDownloadBill = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      alert(`INV-1002-BILL.pdf downloaded successfully! (Simulated PDF download path with custom color config: ${brandColor})`);
    }, 1500);
  };

  return (
    <main className="w-full max-w-full min-h-screen overflow-x-hidden relative text-slate-800 antialiased bg-[#F5F1EA]">
      {/* ── Injected header scrolled styles ─────────────────────── */}
      <style jsx global>{`
        .header-scrolled {
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(12px) !important;
          box-shadow: 0 1px 0 #E8E3DA !important;
        }
        .header-scrolled .nav-link-light {
          color: #3E3B36 !important;
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
            <span className="brand-text serif-headline text-white text-base transition-colors duration-300">
              True Attendly
            </span>
          </Link>

          {/* Center Nav (desktop only) */}
          <nav className="hidden md:flex items-center gap-8">
            {['Engines', 'Ledger', 'Comparison', 'Deep Dive'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="nav-link-light text-xs tracking-[0.2em] text-white/80 hover:text-white uppercase transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="signin-link text-xs tracking-[0.2em] text-white/80 hover:text-white uppercase transition-colors duration-200"
            >
              Sign In →
            </Link>
            <Link
              href="/auth/register"
              className="hidden sm:inline-flex bg-[#C4A896] hover:bg-[#b09380] text-white text-[10px] tracking-[0.15em] font-bold uppercase px-4 py-2 rounded transition-colors"
            >
              Create Free Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2 — HERO SECTION & MARKETING HOOK
      ══════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="w-full relative flex flex-col justify-center pt-24 pb-16 lg:pt-36 lg:pb-32 bg-[#3E3B36] text-white"
      >
        {/* Decorative Grid Layer */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        {/* Ambient Glows */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            background: `
              radial-gradient(circle 800px at 70% 30%, rgba(196, 168, 150, 0.18) 0%, transparent 80%),
              radial-gradient(circle 600px at 20% 80%, rgba(139, 123, 168, 0.1) 0%, transparent 80%)
            `,
          }}
        />

        <div className="relative max-w-[90rem] mx-auto px-6 w-full mt-8 lg:mt-12">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 items-center">
            
            {/* Left side copy details */}
            <div className="xl:col-span-4 space-y-6 z-10 text-left">
              {/* Badges Stack */}
              <div className="hero-animate flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold tracking-wider text-[#C4A896] bg-amber-950/40 border border-[#C4A896]/35 px-3.5 py-1.5 rounded-full">
                  <ShieldCheck size={12} className="text-[#C4A896]" />
                  Official Meta API Mode · 0% Ban Risk. Verified Broadcasts to GST Brands.
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold tracking-wider text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 px-3.5 py-1.5 rounded-full">
                  <Smartphone size={12} className="text-emerald-300" />
                  Dynamic Mobile POS · Light-speed QR checkout codes.
                </span>
              </div>

              {/* Headline */}
              <h1 className="hero-animate serif-headline text-3xl sm:text-4xl lg:text-5xl font-light text-white leading-[1.15] tracking-tight">
                Stop Wasting Fortune on Rigid Billing Software &amp; Thermal Paper Rolls.
                <span className="block font-medium text-[#C4A896] mt-2">Turn Any Smartphone into a Smart POS &amp; WhatsApp Billing Terminal Instantly!</span>
              </h1>

              {/* ✨ NEW V3.12 Flash Offer Micro-Badge */}
              <div className="hero-animate pt-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#C4A896] bg-amber-950/45 border border-[#C4A896]/35 px-4 py-2 rounded-lg shadow-sm animate-pulse">
                  ✨ NEW V3.12: Frictionless In-Store Flash Offers — Turn Foot Traffic into Impulse Sales Instantly.
                </span>
              </div>

              {/* Sub-Headline */}
              <p className="hero-animate text-sm sm:text-base text-neutral-300 leading-relaxed max-w-xl">
                Eliminate checkout friction. Capture 100% of walk-in store traffic, deliver premium custom-themed digital bills straight to customer WhatsApp threads with absolute zero-ban risk, and run hyper-targeted omnichannel promotions from one unified wallet ledger.
              </p>

              {/* Action CTAs */}
              <div className="hero-animate flex flex-wrap items-center gap-4 pt-4">
                <Link
                  href="/auth/register"
                  className="btn-primary rounded-sm shadow-xl shadow-amber-950/20 hover:scale-[1.02] transition-transform duration-300 border border-[#C4A896]/20 font-bold uppercase tracking-wider text-[10px] px-5 py-3.5"
                >
                  Create Free Workspace
                </Link>
                <a
                  href="#flash-offers-tech-engine"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('flash-offers-tech-engine')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-[#C4A896]/15 hover:bg-[#C4A896]/25 border border-[#C4A896]/30 text-white rounded-sm font-bold uppercase tracking-wider text-[10px] px-5 py-3.5 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  See Live In-Store Demo
                </a>
                <a
                  href="#engines"
                  className="btn-secondary-dark rounded-sm hover:bg-white/5 transition-colors font-bold uppercase tracking-wider text-[10px] px-5 py-3.5"
                >
                  Explore Architecture
                </a>
              </div>
            </div>

            {/* Right side live interactive emulator playground */}
            <div className="xl:col-span-8 hero-animate w-full flex flex-col md:flex-row gap-6 relative">
              
              {/* VISUAL BOX 1: Cashier Terminal Interface */}
              <div className="flex-1 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[520px]">
                
                {/* POS Header */}
                <div className="bg-[#3E3B36] text-white px-4 py-3 flex items-center justify-between border-b border-slate-700 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                    <span className="text-[10px] font-bold tracking-widest uppercase">POS Terminal v3.11</span>
                  </div>
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">ST-INBOUND-01</span>
                </div>

                {/* Simulated Barcode Scanning active viewfinder */}
                <div className="relative h-28 bg-slate-900 overflow-hidden flex items-center justify-center shrink-0 border-b border-slate-200">
                  <div className={`absolute inset-0 bg-emerald-500/10 transition-opacity duration-300 ${scanSuccess ? 'opacity-100' : 'opacity-0'}`} />
                  
                  {/* Viewfinder borders */}
                  <div className="absolute w-36 h-16 border-2 border-dashed border-emerald-400/60 rounded-md flex items-center justify-center">
                    <span className="text-[9px] text-emerald-400 font-mono tracking-widest uppercase animate-pulse">Barcode Active</span>
                  </div>

                  {/* Red Laser scan animation */}
                  <div className="absolute left-0 right-0 h-[1.5px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] animate-bounce" />

                  {/* Scan overlay text */}
                  <span className="absolute bottom-2 text-[8px] text-slate-400 font-mono">Hold barcode close to camera</span>
                </div>

                {/* Items in Cart */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FCFBF9]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Active Cart items</h3>
                    <span className="text-xs font-bold text-slate-700">{cart.length} Products</span>
                  </div>

                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500">Qty: {item.qty} × ₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-800">₹{item.price * item.qty}</span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {cart.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400 italic">Cart is empty. Add a product below to trigger QR.</div>
                    )}
                  </div>

                  {/* Cart Form inputs to add custom products */}
                  <form onSubmit={handleAddItem} className="pt-2 border-t border-slate-200/60 flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-[#C4A896]"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="w-16 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-[#C4A896]"
                    />
                    <button
                      type="submit"
                      className="bg-[#3E3B36] hover:bg-[#C4A896] text-white p-2 rounded transition-colors shrink-0"
                    >
                      <Plus size={12} />
                    </button>
                  </form>
                </div>

                {/* Dynamic Counter QR Code mapping real-time pricing states */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Real-time checkout billing</p>
                    <p className="text-xs text-slate-500 mt-0.5">Subtotal: <span className="font-semibold text-slate-700">₹{subtotal}</span></p>
                    <p className="text-[10px] text-slate-500">GST (18%): <span className="font-semibold text-slate-700">₹{gst}</span></p>
                    <p className="text-sm font-bold text-[#3E3B36] mt-0.5">Total: ₹{total}</p>
                  </div>
                  
                  {/* Interactive Dynamic QR output representation */}
                  <div className="relative p-2 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col items-center shrink-0">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800">
                      <rect x="3" y="3" width="6" height="6" rx="1" />
                      <rect x="15" y="3" width="6" height="6" rx="1" />
                      <rect x="3" y="15" width="6" height="6" rx="1" />
                      <path d="M16 16h2v2h-2zm4 0h1v1h-1zm-2 4h3v1h-3zm-2-2h1v1h-1zm2 1h1v1h-1z" />
                      {/* Dynamic dot shifting based on total to simulate price state maps */}
                      <circle cx={10 + (total % 4)} cy={10 + (total % 4)} r="1.5" fill="#C4A896" stroke="none" />
                      <rect x="9" y="3" width="3" height="3" fill="currentColor" stroke="none" />
                      <rect x="3" y="10" width="3" height="3" fill="currentColor" stroke="none" />
                    </svg>
                    <span className="text-[7px] font-bold text-[#C4A896] uppercase tracking-wider mt-1">Scan for bill</span>
                  </div>
                </div>

              </div>

              {/* VISUAL BOX 2: Customer Device Inbox Emulation */}
              <div className="flex-1 bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl border-[6px] border-slate-800 h-[520px] flex flex-col relative overflow-hidden">
                {/* Phone Speaker notch */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-800 rounded-b-xl z-20" />
                
                {/* WhatsApp Chat header */}
                <div className="bg-[#075e54] text-white pt-6 pb-2.5 px-4 flex items-center gap-2 shrink-0 z-10">
                  <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                    S
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">True Broadcast Store</p>
                    <p className="text-[8px] text-emerald-200/90 tracking-wide">verified business account</p>
                  </div>
                </div>

                {/* Chat feed */}
                <div className="flex-1 bg-[#ece5dd] p-3 flex flex-col gap-3 overflow-y-auto"
                     style={{ backgroundImage: 'radial-gradient(#d1cbbd 1px, transparent 1px)', backgroundSize: '12px 12px' }}>
                  
                  {/* Inbound Text Trigger */}
                  <div className="self-end bg-[#dcf8c6] max-w-[85%] rounded-lg rounded-tr-none px-3 py-1.5 shadow-sm text-xs border border-emerald-100 mt-2">
                    <p className="text-slate-800">✨ Get my Bill INV-1002</p>
                    <span className="text-[8px] text-slate-500 float-right mt-1 ml-2">19:08</span>
                  </div>

                  {/* Outbound Response PDF Attachment & Preview */}
                  <div className="self-start bg-white max-w-[90%] rounded-lg rounded-tl-none p-2.5 shadow-sm border-l-4 mt-1 transition-all duration-300 w-full"
                       style={{ borderColor: brandColor }}>
                    
                    {/* PDF Document Row */}
                    <div className="flex items-center gap-3 mb-2 pb-2 border-b border-slate-100">
                      <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center shrink-0 border border-rose-100">
                        <FileText size={18} className="text-rose-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-800 truncate">INV-1002-BILL.pdf</p>
                        <p className="text-[9px] text-slate-500">142 KB • PDF Document</p>
                      </div>
                      <Download size={14} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0" onClick={handleDownloadBill} />
                    </div>

                    {/* Dynamic Brand Accent Theme Frame Preview */}
                    <div className="border rounded p-2 text-[10px] bg-slate-50" style={{ borderColor: `${brandColor}30` }}>
                      <div className="flex justify-between items-center border-b pb-1 mb-1 font-bold text-slate-700" style={{ borderBottomColor: `${brandColor}20` }}>
                        <div className="relative w-14 h-4 flex-shrink-0">
                          <Image
                            src="/images/logo-dark.png"
                            alt="Shop Logo"
                            fill
                            sizes="56px"
                            className="object-contain object-left"
                          />
                        </div>
                        <span>INV-1002</span>
                      </div>
                      <div className="space-y-0.5 text-slate-600">
                        {cart.map(item => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.qty}x {item.name}</span>
                            <span>₹{item.price * item.qty}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-1 mt-1 flex justify-between font-bold text-slate-800" style={{ borderTopColor: `${brandColor}20` }}>
                        <span>Total (inc. GST)</span>
                        <span>₹{total}</span>
                      </div>
                    </div>

                    {/* Merchant Thank-You Custom Footer */}
                    <div className="mt-2 text-center border-t pt-2 border-slate-100">
                      <p className="text-[11px] text-slate-800 font-medium italic font-serif" style={{ color: brandColor }}>
                        "{invoiceFooterNote}"
                      </p>
                    </div>

                    {/* Platform footprint */}
                    <div className="mt-1 text-right">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Powered by True Attendly</span>
                    </div>

                    <span className="text-[8px] text-slate-500 float-right mt-1.5">19:08</span>
                  </div>

                  {/* Cashier Overrides triggers inside the workspace */}
                  <div className="flex gap-2 mt-1 self-start shrink-0 w-full max-w-[90%]">
                    <button
                      onClick={() => setShowBillModal(true)}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 shadow-sm transition-colors"
                    >
                      <Eye size={10} /> View Bill
                    </button>
                    <button
                      onClick={handleDownloadBill}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 shadow-sm transition-colors"
                    >
                      {isDownloading ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                      Download Bill
                    </button>
                  </div>
                </div>

                {/* Inline color controller to demonstrate mirroring */}
                <div className="p-3 bg-[#FCFBF9] border-t border-slate-200 shrink-0 text-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Accent Mirror</span>
                  <div className="flex gap-1.5">
                    {BRAND_PRESET_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => selectPresetColor(c.hex)}
                        className={`w-4 h-4 rounded-full border ${c.bg} transition-transform ${brandColor === c.hex ? 'scale-125 border-slate-800' : 'border-transparent hover:scale-110'}`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* VISUAL BOX 3: Live In-Store Flash Offers Customer Mockup */}
              <div className="flex-1 h-[520px] relative flex items-center justify-center">
                <Image
                  src="/images/flash-offers-mockup-new.png"
                  alt="Live In-Store Flash Offers"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain"
                  priority
                />
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3 — CORE VALUE HIGHLIGHTS: THE 3 BROADCAST ENGINES
      ══════════════════════════════════════════════════════════ */}
      <section id="engines" className="w-full py-24 px-6 bg-white scroll-reveal-section">
        <div className="max-w-6xl mx-auto">
          
          <div className="max-w-3xl mx-auto text-center mb-20 gsap-reveal">
            <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
              Tri-Channel Routing Engine
            </span>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#3E3B36] mt-4 mb-6 leading-tight">
              Three Powerful Broadcast Engines.<br />One Unified Ledged Dashboard.
            </h2>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-2xl mx-auto">
              From zero-ban counter checkout QR bills, official Meta APIs at scale, to flat-rate premium transactional email integrations. Choose your strategy, customize the theme, and launch.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* FEATURE A: Mobile POS & Digital Bill QR Engine */}
            <div className="gsap-reveal bg-[#FCFBF9] border border-[#E8E3DA] rounded-2xl p-8 flex flex-col justify-between hover:shadow-lg transition-shadow">
              <div className="space-y-6">
                {/* Header Tagline & Icon */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shadow-sm">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm tracking-wide">Feature A: Digital Bill QR Engine</h3>
                    <p className="text-[9px] text-[#C4A896] font-semibold uppercase tracking-widest mt-0.5">Zero Hardware Traps</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Eliminate legacy paper receipt printers. Generate lightning-fast mobile checkouts, delivering customized bills instantly.
                </p>

                {/* Capabilities matrix list */}
                <ul className="space-y-3.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span><strong>Zero Hardware Traps:</strong> Turn any smartphone, tablet, or device into a POS cashier terminal using forms or barcode scanner.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span><strong>Dynamic Theme Mirroring:</strong> In-app viewer and delivered PDF auto-wrap inside your custom shop logo and <code>invoice_theme_color</code> accents.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span><strong>High-Intent Whitelisting:</strong> Uses customer scans ('✨ Get my Bill') to legally auto-save numbers under the <code>DIGITAL_BILL</code> tag pipeline with 0% block risk.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span><strong>Cashier Overrides:</strong> Standalone triggers for "🔍 View Bill" (overlay modal) and "📥 Download Bill" absolute paths.</span>
                  </li>
                </ul>
              </div>

              {/* Interactive Preset styling mirroring demo widget */}
              <div className="pt-6 mt-6 border-t border-slate-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Try Theme Mirroring</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 font-bold uppercase">Dynamic</span>
                </div>
                
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold block mb-1">Invoice Footer Note Configuration</label>
                    <input
                      type="text"
                      value={invoiceFooterNote}
                      onChange={(e) => setInvoiceFooterNote(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-[10px] focus:outline-none focus:border-[#C4A896]"
                      placeholder="Thank you footer note..."
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowBillModal(true)}
                      className="flex-1 bg-[#3E3B36] hover:bg-slate-800 text-white py-1.5 px-3 rounded text-[9px] font-bold tracking-widest uppercase flex items-center justify-center gap-1 shadow-sm transition-colors"
                    >
                      <Eye size={10} /> Modal Preview
                    </button>
                    <button
                      onClick={handleDownloadBill}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-1.5 px-3 rounded text-[9px] font-bold tracking-widest uppercase flex items-center justify-center gap-1 shadow-sm transition-colors"
                    >
                      <Download size={10} /> Test Download
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* FEATURE B: Official Meta API Broadcast Tiers */}
            <div className="gsap-reveal bg-[#FCFBF9] border border-[#E8E3DA] rounded-2xl p-8 flex flex-col justify-between hover:shadow-lg transition-shadow">
              <div className="space-y-6">
                {/* Header Tagline & Icon */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm tracking-wide">Feature B: Official Meta API</h3>
                    <p className="text-[9px] text-indigo-600 font-semibold uppercase tracking-widest mt-0.5">Verified Enterprise Mode</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Broadcasting to targeted contact segments at scale with 100% compliance, zero ban risks, and instant template approvals.
                </p>

                {/* Capabilities matrix list */}
                <ul className="space-y-3.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                    <span><strong>Verified Brand Trust:</strong> Connect official Business API keys to send messages to thousands of buyers simultaneously with full compliance.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                    <span><strong>AI Template Polisher:</strong> Automatically refine rough drafts into compliant, premium marketing copies, preserving parameters like <code>{`{{1}}`}</code> and <code>{`{{2}}`}</code>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                    <span><strong>Cohort Targeting:</strong> Filter specific target audiences in PostgreSQL using array overlapping operators (<code>DIGITAL_BILL</code>, <code>VIP</code>, <code>NEW</code>).</span>
                  </li>
                </ul>
              </div>

              {/* Interactive AI Template Polisher widget */}
              <div className="pt-6 mt-6 border-t border-slate-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Template Polisher</span>
                  <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest flex items-center gap-0.5"><Wand2 size={10} /> Meta Graph</span>
                </div>
                
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={roughText}
                    onChange={(e) => setRoughText(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded text-[10px] font-mono leading-relaxed focus:outline-none focus:border-indigo-400 resize-none"
                    placeholder="Enter rough copy note..."
                  />
                  <button
                    onClick={handlePolishText}
                    disabled={isPolishing}
                    className="w-full bg-[#3E3B36] hover:bg-indigo-600 text-white py-1.5 px-3 rounded text-[9px] font-bold tracking-widest uppercase flex items-center justify-center gap-1 shadow-sm transition-colors"
                  >
                    {isPolishing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    Polish With AI
                  </button>
                  
                  {polishedOutput && (
                    <div className="p-2 bg-indigo-50 border border-indigo-100 rounded text-[10px] text-indigo-950 leading-relaxed font-medium">
                      <span className="block font-bold text-[8px] text-indigo-600 uppercase tracking-widest mb-0.5">✦ Polished (Approved Format)</span>
                      {polishedOutput}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FEATURE C: Premium Omnichannel Email Suites */}
            <div className="gsap-reveal bg-[#FCFBF9] border border-[#E8E3DA] rounded-2xl p-8 flex flex-col justify-between hover:shadow-lg transition-shadow">
              <div className="space-y-6">
                {/* Header Tagline & Icon */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100 shadow-sm">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm tracking-wide">Feature C: Premium Email Suites</h3>
                    <p className="text-[9px] text-purple-600 font-semibold uppercase tracking-widest mt-0.5">Resend Integration</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Design luxury responsive layouts, optimize cost dispatches, and trigger dynamic target list campaigns.
                </p>

                {/* Capabilities matrix list */}
                <ul className="space-y-3.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-purple-500 mt-0.5 shrink-0" />
                    <span><strong>Luxury Responsive Layouts:</strong> Beautiful, minimal corporate layouts built for maximum conversions, delivery, and high click-through rates.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-purple-500 mt-0.5 shrink-0" />
                    <span><strong>Flat-Rate Simplicity:</strong> Standardized platform economy settings: exactly 1 dynamic wallet credit deducted per successful email delivery.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-purple-500 mt-0.5 shrink-0" />
                    <span><strong>Omnichannel Tracking:</strong> Connect template configurations, monitor deliveries, and control dispatches from one central dashboard.</span>
                  </li>
                </ul>
              </div>

              {/* Interactive Email Campaign builder simulator */}
              <div className="pt-6 mt-6 border-t border-slate-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cohort Dispatch Estimator</span>
                  <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-100 rounded px-1.5 py-0.5 font-bold uppercase">1 Credit/Email</span>
                </div>
                
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold block mb-1">Subject Line</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-[10px] focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block mb-1">Select Cohorts</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.keys(cohortCounts).map((c) => (
                        <button
                          key={c}
                          onClick={() => toggleCohort(c)}
                          className={`px-2 py-1 border rounded text-[9px] font-bold transition-colors flex items-center justify-between ${selectedCohorts.includes(c) ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                          <span>{c}</span>
                          <span className="opacity-75">{cohortCounts[c]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-purple-950 text-white rounded p-2 text-[10px] shrink-0">
                    <div>
                      <p className="font-semibold text-purple-200">Credits Deducted</p>
                      <p className="text-xs font-bold">{creditsDeducted.toLocaleString()} Credits</p>
                    </div>
                    <button
                      onClick={() => triggerSecurityModal('email')}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded font-bold uppercase tracking-wider text-[8px]"
                    >
                      Dispatch Email
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4 — TRUST BUILDER: DUAL-STATE TRANSACTION TRANSPARENCY
      ══════════════════════════════════════════════════════════ */}
      <section id="ledger" className="w-full py-24 px-6 bg-[#FCFBF9] border-y border-[#E8E3DA] scroll-reveal-section">
        <div className="max-w-6xl mx-auto">
          
          <div className="max-w-2xl mx-auto text-center mb-12 gsap-reveal">
            <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
              Autonomous Wallet Ledger
            </span>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#3E3B36] mt-4 mb-4">
              Pay-As-You-Send Wallet &amp; Autonomous Ledger Control
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              No hidden fees, no subscriptions, no monthly trap locks. Monitor top-ups processed through our Cashfree Gateway and explore exact row-by-row campaign debits from our cursor ledger.
            </p>
          </div>

          <div className="max-w-4xl mx-auto gsap-reveal bg-white border border-[#E8E3DA] rounded-2xl shadow-xl overflow-hidden flex flex-col">
            
            {/* Header tab controller switch */}
            <div className="bg-[#3E3B36] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-700 shrink-0">
              <div className="flex bg-slate-800 rounded-lg p-1 w-full sm:w-auto">
                <button
                  onClick={() => setActiveLedgerTab('purchases')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition-all ${activeLedgerTab === 'purchases' ? 'bg-[#C4A896] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  <CreditCard size={12} className="inline-block mr-1.5 -mt-0.5" />
                  Tab A: Credit Purchases
                </button>
                <button
                  onClick={() => setActiveLedgerTab('usages')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition-all ${activeLedgerTab === 'usages' ? 'bg-[#C4A896] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  <TrendingUp size={12} className="inline-block mr-1.5 -mt-0.5" />
                  Tab B: Credit Usages
                </button>
              </div>

              {/* Wallet Summary metrics */}
              <div className="flex gap-4 shrink-0 text-white">
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Lifetime Investment</span>
                  <span className="text-sm font-black text-[#C4A896]">₹27,500.00</span>
                </div>
                <div className="border-l border-slate-700 pl-4 text-right">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Total Vaulted Tokens</span>
                  <span className="text-sm font-black text-white">27,500 Credits</span>
                </div>
              </div>
            </div>

            {/* TAB A Content: Cashfree Topup Logs */}
            {activeLedgerTab === 'purchases' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead className="bg-slate-50 border-b border-[#E8E3DA] text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="p-4">Transaction ID</th>
                      <th className="p-4">Top-Up Date</th>
                      <th className="p-4">Tokens Credited</th>
                      <th className="p-4">Total Amount (INR)</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {cashfreeLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-800">{log.id}</td>
                        <td className="p-4">{log.date}</td>
                        <td className="p-4 font-semibold text-slate-800">{log.tokens}</td>
                        <td className="p-4 font-semibold text-slate-800">{log.amount}</td>
                        <td className="p-4">
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-200">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-6 bg-slate-50/50 text-center border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verified by Cashfree payments global API webhook secure integration</p>
                </div>
              </div>
            )}

            {/* TAB B Content: Dynamic usage logs with cursor-based infinite scroll */}
            {activeLedgerTab === 'usages' && (
              <div>
                <div className="overflow-x-auto max-h-[360px] overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs min-w-[600px]">
                    <thead className="bg-slate-50 border-b border-[#E8E3DA] text-slate-500 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10">
                      <tr>
                        <th className="p-4 bg-slate-50">Operational Usage Type</th>
                        <th className="p-4 bg-slate-50">Reference Title/ID</th>
                        <th className="p-4 bg-slate-50">Date</th>
                        <th className="p-4 bg-slate-50 text-right">Credits Deducted</th>
                        <th className="p-4 bg-slate-50 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {ledgerUsages.map((usage) => (
                        <tr key={usage.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${usage.type === 'WhatsApp Campaign' ? 'bg-emerald-500' : usage.type === 'Email Marketing' ? 'bg-purple-500' : 'bg-amber-600'}`} />
                            {usage.type}
                          </td>
                          <td className="p-4 font-mono font-medium text-slate-800">{usage.desc}</td>
                          <td className="p-4 text-slate-500">{usage.date}</td>
                          <td className="p-4 text-right font-bold text-slate-800">{usage.credits}</td>
                          <td className="p-4 text-center">
                            <span className="bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">
                              {usage.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cursor Infinite scroll load more actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Showing {ledgerUsages.length} ledger logs
                  </span>

                  {hasMoreUsages ? (
                    <button
                      onClick={handleLoadMoreUsages}
                      disabled={isLoadingMoreUsages}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      {isLoadingMoreUsages ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          Loading cursor page...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={10} />
                          Load More Transactions
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Cursor reached end of ledger view (20+ Rows loaded)
                    </span>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Core ledger informational banner */}
          <div className="gsap-reveal flex justify-center mt-12">
            <div className="inline-flex items-center gap-3 bg-white border border-[#E8E3DA] rounded-full px-5 py-2.5 shadow-sm">
              <span className="flex h-2 w-2 relative flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C4A896] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C4A896]"></span>
              </span>
              <p className="text-[10px] sm:text-xs font-semibold tracking-wide text-[#3E3B36] uppercase text-left">
                Security Ledger: Inbound whitelisting ensures only opt-in customers are saved, safeguarding your official line.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 5 — PERSUASION REVERSAL: THE RETAIL REALITY CHECK
      ══════════════════════════════════════════════════════════ */}
      <section id="comparison" className="w-full py-24 px-6 bg-white scroll-reveal-section">
        <div className="max-w-6xl mx-auto">
          
          <div className="max-w-2xl mx-auto text-center mb-16 gsap-reveal">
            <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
              The Reality Check
            </span>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#3E3B36] mt-4 mb-4">
              Why Legacy Checkout is Hurting Your Retail Sales
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              We compared traditional, paper-based billing layouts against the True Attendly digital broadcast pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto gsap-reveal">
            
            {/* The Daily Struggle block */}
            <div className="bg-[#FCFBF9] border border-red-200/60 rounded-2xl p-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-100 shrink-0">
                    <XCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">The Daily Retail Struggle</h3>
                    <p className="text-[9px] text-red-500 font-semibold uppercase tracking-widest mt-0.5">High Costs &amp; Friction</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Merchants waste fortunes on expensive thermal paper rolls and remain chained to rigid, legacy PC-based billing systems that slow down checkout queues, while customers refuse to share phone numbers due to privacy friction.
                </p>

                <ul className="space-y-3 text-xs text-slate-500 border-t border-slate-200/60 pt-4">
                  <li className="flex items-center gap-2">
                    <X size={12} className="text-red-400 shrink-0" />
                    <span>Costly thermal rolls and PC printer maintenance traps.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <X size={12} className="text-red-400 shrink-0" />
                    <span>Customers refuse to spell phone numbers in long public queues.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <X size={12} className="text-red-400 shrink-0" />
                    <span>Zero mechanism to contact buyers or drive repeat sales.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <X size={12} className="text-red-400 shrink-0" />
                    <span>Constant monthly subscription traps for rigid bulk tools.</span>
                  </li>
                </ul>
              </div>
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest pt-6 block border-t border-slate-100 mt-6">Inefficient Checkout System</span>
            </div>

            {/* True Attendly Advantage block */}
            <div className="bg-[#3E3B36] text-white rounded-2xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#C4A896]/15 rounded-bl-full pointer-events-none" />
              
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-300 rounded-xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">The True Attendly Advantage</h3>
                    <p className="text-[9px] text-emerald-300 font-semibold uppercase tracking-widest mt-0.5">100% Frictionless Capture</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  One quick billing screen scan logs the lead, delivers an interactive custom invoice, auto-saves the merchant profile details, and legally whitelists the connection with absolute zero monthly subscription traps.
                </p>

                <ul className="space-y-3 text-xs text-slate-200 border-t border-slate-700 pt-4">
                  <li className="flex items-center gap-2">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span>Zero paper hardware. Turn any smartphone or tablet into a billing term.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span>Opt-in whitelisting automatically whitelists the customer profile details.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span>Tag pipeline saves buyer records under <code>DIGITAL_BILL</code> segment.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span>No subscription locks. Purchase credits on a flexible pre-paid basis.</span>
                  </li>
                </ul>
              </div>
              <span className="text-[8.5px] font-bold text-[#C4A896] uppercase tracking-widest pt-6 block border-t border-slate-700 mt-6">Next-gen Mobile Billing Onboarding</span>
            </div>

          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 6 — SYSTEM PLATFORM DEEP DIVE & INFRASTRUCTURE MATRIX
      ══════════════════════════════════════════════════════════ */}
      <section id="deep-dive" className="w-full py-24 px-6 bg-[#FCFBF9] border-t border-[#E8E3DA] scroll-reveal-section">
        <div className="max-w-6xl mx-auto">
          
          <div className="max-w-2xl mx-auto text-center mb-16 gsap-reveal">
            <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
              Engineering Matrix
            </span>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#3E3B36] mt-4 mb-4">
              Advanced System Architecture
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Explore the system modules built to protect numbers, formatting datasets, and secure responsive layouts under zero Cumulative Layout Shift layout limits.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto gsap-reveal">
            
            {/* Anti-Ban Spintax Engine */}
            <div className="bg-white border border-[#E8E3DA] rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Sliders size={18} className="text-[#C4A896] shrink-0" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Anti-Ban Spintax Engine</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Automatic parsing of unique message string variations (<code>{`"{Hello|Hi|Hey}"`}</code>) reinforced by randomized human-like dispatch throttling delays (5 to 12-second intervals).
                </p>

                <div className="space-y-2 border-t pt-4 border-slate-100">
                  <label className="text-[9px] text-slate-400 font-bold block">Spintax template input</label>
                  <input
                    type="text"
                    value={spintaxInput}
                    onChange={(e) => setSpintaxInput(e.target.value)}
                    className="w-full p-2 bg-[#FCFBF9] border border-slate-200 rounded text-[10px] font-mono focus:outline-none focus:border-[#C4A896]"
                  />
                  
                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-widest">Simulated Output Variations</span>
                    {spintaxVariations.map((v, i) => (
                      <div key={i} className="p-1.5 bg-slate-50 border border-slate-200 rounded text-[9.5px] font-mono text-slate-700 truncate">
                        {v}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest shrink-0">
                <span>Random Throttling Delay</span>
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">{simulatedDelay} Seconds</span>
              </div>
            </div>

            {/* Unified Manifest Parsers */}
            <div className="bg-white border border-[#E8E3DA] rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Database size={18} className="text-[#C4A896] shrink-0" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Unified Manifest Parsers</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Serverless-safe Excel/CSV ingest algorithms masking raw phone formats via 10-digit regex filters to protect privacy and filter anomalies.
                </p>

                {/* CSV Uploader Simulator */}
                <div className="border-t pt-4 border-slate-100 space-y-3">
                  {csvStatus === 'idle' && (
                    <div
                      onClick={handleSimulatedCsvUpload}
                      className="border-2 border-dashed border-slate-200 hover:border-[#C4A896] rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#FCFBF9]"
                    >
                      <Upload size={20} className="mx-auto text-slate-400 mb-2 animate-bounce" />
                      <span className="text-[9px] text-slate-600 block font-bold uppercase tracking-wider">Drop excel/csv here</span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">Click to simulate auto-parse &amp; clean</span>
                    </div>
                  )}

                  {csvStatus === 'uploading' && (
                    <div className="border border-slate-200 rounded-xl p-6 text-center bg-[#FCFBF9] flex flex-col items-center justify-center">
                      <Loader2 size={20} className="text-[#C4A896] animate-spin mb-2" />
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Parsing raw phone formats...</span>
                    </div>
                  )}

                  {csvStatus === 'parsed' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="text-emerald-700">✓ Parsed {parsedRowsCount} contacts</span>
                        <button onClick={() => setCsvStatus('idle')} className="text-slate-400 hover:text-slate-600"><X size={10} /></button>
                      </div>
                      
                      <div className="max-h-[110px] overflow-y-auto space-y-1 pr-1">
                        {parsedContacts.map((contact, idx) => (
                          <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded text-[9px] font-mono text-slate-700">
                            <span className="truncate max-w-[80px] font-bold">{contact.name}</span>
                            <span>{contact.maskedPhone}</span>
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-1 rounded text-[7px] font-bold uppercase">{contact.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest pt-6 border-t border-slate-100 mt-6 block shrink-0">10-Digit Masking Regex Filters</span>
            </div>

            {/* Zero-CLS Skeletons */}
            <div className="bg-white border border-[#E8E3DA] rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Layers size={18} className="text-[#C4A896] shrink-0" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Zero-CLS Skeletons</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Visual layout protections utilizing route skeleton loaders and client-side error boundary catch blocks (<code>error.tsx</code>) for bulletproof loading states.
                </p>

                {/* Skeletons animation demo */}
                <div className="border-t pt-4 border-slate-100 space-y-3">
                  <div className="space-y-2">
                    <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-widest">Simulated Route Skeleton Loader</span>
                    
                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-2.5">
                      {/* Text line skeleton */}
                      <div className="h-3 bg-slate-200/80 rounded w-3/4 animate-pulse" />
                      <div className="h-2 bg-slate-200/60 rounded w-1/2 animate-pulse" />
                      
                      {/* Grid block skeletons */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="h-8 bg-slate-200/70 rounded animate-pulse" />
                        <div className="h-8 bg-slate-200/70 rounded animate-pulse" />
                        <div className="h-8 bg-slate-200/70 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest pt-6 border-t border-slate-100 mt-6 block shrink-0">Client-Side Error Boundaries (error.tsx)</span>
            </div>

          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 6.5 — THE FRICTIONLESS RETAIL TECH ENGINE
      ══════════════════════════════════════════════════════════ */}
      <section id="flash-offers-tech-engine" className="w-full py-24 px-6 bg-[#FCFBF9] border-y border-[#E8E3DA] scroll-reveal-section">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
            <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
              Flagship Feature Engine
            </span>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#3E3B36] mt-4 mb-4">
              Live In-Store Flash Offers
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
              Bridge the physical-to-digital gap. Turn random walk-in foot traffic into highly engaged digital contacts instantly with zero signup friction.
            </p>
          </div>

          {/* Interactive Split-Screen Presentation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto gsap-reveal">
            
            {/* COLUMN A: The Merchant's Command Center */}
            <article className="bg-white border border-[#E8E3DA] rounded-2xl p-8 shadow-md flex flex-col justify-between h-full space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#3E3B36] text-[#C4A896] rounded-xl flex items-center justify-center shrink-0">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Zero-Setup Real-Time Inventory &amp; Margin Control</h3>
                    <p className="text-[9px] text-[#C4A896] font-bold uppercase tracking-widest mt-0.5">Merchant Command Center</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Give your storefront the absolute power to broadcast live discounts and update margins instantly, with zero barcode scanner dependencies or complex software integrations.
                </p>

                {/* Bullet Points */}
                <ul className="space-y-3.5 text-xs text-slate-500 border-t border-slate-100 pt-5">
                  <li className="flex items-start gap-3">
                    <span className="text-sm shrink-0">🪙</span>
                    <div>
                      <strong className="text-slate-800 font-semibold block">Bidirectional Smart Calculator</strong>
                      <span className="text-[11px] leading-normal text-slate-500">Enter original/discount values, and let the UI automatically compute custom margin savings percentage on the fly.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-sm shrink-0">🔄</span>
                    <div>
                      <strong className="text-slate-800 font-semibold block">The Master Availability Switch</strong>
                      <span className="text-[11px] leading-normal text-slate-500">Instantly toggle offer states with zero latency cache eviction, updating active customer browser views in real time.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-sm shrink-0">🤖</span>
                    <div>
                      <strong className="text-slate-800 font-semibold block">Brand-Aware AI Copywriter</strong>
                      <span className="text-[11px] leading-normal text-slate-500">One-click copy generation trained specifically to convert impulse shoppers with emojis and tight marketing statements.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-sm shrink-0">🛡️</span>
                    <div>
                      <strong className="text-slate-800 font-semibold block">Safe Historical Archival</strong>
                      <span className="text-[11px] leading-normal text-slate-500">Soft-delete protection flags hide expired offers from shoppers, preserving deep analytical view logs for audit analysis.</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Merchant UI Mockup (CLS-Insured aspect-video) */}
              <div className="w-full aspect-video relative rounded-xl border border-slate-200 bg-[#FCFBF9] overflow-hidden flex flex-col justify-between p-4 shrink-0">
                <div className="flex items-center justify-between border-b pb-2 border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active Offer Panel</span>
                  </div>
                  <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold">2 Credits / Create</span>
                </div>

                {/* Calculator Mockup */}
                <div className="grid grid-cols-3 gap-2 my-2">
                  <div className="p-2 bg-white border border-slate-200 rounded">
                    <span className="text-[7px] text-slate-400 font-bold block uppercase tracking-wider">Original</span>
                    <span className="text-xs font-bold text-slate-800">₹500.00</span>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded">
                    <span className="text-[7px] text-slate-400 font-bold block uppercase tracking-wider">Discounted</span>
                    <span className="text-xs font-bold text-slate-800">₹399.00</span>
                  </div>
                  <div className="p-2 bg-white border border-emerald-200 bg-emerald-50/20 rounded flex flex-col justify-center">
                    <span className="text-[7px] text-emerald-600 font-bold block uppercase tracking-wider">Computed</span>
                    <span className="text-xs font-bold text-emerald-700">20% OFF</span>
                  </div>
                </div>

                {/* AI Copy result */}
                <div className="p-2 bg-[#3E3B36] text-white rounded text-[10px] flex items-center justify-between">
                  <span className="font-mono truncate">⚡ Grab premium organic Avocados at 20% off today! 🥑</span>
                  <span className="text-[7px] text-[#C4A896] uppercase font-bold tracking-widest shrink-0 ml-2">AI Cleaned</span>
                </div>

                {/* Switch row */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Online Visibility State</span>
                  <div className="w-8 h-4 bg-[#C4A896] rounded-full p-0.5 flex justify-end items-center cursor-pointer">
                    <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
              </div>
            </article>

            {/* COLUMN B: The App-Less Customer Portal Experience */}
            <article className="bg-[#3E3B36] text-white border border-slate-800 rounded-2xl p-8 shadow-xl flex flex-col justify-between h-full space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#C4A896]/20 text-[#C4A896] rounded-xl flex items-center justify-center shrink-0 border border-[#C4A896]/30">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Instant App-Less, No-Login Consumer Discovery</h3>
                    <p className="text-[9px] text-[#C4A896] font-bold uppercase tracking-widest mt-0.5">Consumer Experience Canvas</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Eliminate all barriers to transaction. Customers simply scan a high-resolution printed store entry QR code to see live offers with absolute zero onboarding friction.
                </p>

                {/* Bullet Points */}
                <ul className="space-y-3.5 text-xs text-slate-300 border-t border-slate-700 pt-5">
                  <li className="flex items-start gap-3">
                    <span className="text-sm shrink-0">🔓</span>
                    <div>
                      <strong className="text-white font-semibold block">Absolute Zero-Friction Entry</strong>
                      <span className="text-[11px] leading-normal text-slate-300">No mobile app installs, no mandatory sign-ups, and absolutely zero phone number input forms.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-sm shrink-0">🏪</span>
                    <div>
                      <strong className="text-white font-semibold block">Custom Merchant Brand Shell</strong>
                      <span className="text-[11px] leading-normal text-slate-300">Displays the official logo, shop name, and custom theme-adaptive coloring dynamically matching the brand settings.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-sm shrink-0">🔍</span>
                    <div>
                      <strong className="text-white font-semibold block">Intelligent Fuzzy Search Bar</strong>
                      <span className="text-[11px] leading-normal text-slate-300">Built-in typo tolerance dynamically matching regional translations (e.g. "തകാളി" to "Tomato") case-insensitively.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-sm shrink-0">💎</span>
                    <div>
                      <strong className="text-white font-semibold block">Wholistic Organic Growth Engine</strong>
                      <span className="text-[11px] leading-normal text-slate-300">A subtle premium "Powered by True Attendly" baseline stamp in the footer invites walk-in B2B merchants to register.</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Customer UI Mockup (CLS-Insured aspect-video) */}
              <div className="w-full aspect-video relative rounded-xl border border-[#E8E3DA] bg-[#FAFAF8] overflow-hidden flex flex-col justify-between p-0 shrink-0">
                {/* Brand Header inside customer app mockup */}
                <div className="w-full bg-[#5C4033]/[0.05] border-b border-black/[0.06] px-3 py-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white p-0.5 border border-black/10 flex items-center justify-center text-xs font-bold text-slate-800 shrink-0">
                      🥑
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-[#5C4033] font-serif leading-none">Fresh Greens Market</p>
                      <p className="text-[8px] text-[#5C4033]/70 font-semibold flex items-center gap-0.5 mt-0.5">
                        <Sparkles size={8} /> Live Flash Offers
                      </p>
                    </div>
                  </div>
                </div>

                {/* Search band mockup */}
                <div className="bg-gradient-to-r from-[#5C4033] to-[#5C4033dd] px-3 py-2 shrink-0">
                  <div className="relative">
                    <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50" />
                    <input
                      type="text"
                      readOnly
                      placeholder="Search offers... (e.g. 'Toma')"
                      className="w-full pl-6 pr-2 py-1 rounded bg-white/15 text-white placeholder-white/50 text-[9px] border border-white/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Result Feed list */}
                <div className="p-3 flex-1 flex flex-col justify-center bg-[#FAFAF8]">
                  <div className="bg-white rounded-xl border border-[#5C4033]/15 p-2.5 shadow-sm flex items-start justify-between gap-2 shrink-0">
                    <div className="min-w-0">
                      <h4 className="text-[10px] font-bold text-slate-900 leading-snug">Fresh Organic Avocados</h4>
                      <p className="text-[8px] text-slate-400 mt-0.5 leading-none">Original: ₹500 · Save 20%</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xs font-bold text-[#5C4033]">₹399</span>
                        <span className="text-[8px] text-slate-400 line-through">₹500</span>
                      </div>
                    </div>
                    <div className="px-2 py-0.5 bg-[#5C4033] text-white text-[8px] font-bold rounded-full shrink-0">
                      20% OFF
                    </div>
                  </div>
                </div>

                {/* Platform branding footer */}
                <div className="px-3 py-2 border-t border-[#5C4033]/15 bg-[#FAFAF8] flex items-center justify-center gap-1 shrink-0">
                  <span className="text-[8px] text-slate-400">Powered by</span>
                  <span className="text-[8px] font-semibold font-serif text-[#5C4033]">True Attendly</span>
                </div>
              </div>
            </article>

          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 7 — FOOTER ACQUISITION MATRIX
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-[#3E3B36] text-white pt-24 pb-12 scroll-reveal-section">
        <div className="max-w-6xl mx-auto px-6">
          
          {/* Final Call to Action Prompts */}
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-6 gsap-reveal">
            <h2 className="serif-headline text-3xl sm:text-4xl font-light">
              Elevate Your Checkout Flow &amp; Boost Customer Retention.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
              Start capturing walk-in customer leads, whitelisting contacts automatically, and dispatching premium marketing campaigns today.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap pt-4">
              <Link
                href="/auth/register"
                className="btn-primary rounded-sm border border-[#C4A896]/20 bg-[#C4A896] hover:bg-[#b09380] text-white font-bold uppercase py-3 px-6 text-xs tracking-wider"
              >
                Create Free Workspace
              </Link>
              <Link
                href="/auth/login"
                className="btn-secondary-dark rounded-sm border border-slate-500 hover:border-white text-white font-bold uppercase py-3 px-6 text-xs tracking-wider"
              >
                Sign In →
              </Link>
            </div>
          </div>

          {/* Priority Access Support Banner */}
          <div className="border-t border-slate-700 pt-12 pb-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-center gsap-reveal">
            <div>
              <span className="bg-amber-950/40 text-[#C4A896] border border-[#C4A896]/35 text-[9px] font-bold px-3 py-1 uppercase tracking-widest rounded-full mb-3 inline-block">
                Priority Concierge Access
              </span>
              <h3 className="serif-headline text-2xl text-white font-medium mb-3">24/7 Concierge Support</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Have an urgent broadcast issue or template routing query? Our founding team is available around the clock to keep your retail pipelines running smoothly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="mailto:trueattendly@gmail.com"
                className="flex items-center justify-center gap-2 py-4 bg-slate-800 border border-slate-700 hover:border-white transition-colors rounded-lg text-xs font-semibold tracking-wider uppercase"
              >
                <Mail size={14} className="text-[#C4A896]" />
                trueattendly@gmail.com
              </a>
              <a
                href="https://wa.me/916282560928?text=Hello%20Sharafath,%20I%20am%20interested%20in%20Attendly%20Broadcast."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white transition-colors rounded-lg text-xs font-semibold tracking-wider uppercase border border-emerald-500"
              >
                <MessageCircle size={14} />
                WhatsApp Founder
              </a>
            </div>
          </div>

          {/* Baseline Metadata & Links */}
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/images/logo-dark.png" 
                alt="True Attendly Logo" 
                className="h-8 w-8 min-w-[32px] min-h-[32px] object-contain bg-white p-1 rounded-lg mr-2 inline-block transition-transform duration-200"
              />
              <span className="text-[10px] text-slate-400 font-mono">True Attendly Broadcast</span>
            </div>

            {/* Corporate Metadata Baseline */}
            <div className="text-center md:text-right text-[10px] text-slate-400 space-y-1 font-mono">
              <p>Founder: Sharafath</p>
              <p>Head Office: Aykarapadi, Malappuram, Kerala, India</p>
              <p>Support: trueattendly@gmail.com</p>
              <p className="text-slate-500 mt-1">Version Track: v3.11.1 Live · broadcast.trueattendly.online</p>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          8. NATIVE HTML MODAL OVERLAY IN PREVIEW (View Bill)
      ══════════════════════════════════════════════════════════ */}
      {showBillModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            {/* Modal header */}
            <div className="bg-[#3E3B36] text-white px-5 py-4 flex items-center justify-between border-b shrink-0">
              <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={14} className="text-[#C4A896]" />
                INV-1002 - Bill Preview
              </span>
              <button
                onClick={() => setShowBillModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal bill body (Dynamic Theme Mirroring demo layout) */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Theme Mirror indicator */}
              <div className="flex items-center justify-between p-2 rounded text-[10px] bg-slate-50 border border-dashed border-slate-200">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Dynamic Theme Config</span>
                <span className="font-semibold" style={{ color: brandColor }}>{brandColor}</span>
              </div>

              {/* Invoice Layout */}
              <div className="border p-6 rounded-lg relative overflow-hidden" style={{ borderColor: brandColor }}>
                {/* Brand border strip */}
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: brandColor }} />
                
                {/* Logo and Shop Header */}
                <div className="flex justify-between items-start border-b pb-4 mb-4" style={{ borderBottomColor: `${brandColor}20` }}>
                  <div>
                    <div className="relative w-20 h-6 mb-1">
                      <Image
                        src="/images/logo-dark.png"
                        alt="Shop Logo"
                        fill
                        sizes="80px"
                        className="object-contain object-left"
                      />
                    </div>
                    <h3 className="serif-headline text-base font-bold text-slate-800">True Broadcast Store</h3>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">GSTIN: 32AABCT8840M1Z3</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">INV-1002</span>
                </div>

                {/* Items Table */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-slate-500 border-b pb-1.5 mb-1.5" style={{ borderBottomColor: `${brandColor}10` }}>
                    <span>Description</span>
                    <span>Total</span>
                  </div>
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-slate-700">
                      <span>{item.qty} × {item.name}</span>
                      <span>₹{item.price * item.qty}</span>
                    </div>
                  ))}
                </div>

                {/* Subtotals & Taxes */}
                <div className="border-t pt-3 mt-4 space-y-1 text-xs text-slate-600" style={{ borderTopColor: `${brandColor}15` }}>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%)</span>
                    <span>₹{gst}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 text-sm border-t pt-1.5 mt-1.5" style={{ borderTopColor: `${brandColor}20` }}>
                    <span>Total Bill</span>
                    <span>₹{total}</span>
                  </div>
                </div>

                {/* Styled Invoice Footer note */}
                <div className="mt-6 text-center border-t pt-4 text-xs italic" style={{ borderTopColor: `${brandColor}15` }}>
                  <p className="font-serif font-bold" style={{ color: brandColor }}>
                    "{invoiceFooterNote}"
                  </p>
                  <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Powered by True Attendly</p>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="bg-slate-50 p-4 border-t flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setShowBillModal(false)}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
              >
                Close Preview
              </button>
              <button
                onClick={handleDownloadBill}
                className="text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5"
                style={{ backgroundColor: brandColor }}
              >
                <Download size={12} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          9. TRANSACTION SECURITY BARRIER POPUP MODAL
      ══════════════════════════════════════════════════════════ */}
      {securityModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8E3DA] shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            
            {/* Modal Header */}
            <div className="bg-[#B45309] text-white px-5 py-4 flex items-center gap-2 border-b shrink-0">
              <AlertTriangle size={18} className="text-white animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Critical Transaction Security Firewall
              </span>
              <button
                onClick={() => setSecurityModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors ml-auto"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
                <strong>Attention Required:</strong> You are about to initiate an active broadcast loop. This will consume wallet credits and dispatch communications instantly to opt-in cohorts.
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-500 font-semibold">Broadcasting Channel</span>
                  <span className="font-bold text-slate-800 uppercase">{securityPayloadType === 'email' ? 'Email (Resend Suite)' : 'WhatsApp (Official API)'}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-500 font-semibold">Target Cohorts</span>
                  <span className="font-bold text-slate-800">{selectedCohorts.join(' + ')}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-500 font-semibold">Ready Recipients</span>
                  <span className="font-bold text-slate-800">{totalEmailsCount.toLocaleString()} Contacts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Unified Balance Deducted</span>
                  <span className="font-bold text-amber-700">{creditsDeducted.toLocaleString()} Credits</span>
                </div>
              </div>

              {/* Progress simulation state */}
              {dispatchStatus === 'broadcasting' && (
                <div className="py-4 text-center space-y-2">
                  <Loader2 size={24} className="text-[#B45309] animate-spin mx-auto" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Dispatching broadcast queue packets...</p>
                </div>
              )}

              {dispatchStatus === 'completed' && (
                <div className="py-4 text-center space-y-1 text-emerald-600">
                  <CheckCircle size={24} className="mx-auto" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Queue Dispatched Successfully!</p>
                  <p className="text-[8px] text-slate-400">Credits deducted from ledger balance.</p>
                </div>
              )}
            </div>

            {/* Modal Actions requiring multi-click confirmation */}
            <div className="bg-slate-50 p-4 border-t flex justify-between items-center shrink-0">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                Double confirmation firewall
              </span>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setSecurityModalOpen(false)}
                  disabled={dispatchStatus !== 'idle'}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>

                {dispatchStatus === 'idle' && (
                  <button
                    onClick={handleSecurityVerification}
                    className={`px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                      securityClickCount === 0 ? 'bg-[#3E3B36] text-white hover:bg-[#C4A896]' :
                      securityClickCount === 1 ? 'bg-red-600 text-white animate-bounce' :
                      'bg-emerald-600 text-white'
                    }`}
                  >
                    {securityClickCount === 0 ? 'Confirm Broadcast Pipeline' : 'Click to Launch Broadcast Loop'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
