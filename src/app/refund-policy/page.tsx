import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { CONTACT } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy | FrontLoop',
  description: 'How FrontLoop subscriptions, cancellations, and refunds work.',
  alternates: { canonical: '/refund-policy' },
};

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] py-20 px-4 sm:px-12 md:px-24">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <Link href="/" aria-label="FrontLoop home" className="inline-flex mb-8">
            <BrandLogo size="sm" />
          </Link>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-[#0F172A] mb-4">
            Cancellation &amp; Refund Policy
          </h1>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#0F172A]">Billing periods</h2>
          <p className="text-[#475569] leading-relaxed">
            FrontLoop plans are prepaid in Indian Rupees through Cashfree. Each payment activates your plan for a
            30-day period; renewing the same plan before it ends adds 30 days to your current end date. Plans do not
            renew automatically; your card or UPI account is never debited without a new payment from you.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#0F172A]">Cancellation</h2>
          <p className="text-[#475569] leading-relaxed">
            You can stop using FrontLoop at any time by not renewing. Your plan stays active until the end of the
            current 30-day period, after which automated replies stop. You can also disconnect your WhatsApp number
            from Settings at any time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#0F172A]">Refunds</h2>
          <p className="text-[#475569] leading-relaxed">
            Duplicate or erroneous charges are refunded in full to the original payment method. For any other refund
            request, email{' '}
            <a href={`mailto:${CONTACT.email}`} className="text-[#047857] underline underline-offset-2">
              {CONTACT.email}
            </a>{' '}
            with your registered email and Cashfree order ID, and we will review it.
          </p>
        </section>
      </div>
    </div>
  );
}
