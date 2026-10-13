import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { CONTACT, whatsappLink } from '@/lib/config';
import { MessageSquare, MapPin, Mail, Clock, Phone } from 'lucide-react';

const linkClass = 'hover:text-[#047857] transition-colors';
const headingClass = 'text-[11px] font-bold uppercase tracking-wider text-[#0F172A]';

export function GlobalFooter() {
  return (
    <footer className="bg-white border-t border-[#E2E8F0] text-[#64748B] text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Col 1: About */}
        <div className="space-y-4">
          <Link href="/" aria-label="FrontLoop home" className="inline-flex items-center">
            <BrandLogo size="md" />
          </Link>
          <p className="leading-relaxed max-w-sm">
            FrontLoop gives local businesses an AI front desk on WhatsApp that answers every customer inquiry, captures
            the lead, and hands the conversation to your team when it matters.
          </p>
          <p className="inline-flex items-start gap-2 rounded-xl border border-[#047857]/25 bg-[#ECFDF5] px-3 py-2 text-[11px] font-semibold text-[#065F46] leading-snug">
            <MapPin size={13} className="shrink-0 mt-px" aria-hidden />
            Engineered in Calicut, Kerala for ambitious local businesses.
          </p>
        </div>

        {/* Col 2: Product & Solutions */}
        <div className="space-y-3">
          <p className={headingClass}>Product &amp; Solutions</p>
          <ul className="space-y-2">
            <li>
              <Link href="/#features" className={linkClass}>
                WhatsApp Automation
              </Link>
            </li>
            <li>
              <Link href="/#verticals" className={linkClass}>
                Clinic Appointment Flow
              </Link>
            </li>
            <li>
              <Link href="/#verticals" className={linkClass}>
                Coaching Admissions
              </Link>
            </li>
            <li>
              <Link href="/#features" className={linkClass}>
                CRM Lead Capture
              </Link>
            </li>
            <li>
              <Link href="/support#status" className={linkClass}>
                System Uptime
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Contact & Support */}
        <div className="space-y-3">
          <p className={headingClass}>Contact &amp; Support</p>
          <ul className="space-y-2.5">
            <li>
              <a
                href={whatsappLink('Hi FrontLoop, I have a question')}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkClass} inline-flex items-center gap-2`}
              >
                <MessageSquare size={13} className="text-[#047857] shrink-0" aria-hidden />
                WhatsApp {CONTACT.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`tel:${CONTACT.phoneE164}`} className={`${linkClass} inline-flex items-center gap-2`}>
                <Phone size={13} className="text-[#047857] shrink-0" aria-hidden />
                {CONTACT.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className={`${linkClass} inline-flex items-center gap-2 break-all`}>
                <Mail size={13} className="text-[#047857] shrink-0" aria-hidden />
                {CONTACT.email}
              </a>
            </li>
            <li className="inline-flex items-center gap-2">
              <MapPin size={13} className="text-[#047857] shrink-0" aria-hidden />
              {CONTACT.location}
            </li>
            <li className="flex items-center gap-2">
              <Clock size={13} className="text-[#047857] shrink-0" aria-hidden />
              {CONTACT.hours}
            </li>
          </ul>
        </div>

        {/* Col 4: Legal & Trust */}
        <div className="space-y-3">
          <p className={headingClass}>Legal &amp; Trust</p>
          <ul className="space-y-2">
            <li>
              <Link href="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className={linkClass}>
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/refund-policy" className={linkClass}>
                Cancellation &amp; Refund
              </Link>
            </li>
            <li>
              <Link href="/support" className={linkClass}>
                Help &amp; Support
              </Link>
            </li>
            <li className="text-[11px] leading-snug pt-1">
              Built on the official Meta WhatsApp Cloud API. WhatsApp is a trademark of Meta Platforms, Inc.
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#E2E8F0] py-6 px-4 sm:px-6">
        <p className="max-w-6xl mx-auto text-center sm:text-left text-[11px]">
          © 2026 FrontLoop (frontloop.online). All rights reserved.
        </p>
      </div>
    </footer>
  );
}
