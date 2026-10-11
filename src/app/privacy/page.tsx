import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] py-20 px-6 sm:px-12 md:px-24">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <Link href="/" aria-label="FrontLoop home" className="inline-flex mb-8"><BrandLogo size="sm" /></Link>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-[#0F172A] mb-4">Privacy Policy</h1>
        </div>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#0F172A]">Section 1: Data Collection</h2>
          <p className="text-[#475569] leading-relaxed">
            We parse phone numbers via uploaded spreadsheets strictly processed under encrypted PostgreSQL isolation.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#0F172A]">Section 2: Data Usage</h2>
          <p className="text-[#475569] leading-relaxed">
            Information is never traded and strictly channeled to Meta Cloud API endpoints.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#0F172A]">Section 3: Payment Handling</h2>
          <p className="text-[#475569] leading-relaxed">
            Payment Handling via Cashfree.
          </p>
        </section>
      </div>
    </div>
  );
}
