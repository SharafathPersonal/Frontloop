'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'Do I need to leave my phone switched on or connected to the internet?',
    answer:
      'No. FrontLoop runs directly on Meta’s official WhatsApp Cloud API serverless infrastructure. Even if your physical phone is switched off, out of battery, or traveling without reception, your AI Receptionist operates 24/7 in the cloud without interruption.',
  },
  {
    question: 'Will this risk getting my business WhatsApp number banned?',
    answer:
      'FrontLoop connects only through Meta’s official WhatsApp Cloud API, not unofficial QR-code or WhatsApp Web automation, which is what usually gets numbers banned. It replies only to customers who message you first and never sends bulk broadcasts. Like any WhatsApp Business account, your number must still follow Meta’s WhatsApp Business Policy.',
  },
  {
    question: 'Can my human staff step in and reply manually when needed?',
    answer:
      'Yes. Every conversation has a one-click Human Takeover switch, and staff can reply directly from the dashboard. When a customer asks for a person, the AI pauses itself and the chat appears under Needs Human. Meta allows these free-form replies within 24 hours of the customer’s last message.',
  },
  {
    question: 'How do I add my clinic, institute, or salon details?',
    answer:
      'You configure your knowledge base directly inside your dashboard: business context, services with prices, weekly operating hours, and custom FAQs. Whenever your schedule or prices change, update the dashboard and the next reply uses the new information.',
  },
  {
    question: 'How does the AI handle regional language phrasing like Manglish or Hinglish?',
    answer:
      'The AI understands conversational mixed English and regional phrasing (such as "Nale doctor undo?", "Fee ethraya?", or "Do you have slots evening?"), identifies the customer’s intent, and replies in the language they wrote in.',
  },
  {
    question: 'What happens if a customer asks a question not in my knowledge base?',
    answer:
      'The AI is instructed to answer only from your knowledge base. If a question is outside your configured information, it tells the customer your team will confirm rather than guessing prices or policies, and the full conversation stays in your dashboard for follow-up.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-24 bg-[#FFFFFF] border-t border-[#E2E8F0] text-[#0F172A] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#64748B] bg-[#F8FAFC] px-3.5 py-1.5 rounded-full border border-[#E2E8F0]">
            Frequently Answered Questions
          </span>
          <h2 className="serif-headline text-2xl sm:text-4xl text-[#0F172A] mt-4 tracking-tight">
            Everything You Need To Know
          </h2>
          <p className="text-sm text-[#64748B] mt-2">
            Clear answers to common questions about WhatsApp Cloud API automation.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full py-4.5 px-6 flex items-center justify-between text-left gap-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-[#0F172A]">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-[#64748B] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#0F172A]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-[#64748B] leading-relaxed border-t border-[#E2E8F0] bg-[#FFFFFF]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
