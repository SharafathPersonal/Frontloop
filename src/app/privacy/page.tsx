import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { CONTACT, SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy Policy | FrontLoop',
  description: 'What data FrontLoop collects, which processors receive it, how long it is kept, and how to reach our grievance contact.',
  alternates: { canonical: '/privacy' },
};

const LAST_UPDATED = '13 October 2026';

const PROCESSORS = [
  { name: 'MongoDB Atlas (MongoDB, Inc.)', purpose: 'Primary database for workspaces, leads, messages and knowledge bases.' },
  { name: 'Vercel Inc.', purpose: 'Application hosting and request processing.' },
  { name: 'Meta Platforms (WhatsApp Cloud API)', purpose: 'Receiving customer WhatsApp messages and delivering replies.' },
  { name: 'Google (Gemini API)', purpose: 'Primary AI model that drafts replies from the conversation and your knowledge base.' },
  { name: 'Groq, Inc.', purpose: 'Backup AI model, used only when the primary model is unavailable.' },
  { name: 'Cerebras Systems', purpose: 'Second backup AI model, used only when the first two are unavailable.' },
  { name: 'Cashfree Payments', purpose: 'Processing subscription payments in INR.' },
];

const h2 = 'text-2xl font-medium tracking-tight text-[#0F172A]';
const p = 'text-[#475569] leading-relaxed';
const list = 'list-disc pl-6 space-y-2 text-[#475569] leading-relaxed';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] py-20 px-4 sm:px-12 md:px-24">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <Link href="/" aria-label="FrontLoop home" className="inline-flex mb-8">
            <BrandLogo size="sm" />
          </Link>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-[#0F172A] mb-4">Privacy Policy</h1>
          <p className="text-sm text-[#64748B]">Last updated: {LAST_UPDATED}</p>
        </div>

        <section className="space-y-4">
          <h2 className={h2}>1. Who we are and our role</h2>
          <p className={p}>
            FrontLoop ({SITE_URL}) is operated from {CONTACT.location}. We provide an AI WhatsApp front desk to
            businesses (&ldquo;customers&rdquo;). This policy follows India&apos;s Digital Personal Data Protection Act,
            2023 (&ldquo;DPDP Act&rdquo;).
          </p>
          <ul className={list}>
            <li>
              For <strong>business account data</strong> (your login email, business name and billing records), FrontLoop
              decides how the data is used and acts as the <strong>Data Fiduciary</strong>.
            </li>
            <li>
              For <strong>end-customer data</strong> (people who message your business on WhatsApp), your business is the
              Data Fiduciary and FrontLoop processes that data on your behalf, as a <strong>Data Processor</strong>, only
              to provide the service.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>2. Data we collect</h2>
          <ul className={list}>
            <li>
              <strong>Account data:</strong> business name, business category, owner email address, and a salted bcrypt
              hash of your password (we never store the password itself).
            </li>
            <li>
              <strong>WhatsApp connection data:</strong> your WhatsApp Business Account ID, Phone Number ID, display
              number, and your Meta access token, which is encrypted at rest with AES-256-GCM.
            </li>
            <li>
              <strong>Knowledge base:</strong> the services, prices, hours, FAQs and business context you enter.
            </li>
            <li>
              <strong>End-customer data:</strong> the WhatsApp phone number and profile name of people who message your
              business, the text of their messages and of replies sent by the AI or your staff, delivery statuses, and
              details the AI extracts from the chat (name, requirement, intent). Media such as images or voice notes is
              not downloaded or stored; only the message type is recorded.
            </li>
            <li>
              <strong>Billing data:</strong> plan, amount, Cashfree order ID and payment dates. Card, UPI and bank
              details are entered on Cashfree&apos;s checkout and never reach our servers.
            </li>
            <li>
              <strong>Technical data:</strong> IP addresses used briefly for rate limiting and security, and server logs.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>3. How end-customer messages flow</h2>
          <p className={p}>
            When someone messages a connected business, Meta delivers the message to FrontLoop. We store it in the
            business&apos;s isolated workspace and send the recent conversation together with that business&apos;s
            knowledge base to an AI model to draft a reply. The customer&apos;s phone number is not sent to AI providers.
            The reply is sent back through Meta&apos;s WhatsApp Cloud API. Staff replies typed in the dashboard go
            directly to Meta and are not sent to AI providers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>4. Purposes of processing</h2>
          <ul className={list}>
            <li>Answering WhatsApp inquiries on the business&apos;s behalf and capturing leads in its dashboard.</li>
            <li>Operating, securing and troubleshooting the service, including fraud and abuse prevention.</li>
            <li>Billing, tax and accounting obligations.</li>
          </ul>
          <p className={p}>
            We do not sell personal data, use it for advertising, or send marketing broadcasts to end customers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>5. Processors we share data with</h2>
          <p className={p}>
            We share data only with the service providers below, only as needed to run FrontLoop. Some of them process
            data on servers outside India.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border border-[#E2E8F0] bg-white rounded-xl">
              <thead className="bg-[#F1F5F9] text-[#0F172A]">
                <tr>
                  <th scope="col" className="p-3 font-semibold">Processor</th>
                  <th scope="col" className="p-3 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[#475569]">
                {PROCESSORS.map((row) => (
                  <tr key={row.name}>
                    <td className="p-3 font-medium text-[#0F172A]">{row.name}</td>
                    <td className="p-3">{row.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>6. Retention</h2>
          <ul className={list}>
            <li>Workspace data, leads and conversations are kept while your workspace is active.</li>
            <li>
              When a business asks us to close its workspace, we delete its workspace data within 30 days, except
              billing records.
            </li>
            <li>Billing records are kept for 8 years to meet Indian tax and accounting law.</li>
            <li>Rate-limiting records expire automatically within one hour.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>7. Security</h2>
          <p className={p}>
            Every workspace&apos;s data is isolated by a tenant check enforced on every database query. WhatsApp access
            tokens are encrypted with AES-256-GCM, passwords are hashed with bcrypt, webhooks are verified with
            signatures, and all traffic uses HTTPS.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>8. Your rights</h2>
          <p className={p}>
            Under the DPDP Act you may ask to access, correct or erase your personal data, withdraw consent, and nominate
            another person to exercise these rights. Businesses can export their leads as CSV from the dashboard at any
            time. If you messaged a business that uses FrontLoop, please contact that business first; we will help it
            respond to your request.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>9. Grievance contact</h2>
          <p className={p}>
            For privacy questions, requests or complaints, email{' '}
            <a href={`mailto:${CONTACT.email}`} className="text-[#047857] underline underline-offset-2">
              {CONTACT.email}
            </a>{' '}
            or call {CONTACT.phoneDisplay} ({CONTACT.hours}). We acknowledge grievances within 7 days. If you are not
            satisfied with our response, you may approach the Data Protection Board of India.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>10. Changes</h2>
          <p className={p}>
            We will update the date above when this policy changes and notify active workspaces of material changes by
            email.
          </p>
        </section>
      </div>
    </div>
  );
}
