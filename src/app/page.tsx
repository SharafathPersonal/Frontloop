'use client';

import { useEffect, useRef, useState } from 'react';
import { DeadStockLandingSection } from '@/components/dead-stock-landing';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrinityMatrixSection } from '@/components/landing/TrinityMatrixSection';
import { WhatsAppStatusSection } from '@/components/landing/WhatsAppStatusSection';
import { UniversalInvoiceSection } from '@/components/landing/UniversalInvoiceSection';
import { LedgerSection } from '@/components/landing/LedgerSection';
import { TechnicalMatrixSection } from '@/components/landing/TechnicalMatrixSection';
import { RealityCheckSection } from '@/components/landing/RealityCheckSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { BillPreviewModal } from '@/components/landing/BillPreviewModal';
import { SecurityFirewallModal } from '@/components/landing/SecurityFirewallModal';

import {
  BrandPresetColor, CartItem, AudienceMember,
  LedgerUsage, CashfreeLog, ParsedContact
} from '@/components/landing/types';

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // 1. BRAND ACCENT PRESET STATE
  const BRAND_PRESET_COLORS: BrandPresetColor[] = [
    { name: 'Luxury Chocolate', hex: '#5C4033', bg: 'bg-[#5C4033]' },
    { name: 'Warm Amber', hex: '#B45309', bg: 'bg-[#B45309]' },
    { name: 'Emerald Forest', hex: '#047857', bg: 'bg-[#047857]' },
    { name: 'Imperial Crimson', hex: '#B91C1C', bg: 'bg-[#B91C1C]' },
    { name: 'Charcoal Noir', hex: '#2D1E17', bg: 'bg-[#2D1E17]' }
  ];

  const [brandColor, setBrandColor] = useState('#5C4033');

  // 2. HERO CART & INBOX STATE (POS Terminal)
  const [cart, setCart] = useState<CartItem[]>([
    { id: 1, name: 'Pure Cotton Summer Shirt', price: 1299, qty: 1 },
    { id: 2, name: 'Organic Linen Trousers', price: 1899, qty: 1 }
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const invoiceFooterNote = 'Thank you for visiting. Scan to claim wallet loyalty credits.';
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
      alert(`INV-1002-BILL.pdf downloaded successfully. (Theme Accent: ${brandColor})`);
    }, 1200);
  };

  // 3. FLASH OFFERS STATE (Card 1)
  const [offerActive, setOfferActive] = useState(true);
  const [webPushBroadcast, setWebPushBroadcast] = useState(false);
  const [originalPrice, setOriginalPrice] = useState(500);
  const [discountPrice, setDiscountPrice] = useState(399);
  const [offerImageIndex, setOfferImageIndex] = useState(0);
  const [isOfferUploading, setIsOfferUploading] = useState(false);

  const offerImages = [
    { name: 'Fresh Organic Avocados', description: 'Grown locally, ripe and ready.' },
    { name: 'Premium Coffee Beans', description: 'Single origin medium roast Arabica.' },
    { name: 'Artisan Sourdough Bread', description: 'Freshly baked stone-ground wheat.' }
  ];

  const computedDiscount = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);

  const cycleOfferImage = () => {
    setIsOfferUploading(true);
    setTimeout(() => {
      setOfferImageIndex((prev) => (prev + 1) % offerImages.length);
      setIsOfferUploading(false);
    }, 600);
  };

  // 4. DIGITAL BILLING BARCODE SCANNER STATE (Card 2)
  const [scannerActive, setScannerActive] = useState(true);
  const [scanHistoryLogs, setScanHistoryLogs] = useState<string[]>([
    '[16:50:12] SCAN SUCCESS: 978020137962 -> Cotton Summer Shirt added'
  ]);
  const [justScanned, setJustScanned] = useState(false);

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

      setScanHistoryLogs(prev => [
        `[${timeStr}] SCAN SUCCESS: ${randomItem.code} -> ${randomItem.name}`,
        ...prev.slice(0, 5)
      ]);

      setJustScanned(true);
      setTimeout(() => setJustScanned(false), 800);

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

  // 5. AUDIENCE REGISTRY STATE (Card 3)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('ALL');
  
  const audienceList: AudienceMember[] = [
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

  // 6. DUAL-STATE TRANSACTION LEDGER STATE
  const [activeLedgerTab, setActiveLedgerTab] = useState<'purchases' | 'usages'>('usages');
  const [ledgerUsages, setLedgerUsages] = useState<LedgerUsage[]>([
    { id: 'u-1', type: 'Web Push Broadcast', desc: 'Weekend Flash Sale Launch', date: 'Just now', credits: '2.0 Credits', status: 'delivered' },
    { id: 'u-2', type: 'Digital Invoice Dispatch', desc: 'INV-1002', date: '12 mins ago', credits: '1.0 Credit', status: 'delivered' },
    { id: 'u-3', type: 'Web Push Broadcast', desc: 'Rain-Day Special Discount', date: '45 mins ago', credits: '2.0 Credits', status: 'delivered' },
    { id: 'u-4', type: 'Digital Invoice Dispatch', desc: 'INV-1001', date: '1 hour ago', credits: '1.0 Credit', status: 'delivered' }
  ]);
  const [isLoadingMoreUsages, setIsLoadingMoreUsages] = useState(false);
  const [hasMoreUsages, setHasMoreUsages] = useState(true);

  const handleLoadMoreUsages = () => {
    if (isLoadingMoreUsages || !hasMoreUsages) return;
    setIsLoadingMoreUsages(true);

    setTimeout(() => {
      const nextBatch: LedgerUsage[] = [
        { id: 'u-5', type: 'Digital Invoice Dispatch', desc: 'INV-1000', date: '1 day ago', credits: '1.0 Credit', status: 'delivered' },
        { id: 'u-6', type: 'Web Push Broadcast', desc: 'Holiday Collection Announcement', date: '2 days ago', credits: '2.0 Credits', status: 'delivered' }
      ];
      setLedgerUsages(prev => [...prev, ...nextBatch]);
      setIsLoadingMoreUsages(false);
      setHasMoreUsages(false);
    }, 1200);
  };

  const cashfreeLogs: CashfreeLog[] = [
    { id: 'CF-TXN-90231', date: 'Jul 12, 2026', tokens: '10,000 Tokens', amount: '₹10,000.00', status: 'Success' },
    { id: 'CF-TXN-88421', date: 'Jun 28, 2026', tokens: '5,000 Tokens', amount: '₹5,000.00', status: 'Success' },
    { id: 'CF-TXN-85102', date: 'May 15, 2026', tokens: '10,000 Tokens', amount: '₹10,000.00', status: 'Success' }
  ];

  // 7. SECURITY FIREWALL MODAL STATE
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
        const newRecord: LedgerUsage = {
          id: `u-new-${Date.now()}`,
          type: 'Web Push Broadcast',
          desc: 'Weekend Flash Sale Launch',
          date: 'Just now',
          credits: '2.0 Credits',
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

  // 8. TECHNICAL ARCHITECTURE STATE
  const [csvStatus, setCsvStatus] = useState<'idle' | 'uploading' | 'parsed'>('idle');
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);

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
  const [roughText, setRoughText] = useState('hey buyer we got new clothes in our shop 20 percent discount if you visit this sunday');
  const [polishedOutput, setPolishedOutput] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);

  const handlePolishText = () => {
    if (!roughText.trim()) {
      alert("Error: Input text cannot be empty.");
      return;
    }
    if (roughText.length > 300) {
      alert("Error: Input exceeds maximum 300 characters.");
      return;
    }

    setIsPolishing(true);
    setPolishedOutput('');
    setTimeout(() => {
      setIsPolishing(false);
      setPolishedOutput(
        `Hi {{1}}. Exclusive new collections are now available at {{2}}. Enjoy an exclusive 20 percent privilege savings when you visit us this Sunday. View Catalog: {{3}}`
      );
    }, 1200);
  };

  // LENIS & GSAP INTEGRATION
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
    setBrandColor(hex);
  };

  return (
    <main className="w-full max-w-full min-h-screen overflow-x-hidden relative text-[#2D1E17] antialiased bg-[#FAF6F0]">
      {/* Global Landing Styles */}
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

      {/* Floating Header */}
      <LandingHeader headerRef={headerRef} isScrolled={isScrolled} />

      {/* Hero Section */}
      <HeroSection
        heroRef={heroRef}
        cart={cart}
        newItemName={newItemName}
        setNewItemName={setNewItemName}
        newItemPrice={newItemPrice}
        setNewItemPrice={setNewItemPrice}
        handleAddItem={handleAddItem}
        removeItem={removeItem}
        subtotal={subtotal}
        gst={gst}
        total={total}
        scannerActive={scannerActive}
        justScanned={justScanned}
        brandColor={brandColor}
        invoiceFooterNote={invoiceFooterNote}
        handleDownloadBill={handleDownloadBill}
        isDownloading={isDownloading}
        setShowBillModal={setShowBillModal}
        brandPresetColors={BRAND_PRESET_COLORS}
        selectPresetColor={selectPresetColor}
      />

      {/* Trinity Visual Matrix */}
      <TrinityMatrixSection
        offerImages={offerImages}
        offerImageIndex={offerImageIndex}
        cycleOfferImage={cycleOfferImage}
        isOfferUploading={isOfferUploading}
        originalPrice={originalPrice}
        setOriginalPrice={setOriginalPrice}
        discountPrice={discountPrice}
        setDiscountPrice={setDiscountPrice}
        computedDiscount={computedDiscount}
        offerActive={offerActive}
        setOfferActive={setOfferActive}
        webPushBroadcast={webPushBroadcast}
        setWebPushBroadcast={setWebPushBroadcast}
        scannerActive={scannerActive}
        setScannerActive={setScannerActive}
        justScanned={justScanned}
        scanHistoryLogs={scanHistoryLogs}
        total={total}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedTagFilter={selectedTagFilter}
        setSelectedTagFilter={setSelectedTagFilter}
        filteredAudience={filteredAudience}
        triggerSecurityModal={triggerSecurityModal}
      />

      {/* WhatsApp Status Loop */}
      <WhatsAppStatusSection />

      {/* Universal Invoice Cross-Sell */}
      <UniversalInvoiceSection />

      {/* Account Ledgers */}
      <LedgerSection
        activeLedgerTab={activeLedgerTab}
        setActiveLedgerTab={setActiveLedgerTab}
        cashfreeLogs={cashfreeLogs}
        ledgerUsages={ledgerUsages}
        hasMoreUsages={hasMoreUsages}
        isLoadingMoreUsages={isLoadingMoreUsages}
        handleLoadMoreUsages={handleLoadMoreUsages}
      />

      {/* Technical Ingestion Matrix */}
      <TechnicalMatrixSection
        csvStatus={csvStatus}
        setCsvStatus={setCsvStatus}
        parsedContacts={parsedContacts}
        handleSimulatedCsvUpload={handleSimulatedCsvUpload}
        roughText={roughText}
        setRoughText={setRoughText}
        polishedOutput={polishedOutput}
        isPolishing={isPolishing}
        handlePolishText={handlePolishText}
      />

      {/* Dead Stock Marketplace Landing Section */}
      <DeadStockLandingSection />

      {/* Reality Check Comparison */}
      <RealityCheckSection />

      {/* Footer */}
      <LandingFooter />

      {/* Modals */}
      <BillPreviewModal
        showBillModal={showBillModal}
        setShowBillModal={setShowBillModal}
        brandColor={brandColor}
        cart={cart}
        subtotal={subtotal}
        gst={gst}
        total={total}
        invoiceFooterNote={invoiceFooterNote}
        handleDownloadBill={handleDownloadBill}
      />

      <SecurityFirewallModal
        securityModalOpen={securityModalOpen}
        setSecurityModalOpen={setSecurityModalOpen}
        dispatchStatus={dispatchStatus}
        securityClickCount={securityClickCount}
        handleSecurityVerification={handleSecurityVerification}
      />
    </main>
  );
}
