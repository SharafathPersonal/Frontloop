import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import {
  MessageSquare,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Bot,
  Users,
} from 'lucide-react';
import { IndustryVerticalsSection } from '@/components/landing/IndustryVerticalsSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { GlobalFooter } from '@/components/landing/GlobalFooter';
import { DEMO_WHATSAPP_NUMBER } from '@/lib/config';

export default function LandingPage() {
  const liveDemoUrl = DEMO_WHATSAPP_NUMBER
    ? `https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=${encodeURIComponent(
        'Hello, I would like to test your AI receptionist demo for my clinic/business.',
      )}`
    : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#0AAF76] selection:text-white">
      {/* 1. STICKY BRAND HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="FrontLoop home" className="flex items-center transition-opacity hover:opacity-90">
            <BrandLogo size="md" priority />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wider uppercase text-[#64748B]">
            <a href="#problem" className="hover:text-[#0AAF76] transition-colors">
              Problem
            </a>
            <a href="#verticals" className="hover:text-[#0AAF76] transition-colors">
              Industries
            </a>
            <a href="#features" className="hover:text-[#0AAF76] transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-[#0AAF76] transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-[#0AAF76] transition-colors">
              FAQs
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="bg-[#0AAF76] hover:bg-[#089163] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION (Above The Fold) */}
      <section className="pt-20 pb-20 sm:pt-28 sm:pb-28 px-4 sm:px-6 max-w-6xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 bg-white border border-[#E2E8F0] px-3.5 py-1.5 rounded-full text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-8 shadow-sm">
          <Sparkles size={12} className="text-[#0AAF76]" />
          Autonomous 24/7 WhatsApp AI Receptionist for Local SMBs
        </div>

        <h1 className="text-3xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#0F172A] serif-headline max-w-5xl mx-auto leading-[1.12]">
          Stop Losing Business to{' '}
          <span className="text-[#0AAF76] underline decoration-[#0AAF76]/40 underline-offset-8">
            Unanswered WhatsApp Messages.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-[#64748B] max-w-3xl mx-auto mt-6 leading-relaxed">
          Your 24/7 AI Receptionist that qualifies leads, answers FAQs in English &amp; Manglish, and books appointments directly inside WhatsApp.
        </p>

        {/* Primary & Interactive CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-9">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#0AAF76] hover:bg-[#089163] text-white px-7 py-4 rounded-xl text-sm font-bold tracking-wide uppercase transition-all shadow-md cursor-pointer"
          >
            Start Free Trial <ArrowRight size={16} />
          </Link>

          {liveDemoUrl && (
            <a
              href={liveDemoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E2E8F0] px-7 py-4 rounded-xl text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer"
            >
              <MessageSquare size={17} className="text-[#0AAF76]" />
              Chat with Live Demo Bot
            </a>
          )}
        </div>

        {/* Trust Badges Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#64748B]">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#0AAF76]" /> Zero coding required
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#0AAF76]" /> Official Meta Cloud API
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#0AAF76]" /> 10-minute automated setup
          </span>
        </div>

        {/* Interactive Simulated WhatsApp Hero Preview */}
        <div className="mt-16 max-w-2xl mx-auto bg-white border border-[#E2E8F0] rounded-3xl shadow-xl p-4 sm:p-6 text-left relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3.5 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#0AAF76] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                AI
              </div>
              <div>
                <p className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                  Dr. Sharma Multi-Specialty Clinic
                  <ShieldCheck size={13} className="text-[#0AAF76]" />
                </p>
                <p className="text-[10px] text-[#0AAF76] font-medium">● Active Now • 24/7 AI Receptionist</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#64748B] font-mono block">10:45 PM (After Hours)</span>
              <span className="text-[9px] text-[#0AAF76] font-bold uppercase tracking-wider">Sub-2s Reply</span>
            </div>
          </div>

          <div className="space-y-3.5 text-xs leading-relaxed">
            {/* Customer Message 1 */}
            <div className="flex justify-end">
              <div className="bg-[#F1F5F9] text-[#0F172A] rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%] border border-[#E2E8F0] shadow-sm">
                Hi! Nale evening dermatologist Dr. Priya available aano? Consultation fee ethraya?
                <div className="text-right text-[9px] text-[#64748B] mt-1">10:45 PM ✓✓</div>
              </div>
            </div>

            {/* Bot Reply 1 */}
            <div className="flex justify-start">
              <div className="bg-[#0F172A] text-white rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] shadow-md">
                Hello! Yes, Dr. Priya (Dermatologist) has consultation slots tomorrow from <strong>5:00 PM to 8:30 PM</strong>.<br /><br />
                The consultation fee is <strong>₹600</strong>.<br /><br />
                May I have your name to hold a 6:00 PM slot for you?
                <div className="text-left text-[9px] text-[#0AAF76] mt-1.5 font-medium">10:45 PM • Automated Response</div>
              </div>
            </div>

            {/* Customer Message 2 */}
            <div className="flex justify-end">
              <div className="bg-[#F1F5F9] text-[#0F172A] rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%] border border-[#E2E8F0] shadow-sm">
                Name is Anjali Nair. 6:00 PM is perfect!
                <div className="text-right text-[9px] text-[#64748B] mt-1">10:46 PM ✓✓</div>
              </div>
            </div>

            {/* Bot Reply 2 */}
            <div className="flex justify-start">
              <div className="bg-[#0F172A] text-white rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] shadow-md">
                Confirmed for <strong>Anjali Nair</strong>! Your appointment request with Dr. Priya is logged for tomorrow at 6:00 PM. Our clinic staff will confirm upon arrival.<br /><br />
                📍 Location: 2nd Floor, Indiranagar Hub. See you tomorrow!
                <div className="text-left text-[9px] text-[#0AAF76] mt-1.5 font-medium">10:46 PM • Lead Captured &amp; Synced</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM VS SOLUTION (Before & After) */}
      <section id="problem" className="py-24 bg-white border-t border-[#E2E8F0] text-[#0F172A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold uppercase tracking-widest text-rose-800 bg-rose-50 px-3.5 py-1.5 rounded-full border border-rose-200">
              The Reality Of Local Business Inboxes
            </span>
            <h2 className="serif-headline text-2xl sm:text-4xl text-[#0F172A] mt-4 tracking-tight">
              Why Traditional Front Desks Bleed High-Intent Leads
            </h2>
            <p className="text-sm text-[#64748B] mt-3">
              Your prospects message on WhatsApp when it&apos;s convenient for them, not during your reception desk hours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* The Old Way */}
            <div className="bg-[#FFF5F5] border border-rose-200 rounded-3xl p-8 space-y-6 relative overflow-hidden">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
                <XCircle size={16} />
                The Old Broken Way
              </div>
              <h3 className="serif-headline text-xl text-[#0F172A]">
                Manual Typing &amp; Delayed Responses
              </h3>
              <ul className="space-y-4 text-xs text-[#64748B]">
                <li className="flex items-start gap-3">
                  <span className="text-rose-600 font-bold text-sm shrink-0">✕</span>
                  <span><strong className="text-[#0F172A]">Inquiries at 9:30 PM go cold:</strong> Patients and parents message at night and book whoever replies first.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-600 font-bold text-sm shrink-0">✕</span>
                  <span><strong className="text-[#0F172A]">Reception desk fatigue:</strong> Staff endlessly type the same directions, timings, and fees hundreds of times a week.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-600 font-bold text-sm shrink-0">✕</span>
                  <span><strong className="text-[#0F172A]">Unorganized chats:</strong> Valuable lead numbers get lost deep down in a cluttered single mobile phone inbox.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-600 font-bold text-sm shrink-0">✕</span>
                  <span><strong className="text-[#0F172A]">Zero tracking:</strong> No pipeline, no exportable database, no visibility into lost conversions.</span>
                </li>
              </ul>
            </div>

            {/* The FrontLoop Way */}
            <div className="bg-white border-2 border-[#0AAF76] rounded-3xl p-8 space-y-6 relative overflow-hidden shadow-xl">
              <div className="flex items-center gap-2 text-[#0AAF76] font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 size={16} />
                The FrontLoop AI Way
              </div>
              <h3 className="serif-headline text-xl text-[#0F172A]">
                Sub-3s Autonomous Conversational Reception
              </h3>
              <ul className="space-y-4 text-xs text-[#0F172A]">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Sub-3-second responses 24/7:</strong> Night or Sunday, inquiries receive polite, authoritative business answers in seconds.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Bilingual natural comprehension:</strong> Understands English, Manglish, and colloquial local syntax effortlessly.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Instant 1-Click human takeover:</strong> Your staff can pause the bot and chat directly whenever personal care is needed.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Centralized Lead CRM:</strong> Inquiries automatically extract name, phone, and requirements into your dashboard.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INDUSTRY VERTICALS SECTION (Tabs & Capabilities) */}
      <IndustryVerticalsSection />

      {/* 5. COMPETITIVE MOATS & FEATURES */}
      <section id="features" className="py-24 bg-[#F8FAFC] border-t border-[#E2E8F0] text-[#0F172A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#0AAF76] bg-[#ECFDF5] px-3.5 py-1.5 rounded-full border border-[#0AAF76]/30">
              Enterprise Technology Simplified
            </span>
            <h2 className="serif-headline text-2xl sm:text-4xl text-[#0F172A] mt-4 tracking-tight">
              Why Leading SMBs Switch To FrontLoop
            </h2>
            <p className="text-sm text-[#64748B] mt-3">
              Engineered specifically for high-intent customer conversations, not generic chatbot nonsense.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-3.5 hover:border-[#0AAF76] transition-all shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] text-[#0AAF76] flex items-center justify-center">
                <Bot size={20} className="text-[#0AAF76]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                Manglish &amp; Regional Fluency
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Trained to interpret conversational syntax like &ldquo;Fee ethraya?&rdquo;, &ldquo;Dr. Priya evideya?&rdquo;, and English-Malayalam hybrid phrasing naturally.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-3.5 hover:border-[#0AAF76] transition-all shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] text-[#0AAF76] flex items-center justify-center">
                <Users size={20} className="text-[#0AAF76]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                1-Click Human Takeover
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Staff can toggle &ldquo;botPaused&rdquo; with one click. The AI immediately suspends automated replies so your staff can chat freely.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-3.5 hover:border-[#0AAF76] transition-all shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] text-[#0AAF76] flex items-center justify-center">
                <ShieldCheck size={20} className="text-[#0AAF76]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                Anti-Hallucination Guardrails
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Strict ground truth policy. Answers are only synthesized from your verified Knowledge Base. The bot never hallucinates fake fees or doctors.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-3.5 hover:border-[#0AAF76] transition-all shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] text-[#0AAF76] flex items-center justify-center">
                <TrendingUp size={20} className="text-[#0AAF76]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                Exportable Leads Pipeline
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Every captured lead is organized by intent and date. Filter by status, search by phone, and export to CSV with 1 click anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRANSPARENT DONE-FOR-YOU PRICING */}
      <PricingSection />

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <FaqSection />

      {/* 8. GLOBAL FOOTER */}
      <GlobalFooter />
    </div>
  );
}
