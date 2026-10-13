import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Mail, MapPin, MessageSquare, Phone, Activity } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { GlobalFooter } from '@/components/landing/GlobalFooter';
import { CONTACT, whatsappLink } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Support & Contact | FrontLoop',
  description: `Reach the FrontLoop team in ${CONTACT.location} on WhatsApp ${CONTACT.phoneDisplay} or ${CONTACT.email}. ${CONTACT.hours}.`,
  alternates: { canonical: '/support' },
};

const CHANNELS = [
  {
    icon: MessageSquare,
    label: 'WhatsApp',
    value: CONTACT.phoneDisplay,
    href: whatsappLink('Hi FrontLoop, I need help with my account'),
    external: true,
  },
  { icon: Phone, label: 'Phone', value: CONTACT.phoneDisplay, href: `tel:${CONTACT.phoneE164}`, external: false },
  { icon: Mail, label: 'Email', value: CONTACT.email, href: `mailto:${CONTACT.email}`, external: false },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      <main className="flex-1 py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-10">
          <div>
            <Link href="/" aria-label="FrontLoop home" className="inline-flex mb-8">
              <BrandLogo size="sm" />
            </Link>
            <h1 className="serif-headline text-3xl sm:text-5xl tracking-tight">Support &amp; Contact</h1>
            <p className="text-sm sm:text-base text-[#475569] mt-4 max-w-2xl leading-relaxed">
              Questions about setup, WhatsApp connection, billing, or a demo for your business? Talk directly to the
              FrontLoop team.
            </p>
          </div>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CHANNELS.map(({ icon: Icon, label, value, href, external }) => (
              <a
                key={label}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#047857] transition-colors shadow-sm"
              >
                <Icon size={18} className="text-[#047857]" aria-hidden />
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mt-3">{label}</p>
                <p className="text-sm font-semibold mt-1 break-all">{value}</p>
              </a>
            ))}
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex items-start gap-3">
              <Clock size={18} className="text-[#047857] shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="font-semibold">Working hours</p>
                <p className="text-[#475569] mt-1">{CONTACT.hours}</p>
                <p className="text-[#64748B] text-xs mt-1">Your AI front desk keeps replying to customers 24/7.</p>
              </div>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex items-start gap-3">
              <MapPin size={18} className="text-[#047857] shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="font-semibold">Location</p>
                <p className="text-[#475569] mt-1">{CONTACT.location}</p>
                <p className="text-[#64748B] text-xs mt-1">Serving businesses across India.</p>
              </div>
            </div>
          </section>

          <section id="status" className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex items-start gap-3 text-sm scroll-mt-20">
            <Activity size={18} className="text-[#047857] shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-semibold">System status</p>
              <p className="text-[#475569] mt-1 leading-relaxed">
                If replies stop arriving or your dashboard shows a WhatsApp connection error, message us on WhatsApp
                with your business name. We acknowledge outage reports during working hours and post updates to
                affected workspaces directly.
              </p>
            </div>
          </section>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
