import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { DEMO_WHATSAPP_NUMBER } from '@/lib/config';
import {
  MessageSquare,
  MapPin,
  Mail,
} from 'lucide-react';

export function GlobalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#E2E8F0] text-[#64748B] text-xs relative overflow-hidden">
      {/* Top Status Bar */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] py-3 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-[#0F172A]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0AAF76]"></span>
            </span>
            <span className="font-semibold">All Systems Operational</span>
            <span className="text-[#64748B]">•</span>
            <span className="text-[#64748B]">Meta Graph API Connected</span>
          </div>

          <div className="text-[#64748B] font-mono text-[10px]">
            Serverless Edge Clusters • 99.98% Gateway Uptime
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Col 1: Brand & Bio (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Link href="/" aria-label="FrontLoop home" className="inline-flex items-center">
            <BrandLogo size="md" />
          </Link>

          <p className="text-xs text-[#64748B] leading-relaxed max-w-sm">
            Autonomous 24/7 WhatsApp AI Receptionist &amp; Lead Qualifier for local healthcare clinics, coaching institutes, salons, and modern service businesses.
          </p>

          <div className="pt-2 flex items-center gap-2 text-[#64748B] text-xs">
            <MapPin size={14} className="text-[#0AAF76] shrink-0" />
            <span>Kozhikode &amp; Bengaluru, India</span>
          </div>
        </div>

        {/* Col 2: Product */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">
            Product
          </p>
          <ul className="space-y-2 text-[#64748B]">
            <li>
              <a href="#features" className="hover:text-[#0AAF76] transition-colors">
                AI Front Desk Features
              </a>
            </li>
            <li>
              <a href="#verticals" className="hover:text-[#0AAF76] transition-colors">
                Industry Workflows
              </a>
            </li>
            <li>
              <a href="#pricing" className="hover:text-[#0AAF76] transition-colors">
                Transparent Pricing
              </a>
            </li>
            <li>
              <a href="#faq" className="hover:text-[#0AAF76] transition-colors">
                Common FAQs
              </a>
            </li>
            <li>
              <Link href="/auth/register" className="hover:text-[#0AAF76] transition-colors">
                Start 14-Day Free Trial
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Portal & Support */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">
            Portals &amp; Support
          </p>
          <ul className="space-y-2 text-[#64748B]">
            <li>
              <Link href="/auth/login" className="hover:text-[#0AAF76] transition-colors">
                Merchant Dashboard
              </Link>
            </li>
            {DEMO_WHATSAPP_NUMBER ? (
              <li>
                <a
                  href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=Hello%2C%20I%20need%20support%20with%20FrontLoop`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#0AAF76] transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare size={12} className="text-[#0AAF76]" /> WhatsApp Support
                </a>
              </li>
            ) : (
              <li>
                <Link
                  href="/auth/register"
                  className="hover:text-[#0AAF76] transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare size={12} className="text-[#0AAF76]" /> Start Free Trial
                </Link>
              </li>
            )}
            <li>
              <a
                href="mailto:support@frontloop.online"
                className="hover:text-[#0AAF76] transition-colors flex items-center gap-1.5"
              >
                <Mail size={12} /> support@frontloop.online
              </a>
            </li>
            <li>
              <Link href="/dashboard/support" className="hover:text-[#0AAF76] transition-colors">
                Help &amp; Documentation
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Legal & Compliance */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">
            Legal &amp; Compliance
          </p>
          <ul className="space-y-2 text-[#64748B]">
            <li>
              <Link href="/privacy" className="hover:text-[#0AAF76] transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-[#0AAF76] transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <span className="text-[#64748B] block text-[11px] leading-snug pt-1">
                Official Meta WhatsApp Cloud API Partner compliant. WhatsApp is a trademark of Meta Platforms, Inc.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="border-t border-[#E2E8F0] py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#64748B]">
          <p>© {currentYear} FrontLoop Inc. All rights reserved.</p>
          <p className="text-[#64748B]">
            Engineered for high-reliability SMB WhatsApp automation.
          </p>
        </div>
      </div>
    </footer>
  );
}
