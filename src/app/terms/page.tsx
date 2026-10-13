import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { CONTACT, SITE_URL } from '@/lib/config';
import { BILLING_PERIOD_DAYS, TRIAL_CONFIG } from '@/lib/plans';

export const metadata: Metadata = {
  title: 'Terms of Service | FrontLoop',
  description: 'The terms for using FrontLoop: subscriptions, billing periods, acceptable use on WhatsApp, and AI response disclaimers.',
  alternates: { canonical: '/terms' },
};

const LAST_UPDATED = '13 October 2026';

const h2 = 'text-2xl font-medium tracking-tight text-[#0F172A]';
const p = 'text-[#475569] leading-relaxed';
const list = 'list-disc pl-6 space-y-2 text-[#475569] leading-relaxed';
const link = 'text-[#047857] underline underline-offset-2';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] py-20 px-4 sm:px-12 md:px-24">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <Link href="/" aria-label="FrontLoop home" className="inline-flex mb-8">
            <BrandLogo size="sm" />
          </Link>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-[#0F172A] mb-4">Terms of Service</h1>
          <p className="text-sm text-[#64748B]">Last updated: {LAST_UPDATED}</p>
        </div>

        <section className="space-y-4">
          <h2 className={h2}>1. The service</h2>
          <p className={p}>
            FrontLoop ({SITE_URL}), operated from {CONTACT.location}, provides an AI front desk that replies to
            customers who message your business on WhatsApp, using the information in your knowledge base, and records
            those conversations as leads in your dashboard. By creating a workspace you agree to these terms on behalf of
            your business.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>2. Your account</h2>
          <ul className={list}>
            <li>You must give accurate business details and keep your password confidential.</li>
            <li>You are responsible for activity in your workspace, including replies sent by your staff.</li>
            <li>You must own, or be authorised to operate, the WhatsApp Business number you connect.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>3. Free trial, plans and billing</h2>
          <ul className={list}>
            <li>
              New workspaces get a {TRIAL_CONFIG.days}-day free trial with up to {TRIAL_CONFIG.replyQuota} AI replies. No
              payment details are required. Automated replies stop when the trial ends or its replies are used up.
            </li>
            <li>
              Paid plans are prepaid in Indian Rupees through Cashfree for a {BILLING_PERIOD_DAYS}-day period. Plans do
              not renew automatically; nothing is charged without a new payment from you.
            </li>
            <li>
              Each plan includes a fixed number of AI replies per period. Every automated reply the AI sends counts once.
              Replies your staff send from the dashboard, and fallback messages sent when our AI providers are
              unavailable, do not count.
            </li>
            <li>
              Unused replies do not carry over. Each payment resets your reply count. Renewing the same plan before it
              ends extends your current end date by {BILLING_PERIOD_DAYS} days; switching plans starts a new period
              immediately.
            </li>
            <li>
              When a period ends without renewal, automated replies stop. Your data and dashboard remain available.
            </li>
            <li>
              Prices are shown on our website and may change; a change never affects an order you have already started
              paying for.
            </li>
            <li>
              Cancellations and refunds are governed by our{' '}
              <Link href="/refund-policy" className={link}>
                Cancellation &amp; Refund Policy
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>4. Acceptable use on WhatsApp</h2>
          <p className={p}>
            FrontLoop connects through Meta&apos;s official WhatsApp Cloud API, and your use must follow Meta&apos;s{' '}
            <a href="https://business.whatsapp.com/policy" target="_blank" rel="noopener noreferrer" className={link}>
              WhatsApp Business Policy
            </a>{' '}
            and Commerce Policy. In particular, you must not:
          </p>
          <ul className={list}>
            <li>use FrontLoop to send unsolicited, bulk or promotional messages (FrontLoop only replies to inbound chats);</li>
            <li>offer products or services that Meta&apos;s policies prohibit, or that are illegal in India;</li>
            <li>enter false, misleading or infringing information in your knowledge base;</li>
            <li>attempt to access another workspace&apos;s data, overload the service, or bypass its limits.</li>
          </ul>
          <p className={p}>
            Meta, not FrontLoop, decides whether a WhatsApp number is restricted. We may suspend a workspace that breaks
            these rules or puts the service or other customers at risk, and will tell you why.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>5. AI-generated replies</h2>
          <ul className={list}>
            <li>
              Replies are generated by third-party AI models instructed to answer only from your knowledge base. AI can
              still make mistakes, misunderstand a message, or phrase something imperfectly.
            </li>
            <li>
              You are responsible for keeping your knowledge base accurate and current, and for reviewing conversations
              in your dashboard. Prices and policies the AI quotes come from what you entered.
            </li>
            <li>
              FrontLoop is not suitable for medical emergencies, diagnosis, or any advice where an error could cause harm.
              Configure handoff phrases so such conversations reach your staff, and make sure your customers have another
              way to reach you urgently.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>6. Your data</h2>
          <p className={p}>
            You own your knowledge base and your customers&apos; conversations. We process them only to provide the
            service, as described in our{' '}
            <Link href="/privacy" className={link}>
              Privacy Policy
            </Link>
            . You can export your leads as CSV at any time. You are responsible for having a lawful basis to process your
            customers&apos; messages through FrontLoop.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>7. Availability</h2>
          <p className={p}>
            We work to keep FrontLoop running around the clock, but it depends on Meta, our AI providers and hosting
            partners, and we do not guarantee uninterrupted service. Planned maintenance and known outages are
            communicated through our support channels.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>8. Liability</h2>
          <p className={p}>
            To the extent permitted by law, FrontLoop is not liable for indirect or consequential losses, including lost
            bookings, revenue or goodwill, and our total liability for any claim is limited to the amount you paid us in
            the {BILLING_PERIOD_DAYS} days before the claim arose.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>9. Ending the service</h2>
          <p className={p}>
            You can stop at any time by not renewing and disconnecting WhatsApp in Settings, or ask us to close your
            workspace by email. We may end the service with 30 days&apos; notice, or immediately for serious breaches of
            section 4.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>10. Governing law and contact</h2>
          <p className={p}>
            These terms are governed by the laws of India, and the courts at Kozhikode (Calicut), Kerala have
            jurisdiction. Questions about these terms:{' '}
            <a href={`mailto:${CONTACT.email}`} className={link}>
              {CONTACT.email}
            </a>{' '}
            or {CONTACT.phoneDisplay}.
          </p>
        </section>
      </div>
    </div>
  );
}
