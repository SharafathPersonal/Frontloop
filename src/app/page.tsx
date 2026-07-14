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
  CreditCard, TrendingUp, Sliders, Layers, UserCheck, Bell, Tag
} from 'lucide-react';

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // ──────────────────────────────────────────────────────────────────
  // 1. BRAND ACCENT PRESET STATE
  // ──────────────────────────────────────────────────────────────────
  const BRAND_PRESET_COLORS = [
    { name: 'Luxury Chocolate', hex: '#5C4033', bg: 'bg-[#5C4033]' },
    { name: 'Warm Amber', hex: '#B45309', bg: 'bg-[#B45309]' },
    { name: 'Emerald Forest', hex: '#047857', bg: 'bg-[#047857]' },
    { name: 'Imperial Crimson', hex: '#B91C1C', bg: 'bg-[#B91C1C]' },
    { name: 'Charcoal Noir', hex: '#2D1E17', bg: 'bg-[#2D1E17]' }
  ];

  const [brandColor, setBrandColor] = useState('#5C4033');
  const [selectedPresetColor, setSelectedPresetColor] = useState('#5C4033');

  // ──────────────────────────────────────────────────────────────────
  // 2. HERO CART & INBOX STATE (POS Terminal)
  // ──────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState([
    { id: 1, name: 'Pure Cotton Summer Shirt', price: 1299, qty: 1 },
    { id: 2, name: 'Organic Linen Trousers', price: 1899, qty: 1 }
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [invoiceFooterNote, setInvoiceFooterNote] = useState('Thank you for visiting! Scan to claim wallet loyalty credits. ✨');
  const [showBillModal, setShowBillModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price <= 0) return;

    const newId = cart.length > 0 ? Math.max(...cart.map(i => i.id)) + 1 : 1;
    setCart([...cart, { id: newId, name: newItemName, price, qty: 1 }]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const removeItem = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleDownloadBill = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      alert(`INV-1002-BILL.pdf downloaded successfully! (Theme Accent: ${brandColor})`);
    }, 1200);
  };

  // ──────────────────────────────────────────────────────────────────
  // 3. FLASH OFFERS STATE (Card 1)
  // ──────────────────────────────────────────────────────────────────
  const [offerActive, setOfferActive] = useState(true);
  const [webPushBroadcast, setWebPushBroadcast] = useState(false);
  const [originalPrice, setOriginalPrice] = useState(500);
  const [discountPrice, setDiscountPrice] = useState(399);
  const [offerImageIndex, setOfferImageIndex] = useState(0);
  const [isOfferUploading, setIsOfferUploading] = useState(false);

  const offerImages = [
    { name: 'Fresh Organic Avocados', emoji: '🥑', description: 'Grown locally, ripe & ready.' },
    { name: 'Premium Coffee Beans', emoji: '☕', description: 'Single origin medium roast Arabica.' },
    { name: 'Artisan Sourdough Bread', emoji: '🍞', description: 'Freshly baked stone-ground wheat.' }
  ];

  const computedDiscount = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);

  const cycleOfferImage = () => {
    setIsOfferUploading(true);
    setTimeout(() => {
      setOfferImageIndex((prev) => (prev + 1) % offerImages.length);
      setIsOfferUploading(false);
    }, 600);
  };

  // ──────────────────────────────────────────────────────────────────
  // 4. DIGITAL BILLING BARCODE SCANNER STATE (Card 2)
  // ──────────────────────────────────────────────────────────────────
  const [scannerActive, setScannerActive] = useState(true);
  const [scannedItems, setScannedItems] = useState<any[]>([
    { code: '978020137962', name: 'Cotton Summer Shirt', price: 1299, timestamp: '16:50:12' }
  ]);
  const [scanHistoryLogs, setScanHistoryLogs] = useState<string[]>([
    '[16:50:12] SCAN SUCCESS: 978020137962 -> Cotton Summer Shirt added'
  ]);
  const [justScanned, setJustScanned] = useState(false);

  // Scanner loop simulation
  useEffect(() => {
    if (!scannerActive) return;

    const barcodes = [
      { code: '978020137962', name: 'Pure Cotton Summer Shirt', price: 1299 },
      { code: '978020137963', name: 'Organic Linen Trousers', price: 1899 },
      { code: '978020137964', name: 'Artisan Leather Belt', price: 899 },
      { code: '978020137965', name: 'Premium Suede Loafers', price: 3499 }
    ];

    const interval = setInterval(() => {
      const randomItem = barcodes[Math.floor(Math.random() * barcodes.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      // Add to scanner logs
      setScanHistoryLogs(prev => [
        `[${timeStr}] SCAN SUCCESS: ${randomItem.code} -> ${randomItem.name}`,
        ...prev.slice(0, 5)
      ]);

      // Flash viewfinder green
      setJustScanned(true);
      setTimeout(() => setJustScanned(false), 800);

      // Add item to local billing items
      setScannedItems(prev => {
        const existing = prev.find(item => item.code === randomItem.code);
        if (existing) {
          return prev.map(item => item.code === randomItem.code ? { ...item, qty: (item.qty || 1) + 1 } : item);
        } else {
          return [...prev, { ...randomItem, qty: 1, timestamp: timeStr }];
        }
      });

      // Synchronously mirror this item to the POS cart list in the hero section!
      setCart(prev => {
        const existing = prev.find(item => item.name === randomItem.name);
        if (existing) {
          return prev.map(item => item.name === randomItem.name ? { ...item, qty: item.qty + 1 } : item);
        } else {
          const maxId = prev.length > 0 ? Math.max(...prev.map(i => i.id)) + 1 : 1;
          return [...prev, { id: maxId, name: randomItem.name, price: randomItem.price, qty: 1 }];
        }
      });

    }, 4500);

    return () => clearInterval(interval);
  }, [scannerActive]);

  // ──────────────────────────────────────────────────────────────────
  // 5. AUDIENCE REGISTRY STATE (Card 3)
  // ──────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('ALL');
  
  const audienceList = [
    { name: 'K. Sharafath', phone: '+91 62825 ••••8', tags: ['DIGITAL_BILL', 'VIP'], visits: 24, spend: 24500, credit: 1200 },
    { name: 'A. Rahul', phone: '+91 98765 ••••0', tags: ['DIGITAL_BILL'], visits: 8, spend: 7200, credit: 350 },
    { name: 'M. Priya', phone: '+91 88877 ••••0', tags: ['FLASH_OPT_IN'], visits: 12, spend: 11400, credit: 500 },
    { name: 'John Doe', phone: '+91 77766 ••••2', tags: ['DIGITAL_BILL', 'FLASH_OPT_IN'], visits: 3, spend: 3100, credit: 150 },
    { name: 'Fathima R.', phone: '+91 94455 ••••1', tags: ['VIP'], visits: 19, spend: 18500, credit: 900 },
    { name: 'S. Suresh', phone: '+91 99988 ••••4', tags: ['DIGITAL_BILL'], visits: 5, spend: 4500, credit: 200 }
  ];

  const filteredAudience = audienceList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.phone.includes(searchQuery);
    const matchesTag = selectedTagFilter === 'ALL' || item.tags.includes(selectedTagFilter);
    return matchesSearch && matchesTag;
  });

  // ──────────────────────────────────────────────────────────────────
  // 6. DUAL-STATE TRANSACTION LEDGER STATE
  // ──────────────────────────────────────────────────────────────────
  const [activeLedgerTab, setActiveLedgerTab] = useState<'purchases' | 'usages'>('usages');
  const [ledgerUsages, setLedgerUsages] = useState<any[]>([]);
  const [isLoadingMoreUsages, setIsLoadingMoreUsages] = useState(false);
  const [hasMoreUsages, setHasMoreUsages] = useState(true);

  const generateInitialUsages = () => [
    { id: 'u-1', type: 'Digital Invoice Dispatch', desc: 'INV-1002', date: 'Just now', credits: '1.0 Credit', status: 'delivered' },
    { id: 'u-2', type: 'WhatsApp Campaign', desc: 'Weekend Feast BOGO Launch', date: '12 mins ago', credits: '1,420.0 Credits', status: 'delivered' },
    { id: 'u-3', type: 'WhatsApp Campaign', desc: 'Eid Collection VIP Drop', date: '45 mins ago', credits: '650.0 Credits', status: 'delivered' },
    { id: 'u-4', type: 'Digital Invoice Dispatch', desc: 'INV-1001', date: '1 hour ago', credits: '1.0 Credit', status: 'delivered' },
    { id: 'u-5', type: 'WhatsApp Campaign', desc: 'VIP Special Cohort A', date: '2 hours ago', credits: '310.0 Credits', status: 'delivered' },
    { id: 'u-6', type: 'WhatsApp Campaign', desc: 'Weekly Retention Newsletter v2.1', date: '4 hours ago', credits: '890.0 Credits', status: 'delivered' },
    { id: 'u-7', type: 'Digital Invoice Dispatch', desc: 'INV-1000', date: '6 hours ago', credits: '1.0 Credit', status: 'delivered' },
    { id: 'u-8', type: 'WhatsApp Campaign', desc: 'Flash Sale Alert Segment B', date: '8 hours ago', credits: '500.0 Credits', status: 'delivered' },
    { id: 'u-9', type: 'WhatsApp Campaign', desc: 'Welcome Series Cohort New Users', date: '12 hours ago', credits: '420.0 Credits', status: 'delivered' },
    { id: 'u-10', type: 'Digital Invoice Dispatch', desc: 'INV-0999', date: '14 hours ago', credits: '1.0 Credit', status: 'delivered' }
  ];

  useEffect(() => {
    setLedgerUsages(generateInitialUsages());
  }, []);

  const handleLoadMoreUsages = () => {
    if (isLoadingMoreUsages || !hasMoreUsages) return;
    setIsLoadingMoreUsages(true);

    setTimeout(() => {
      const nextBatch = [
        { id: 'u-11', type: 'Digital Invoice Dispatch', desc: 'INV-0998', date: '1 day ago', credits: '1.0 Credit', status: 'delivered' },
        { id: 'u-12', type: 'WhatsApp Campaign', desc: 'Mid-Season Clearance Sale', date: '1 day ago', credits: '850.0 Credits', status: 'delivered' },
        { id: 'u-13', type: 'WhatsApp Campaign', desc: 'Product Restock Alert', date: '1 day ago', credits: '1,240.0 Credits', status: 'delivered' },
        { id: 'u-14', type: 'Digital Invoice Dispatch', desc: 'INV-0997', date: '2 days ago', credits: '1.0 Credit', status: 'delivered' },
        { id: 'u-15', type: 'WhatsApp Campaign', desc: 'Black Friday Broadcast Opt-in', date: '2 days ago', credits: '2,200.0 Credits', status: 'delivered' }
      ];
      setLedgerUsages(prev => [...prev, ...nextBatch]);
      setIsLoadingMoreUsages(false);
      setHasMoreUsages(false);
    }, 1200);
  };

  const cashfreeLogs = [
    { id: 'CF-TXN-90231', date: 'Jul 12, 2026', tokens: '10,000 Tokens', amount: '₹10,000.00', status: 'Success' },
    { id: 'CF-TXN-88421', date: 'Jun 28, 2026', tokens: '5,000 Tokens', amount: '₹5,000.00', status: 'Success' },
    { id: 'CF-TXN-85102', date: 'May 15, 2026', tokens: '10,000 Tokens', amount: '₹10,000.00', status: 'Success' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // 7. SECURITY FIREWALL MODAL STATE
  // ──────────────────────────────────────────────────────────────────
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [securityClickCount, setSecurityClickCount] = useState(0);
  const [dispatchStatus, setDispatchStatus] = useState<'idle' | 'broadcasting' | 'completed'>('idle');

  const triggerSecurityModal = () => {
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

      setTimeout(() => {
        setDispatchStatus('completed');
        const newRecord = {
          id: `u-new-${Date.now()}`,
          type: 'WhatsApp Campaign',
          desc: 'AI Polished Custom Broadcast',
          date: 'Just now',
          credits: '1,240.0 Credits',
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
  // 8. TECHNICAL ARCHITECTURE STATE
  // ──────────────────────────────────────────────────────────────────
  const [spintaxInput, setSpintaxInput] = useState('{Hello|Hi|Hey} customer! {Thanks|Thank you} for visiting us today.');
  const [spintaxVariations, setSpintaxVariations] = useState<string[]>([]);
  const [simulatedDelay, setSimulatedDelay] = useState(7);
  const [csvStatus, setCsvStatus] = useState<'idle' | 'uploading' | 'parsed'>('idle');
  const [parsedContacts, setParsedContacts] = useState<any[]>([]);

  const handleSimulatedCsvUpload = () => {
    setCsvStatus('uploading');
    setTimeout(() => {
      setCsvStatus('parsed');
      setParsedContacts([
        { name: 'K. Sharafath', rawPhone: '916282560928', maskedPhone: '+91 62825 ••••8', status: 'DIGITAL_BILL' },
        { name: 'A. Rahul', rawPhone: '919876543210', maskedPhone: '+91 98765 ••••0', status: 'DIGITAL_BILL' },
        { name: 'M. Priya', rawPhone: '918887776660', maskedPhone: '+91 88877 ••••0', status: 'DIGITAL_BILL' },
        { name: 'John Doe', rawPhone: '917776665552', maskedPhone: '+91 77766 ••••2', status: 'DIGITAL_BILL' }
      ]);
    }, 1500);
  };

  // AI template polisher
  const [roughText, setRoughText] = useState('hey buyer we got new clothes in our shop 20% discount if you visit this sunday');
  const [polishedOutput, setPolishedOutput] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);

  const handlePolishText = () => {
    if (!roughText.trim()) {
      alert("Error: Input text cannot be empty! (Rule 8 Safeguard)");
      return;
    }
    if (roughText.length > 300) {
      alert("Error: Input exceeds maximum 300 characters! Truncation boundary enforced to save wallet credits.");
      return;
    }

    setIsPolishing(true);
    setPolishedOutput('');
    setTimeout(() => {
      setIsPolishing(false);
      setPolishedOutput(
        `Hi {{1}}! Exclusive new collections are now available at {{2}}. Enjoy an exclusive 20% privilege savings when you visit us this Sunday. View Catalog: {{3}} 🌿`
      );
    }, 1200);
  };

  const generateSpintaxVariations = () => {
    const regex = /\{([^}]+)\}/g;
    const variants: string[] = [];

    for (let i = 0; i < 3; i++) {
      let output = spintaxInput;
      let match;

      while ((match = regex.exec(spintaxInput)) !== null) {
        const choices = match[1].split('|');
        const selected = choices[Math.floor(Math.random() * choices.length)];
        output = output.replace(match[0], selected);
      }

      if (output === spintaxInput) {
        output = `${output} [Variant ${i + 1}]`;
      }
      variants.push(output);
    }

    setSpintaxVariations(variants);
    setSimulatedDelay(Math.floor(Math.random() * 8) + 5);
  };

  useEffect(() => {
    generateSpintaxVariations();
  }, [spintaxInput]);

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

      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis?.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }

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

      if (heroRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const heroEls = heroRef.current.querySelectorAll('.hero-animate');
        gsap.from(heroEls, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          delay: 0.1,
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
                { opacity: 0, y: 25 },
                { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }
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

  const selectPresetColor = (hex: string) => {
    setSelectedPresetColor(hex);
    setBrandColor(hex);
  };

  return (
    <main className="w-full max-w-full min-h-screen overflow-x-hidden relative text-[#2D1E17] antialiased bg-[#FAF6F0]">
      {/* ── Google Fonts Import & Theme Header Styles ─────────────────────── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
        
        .font-outfit {
          font-family: 'Outfit', sans-serif;
        }
        
        .serif-headline {
          font-family: 'Playfair Display', Georgia, serif;
          letter-spacing: -0.01em;
        }

        .header-scrolled {
          background: rgba(250, 246, 240, 0.95) !important;
          backdrop-filter: blur(12px) !important;
          box-shadow: 0 1px 0 #E5DCD3 !important;
        }
        
        .header-scrolled .nav-link-light {
          color: #5C4033 !important;
        }
        .header-scrolled .nav-link-light:hover {
          color: #8C6853 !important;
        }
        .header-scrolled .brand-text {
          color: #5C4033 !important;
        }
        .header-scrolled .signin-link {
          color: #5C4033 !important;
        }
        .header-scrolled .signin-link:hover {
          color: #8C6853 !important;
        }
        .header-scrolled .logo-light {
          opacity: 0 !important;
        }
        .header-scrolled .logo-dark {
          opacity: 1 !important;
        }

        /* Viewfinder barcode line scanning sweep animation */
        @keyframes laser-sweep {
          0%, 100% {
            top: 5%;
          }
          50% {
            top: 95%;
          }
        }
        .laser-line {
          animation: laser-sweep 2.5s infinite linear;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1 — FLOATING HEADER
      ══════════════════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════════════════
          SECTION 2 — HERO SECTION & ZERO-FRICTION MARKETING HOOKS
      ══════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="w-full relative pt-40 pb-24 lg:pt-48 lg:pb-36 bg-[#5C4033] text-[#FAF6F0] font-outfit"
      >
        {/* Fine Radial Grid Mesh Overlay */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{ 
            backgroundImage: 'radial-gradient(#FAF6F0 1px, transparent 1px)', 
            backgroundSize: '24px 24px' 
          }}
        />

        {/* Ambient Warm Glows */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            background: `
              radial-gradient(circle 800px at 75% 25%, rgba(196, 168, 150, 0.18) 0%, transparent 80%),
              radial-gradient(circle 600px at 20% 75%, rgba(45, 30, 23, 0.4) 0%, transparent 80%)
            `,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left copy column */}
            <div className="lg:col-span-5 space-y-8 text-left z-10">
              
              {/* Trust badges stack */}
              <div className="hero-animate flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-[#C4A896] bg-[#2D1E17]/40 border border-[#C4A896]/30 px-3.5 py-1.5 rounded-full">
                  <ShieldCheck size={12} className="text-[#C4A896]" />
                  Official Meta API · 0% Ban Risk
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 px-3.5 py-1.5 rounded-full">
                  <Smartphone size={12} className="text-emerald-300" />
                  Dynamic QR Billing
                </span>
              </div>

              {/* Main Headline visual hook */}
              <h1 className="hero-animate serif-headline text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] tracking-tight">
                An App-Less, Number-Less <br />
                <span className="block font-italic text-[#C4A896] mt-1">Retail Growth Engine.</span>
              </h1>

              {/* Zero-friction Marketing Hook */}
              <p className="hero-animate text-base text-[#FAF6F0]/80 leading-relaxed max-w-xl font-light">
                Eliminate paper receipt waste and customer checkout friction entirely. Walk-in shoppers simply scan a dynamic counter QR code to instantly view digital bills, track store loyalty credits, and receive real-time discount broadcasts—without downloading bulky apps or sharing their private phone numbers.
              </p>

              {/* Action CTAs */}
              <div className="hero-animate flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/auth/register"
                  className="bg-[#C4A896] hover:bg-[#FAF6F0] hover:text-[#5C4033] text-[#FAF6F0] font-bold text-xs tracking-widest uppercase px-6 py-4 rounded shadow-xl transition-all duration-300"
                >
                  Create Free Workspace
                </Link>
                <a
                  href="#trinity-matrix"
                  className="bg-transparent border border-[#FAF6F0]/30 hover:border-white hover:bg-white/5 text-[#FAF6F0] font-bold text-xs tracking-widest uppercase px-6 py-4 rounded transition-all duration-300 flex items-center gap-1.5"
                >
                  See Interactive Features ↓
                </a>
              </div>

              {/* Version & Status */}
              <div className="hero-animate flex items-center gap-4 text-xs text-[#FAF6F0]/60 pt-4 border-t border-[#FAF6F0]/10">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  System Version: {APP_VERSION}
                </span>
                <span>•</span>
                <span>Active Merchants: 1,420+ Stores</span>
              </div>
            </div>

            {/* Right side live interactive emulator playground */}
            <div className="lg:col-span-7 hero-animate w-full flex flex-col md:flex-row gap-6 relative">
              
              {/* Visual Box 1: POS cash register terminal */}
              <div className="flex-1 bg-white text-[#2D1E17] rounded-2xl shadow-2xl border border-[#E5DCD3] overflow-hidden flex flex-col h-[520px]">
                
                {/* POS Header */}
                <div className="bg-[#5C4033] text-white px-4 py-3 flex items-center justify-between border-b border-[#E5DCD3]/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
                    <span className="text-[10px] font-bold tracking-widest uppercase">POS Cashier Terminal</span>
                  </div>
                  <span className="text-[9px] bg-[#2D1E17] text-[#C4A896] px-2 py-0.5 rounded font-mono">TERM-01</span>
                </div>

                {/* Simulated Viewfinder overlay */}
                <div className="relative h-28 bg-[#2d221c] overflow-hidden flex items-center justify-center shrink-0 border-b border-[#E5DCD3]/60">
                  <div className={`absolute inset-0 bg-emerald-500/10 transition-opacity duration-300 ${justScanned ? 'opacity-100' : 'opacity-0'}`} />
                  
                  {/* Viewfinder borders */}
                  <div className="absolute w-36 h-16 border-2 border-dashed border-emerald-400/60 rounded-md flex items-center justify-center">
                    <span className="text-[9px] text-emerald-400 font-mono tracking-widest uppercase animate-pulse">
                      {scannerActive ? 'Scanner Auto-Sync' : 'Scanner Paused'}
                    </span>
                  </div>

                  {/* Sweeping Laser Line */}
                  {scannerActive && <div className="absolute left-0 right-0 h-[1.5px] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] laser-line" />}
                  
                  <span className="absolute bottom-2 text-[8px] text-[#C4A896] font-mono">
                    Auto-scanning items every 4.5s
                  </span>
                </div>

                {/* Items in Cart list */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FCFBF9]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Cart</h3>
                    <span className="text-xs font-bold text-[#5C4033] bg-[#FAF6F0] px-2 py-0.5 rounded border border-[#E5DCD3]">{cart.length} Items</span>
                  </div>

                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-white border border-[#E5DCD3] p-2 rounded-lg shadow-sm">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-semibold text-[#2D1E17] truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500">Qty: {item.qty} × ₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-[#2D1E17]">₹{item.price * item.qty}</span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
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

                  {/* Add manual product inputs */}
                  <form onSubmit={handleAddItem} className="pt-2 border-t border-[#E5DCD3]/65 flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Custom Item"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-[#E5DCD3] rounded text-xs focus:outline-none focus:border-[#5C4033]"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="w-16 px-2.5 py-1.5 bg-white border border-[#E5DCD3] rounded text-xs focus:outline-none focus:border-[#5C4033]"
                    />
                    <button
                      type="submit"
                      className="bg-[#5C4033] hover:bg-[#C4A896] text-[#FAF6F0] p-2 rounded transition-colors shrink-0"
                    >
                      <Plus size={12} />
                    </button>
                  </form>
                </div>

                {/* Subtotals & QR code representation */}
                <div className="p-4 bg-[#FAF6F0] border-t border-[#E5DCD3] shrink-0 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pricing breakdown</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Subtotal: <span className="font-semibold text-slate-700">₹{subtotal}</span></p>
                    <p className="text-[10px] text-slate-500">GST (18%): <span className="font-semibold text-slate-700">₹{gst}</span></p>
                    <p className="text-xs font-bold text-[#5C4033] mt-0.5">Total Bill: ₹{total}</p>
                  </div>
                  
                  {/* Dynamic checkout QR representation */}
                  <div className="relative p-2 bg-white rounded-lg border border-[#E5DCD3] shadow-sm flex flex-col items-center shrink-0">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#2D1E17]">
                      <rect x="3" y="3" width="6" height="6" rx="1" />
                      <rect x="15" y="3" width="6" height="6" rx="1" />
                      <rect x="3" y="15" width="6" height="6" rx="1" />
                      <path d="M16 16h2v2h-2zm4 0h1v1h-1zm-2 4h3v1h-3zm-2-2h1v1h-1zm2 1h1v1h-1z" />
                      <circle cx={10 + (total % 4)} cy={10 + (total % 4)} r="1.5" fill={brandColor} stroke="none" />
                      <rect x="9" y="3" width="3" height="3" fill="currentColor" stroke="none" />
                      <rect x="3" y="10" width="3" height="3" fill="currentColor" stroke="none" />
                    </svg>
                    <span className="text-[7px] font-bold text-[#5C4033] uppercase tracking-wider mt-1">Scan for bill</span>
                  </div>
                </div>

              </div>

              {/* Visual Box 2: Customer Device Inbox Emulation */}
              <div className="flex-1 bg-[#2D1E17] rounded-[2.5rem] p-3 shadow-2xl border-[6px] border-[#5C4033] h-[520px] flex flex-col relative overflow-hidden">
                {/* Speaker notch */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#5C4033] rounded-b-xl z-20" />
                
                {/* Chat header */}
                <div className="bg-[#5C4033] text-white pt-6 pb-2.5 px-4 flex items-center gap-2 shrink-0 z-10">
                  <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-[#C4A896]">
                    Shop
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">True Broadcast Store</p>
                    <p className="text-[8px] text-[#C4A896] tracking-wide">Official Verified Merchant</p>
                  </div>
                </div>

                {/* WhatsApp Chat feed */}
                <div className="flex-1 bg-[#F3ECE5] p-3 flex flex-col gap-3 overflow-y-auto"
                     style={{ backgroundImage: 'radial-gradient(#D6C5B7 1px, transparent 1px)', backgroundSize: '12px 12px' }}>
                  
                  {/* Customer Inbound Request */}
                  <div className="self-end bg-[#E8DCD3] max-w-[85%] rounded-lg rounded-tr-none px-3 py-1.5 shadow-sm text-xs border border-[#E5DCD3] mt-2">
                    <p className="text-[#2D1E17]">✨ Get my Bill INV-1002</p>
                    <span className="text-[8px] text-slate-500 float-right mt-1 ml-2">Just now</span>
                  </div>

                  {/* Outbound Receipt PDF & Preview */}
                  <div className="self-start bg-white max-w-[90%] rounded-lg rounded-tl-none p-2.5 shadow-sm border-l-4 mt-1 transition-all duration-300 w-full"
                       style={{ borderColor: brandColor }}>
                    
                    {/* PDF Doc Row */}
                    <div className="flex items-center gap-3 mb-2 pb-2 border-b border-slate-100">
                      <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center shrink-0 border border-rose-100">
                        <FileText size={18} className="text-rose-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-800 truncate">INV-1002-BILL.pdf</p>
                        <p className="text-[9px] text-slate-500">142 KB • PDF Document</p>
                      </div>
                      <Download size={14} className="text-slate-400 hover:text-[#5C4033] cursor-pointer shrink-0" onClick={handleDownloadBill} />
                    </div>

                    {/* Receipt Accent Preview */}
                    <div className="border rounded p-2 text-[10px] bg-[#FAF6F0]" style={{ borderColor: `${brandColor}30` }}>
                      <div className="flex justify-between items-center border-b pb-1 mb-1 font-bold text-slate-700" style={{ borderBottomColor: `${brandColor}20` }}>
                        <span className="font-serif font-bold text-[#5C4033]">True Store</span>
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
                      <div className="border-t pt-1 mt-1 flex justify-between font-bold text-[#5C4033]" style={{ borderTopColor: `${brandColor}20` }}>
                        <span>Total (inc. GST)</span>
                        <span>₹{total}</span>
                      </div>
                    </div>

                    {/* Footer note */}
                    <div className="mt-2 text-center border-t pt-2 border-slate-100">
                      <p className="text-[10px] font-medium italic font-serif" style={{ color: brandColor }}>
                        &quot;{invoiceFooterNote}&quot;
                      </p>
                    </div>

                    <div className="mt-1 text-right">
                      <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Powered by True Attendly</span>
                    </div>

                    <span className="text-[8px] text-slate-500 float-right mt-1">Just now</span>
                  </div>

                  {/* Overrides inside customer feed */}
                  <div className="flex gap-2 mt-1 self-start shrink-0 w-full max-w-[90%]">
                    <button
                      onClick={() => setShowBillModal(true)}
                      className="flex-1 bg-white hover:bg-slate-50 text-[#5C4033] border border-[#E5DCD3] rounded px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm transition-colors"
                    >
                      <Eye size={10} /> View Bill
                    </button>
                    <button
                      onClick={handleDownloadBill}
                      className="flex-1 bg-white hover:bg-slate-50 text-[#5C4033] border border-[#E5DCD3] rounded px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm transition-colors"
                    >
                      {isDownloading ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                      Download
                    </button>
                  </div>
                </div>

                {/* Presets Accent Bar */}
                <div className="p-3 bg-[#FAF6F0] border-t border-[#E5DCD3] shrink-0 text-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Shop Accent Presets</span>
                  <div className="flex gap-1.5">
                    {BRAND_PRESET_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => selectPresetColor(c.hex)}
                        className={`w-4 h-4 rounded-full border ${c.bg} transition-transform ${brandColor === c.hex ? 'scale-125 border-[#2D1E17]' : 'border-transparent hover:scale-110'}`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3 — CORE TRINITY VISUAL MATRIX
      ══════════════════════════════════════════════════════════ */}
      <section id="trinity-matrix" className="w-full py-24 px-6 bg-[#FAF6F0] border-y border-[#E5DCD3] scroll-reveal-section font-outfit">
        <div className="max-w-7xl mx-auto">
          
          <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
            <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
              The Retail Growth Trinity
            </span>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#5C4033] mt-4 mb-6 leading-tight">
              Three Interlocking Pillars. One Zero-Friction Flow.
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
              Engage shoppers in real time directly from counter checkouts without forcing them to share credentials or download native mobile apps.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMN 1: Live In-Store Flash Offers */}
            <article className="gsap-reveal bg-white border border-[#E5DCD3] rounded-2xl p-8 flex flex-col justify-between hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
              <div className="space-y-6">
                
                {/* Feature Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FAF6F0] text-[#5C4033] rounded-xl flex items-center justify-center border border-[#E5DCD3] shadow-sm">
                    <Zap size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5C4033] text-sm tracking-wide">1. Live In-Store Flash Offers</h3>
                    <p className="text-[9px] text-[#C4A896] font-bold uppercase tracking-widest mt-0.5">Instant Impulse Sales</p>
                  </div>
                </div>

                <p className="text-xs text-[#7A6A5E] leading-relaxed">
                  Broadcast time-limited discounts and instant specials directly to the browser feeds of in-store customers scanning your counter QR.
                </p>

                {/* Sub-capabilities list */}
                <ul className="space-y-3 text-xs text-[#5C4033]/85 border-t border-[#E5DCD3]/50 pt-4">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                    <span><strong>Master Control Switch:</strong> Instantly push or pause live discounts on checkout boards with zero lag.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                    <span><strong>Supabase Media Uploads:</strong> Instantly sync high-quality product images to your customers&apos; digital viewing lists.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                    <span><strong>Dynamic Web Push Toggle:</strong> Trigger real-time browser notifications to subscriber feeds on campaign dispatches.</span>
                  </li>
                </ul>
              </div>

              {/* Dynamic Interactive Merchant Offer Console widget */}
              <div className="pt-6 mt-6 border-t border-[#E5DCD3] space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span>Merchant Control Panel</span>
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">Live State</span>
                </div>

                <div className="bg-[#FAF6F0] p-4 rounded-xl border border-[#E5DCD3] space-y-3">
                  
                  {/* Photo Uploader simulator */}
                  <div 
                    onClick={cycleOfferImage}
                    className="border border-dashed border-[#E5DCD3] hover:border-[#5C4033] bg-white rounded-lg p-2 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{offerImages[offerImageIndex].emoji}</span>
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-[#5C4033] block truncate max-w-[120px]">{offerImages[offerImageIndex].name}</span>
                        <span className="text-[8px] text-slate-400 block truncate max-w-[120px]">{offerImages[offerImageIndex].description}</span>
                      </div>
                    </div>
                    {isOfferUploading ? (
                      <Loader2 size={12} className="animate-spin text-slate-400" />
                    ) : (
                      <span className="text-[8px] font-bold uppercase text-[#C4A896] flex items-center gap-0.5">
                        <Upload size={10} /> Cycle Image
                      </span>
                    )}
                  </div>

                  {/* Calculator Row */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div>
                      <label className="text-[8px] text-slate-400 font-bold block uppercase mb-0.5">Original Price</label>
                      <input 
                        type="number"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-[#E5DCD3] rounded px-1.5 py-1 text-[10px] focus:outline-none focus:border-[#5C4033]"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] text-slate-400 font-bold block uppercase mb-0.5">Discount Price</label>
                      <input 
                        type="number"
                        value={discountPrice}
                        onChange={(e) => setDiscountPrice(Math.min(originalPrice, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full bg-white border border-[#E5DCD3] rounded px-1.5 py-1 text-[10px] focus:outline-none focus:border-[#5C4033]"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-[#E5DCD3]/50 pt-2 text-[9px]">
                    <span className="text-slate-500 font-bold">Computed Savings:</span>
                    <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{computedDiscount}% OFF</span>
                  </div>

                  {/* Visibility & Web Push Toggles */}
                  <div className="space-y-2 pt-2 border-t border-[#E5DCD3]/50 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#5C4033] font-semibold">Visibility State:</span>
                      <button 
                        onClick={() => setOfferActive(!offerActive)}
                        className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase transition-colors ${offerActive ? 'bg-[#5C4033] text-white' : 'bg-slate-200 text-slate-600'}`}
                      >
                        {offerActive ? 'Active Online' : 'Hidden'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#5C4033] font-semibold">Broadcast via Web Push:</span>
                      <button 
                        onClick={() => setWebPushBroadcast(!webPushBroadcast)}
                        className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase transition-colors ${webPushBroadcast ? 'bg-[#C4A896] text-white animate-pulse' : 'bg-slate-200 text-slate-600'}`}
                      >
                        {webPushBroadcast ? 'ENABLED (2 Credits)' : 'DISABLED (0 Credits)'}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </article>

            {/* COLUMN 2: Frictionless Digital Billing */}
            <article className="gsap-reveal bg-white border border-[#E5DCD3] rounded-2xl p-8 flex flex-col justify-between hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
              <div className="space-y-6">
                
                {/* Feature Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FAF6F0] text-[#5C4033] rounded-xl flex items-center justify-center border border-[#E5DCD3] shadow-sm">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5C4033] text-sm tracking-wide">2. Frictionless Digital Billing</h3>
                    <p className="text-[9px] text-[#C4A896] font-bold uppercase tracking-widest mt-0.5">High-Fidelity Scan Streams</p>
                  </div>
                </div>

                <p className="text-xs text-[#7A6A5E] leading-relaxed">
                  High-fidelity barcode scanning checkout framework. Leverage connected device cameras to log items and calculate taxes.
                </p>

                {/* Sub-capabilities list */}
                <ul className="space-y-3 text-xs text-[#5C4033]/85 border-t border-[#E5DCD3]/50 pt-4">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                    <span><strong>Live Barcode Capture:</strong> Instantly process physical UPC/EAN labels using any camera device.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                    <span><strong>Auto GST Computation:</strong> Instant calculation of itemized subtotals, custom rates, and totals.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                    <span><strong>No Dummy Simulations:</strong> Active local timer loops demonstrate real barcode detection sync with the cashier inventory panel.</span>
                  </li>
                </ul>
              </div>

              {/* Dynamic Viewfinder Checkout Scanner widget */}
              <div className="pt-6 mt-6 border-t border-[#E5DCD3] space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span>Camera Stream Viewfinder</span>
                  <button 
                    onClick={() => setScannerActive(!scannerActive)}
                    className={`text-[8px] px-2 py-0.5 rounded font-bold uppercase ${scannerActive ? 'bg-emerald-600 text-white animate-pulse' : 'bg-red-600 text-white'}`}
                  >
                    {scannerActive ? 'Scan Active' : 'Scan Paused'}
                  </button>
                </div>

                <div className="relative h-28 bg-[#1e1410] border border-[#E5DCD3] rounded-xl overflow-hidden flex flex-col justify-between p-2">
                  <div className={`absolute inset-0 bg-emerald-500/10 transition-opacity duration-300 ${justScanned ? 'opacity-100' : 'opacity-0'}`} />
                  
                  {/* Corner viewfinder brackets */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />

                  {/* Sweeping Laser Line */}
                  {scannerActive && <div className="absolute left-0 right-0 h-[1.5px] bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,1)] laser-line" />}

                  {/* Top line with live status */}
                  <div className="flex justify-between items-center text-[7px] text-emerald-400 font-mono z-10">
                    <span>CAPTURE: 1080P // AUTO_FOCUS</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      SYNCED
                    </span>
                  </div>

                  {/* Center Scanning Barcode Overlay */}
                  <div className="flex flex-col items-center justify-center my-1 z-10">
                    <div className="w-24 h-6 opacity-60 bg-white/10 flex items-center justify-center border border-white/20 rounded">
                      <span className="text-[8px] font-mono text-white tracking-[0.2em] font-bold">||||| | ||| ||</span>
                    </div>
                  </div>

                  {/* Real-time scan log list */}
                  <div className="text-[7.5px] font-mono text-slate-300 bg-black/40 p-1.5 rounded text-left overflow-y-auto max-h-[35px] z-10 space-y-0.5">
                    {scanHistoryLogs.map((log, i) => (
                      <div key={i} className="truncate">{log}</div>
                    ))}
                  </div>
                </div>

                {/* Scanner totals display */}
                <div className="flex items-center justify-between text-xs font-bold text-[#5C4033]">
                  <span>Total Scanned Invoice:</span>
                  <span className="bg-[#FAF6F0] px-2 py-0.5 rounded border border-[#E5DCD3]">₹{total}</span>
                </div>

              </div>
            </article>

            {/* COLUMN 3: Audience Registry Management */}
            <article className="gsap-reveal bg-white border border-[#E5DCD3] rounded-2xl p-8 flex flex-col justify-between hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
              <div className="space-y-6">
                
                {/* Feature Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FAF6F0] text-[#5C4033] rounded-xl flex items-center justify-center border border-[#E5DCD3] shadow-sm">
                    <Contact size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5C4033] text-sm tracking-wide">3. Audience Registry</h3>
                    <p className="text-[9px] text-[#C4A896] font-bold uppercase tracking-widest mt-0.5">Engagement Analytics</p>
                  </div>
                </div>

                <p className="text-xs text-[#7A6A5E] leading-relaxed">
                  Manage walk-in customers and segment tags like <code>DIGITAL_BILL</code> automatically. Track visits, lifecycle value, and launch broadcasts.
                </p>

                {/* Sub-capabilities list */}
                <ul className="space-y-3 text-xs text-[#5C4033]/85 border-t border-[#E5DCD3]/50 pt-4">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                    <span><strong>100% Opt-In Legality:</strong> Customers auto-whitelist their profiles when requesting receipts.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                    <span><strong>PostgreSQL Tag Segments:</strong> Filter registry loops using custom tag definitions.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-[#C4A896] mt-0.5 shrink-0" />
                    <span><strong>Optimistic UI Hydration:</strong> Trigger simulated broadcast dispatches that immediately update credit ledgers.</span>
                  </li>
                </ul>
              </div>

              {/* Dynamic Responsive Mobile Card Registry widget */}
              <div className="pt-6 mt-6 border-t border-[#E5DCD3] space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span>Customer Card Registry</span>
                  <span className="text-[#C4A896]">{filteredAudience.length} Profiles</span>
                </div>

                {/* Interactive Search & Filter inside Card */}
                <div className="space-y-2 bg-[#FAF6F0] p-3 rounded-xl border border-[#E5DCD3]">
                  <div className="relative">
                    <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search registry..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-5 pr-2 py-1 bg-white border border-[#E5DCD3] rounded text-[10px] focus:outline-none focus:border-[#5C4033]"
                    />
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pr-1">
                    {['ALL', 'DIGITAL_BILL', 'VIP', 'FLASH_OPT_IN'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTagFilter(t)}
                        className={`text-[7px] font-bold px-2 py-0.5 rounded border transition-colors shrink-0 uppercase tracking-wider ${selectedTagFilter === t ? 'bg-[#5C4033] border-[#5C4033] text-white' : 'bg-white border-[#E5DCD3] text-slate-600'}`}
                      >
                        {t === 'ALL' ? 'ALL TAGS' : t.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Customer mobile card grid representation */}
                  <div className="space-y-1.5 max-h-[85px] overflow-y-auto pr-1">
                    {filteredAudience.map((cust, idx) => (
                      <div key={idx} className="bg-white border border-[#E5DCD3] p-1.5 rounded-lg flex items-center justify-between shadow-sm">
                        <div className="text-left min-w-0">
                          <span className="text-[9px] font-bold text-[#2D1E17] block truncate">{cust.name}</span>
                          <span className="text-[8px] text-slate-400 block font-mono">{cust.phone}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-1">
                            {cust.tags.map(t => (
                              <span key={t} className="bg-[#FAF6F0] text-[#5C4033] border border-[#E5DCD3] text-[6px] px-1 rounded uppercase font-bold tracking-wide">
                                {t.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                          <span className="text-[7.5px] text-slate-500 block font-bold">
                            Visits: {cust.visits} · Spend: ₹{cust.spend}
                          </span>
                        </div>
                      </div>
                    ))}
                    {filteredAudience.length === 0 && (
                      <div className="text-center py-4 text-[9px] text-slate-400 italic">No matches found.</div>
                    )}
                  </div>

                  {/* Broadcast Dispatch Trigger Button */}
                  <button 
                    onClick={triggerSecurityModal}
                    className="w-full bg-[#5C4033] hover:bg-[#C4A896] text-white py-1.5 px-3 rounded text-[9px] font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageCircle size={10} /> Launch Campaign Broadcast
                  </button>
                </div>
              </div>
            </article>

          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4 — WALLET LEDGER TRANSPARENCY (Tab A & Tab B)
      ══════════════════════════════════════════════════════════ */}
      <section id="ledger" className="w-full py-24 px-6 bg-white scroll-reveal-section font-outfit">
        <div className="max-w-7xl mx-auto">
          
          <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
            <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
              Autonomous Account Ledgers
            </span>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#5C4033] mt-4 mb-4">
              Pay-As-You-Send Wallet &amp; Ledger Transparency
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
              No monthly subscriptions, hidden maintenance costs, or lock-in contracts. Verify credit top-ups via Cashfree and inspect exact row-by-row campaign debits from our cursor ledger.
            </p>
          </div>

          <div className="max-w-4xl mx-auto gsap-reveal bg-white border border-[#E5DCD3] rounded-2xl shadow-xl overflow-hidden flex flex-col">
            
            {/* Header tab controller */}
            <div className="bg-[#5C4033] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#E5DCD3]/10 shrink-0">
              <div className="flex bg-[#2D1E17] rounded-lg p-1 w-full sm:w-auto">
                <button
                  onClick={() => setActiveLedgerTab('purchases')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition-all ${activeLedgerTab === 'purchases' ? 'bg-[#C4A896] text-white shadow-sm' : 'text-[#FAF6F0]/60 hover:text-white'}`}
                >
                  <CreditCard size={12} className="inline-block mr-1.5 -mt-0.5" />
                  Tab A: Credit Purchases
                </button>
                <button
                  onClick={() => setActiveLedgerTab('usages')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition-all ${activeLedgerTab === 'usages' ? 'bg-[#C4A896] text-white shadow-sm' : 'text-[#FAF6F0]/60 hover:text-white'}`}
                >
                  <TrendingUp size={12} className="inline-block mr-1.5 -mt-0.5" />
                  Tab B: Credit Usages
                </button>
              </div>

              {/* Wallet Summary metrics */}
              <div className="flex gap-6 shrink-0 text-[#FAF6F0]">
                <div className="text-right">
                  <span className="text-[9px] text-[#C4A896] uppercase tracking-widest block font-bold">Total Purchases</span>
                  <span className="text-sm font-black text-white">₹25,000.00</span>
                </div>
                <div className="border-l border-[#FAF6F0]/15 pl-6 text-right">
                  <span className="text-[9px] text-[#C4A896] uppercase tracking-widest block font-bold">Remaining Balance</span>
                  <span className="text-sm font-black text-white">25,000 Credits</span>
                </div>
              </div>
            </div>

            {/* TAB A Content: Cashfree Topup Logs */}
            {activeLedgerTab === 'purchases' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[600px] border-collapse">
                  <thead className="bg-[#FAF6F0] border-b border-[#E5DCD3] text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="p-4 border-r border-[#E5DCD3]/50">Transaction ID</th>
                      <th className="p-4 border-r border-[#E5DCD3]/50">Top-Up Date</th>
                      <th className="p-4 border-r border-[#E5DCD3]/50">Tokens Credited</th>
                      <th className="p-4 border-r border-[#E5DCD3]/50">Total Amount (INR)</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {cashfreeLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-mono font-bold text-[#2D1E17] border-r border-slate-100">{log.id}</td>
                        <td className="p-4 border-r border-slate-100">{log.date}</td>
                        <td className="p-4 font-semibold text-slate-800 border-r border-slate-100">{log.tokens}</td>
                        <td className="p-4 font-semibold text-slate-800 border-r border-slate-100">{log.amount}</td>
                        <td className="p-4">
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-200">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 bg-[#FAF6F0]/50 text-center border-t border-[#E5DCD3] text-[9px] text-[#C4A896] font-bold uppercase tracking-widest">
                  Verified by Cashfree Secure Gateway Integration API Webhooks
                </div>
              </div>
            )}

            {/* TAB B Content: Dynamic usage logs with cursor-based infinite scroll */}
            {activeLedgerTab === 'usages' && (
              <div>
                <div className="overflow-x-auto max-h-[360px] overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs min-w-[600px] border-collapse">
                    <thead className="bg-[#FAF6F0] border-b border-[#E5DCD3] text-slate-500 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10">
                      <tr>
                        <th className="p-4 bg-[#FAF6F0] border-r border-[#E5DCD3]/50">Operational Usage Type</th>
                        <th className="p-4 bg-[#FAF6F0] border-r border-[#E5DCD3]/50">Reference ID / Campaign</th>
                        <th className="p-4 bg-[#FAF6F0] border-r border-[#E5DCD3]/50">Date</th>
                        <th className="p-4 bg-[#FAF6F0] text-right border-r border-[#E5DCD3]/50">Credits Deducted</th>
                        <th className="p-4 bg-[#FAF6F0] text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[#5C4E46]">
                      {ledgerUsages.map((usage) => (
                        <tr key={usage.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold flex items-center gap-2 border-r border-slate-100">
                            <span className={`w-1.5 h-1.5 rounded-full ${usage.type === 'WhatsApp Campaign' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {usage.type}
                          </td>
                          <td className="p-4 font-mono font-semibold text-[#2D1E17] border-r border-slate-100">{usage.desc}</td>
                          <td className="p-4 text-slate-500 border-r border-slate-100">{usage.date}</td>
                          <td className="p-4 text-right font-bold text-slate-800 border-r border-slate-100">{usage.credits}</td>
                          <td className="p-4 text-center">
                            <span className="bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200">
                              {usage.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cursor infinite pagination load actions */}
                <div className="p-4 bg-[#FAF6F0] border-t border-[#E5DCD3] flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Showing {ledgerUsages.length} ledger logs
                  </span>

                  {hasMoreUsages ? (
                    <button
                      onClick={handleLoadMoreUsages}
                      disabled={isLoadingMoreUsages}
                      className="bg-white hover:bg-slate-50 text-[#5C4033] border border-[#E5DCD3] px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      {isLoadingMoreUsages ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          Loading cursor page...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={10} />
                          Load More Usages
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[10px] text-[#C4A896] font-bold uppercase tracking-widest">
                      Cursor reached end of ledger (20+ Rows Sync)
                    </span>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 5 — TECHNICAL ARCHITECTURE & STABILITY MATRIX
      ══════════════════════════════════════════════════════════ */}
      <section id="technical-matrix" className="w-full py-24 px-6 bg-[#FAF6F0] border-t border-[#E5DCD3] scroll-reveal-section font-outfit">
        <div className="max-w-7xl mx-auto">
          
          <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
            <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
              Engineering Matrix
            </span>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#5C4033] mt-4 mb-4">
              Advanced Anti-Ban &amp; Serverless Architecture
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
              Explore the system modules built to protect numbers, clean raw inputs, and secure fast response times under zero Cumulative Layout Shift limits.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto gsap-reveal">
            
            {/* Widget A: Anti-Ban Spintax Engine */}
            <div className="bg-white border border-[#E5DCD3] rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#5C4033]">
                  <Sliders size={18} className="text-[#C4A896]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Anti-Ban Spintax Engine</h3>
                </div>
                
                <p className="text-xs text-[#7A6A5E] leading-relaxed">
                  Automatic parsing of message string variations (<code>{`"{Hello|Hi|Hey}"`}</code>) reinforced by randomized human-like dispatch delays (5 to 12-second intervals).
                </p>

                <div className="space-y-2 border-t pt-4 border-slate-100">
                  <label className="text-[9px] text-slate-400 font-bold block uppercase">Spintax template input</label>
                  <input
                    type="text"
                    value={spintaxInput}
                    onChange={(e) => setSpintaxInput(e.target.value)}
                    className="w-full p-2 bg-[#FAF6F0] border border-[#E5DCD3] rounded text-[10px] font-mono focus:outline-none focus:border-[#5C4033]"
                  />
                  
                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-widest">Generated Variations</span>
                    {spintaxVariations.map((v, i) => (
                      <div key={i} className="p-1.5 bg-[#FAF6F0] border border-[#E5DCD3]/50 rounded text-[9.5px] font-mono text-slate-700 truncate">
                        {v}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest shrink-0">
                <span>Random Spintax Delay</span>
                <span className="text-[#5C4033] bg-[#FAF6F0] px-2 py-0.5 rounded border border-[#E5DCD3]">{simulatedDelay} Seconds</span>
              </div>
            </div>

            {/* Widget B: Unified CSV Manifest Parser */}
            <div className="bg-white border border-[#E5DCD3] rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#5C4033]">
                  <Database size={18} className="text-[#C4A896]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">CSV/Excel Registry Parser</h3>
                </div>

                <p className="text-xs text-[#7A6A5E] leading-relaxed">
                  Serverless-safe Excel/CSV ingest algorithms masking raw phone formats via 10-digit regex filters to protect privacy and filter anomalies.
                </p>

                {/* CSV simulator */}
                <div className="border-t pt-4 border-slate-100 space-y-3">
                  {csvStatus === 'idle' && (
                    <div
                      onClick={handleSimulatedCsvUpload}
                      className="border-2 border-dashed border-[#E5DCD3] hover:border-[#5C4033] rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#FAF6F0]"
                    >
                      <Upload size={20} className="mx-auto text-slate-400 mb-2 animate-bounce" />
                      <span className="text-[9px] text-[#5C4033] block font-bold uppercase tracking-wider">Drop excel/csv here</span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">Click to simulate auto-parse &amp; clean</span>
                    </div>
                  )}

                  {csvStatus === 'uploading' && (
                    <div className="border border-[#E5DCD3] rounded-xl p-6 text-center bg-[#FAF6F0] flex flex-col items-center justify-center">
                      <Loader2 size={20} className="text-[#C4A896] animate-spin mb-2" />
                      <span className="text-[9px] text-[#5C4033] font-bold uppercase tracking-wider">Parsing raw phone formats...</span>
                    </div>
                  )}

                  {csvStatus === 'parsed' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="text-emerald-700">✓ Parsed 4 contacts</span>
                        <button onClick={() => setCsvStatus('idle')} className="text-slate-400 hover:text-slate-600"><X size={10} /></button>
                      </div>
                      
                      <div className="max-h-[110px] overflow-y-auto space-y-1 pr-1">
                        {parsedContacts.map((contact, idx) => (
                          <div key={idx} className="flex items-center justify-between p-1.5 bg-[#FAF6F0] border border-[#E5DCD3] rounded text-[9px] font-mono text-slate-700">
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

            {/* Widget C: 1-Credit AI Polisher (Rule 8 compliant) */}
            <div className="bg-white border border-[#E5DCD3] rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#5C4033]">
                  <Wand2 size={18} className="text-[#C4A896]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">1-Credit AI Polisher</h3>
                </div>

                <p className="text-xs text-[#7A6A5E] leading-relaxed">
                  Refine raw merchant inputs into high-converting copies with strict boundary filters preventing prompt injection and token waste (Rule 8 Compliant).
                </p>

                <div className="space-y-2 border-t pt-4 border-slate-100 text-left">
                  <textarea
                    rows={2}
                    value={roughText}
                    onChange={(e) => setRoughText(e.target.value)}
                    className="w-full p-2 bg-[#FAF6F0] border border-[#E5DCD3] rounded text-[10px] font-mono leading-relaxed focus:outline-none focus:border-[#5C4033] resize-none"
                    placeholder="Enter rough copy note..."
                  />
                  <button
                    onClick={handlePolishText}
                    disabled={isPolishing}
                    className="w-full bg-[#5C4033] hover:bg-[#C4A896] text-white py-1.5 px-3 rounded text-[9px] font-bold tracking-widest uppercase flex items-center justify-center gap-1 shadow-sm transition-colors"
                  >
                    {isPolishing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    Polish With AI
                  </button>
                  
                  {polishedOutput && (
                    <div className="p-2 bg-[#FAF6F0] border border-[#E5DCD3] rounded text-[10px] text-slate-700 leading-relaxed font-medium">
                      <span className="block font-bold text-[8px] text-[#5C4033] uppercase tracking-widest mb-0.5">✦ Polished (Approved Format)</span>
                      {polishedOutput}
                    </div>
                  )}
                </div>
              </div>

              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest pt-6 border-t border-slate-100 mt-6 block shrink-0">Maximum 300 Characters Safe Edge</span>
            </div>

          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 6 — PERSUASION REVERSAL (RETAIL REALITY CHECK)
      ══════════════════════════════════════════════════════════ */}
      <section id="comparison" className="w-full py-24 px-6 bg-white scroll-reveal-section font-outfit">
        <div className="max-w-7xl mx-auto">
          
          <div className="max-w-3xl mx-auto text-center mb-16 gsap-reveal">
            <span className="text-xs tracking-[0.25em] uppercase text-[#C4A896] font-bold">
              The Reality Check
            </span>
            <h2 className="serif-headline text-3xl sm:text-4xl text-[#5C4033] mt-4 mb-4">
              Why Legacy Checkout is Hurting Your Retail Sales
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
              We compared traditional, paper-based billing layouts against the True Attendly digital broadcast pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto gsap-reveal">
            
            {/* Legacy checkout */}
            <div className="bg-[#FAF6F0] border border-red-200 rounded-2xl p-8 flex flex-col justify-between hover:shadow-lg transition-all">
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

                <ul className="space-y-3 text-xs text-slate-500 border-t border-slate-200/60 pt-4 text-left">
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
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest pt-6 block border-t border-slate-100 mt-6 text-left">Inefficient Checkout System</span>
            </div>

            {/* True Attendly */}
            <div className="bg-[#5C4033] text-[#FAF6F0] rounded-2xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden hover:scale-[1.01] transition-all">
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

                <p className="text-xs text-[#FAF6F0]/80 leading-relaxed">
                  One quick billing screen scan logs the lead, delivers an interactive custom invoice, auto-saves the merchant profile details, and legally whitelists the connection with absolute zero monthly subscription traps.
                </p>

                <ul className="space-y-3 text-xs text-[#FAF6F0]/90 border-t border-[#FAF6F0]/15 pt-4 text-left">
                  <li className="flex items-center gap-2">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span>Zero paper hardware. Turn any smartphone or tablet into a billing term.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span>Opt-in whitelisting automatically secures the customer profile details.</span>
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
              <span className="text-[8.5px] font-bold text-[#C4A896] uppercase tracking-widest pt-6 block border-t border-[#FAF6F0]/15 mt-6 text-left">Next-gen Mobile Billing Onboarding</span>
            </div>

          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 7 — CONCIERGE & FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer className="bg-[#2D1E17] text-white pt-24 pb-12 font-outfit border-t border-[#5C4033]/40">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Final Call to Action */}
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
            <h2 className="serif-headline text-3xl sm:text-4xl font-light text-[#FAF6F0]">
              Elevate Your Checkout Flow &amp; Boost Customer Retention.
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

          {/* Metadata baseline */}
          <div className="border-t border-[#5C4033]/30 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/images/logo-dark-v2.png" 
                alt="True Attendly Logo" 
                className="h-8 w-8 min-w-[32px] min-h-[32px] object-contain bg-white p-1 rounded-lg mr-2 inline-block transition-transform duration-200"
              />
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

      {/* ══════════════════════════════════════════════════════════
          NATIVE HTML MODAL OVERLAY IN PREVIEW (View Bill)
      ══════════════════════════════════════════════════════════ */}
      {showBillModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            
            {/* Modal header */}
            <div className="bg-[#5C4033] text-white px-5 py-4 flex items-center justify-between border-b shrink-0">
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

            {/* Modal bill body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              <div className="flex items-center justify-between p-2 rounded text-[10px] bg-[#FAF6F0] border border-dashed border-[#E5DCD3]">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Dynamic Theme Config</span>
                <span className="font-semibold" style={{ color: brandColor }}>{brandColor}</span>
              </div>

              {/* Invoice Layout */}
              <div className="border p-6 rounded-lg relative overflow-hidden" style={{ borderColor: brandColor }}>
                
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: brandColor }} />
                
                {/* Logo and Shop Header */}
                <div className="flex justify-between items-start border-b pb-4 mb-4" style={{ borderBottomColor: `${brandColor}20` }}>
                  <div>
                    <h3 className="serif-headline text-base font-bold text-[#5C4033]">True Store</h3>
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
                    &quot;{invoiceFooterNote}&quot;
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
          TRANSACTION SECURITY BARRIER POPUP MODAL (Firewall)
      ══════════════════════════════════════════════════════════ */}
      {securityModalOpen && (
        <div className="fixed inset-0 bg-[#2D1E17]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5DCD3] shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            
            {/* Header */}
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
            <div className="p-6 space-y-4 text-left">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
                <strong>Attention Required:</strong> You are about to initiate an active campaign broadcast loop. This will consume wallet credits and dispatch communications instantly to opt-in cohorts.
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-500 font-semibold">Broadcasting Channel</span>
                  <span className="font-bold text-slate-800 uppercase">WhatsApp (Official API)</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-500 font-semibold">Target Cohorts</span>
                  <span className="font-bold text-slate-800">VIP / Opt-in Customers</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-500 font-semibold">Recipients Queue Size</span>
                  <span className="font-bold text-slate-800">1,240 Contacts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Wallet Credits Deducted</span>
                  <span className="font-bold text-amber-700">1,240 Credits (Pre-Paid)</span>
                </div>
              </div>

              {/* Progress simulation state */}
              {dispatchStatus === 'broadcasting' && (
                <div className="py-4 text-center space-y-2">
                  <Loader2 size={24} className="text-[#B45309] animate-spin mx-auto" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Dispatching campaign packets...</p>
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

            {/* Modal Actions */}
            <div className="bg-slate-50 p-4 border-t flex justify-between items-center shrink-0">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                Double confirmation required
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
                      securityClickCount === 0 ? 'bg-[#5C4033] text-white hover:bg-[#C4A896]' :
                      securityClickCount === 1 ? 'bg-red-600 text-white animate-bounce' :
                      'bg-emerald-600 text-white'
                    }`}
                  >
                    {securityClickCount === 0 ? 'Confirm Broadcast Pipeline' : 'Click to Launch Broadcast'}
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
