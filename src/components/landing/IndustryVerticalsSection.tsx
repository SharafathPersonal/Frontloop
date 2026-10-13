'use client';

import { useState } from 'react';
import {
  Stethoscope,
  GraduationCap,
  Sparkles,
  Wrench,
  CheckCircle2,
} from 'lucide-react';

interface Vertical {
  id: string;
  name: string;
  badge: string;
  icon: typeof Stethoscope;
  headline: string;
  description: string;
  highlight: string;
  highlightLabel: string;
  capabilities: string[];
  mockChat: {
    customer: string;
    bot: string;
  };
}

// Capabilities describe what the bot does from the business's own knowledge base:
// it answers, qualifies and captures. It does not book, lock slots, or take payments.
const VERTICALS: Vertical[] = [
  {
    id: 'healthcare',
    name: 'Clinics & Doctors',
    badge: 'Healthcare & Dental',
    icon: Stethoscope,
    headline: 'Answer Patient Questions While The Reception Is Closed',
    description:
      'Patients often message late at night after work. FrontLoop answers doctor timings and consultation fees from your knowledge base, captures the patient\'s name and reason for visit, and leaves the confirmation to your front desk.',
    highlight: '24/7',
    highlightLabel: 'Doctor timings and consultation fees answered, even after the clinic closes',
    capabilities: [
      'Doctor timings & duty hours from your schedule',
      'Consultation and scan fees from your price list',
      'Clinic address & directions shared as text',
      'Urgent or complex requests handed to your staff',
    ],
    mockChat: {
      customer: 'Hi doctor, Dr. Ananya available tomorrow evening for pediatric checkup? What is the fee?',
      bot: 'Hello! Dr. Ananya sees patients tomorrow from 5:30 PM to 8:30 PM. The consultation fee is ₹500.\n\nMay I have your child\'s name and a preferred time? Our front desk will confirm the slot with you.',
    },
  },
  {
    id: 'education',
    name: 'Coaching & Institutes',
    badge: 'EdTech & Tuition',
    icon: GraduationCap,
    headline: 'Qualify Student Leads & Answer Course Questions Instantly',
    description:
      'Students and parents comparing coaching academies want answers before they call a rival. FrontLoop shares batch timings and fee details from your knowledge base and captures each student\'s course interest for your counsellors.',
    highlight: 'Seconds',
    highlightLabel: 'Batch timings and fee questions answered while parents are still comparing',
    capabilities: [
      'Batch start dates & exam streams (NEET/JEE/Civil)',
      'Course fee breakdowns from your fee list',
      'Demo class and counselling interest captured',
      'Parent call-back requests handed to your team',
    ],
    mockChat: {
      customer: 'What are the batch timings for JEE Crash Course 2026? Nale demo class undo?',
      bot: 'Hello! Our JEE 2026 Crash Course has a morning batch (8 AM - 1 PM) and an evening batch. Demo classes are held on Saturdays at 10:00 AM.\n\nCan I have your name and school? Our counsellor will call you to confirm a demo seat.',
    },
  },
  {
    id: 'wellness',
    name: 'Salons & Wellness',
    badge: 'Beauty & Spas',
    icon: Sparkles,
    headline: 'Answer Service & Price Questions Without Interrupting Stylists',
    description:
      'Staff with scissors or hair dye in hand cannot answer the phone. FrontLoop shares your service menu and package prices, then captures the customer\'s preferred day so your team can confirm the appointment.',
    highlight: 'Hands-free',
    highlightLabel: 'Service menu and price questions handled without pulling a stylist off a client',
    capabilities: [
      'Service menu & package prices',
      'Opening hours from your weekly schedule',
      'Post-treatment care FAQs (Keratin, Facials)',
      'Preferred day and service captured for your team',
    ],
    mockChat: {
      customer: 'How much is bridal trial package? Can I book for Sunday 11 AM?',
      bot: 'Hey! Our Bridal Glow Trial is ₹2,800 (hair trial, skin prep & consultation, about 90 mins). We are open Sundays from 10 AM.\n\nMay I have your name? Our team will confirm the 11 AM slot with you shortly.',
    },
  },
  {
    id: 'services',
    name: 'Local Services & Retail',
    badge: 'Home Services & Auto',
    icon: Wrench,
    headline: 'Quote Published Rates & Capture Job Details on Autopilot',
    description:
      'Whether plumbing, vehicle servicing, or home AC repair, customers want quick estimates. FrontLoop quotes the rates you have published and captures the location, vehicle, and job details for your team.',
    highlight: 'Every chat',
    highlightLabel: 'Inquiries logged in your dashboard with the customer\'s requirement attached',
    capabilities: [
      'Standard rate card & warranty policies',
      'Service areas you cover',
      'Job details captured into the lead pipeline',
      'Lead export to CSV for field teams',
    ],
    mockChat: {
      customer: 'Do you provide doorstep car wash in Kakkanad? What is the cost for Swift?',
      bot: 'Yes, we cover Kakkanad. A complete interior vacuum + foam wash for a hatchback like the Swift is ₹799.\n\nWhich day suits you? Our team will call to confirm a time.',
    },
  },
];

export function IndustryVerticalsSection() {
  const [activeTab, setActiveTab] = useState(VERTICALS[0].id);
  const activeVertical = VERTICALS.find((v) => v.id === activeTab) || VERTICALS[0];
  const Icon = activeVertical.icon;

  return (
    <section id="verticals" className="py-24 bg-white border-t border-[#E2E8F0] text-[#0F172A] relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#047857] bg-[#ECFDF5] px-3.5 py-1.5 rounded-full border border-[#047857]/30">
            Tailored Industry Workflows
          </span>
          <h2 className="serif-headline text-2xl sm:text-4xl text-[#0F172A] mt-4 tracking-tight">
            Built For Offline Local Businesses That Cannot Afford Missed Inquiries
          </h2>
          <p className="text-sm text-[#64748B] mt-3">
            Each workspace answers from your own knowledge base: your services, prices, hours, and FAQs.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
          {VERTICALS.map((vert) => {
            const TabIcon = vert.icon;
            const isActive = vert.id === activeTab;
            return (
              <button
                key={vert.id}
                onClick={() => setActiveTab(vert.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#047857] text-white shadow-md'
                    : 'bg-white text-[#64748B] hover:text-[#047857] hover:bg-slate-50 border border-[#E2E8F0]'
                }`}
              >
                <TabIcon size={14} className={isActive ? 'text-white' : 'text-[#64748B]'} />
                {vert.name}
              </button>
            );
          })}
        </div>

        {/* Tab Content Box */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Vertical Copy & Metrics */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 bg-white text-[#0F172A] text-xs font-semibold px-3 py-1 rounded-lg border border-[#E2E8F0] shadow-xs">
                <Icon size={14} className="text-[#047857]" />
                {activeVertical.badge}
              </div>

              <h3 className="serif-headline text-xl sm:text-2xl text-[#0F172A] tracking-tight">
                {activeVertical.headline}
              </h3>

              <p className="text-sm text-[#64748B] leading-relaxed">
                {activeVertical.description}
              </p>

              {/* Capabilities checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {activeVertical.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-[#0F172A]">
                    <CheckCircle2 size={15} className="text-[#047857] shrink-0 mt-0.5" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>

              {/* Highlight Callout */}
              <div className="pt-4 border-t border-[#E2E8F0] flex items-center gap-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#047857]">
                  {activeVertical.highlight}
                </div>
                <div className="text-xs text-[#64748B] max-w-xs leading-snug">
                  {activeVertical.highlightLabel}
                </div>
              </div>
            </div>

            {/* Right Column: Simulated Live Chat Preview */}
            <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-[#047857] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    AI
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">{activeVertical.name} Desk</p>
                    <p className="text-[10px] text-[#047857] font-medium">● Illustrative example chat</p>
                  </div>
                </div>
                <span className="text-[10px] text-[#64748B] font-mono">10:48 PM</span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <div className="flex justify-end">
                  <div className="bg-[#F1F5F9] text-[#0F172A] rounded-2xl rounded-tr-none px-3.5 py-2.5 max-w-[90%] border border-[#E2E8F0]">
                    {activeVertical.mockChat.customer}
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-[#0F172A] text-white rounded-2xl rounded-tl-none px-3.5 py-2.5 max-w-[90%] whitespace-pre-wrap shadow-sm">
                    {activeVertical.mockChat.bot}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
