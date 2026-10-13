import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import {
  MessageSquare,
  ArrowRight,
  Zap,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Bot,
  Users,
  Clock,
} from 'lucide-react';
import { IndustryVerticalsSection } from '@/components/landing/IndustryVerticalsSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { GlobalFooter } from '@/components/landing/GlobalFooter';
import { WhatsAppDemoSimulator } from '@/components/landing/WhatsAppDemoSimulator';
import { CONTACT, LIVE_DEMO_URL } from '@/lib/config';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const TRUST_STRIP = [
  'Strict Knowledge-Base Grounded Responses',
  'Strict Data Isolation',
  'Official WhatsApp Cloud API',
  'Live Human Handover',
];

const OLD_WAY = [
  {
    title: 'Receptionist on leave, nobody replies:',
    body: 'One sick day and the WhatsApp inbox piles up. Patients and parents book whoever answers first.',
  },
  {
    title: 'Busy phone lines at peak hours:',
    body: 'Your front desk is juggling walk-ins and calls while WhatsApp inquiries wait for hours.',
  },
  {
    title: 'Off-hours inquiries go cold:',
    body: 'Messages sent at 9:30 PM or on Sunday sit unread until the next morning, by then the lead has moved on.',
  },
  {
    title: 'Manual spreadsheet chaos:',
    body: 'Names and numbers copied by hand into notebooks and Excel sheets, with no follow-up pipeline.',
  },
];

const FRONTLOOP_WAY = [
  {
    title: 'Instant replies, 24/7:',
    body: 'Every inquiry gets a reply within seconds from your own knowledge base, at midnight or on a holiday.',
  },
  {
    title: 'Natural English & Malayalam context:',
    body: 'Understands English, Manglish, and mixed phrasing like "Fee ethraya?" without sounding robotic.',
  },
  {
    title: 'Lead intent captured automatically:',
    body: 'Name, phone, intent, and requirement are captured from the chat, with no staff typing.',
  },
  {
    title: 'Dashboard CRM stays up to date:',
    body: 'Every chat lands in your lead pipeline. Staff can pause the AI and reply from the dashboard in one click.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#047857] selection:text-white overflow-x-hidden">
      {/* 1. STICKY BRAND HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link href="/" aria-label="FrontLoop home" className="flex items-center shrink-0 transition-opacity hover:opacity-90">
            <BrandLogo size="md" priority />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wider uppercase text-[#64748B]">
            <a href="#problem" className="hover:text-[#047857] transition-colors">
              Problem
            </a>
            <a href="#verticals" className="hover:text-[#047857] transition-colors">
              Industries
            </a>
            <a href="#features" className="hover:text-[#047857] transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-[#047857] transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-[#047857] transition-colors">
              FAQs
            </a>
          </nav>

          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/auth/login"
              className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] px-2 sm:px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="bg-[#047857] hover:bg-[#065F46] text-white px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION (Above The Fold) */}
      <section className="w-full pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 max-w-6xl mx-auto text-center relative">
        <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-white border border-[#E2E8F0] px-3.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold text-[#475569] uppercase tracking-widest mb-8 shadow-sm">
          <Zap size={12} className="text-[#047857]" aria-hidden />
          <span>Built for Indian SMBs</span>
          <span aria-hidden>•</span>
          <span>Never Miss a Customer In-Chat</span>
        </div>

        <h1 className="text-[1.75rem] sm:text-5xl md:text-6xl font-bold tracking-tight text-[#0F172A] serif-headline max-w-5xl mx-auto leading-[1.15]">
          Every WhatsApp Inquiry Answered, Even After Hours.{' '}
          <span className="text-[#047857]">FrontLoop Replies in Seconds.</span>
        </h1>

        <p className="text-base sm:text-xl text-[#475569] max-w-3xl mx-auto mt-6 leading-relaxed">
          An AI WhatsApp front desk that answers patient and client inquiries 24/7, qualifies intent, captures lead
          requirements, quotes only the prices you have published, and hands conversations to your staff when they
          need a person, on your own business number.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-9">
          <a
            href={LIVE_DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#047857] hover:bg-[#065F46] text-white px-7 py-4 rounded-xl text-sm font-bold tracking-wide transition-all shadow-md cursor-pointer"
          >
            <MessageSquare size={17} aria-hidden />
            Experience Live WhatsApp Demo
          </a>
          <Link
            href="/auth/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E2E8F0] px-7 py-4 rounded-xl text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer"
          >
            Start Free Trial <ArrowRight size={16} aria-hidden />
          </Link>
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-[#475569]">
          {TRUST_STRIP.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-[#047857]" aria-hidden /> {item}
            </li>
          ))}
        </ul>

        <div className="mt-16">
          <WhatsAppDemoSimulator />
        </div>
      </section>

      {/* 3. PROBLEM VS SOLUTION: THE COST OF SLOW REPLIES */}
      <section id="problem" className="py-24 bg-white border-t border-[#E2E8F0] text-[#0F172A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold uppercase tracking-widest text-rose-800 bg-rose-50 px-3.5 py-1.5 rounded-full border border-rose-200">
              The Cost of Slow Replies
            </span>
            <h2 className="serif-headline text-2xl sm:text-4xl text-[#0F172A] mt-4 tracking-tight">
              Every Unanswered WhatsApp Is a Customer Booking Somewhere Else
            </h2>
            <p className="text-sm text-[#64748B] mt-3">
              Customers message when it suits them, not when your front desk is free. The business that replies first
              usually wins the booking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-[#FFF5F5] border border-rose-200 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
                <XCircle size={16} aria-hidden />
                Without FrontLoop
              </div>
              <h3 className="serif-headline text-xl text-[#0F172A]">Missed Chats, Lost Revenue</h3>
              <ul className="space-y-4 text-xs text-[#64748B]">
                {OLD_WAY.map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="text-rose-600 font-bold text-sm shrink-0" aria-hidden>
                      ✕
                    </span>
                    <span>
                      <strong className="text-[#0F172A]">{item.title}</strong> {item.body}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border-2 border-[#047857] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center gap-2 text-[#047857] font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 size={16} aria-hidden />
                With FrontLoop
              </div>
              <h3 className="serif-headline text-xl text-[#0F172A]">Every Inquiry Answered, Every Lead Logged</h3>
              <ul className="space-y-4 text-xs text-[#0F172A]">
                {FRONTLOOP_WAY.map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-[#047857] shrink-0 mt-0.5" aria-hidden />
                    <span>
                      <strong>{item.title}</strong> {item.body}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LIVE DEMO BANNER */}
      <section className="bg-[#0B1120] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#34D399]">
              <Clock size={13} aria-hidden /> Try it right now, from your own phone
            </p>
            <h2 className="serif-headline text-2xl sm:text-4xl mt-3 tracking-tight">
              Message our demo number and watch it reply in seconds.
            </h2>
            <p className="text-sm text-slate-300 mt-3 max-w-2xl">
              Ask about fees, timings, or a booking, in English or Manglish. The same engine runs on your business
              number once you connect it.
            </p>
          </div>
          <a
            href={LIVE_DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1DA851] text-[#0B1120] px-7 py-4 rounded-xl text-sm font-bold tracking-wide transition-all shadow-md"
          >
            <MessageSquare size={17} aria-hidden />
            WhatsApp {CONTACT.phoneDisplay}
          </a>
        </div>
      </section>

      {/* 5. INDUSTRY VERTICALS SECTION (Tabs & Capabilities) */}
      <IndustryVerticalsSection />

      {/* 6. COMPETITIVE MOATS & FEATURES */}
      <section id="features" className="py-24 bg-[#F8FAFC] border-t border-[#E2E8F0] text-[#0F172A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#047857] bg-[#ECFDF5] px-3.5 py-1.5 rounded-full border border-[#047857]/30">
              Enterprise Technology Simplified
            </span>
            <h2 className="serif-headline text-2xl sm:text-4xl text-[#0F172A] mt-4 tracking-tight">
              Why Local Businesses Choose FrontLoop
            </h2>
            <p className="text-sm text-[#64748B] mt-3">
              Engineered specifically for high-intent customer conversations, not generic chatbot nonsense.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-3.5 hover:border-[#047857] transition-all shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] text-[#047857] flex items-center justify-center">
                <Bot size={20} className="text-[#047857]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                Manglish &amp; Regional Fluency
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Understands conversational phrasing like &ldquo;Fee ethraya?&rdquo;, &ldquo;Dr. Priya evideya?&rdquo;, and English-Malayalam hybrid phrasing naturally.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-3.5 hover:border-[#047857] transition-all shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] text-[#047857] flex items-center justify-center">
                <Users size={20} className="text-[#047857]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                1-Click Human Takeover
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Staff pause the AI on any chat with one click and reply straight from the dashboard. Chats waiting for a person are grouped under Needs Human.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-3.5 hover:border-[#047857] transition-all shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] text-[#047857] flex items-center justify-center">
                <ShieldCheck size={20} className="text-[#047857]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                Anti-Hallucination Guardrails
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                The AI is instructed to answer only from your knowledge base. When something is not listed, it tells the customer your team will confirm instead of guessing fees or names.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-3.5 hover:border-[#047857] transition-all shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] text-[#047857] flex items-center justify-center">
                <TrendingUp size={20} className="text-[#047857]" />
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

      {/* 7. TRANSPARENT DONE-FOR-YOU PRICING */}
      <PricingSection />

      {/* 8. FREQUENTLY ASKED QUESTIONS */}
      <FaqSection />

      {/* 9. GLOBAL FOOTER */}
      <GlobalFooter />
    </div>
  );
}
