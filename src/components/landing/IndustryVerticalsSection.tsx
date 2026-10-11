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
  roiStat: string;
  roiLabel: string;
  capabilities: string[];
  mockChat: {
    customer: string;
    bot: string;
  };
}

const VERTICALS: Vertical[] = [
  {
    id: 'healthcare',
    name: 'Clinics & Doctors',
    badge: 'Healthcare & Dental',
    icon: Stethoscope,
    headline: 'Book Patient Slots While The Reception Sleeps',
    description:
      'Patients message late at night after work when symptoms peak. FrontLoop answers doctor specialties, checks schedule availability, quotes consultation fees, and captures patient phone & reason.',
    roiStat: '74%',
    roiLabel: 'After-hours inquiries converted into morning clinic appointments',
    capabilities: [
      'Doctors roster & duty timings lookup',
      'Consultation fees & scan price quotes',
      'Direct clinic address & location pin dispatch',
      'Emergency escalation to on-call duty doctor',
    ],
    mockChat: {
      customer: 'Hi doctor, Dr. Ananya available tomorrow evening for pediatric checkup? What is the fee?',
      bot: 'Hello! Yes, Dr. Ananya is at the clinic tomorrow from 5:30 PM to 8:30 PM. The consultation fee is ₹500.\n\nWould you like me to reserve a 6:15 PM slot for your child?',
    },
  },
  {
    id: 'education',
    name: 'Coaching & Institutes',
    badge: 'EdTech & Tuition',
    icon: GraduationCap,
    headline: 'Qualify Student Leads & Dispatch Course Syllabi Instantly',
    description:
      'Students and parents comparing coaching academies demand immediate answers. FrontLoop delivers batch schedules, fee breakdowns, and syllabus brochures in seconds before they call rivals.',
    roiStat: '3.4x',
    roiLabel: 'Faster brochure delivery and higher demo class attendance',
    capabilities: [
      'Batch start dates & entrance exam streams (NEET/JEE/Civil)',
      'Automated syllabus & fee structure breakdown',
      'Scholarship test registration capture',
      'Instant parent counseling call request routing',
    ],
    mockChat: {
      customer: 'What are the batch timings for JEE Crash Course 2026? Nale demo class undo?',
      bot: 'Hello! Yes, our JEE 2026 Crash Course has morning (8 AM - 1 PM) and evening batches. Demo classes are scheduled for tomorrow at 10:00 AM!\n\nCan I have your name and school to register your free demo pass?',
    },
  },
  {
    id: 'wellness',
    name: 'Salons & Wellness',
    badge: 'Beauty & Spas',
    icon: Sparkles,
    headline: 'Fill Appointment Books Without Interrupting Stylists',
    description:
      'Staff with scissors or hair dye in hand cannot answer the phone. FrontLoop shares bridal packages, haircut menus, and confirms stylist availability effortlessly.',
    roiStat: '22 hrs',
    roiLabel: 'Front-desk phone reception time saved per stylist each month',
    capabilities: [
      'Service menu, styling packages & seasonal offers',
      'Stylist-specific availability & slot locking',
      'Post-treatment care FAQs (Keratin, Botox, Facials)',
      'Deposit payment & confirmation reminders',
    ],
    mockChat: {
      customer: 'How much is bridal trial package? Can I book for Sunday 11 AM?',
      bot: 'Hey! Our Bridal Glow Trial is ₹2,800 (includes hair trial, skin prep & consultation, ~90 mins). Sunday at 11:00 AM is available with our senior artist Shilpa!\n\nShall I lock in this slot for you?',
    },
  },
  {
    id: 'services',
    name: 'Local Services & Retail',
    badge: 'Home Services & Auto',
    icon: Wrench,
    headline: 'Quote Pricing & Collect Service Addresses on Autopilot',
    description:
      'Whether plumbing, vehicle servicing, or home AC repair, customers want quick estimates and service guarantees. FrontLoop logs location, vehicle model, and repair scope instantly.',
    roiStat: '100%',
    roiLabel: 'Inquiries recorded into dashboard with zero missed callbacks',
    capabilities: [
      'Standard inspection rate card & warranty policies',
      'Pickup & drop coordination for vehicle servicing',
      'Emergency service zone validation',
      'Automated lead export directly into CSV for field techs',
    ],
    mockChat: {
      customer: 'Do you provide doorstep car wash in Kakkanad? What is the cost for Swift?',
      bot: 'Yes! We cover Kakkanad daily. Complete interior vacuum + foam wash for hatchback (Swift) is ₹799.\n\nWe have slots open tomorrow at 9:30 AM or 2:00 PM. Which works best?',
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
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#0AAF76] bg-[#ECFDF5] px-3.5 py-1.5 rounded-full border border-[#0AAF76]/30">
            Tailored Industry Workflows
          </span>
          <h2 className="serif-headline text-2xl sm:text-4xl text-[#0F172A] mt-4 tracking-tight">
            Built For Offline Local Businesses That Cannot Afford Missed Inquiries
          </h2>
          <p className="text-sm text-[#64748B] mt-3">
            Every vertical comes pre-configured with industry-specific conversational intelligence and guardrails.
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
                    ? 'bg-[#0AAF76] text-white shadow-md'
                    : 'bg-white text-[#64748B] hover:text-[#0AAF76] hover:bg-slate-50 border border-[#E2E8F0]'
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
                <Icon size={14} className="text-[#0AAF76]" />
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
                    <CheckCircle2 size={15} className="text-[#0AAF76] shrink-0 mt-0.5" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>

              {/* ROI Callout */}
              <div className="pt-4 border-t border-[#E2E8F0] flex items-center gap-4">
                <div className="text-3xl sm:text-4xl font-extrabold text-[#0AAF76] font-mono">
                  {activeVertical.roiStat}
                </div>
                <div className="text-xs text-[#64748B] max-w-xs leading-snug">
                  {activeVertical.roiLabel}
                </div>
              </div>
            </div>

            {/* Right Column: Simulated Live Chat Preview */}
            <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-[#0AAF76] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    AI
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">{activeVertical.name} Desk</p>
                    <p className="text-[10px] text-[#0AAF76] font-medium">● Verified Cloud WhatsApp</p>
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
